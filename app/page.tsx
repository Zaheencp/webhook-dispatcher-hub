'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSession } from '@/lib/client';
import { Header } from '@/components/Header';
import { EndpointStrip } from '@/components/EndpointStrip';
import { EventFeed } from '@/components/EventFeed';
import { EventInspector } from '@/components/EventInspector';
import { MockReceiverControl } from '@/components/MockReceiverControl';
import { DispatchModal } from '@/components/DispatchModal';
import { EndpointModal } from '@/components/EndpointModal';
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
  const [selectedEndpointFilter, setSelectedEndpointFilter] = useState<string | null>(null);

  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
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
        const fetchedEvents = evData.events || [];
        setEvents(fetchedEvents);

        setSelectedEventId((currentId) => {
          if (currentId && fetchedEvents.some((e) => e.id === currentId)) {
            return currentId;
          }
          return fetchedEvents[0]?.id || null;
        });
      }
    } catch {
    }
  }, [sessionId, apiFetch, selectedStatus]);

  useEffect(() => {
    if (isReady && sessionId) {
      loadData();
      const interval = setInterval(loadData, 4000);
      return () => clearInterval(interval);
    }
  }, [isReady, sessionId, loadData]);

  const filteredEvents = useMemo(() => {
    if (!selectedEndpointFilter) return events;
    return events.filter((e) => e.endpoint_id === selectedEndpointFilter);
  }, [events, selectedEndpointFilter]);

  const inspectedEvent = useMemo(() => {
    if (!selectedEventId) return null;
    return events.find((e) => e.id === selectedEventId) || null;
  }, [events, selectedEventId]);

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
        setSelectedEventId(data.event.id);
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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500 font-mono text-xs">
        Initializing workbench sandbox...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <Header
        sessionId={sessionId}
        onResetSession={resetSession}
        onSeedDemo={handleSeedDemo}
        onOpenCreateEndpoint={() => setIsCreateEndpointOpen(true)}
        onOpenDispatch={() => openDispatch()}
        isSeeding={isSeeding}
        stats={stats}
      />

      <EndpointStrip
        endpoints={endpoints}
        selectedEndpointId={selectedEndpointFilter}
        onSelectEndpoint={setSelectedEndpointFilter}
        onOpenCreateEndpoint={() => setIsCreateEndpointOpen(true)}
        onOpenDispatch={openDispatch}
        onRefresh={loadData}
        apiFetch={apiFetch}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-5 space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-5">
            <EventFeed
              events={filteredEvents}
              selectedEventId={selectedEventId}
              onSelectEvent={(event) => setSelectedEventId(event.id)}
              selectedStatus={selectedStatus}
              onSelectStatus={setSelectedStatus}
              onProcessRetries={handleProcessRetries}
              isProcessingRetries={isProcessingRetries}
            />
          </div>

          <div className="lg:col-span-7">
            <EventInspector
              event={inspectedEvent}
              onReplay={handleReplayEvent}
              isReplaying={isReplaying}
            />
          </div>
        </div>

        <MockReceiverControl />
      </main>

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
