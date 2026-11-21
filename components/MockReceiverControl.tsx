'use client';

import { useState } from 'react';
import { Server, CheckCircle2, AlertTriangle, Clock, RefreshCw, Send } from 'lucide-react';

interface MockReceiverControlProps {
  onSeedDemo: () => void;
  isSeeding: boolean;
}

export function MockReceiverControl({ onSeedDemo, isSeeding }: MockReceiverControlProps) {
  const [testMode, setTestMode] = useState<'success' | 'fail' | 'timeout'>('success');
  const [isPinging, setIsPinging] = useState(false);
  const [pingResult, setPingResult] = useState<string | null>(null);

  const handleTestMock = async () => {
    setIsPinging(true);
    setPingResult(null);

    const startTime = Date.now();
    try {
      const res = await fetch(`/api/mock-receiver?mode=${testMode}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Id': 'manual-sandbox-ping',
        },
        body: JSON.stringify({ ping: true, timestamp: Date.now() }),
      });

      const elapsed = Date.now() - startTime;
      const text = await res.text();
      setPingResult(`HTTP ${res.status} in ${elapsed}ms: ${text.slice(0, 100)}`);
    } catch (err: unknown) {
      const elapsed = Date.now() - startTime;
      if (err instanceof Error) {
        setPingResult(`Network Error (${elapsed}ms): ${err.message}`);
      } else {
        setPingResult(`Failed in ${elapsed}ms`);
      }
    } finally {
      setIsPinging(false);
    }
  };

  return (
    <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-zinc-800">
        <div className="flex items-center space-x-2">
          <Server className="h-4 w-4 text-indigo-400" />
          <span className="text-xs font-semibold text-zinc-200">
            Internal Mock Receiver Sandbox
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
            /api/mock-receiver
          </span>
        </div>

        <button
          onClick={onSeedDemo}
          disabled={isSeeding}
          className="text-xs text-indigo-400 hover:text-indigo-300 font-medium inline-flex items-center self-start"
        >
          <RefreshCw className={`h-3 w-3 mr-1 ${isSeeding ? 'animate-spin' : ''}`} />
          <span>Reset / Seed Endpoints</span>
        </button>
      </div>

      <p className="text-xs text-zinc-400">
        Test subscriber destination that validates HMAC signatures and returns simulated HTTP responses for verifying retry loops and DLQ isolation.
      </p>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button
          onClick={() => setTestMode('success')}
          className={`px-2.5 py-1 rounded text-xs font-medium border flex items-center space-x-1.5 transition ${
            testMode === 'success'
              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
              : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-700'
          }`}
        >
          <CheckCircle2 className="h-3 w-3 text-emerald-400" />
          <span>200 OK Mode</span>
        </button>

        <button
          onClick={() => setTestMode('fail')}
          className={`px-2.5 py-1 rounded text-xs font-medium border flex items-center space-x-1.5 transition ${
            testMode === 'fail'
              ? 'bg-rose-500/15 text-rose-300 border-rose-500/40'
              : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-700'
          }`}
        >
          <AlertTriangle className="h-3 w-3 text-rose-400" />
          <span>500 Error Mode</span>
        </button>

        <button
          onClick={() => setTestMode('timeout')}
          className={`px-2.5 py-1 rounded text-xs font-medium border flex items-center space-x-1.5 transition ${
            testMode === 'timeout'
              ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
              : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-700'
          }`}
        >
          <Clock className="h-3 w-3 text-amber-400" />
          <span>408 Timeout Mode (6s Delay)</span>
        </button>

        <button
          onClick={handleTestMock}
          disabled={isPinging}
          className="ml-auto inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition"
        >
          <Send className={`h-3 w-3 mr-1 ${isPinging ? 'animate-spin' : ''}`} />
          <span>{isPinging ? 'Testing...' : 'Probe Receiver'}</span>
        </button>
      </div>

      {pingResult && (
        <div className="p-2 rounded bg-zinc-950 border border-zinc-800 font-mono text-[11px] text-zinc-300 truncate">
          {pingResult}
        </div>
      )}
    </div>
  );
}
