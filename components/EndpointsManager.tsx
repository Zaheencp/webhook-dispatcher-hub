'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Copy, Check, Power, Trash2, Send } from 'lucide-react';
import type { Endpoint } from '@/types';

interface EndpointsManagerProps {
  endpoints: Endpoint[];
  onRefresh: () => void;
  onOpenCreateEndpoint: () => void;
  onOpenDispatch: (endpointId?: string) => void;
  apiFetch: (input: string, init?: RequestInit) => Promise<Response>;
}

export function EndpointsManager({
  endpoints,
  onRefresh,
  onOpenCreateEndpoint,
  onOpenDispatch,
  apiFetch,
}: EndpointsManagerProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopySecret = (endpoint: Endpoint) => {
    navigator.clipboard.writeText(endpoint.signing_secret);
    setCopiedId(endpoint.id);
    setTimeout(() => setCopiedId(null), 1500);
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
    if (!confirm('Delete this endpoint and cascade associated records?')) return;
    try {
      await apiFetch(`/api/endpoints/${id}`, {
        method: 'DELETE',
      });
      onRefresh();
    } catch {
    }
  };

  return (
    <div className="bg-[#111113] border border-zinc-800 rounded-md overflow-hidden text-xs">
      <div className="px-3.5 py-2.5 flex items-center justify-between border-b border-zinc-800/80 bg-zinc-950/40">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center space-x-2 text-zinc-300 hover:text-white transition font-medium"
        >
          {isExpanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-zinc-500" />
          )}
          <span>Registered Endpoints</span>
          <span className="font-mono text-[11px] px-1.5 py-0.2 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
            {endpoints.length}
          </span>
        </button>

        <button
          onClick={onOpenCreateEndpoint}
          className="text-xs font-mono text-zinc-400 hover:text-zinc-200"
        >
          + Add
        </button>
      </div>

      {isExpanded && (
        <div>
          {endpoints.length === 0 ? (
            <div className="p-4 text-center text-zinc-500 font-mono text-xs">
              No subscriber endpoints registered yet. Click &quot;+ Add&quot; or &quot;Seed Demo Data&quot; above.
            </div>
          ) : (
            <div className="divide-y divide-zinc-800/60">
              {endpoints.map((ep) => (
                <div
                  key={ep.id}
                  className="px-3.5 py-2.5 flex flex-col md:flex-row md:items-center justify-between gap-2 hover:bg-zinc-900/30 transition"
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-zinc-200">{ep.name}</span>
                      <span
                        className={`px-1.5 py-0.2 rounded text-[10px] font-mono border ${
                          ep.is_active
                            ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5'
                            : 'border-zinc-800 text-zinc-500 bg-zinc-900'
                        }`}
                      >
                        {ep.is_active ? 'ACTIVE' : 'PAUSED'}
                      </span>
                    </div>

                    <div className="font-mono text-[11px] text-zinc-400 truncate max-w-lg" title={ep.url}>
                      {ep.url}
                    </div>

                    <div className="flex items-center space-x-3 pt-0.5 text-[11px] font-mono text-zinc-500">
                      <div className="flex items-center space-x-1">
                        <span>secret:</span>
                        <span className="text-zinc-400">{ep.signing_secret.slice(0, 14)}...</span>
                        <button
                          onClick={() => handleCopySecret(ep)}
                          title="Copy signing secret"
                          className="text-zinc-500 hover:text-zinc-300 ml-1 transition"
                        >
                          {copiedId === ep.id ? (
                            <Check className="h-3 w-3 text-emerald-400" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                      <span>•</span>
                      <span>events: {ep.subscribed_events.join(', ')}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5 shrink-0 self-end md:self-center">
                    <button
                      onClick={() => onOpenDispatch(ep.id)}
                      className="inline-flex items-center px-2 py-1 rounded text-xs font-mono text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 transition"
                      title="Trigger Test Dispatch"
                    >
                      <Send className="h-3 w-3 mr-1 text-zinc-400" />
                      <span>Test</span>
                    </button>

                    <button
                      onClick={() => handleToggleActive(ep)}
                      className="p-1 rounded text-zinc-400 hover:text-zinc-200 border border-zinc-800 hover:bg-zinc-900 transition"
                      title={ep.is_active ? 'Pause Endpoint' : 'Activate Endpoint'}
                    >
                      <Power className="h-3 w-3" />
                    </button>

                    <button
                      onClick={() => handleDelete(ep.id)}
                      className="p-1 rounded text-zinc-500 hover:text-rose-400 border border-zinc-800 hover:bg-zinc-900 transition"
                      title="Delete Endpoint"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
