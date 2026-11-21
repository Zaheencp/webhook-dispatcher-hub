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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-100">
      <div className="bg-[#121215] border border-zinc-800 rounded-lg w-full max-w-lg overflow-hidden shadow-2xl">
        <div className="px-5 py-3.5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60">
          <div className="flex items-center space-x-2">
            <Key className="h-4 w-4 text-indigo-400" />
            <span className="text-sm font-semibold text-zinc-100">
              Register Webhook Subscriber Endpoint
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded bg-rose-950/40 border border-rose-800/60 text-rose-300 font-mono text-xs">
              {error}
            </div>
          )}

          <div>
            <label className="block text-zinc-300 font-medium mb-1">Friendly Name</label>
            <input
              type="text"
              placeholder="e.g. Production Payment Gateway"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full bg-[#0e0e11] border border-zinc-800 rounded-md px-3 py-1.5 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono text-xs"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-zinc-300 font-medium">Destination URL</label>
              <button
                type="button"
                onClick={() => setUrl('/api/mock-receiver?mode=success')}
                className="text-[11px] font-mono text-indigo-400 hover:text-indigo-300 underline"
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
              className="w-full bg-[#0e0e11] border border-zinc-800 rounded-md px-3 py-1.5 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono text-xs"
            />
          </div>

          <div>
            <label className="block text-zinc-300 font-medium mb-1">
              Subscribed Events (comma-separated or * for all)
            </label>
            <input
              type="text"
              placeholder="order.created, payment.succeeded, *"
              value={subscribedEvents}
              onChange={(e) => setSubscribedEvents(e.target.value)}
              className="w-full bg-[#0e0e11] border border-zinc-800 rounded-md px-3 py-1.5 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono text-xs"
            />
          </div>

          <div className="p-3 rounded bg-zinc-950/60 border border-zinc-800 text-[11px] font-mono text-zinc-400 space-y-1">
            <span className="text-zinc-200 font-medium block">Automatic Signing Secret</span>
            <span>A cryptographically secure <code className="text-indigo-400">whsec_...</code> HMAC key will be generated for payload signing.</span>
          </div>

          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-md text-xs font-medium text-zinc-400 hover:text-zinc-200 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-3.5 py-1.5 rounded-md text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition disabled:opacity-50 shadow-sm flex items-center space-x-1"
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
