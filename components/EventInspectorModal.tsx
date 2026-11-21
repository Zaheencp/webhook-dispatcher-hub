'use client';

import { useState } from 'react';
import { X, Play, Copy, Check, Clock, ShieldCheck, Server, AlertCircle } from 'lucide-react';
import type { WebhookEvent } from '@/types';

interface EventInspectorModalProps {
  event: WebhookEvent | null;
  isOpen: boolean;
  onClose: () => void;
  onReplay: (eventId: string) => Promise<void>;
  isReplaying: boolean;
}

export function EventInspectorModal({
  event,
  isOpen,
  onClose,
  onReplay,
  isReplaying,
}: EventInspectorModalProps) {
  const [copiedPayload, setCopiedPayload] = useState(false);
  const [activeTab, setActiveTab] = useState<'attempts' | 'payload' | 'headers'>('attempts');

  if (!isOpen || !event) return null;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 2000);
  };

  const getStatusBadge = (status: WebhookEvent['status']) => {
    switch (status) {
      case 'DELIVERED':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'RETRYING':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'DEAD_LETTER':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      default:
        return 'bg-zinc-800 text-zinc-400 border-zinc-700';
    }
  };

  const attempts = event.delivery_attempts || [];
  const latestAttempt = attempts[attempts.length - 1];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-2xl bg-zinc-900 border-l border-zinc-800 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between shrink-0 bg-zinc-950/60">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="font-mono text-sm font-bold text-zinc-100">{event.event_type}</span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider uppercase border ${getStatusBadge(
                  event.status
                )}`}
              >
                {event.status}
              </span>
            </div>
            <div className="flex items-center space-x-3 text-xs text-zinc-400">
              <span className="font-mono text-zinc-500">ID: {event.id}</span>
              <span>•</span>
              <span className="text-zinc-500">Idempotency: {event.idempotency_key}</span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {(event.status === 'DEAD_LETTER' || event.status === 'RETRYING') && (
              <button
                onClick={() => onReplay(event.id)}
                disabled={isReplaying}
                className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-sm disabled:opacity-50 transition"
              >
                <Play className={`h-3.5 w-3.5 mr-1.5 ${isReplaying ? 'animate-spin' : ''}`} />
                {isReplaying ? 'Replaying...' : 'Replay Event (DLQ)'}
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex border-b border-zinc-800 px-5 shrink-0 bg-zinc-950/40 text-xs">
          <button
            onClick={() => setActiveTab('attempts')}
            className={`py-2.5 px-3 border-b-2 font-medium transition ${
              activeTab === 'attempts'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Delivery Attempts ({attempts.length}/{event.max_attempts})
          </button>
          <button
            onClick={() => setActiveTab('payload')}
            className={`py-2.5 px-3 border-b-2 font-medium transition ${
              activeTab === 'payload'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Payload JSON
          </button>
          <button
            onClick={() => setActiveTab('headers')}
            className={`py-2.5 px-3 border-b-2 font-medium transition ${
              activeTab === 'headers'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            HMAC Headers
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {activeTab === 'attempts' && (
            <div className="space-y-4">
              <div className="bg-zinc-950 border border-zinc-800/80 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Target Endpoint</span>
                  <span className="text-zinc-200 font-medium">
                    {event.endpoint?.name || event.endpoint_id}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Destination URL</span>
                  <span className="font-mono text-zinc-300 truncate max-w-xs" title={event.endpoint?.url}>
                    {event.endpoint?.url || 'Unknown'}
                  </span>
                </div>
                {event.status === 'RETRYING' && event.next_retry_at && (
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-zinc-800/60 text-amber-400">
                    <span className="flex items-center">
                      <Clock className="h-3.5 w-3.5 mr-1" />
                      Next Exponential Retry
                    </span>
                    <span className="font-mono">
                      {new Date(event.next_retry_at).toLocaleTimeString()} (in{' '}
                      {Math.max(
                        0,
                        Math.round((new Date(event.next_retry_at).getTime() - Date.now()) / 1000)
                      )}
                      s)
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                  Chronological Attempt History
                </h4>

                {attempts.length === 0 ? (
                  <div className="text-center py-6 text-zinc-500 text-xs bg-zinc-950/40 rounded-lg border border-zinc-800">
                    No delivery attempts recorded yet.
                  </div>
                ) : (
                  attempts.map((attempt) => (
                    <div
                      key={attempt.id}
                      className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-xs font-bold text-zinc-200">
                            Attempt #{attempt.attempt_number}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                              attempt.response_status && attempt.response_status < 300
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            }`}
                          >
                            {attempt.response_status ? `HTTP ${attempt.response_status}` : 'NETWORK_ERROR'}
                          </span>
                        </div>
                        <div className="flex items-center space-x-3 text-xs text-zinc-400 font-mono">
                          <span>{attempt.latency_ms}ms</span>
                          <span>•</span>
                          <span>{new Date(attempt.attempted_at).toLocaleTimeString()}</span>
                        </div>
                      </div>

                      {attempt.error_message && (
                        <div className="p-2.5 rounded bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-start space-x-2 font-mono">
                          <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
                          <span>{attempt.error_message}</span>
                        </div>
                      )}

                      {attempt.response_body && (
                        <div className="space-y-1">
                          <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                            Response Body (Truncated)
                          </span>
                          <pre className="p-2.5 rounded bg-zinc-900 border border-zinc-800/80 text-[11px] font-mono text-zinc-300 overflow-x-auto whitespace-pre-wrap">
                            {attempt.response_body}
                          </pre>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'payload' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400">Outbound JSON Payload</span>
                <button
                  onClick={() => handleCopy(JSON.stringify(event.payload, null, 2))}
                  className="inline-flex items-center space-x-1 text-xs text-zinc-400 hover:text-zinc-200"
                >
                  {copiedPayload ? (
                    <Check className="h-3 w-3 text-emerald-400 mr-1" />
                  ) : (
                    <Copy className="h-3 w-3 mr-1" />
                  )}
                  <span>{copiedPayload ? 'Copied' : 'Copy JSON'}</span>
                </button>
              </div>
              <pre className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-200 overflow-x-auto leading-relaxed">
                {JSON.stringify(event.payload, null, 2)}
              </pre>
            </div>
          )}

          {activeTab === 'headers' && (
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 flex items-start space-x-2">
                <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5 text-indigo-400" />
                <span>
                  Headers generated by the Dispatcher Engine. The payload is signed with HMAC-SHA256
                  using the subscriber endpoint&apos;s private signing secret over{' '}
                  <code className="text-zinc-200">&apos;${'{timestamp}'}.${'{payload}'}&apos;</code>.
                </span>
              </div>

              {latestAttempt?.request_headers ? (
                <div className="space-y-2">
                  {Object.entries(latestAttempt.request_headers).map(([key, val]) => (
                    <div
                      key={key}
                      className="bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-xs font-mono"
                    >
                      <span className="text-zinc-400 font-semibold">{key}: </span>
                      <span className="text-zinc-200 break-all">{val}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-zinc-500 text-xs bg-zinc-950/40 rounded-lg border border-zinc-800">
                  Headers will appear here once the first dispatch attempt executes.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
