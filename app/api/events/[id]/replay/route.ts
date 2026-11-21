import { NextRequest, NextResponse } from 'next/server';
import { getSessionId, jsonError } from '@/lib/session';
import { getEventById, getEndpointById, updateEventStatus } from '@/lib/db';
import { dispatchWebhookEvent } from '@/lib/dispatcher';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const sessionId = getSessionId(request);
  const { id } = await context.params;

  if (!id) {
    return jsonError('Event ID is required.');
  }

  const existingEvent = await getEventById(sessionId, id);
  if (!existingEvent) {
    return jsonError('Event not found.', 404);
  }

  const endpoint = await getEndpointById(sessionId, existingEvent.endpoint_id);
  if (!endpoint) {
    return jsonError('Target endpoint no longer exists.', 404);
  }

  const resetEvent = await updateEventStatus(sessionId, id, {
    status: 'PENDING',
    attempt_count: 0,
    next_retry_at: null,
  });

  if (!resetEvent) {
    return jsonError('Failed to reset event status.', 500);
  }

  const origin = request.nextUrl.origin;
  const { event: dispatchedEvent, attempt } = await dispatchWebhookEvent(
    sessionId,
    resetEvent,
    endpoint,
    origin
  );

  return NextResponse.json({
    success: true,
    replayed: true,
    event: dispatchedEvent,
    attempt,
  });
}
