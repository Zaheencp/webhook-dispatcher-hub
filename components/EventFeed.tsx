'use client';

import { RotateCcw, Zap } from 'lucide-react';
import type { WebhookEvent, EventStatus } from '@/types';

interface EventFeedProps {
  events: WebhookEvent[];
  selectedEventId: string | null;
  onSelectEvent: (event: WebhookEvent) => void;
  selectedStatus: string;
  onSelectStatus: (status: string) => void;
  onProcessRetries: (force?: boolean) => Promise<void>;
  isProcessingRetries: boolean;
}

export function EventFeed({
  events,
  selectedEventId,
  onSelectEvent,
  selectedStatus,
  onSelectStatus,
  onProcessRetries,
  isProcessingRetries,
}: EventFeedProps) {
  const getStatusPill = (status: EventStatus) => {
    switch (status) {
      case 'DELIVERED':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono border font-medium bg-emerald-950/40 text-emerald-400 border-emerald-800/60">
            DELIVERED
          </span>
        );
      case 'RETRYING':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono border font-medium bg-amber-950/40 text-amber-400 border-amber-800/60">
            RETRYING
          </span>
        );
      case 'DEAD_LETTER':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono border font-medium bg-rose-950/40 text-rose-400 border-rose-800/60">
            DEAD_LETTER
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono border font-medium bg-zinc-900 text-zinc-400 border-zinc-800">
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
    <div className="bg-[#121215] border border-zinc-800 rounded-md shadow-[0_1px_2px_rgba(0,0,0,0.3)] flex flex-col h-[760px] overflow-hidden">
      <div className="px-3.5 py-2.5 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center space-x-1 font-mono text-xs">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => onSelectStatus(tab.key)}
              className={`px-2 py-1 rounded text-xs transition ${
                selectedStatus === tab.key
                  ? 'bg-[#18181b] text-zinc-100 border border-zinc-700 shadow-xs font-semibold'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => onProcessRetries(false)}
            disabled={isProcessingRetries}
            title="Dispatch scheduled retries whose timer has elapsed"
            className="inline-flex items-center px-2 py-1 rounded text-xs font-mono text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 transition shadow-xs disabled:opacity-50"
          >
            <RotateCcw
              className={`h-3 w-3 mr-1 text-zinc-400 ${isProcessingRetries ? 'animate-spin' : ''}`}
            />
            <span>Process</span>
          </button>

          <button
            onClick={() => onProcessRetries(true)}
            disabled={isProcessingRetries}
            title="Immediately force retry all RETRYING events"
            className="inline-flex items-center px-2 py-1 rounded text-xs font-mono font-medium text-amber-300 bg-amber-950/40 hover:bg-amber-900/40 border border-amber-800/60 transition shadow-xs disabled:opacity-50"
          >
            <Zap className="h-3 w-3 mr-0.5 text-amber-400" />
            <span>Force</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-zinc-800/60">
        {events.length === 0 ? (
          <div className="py-16 text-center text-zinc-500 font-mono text-xs">
            No events match current filter.
          </div>
        ) : (
          events.map((event) => {
            const isSelected = selectedEventId === event.id;
            const latestAttempt = event.delivery_attempts?.[event.delivery_attempts.length - 1];

            return (
              <div
                key={event.id}
                onClick={() => onSelectEvent(event)}
                className={`p-3 transition cursor-pointer text-xs font-sans ${
                  isSelected
                    ? 'border-l-4 border-l-indigo-500 bg-indigo-950/25'
                    : 'border-l-4 border-l-transparent hover:bg-zinc-900/40'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono font-semibold text-zinc-100 text-[13px]">
                    {event.event_type}
                  </span>
                  {getStatusPill(event.status)}
                </div>

                <div className="flex items-center justify-between text-zinc-400 font-mono text-[11px] mb-1.5">
                  <span className="truncate max-w-[210px]" title={event.endpoint?.name || event.endpoint_id}>
                    {event.endpoint?.name || event.endpoint_id.slice(0, 8)}
                  </span>
                  <span className="text-zinc-500">
                    {event.attempt_count}/{event.max_attempts} attempts
                  </span>
                </div>

                <div className="flex items-center justify-between font-mono text-[11px] text-zinc-500">
                  <div className="flex items-center space-x-1.5">
                    {latestAttempt ? (
                      <>
                        <span
                          className={`font-semibold ${
                            latestAttempt.response_status && latestAttempt.response_status < 300
                              ? 'text-emerald-400'
                              : 'text-rose-400'
                          }`}
                        >
                          {latestAttempt.response_status ? `HTTP ${latestAttempt.response_status}` : 'ERR'}
                        </span>
                        <span>•</span>
                        <span>{latestAttempt.latency_ms}ms</span>
                      </>
                    ) : (
                      <span className="text-zinc-500">Pending dispatch</span>
                    )}
                  </div>

                  <div>
                    {event.status === 'RETRYING' && event.next_retry_at ? (
                      <span className="text-amber-400 font-medium">
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
                      <span>{new Date(event.created_at).toLocaleTimeString()}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
