'use client';

import { useState } from 'react';
import { Send, ChevronDown, ChevronRight } from 'lucide-react';

export function MockReceiverControl() {
  const [isExpanded, setIsExpanded] = useState(false);
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
      setPingResult(`HTTP ${res.status} (${elapsed}ms): ${text.slice(0, 120)}`);
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
    <div className="bg-[#111113] border border-zinc-800 rounded-md overflow-hidden text-xs">
      <div className="px-3.5 py-2 flex items-center justify-between border-b border-zinc-800/80 bg-zinc-950/40">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center space-x-2 text-zinc-300 hover:text-white transition font-medium"
        >
          {isExpanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-zinc-500" />
          )}
          <span>Mock Subscriber Sandbox</span>
          <span className="font-mono text-[10px] text-zinc-500">/api/mock-receiver</span>
        </button>

        <span className="font-mono text-[10px] text-zinc-500">
          mode: <span className="text-zinc-300">{testMode}</span>
        </span>
      </div>

      {isExpanded && (
        <div className="p-3.5 space-y-3 font-mono">
          <p className="text-[11px] text-zinc-400">
            Internal receiver endpoint validating HMAC-SHA256 signatures and returning simulated HTTP responses to verify retry schedules and DLQ transitions without third-party webhooks.
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setTestMode('success')}
              className={`px-2 py-1 rounded text-xs border transition ${
                testMode === 'success'
                  ? 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10'
                  : 'border-zinc-800 text-zinc-400 bg-[#09090b] hover:border-zinc-700'
              }`}
            >
              200 OK
            </button>

            <button
              onClick={() => setTestMode('fail')}
              className={`px-2 py-1 rounded text-xs border transition ${
                testMode === 'fail'
                  ? 'border-rose-500/40 text-rose-300 bg-rose-500/10'
                  : 'border-zinc-800 text-zinc-400 bg-[#09090b] hover:border-zinc-700'
              }`}
            >
              500 Error
            </button>

            <button
              onClick={() => setTestMode('timeout')}
              className={`px-2 py-1 rounded text-xs border transition ${
                testMode === 'timeout'
                  ? 'border-amber-500/40 text-amber-300 bg-amber-500/10'
                  : 'border-zinc-800 text-zinc-400 bg-[#09090b] hover:border-zinc-700'
              }`}
            >
              408 Timeout (6s)
            </button>

            <button
              onClick={handleTestMock}
              disabled={isPinging}
              className="ml-auto inline-flex items-center px-2.5 py-1 rounded text-xs font-mono text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 transition disabled:opacity-50"
            >
              <Send className={`h-3 w-3 mr-1 ${isPinging ? 'animate-spin' : ''}`} />
              <span>{isPinging ? 'Probing...' : 'Probe Target'}</span>
            </button>
          </div>

          {pingResult && (
            <div className="p-2 rounded bg-[#09090b] border border-zinc-800 text-[11px] text-zinc-300 break-all">
              {pingResult}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
