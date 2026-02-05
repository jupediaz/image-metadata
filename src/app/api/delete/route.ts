import { NextRequest, NextResponse } from 'next/server';
import { unlink } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { getSessionDir } from '@/lib/file-manager';

export const runtime = 'nodejs';

export async function DELETE(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const sessionId = searchParams.get('sessionId');
  const id = searchParams.get('id');
  const ext = searchParams.get('ext') || '.jpg';

  if (!sessionId || !id) {
    return NextResponse.json({ error: 'Parametros requeridos' }, { status: 400 });
  }

  try {
    const dir = getSessionDir(sessionId);

    // Delete main image file
    const mainFile = path.join(dir, `${id}${ext}`);
    if (existsSync(mainFile)) {
      await unlink(mainFile);
    }

    // Delete thumbnail if exists
    const thumbFile = path.join(dir, `${id}_thumb.jpg`);
    if (existsSync(thumbFile)) {
      await unlink(thumbFile);
    }

    // Delete any version files (edit history)
    const { readdir } = await import('fs/promises');
    const files = await readdir(dir);
    const versionFiles = files.filter((f) => f.startsWith(`${id}_v`));

    for (const file of versionFiles) {
      const filePath = path.join(dir, file);
      if (existsSync(filePath)) {
        await unlink(filePath);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json(
      { error: 'Error eliminando archivo' },
      { status: 500 }
    );
  }
}
