import { NextRequest, NextResponse } from 'next/server';
import { getSessionId } from '@/lib/session';
import { getDashboardStats } from '@/lib/db';

export async function GET(request: NextRequest) {
  const sessionId = getSessionId(request);
  const stats = await getDashboardStats(sessionId);
  return NextResponse.json({ stats });
}
