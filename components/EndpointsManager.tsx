'use client';

import { useState } from 'react';
import { Plus, Trash2, Key, Copy, Check, Radio, ExternalLink, ShieldCheck, Power } from 'lucide-react';
import type { Endpoint } from '@/types';

interface EndpointsManagerProps {
  endpoints: Endpoint[];
  onRefresh: () => void;
  onOpenDispatch: (endpointId?: string) => void;
  apiFetch: (input: string, init?: RequestInit) => Promise<Response>;
}

export function EndpointsManager({
  endpoints,
  onRefresh,
  onOpenDispatch,
  apiFetch,
}: EndpointsManagerProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCopySecret = (endpoint: Endpoint) => {
    navigator.clipboard.writeText(endpoint.signing_secret);
    setCopiedId(endpoint.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleToggleActive = async (endpoint: Endpoint) => {
    try {
      await apiFetch(`/api/endpoints/${endpoint.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: !endpoint.is_active }),
      });
      onRefresh();
    } catch {
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this endpoint? Associated events will also cascade.')) {
      return;
    }
    try {
      await apiFetch(`/api/endpoints/${id}`, {
        method: 'DELETE',
      });
      onRefresh();
    } catch {
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !url.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await apiFetch('/api/endpoints', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          url: url.trim(),
          subscribed_events: ['*'],
          is_active: true,
        }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error || 'Failed to create endpoint');
      }

      setName('');
      setUrl('');
      setIsCreating(false);
      onRefresh();
    } catch (err: unknown) {
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
            <span>Webhook Endpoints</span>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">
              {endpoints.length}
            </span>
          </h2>
          <p className="text-xs text-zinc-400">
            Registered subscriber destinations with unique HMAC-SHA256 signing secrets.
          </p>
        </div>

        <button
          onClick={() => setIsCreating(!isCreating)}
          className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition"
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          {isCreating ? 'Cancel' : 'Register Endpoint'}
        </button>
      </div>

      {isCreating && (
        <form onSubmit={handleCreate} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
            <span className="text-xs font-semibold text-zinc-200">Register New Subscriber Endpoint</span>
          </div>

          {error && (
            <div className="p-2.5 rounded bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Friendly Name</label>
              <input
                type="text"
                placeholder="e.g. Stripe Payment Sync / Mock Receiver"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Target URL</label>
              <input
                type="text"
                placeholder="https://your-domain.com/webhooks or /api/mock-receiver"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
                className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="px-3 py-1.5 rounded-md text-xs font-medium text-zinc-400 hover:text-zinc-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-3.5 py-1.5 rounded-md text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 transition"
            >
              {isSubmitting ? 'Registering...' : 'Save & Generate Secret'}
            </button>
          </div>
        </form>
      )}

      {endpoints.length === 0 ? (
        <div className="text-center py-8 bg-zinc-900/40 border border-dashed border-zinc-800 rounded-xl">
          <Radio className="h-8 w-8 text-zinc-600 mx-auto mb-2" />
          <h3 className="text-xs font-semibold text-zinc-300">No Webhook Endpoints Configured</h3>
          <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
            Add an endpoint to dispatch signed events to your subscriber systems, or click Seed Demo above.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2.5">
          {endpoints.map((endpoint) => (
            <div
              key={endpoint.id}
              className="bg-zinc-900/60 border border-zinc-800/90 rounded-xl p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:border-zinc-700/80 transition"
            >
              <div className="space-y-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-xs text-zinc-100 truncate">{endpoint.name}</span>
                  <span
                    className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      endpoint.is_active
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                    }`}
                  >
                    {endpoint.is_active ? 'Active' : 'Paused'}
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-xs font-mono text-zinc-400">
                  <ExternalLink className="h-3 w-3 text-zinc-500 shrink-0" />
                  <span className="truncate max-w-xs md:max-w-md text-zinc-300" title={endpoint.url}>
                    {endpoint.url}
                  </span>
                </div>
                <div className="flex items-center space-x-2 pt-1 text-[11px]">
                  <span className="inline-flex items-center text-zinc-400 bg-zinc-950/80 border border-zinc-800 rounded px-2 py-0.5 font-mono">
                    <Key className="h-3 w-3 text-indigo-400 mr-1.5" />
                    <span>{endpoint.signing_secret.slice(0, 14)}...</span>
                    <button
                      onClick={() => handleCopySecret(endpoint)}
                      className="ml-2 text-zinc-400 hover:text-zinc-200 transition"
                      title="Copy full signing secret"
                    >
                      {copiedId === endpoint.id ? (
                        <Check className="h-3 w-3 text-emerald-400" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                  </span>
                  <span className="text-zinc-500 text-[10px]">
                    Subscribed: {endpoint.subscribed_events.join(', ')}
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-2 shrink-0 self-end md:self-center">
                <button
                  onClick={() => onOpenDispatch(endpoint.id)}
                  className="inline-flex items-center px-2.5 py-1 rounded text-xs font-medium bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 transition"
                >
                  <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                  Test Dispatch
                </button>
                <button
                  onClick={() => handleToggleActive(endpoint)}
                  title={endpoint.is_active ? 'Pause endpoint' : 'Activate endpoint'}
                  className={`p-1.5 rounded text-xs border transition ${
                    endpoint.is_active
                      ? 'text-zinc-400 hover:text-zinc-200 border-zinc-800 bg-zinc-900'
                      : 'text-amber-400 hover:text-amber-300 border-amber-500/20 bg-amber-500/10'
                  }`}
                >
                  <Power className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(endpoint.id)}
                  title="Delete endpoint"
                  className="p-1.5 rounded text-xs text-zinc-500 hover:text-rose-400 border border-zinc-800 bg-zinc-900 transition"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
