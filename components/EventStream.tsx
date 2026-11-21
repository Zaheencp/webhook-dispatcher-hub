'use client';

import { useState } from 'react';
import { RotateCcw, Zap, Play, Eye } from 'lucide-react';
import type { WebhookEvent, EventStatus } from '@/types';

interface EventStreamProps {
  events: WebhookEvent[];
  selectedStatus: string;
  onSelectStatus: (status: string) => void;
  onInspectEvent: (event: WebhookEvent) => void;
  onReplayEvent: (eventId: string) => Promise<void>;
  onProcessRetries: (force?: boolean) => Promise<void>;
  isProcessingRetries: boolean;
  isReplaying: boolean;
}

export function EventStream({
  events,
  selectedStatus,
  onSelectStatus,
  onInspectEvent,
  onReplayEvent,
  onProcessRetries,
  isProcessingRetries,
  isReplaying,
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
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono border border-emerald-500/30 text-emerald-400 bg-emerald-500/5">
            DELIVERED
          </span>
        );
      case 'RETRYING':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono border border-amber-500/30 text-amber-400 bg-amber-500/5">
            RETRYING
          </span>
        );
      case 'DEAD_LETTER':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono border border-rose-500/30 text-rose-400 bg-rose-500/5">
            DEAD_LETTER
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono border border-zinc-800 text-zinc-400 bg-zinc-900">
            PENDING
          </span>
        );
    }
  };

  const TABS = [
    { key: 'ALL', label: 'All' },
    { key: 'DELIVERED', label: 'Delivered' },
    { key: 'RETRYING', label: 'Retrying' },
    { key: 'DEAD_LETTER', label: 'Dead Letter' },
  ];

  return (
    <div className="space-y-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center space-x-1 border-b sm:border-b-0 border-zinc-800 pb-1 sm:pb-0 overflow-x-auto text-xs font-mono">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => onSelectStatus(tab.key)}
              className={`px-2.5 py-1 rounded-md transition ${
                selectedStatus === tab.key
                  ? 'bg-zinc-800 text-zinc-100 font-medium'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => onProcessRetries(false)}
            disabled={isProcessingRetries}
            title="Dispatch pending retries whose next_retry_at <= now()"
            className="inline-flex items-center px-2 py-1 rounded text-xs font-mono text-zinc-400 hover:text-zinc-200 bg-[#111113] hover:bg-zinc-900 border border-zinc-800 transition disabled:opacity-50"
          >
            <RotateCcw
              className={`h-3 w-3 mr-1.5 text-zinc-500 ${isProcessingRetries ? 'animate-spin' : ''}`}
            />
            <span>Process Due</span>
          </button>

          <button
            onClick={() => onProcessRetries(true)}
            disabled={isProcessingRetries}
            title="Immediately retry all RETRYING events without waiting for backoff timers"
            className="inline-flex items-center px-2.5 py-1 rounded text-xs font-mono text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition disabled:opacity-50"
          >
            <Zap className="h-3 w-3 mr-1 text-amber-400" />
            <span>Force Retry</span>
          </button>
        </div>
      </div>

      <div className="bg-[#111113] border border-zinc-800 rounded-md overflow-hidden">
        {events.length === 0 ? (
          <div className="py-12 text-center text-zinc-500 font-mono text-xs">
            No events recorded for this view.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-950/70 text-zinc-500 font-mono uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-3 font-medium">Event / ID</th>
                  <th className="py-2.5 px-3 font-medium">Endpoint</th>
                  <th className="py-2.5 px-3 font-medium">Status</th>
                  <th className="py-2.5 px-3 font-medium">Attempts</th>
                  <th className="py-2.5 px-3 font-medium">Latency</th>
                  <th className="py-2.5 px-3 font-medium">Next / Ingested</th>
                  <th className="py-2.5 px-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-mono">
                {events.map((event) => {
                  const latestAttempt =
                    event.delivery_attempts?.[event.delivery_attempts.length - 1];
                  return (
                    <tr
                      key={event.id}
                      onClick={() => onInspectEvent(event)}
                      className="hover:bg-zinc-900/40 transition cursor-pointer"
                    >
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-zinc-200">{event.event_type}</div>
                        <div className="text-[10px] text-zinc-500 font-mono truncate max-w-[120px]" title={event.id}>
                          {event.id.slice(0, 8)}...
                        </div>
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="text-zinc-300 truncate max-w-[180px]">
                          {event.endpoint?.name || event.endpoint_id.slice(0, 8)}
                        </div>
                        <div
                          className="text-[10px] text-zinc-500 truncate max-w-[180px]"
                          title={event.endpoint?.url}
                        >
                          {event.endpoint?.url || '—'}
                        </div>
                      </td>

                      <td className="py-2.5 px-3">{getStatusBadge(event.status)}</td>

                      <td className="py-2.5 px-3 text-zinc-300">
                        <span>{event.attempt_count}</span>
                        <span className="text-zinc-600">/{event.max_attempts}</span>
                      </td>

                      <td className="py-2.5 px-3 text-zinc-300">
                        {latestAttempt ? (
                          <div className="flex items-center space-x-1">
                            <span>{latestAttempt.latency_ms}ms</span>
                            <span
                              className={`text-[10px] ${
                                latestAttempt.response_status && latestAttempt.response_status < 300
                                  ? 'text-emerald-400'
                                  : 'text-rose-400'
                              }`}
                            >
                              ({latestAttempt.response_status ? latestAttempt.response_status : 'ERR'})
                            </span>
                          </div>
                        ) : (
                          <span className="text-zinc-600">—</span>
                        )}
                      </td>

                      <td className="py-2.5 px-3">
                        {event.status === 'RETRYING' && event.next_retry_at ? (
                          <span className="text-amber-400 text-[11px]">
                            retry in{' '}
                            {Math.max(
                              0,
                              Math.round(
                                (new Date(event.next_retry_at).getTime() - Date.now()) / 1000
                              )
                            )}
                            s
                          </span>
                        ) : (
                          <span className="text-zinc-500 text-[11px]">
                            {new Date(event.created_at).toLocaleTimeString()}
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          {(event.status === 'DEAD_LETTER' || event.status === 'RETRYING') && (
                            <button
                              onClick={(e) => handleReplayClick(e, event.id)}
                              disabled={isReplaying && activeReplayId === event.id}
                              title="Replay Event"
                              className="px-2 py-0.5 rounded text-[10px] font-mono border border-rose-500/30 text-rose-300 hover:bg-rose-500/10 transition disabled:opacity-50 inline-flex items-center space-x-1"
                            >
                              <Play
                                className={`h-2.5 w-2.5 ${
                                  activeReplayId === event.id ? 'animate-spin' : ''
                                }`}
                              />
                              <span>Replay</span>
                            </button>
                          )}

                          <button
                            onClick={() => onInspectEvent(event)}
                            title="Inspect Event"
                            className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition"
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
    </div>
  );
}
