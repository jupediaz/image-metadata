import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile, readdir } from 'fs/promises';
import path from 'path';
import { getSessionDir } from '@/lib/file-manager';
import { readAllMetadata } from '@/lib/metadata-reader';
import { applyMetadataChanges } from '@/lib/metadata-writer';
import { generateThumbnail } from '@/lib/image-processing';
import { MetadataUpdateRequest } from '@/types/api';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const sessionId = searchParams.get('sessionId');
  const imageId = searchParams.get('id');

  if (!sessionId || !imageId) {
    return NextResponse.json({ error: 'Parametros requeridos' }, { status: 400 });
  }

  try {
    const dir = getSessionDir(sessionId);
    const files = await readdir(dir);
    const imageFile = files.find((f) => f.startsWith(imageId) && !f.includes('_thumb'));

    if (!imageFile) {
      return NextResponse.json({ error: 'Imagen no encontrada' }, { status: 404 });
    }

    const buffer = await readFile(path.join(dir, imageFile));
    const metadata = await readAllMetadata(buffer);

    return NextResponse.json({ imageId, metadata });
  } catch (error) {
    console.error('Metadata read error:', error);
    return NextResponse.json({ error: 'Error leyendo metadata' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body: MetadataUpdateRequest = await request.json();
    const { sessionId, imageId, changes } = body;

    if (!sessionId || !imageId || !changes?.length) {
      return NextResponse.json({ error: 'Parametros requeridos' }, { status: 400 });
    }

    const dir = getSessionDir(sessionId);
    const files = await readdir(dir);
    const imageFile = files.find((f) => f.startsWith(imageId) && !f.includes('_thumb'));

    if (!imageFile) {
      return NextResponse.json({ error: 'Imagen no encontrada' }, { status: 404 });
    }

    const filePath = path.join(dir, imageFile);
    const buffer = await readFile(filePath);

    // Apply metadata changes
    const updatedBuffer = await applyMetadataChanges(buffer, changes);

    // Overwrite file
    await writeFile(filePath, updatedBuffer);

    // Regenerate thumbnail
    const thumbBuffer = await generateThumbnail(updatedBuffer);
    const thumbPath = path.join(dir, `${imageId}_thumb.jpg`);
    await writeFile(thumbPath, thumbBuffer);

    // Re-read metadata to confirm
    const metadata = await readAllMetadata(updatedBuffer);

    return NextResponse.json({
      imageId,
      metadata,
      size: updatedBuffer.length,
    });
  } catch (error) {
    console.error('Metadata write error:', error);
    return NextResponse.json({ error: 'Error escribiendo metadata' }, { status: 500 });
  }
}
