'use client';

import { useState } from 'react';
import { Copy, Check, RotateCcw, Plus, Send, Sparkles } from 'lucide-react';

interface HeaderProps {
  sessionId: string;
  onResetSession: () => void;
  onSeedDemo: () => void;
  onOpenCreateEndpoint: () => void;
  onOpenDispatch: () => void;
  isSeeding: boolean;
}

export function Header({
  sessionId,
  onResetSession,
  onSeedDemo,
  onOpenCreateEndpoint,
  onOpenDispatch,
  isSeeding,
}: HeaderProps) {
  const [copied, setCopied] = useState(false);

  const handleCopySession = () => {
    navigator.clipboard.writeText(sessionId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <header className="h-13 bg-[#09090b] border-b border-zinc-800 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          <span className="font-semibold text-sm tracking-tight text-zinc-100">
            Webhook Dispatcher
          </span>
          <span className="text-zinc-600 text-xs">/</span>
          <span className="text-xs text-zinc-400 font-medium">Reliability Hub</span>
        </div>

        <div className="hidden sm:inline-flex items-center text-[11px] font-mono text-zinc-400 bg-[#111113] border border-zinc-800 px-2 py-0.5 rounded-md">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5" />
          <span>Neon Postgres</span>
        </div>

        <div className="hidden lg:flex items-center text-[11px] font-mono text-zinc-500 bg-[#111113] border border-zinc-800 px-2 py-0.5 rounded-md">
          <span className="text-zinc-600 mr-1.5">session:</span>
          <span className="text-zinc-300 truncate max-w-[90px]" title={sessionId}>
            {sessionId ? sessionId.slice(0, 8) : '...'}
          </span>
          <button
            onClick={handleCopySession}
            title="Copy Session ID"
            className="ml-1.5 text-zinc-500 hover:text-zinc-300 transition"
          >
            {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
          </button>
          <button
            onClick={onResetSession}
            title="Reset Session"
            className="ml-1 text-zinc-500 hover:text-zinc-300 transition"
          >
            <RotateCcw className="h-3 w-3" />
          </button>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <button
          onClick={onSeedDemo}
          disabled={isSeeding}
          className="inline-flex items-center px-2.5 py-1 text-xs font-mono text-zinc-400 hover:text-zinc-200 bg-[#111113] hover:bg-zinc-900 border border-zinc-800 rounded-md transition disabled:opacity-50"
        >
          <Sparkles className={`h-3 w-3 mr-1.5 text-zinc-400 ${isSeeding ? 'animate-spin' : ''}`} />
          <span>{isSeeding ? 'Seeding...' : 'Seed Demo Data'}</span>
        </button>

        <button
          onClick={onOpenCreateEndpoint}
          className="inline-flex items-center px-2.5 py-1 text-xs font-medium text-zinc-300 hover:text-white bg-[#111113] hover:bg-zinc-900 border border-zinc-800 rounded-md transition"
        >
          <Plus className="h-3 w-3 mr-1" />
          <span>Endpoint</span>
        </button>

        <button
          onClick={onOpenDispatch}
          className="inline-flex items-center px-3 py-1 text-xs font-medium text-zinc-950 bg-zinc-100 hover:bg-white rounded-md transition shadow-xs"
        >
          <Send className="h-3 w-3 mr-1.5 text-zinc-950" />
          <span>Dispatch Event</span>
        </button>
      </div>
    </header>
  );
}
