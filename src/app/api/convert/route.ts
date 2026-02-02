import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile, readdir, unlink } from 'fs/promises';
import path from 'path';
import { getSessionDir, formatToExt } from '@/lib/file-manager';
import { convertImage, generateThumbnail } from '@/lib/image-processing';
import { readAllMetadata } from '@/lib/metadata-reader';
import { ConvertRequest } from '@/types/api';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body: ConvertRequest = await request.json();
    const { sessionId, imageIds, targetFormat, quality = 90, preserveMetadata } = body;

    if (!sessionId || !imageIds?.length || !targetFormat) {
      return NextResponse.json({ error: 'Parametros requeridos' }, { status: 400 });
    }

    const dir = getSessionDir(sessionId);
    const files = await readdir(dir);
    const converted: Array<{
      id: string;
      filename: string;
      format: string;
      mimeType: string;
      size: number;
    }> = [];

    for (const imageId of imageIds) {
      const imageFile = files.find((f) => f.startsWith(imageId) && !f.includes('_thumb'));
      if (!imageFile) continue;

      const filePath = path.join(dir, imageFile);
      const buffer = await readFile(filePath);

      // Convert
      const convertedBuffer = await convertImage(buffer, targetFormat, {
        quality,
        preserveMetadata,
      });

      // Save with new extension
      const newExt = formatToExt(targetFormat);
      const newPath = path.join(dir, `${imageId}${newExt}`);
      await writeFile(newPath, convertedBuffer);

      // Remove old file if extension changed
      const oldExt = path.extname(imageFile);
      if (oldExt !== newExt) {
        await unlink(filePath).catch(() => {});
      }

      // Regenerate thumbnail
      const thumbBuffer = await generateThumbnail(convertedBuffer);
      await writeFile(path.join(dir, `${imageId}_thumb.jpg`), thumbBuffer);

      const mimeMap: Record<string, string> = {
        jpeg: 'image/jpeg',
        png: 'image/png',
        webp: 'image/webp',
      };

      // Generate new filename for display
      const oldBaseName = path.basename(imageFile, oldExt);
      const displayName = oldBaseName.startsWith(imageId) ? `converted${newExt}` : `${oldBaseName}${newExt}`;

      converted.push({
        id: imageId,
        filename: displayName,
        format: targetFormat,
        mimeType: mimeMap[targetFormat] || `image/${targetFormat}`,
        size: convertedBuffer.length,
      });
    }

    return NextResponse.json({ converted });
  } catch (error) {
    console.error('Convert error:', error);
    return NextResponse.json({ error: 'Error convirtiendo' }, { status: 500 });
  }
}
