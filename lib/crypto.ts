import crypto from 'node:crypto';

export function generateSigningSecret(): string {
  const bytes = crypto.randomBytes(24).toString('hex');
  return `whsec_${bytes}`;
}

export function generateWebhookSignature(payload: unknown, secret: string, timestampSeconds?: number): {
  timestamp: number;
  signature: string;
  headerValue: string;
} {
  const timestamp = timestampSeconds ?? Math.floor(Date.now() / 1000);
  const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const signedPayload = `${timestamp}.${payloadString}`;
  const signature = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');

  return {
    timestamp,
    signature,
    headerValue: `t=${timestamp},v1=${signature}`,
  };
}

export function verifyWebhookSignature(headerValue: string, payload: unknown, secret: string, toleranceSeconds = 300): boolean {
  try {
    const parts = headerValue.split(',');
    const timestampPart = parts.find((p) => p.startsWith('t='));
    const signaturePart = parts.find((p) => p.startsWith('v1='));

    if (!timestampPart || !signaturePart) {
      return false;
    }

    const timestamp = parseInt(timestampPart.slice(2), 10);
    const signature = signaturePart.slice(3);

    if (Number.isNaN(timestamp) || !signature) {
      return false;
    }

    const currentTimestamp = Math.floor(Date.now() / 1000);
    if (Math.abs(currentTimestamp - timestamp) > toleranceSeconds) {
      return false;
    }

    const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const signedPayload = `${timestamp}.${payloadString}`;
    const expectedSignature = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');

    const expectedBuffer = Buffer.from(expectedSignature, 'hex');
    const actualBuffer = Buffer.from(signature, 'hex');

    if (expectedBuffer.length !== actualBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
  } catch {
    return false;
  }
}
