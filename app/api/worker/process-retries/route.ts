import { NextRequest, NextResponse } from 'next/server';
import { getSessionId } from '@/lib/session';
import { getDueRetryingEvents, getEndpointById } from '@/lib/db';
import { dispatchWebhookEvent } from '@/lib/dispatcher';

export async function POST(request: NextRequest) {
  const sessionId = getSessionId(request);
  const force = request.nextUrl.searchParams.get('force') === 'true';

  const dueEvents = await getDueRetryingEvents(sessionId, force);
  const origin = request.nextUrl.origin;

  const results = [];
  for (const event of dueEvents) {
    const endpoint = await getEndpointById(sessionId, event.endpoint_id);
    const result = await dispatchWebhookEvent(sessionId, event, endpoint, origin);
    results.push(result);
  }

  return NextResponse.json({
    success: true,
    count: results.length,
    processed: results,
  });
}
