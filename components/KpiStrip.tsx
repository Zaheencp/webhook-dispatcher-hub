'use client';

import { CheckCircle2, Clock, AlertTriangle, Layers, Activity } from 'lucide-react';
import type { DashboardStats } from '@/types';

interface KpiStripProps {
  stats: DashboardStats;
}

export function KpiStrip({ stats }: KpiStripProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-xl p-4 transition hover:border-zinc-700">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-zinc-400">Total Ingested</span>
          <Layers className="h-4 w-4 text-zinc-500" />
        </div>
        <div className="mt-2 text-2xl font-bold tracking-tight text-zinc-100">
          {stats.total_events}
        </div>
        <p className="mt-1 text-[11px] text-zinc-500">Unique webhook events</p>
      </div>

      <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-xl p-4 transition hover:border-zinc-700">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-zinc-400">Success Rate</span>
          <Activity className="h-4 w-4 text-emerald-400" />
        </div>
        <div className="mt-2 flex items-baseline space-x-1">
          <span className="text-2xl font-bold tracking-tight text-emerald-400">
            {stats.success_rate}%
          </span>
          <span className="text-xs text-zinc-500">
            ({stats.delivered_count}/{stats.total_events || 0})
          </span>
        </div>
        <div className="w-full bg-zinc-800 h-1 rounded-full mt-2 overflow-hidden">
          <div
            className="bg-emerald-500 h-full rounded-full transition-all duration-500"
            style={{ width: `${stats.success_rate}%` }}
          />
        </div>
      </div>

      <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-xl p-4 transition hover:border-zinc-700">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-zinc-400">Delivered</span>
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
        </div>
        <div className="mt-2 text-2xl font-bold tracking-tight text-zinc-100">
          {stats.delivered_count}
        </div>
        <p className="mt-1 text-[11px] text-zinc-500">2xx HTTP acknowledged</p>
      </div>

      <div
        className={`bg-zinc-900/70 border rounded-xl p-4 transition hover:border-zinc-700 ${
          stats.retrying_count > 0 ? 'border-amber-500/40 bg-amber-950/10' : 'border-zinc-800/80'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-amber-400">Active Retries</span>
          <Clock className="h-4 w-4 text-amber-400" />
        </div>
        <div className="mt-2 text-2xl font-bold tracking-tight text-amber-400">
          {stats.retrying_count}
        </div>
        <p className="mt-1 text-[11px] text-zinc-500">Exponential backoff active</p>
      </div>

      <div
        className={`col-span-2 md:col-span-1 bg-zinc-900/70 border rounded-xl p-4 transition hover:border-zinc-700 ${
          stats.dead_letter_count > 0 ? 'border-rose-500/40 bg-rose-950/10' : 'border-zinc-800/80'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-rose-400">Dead-Letter Queue</span>
          <AlertTriangle className="h-4 w-4 text-rose-400" />
        </div>
        <div className="mt-2 text-2xl font-bold tracking-tight text-rose-400">
          {stats.dead_letter_count}
        </div>
        <p className="mt-1 text-[11px] text-zinc-500">Exhausted (Ready to Replay)</p>
      </div>
    </div>
  );
}
