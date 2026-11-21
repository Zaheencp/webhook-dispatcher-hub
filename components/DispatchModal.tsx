'use client';

import { useState } from 'react';
import { X, Send, Sparkles, AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react';
import type { Endpoint, IngestResponse } from '@/types';

interface DispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  endpoints: Endpoint[];
  selectedEndpointId?: string;
  onSuccess: () => void;
  apiFetch: (input: string, init?: RequestInit) => Promise<Response>;
}

const TEMPLATES = [
  {
    type: 'order.created',
    payload: {
      order_id: 'ord_live_7719',
      customer_id: 'cus_99348',
      amount_total: 18500,
      currency: 'usd',
      items: [
        { sku: 'AGY-CORE-SEAT', qty: 5, unit_amount: 3700 }
      ],
      created_at: new Date().toISOString()
    }
  },
  {
    type: 'payment.succeeded',
    payload: {
      payment_id: 'pay_994182',
      order_id: 'ord_live_7719',
      status: 'succeeded',
      method: 'card',
      last4: '4242',
      captured_at: new Date().toISOString()
    }
  },
  {
    type: 'invoice.failed',
    payload: {
      invoice_id: 'inv_882910',
      attempt: 2,
      decline_code: 'insufficient_funds',
      next_payment_attempt: new Date(Date.now() + 86400000).toISOString()
    }
  }
];

export function DispatchModal({
  isOpen,
  onClose,
  endpoints,
  selectedEndpointId,
  onSuccess,
  apiFetch
}: DispatchModalProps) {
  const [endpointId, setEndpointId] = useState(selectedEndpointId || endpoints[0]?.id || '');
  const [eventType, setEventType] = useState(TEMPLATES[0].type);
  const [idempotencyKey, setIdempotencyKey] = useState(`idemp_${Date.now()}_${Math.floor(Math.random() * 1000)}`);
  const [rawPayload, setRawPayload] = useState(JSON.stringify(TEMPLATES[0].payload, null, 2));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<IngestResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelectTemplate = (template: typeof TEMPLATES[0]) => {
    setEventType(template.type);
    setRawPayload(JSON.stringify(template.payload, null, 2));
  };

  const handleRegenerateKey = () => {
    setIdempotencyKey(`idemp_${Date.now()}_${Math.floor(Math.random() * 1000)}`);
  };

  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setResult(null);

    let parsedPayload: Record<string, unknown>;
    try {
      parsedPayload = JSON.parse(rawPayload);
    } catch {
      setError('Payload must be valid JSON');
      setIsSubmitting(false);
      return;
    }

    try {
      const targetId = endpointId || selectedEndpointId || endpoints[0]?.id;
      if (!targetId) {
        throw new Error('Please select a target subscriber endpoint.');
      }

      const res = await apiFetch('/api/events/ingest', {
        method: 'POST',
        body: JSON.stringify({
          endpoint_id: targetId,
          event_type: eventType,
          idempotency_key: idempotencyKey,
          payload: parsedPayload,
        }),
      });

      const data = (await res.json()) as IngestResponse & { error?: string };
      if (!res.ok) {
        throw new Error(data.error || 'Failed to ingest webhook event');
      }

      setResult(data);
      onSuccess();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Unknown dispatch error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl">
        <div className="px-5 py-3.5 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Send className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-100">Ingest & Dispatch Webhook Event</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleDispatch} className="p-5 space-y-4 max-h-[85vh] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {result && (
            <div
              className={`p-3 rounded-lg text-xs border flex flex-col space-y-1.5 ${
                result.deduplicated
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              }`}
            >
              <div className="flex items-center justify-between font-semibold">
                <span className="flex items-center space-x-1.5">
                  {result.deduplicated ? (
                    <ShieldAlert className="h-4 w-4 text-amber-400" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  )}
                  <span>
                    {result.deduplicated
                      ? 'Idempotent Deduplication Enforced (No Duplicate Dispatch)'
                      : `Ingested & Dispatched Attempt #1 (${result.event.status})`}
                  </span>
                </span>
                <span className="text-[10px] font-mono opacity-80">{result.event.id.slice(0, 8)}...</span>
              </div>
              <p className="text-[11px] opacity-90">
                {result.deduplicated
                  ? `Event with idempotency key "${idempotencyKey}" already exists for this subscriber endpoint. Duplicate delivery was safely prevented.`
                  : `Signed with HMAC-SHA256 and sent to endpoint. Initial status: ${result.event.status}.`}
              </p>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">Target Endpoint</label>
            <select
              value={endpointId || selectedEndpointId || endpoints[0]?.id || ''}
              onChange={(e) => setEndpointId(e.target.value)}
              required
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
            >
              {endpoints.map((ep) => (
                <option key={ep.id} value={ep.id}>
                  {ep.name} ({ep.url}) {!ep.is_active ? '[PAUSED]' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-zinc-300">Preset Event Templates</label>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {TEMPLATES.map((tmpl) => (
                <button
                  type="button"
                  key={tmpl.type}
                  onClick={() => handleSelectTemplate(tmpl)}
                  className={`px-2.5 py-1 rounded text-xs border font-mono transition ${
                    eventType === tmpl.type
                      ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40'
                      : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  {tmpl.type}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Event Type</label>
              <input
                type="text"
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                required
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs font-mono text-zinc-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-zinc-300">Idempotency Key</label>
                <button
                  type="button"
                  onClick={handleRegenerateKey}
                  className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
                >
                  <Sparkles className="h-3 w-3 mr-0.5" />
                  <span>Fresh Key</span>
                </button>
              </div>
              <input
                type="text"
                value={idempotencyKey}
                onChange={(e) => setIdempotencyKey(e.target.value)}
                required
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs font-mono text-zinc-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">JSON Payload</label>
            <textarea
              rows={6}
              value={rawPayload}
              onChange={(e) => setRawPayload(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-xs font-mono text-zinc-300 focus:outline-none focus:border-indigo-500 leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200"
            >
              Done
            </button>
            <button
              type="submit"
              disabled={isSubmitting || endpoints.length === 0}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md disabled:opacity-50 transition flex items-center space-x-1.5"
            >
              <Send className="h-3.5 w-3.5" />
              <span>{isSubmitting ? 'Dispatching...' : 'Ingest & Dispatch'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
