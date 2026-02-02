import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { getThumbnailPath } from '@/lib/file-manager';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const sessionId = searchParams.get('sessionId');
  const id = searchParams.get('id');

  if (!sessionId || !id) {
    return NextResponse.json({ error: 'Parametros requeridos' }, { status: 400 });
  }

  try {
    const thumbPath = getThumbnailPath(sessionId, id);
    const buffer = await readFile(thumbPath);

    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Thumbnail no encontrado' }, { status: 404 });
  }
}
