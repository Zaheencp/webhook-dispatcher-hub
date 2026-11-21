import { NextRequest, NextResponse } from 'next/server';
import { getSessionId } from '@/lib/session';
import { getEvents } from '@/lib/db';

export async function GET(request: NextRequest) {
  const sessionId = getSessionId(request);
  const statusFilter = request.nextUrl.searchParams.get('status') || undefined;

  const events = await getEvents(sessionId, statusFilter);
  return NextResponse.json({ events });
}
