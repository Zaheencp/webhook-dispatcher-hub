import crypto from 'node:crypto';
import { getNeonSql } from './neon';
import { generateSigningSecret } from './crypto';
import type { Endpoint, WebhookEvent, DeliveryAttempt, DashboardStats, EventStatus } from '@/types';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function normalizeUuid(input?: string | null): string {
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

interface MemorySessionState {
  endpoints: Map<string, Endpoint>;
  events: Map<string, WebhookEvent>;
  attempts: Map<string, DeliveryAttempt[]>;
}

declare global {
  var __memoryStore: Map<string, MemorySessionState> | undefined;
}

const memoryStore = globalThis.__memoryStore ?? new Map<string, MemorySessionState>();
globalThis.__memoryStore = memoryStore;

function getMemorySession(sessionId: string): MemorySessionState {
  let session = memoryStore.get(sessionId);
  if (!session) {
    session = {
      endpoints: new Map(),
      events: new Map(),
      attempts: new Map(),
    };
    memoryStore.set(sessionId, session);
  }
  return session;
}

function parseJsonField<T>(field: unknown, fallback: T): T {
  if (typeof field === 'string') {
    try {
      return JSON.parse(field) as T;
    } catch {
      return fallback;
    }
  }
  return (field as T) ?? fallback;
}

function formatIso(date: unknown): string {
  if (date instanceof Date) {
    return date.toISOString();
  }
  if (typeof date === 'string') {
    return date;
  }
  return new Date().toISOString();
}

export async function getEndpoints(sessionId: string): Promise<Endpoint[]> {
  const safeSessionId = normalizeUuid(sessionId);
  const sql = getNeonSql();
  if (sql) {
    try {
      const rows = await sql`
        SELECT * FROM endpoints
        WHERE session_id = ${safeSessionId}
        ORDER BY created_at DESC
      `;
      return rows.map((r) => ({
        id: r.id as string,
        session_id: r.session_id as string,
        name: r.name as string,
        url: r.url as string,
        signing_secret: r.signing_secret as string,
        subscribed_events: (r.subscribed_events as string[]) || [],
        is_active: Boolean(r.is_active),
        created_at: formatIso(r.created_at),
      }));
    } catch (err) {
      console.error('Neon getEndpoints error:', err);
    }
  }

  const session = getMemorySession(safeSessionId);
  return Array.from(session.endpoints.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export async function getEndpointById(sessionId: string, id: string): Promise<Endpoint | null> {
  const safeSessionId = normalizeUuid(sessionId);
  const sql = getNeonSql();
  if (sql) {
    try {
      const rows = await sql`
        SELECT * FROM endpoints
        WHERE session_id = ${safeSessionId} AND id = ${id}
        LIMIT 1
      `;
      if (rows.length > 0) {
        const r = rows[0];
        return {
          id: r.id as string,
          session_id: r.session_id as string,
          name: r.name as string,
          url: r.url as string,
          signing_secret: r.signing_secret as string,
          subscribed_events: (r.subscribed_events as string[]) || [],
          is_active: Boolean(r.is_active),
          created_at: formatIso(r.created_at),
        };
      }
      return null;
    } catch (err) {
      console.error('Neon getEndpointById error:', err);
    }
  }

  const session = getMemorySession(safeSessionId);
  return session.endpoints.get(id) ?? null;
}

export async function createEndpoint(
  sessionId: string,
  params: {
    name: string;
    url: string;
    subscribed_events?: string[];
    is_active?: boolean;
    signing_secret?: string;
  }
): Promise<Endpoint> {
  const safeSessionId = normalizeUuid(sessionId);
  const newEndpoint: Endpoint = {
    id: crypto.randomUUID(),
    session_id: safeSessionId,
    name: params.name.trim(),
    url: params.url.trim(),
    signing_secret: params.signing_secret || generateSigningSecret(),
    subscribed_events: params.subscribed_events || ['*'],
    is_active: params.is_active ?? true,
    created_at: new Date().toISOString(),
  };

  const sql = getNeonSql();
  if (sql) {
    try {
      const rows = await sql`
        INSERT INTO endpoints (
          id, session_id, name, url, signing_secret, subscribed_events, is_active, created_at
        ) VALUES (
          ${newEndpoint.id}, ${safeSessionId}, ${newEndpoint.name}, ${newEndpoint.url},
          ${newEndpoint.signing_secret}, ${newEndpoint.subscribed_events}, ${newEndpoint.is_active}, ${newEndpoint.created_at}
        )
        RETURNING *
      `;
      const r = rows[0];
      return {
        id: r.id as string,
        session_id: r.session_id as string,
        name: r.name as string,
        url: r.url as string,
        signing_secret: r.signing_secret as string,
        subscribed_events: (r.subscribed_events as string[]) || [],
        is_active: Boolean(r.is_active),
        created_at: formatIso(r.created_at),
      };
    } catch (err) {
      console.error('Neon createEndpoint error:', err);
    }
  }

  const session = getMemorySession(safeSessionId);
  session.endpoints.set(newEndpoint.id, newEndpoint);
  return newEndpoint;
}

export async function toggleEndpointActive(sessionId: string, id: string, isActive: boolean): Promise<Endpoint | null> {
  const safeSessionId = normalizeUuid(sessionId);
  const sql = getNeonSql();
  if (sql) {
    try {
      const rows = await sql`
        UPDATE endpoints
        SET is_active = ${isActive}
        WHERE session_id = ${safeSessionId} AND id = ${id}
        RETURNING *
      `;
      if (rows.length > 0) {
        const r = rows[0];
        return {
          id: r.id as string,
          session_id: r.session_id as string,
          name: r.name as string,
          url: r.url as string,
          signing_secret: r.signing_secret as string,
          subscribed_events: (r.subscribed_events as string[]) || [],
          is_active: Boolean(r.is_active),
          created_at: formatIso(r.created_at),
        };
      }
      return null;
    } catch (err) {
      console.error('Neon toggleEndpointActive error:', err);
    }
  }

  const session = getMemorySession(safeSessionId);
  const endpoint = session.endpoints.get(id);
  if (endpoint) {
    endpoint.is_active = isActive;
    return endpoint;
  }
  return null;
}

export async function deleteEndpoint(sessionId: string, id: string): Promise<boolean> {
  const safeSessionId = normalizeUuid(sessionId);
  const sql = getNeonSql();
  if (sql) {
    try {
      await sql`
        DELETE FROM endpoints
        WHERE session_id = ${safeSessionId} AND id = ${id}
      `;
      return true;
    } catch (err) {
      console.error('Neon deleteEndpoint error:', err);
    }
  }

  const session = getMemorySession(safeSessionId);
  return session.endpoints.delete(id);
}

export async function findEventByIdempotency(
  sessionId: string,
  endpointId: string,
  idempotencyKey: string
): Promise<WebhookEvent | null> {
  const safeSessionId = normalizeUuid(sessionId);
  const sql = getNeonSql();
  if (sql) {
    try {
      const rows = await sql`
        SELECT * FROM events
        WHERE session_id = ${safeSessionId} AND endpoint_id = ${endpointId} AND idempotency_key = ${idempotencyKey}
        LIMIT 1
      `;
      if (rows.length > 0) {
        const r = rows[0];
        return {
          id: r.id as string,
          session_id: r.session_id as string,
          endpoint_id: r.endpoint_id as string,
          idempotency_key: r.idempotency_key as string,
          event_type: r.event_type as string,
          payload: parseJsonField<Record<string, unknown>>(r.payload, {}),
          status: r.status as EventStatus,
          attempt_count: Number(r.attempt_count),
          max_attempts: Number(r.max_attempts),
          next_retry_at: r.next_retry_at ? formatIso(r.next_retry_at) : null,
          created_at: formatIso(r.created_at),
        };
      }
      return null;
    } catch (err) {
      console.error('Neon findEventByIdempotency error:', err);
    }
  }

  const session = getMemorySession(safeSessionId);
  for (const event of session.events.values()) {
    if (event.endpoint_id === endpointId && event.idempotency_key === idempotencyKey) {
      return event;
    }
  }
  return null;
}

export async function createEvent(
  sessionId: string,
  params: {
    endpoint_id: string;
    idempotency_key: string;
    event_type: string;
    payload: Record<string, unknown>;
    max_attempts?: number;
  }
): Promise<WebhookEvent> {
  const safeSessionId = normalizeUuid(sessionId);
  const newEvent: WebhookEvent = {
    id: crypto.randomUUID(),
    session_id: safeSessionId,
    endpoint_id: params.endpoint_id,
    idempotency_key: params.idempotency_key,
    event_type: params.event_type,
    payload: params.payload,
    status: 'PENDING',
    attempt_count: 0,
    max_attempts: params.max_attempts ?? 4,
    next_retry_at: null,
    created_at: new Date().toISOString(),
  };

  const sql = getNeonSql();
  if (sql) {
    try {
      const rows = await sql`
        INSERT INTO events (
          id, session_id, endpoint_id, idempotency_key, event_type, payload, status, attempt_count, max_attempts, next_retry_at, created_at
        ) VALUES (
          ${newEvent.id}, ${safeSessionId}, ${newEvent.endpoint_id}, ${newEvent.idempotency_key},
          ${newEvent.event_type}, ${JSON.stringify(newEvent.payload)}, ${newEvent.status},
          ${newEvent.attempt_count}, ${newEvent.max_attempts}, ${newEvent.next_retry_at}, ${newEvent.created_at}
        )
        RETURNING *
      `;
      const r = rows[0];
      return {
        id: r.id as string,
        session_id: r.session_id as string,
        endpoint_id: r.endpoint_id as string,
        idempotency_key: r.idempotency_key as string,
        event_type: r.event_type as string,
        payload: parseJsonField<Record<string, unknown>>(r.payload, {}),
        status: r.status as EventStatus,
        attempt_count: Number(r.attempt_count),
        max_attempts: Number(r.max_attempts),
        next_retry_at: r.next_retry_at ? formatIso(r.next_retry_at) : null,
        created_at: formatIso(r.created_at),
      };
    } catch (err) {
      console.error('Neon createEvent error:', err);
    }
  }

  const session = getMemorySession(safeSessionId);
  session.events.set(newEvent.id, newEvent);
  return newEvent;
}

export async function getEvents(sessionId: string, statusFilter?: string): Promise<WebhookEvent[]> {
  const safeSessionId = normalizeUuid(sessionId);
  const sql = getNeonSql();
  if (sql) {
    try {
      const eventsRows =
        statusFilter && statusFilter !== 'ALL'
          ? await sql`
              SELECT e.*,
                     ep.name as ep_name,
                     ep.url as ep_url,
                     ep.signing_secret as ep_signing_secret,
                     ep.subscribed_events as ep_subscribed_events,
                     ep.is_active as ep_is_active,
                     ep.created_at as ep_created_at
              FROM events e
              LEFT JOIN endpoints ep ON e.endpoint_id = ep.id
              WHERE e.session_id = ${safeSessionId} AND e.status = ${statusFilter}
              ORDER BY e.created_at DESC
            `
          : await sql`
              SELECT e.*,
                     ep.name as ep_name,
                     ep.url as ep_url,
                     ep.signing_secret as ep_signing_secret,
                     ep.subscribed_events as ep_subscribed_events,
                     ep.is_active as ep_is_active,
                     ep.created_at as ep_created_at
              FROM events e
              LEFT JOIN endpoints ep ON e.endpoint_id = ep.id
              WHERE e.session_id = ${safeSessionId}
              ORDER BY e.created_at DESC
            `;

      const eventIds = eventsRows.map((r) => r.id as string);
      let attemptsRows: Record<string, unknown>[] = [];
      if (eventIds.length > 0) {
        attemptsRows = (await sql`
          SELECT * FROM delivery_attempts
          WHERE event_id = ANY(${eventIds})
          ORDER BY attempted_at ASC
        `) as Record<string, unknown>[];
      }

      const attemptsByEventId = new Map<string, DeliveryAttempt[]>();
      for (const att of attemptsRows) {
        const eId = att.event_id as string;
        const list = attemptsByEventId.get(eId) || [];
        list.push({
          id: att.id as string,
          event_id: eId,
          attempt_number: Number(att.attempt_number),
          request_headers: parseJsonField<Record<string, string>>(att.request_headers, {}),
          response_status: att.response_status !== null ? Number(att.response_status) : null,
          response_body: att.response_body as string | null,
          latency_ms: Number(att.latency_ms),
          error_message: att.error_message as string | null,
          attempted_at: formatIso(att.attempted_at),
        });
        attemptsByEventId.set(eId, list);
      }

      return eventsRows.map((r) => {
        const ep: Endpoint | undefined = r.ep_name
          ? {
              id: r.endpoint_id as string,
              session_id: r.session_id as string,
              name: r.ep_name as string,
              url: r.ep_url as string,
              signing_secret: r.ep_signing_secret as string,
              subscribed_events: (r.ep_subscribed_events as string[]) || [],
              is_active: Boolean(r.ep_is_active),
              created_at: formatIso(r.ep_created_at),
            }
          : undefined;

        return {
          id: r.id as string,
          session_id: r.session_id as string,
          endpoint_id: r.endpoint_id as string,
          idempotency_key: r.idempotency_key as string,
          event_type: r.event_type as string,
          payload: parseJsonField<Record<string, unknown>>(r.payload, {}),
          status: r.status as EventStatus,
          attempt_count: Number(r.attempt_count),
          max_attempts: Number(r.max_attempts),
          next_retry_at: r.next_retry_at ? formatIso(r.next_retry_at) : null,
          created_at: formatIso(r.created_at),
          endpoint: ep,
          delivery_attempts: attemptsByEventId.get(r.id as string) || [],
        };
      });
    } catch (err) {
      console.error('Neon getEvents error:', err);
    }
  }

  const session = getMemorySession(safeSessionId);
  return Array.from(session.events.values())
    .filter((event) => !statusFilter || statusFilter === 'ALL' || event.status === statusFilter)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .map((event) => {
      const endpoint = session.endpoints.get(event.endpoint_id);
      const attempts = (session.attempts.get(event.id) || []).sort(
        (a, b) => new Date(a.attempted_at).getTime() - new Date(b.attempted_at).getTime()
      );
      return {
        ...event,
        endpoint,
        delivery_attempts: attempts,
      };
    });
}

export async function getEventById(sessionId: string, id: string): Promise<WebhookEvent | null> {
  const safeSessionId = normalizeUuid(sessionId);
  const sql = getNeonSql();
  if (sql) {
    try {
      const rows = await sql`
        SELECT e.*,
               ep.name as ep_name,
               ep.url as ep_url,
               ep.signing_secret as ep_signing_secret,
               ep.subscribed_events as ep_subscribed_events,
               ep.is_active as ep_is_active,
               ep.created_at as ep_created_at
        FROM events e
        LEFT JOIN endpoints ep ON e.endpoint_id = ep.id
        WHERE e.session_id = ${safeSessionId} AND e.id = ${id}
        LIMIT 1
      `;
      if (rows.length > 0) {
        const r = rows[0];
        const attemptsRows = (await sql`
          SELECT * FROM delivery_attempts
          WHERE event_id = ${id}
          ORDER BY attempted_at ASC
        `) as Record<string, unknown>[];

        const ep: Endpoint | undefined = r.ep_name
          ? {
              id: r.endpoint_id as string,
              session_id: r.session_id as string,
              name: r.ep_name as string,
              url: r.ep_url as string,
              signing_secret: r.ep_signing_secret as string,
              subscribed_events: (r.ep_subscribed_events as string[]) || [],
              is_active: Boolean(r.ep_is_active),
              created_at: formatIso(r.ep_created_at),
            }
          : undefined;

        const attempts: DeliveryAttempt[] = attemptsRows.map((att) => ({
          id: att.id as string,
          event_id: id,
          attempt_number: Number(att.attempt_number),
          request_headers: parseJsonField<Record<string, string>>(att.request_headers, {}),
          response_status: att.response_status !== null ? Number(att.response_status) : null,
          response_body: att.response_body as string | null,
          latency_ms: Number(att.latency_ms),
          error_message: att.error_message as string | null,
          attempted_at: formatIso(att.attempted_at),
        }));

        return {
          id: r.id as string,
          session_id: r.session_id as string,
          endpoint_id: r.endpoint_id as string,
          idempotency_key: r.idempotency_key as string,
          event_type: r.event_type as string,
          payload: parseJsonField<Record<string, unknown>>(r.payload, {}),
          status: r.status as EventStatus,
          attempt_count: Number(r.attempt_count),
          max_attempts: Number(r.max_attempts),
          next_retry_at: r.next_retry_at ? formatIso(r.next_retry_at) : null,
          created_at: formatIso(r.created_at),
          endpoint: ep,
          delivery_attempts: attempts,
        };
      }
      return null;
    } catch (err) {
      console.error('Neon getEventById error:', err);
    }
  }

  const session = getMemorySession(safeSessionId);
  const event = session.events.get(id);
  if (!event) return null;

  const endpoint = session.endpoints.get(event.endpoint_id);
  const attempts = (session.attempts.get(event.id) || []).sort(
    (a, b) => new Date(a.attempted_at).getTime() - new Date(b.attempted_at).getTime()
  );

  return {
    ...event,
    endpoint,
    delivery_attempts: attempts,
  };
}

export async function updateEventStatus(
  sessionId: string,
  eventId: string,
  updates: {
    status: EventStatus;
    attempt_count: number;
    next_retry_at: string | null;
  }
): Promise<WebhookEvent | null> {
  const safeSessionId = normalizeUuid(sessionId);
  const sql = getNeonSql();
  if (sql) {
    try {
      const rows = await sql`
        UPDATE events
        SET status = ${updates.status},
            attempt_count = ${updates.attempt_count},
            next_retry_at = ${updates.next_retry_at}
        WHERE session_id = ${safeSessionId} AND id = ${eventId}
        RETURNING *
      `;
      if (rows.length > 0) {
        const r = rows[0];
        return {
          id: r.id as string,
          session_id: r.session_id as string,
          endpoint_id: r.endpoint_id as string,
          idempotency_key: r.idempotency_key as string,
          event_type: r.event_type as string,
          payload: parseJsonField<Record<string, unknown>>(r.payload, {}),
          status: r.status as EventStatus,
          attempt_count: Number(r.attempt_count),
          max_attempts: Number(r.max_attempts),
          next_retry_at: r.next_retry_at ? formatIso(r.next_retry_at) : null,
          created_at: formatIso(r.created_at),
        };
      }
      return null;
    } catch (err) {
      console.error('Neon updateEventStatus error:', err);
    }
  }

  const session = getMemorySession(safeSessionId);
  const event = session.events.get(eventId);
  if (event) {
    event.status = updates.status;
    event.attempt_count = updates.attempt_count;
    event.next_retry_at = updates.next_retry_at;
    return event;
  }
  return null;
}

export async function getDueRetryingEvents(sessionId: string, force = false): Promise<WebhookEvent[]> {
  const safeSessionId = normalizeUuid(sessionId);
  const sql = getNeonSql();
  if (sql) {
    try {
      const now = new Date().toISOString();
      const rows = force
        ? await sql`
            SELECT * FROM events
            WHERE session_id = ${safeSessionId} AND status = 'RETRYING'
          `
        : await sql`
            SELECT * FROM events
            WHERE session_id = ${safeSessionId} AND status = 'RETRYING' AND (next_retry_at IS NULL OR next_retry_at <= ${now})
          `;

      return rows.map((r) => ({
        id: r.id as string,
        session_id: r.session_id as string,
        endpoint_id: r.endpoint_id as string,
        idempotency_key: r.idempotency_key as string,
        event_type: r.event_type as string,
        payload: parseJsonField<Record<string, unknown>>(r.payload, {}),
        status: r.status as EventStatus,
        attempt_count: Number(r.attempt_count),
        max_attempts: Number(r.max_attempts),
        next_retry_at: r.next_retry_at ? formatIso(r.next_retry_at) : null,
        created_at: formatIso(r.created_at),
      }));
    } catch (err) {
      console.error('Neon getDueRetryingEvents error:', err);
    }
  }

  const session = getMemorySession(safeSessionId);
  const nowMs = Date.now();
  return Array.from(session.events.values()).filter((e) => {
    if (e.status !== 'RETRYING') return false;
    if (force) return true;
    if (!e.next_retry_at) return true;
    return new Date(e.next_retry_at).getTime() <= nowMs;
  });
}

export async function recordDeliveryAttempt(
  attempt: Omit<DeliveryAttempt, 'id' | 'attempted_at'>
): Promise<DeliveryAttempt> {
  const newAttempt: DeliveryAttempt = {
    ...attempt,
    id: crypto.randomUUID(),
    attempted_at: new Date().toISOString(),
  };

  const sql = getNeonSql();
  if (sql) {
    try {
      const rows = await sql`
        INSERT INTO delivery_attempts (
          id, event_id, attempt_number, request_headers, response_status, response_body, latency_ms, error_message, attempted_at
        ) VALUES (
          ${newAttempt.id}, ${newAttempt.event_id}, ${newAttempt.attempt_number},
          ${JSON.stringify(newAttempt.request_headers)}, ${newAttempt.response_status},
          ${newAttempt.response_body}, ${newAttempt.latency_ms}, ${newAttempt.error_message}, ${newAttempt.attempted_at}
        )
        RETURNING *
      `;
      const r = rows[0];
      return {
        id: r.id as string,
        event_id: r.event_id as string,
        attempt_number: Number(r.attempt_number),
        request_headers: parseJsonField<Record<string, string>>(r.request_headers, {}),
        response_status: r.response_status !== null ? Number(r.response_status) : null,
        response_body: r.response_body as string | null,
        latency_ms: Number(r.latency_ms),
        error_message: r.error_message as string | null,
        attempted_at: formatIso(r.attempted_at),
      };
    } catch (err) {
      console.error('Neon recordDeliveryAttempt error:', err);
    }
  }

  for (const session of memoryStore.values()) {
    if (session.events.has(attempt.event_id)) {
      const attempts = session.attempts.get(attempt.event_id) || [];
      attempts.push(newAttempt);
      session.attempts.set(attempt.event_id, attempts);
      break;
    }
  }

  return newAttempt;
}

export async function findSigningSecretForEvent(eventId: string): Promise<string | null> {
  const sql = getNeonSql();
  if (sql) {
    try {
      const rows = await sql`
        SELECT ep.signing_secret
        FROM events e
        JOIN endpoints ep ON e.endpoint_id = ep.id
        WHERE e.id = ${eventId}
        LIMIT 1
      `;
      if (rows.length > 0 && rows[0].signing_secret) {
        return rows[0].signing_secret as string;
      }
    } catch (err) {
      console.error('Neon findSigningSecretForEvent error:', err);
    }
  }

  for (const session of memoryStore.values()) {
    const event = session.events.get(eventId);
    if (event) {
      const endpoint = session.endpoints.get(event.endpoint_id);
      if (endpoint?.signing_secret) {
        return endpoint.signing_secret;
      }
    }
  }

  return null;
}

export async function getDashboardStats(sessionId: string): Promise<DashboardStats> {
  const safeSessionId = normalizeUuid(sessionId);
  const events = await getEvents(safeSessionId);
  const endpoints = await getEndpoints(safeSessionId);

  const total = events.length;
  const delivered = events.filter((e) => e.status === 'DELIVERED').length;
  const retrying = events.filter((e) => e.status === 'RETRYING').length;
  const deadLetter = events.filter((e) => e.status === 'DEAD_LETTER').length;
  const successRate = total > 0 ? Math.round((delivered / total) * 100) : 100;

  return {
    total_events: total,
    delivered_count: delivered,
    success_rate: successRate,
    retrying_count: retrying,
    dead_letter_count: deadLetter,
    endpoints_count: endpoints.length,
  };
}
