'use client';

import { useState } from 'react';
import { Radio, RefreshCw, Copy, Check, Sparkles, Shield, Database } from 'lucide-react';

interface HeaderProps {
  sessionId: string;
  onResetSession: () => void;
  onSeedDemo: () => void;
  isSeeding: boolean;
}

export function Header({ sessionId, onResetSession, onSeedDemo, isSeeding }: HeaderProps) {
  const [copied, setCopied] = useState(false);

  const handleCopySession = () => {
    navigator.clipboard.writeText(sessionId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Radio className="h-5 w-5 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-zinc-100 text-lg tracking-tight">
                Dispatcher & Reliability Hub
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                HMAC-SHA256
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Developer infrastructure for secure, idempotent outbound webhook delivery & DLQ
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={onSeedDemo}
            disabled={isSeeding}
            className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition disabled:opacity-50"
          >
            <Sparkles className={`h-3.5 w-3.5 mr-1.5 ${isSeeding ? 'animate-spin' : ''}`} />
            {isSeeding ? 'Seeding Demo...' : 'Seed Demo Hub'}
          </button>

          <div className="hidden md:flex items-center bg-zinc-900 border border-zinc-800 rounded-md px-2.5 py-1 text-xs">
            <Shield className="h-3.5 w-3.5 text-zinc-400 mr-1.5" />
            <span className="text-zinc-500 mr-1.5">Sandbox:</span>
            <span className="font-mono text-zinc-300 max-w-[110px] truncate" title={sessionId}>
              {sessionId ? `${sessionId.slice(0, 8)}...` : 'Initializing'}
            </span>
            <button
              onClick={handleCopySession}
              title="Copy Session ID"
              className="ml-2 text-zinc-400 hover:text-zinc-200 transition"
            >
              {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
            </button>
            <button
              onClick={onResetSession}
              title="Generate Fresh Sandbox Session"
              className="ml-2 text-zinc-500 hover:text-zinc-300 transition"
            >
              <RefreshCw className="h-3 w-3" />
            </button>
          </div>

          <div className="hidden lg:flex items-center text-[11px] text-zinc-300 bg-zinc-900/60 border border-emerald-500/30 px-2 py-1 rounded">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse mr-1.5"></span>
            <Database className="h-3 w-3 text-emerald-400 mr-1" />
            <span>Neon Serverless Postgres</span>
          </div>
        </div>
      </div>
    </header>
  );
}
