'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from '@/lib/client';
import { Header } from '@/components/Header';
import { KpiStrip } from '@/components/KpiStrip';
import { EndpointsManager } from '@/components/EndpointsManager';
import { EventStream } from '@/components/EventStream';
import { EventInspectorModal } from '@/components/EventInspectorModal';
import { DispatchModal } from '@/components/DispatchModal';
import { EndpointModal } from '@/components/EndpointModal';
import { MockReceiverControl } from '@/components/MockReceiverControl';
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

  const [inspectedEvent, setInspectedEvent] = useState<WebhookEvent | null>(null);
  const [isDispatchOpen, setIsDispatchOpen] = useState(false);
  const [isCreateEndpointOpen, setIsCreateEndpointOpen] = useState(false);
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

  const handleEndpointCreated = (newEndpoint: Endpoint) => {
    setEndpoints((prev) => [newEndpoint, ...prev]);
    loadData();
  };

  if (!isReady) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center text-zinc-500 font-mono text-xs">
        Initializing session...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col font-sans selection:bg-zinc-800 selection:text-zinc-100">
      <Header
        sessionId={sessionId}
        onResetSession={resetSession}
        onSeedDemo={handleSeedDemo}
        onOpenCreateEndpoint={() => setIsCreateEndpointOpen(true)}
        onOpenDispatch={() => openDispatch()}
        isSeeding={isSeeding}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-5 space-y-4">
        <KpiStrip stats={stats} />

        <EndpointsManager
          endpoints={endpoints}
          onRefresh={loadData}
          onOpenCreateEndpoint={() => setIsCreateEndpointOpen(true)}
          onOpenDispatch={openDispatch}
          apiFetch={apiFetch}
        />

        <EventStream
          events={events}
          selectedStatus={selectedStatus}
          onSelectStatus={setSelectedStatus}
          onInspectEvent={(event) => setInspectedEvent(event)}
          onReplayEvent={handleReplayEvent}
          onProcessRetries={handleProcessRetries}
          isProcessingRetries={isProcessingRetries}
          isReplaying={isReplaying}
        />

        <MockReceiverControl />
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

      <EndpointModal
        isOpen={isCreateEndpointOpen}
        onClose={() => setIsCreateEndpointOpen(false)}
        onCreated={handleEndpointCreated}
        apiFetch={apiFetch}
      />
    </div>
  );
}
