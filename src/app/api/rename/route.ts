import { NextRequest, NextResponse } from 'next/server';
import { readdir, rename } from 'fs/promises';
import path from 'path';
import { getSessionDir } from '@/lib/file-manager';
import { RenameRequest } from '@/types/api';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body: RenameRequest = await request.json();
    const { sessionId, imageIds, pattern, separator, startNumber } = body;

    if (!sessionId || !imageIds?.length || !pattern) {
      return NextResponse.json({ error: 'Parametros requeridos' }, { status: 400 });
    }

    const dir = getSessionDir(sessionId);
    const files = await readdir(dir);
    const renames: Array<{ id: string; oldName: string; newName: string }> = [];

    for (let i = 0; i < imageIds.length; i++) {
      const imageId = imageIds[i];
      const num = startNumber + i;

      // Find the file for this image ID
      const imageFile = files.find((f) => f.startsWith(imageId) && !f.includes('_thumb'));
      if (!imageFile) continue;

      const ext = path.extname(imageFile);
      const newName = `${pattern}${separator}${num}${ext}`;

      renames.push({
        id: imageId,
        oldName: imageFile,
        newName,
      });
    }

    // We don't actually rename on disk (IDs stay the same), just return new display names
    return NextResponse.json({ renames });
  } catch (error) {
    console.error('Rename error:', error);
    return NextResponse.json({ error: 'Error renombrando' }, { status: 500 });
  }
}
