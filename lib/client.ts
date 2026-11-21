'use client';

import { useState, useEffect, useCallback } from 'react';

const SESSION_STORAGE_KEY = 'webhook_hub_session_id';

export function getClientSessionId(): string {
  if (typeof window === 'undefined') {
    return '00000000-0000-0000-0000-000000000000';
  }

  let sessionId = localStorage.getItem(SESSION_STORAGE_KEY);
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
  }
  return sessionId;
}

export function resetClientSessionId(): string {
  if (typeof window === 'undefined') return '';
  const newId = crypto.randomUUID();
  localStorage.setItem(SESSION_STORAGE_KEY, newId);
  return newId;
}

export function useSession() {
  const [sessionId, setSessionId] = useState<string>('');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const id = getClientSessionId();
    setSessionId(id);
    setIsReady(true);
  }, []);

  const resetSession = useCallback(() => {
    const newId = resetClientSessionId();
    setSessionId(newId);
    window.location.reload();
  }, []);

  const apiFetch = useCallback(
    async (input: string, init?: RequestInit): Promise<Response> => {
      const activeSession = sessionId || getClientSessionId();
      const headers = new Headers(init?.headers);
      headers.set('x-session-id', activeSession);
      if (!headers.has('Content-Type') && init?.method && init.method !== 'GET') {
        headers.set('Content-Type', 'application/json');
      }

      return fetch(input, {
        ...init,
        headers,
      });
    },
    [sessionId]
  );

  return { sessionId, isReady, resetSession, apiFetch };
}
