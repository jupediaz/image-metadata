import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { saveFile, saveThumbnail, formatToExt } from '@/lib/file-manager';
import { generateThumbnail, getImageInfo } from '@/lib/image-processing';
import { readAllMetadata } from '@/lib/metadata-reader';
import { ImageFile } from '@/types/image';

export const runtime = 'nodejs';

const ALLOWED_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/heic', 'image/heif',
  'image/webp', 'image/tiff',
]);

// HEIC files from iPhones sometimes come as application/octet-stream
const HEIC_EXTENSIONS = new Set(['.heic', '.heif']);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const sessionId = formData.get('sessionId') as string;
    const files = formData.getAll('files') as File[];

    if (!sessionId || files.length === 0) {
      return NextResponse.json(
        { error: 'sessionId y al menos un archivo son requeridos' },
        { status: 400 }
      );
    }

    const results: ImageFile[] = [];

    for (const file of files) {
      const ext = path.extname(file.name).toLowerCase();
      const isHeic = HEIC_EXTENSIONS.has(ext);
      const isAllowed = ALLOWED_TYPES.has(file.type) || isHeic;

      if (!isAllowed) {
        continue; // skip unsupported files
      }

      const fileId = uuidv4();
      const buffer = Buffer.from(await file.arrayBuffer());

      // Get image info
      const info = await getImageInfo(buffer);
      const format = isHeic ? 'heic' : info.format;
      const fileExt = formatToExt(format);

      // Save file
      await saveFile(sessionId, fileId, fileExt, buffer);

      // Generate thumbnail
      const thumbBuffer = await generateThumbnail(buffer);
      if (thumbBuffer) {
        await saveThumbnail(sessionId, fileId, thumbBuffer);
      }

      // Read metadata
      const metadata = await readAllMetadata(buffer);

      const imageFile: ImageFile = {
        id: fileId,
        filename: file.name,
        originalFilename: file.name,
        format: format as ImageFile['format'],
        mimeType: file.type || (isHeic ? 'image/heic' : `image/${format}`),
        size: buffer.length,
        width: info.width,
        height: info.height,
        thumbnailUrl: thumbBuffer ? `/api/thumbnail?sessionId=${sessionId}&id=${fileId}` : undefined,
        metadata,
        status: 'ready',
      };

      results.push(imageFile);
    }

    return NextResponse.json({ images: results, sessionId });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Error procesando archivos' },
      { status: 500 }
    );
  }
}
