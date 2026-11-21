import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature } from '@/lib/crypto';
import { findSigningSecretForEvent } from '@/lib/db';

export async function POST(request: NextRequest) {
  const url = request.nextUrl;
  const mode = url.searchParams.get('mode') || request.headers.get('x-mock-mode') || 'success';
  const signatureHeader = request.headers.get('x-webhook-signature');
  const webhookId = request.headers.get('x-webhook-id');

  const rawBody = await request.text();

  if (webhookId && signatureHeader) {
    const signingSecret = await findSigningSecretForEvent(webhookId);
    if (signingSecret) {
      const isValid = verifyWebhookSignature(signatureHeader, rawBody, signingSecret);
      if (!isValid) {
        return NextResponse.json(
          {
            error: 'Unauthorized: Invalid X-Webhook-Signature. Cryptographic verification failed.',
            signature_received: signatureHeader,
          },
          { status: 401 }
        );
      }
    }
  }

  if (mode === 'fail') {
    return NextResponse.json(
      {
        error: 'Simulated 500 Internal Server Error: Mock subscriber receiver forced failure.',
        mode: 'fail',
        received_at: new Date().toISOString(),
      },
      { status: 500 }
    );
  }

  if (mode === 'timeout') {
    await new Promise((resolve) => setTimeout(resolve, 6000));
    return NextResponse.json(
      {
        status: 'Delayed response completed after 6000ms',
        mode: 'timeout',
      },
      { status: 200 }
    );
  }

  return NextResponse.json({
    success: true,
    verified: Boolean(signatureHeader),
    mode: 'success',
    webhook_id: webhookId,
    received_at: new Date().toISOString(),
    message: 'Webhook payload verified and accepted successfully.',
  });
}

export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get('mode') || 'success';
  return NextResponse.json({
    status: 'online',
    current_mode: mode,
    available_modes: ['success', 'fail', 'timeout'],
    message: 'Mock receiver is ready to inspect and acknowledge signed webhooks.',
  });
}
