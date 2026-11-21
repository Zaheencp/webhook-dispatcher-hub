'use client';

import { useState } from 'react';
import { X, Plus, Key } from 'lucide-react';
import type { Endpoint } from '@/types';

interface EndpointModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (endpoint: Endpoint) => void;
  apiFetch: (input: string, init?: RequestInit) => Promise<Response>;
}

export function EndpointModal({
  isOpen,
  onClose,
  onCreated,
  apiFetch,
}: EndpointModalProps) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [subscribedEvents, setSubscribedEvents] = useState('*');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !url.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const eventsList = subscribedEvents
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await apiFetch('/api/endpoints', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          url: url.trim(),
          subscribed_events: eventsList.length > 0 ? eventsList : ['*'],
          is_active: true,
        }),
      });

      const data = (await res.json()) as { endpoint?: Endpoint; error?: string };
      if (!res.ok || !data.endpoint) {
        throw new Error(data.error || 'Failed to create subscriber endpoint');
      }

      onCreated(data.endpoint);
      setName('');
      setUrl('');
      setSubscribedEvents('*');
      onClose();
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Error creating endpoint');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-100">
      <div className="bg-white border border-slate-200 rounded-lg w-full max-w-lg overflow-hidden shadow-xl">
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center space-x-2">
            <Key className="h-4 w-4 text-indigo-600" />
            <span className="text-sm font-semibold text-slate-900">
              Register Webhook Subscriber Endpoint
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded bg-rose-50 border border-rose-200 text-rose-700 font-mono text-xs">
              {error}
            </div>
          )}

          <div>
            <label className="block text-slate-700 font-medium mb-1">Friendly Name</label>
            <input
              type="text"
              placeholder="e.g. Production Payment Gateway"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full bg-white border border-slate-300 rounded-md px-3 py-1.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 font-mono text-xs"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-slate-700 font-medium">Destination URL</label>
              <button
                type="button"
                onClick={() => setUrl('/api/mock-receiver?mode=success')}
                className="text-[11px] font-mono text-indigo-600 hover:text-indigo-800 underline"
              >
                Use Mock Receiver
              </button>
            </div>
            <input
              type="text"
              placeholder="https://api.domain.com/webhooks or /api/mock-receiver"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              className="w-full bg-white border border-slate-300 rounded-md px-3 py-1.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 font-mono text-xs"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-medium mb-1">
              Subscribed Events (comma-separated or * for all)
            </label>
            <input
              type="text"
              placeholder="order.created, payment.succeeded, *"
              value={subscribedEvents}
              onChange={(e) => setSubscribedEvents(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-md px-3 py-1.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 font-mono text-xs"
            />
          </div>

          <div className="p-3 rounded bg-slate-50 border border-slate-200 text-[11px] font-mono text-slate-600 space-y-1">
            <span className="text-slate-800 font-medium block">Automatic Signing Secret</span>
            <span>A cryptographically secure <code className="text-indigo-600">whsec_...</code> HMAC key will be generated for cryptographic payload signing.</span>
          </div>

          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-md text-xs font-medium text-slate-600 hover:text-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-3.5 py-1.5 rounded-md text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white transition disabled:opacity-50 shadow-sm flex items-center space-x-1"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{isSubmitting ? 'Registering...' : 'Register Endpoint'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
