import { NextRequest, NextResponse } from 'next/server';
import { getSessionId, jsonError } from '@/lib/session';
import { getEndpoints, createEndpoint } from '@/lib/db';

export async function GET(request: NextRequest) {
  const sessionId = getSessionId(request);
  const endpoints = await getEndpoints(sessionId);
  return NextResponse.json({ endpoints });
}

export async function POST(request: NextRequest) {
  const sessionId = getSessionId(request);

  try {
    const body = (await request.json()) as {
      name?: string;
      url?: string;
      subscribed_events?: string[];
      is_active?: boolean;
    };

    if (!body.name || !body.url) {
      return jsonError('Both name and url are required.');
    }

    try {
      new URL(body.url, 'http://localhost');
    } catch {
      return jsonError('Invalid endpoint URL format.');
    }

    const endpoint = await createEndpoint(sessionId, {
      name: body.name,
      url: body.url,
      subscribed_events: body.subscribed_events || ['*'],
      is_active: body.is_active ?? true,
    });

    return NextResponse.json({ endpoint }, { status: 201 });
  } catch {
    return jsonError('Invalid request payload', 400);
  }
}
