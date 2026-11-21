import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function normalizeUuid(input?: string | null): string {
  if (!input || input.trim().length === 0) {
    return '00000000-0000-0000-0000-000000000000';
  }
  const str = input.trim();
  if (UUID_REGEX.test(str)) {
    return str.toLowerCase();
  }
  const hex = crypto.createHash('md5').update(str).digest('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

export function getSessionId(request: NextRequest): string {
  const sessionId = request.headers.get('x-session-id');
  return normalizeUuid(sessionId);
}

export function jsonError(message: string, status = 400): NextResponse {
  return NextResponse.json({ error: message, success: false }, { status });
}
