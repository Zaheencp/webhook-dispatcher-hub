'use client';

import { useState } from 'react';
import { X, Send, Sparkles, CheckCircle2, ShieldAlert } from 'lucide-react';
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
      items: [{ sku: 'PRO-INFRA-SEAT', qty: 2 }],
    },
  },
  {
    type: 'payment.succeeded',
    payload: {
      payment_id: 'pay_994182',
      order_id: 'ord_live_7719',
      status: 'succeeded',
      last4: '4242',
    },
  },
  {
    type: 'invoice.failed',
    payload: {
      invoice_id: 'inv_882910',
      attempt: 2,
      decline_code: 'insufficient_funds',
    },
  },
];

export function DispatchModal({
  isOpen,
  onClose,
  endpoints,
  selectedEndpointId,
  onSuccess,
  apiFetch,
}: DispatchModalProps) {
  const [endpointId, setEndpointId] = useState(selectedEndpointId || endpoints[0]?.id || '');
  const [eventType, setEventType] = useState(TEMPLATES[0].type);
  const [idempotencyKey, setIdempotencyKey] = useState(
    `idemp_${Date.now()}_${Math.floor(Math.random() * 1000)}`
  );
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
    } catch (err) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-100">
      <div className="bg-[#121215] border border-zinc-800 rounded-lg w-full max-w-lg overflow-hidden shadow-2xl text-xs">
        <div className="px-5 py-3.5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60">
          <span className="font-semibold text-zinc-100 text-sm">Dispatch Outbound Event</span>
          <button
            onClick={onClose}
            className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleDispatch} className="p-5 space-y-4 max-h-[85vh] overflow-y-auto">
          {error && (
            <div className="p-2.5 rounded bg-rose-950/40 border border-rose-800/60 text-rose-300 font-mono text-[11px]">
              {error}
            </div>
          )}

          {result && (
            <div
              className={`p-3 rounded border font-mono text-[11px] ${
                result.deduplicated
                  ? 'bg-amber-950/40 border-amber-800/60 text-amber-300'
                  : 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
              }`}
            >
              <div className="flex items-center space-x-1.5 font-semibold">
                {result.deduplicated ? (
                  <ShieldAlert className="h-4 w-4 text-amber-400" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                )}
                <span>
                  {result.deduplicated
                    ? 'Deduplicated: Idempotency key previously processed'
                    : `Dispatched Attempt #1 (${result.event.status})`}
                </span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-zinc-300 font-medium mb-1">Target Endpoint</label>
            <select
              value={endpointId || selectedEndpointId || endpoints[0]?.id || ''}
              onChange={(e) => setEndpointId(e.target.value)}
              required
              className="w-full bg-[#0e0e11] border border-zinc-800 rounded-md px-3 py-1.5 text-zinc-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono text-xs"
            >
              {endpoints.map((ep) => (
                <option key={ep.id} value={ep.id}>
                  {ep.name} ({ep.url}) {!ep.is_active ? '[PAUSED]' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <span className="text-zinc-300 font-medium block mb-1">Payload Templates</span>
            <div className="flex flex-wrap gap-1.5">
              {TEMPLATES.map((tmpl) => (
                <button
                  type="button"
                  key={tmpl.type}
                  onClick={() => handleSelectTemplate(tmpl)}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono border transition ${
                    eventType === tmpl.type
                      ? 'bg-indigo-950/60 text-indigo-300 border-indigo-700/60 font-semibold'
                      : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  {tmpl.type}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-300 font-medium mb-1">Event Type</label>
              <input
                type="text"
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                required
                className="w-full bg-[#0e0e11] border border-zinc-800 rounded-md px-3 py-1.5 text-zinc-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono text-xs"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-zinc-300 font-medium">Idempotency Key</label>
                <button
                  type="button"
                  onClick={handleRegenerateKey}
                  className="text-[10px] text-indigo-400 hover:text-indigo-300 font-mono flex items-center space-x-0.5"
                >
                  <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                  <span>Fresh</span>
                </button>
              </div>
              <input
                type="text"
                value={idempotencyKey}
                onChange={(e) => setIdempotencyKey(e.target.value)}
                required
                className="w-full bg-[#0e0e11] border border-zinc-800 rounded-md px-3 py-1.5 text-zinc-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-zinc-300 font-medium mb-1">JSON Payload</label>
            <textarea
              rows={5}
              value={rawPayload}
              onChange={(e) => setRawPayload(e.target.value)}
              className="w-full bg-[#0e0e11] border border-zinc-800 rounded-md p-2.5 font-mono text-xs text-zinc-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-md text-xs font-medium text-zinc-400 hover:text-zinc-200 transition"
            >
              Done
            </button>
            <button
              type="submit"
              disabled={isSubmitting || endpoints.length === 0}
              className="px-3.5 py-1.5 rounded-md text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition disabled:opacity-50 shadow-sm flex items-center space-x-1"
            >
              <Send className="h-3.5 w-3.5" />
              <span>{isSubmitting ? 'Dispatching...' : 'Dispatch'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
