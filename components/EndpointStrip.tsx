'use client';

import { useState } from 'react';
import { Copy, Check, Plus, Send, Power, Trash2 } from 'lucide-react';
import type { Endpoint } from '@/types';

interface EndpointStripProps {
  endpoints: Endpoint[];
  selectedEndpointId: string | null;
  onSelectEndpoint: (id: string | null) => void;
  onOpenCreateEndpoint: () => void;
  onOpenDispatch: (endpointId?: string) => void;
  onRefresh: () => void;
  apiFetch: (input: string, init?: RequestInit) => Promise<Response>;
}

export function EndpointStrip({
  endpoints,
  selectedEndpointId,
  onSelectEndpoint,
  onOpenCreateEndpoint,
  onOpenDispatch,
  onRefresh,
  apiFetch,
}: EndpointStripProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopySecret = (e: React.MouseEvent, endpoint: Endpoint) => {
    e.stopPropagation();
    navigator.clipboard.writeText(endpoint.signing_secret);
    setCopiedId(endpoint.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleToggleActive = async (e: React.MouseEvent, endpoint: Endpoint) => {
    e.stopPropagation();
    try {
      await apiFetch(`/api/endpoints/${endpoint.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: !endpoint.is_active }),
      });
      onRefresh();
    } catch {
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Delete this endpoint and all its historical events?')) return;
    try {
      await apiFetch(`/api/endpoints/${id}`, {
        method: 'DELETE',
      });
      if (selectedEndpointId === id) {
        onSelectEndpoint(null);
      }
      onRefresh();
    } catch {
    }
  };

  return (
    <div className="bg-[#0e0e11] border-b border-zinc-800/80 px-4 sm:px-6 py-2 flex items-center justify-between gap-3 text-xs overflow-x-auto">
      <div className="flex items-center space-x-2 shrink-0">
        <span className="font-mono text-[11px] uppercase tracking-wider text-zinc-500 font-semibold mr-1">
          Endpoints
        </span>

        <button
          onClick={() => onSelectEndpoint(null)}
          className={`px-2.5 py-1 rounded text-xs font-mono transition border ${
            selectedEndpointId === null
              ? 'bg-[#18181b] text-indigo-400 border-indigo-500/50 shadow-sm font-semibold'
              : 'bg-transparent text-zinc-400 hover:text-zinc-200 border-transparent hover:bg-zinc-900'
          }`}
        >
          All ({endpoints.length})
        </button>

        {endpoints.map((ep) => {
          const isSelected = selectedEndpointId === ep.id;
          return (
            <div
              key={ep.id}
              onClick={() => onSelectEndpoint(ep.id)}
              className={`group flex items-center space-x-2 px-2.5 py-1 rounded border transition cursor-pointer font-mono text-xs ${
                isSelected
                  ? 'bg-[#18181b] text-zinc-100 border-indigo-500/60 shadow-sm ring-1 ring-indigo-500/30'
                  : 'bg-zinc-900/60 text-zinc-300 hover:text-white border-zinc-800 hover:border-zinc-700'
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  ep.is_active ? 'bg-emerald-400' : 'bg-zinc-600'
                }`}
              />
              <span className="font-medium">{ep.name}</span>
              <span className="text-[11px] text-zinc-500 truncate max-w-[100px]" title={ep.url}>
                {ep.url.replace(/^https?:\/\/[^/]+/, '') || ep.url}
              </span>

              <button
                onClick={(e) => handleCopySecret(e, ep)}
                title="Copy signing secret"
                className="text-zinc-500 hover:text-zinc-300 transition ml-0.5"
              >
                {copiedId === ep.id ? (
                  <Check className="h-3 w-3 text-emerald-400" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenDispatch(ep.id);
                }}
                title="Send test event"
                className="text-zinc-500 hover:text-indigo-400 transition"
              >
                <Send className="h-2.5 w-2.5" />
              </button>

              <button
                onClick={(e) => handleToggleActive(e, ep)}
                title={ep.is_active ? 'Pause endpoint' : 'Resume endpoint'}
                className="text-zinc-500 hover:text-amber-400 transition"
              >
                <Power className="h-2.5 w-2.5" />
              </button>

              <button
                onClick={(e) => handleDelete(e, ep.id)}
                title="Delete endpoint"
                className="text-zinc-500 hover:text-rose-400 transition opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="h-2.5 w-2.5" />
              </button>
            </div>
          );
        })}
      </div>

      <div className="flex items-center space-x-2 shrink-0">
        <button
          onClick={onOpenCreateEndpoint}
          className="inline-flex items-center space-x-1 text-zinc-400 hover:text-indigo-400 font-mono text-xs transition"
        >
          <Plus className="h-3 w-3" />
          <span>Add</span>
        </button>
      </div>
    </div>
  );
}
