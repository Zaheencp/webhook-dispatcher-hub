import { NextRequest, NextResponse } from 'next/server';
import { getSessionId } from '@/lib/session';
import { createEndpoint, createEvent, getEndpoints } from '@/lib/db';
import { dispatchWebhookEvent } from '@/lib/dispatcher';

export async function POST(request: NextRequest) {
  const sessionId = getSessionId(request);
  const origin = request.nextUrl.origin;

  const existingEndpoints = await getEndpoints(sessionId);
  if (existingEndpoints.length > 0) {
    return NextResponse.json({
      message: 'Demo data already exists for this session.',
      endpoints_count: existingEndpoints.length,
    });
  }

  const endpointSuccess = await createEndpoint(sessionId, {
    name: 'Production Payment Gateway',
    url: `${origin}/api/mock-receiver?mode=success`,
    subscribed_events: ['order.created', 'payment.succeeded'],
    is_active: true,
  });

  const endpointFlaky = await createEndpoint(sessionId, {
    name: 'Flaky Accounting Service (500 Error)',
    url: `${origin}/api/mock-receiver?mode=fail`,
    subscribed_events: ['invoice.failed'],
    is_active: true,
  });

  const endpointLagging = await createEndpoint(sessionId, {
    name: 'Lagging Data Warehouse (Timeout)',
    url: `${origin}/api/mock-receiver?mode=timeout`,
    subscribed_events: ['analytics.sync'],
    is_active: true,
  });

  const event1 = await createEvent(sessionId, {
    endpoint_id: endpointSuccess.id,
    idempotency_key: `seed-idemp-ord-${Date.now()}`,
    event_type: 'order.created',
    payload: {
      order_id: 'ord_9921',
      customer: 'jane.doe@enterprise.com',
      amount_usd: 1290.0,
      currency: 'usd',
      items: [{ sku: 'CLOUD-TIER-3', qty: 1 }],
    },
  });
  await dispatchWebhookEvent(sessionId, event1, endpointSuccess, origin);

  const event2 = await createEvent(sessionId, {
    endpoint_id: endpointSuccess.id,
    idempotency_key: `seed-idemp-pay-${Date.now()}`,
    event_type: 'payment.succeeded',
    payload: {
      charge_id: 'ch_8812736',
      order_id: 'ord_9921',
      status: 'paid',
      card_last4: '4242',
    },
  });
  await dispatchWebhookEvent(sessionId, event2, endpointSuccess, origin);

  const event3 = await createEvent(sessionId, {
    endpoint_id: endpointFlaky.id,
    idempotency_key: `seed-idemp-inv-${Date.now()}`,
    event_type: 'invoice.failed',
    payload: {
      invoice_id: 'inv_1092',
      reason: 'card_declined',
      attempt: 1,
    },
  });
  await dispatchWebhookEvent(sessionId, event3, endpointFlaky, origin);

  const event4 = await createEvent(sessionId, {
    endpoint_id: endpointLagging.id,
    idempotency_key: `seed-idemp-ana-${Date.now()}`,
    event_type: 'analytics.sync',
    payload: {
      batch_id: 'batch_558',
      records_count: 500,
    },
    max_attempts: 1,
  });
  await dispatchWebhookEvent(sessionId, event4, endpointLagging, origin);

  return NextResponse.json({
    success: true,
    message: 'Demo endpoints and events seeded successfully.',
    endpoints: [endpointSuccess, endpointFlaky, endpointLagging],
  });
}
