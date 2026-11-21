import { generateWebhookSignature } from './crypto';
import { getEndpointById, recordDeliveryAttempt, updateEventStatus } from './db';
import type { DeliveryAttempt, Endpoint, WebhookEvent } from '@/types';

const BACKOFF_DELAYS_MS = [10_000, 60_000, 300_000];

function computeNextRetry(attemptNumber: number): string {
  const index = Math.min(Math.max(0, attemptNumber - 1), BACKOFF_DELAYS_MS.length - 1);
  const delayMs = BACKOFF_DELAYS_MS[index];
  return new Date(Date.now() + delayMs).toISOString();
}

function resolveTargetUrl(targetUrl: string, baseUrl?: string): string {
  if (targetUrl.startsWith('http://') || targetUrl.startsWith('https://')) {
    return targetUrl;
  }
  const fallback = baseUrl || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return new URL(targetUrl, fallback).toString();
}

export async function dispatchWebhookEvent(
  sessionId: string,
  event: WebhookEvent,
  providedEndpoint?: Endpoint | null,
  baseUrl?: string
): Promise<{ event: WebhookEvent; attempt: DeliveryAttempt }> {
  const endpoint = providedEndpoint ?? (await getEndpointById(sessionId, event.endpoint_id));

  const newAttemptCount = event.attempt_count + 1;
  const startTime = Date.now();

  if (!endpoint) {
    const errorMsg = `Endpoint ${event.endpoint_id} not found or deleted`;
    const attempt = await recordDeliveryAttempt({
      event_id: event.id,
      attempt_number: newAttemptCount,
      request_headers: {},
      response_status: null,
      response_body: null,
      latency_ms: 0,
      error_message: errorMsg,
    });

    const updatedEvent = await updateEventStatus(sessionId, event.id, {
      status: 'DEAD_LETTER',
      attempt_count: newAttemptCount,
      next_retry_at: null,
    });

    return { event: updatedEvent ?? { ...event, status: 'DEAD_LETTER', attempt_count: newAttemptCount }, attempt };
  }

  if (!endpoint.is_active) {
    const errorMsg = `Endpoint "${endpoint.name}" is currently inactive`;
    const attempt = await recordDeliveryAttempt({
      event_id: event.id,
      attempt_number: newAttemptCount,
      request_headers: {},
      response_status: null,
      response_body: null,
      latency_ms: 0,
      error_message: errorMsg,
    });

    const isExhausted = newAttemptCount >= event.max_attempts;
    const nextStatus = isExhausted ? 'DEAD_LETTER' : 'RETRYING';
    const nextRetryAt = isExhausted ? null : computeNextRetry(newAttemptCount);

    const updatedEvent = await updateEventStatus(sessionId, event.id, {
      status: nextStatus,
      attempt_count: newAttemptCount,
      next_retry_at: nextRetryAt,
    });

    return {
      event: updatedEvent ?? { ...event, status: nextStatus, attempt_count: newAttemptCount, next_retry_at: nextRetryAt },
      attempt,
    };
  }

  const { timestamp, headerValue } = generateWebhookSignature(event.payload, endpoint.signing_secret);
  const resolvedUrl = resolveTargetUrl(endpoint.url, baseUrl);

  const outgoingHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Webhook-Id': event.id,
    'X-Webhook-Timestamp': timestamp.toString(),
    'X-Webhook-Signature': headerValue,
    'X-Session-Id': sessionId,
  };

  let responseStatus: number | null = null;
  let responseBody: string | null = null;
  let errorMessage: string | null = null;
  let isSuccess = false;

  try {
    const response = await fetch(resolvedUrl, {
      method: 'POST',
      headers: outgoingHeaders,
      body: JSON.stringify(event.payload),
      signal: AbortSignal.timeout(5000),
    });

    responseStatus = response.status;
    const text = await response.text();
    responseBody = text.slice(0, 2048);

    if (response.ok) {
      isSuccess = true;
    } else {
      errorMessage = `HTTP ${response.status}: ${response.statusText || 'Delivery Failed'}`;
    }
  } catch (err: unknown) {
    if (err instanceof Error) {
      if (err.name === 'TimeoutError' || err.name === 'AbortError') {
        errorMessage = 'Dispatch timed out after 5000ms';
      } else {
        errorMessage = err.message;
      }
    } else {
      errorMessage = 'Unknown fetch network error';
    }
  }

  const latencyMs = Math.max(1, Date.now() - startTime);

  const attempt = await recordDeliveryAttempt({
    event_id: event.id,
    attempt_number: newAttemptCount,
    request_headers: outgoingHeaders,
    response_status: responseStatus,
    response_body: responseBody,
    latency_ms: latencyMs,
    error_message: errorMessage,
  });

  let nextStatus: WebhookEvent['status'] = 'DELIVERED';
  let nextRetryAt: string | null = null;

  if (!isSuccess) {
    if (newAttemptCount >= event.max_attempts) {
      nextStatus = 'DEAD_LETTER';
      nextRetryAt = null;
    } else {
      nextStatus = 'RETRYING';
      nextRetryAt = computeNextRetry(newAttemptCount);
    }
  }

  const updatedEvent = await updateEventStatus(sessionId, event.id, {
    status: nextStatus,
    attempt_count: newAttemptCount,
    next_retry_at: nextRetryAt,
  });

  return {
    event: updatedEvent ?? {
      ...event,
      status: nextStatus,
      attempt_count: newAttemptCount,
      next_retry_at: nextRetryAt,
    },
    attempt,
  };
}
