# Webhook Dispatcher & Reliability Hub

A developer infrastructure hub built with **Next.js (App Router, TypeScript)**, **Tailwind CSS**, and **Neon Serverless PostgreSQL** that accepts outbound webhook payloads, signs them cryptographically with HMAC-SHA256, dispatches them to subscriber endpoints, enforces idempotency, handles transient failures with exponential backoff retries, and isolates permanently failed deliveries in a Dead-Letter Queue (DLQ) for inspection and manual replay.

---

## ⚡ Core Architecture & Engineering Highlights

```
+-------------------------------------------------------------------------------+
|                             CLIENT / CI PIPELINE                              |
+-------------------------------------------------------------------------------+
                                      |
                         POST /api/events/ingest
                         Headers: x-session-id
                                      |
                                      v
+-------------------------------------------------------------------------------+
|                       IDEMPOTENCY & VALIDATION LAYER                         |
| Checks (session_id, endpoint_id, idempotency_key) unique constraint           |
| If matched -> returns 200 { deduplicated: true } without duplicate dispatch   |
+-------------------------------------------------------------------------------+
                                      | (Fresh Event)
                                      v
+-------------------------------------------------------------------------------+
|                         HMAC CRYPTOGRAPHIC SIGNER                             |
| Computes SHA-256 HMAC over '${timestamp}.${JSON.stringify(payload)}'          |
| using the endpoint's private signing secret ('whsec_...')                     |
| Injects: X-Webhook-Id, X-Webhook-Timestamp, X-Webhook-Signature: t=...,v1=...|
+-------------------------------------------------------------------------------+
                                      |
                     POST target_url (5000ms AbortSignal)
                                      |
         +----------------------------+----------------------------+
         |                                                         |
    2xx Success                                            Non-2xx / Timeout
         v                                                         v
+-------------------+                                     +--------------------+
| Status: DELIVERED |                                     | Status: RETRYING   |
| Latency logged    |                                     | Attempt: 1 -> 2 -> 3|
+-------------------+                                     | Backoff: 10s,60s,300s|
                                                          +--------------------+
                                                                   |
                                                      Attempts >= max_attempts (4)
                                                                   v
                                                          +--------------------+
                                                          | Status: DEAD_LETTER|
                                                          | Isolated in DLQ    |
                                                          +--------------------+
                                                                   |
                                                          POST /api/events/[id]/replay
                                                                   v
                                                          (Reset & Re-dispatch)
```

---

## 🔐 Cryptographic Signature Specification

Each subscriber endpoint is assigned a cryptographically generated 24-byte hex secret (`whsec_...`).
When dispatching:
1. Current Unix timestamp (in seconds) is taken: `t = Math.floor(Date.now() / 1000)`.
2. Signature payload is formed: `${timestamp}.${JSON.stringify(payload)}`.
3. HMAC-SHA256 is calculated using the secret as the key.
4. Outbound headers attached:
   - `Content-Type: application/json`
   - `X-Webhook-Id: <uuid>`
   - `X-Webhook-Timestamp: <timestamp>`
   - `X-Webhook-Signature: t=<timestamp>,v1=<hex_signature>`
   - `X-Session-Id: <session_id>`

Subscribers verify signatures using timing-safe comparisons (`crypto.timingSafeEqual`) within a 5-minute clock-drift tolerance window.

---

## 🔄 Exponential Backoff & DLQ State Machine

- **Strict Timeout**: Outgoing requests enforce an `AbortSignal.timeout(5000)` timeout.
- **Backoff Delays**:
  - **Attempt #1 failure**: status set to `RETRYING`, `next_retry_at` scheduled for `+10 seconds`.
  - **Attempt #2 failure**: status set to `RETRYING`, `next_retry_at` scheduled for `+60 seconds`.
  - **Attempt #3 failure**: status set to `RETRYING`, `next_retry_at` scheduled for `+300 seconds (5 min)`.
  - **Attempt #4 failure** (max attempts reached): status transitions to `DEAD_LETTER`, `next_retry_at = null`.
- **Worker & Manual Retries**:
  - Scheduled worker queries `RETRYING` events where `next_retry_at <= now()`.
  - Live demo testing supports `POST /api/worker/process-retries?force=true` to immediately trigger all pending retries without waiting for timers.
- **DLQ Replay**:
  - `POST /api/events/[id]/replay` resets `attempt_count = 0`, sets `status = 'PENDING'`, and dispatches Attempt #1 immediately.

---

## 🗄️ Database Schema & Storage

PostgreSQL tables scoped by visitor sandbox `session_id`:
- **`endpoints`**: `id`, `session_id`, `name`, `url`, `signing_secret`, `subscribed_events`, `is_active`, `created_at`.
- **`events`**: `id`, `session_id`, `endpoint_id`, `idempotency_key`, `event_type`, `payload`, `status`, `attempt_count`, `max_attempts`, `next_retry_at`, `created_at`.
  - Composite Unique Constraint: `(session_id, endpoint_id, idempotency_key)` guarantees zero duplicate dispatches.
- **`delivery_attempts`**: `id`, `event_id`, `attempt_number`, `request_headers`, `response_status`, `response_body`, `latency_ms`, `error_message`, `attempted_at`.

---

## 🚀 Getting Started

### 1. Install & Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the console.

### 2. Configure Neon PostgreSQL

Copy `.env.example` to `.env.local` and add your Neon connection strings:

```bash
DATABASE_URL=postgresql://neondb_owner:password@ep-your-endpoint-pooler.region.aws.neon.tech/neondb?sslmode=require
DATABASE_URL_UNPOOLED=postgresql://neondb_owner:password@ep-your-endpoint.region.aws.neon.tech/neondb?sslmode=require
NEON_BRANCH=production
```

*(Note: If database credentials are not configured, the application automatically uses an in-memory session store so you can test all features immediately.)*

### 3. Verify TypeScript & Production Build

```bash
npx tsc --noEmit
npm run build
```

---

## 📡 API Reference

| Endpoint | Method | Description |
|---|---|---|
| `/api/endpoints` | `GET` | List subscriber endpoints for the current session |
| `/api/endpoints` | `POST` | Register a new subscriber endpoint and generate a `whsec_` secret |
| `/api/endpoints/[id]` | `PATCH` | Toggle active/paused state |
| `/api/endpoints/[id]` | `DELETE` | Delete endpoint and cascade events |
| `/api/events` | `GET` | List events with attempts (optional `?status=ALL\|DELIVERED\|RETRYING\|DEAD_LETTER`) |
| `/api/events/ingest` | `POST` | Ingest outbound event with idempotency check and execute Attempt #1 |
| `/api/events/[id]/replay` | `POST` | Reset failed/DLQ event attempts to 0 and trigger fresh dispatch |
| `/api/worker/process-retries` | `POST` | Process due retries (or all with `?force=true`) |
| `/api/mock-receiver` | `POST` | Simulated receiver accepting `?mode=success\|fail\|timeout` and validating HMAC signatures |
| `/api/seed` | `POST` | 1-click demo seed with preconfigured endpoints and test events |
| `/api/stats` | `GET` | Dashboard KPI metrics |
