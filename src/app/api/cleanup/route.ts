import { NextRequest, NextResponse } from 'next/server';
import { deleteSession } from '@/lib/file-manager';

export const runtime = 'nodejs';

export async function DELETE(request: NextRequest) {
  try {
    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId requerido' }, { status: 400 });
    }

    await deleteSession(sessionId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Cleanup error:', error);
    return NextResponse.json({ error: 'Error limpiando sesion' }, { status: 500 });
  }
}
