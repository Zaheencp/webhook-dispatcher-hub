'use client';

import type { DashboardStats } from '@/types';

interface KpiStripProps {
  stats: DashboardStats;
}

export function KpiStrip({ stats }: KpiStripProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 bg-[#111113] border border-zinc-800 rounded-md overflow-hidden text-xs">
      <div className="p-3.5 border-b lg:border-b-0 border-r border-zinc-800">
        <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block">
          Total Ingested
        </span>
        <div className="mt-1 flex items-baseline space-x-2">
          <span className="font-mono text-xl font-semibold text-zinc-100 tracking-tight">
            {stats.total_events}
          </span>
          <span className="text-[11px] text-zinc-500 font-mono">events</span>
        </div>
      </div>

      <div className="p-3.5 border-b lg:border-b-0 border-r-0 lg:border-r border-zinc-800">
        <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block">
          Delivery Rate
        </span>
        <div className="mt-1 flex items-baseline space-x-2">
          <span className="font-mono text-xl font-semibold text-zinc-100 tracking-tight">
            {stats.success_rate}%
          </span>
          <span className="text-[11px] text-zinc-500 font-mono">
            ({stats.delivered_count}/{stats.total_events || 0})
          </span>
        </div>
      </div>

      <div className="p-3.5 border-r border-zinc-800">
        <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block">
          Active Retries
        </span>
        <div className="mt-1 flex items-baseline space-x-2">
          <span
            className={`font-mono text-xl font-semibold tracking-tight ${
              stats.retrying_count > 0 ? 'text-amber-400' : 'text-zinc-100'
            }`}
          >
            {stats.retrying_count}
          </span>
          <span className="text-[11px] text-zinc-500 font-mono">backoff active</span>
        </div>
      </div>

      <div className="p-3.5">
        <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block">
          Dead-Letter Queue
        </span>
        <div className="mt-1 flex items-baseline space-x-2">
          <span
            className={`font-mono text-xl font-semibold tracking-tight ${
              stats.dead_letter_count > 0 ? 'text-rose-400' : 'text-zinc-100'
            }`}
          >
            {stats.dead_letter_count}
          </span>
          <span className="text-[11px] text-zinc-500 font-mono">exhausted</span>
        </div>
      </div>
    </div>
  );
}
