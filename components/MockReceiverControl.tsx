'use client';

import { useState } from 'react';
import { Send, Activity } from 'lucide-react';

export function MockReceiverControl() {
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
      setPingResult(`HTTP ${res.status} (${elapsed}ms): ${text.slice(0, 140)}`);
    } catch (err: unknown) {
      const elapsed = Date.now() - startTime;
      if (err instanceof Error) {
        setPingResult(`Error (${elapsed}ms): ${err.message}`);
      } else {
        setPingResult(`Failed (${elapsed}ms)`);
      }
    } finally {
      setIsPinging(false);
    }
  };

  return (
    <div className="bg-[#121215] border border-zinc-800 rounded-md shadow-[0_1px_2px_rgba(0,0,0,0.3)] p-4 text-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center space-x-2">
            <Activity className="h-4 w-4 text-indigo-400" />
            <span className="font-semibold text-zinc-100">
              Mock Subscriber Sandbox
            </span>
            <span className="font-mono text-[11px] text-zinc-400">
              /api/mock-receiver
            </span>
          </div>
          <p className="text-zinc-400 text-[11px]">
            Simulates a remote subscriber endpoint to verify exponential backoff retries, signature verification, and Dead-Letter Queueing.
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <div className="flex items-center bg-zinc-900 p-0.5 rounded border border-zinc-800 font-mono text-[11px]">
            <button
              onClick={() => setTestMode('success')}
              className={`px-2 py-1 rounded transition ${
                testMode === 'success'
                  ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 shadow-xs font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              200 OK
            </button>
            <button
              onClick={() => setTestMode('fail')}
              className={`px-2 py-1 rounded transition ${
                testMode === 'fail'
                  ? 'bg-rose-950/60 text-rose-300 border border-rose-800/60 shadow-xs font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              500 Error
            </button>
            <button
              onClick={() => setTestMode('timeout')}
              className={`px-2 py-1 rounded transition ${
                testMode === 'timeout'
                  ? 'bg-amber-950/60 text-amber-300 border border-amber-800/60 shadow-xs font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              408 Timeout
            </button>
          </div>

          <button
            onClick={handleTestMock}
            disabled={isPinging}
            className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded text-xs font-mono font-medium text-zinc-200 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 transition shadow-xs disabled:opacity-50"
          >
            <Send className={`h-3 w-3 ${isPinging ? 'animate-spin' : ''}`} />
            <span>{isPinging ? 'Probing...' : 'Probe'}</span>
          </button>
        </div>
      </div>

      {pingResult && (
        <div className="mt-3 p-2.5 rounded bg-[#0e0e11] border border-zinc-800 font-mono text-[11px] text-zinc-300 break-all">
          {pingResult}
        </div>
      )}
    </div>
  );
}
