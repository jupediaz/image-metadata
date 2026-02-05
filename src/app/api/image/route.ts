import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { getSessionDir } from '@/lib/file-manager';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const sessionId = searchParams.get('sessionId');
  const id = searchParams.get('id');
  const ext = searchParams.get('ext') || '.jpg';

  if (!sessionId || !id) {
    return NextResponse.json({ error: 'Parametros requeridos' }, { status: 400 });
  }

  try {
    const dir = getSessionDir(sessionId);
    const filePath = path.join(dir, `${id}${ext}`);

    if (!existsSync(filePath)) {
      // Try finding the file with any extension
      const { readdir } = await import('fs/promises');
      const files = await readdir(dir);
      const match = files.find((f) => f.startsWith(id) && !f.includes('_thumb'));
      if (!match) {
        return NextResponse.json({ error: 'Archivo no encontrado' }, { status: 404 });
      }
      const matchExt = path.extname(match).toLowerCase();
      const buffer = await readFile(path.join(dir, match));

      const mimeMap: Record<string, string> = {
        '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
        '.webp': 'image/webp', '.tiff': 'image/tiff',
      };
      return new Response(new Uint8Array(buffer), {
        headers: {
          'Content-Type': mimeMap[matchExt] || 'application/octet-stream',
          'Cache-Control': 'private, max-age=3600',
        },
      });
    }

    const buffer = await readFile(filePath);
    const extLower = ext.toLowerCase();

    const mimeMap: Record<string, string> = {
      '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
      '.webp': 'image/webp', '.tiff': 'image/tiff',
    };
    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': mimeMap[extLower] || 'application/octet-stream',
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Error leyendo archivo' }, { status: 500 });
  }
}
