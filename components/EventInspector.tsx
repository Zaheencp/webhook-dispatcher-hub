'use client';

import { useState } from 'react';
import { Play, Copy, Check, Clock, ExternalLink } from 'lucide-react';
import type { WebhookEvent, EventStatus } from '@/types';

interface EventInspectorProps {
  event: WebhookEvent | null;
  onReplay: (eventId: string) => Promise<void>;
  isReplaying: boolean;
}

export function EventInspector({
  event,
  onReplay,
  isReplaying,
}: EventInspectorProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'payload' | 'attempts'>('overview');
  const [copiedPayload, setCopiedPayload] = useState(false);
  const [copiedSig, setCopiedSig] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);

  if (!event) {
    return (
      <div className="bg-[#121215] border border-zinc-800 rounded-md shadow-[0_1px_2px_rgba(0,0,0,0.3)] h-[760px] flex items-center justify-center p-8 text-center">
        <div className="max-w-xs space-y-2">
          <div className="h-10 w-10 mx-auto rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500">
            <Clock className="h-5 w-5" />
          </div>
          <p className="font-mono text-xs font-semibold text-zinc-300">No Event Selected</p>
          <p className="text-xs text-zinc-500">
            Select an event from the feed on the left to inspect its cryptographic signatures, payload, and delivery attempt logs.
          </p>
        </div>
      </div>
    );
  }

  const handleCopy = (text: string, type: 'payload' | 'sig' | 'id' | 'secret') => {
    navigator.clipboard.writeText(text);
    if (type === 'payload') {
      setCopiedPayload(true);
      setTimeout(() => setCopiedPayload(false), 1500);
    } else if (type === 'sig') {
      setCopiedSig(true);
      setTimeout(() => setCopiedSig(false), 1500);
    } else if (type === 'id') {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 1500);
    } else {
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 1500);
    }
  };

  const attempts = event.delivery_attempts || [];
  const latestAttempt = attempts[attempts.length - 1];
  const signatureHeader = latestAttempt?.request_headers?.['X-Webhook-Signature'];

  const getStatusPill = (status: EventStatus) => {
    switch (status) {
      case 'DELIVERED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono border font-medium bg-emerald-950/40 text-emerald-400 border-emerald-800/60">
            DELIVERED
          </span>
        );
      case 'RETRYING':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono border font-medium bg-amber-950/40 text-amber-400 border-amber-800/60">
            RETRYING
          </span>
        );
      case 'DEAD_LETTER':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono border font-medium bg-rose-950/40 text-rose-400 border-rose-800/60">
            DEAD_LETTER
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono border font-medium bg-zinc-900 text-zinc-400 border-zinc-800">
            PENDING
          </span>
        );
    }
  };

  return (
    <div className="bg-[#121215] border border-zinc-800 rounded-md shadow-[0_1px_2px_rgba(0,0,0,0.3)] h-[760px] flex flex-col overflow-hidden text-xs">
      <div className="p-4 border-b border-zinc-800 bg-zinc-900/40 flex items-center justify-between gap-3 shrink-0">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center space-x-2.5">
            <span className="font-mono text-base font-semibold text-zinc-100 truncate">
              {event.event_type}
            </span>
            {getStatusPill(event.status)}
          </div>
          <div className="flex items-center space-x-2 text-zinc-400 font-mono text-[11px]">
            <span className="text-zinc-500">id:</span>
            <span className="text-zinc-300 font-medium">{event.id}</span>
            <button
              onClick={() => handleCopy(event.id, 'id')}
              title="Copy event id"
              className="text-zinc-500 hover:text-zinc-300 transition"
            >
              {copiedId ? (
                <Check className="h-3 w-3 text-emerald-400" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </button>
          </div>
        </div>

        {(event.status === 'DEAD_LETTER' || event.status === 'RETRYING') && (
          <button
            onClick={() => onReplay(event.id)}
            disabled={isReplaying}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-sm disabled:opacity-50 shrink-0"
          >
            <Play className={`h-3 w-3 ${isReplaying ? 'animate-spin' : ''}`} />
            <span>{isReplaying ? 'Replaying...' : 'Replay Event'}</span>
          </button>
        )}
      </div>

      <div className="flex border-b border-zinc-800 px-4 bg-[#121215] shrink-0 font-mono text-xs">
        <button
          onClick={() => setActiveTab('overview')}
          className={`py-2 px-3 border-b-2 font-medium transition ${
            activeTab === 'overview'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Overview & Headers
        </button>
        <button
          onClick={() => setActiveTab('payload')}
          className={`py-2 px-3 border-b-2 font-medium transition ${
            activeTab === 'payload'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Payload (JSON)
        </button>
        <button
          onClick={() => setActiveTab('attempts')}
          className={`py-2 px-3 border-b-2 font-medium transition ${
            activeTab === 'attempts'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Attempts ({attempts.length}/{event.max_attempts})
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-md p-3 space-y-1">
                <span className="font-mono text-[10px] uppercase text-zinc-500 font-semibold tracking-wider block">
                  Subscriber Endpoint
                </span>
                <div className="font-medium text-zinc-200 truncate">
                  {event.endpoint?.name || 'Subscriber Endpoint'}
                </div>
                <div className="font-mono text-[11px] text-zinc-400 truncate flex items-center space-x-1">
                  <span>{event.endpoint?.url || '—'}</span>
                  {event.endpoint?.url && (
                    <a
                      href={event.endpoint.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-zinc-500 hover:text-zinc-300"
                    >
                      <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  )}
                </div>
              </div>

              <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-md p-3 space-y-1">
                <span className="font-mono text-[10px] uppercase text-zinc-500 font-semibold tracking-wider block">
                  Idempotency Guarantee
                </span>
                <div className="font-mono text-[12px] text-zinc-200 truncate">
                  {event.idempotency_key}
                </div>
                <div className="text-[11px] text-zinc-500">
                  Enforces unique delivery per (session, endpoint, key)
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] uppercase tracking-wider text-zinc-400 font-semibold">
                  Outbound Cryptographic Headers
                </span>
                {signatureHeader && (
                  <button
                    onClick={() => handleCopy(signatureHeader, 'sig')}
                    className="inline-flex items-center space-x-1 text-[11px] font-mono text-indigo-400 hover:text-indigo-300 transition"
                  >
                    {copiedSig ? (
                      <Check className="h-3 w-3 text-emerald-400 mr-0.5" />
                    ) : (
                      <Copy className="h-3 w-3 mr-0.5" />
                    )}
                    <span>Copy Signature</span>
                  </button>
                )}
              </div>

              <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-md p-3 font-mono text-[12px] space-y-2 text-zinc-300">
                <div className="flex items-baseline justify-between gap-2 border-b border-zinc-800/60 pb-1.5">
                  <span className="text-zinc-500">Content-Type</span>
                  <span className="text-zinc-200 font-medium">application/json</span>
                </div>
                <div className="flex items-baseline justify-between gap-2 border-b border-zinc-800/60 pb-1.5">
                  <span className="text-zinc-500">X-Webhook-Id</span>
                  <span className="text-zinc-200 font-medium truncate max-w-xs">{event.id}</span>
                </div>
                <div className="flex items-baseline justify-between gap-2 border-b border-zinc-800/60 pb-1.5">
                  <span className="text-zinc-500">X-Webhook-Timestamp</span>
                  <span className="text-zinc-200 font-medium">
                    {latestAttempt?.request_headers?.['X-Webhook-Timestamp'] ||
                      Math.floor(new Date(event.created_at).getTime() / 1000).toString()}
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">X-Webhook-Signature</span>
                    <span className="text-[10px] text-zinc-500 font-sans">HMAC-SHA256 (v1)</span>
                  </div>
                  <div className="bg-[#0e0e11] border border-zinc-800 rounded p-2 text-[11px] break-all text-zinc-300">
                    {signatureHeader || 'Generated on dispatch'}
                  </div>
                </div>

                {event.endpoint?.signing_secret && (
                  <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between">
                    <span className="text-zinc-500 text-[11px]">Signing Secret:</span>
                    <div className="flex items-center space-x-1">
                      <span className="text-zinc-300 font-medium text-[11px]">
                        {event.endpoint.signing_secret.slice(0, 16)}...
                      </span>
                      <button
                        onClick={() => handleCopy(event.endpoint!.signing_secret, 'secret')}
                        title="Copy signing secret"
                        className="text-zinc-500 hover:text-zinc-300 transition ml-1"
                      >
                        {copiedSecret ? (
                          <Check className="h-3 w-3 text-emerald-400" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'payload' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] uppercase tracking-wider text-zinc-400 font-semibold">
                Request Payload Body
              </span>
              <button
                onClick={() => handleCopy(JSON.stringify(event.payload, null, 2), 'payload')}
                className="inline-flex items-center space-x-1 text-[11px] font-mono text-indigo-400 hover:text-indigo-300 transition"
              >
                {copiedPayload ? (
                  <Check className="h-3 w-3 text-emerald-400 mr-0.5" />
                ) : (
                  <Copy className="h-3 w-3 mr-0.5" />
                )}
                <span>Copy JSON</span>
              </button>
            </div>
            <pre className="p-3.5 bg-[#0e0e11] border border-zinc-800 rounded-md font-mono text-[12px] text-zinc-200 overflow-x-auto leading-relaxed shadow-xs">
              {JSON.stringify(event.payload, null, 2)}
            </pre>
          </div>
        )}

        {activeTab === 'attempts' && (
          <div className="space-y-3 font-mono">
            {attempts.length === 0 ? (
              <div className="p-6 text-center text-zinc-500 text-xs">
                No dispatch attempts logged yet.
              </div>
            ) : (
              attempts.map((attempt) => (
                <div
                  key={attempt.id}
                  className="bg-zinc-950/60 border border-zinc-800 rounded-md p-3 space-y-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-zinc-200">
                        Attempt #{attempt.attempt_number}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono border font-medium ${
                          attempt.response_status && attempt.response_status < 300
                            ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/60'
                            : 'bg-rose-950/40 text-rose-400 border-rose-800/60'
                        }`}
                      >
                        {attempt.response_status ? `HTTP ${attempt.response_status}` : 'NETWORK_ERROR'}
                      </span>
                    </div>

                    <div className="text-[11px] text-zinc-500 space-x-2">
                      <span>{attempt.latency_ms}ms</span>
                      <span>•</span>
                      <span>{new Date(attempt.attempted_at).toLocaleTimeString()}</span>
                    </div>
                  </div>

                  {attempt.error_message && (
                    <div className="p-2 rounded bg-rose-950/30 border border-rose-900/60 text-rose-300 text-[11px]">
                      {attempt.error_message}
                    </div>
                  )}

                  {attempt.response_body && (
                    <div className="space-y-1">
                      <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">
                        Response Body
                      </span>
                      <pre className="p-2 rounded bg-[#0e0e11] border border-zinc-800 text-[11px] text-zinc-300 overflow-x-auto whitespace-pre-wrap">
                        {attempt.response_body}
                      </pre>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
