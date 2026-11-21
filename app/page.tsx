'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from '@/lib/client';
import { Header } from '@/components/Header';
import { KpiStrip } from '@/components/KpiStrip';
import { EndpointsManager } from '@/components/EndpointsManager';
import { EventStream } from '@/components/EventStream';
import { EventInspectorModal } from '@/components/EventInspectorModal';
import { DispatchModal } from '@/components/DispatchModal';
import { MockReceiverControl } from '@/components/MockReceiverControl';
import {
  Radio,
  Layers,
  Terminal,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  Server,
  BookOpen,
} from 'lucide-react';
import type { Endpoint, WebhookEvent, DashboardStats } from '@/types';

export default function DashboardPage() {
  const { sessionId, isReady, resetSession, apiFetch } = useSession();

  const [stats, setStats] = useState<DashboardStats>({
    total_events: 0,
    delivered_count: 0,
    success_rate: 100,
    retrying_count: 0,
    dead_letter_count: 0,
    endpoints_count: 0,
  });

  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [activeView, setActiveView] = useState<'events' | 'endpoints' | 'architecture'>('events');

  const [inspectedEvent, setInspectedEvent] = useState<WebhookEvent | null>(null);
  const [isDispatchOpen, setIsDispatchOpen] = useState(false);
  const [dispatchEndpointId, setDispatchEndpointId] = useState<string | undefined>(undefined);

  const [isProcessingRetries, setIsProcessingRetries] = useState(false);
  const [isReplaying, setIsReplaying] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  const loadData = useCallback(async () => {
    if (!sessionId) return;

    try {
      const [statsRes, endpointsRes, eventsRes] = await Promise.all([
        apiFetch('/api/stats'),
        apiFetch('/api/endpoints'),
        apiFetch(`/api/events${selectedStatus !== 'ALL' ? `?status=${selectedStatus}` : ''}`),
      ]);

      if (statsRes.ok) {
        const statsData = (await statsRes.json()) as { stats: DashboardStats };
        setStats(statsData.stats);
      }

      if (endpointsRes.ok) {
        const epData = (await endpointsRes.json()) as { endpoints: Endpoint[] };
        setEndpoints(epData.endpoints || []);
      }

      if (eventsRes.ok) {
        const evData = (await eventsRes.json()) as { events: WebhookEvent[] };
        setEvents(evData.events || []);

        if (inspectedEvent) {
          const updatedInspected = (evData.events || []).find((e) => e.id === inspectedEvent.id);
          if (updatedInspected) {
            setInspectedEvent(updatedInspected);
          }
        }
      }
    } catch {
    }
  }, [sessionId, apiFetch, selectedStatus, inspectedEvent]);

  useEffect(() => {
    if (isReady && sessionId) {
      loadData();
      const interval = setInterval(loadData, 4000);
      return () => clearInterval(interval);
    }
  }, [isReady, sessionId, loadData]);

  const handleSeedDemo = async () => {
    setIsSeeding(true);
    try {
      await apiFetch('/api/seed', { method: 'POST' });
      await loadData();
    } catch {
    } finally {
      setIsSeeding(false);
    }
  };

  const handleProcessRetries = async (force = false) => {
    setIsProcessingRetries(true);
    try {
      await apiFetch(`/api/worker/process-retries${force ? '?force=true' : ''}`, {
        method: 'POST',
      });
      await loadData();
    } finally {
      setIsProcessingRetries(false);
    }
  };

  const handleReplayEvent = async (eventId: string) => {
    setIsReplaying(true);
    try {
      const res = await apiFetch(`/api/events/${eventId}/replay`, { method: 'POST' });
      if (res.ok) {
        const data = (await res.json()) as { event: WebhookEvent };
        setInspectedEvent(data.event);
      }
      await loadData();
    } finally {
      setIsReplaying(false);
    }
  };

  const openDispatch = (endpointId?: string) => {
    setDispatchEndpointId(endpointId);
    setIsDispatchOpen(true);
  };

  if (!isReady) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400">
        <Radio className="h-6 w-6 animate-spin text-indigo-500 mr-2" />
        <span className="text-sm font-mono">Initializing Sandbox Session...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
      <Header
        sessionId={sessionId}
        onResetSession={resetSession}
        onSeedDemo={handleSeedDemo}
        isSeeding={isSeeding}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <KpiStrip stats={stats} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center space-x-1 bg-zinc-900/80 border border-zinc-800 p-1 rounded-xl w-fit text-xs font-medium">
              <button
                onClick={() => setActiveView('events')}
                className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition ${
                  activeView === 'events'
                    ? 'bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700/80'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Layers className="h-3.5 w-3.5" />
                <span>Live Event Stream</span>
              </button>

              <button
                onClick={() => setActiveView('endpoints')}
                className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition ${
                  activeView === 'endpoints'
                    ? 'bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700/80'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Server className="h-3.5 w-3.5" />
                <span>Registered Endpoints ({endpoints.length})</span>
              </button>

              <button
                onClick={() => setActiveView('architecture')}
                className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition ${
                  activeView === 'architecture'
                    ? 'bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700/80'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <BookOpen className="h-3.5 w-3.5" />
                <span>Protocol Specs</span>
              </button>
            </div>

            {activeView === 'events' && (
              <EventStream
                events={events}
                selectedStatus={selectedStatus}
                onSelectStatus={setSelectedStatus}
                onInspectEvent={(event) => setInspectedEvent(event)}
                onReplayEvent={handleReplayEvent}
                onProcessRetries={handleProcessRetries}
                onOpenDispatch={() => openDispatch()}
                onSeedDemo={handleSeedDemo}
                isProcessingRetries={isProcessingRetries}
                isReplaying={isReplaying}
                isSeeding={isSeeding}
              />
            )}

            {activeView === 'endpoints' && (
              <EndpointsManager
                endpoints={endpoints}
                onRefresh={loadData}
                onOpenDispatch={openDispatch}
                apiFetch={apiFetch}
              />
            )}

            {activeView === 'architecture' && (
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 space-y-5 text-xs text-zinc-300 leading-relaxed">
                <div className="border-b border-zinc-800 pb-3">
                  <h3 className="text-sm font-semibold text-zinc-100 flex items-center space-x-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-400" />
                    <span>Cryptographic HMAC-SHA256 & Reliability Protocol</span>
                  </h3>
                  <p className="text-zinc-400 text-xs mt-0.5">
                    Production architecture guarantees powering the Dispatcher & Reliability Hub.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-2">
                    <span className="font-semibold text-indigo-400 text-xs block">
                      1. Cryptographic HMAC Header
                    </span>
                    <p className="text-zinc-400">
                      Signatures computed over{' '}
                      <code className="text-zinc-200 font-mono">
                        ${'{timestamp}'}.${'{payload}'}
                      </code>{' '}
                      using endpoint secret (<code className="text-zinc-200 font-mono">whsec_...</code>
                      ).
                    </p>
                    <pre className="p-2 rounded bg-zinc-900 border border-zinc-800 text-[10px] font-mono text-zinc-300">
                      X-Webhook-Signature: t=1700000000,v1=9a2b...
                    </pre>
                  </div>

                  <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-2">
                    <span className="font-semibold text-amber-400 text-xs block">
                      2. Exponential Backoff & Timeout
                    </span>
                    <p className="text-zinc-400">
                      Strict 5000ms AbortSignal on outgoing dispatches. Transient network and 5xx
                      failures retry with schedule:
                    </p>
                    <div className="flex items-center space-x-2 font-mono text-[11px] text-amber-300">
                      <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800">
                        #1: +10s
                      </span>
                      <span>→</span>
                      <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800">
                        #2: +60s
                      </span>
                      <span>→</span>
                      <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800">
                        #3: +300s
                      </span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-2">
                    <span className="font-semibold text-cyan-400 text-xs block">
                      3. Idempotency Ingestion Guarantee
                    </span>
                    <p className="text-zinc-400">
                      Unique composite constraint on{' '}
                      <code className="text-zinc-200 font-mono">
                        (session_id, endpoint_id, idempotency_key)
                      </code>
                      . Duplicate calls return 200 with{' '}
                      <code className="text-zinc-200 font-mono">deduplicated: true</code> without
                      re-dispatch.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-2">
                    <span className="font-semibold text-rose-400 text-xs block">
                      4. Dead-Letter Queue (DLQ) & Manual Replay
                    </span>
                    <p className="text-zinc-400">
                      When max attempts (default 4) exhaust, events automatically isolate into{' '}
                      <code className="text-rose-400 font-mono">DEAD_LETTER</code> status. The manual
                      replay resets count to 0 and re-triggers dispatch immediately.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <MockReceiverControl onSeedDemo={handleSeedDemo} isSeeding={isSeeding} />

            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 space-y-3">
              <h3 className="text-xs font-semibold text-zinc-200 flex items-center space-x-1.5">
                <Terminal className="h-4 w-4 text-indigo-400" />
                <span>Quick Ingestion cURL</span>
              </h3>
              <p className="text-zinc-400 text-xs">
                Send an outbound payload directly from your terminal or CI pipeline:
              </p>
              <pre className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-[11px] font-mono text-zinc-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">
{`curl -X POST /api/events/ingest \\
  -H "Content-Type: application/json" \\
  -H "x-session-id: ${sessionId.slice(0, 8)}..." \\
  -d '{
    "endpoint_id": "${endpoints[0]?.id || '<ENDPOINT_ID>'}",
    "event_type": "order.created",
    "idempotency_key": "idemp_${Date.now()}",
    "payload": { "order_id": "ord_101", "total": 4200 }
  }'`}
              </pre>
            </div>
          </div>
        </div>
      </main>

      <EventInspectorModal
        event={inspectedEvent}
        isOpen={Boolean(inspectedEvent)}
        onClose={() => setInspectedEvent(null)}
        onReplay={handleReplayEvent}
        isReplaying={isReplaying}
      />

      <DispatchModal
        isOpen={isDispatchOpen}
        onClose={() => setIsDispatchOpen(false)}
        endpoints={endpoints}
        selectedEndpointId={dispatchEndpointId}
        onSuccess={loadData}
        apiFetch={apiFetch}
      />
    </div>
  );
}
