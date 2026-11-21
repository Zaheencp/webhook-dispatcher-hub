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
    <header className="h-14 bg-white border-b border-slate-200 px-4 sm:px-6 shadow-[0_1px_2px_rgba(15,23,42,0.03)] flex items-center justify-between shrink-0">
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          <div className="h-7 w-7 rounded bg-indigo-600 text-white flex items-center justify-center font-bold text-sm tracking-tight shadow-sm">
            W
          </div>
          <div className="flex items-baseline space-x-1.5">
            <span className="font-semibold text-slate-900 text-sm tracking-tight">
              Webhook Dispatcher
            </span>
            <span className="hidden sm:inline-block font-mono text-[10px] uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 font-medium">
              Workbench
            </span>
          </div>
        </div>

        <div className="h-4 w-[1px] bg-slate-200 hidden md:block" />

        <div className="hidden lg:flex items-center space-x-1.5 text-xs text-slate-600 font-mono">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-slate-500 text-[11px]">Neon Postgres</span>
        </div>

        <div className="h-4 w-[1px] bg-slate-200 hidden xl:block" />

        <div className="hidden xl:flex items-center space-x-1.5 text-xs font-mono text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">
          <Database className="h-3 w-3 text-slate-400" />
          <span className="text-[11px] text-slate-600">
            session:{sessionId ? sessionId.slice(0, 8) : '...'}
          </span>
          <button
            onClick={handleCopySession}
            title="Copy Session ID"
            className="text-slate-400 hover:text-slate-600 transition"
          >
            {copiedSession ? (
              <Check className="h-2.5 w-2.5 text-emerald-600" />
            ) : (
              <Copy className="h-2.5 w-2.5" />
            )}
          </button>
          <button
            onClick={onResetSession}
            title="Generate New Isolated Session"
            className="text-slate-400 hover:text-indigo-600 transition ml-0.5"
          >
            <RefreshCw className="h-2.5 w-2.5" />
          </button>
        </div>
      </div>

      <div className="hidden md:flex items-center text-xs font-mono bg-slate-50 border border-slate-200 rounded-md overflow-hidden divide-x divide-slate-200">
        <div className="px-2.5 py-1 flex items-center space-x-1.5">
          <span className="text-slate-400 uppercase text-[10px]">Total</span>
          <span className="font-semibold text-slate-800">{stats.total_events}</span>
        </div>
        <div className="px-2.5 py-1 flex items-center space-x-1.5">
          <span className="text-slate-400 uppercase text-[10px]">Success</span>
          <span className="font-semibold text-emerald-700">{stats.success_rate}%</span>
        </div>
        <div className="px-2.5 py-1 flex items-center space-x-1.5">
          <span className="text-slate-400 uppercase text-[10px]">Retrying</span>
          <span className="font-semibold text-amber-700">{stats.retrying_count}</span>
        </div>
        <div className="px-2.5 py-1 flex items-center space-x-1.5">
          <span className="text-slate-400 uppercase text-[10px]">DLQ</span>
          <span className="font-semibold text-rose-700">{stats.dead_letter_count}</span>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <button
          onClick={onSeedDemo}
          disabled={isSeeding}
          className="inline-flex items-center space-x-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-md transition shadow-[0_1px_2px_rgba(15,23,42,0.04)] disabled:opacity-50"
        >
          <Sparkles className={`h-3.5 w-3.5 text-amber-500 ${isSeeding ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">{isSeeding ? 'Seeding...' : 'Seed Demo'}</span>
        </button>

        <button
          onClick={onOpenCreateEndpoint}
          className="inline-flex items-center space-x-1 text-xs font-medium text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-md transition shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
        >
          <Plus className="h-3.5 w-3.5 text-slate-500" />
          <span>Endpoint</span>
        </button>

        <button
          onClick={onOpenDispatch}
          className="inline-flex items-center space-x-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-md transition shadow-sm"
        >
          <Send className="h-3.5 w-3.5" />
          <span>Send Event</span>
        </button>
      </div>
    </header>
  );
}
