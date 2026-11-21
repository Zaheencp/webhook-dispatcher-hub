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
    <div className="bg-slate-50/80 border-b border-slate-200 px-4 sm:px-6 py-2 flex items-center justify-between gap-3 text-xs overflow-x-auto">
      <div className="flex items-center space-x-2 shrink-0">
        <span className="font-mono text-[11px] uppercase tracking-wider text-slate-400 font-semibold mr-1">
          Endpoints
        </span>

        <button
          onClick={() => onSelectEndpoint(null)}
          className={`px-2.5 py-1 rounded text-xs font-mono transition border ${
            selectedEndpointId === null
              ? 'bg-white text-indigo-700 border-indigo-200 shadow-sm font-semibold'
              : 'bg-transparent text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-100'
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
                  ? 'bg-white text-slate-900 border-indigo-300 shadow-sm ring-1 ring-indigo-200'
                  : 'bg-white/80 text-slate-600 hover:text-slate-900 border-slate-200 hover:border-slate-300'
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  ep.is_active ? 'bg-emerald-500' : 'bg-slate-400'
                }`}
              />
              <span className="font-medium">{ep.name}</span>
              <span className="text-[11px] text-slate-400 truncate max-w-[100px]" title={ep.url}>
                {ep.url.replace(/^https?:\/\/[^/]+/, '') || ep.url}
              </span>

              <button
                onClick={(e) => handleCopySecret(e, ep)}
                title="Copy signing secret"
                className="text-slate-400 hover:text-slate-700 transition ml-0.5"
              >
                {copiedId === ep.id ? (
                  <Check className="h-3 w-3 text-emerald-600" />
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
                className="text-slate-400 hover:text-indigo-600 transition"
              >
                <Send className="h-2.5 w-2.5" />
              </button>

              <button
                onClick={(e) => handleToggleActive(e, ep)}
                title={ep.is_active ? 'Pause endpoint' : 'Resume endpoint'}
                className="text-slate-400 hover:text-amber-600 transition"
              >
                <Power className="h-2.5 w-2.5" />
              </button>

              <button
                onClick={(e) => handleDelete(e, ep.id)}
                title="Delete endpoint"
                className="text-slate-400 hover:text-rose-600 transition opacity-0 group-hover:opacity-100"
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
          className="inline-flex items-center space-x-1 text-slate-500 hover:text-indigo-600 font-mono text-xs transition"
        >
          <Plus className="h-3 w-3" />
          <span>Add</span>
        </button>
      </div>
    </div>
  );
}
