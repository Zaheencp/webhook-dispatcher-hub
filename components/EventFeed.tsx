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
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono border font-medium bg-emerald-50 text-emerald-700 border-emerald-200">
            DELIVERED
          </span>
        );
      case 'RETRYING':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono border font-medium bg-amber-50 text-amber-700 border-amber-200">
            RETRYING
          </span>
        );
      case 'DEAD_LETTER':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono border font-medium bg-rose-50 text-rose-700 border-rose-200">
            DEAD_LETTER
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono border font-medium bg-slate-100 text-slate-700 border-slate-200">
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
    <div className="bg-white border border-slate-200 rounded-md shadow-[0_1px_2px_rgba(15,23,42,0.04)] flex flex-col h-[760px] overflow-hidden">
      <div className="px-3.5 py-2.5 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center space-x-1 font-mono text-xs">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => onSelectStatus(tab.key)}
              className={`px-2 py-1 rounded text-xs transition ${
                selectedStatus === tab.key
                  ? 'bg-white text-slate-900 border border-slate-200 shadow-xs font-semibold'
                  : 'text-slate-500 hover:text-slate-800'
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
            className="inline-flex items-center px-2 py-1 rounded text-xs font-mono text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 transition shadow-xs disabled:opacity-50"
          >
            <RotateCcw
              className={`h-3 w-3 mr-1 text-slate-400 ${isProcessingRetries ? 'animate-spin' : ''}`}
            />
            <span>Process</span>
          </button>

          <button
            onClick={() => onProcessRetries(true)}
            disabled={isProcessingRetries}
            title="Immediately force retry all RETRYING events"
            className="inline-flex items-center px-2 py-1 rounded text-xs font-mono font-medium text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition shadow-xs disabled:opacity-50"
          >
            <Zap className="h-3 w-3 mr-0.5 text-amber-600" />
            <span>Force</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
        {events.length === 0 ? (
          <div className="py-16 text-center text-slate-400 font-mono text-xs">
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
                    ? 'border-l-4 border-l-indigo-600 bg-indigo-50/30'
                    : 'border-l-4 border-l-transparent hover:bg-slate-50/80'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono font-semibold text-slate-900 text-[13px]">
                    {event.event_type}
                  </span>
                  {getStatusPill(event.status)}
                </div>

                <div className="flex items-center justify-between text-slate-500 font-mono text-[11px] mb-1.5">
                  <span className="truncate max-w-[210px]" title={event.endpoint?.name || event.endpoint_id}>
                    {event.endpoint?.name || event.endpoint_id.slice(0, 8)}
                  </span>
                  <span>
                    {event.attempt_count}/{event.max_attempts} attempts
                  </span>
                </div>

                <div className="flex items-center justify-between font-mono text-[11px] text-slate-400">
                  <div className="flex items-center space-x-1.5">
                    {latestAttempt ? (
                      <>
                        <span
                          className={`font-semibold ${
                            latestAttempt.response_status && latestAttempt.response_status < 300
                              ? 'text-emerald-600'
                              : 'text-rose-600'
                          }`}
                        >
                          {latestAttempt.response_status ? `HTTP ${latestAttempt.response_status}` : 'ERR'}
                        </span>
                        <span>•</span>
                        <span>{latestAttempt.latency_ms}ms</span>
                      </>
                    ) : (
                      <span>Pending dispatch</span>
                    )}
                  </div>

                  <div>
                    {event.status === 'RETRYING' && event.next_retry_at ? (
                      <span className="text-amber-600 font-medium">
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
