'use client';

import { useState } from 'react';
import { X, Play, Copy, Check } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'payload' | 'attempts'>('payload');
  const [copiedPayload, setCopiedPayload] = useState(false);
  const [copiedSig, setCopiedSig] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);

  if (!isOpen || !event) return null;

  const handleCopy = (text: string, type: 'payload' | 'sig' | 'secret') => {
    navigator.clipboard.writeText(text);
    if (type === 'payload') {
      setCopiedPayload(true);
      setTimeout(() => setCopiedPayload(false), 1500);
    } else if (type === 'sig') {
      setCopiedSig(true);
      setTimeout(() => setCopiedSig(false), 1500);
    } else {
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 1500);
    }
  };

  const attempts = event.delivery_attempts || [];
  const latestAttempt = attempts[attempts.length - 1];
  const signatureHeader = latestAttempt?.request_headers?.['X-Webhook-Signature'];

  const getStatusBadge = (status: WebhookEvent['status']) => {
    switch (status) {
      case 'DELIVERED':
        return 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5';
      case 'RETRYING':
        return 'border-amber-500/30 text-amber-400 bg-amber-500/5';
      case 'DEAD_LETTER':
        return 'border-rose-500/30 text-rose-400 bg-rose-500/5';
      default:
        return 'border-zinc-800 text-zinc-400 bg-zinc-900';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/75 flex justify-end">
      <div className="w-full max-w-xl bg-[#111113] border-l border-zinc-800 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-150 text-xs">
        <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between shrink-0 bg-[#09090b]">
          <div className="space-y-0.5">
            <div className="flex items-center space-x-2">
              <span className="font-mono text-sm font-semibold text-zinc-100">{event.event_type}</span>
              <span
                className={`px-1.5 py-0.2 rounded text-[10px] font-mono border ${getStatusBadge(
                  event.status
                )}`}
              >
                {event.status}
              </span>
            </div>
            <div className="font-mono text-[11px] text-zinc-500">
              id: <span className="text-zinc-400">{event.id}</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex border-b border-zinc-800 px-4 shrink-0 bg-[#09090b]/60 text-xs font-mono">
          <button
            onClick={() => setActiveTab('payload')}
            className={`py-2 px-3 border-b-2 transition ${
              activeTab === 'payload'
                ? 'border-zinc-300 text-zinc-100 font-medium'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Payload & Headers
          </button>
          <button
            onClick={() => setActiveTab('attempts')}
            className={`py-2 px-3 border-b-2 transition ${
              activeTab === 'attempts'
                ? 'border-zinc-300 text-zinc-100 font-medium'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Attempt History ({attempts.length}/{event.max_attempts})
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {activeTab === 'payload' && (
            <div className="space-y-4">
              <div className="bg-[#09090b] border border-zinc-800 rounded-md p-3 space-y-2 font-mono">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-zinc-500">Destination:</span>
                  <span className="text-zinc-300 truncate max-w-xs">{event.endpoint?.url || '—'}</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-zinc-500">Idempotency Key:</span>
                  <span className="text-zinc-300">{event.idempotency_key}</span>
                </div>
                {event.endpoint?.signing_secret && (
                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-zinc-800/60">
                    <span className="text-zinc-500">Signing Secret:</span>
                    <div className="flex items-center space-x-1">
                      <span className="text-zinc-300">
                        {event.endpoint.signing_secret.slice(0, 18)}...
                      </span>
                      <button
                        onClick={() => handleCopy(event.endpoint!.signing_secret, 'secret')}
                        title="Copy Secret"
                        className="text-zinc-500 hover:text-zinc-300 ml-1 transition"
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

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                    Outgoing HTTP Headers
                  </span>
                  {signatureHeader && (
                    <button
                      onClick={() => handleCopy(signatureHeader, 'sig')}
                      className="inline-flex items-center space-x-1 text-[11px] font-mono text-zinc-400 hover:text-zinc-200 transition"
                    >
                      {copiedSig ? (
                        <Check className="h-3 w-3 text-emerald-400 mr-1" />
                      ) : (
                        <Copy className="h-3 w-3 mr-1" />
                      )}
                      <span>Copy Signature</span>
                    </button>
                  )}
                </div>

                <div className="bg-[#09090b] border border-zinc-800 rounded-md p-3 font-mono text-[11px] space-y-1.5">
                  <div>
                    <span className="text-zinc-500">Content-Type: </span>
                    <span className="text-zinc-300">application/json</span>
                  </div>
                  <div>
                    <span className="text-zinc-500">X-Webhook-Id: </span>
                    <span className="text-zinc-300">{event.id}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500">X-Webhook-Timestamp: </span>
                    <span className="text-zinc-300">
                      {latestAttempt?.request_headers?.['X-Webhook-Timestamp'] || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500">X-Webhook-Signature: </span>
                    <span className="text-zinc-300 break-all">
                      {signatureHeader || 'Generated on dispatch'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                    JSON Payload
                  </span>
                  <button
                    onClick={() => handleCopy(JSON.stringify(event.payload, null, 2), 'payload')}
                    className="inline-flex items-center space-x-1 text-[11px] font-mono text-zinc-400 hover:text-zinc-200 transition"
                  >
                    {copiedPayload ? (
                      <Check className="h-3 w-3 text-emerald-400 mr-1" />
                    ) : (
                      <Copy className="h-3 w-3 mr-1" />
                    )}
                    <span>Copy JSON</span>
                  </button>
                </div>
                <pre className="p-3 bg-[#09090b] border border-zinc-800 rounded-md font-mono text-[11px] text-zinc-300 overflow-x-auto leading-relaxed">
                  {JSON.stringify(event.payload, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'attempts' && (
            <div className="space-y-3 font-mono">
              {attempts.length === 0 ? (
                <div className="p-4 text-center text-zinc-500 text-xs">
                  No delivery attempts recorded yet.
                </div>
              ) : (
                attempts.map((attempt) => (
                  <div
                    key={attempt.id}
                    className="bg-[#09090b] border border-zinc-800 rounded-md p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-zinc-200">
                          #{attempt.attempt_number}
                        </span>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[10px] font-mono border ${
                            attempt.response_status && attempt.response_status < 300
                              ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5'
                              : 'border-rose-500/30 text-rose-400 bg-rose-500/5'
                          }`}
                        >
                          {attempt.response_status ? `HTTP ${attempt.response_status}` : 'ERR'}
                        </span>
                      </div>
                      <div className="text-[11px] text-zinc-500 space-x-2">
                        <span>{attempt.latency_ms}ms</span>
                        <span>•</span>
                        <span>{new Date(attempt.attempted_at).toLocaleTimeString()}</span>
                      </div>
                    </div>

                    {attempt.error_message && (
                      <div className="p-2 rounded bg-rose-500/5 border border-rose-500/20 text-rose-300 text-[11px]">
                        {attempt.error_message}
                      </div>
                    )}

                    {attempt.response_body && (
                      <div className="space-y-1">
                        <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">
                          Response Body
                        </span>
                        <pre className="p-2 rounded bg-zinc-950 border border-zinc-800 text-[10px] text-zinc-400 overflow-x-auto whitespace-pre-wrap">
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

        {(event.status === 'DEAD_LETTER' || event.status === 'RETRYING') && (
          <div className="p-3 border-t border-zinc-800 bg-[#09090b] shrink-0 flex items-center justify-between">
            <span className="text-zinc-400 text-xs font-mono">
              {event.status === 'DEAD_LETTER' ? 'Exhausted in DLQ' : 'Retrying delivery'}
            </span>
            <button
              onClick={() => onReplay(event.id)}
              disabled={isReplaying}
              className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium bg-zinc-100 hover:bg-white text-zinc-950 transition disabled:opacity-50"
            >
              <Play className={`h-3 w-3 mr-1.5 ${isReplaying ? 'animate-spin' : ''}`} />
              <span>{isReplaying ? 'Replaying...' : 'Replay Event'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
