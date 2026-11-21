'use client';

import { useState } from 'react';
import { Database, Plus, Send, Sparkles, RefreshCw, Copy, Check } from 'lucide-react';
import type { DashboardStats } from '@/types';

interface HeaderProps {
  sessionId: string;
  onResetSession: () => void;
  onSeedDemo: () => Promise<void>;
  onOpenCreateEndpoint: () => void;
  onOpenDispatch: () => void;
  isSeeding: boolean;
  stats: DashboardStats;
}

export function Header({
  sessionId,
  onResetSession,
  onSeedDemo,
  onOpenCreateEndpoint,
  onOpenDispatch,
  isSeeding,
  stats,
}: HeaderProps) {
  const [copiedSession, setCopiedSession] = useState(false);

  const handleCopySession = () => {
    navigator.clipboard.writeText(sessionId);
    setCopiedSession(true);
    setTimeout(() => setCopiedSession(false), 1500);
  };

  return (
    <header className="h-14 bg-[#121215] border-b border-zinc-800 px-4 sm:px-6 shadow-[0_1px_2px_rgba(0,0,0,0.3)] flex items-center justify-between shrink-0">
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          <div className="h-7 w-7 rounded bg-indigo-600 text-white flex items-center justify-center font-bold text-sm tracking-tight shadow-sm">
            W
          </div>
          <div className="flex items-baseline space-x-1.5">
            <span className="font-semibold text-zinc-100 text-sm tracking-tight">
              Webhook Dispatcher
            </span>
            <span className="hidden sm:inline-block font-mono text-[10px] uppercase px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800 font-medium">
              Workbench
            </span>
          </div>
        </div>

        <div className="h-4 w-[1px] bg-zinc-800 hidden md:block" />

        <div className="hidden lg:flex items-center space-x-1.5 text-xs text-zinc-400 font-mono">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-zinc-400 text-[11px]">Neon Postgres</span>
        </div>

        <div className="h-4 w-[1px] bg-zinc-800 hidden xl:block" />

        <div className="hidden xl:flex items-center space-x-1.5 text-xs font-mono text-zinc-400 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded">
          <Database className="h-3 w-3 text-zinc-500" />
          <span className="text-[11px] text-zinc-300">
            session:{sessionId ? sessionId.slice(0, 8) : '...'}
          </span>
          <button
            onClick={handleCopySession}
            title="Copy Session ID"
            className="text-zinc-500 hover:text-zinc-300 transition"
          >
            {copiedSession ? (
              <Check className="h-2.5 w-2.5 text-emerald-400" />
            ) : (
              <Copy className="h-2.5 w-2.5" />
            )}
          </button>
          <button
            onClick={onResetSession}
            title="Generate New Isolated Session"
            className="text-zinc-500 hover:text-indigo-400 transition ml-0.5"
          >
            <RefreshCw className="h-2.5 w-2.5" />
          </button>
        </div>
      </div>

      <div className="hidden md:flex items-center text-xs font-mono bg-zinc-900 border border-zinc-800 rounded-md overflow-hidden divide-x divide-zinc-800">
        <div className="px-2.5 py-1 flex items-center space-x-1.5">
          <span className="text-zinc-500 uppercase text-[10px]">Total</span>
          <span className="font-semibold text-zinc-200">{stats.total_events}</span>
        </div>
        <div className="px-2.5 py-1 flex items-center space-x-1.5">
          <span className="text-zinc-500 uppercase text-[10px]">Success</span>
          <span className="font-semibold text-emerald-400">{stats.success_rate}%</span>
        </div>
        <div className="px-2.5 py-1 flex items-center space-x-1.5">
          <span className="text-zinc-500 uppercase text-[10px]">Retrying</span>
          <span className="font-semibold text-amber-400">{stats.retrying_count}</span>
        </div>
        <div className="px-2.5 py-1 flex items-center space-x-1.5">
          <span className="text-zinc-500 uppercase text-[10px]">DLQ</span>
          <span className="font-semibold text-rose-400">{stats.dead_letter_count}</span>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <button
          onClick={onSeedDemo}
          disabled={isSeeding}
          className="inline-flex items-center space-x-1.5 text-xs font-medium text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 px-2.5 py-1.5 rounded-md transition shadow-[0_1px_2px_rgba(0,0,0,0.2)] disabled:opacity-50"
        >
          <Sparkles className={`h-3.5 w-3.5 text-amber-400 ${isSeeding ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">{isSeeding ? 'Seeding...' : 'Seed Demo'}</span>
        </button>

        <button
          onClick={onOpenCreateEndpoint}
          className="inline-flex items-center space-x-1 text-xs font-medium text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 px-2.5 py-1.5 rounded-md transition shadow-[0_1px_2px_rgba(0,0,0,0.2)]"
        >
          <Plus className="h-3.5 w-3.5 text-zinc-400" />
          <span>Endpoint</span>
        </button>

        <button
          onClick={onOpenDispatch}
          className="inline-flex items-center space-x-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 rounded-md transition shadow-sm"
        >
          <Send className="h-3.5 w-3.5" />
          <span>Send Event</span>
        </button>
      </div>
    </header>
  );
}
