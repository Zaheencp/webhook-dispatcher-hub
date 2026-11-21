'use client';

import { useState } from 'react';
import {
  RotateCcw,
  Zap,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Play,
  Eye,
  Send,
  Sparkles,
} from 'lucide-react';
import type { WebhookEvent, EventStatus } from '@/types';

interface EventStreamProps {
  events: WebhookEvent[];
  selectedStatus: string;
  onSelectStatus: (status: string) => void;
  onInspectEvent: (event: WebhookEvent) => void;
  onReplayEvent: (eventId: string) => Promise<void>;
  onProcessRetries: (force?: boolean) => Promise<void>;
  onOpenDispatch: () => void;
  onSeedDemo: () => void;
  isProcessingRetries: boolean;
  isReplaying: boolean;
  isSeeding: boolean;
}

export function EventStream({
  events,
  selectedStatus,
  onSelectStatus,
  onInspectEvent,
  onReplayEvent,
  onProcessRetries,
  onOpenDispatch,
  onSeedDemo,
  isProcessingRetries,
  isReplaying,
  isSeeding,
}: EventStreamProps) {
  const [activeReplayId, setActiveReplayId] = useState<string | null>(null);

  const handleReplayClick = async (e: React.MouseEvent, eventId: string) => {
    e.stopPropagation();
    setActiveReplayId(eventId);
    try {
      await onReplayEvent(eventId);
    } finally {
      setActiveReplayId(null);
    }
  };

  const getStatusBadge = (status: EventStatus) => {
    switch (status) {
      case 'DELIVERED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            DELIVERED
          </span>
        );
      case 'RETRYING':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="h-3 w-3 mr-1" />
            RETRYING
          </span>
        );
      case 'DEAD_LETTER':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertTriangle className="h-3 w-3 mr-1" />
            DEAD_LETTER
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-zinc-800 text-zinc-400 border border-zinc-700">
            PENDING
          </span>
        );
    }
  };

  const TABS = [
    { key: 'ALL', label: 'All Events' },
    { key: 'DELIVERED', label: 'Delivered' },
    { key: 'RETRYING', label: 'Retrying' },
    { key: 'DEAD_LETTER', label: 'Dead Letter (DLQ)' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center space-x-1 border-b md:border-b-0 border-zinc-800 pb-2 md:pb-0 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => onSelectStatus(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                selectedStatus === tab.key
                  ? 'bg-zinc-800 text-zinc-100 border border-zinc-700'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/80'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onProcessRetries(false)}
            disabled={isProcessingRetries}
            title="Dispatch pending retries whose next_retry_at <= now()"
            className="inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 transition disabled:opacity-50"
          >
            <RotateCcw
              className={`h-3.5 w-3.5 mr-1.5 text-zinc-400 ${isProcessingRetries ? 'animate-spin' : ''}`}
            />
            Process Due Retries
          </button>

          <button
            onClick={() => onProcessRetries(true)}
            disabled={isProcessingRetries}
            title="Immediately retry all RETRYING events without waiting for backoff timers"
            className="inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition disabled:opacity-50"
          >
            <Zap className="h-3.5 w-3.5 mr-1.5 text-amber-400" />
            Force Retry Now
          </button>

          <button
            onClick={onOpenDispatch}
            className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition"
          >
            <Send className="h-3.5 w-3.5 mr-1.5" />
            Ingest Event
          </button>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-12 bg-zinc-900/40 border border-dashed border-zinc-800 rounded-2xl p-6">
          <Filter className="h-8 w-8 text-zinc-600 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-zinc-300">No Webhook Events Found</h3>
          <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
            {selectedStatus !== 'ALL'
              ? `No events currently matching the "${selectedStatus}" filter.`
              : 'Outbound webhook events will appear here once ingested or seeded.'}
          </p>
          <div className="mt-4 flex items-center justify-center space-x-2">
            <button
              onClick={onSeedDemo}
              disabled={isSeeding}
              className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition disabled:opacity-50"
            >
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              Seed Demo Hub
            </button>
            <button
              onClick={onOpenDispatch}
              className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition"
            >
              <Send className="h-3.5 w-3.5 mr-1.5" />
              Ingest Custom Event
            </button>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900/50">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950/70 text-zinc-400 font-medium uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Event Type / ID</th>
                <th className="py-3 px-4">Target Subscriber</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Attempts</th>
                <th className="py-3 px-4">Latency</th>
                <th className="py-3 px-4">Next Action / Retry</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-mono">
              {events.map((event) => {
                const latestAttempt = event.delivery_attempts?.[event.delivery_attempts.length - 1];
                return (
                  <tr
                    key={event.id}
                    onClick={() => onInspectEvent(event)}
                    className="hover:bg-zinc-800/40 transition cursor-pointer group"
                  >
                    <td className="py-3.5 px-4 font-sans">
                      <div className="font-semibold text-zinc-100 flex items-center space-x-2 font-mono text-xs">
                        <span>{event.event_type}</span>
                      </div>
                      <div className="text-[10px] text-zinc-500 font-mono truncate max-w-[140px]" title={event.id}>
                        {event.id}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-sans">
                      <div className="text-zinc-200 font-medium text-xs truncate max-w-[180px]">
                        {event.endpoint?.name || event.endpoint_id}
                      </div>
                      <div
                        className="text-[10px] font-mono text-zinc-500 truncate max-w-[180px]"
                        title={event.endpoint?.url}
                      >
                        {event.endpoint?.url || 'Unknown URL'}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-sans">{getStatusBadge(event.status)}</td>

                    <td className="py-3.5 px-4 text-zinc-300">
                      <span className="font-bold">{event.attempt_count}</span>
                      <span className="text-zinc-500">/{event.max_attempts}</span>
                    </td>

                    <td className="py-3.5 px-4 text-zinc-400">
                      {latestAttempt ? (
                        <div className="flex items-center space-x-1">
                          <span className="font-semibold text-zinc-200">{latestAttempt.latency_ms}ms</span>
                          <span
                            className={`text-[10px] font-bold ${
                              latestAttempt.response_status && latestAttempt.response_status < 300
                                ? 'text-emerald-400'
                                : 'text-rose-400'
                            }`}
                          >
                            ({latestAttempt.response_status ? `HTTP ${latestAttempt.response_status}` : 'ERR'})
                          </span>
                        </div>
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 font-sans">
                      {event.status === 'RETRYING' && event.next_retry_at ? (
                        <span className="text-[11px] text-amber-400 font-mono">
                          Retry in{' '}
                          {Math.max(
                            0,
                            Math.round(
                              (new Date(event.next_retry_at).getTime() - Date.now()) / 1000
                            )
                          )}
                          s
                        </span>
                      ) : event.status === 'DELIVERED' ? (
                        <span className="text-[11px] text-emerald-400/80">Completed</span>
                      ) : event.status === 'DEAD_LETTER' ? (
                        <span className="text-[11px] text-rose-400 font-semibold">Exhausted to DLQ</span>
                      ) : (
                        <span className="text-[11px] text-zinc-500">Queued</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right font-sans">
                      <div className="flex items-center justify-end space-x-1.5">
                        {(event.status === 'DEAD_LETTER' || event.status === 'RETRYING') && (
                          <button
                            onClick={(e) => handleReplayClick(e, event.id)}
                            disabled={isReplaying && activeReplayId === event.id}
                            title="Replay Event"
                            className="inline-flex items-center px-2 py-1 rounded text-[11px] font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition disabled:opacity-50"
                          >
                            <Play
                              className={`h-3 w-3 mr-1 ${
                                activeReplayId === event.id ? 'animate-spin' : ''
                              }`}
                            />
                            Replay
                          </button>
                        )}
                        <button
                          onClick={() => onInspectEvent(event)}
                          title="Inspect Event & Delivery Log"
                          className="p-1.5 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
