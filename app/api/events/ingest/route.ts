import { NextRequest, NextResponse } from 'next/server';
import { getSessionId, jsonError } from '@/lib/session';
import { findEventByIdempotency, createEvent, getEndpointById } from '@/lib/db';
import { dispatchWebhookEvent } from '@/lib/dispatcher';
import type { IngestRequestBody } from '@/types';

export async function POST(request: NextRequest) {
  const sessionId = getSessionId(request);

  try {
    const body = (await request.json()) as IngestRequestBody;

    if (!body.endpoint_id || !body.event_type || !body.idempotency_key || !body.payload) {
      return jsonError('Missing required fields: endpoint_id, event_type, idempotency_key, and payload are all required.');
    }

    const endpoint = await getEndpointById(sessionId, body.endpoint_id);
    if (!endpoint) {
      return jsonError('Endpoint does not exist in this session.', 404);
    }

    const existingEvent = await findEventByIdempotency(sessionId, body.endpoint_id, body.idempotency_key);
    if (existingEvent) {
      return NextResponse.json({
        deduplicated: true,
        success: true,
        event: existingEvent,
      });
    }

    const newEvent = await createEvent(sessionId, {
      endpoint_id: body.endpoint_id,
      idempotency_key: body.idempotency_key,
      event_type: body.event_type,
      payload: body.payload,
    });

    const origin = request.nextUrl.origin;
    const { event: dispatchedEvent, attempt } = await dispatchWebhookEvent(
      sessionId,
      newEvent,
      endpoint,
      origin
    );

    return NextResponse.json(
      {
        success: true,
        deduplicated: false,
        event: dispatchedEvent,
        attempt,
      },
      { status: 201 }
    );
  } catch {
    return jsonError('Invalid JSON payload.', 400);
  }
}
