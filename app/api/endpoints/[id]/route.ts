import { NextRequest, NextResponse } from 'next/server';
import { getSessionId, jsonError } from '@/lib/session';
import { deleteEndpoint, toggleEndpointActive } from '@/lib/db';

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const sessionId = getSessionId(request);
  const { id } = await context.params;

  if (!id) {
    return jsonError('Endpoint ID is required.');
  }

  const success = await deleteEndpoint(sessionId, id);
  if (!success) {
    return jsonError('Endpoint not found or already deleted.', 404);
  }

  return NextResponse.json({ success: true, id });
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const sessionId = getSessionId(request);
  const { id } = await context.params;

  if (!id) {
    return jsonError('Endpoint ID is required.');
  }

  try {
    const body = (await request.json()) as { is_active?: boolean };
    if (typeof body.is_active !== 'boolean') {
      return jsonError('is_active boolean flag is required.');
    }

    const updated = await toggleEndpointActive(sessionId, id, body.is_active);
    if (!updated) {
      return jsonError('Endpoint not found.', 404);
    }

    return NextResponse.json({ endpoint: updated });
  } catch {
    return jsonError('Failed to parse request body.', 400);
  }
}
