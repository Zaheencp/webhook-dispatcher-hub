export type EventStatus = 'PENDING' | 'DELIVERED' | 'RETRYING' | 'DEAD_LETTER';

export interface Endpoint {
  id: string;
  session_id: string;
  name: string;
  url: string;
  signing_secret: string;
  subscribed_events: string[];
  is_active: boolean;
  created_at: string;
}

export interface DeliveryAttempt {
  id: string;
  event_id: string;
  attempt_number: number;
  request_headers: Record<string, string>;
  response_status: number | null;
  response_body: string | null;
  latency_ms: number;
  error_message: string | null;
  attempted_at: string;
}

export interface WebhookEvent {
  id: string;
  session_id: string;
  endpoint_id: string;
  idempotency_key: string;
  event_type: string;
  payload: Record<string, unknown>;
  status: EventStatus;
  attempt_count: number;
  max_attempts: number;
  next_retry_at: string | null;
  created_at: string;
  endpoint?: Endpoint;
  delivery_attempts?: DeliveryAttempt[];
}

export interface IngestRequestBody {
  endpoint_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  idempotency_key: string;
}

export interface IngestResponse {
  success: boolean;
  deduplicated?: boolean;
  event: WebhookEvent;
  error?: string;
}

export interface DashboardStats {
  total_events: number;
  delivered_count: number;
  success_rate: number;
  retrying_count: number;
  dead_letter_count: number;
  endpoints_count: number;
}
