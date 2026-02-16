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
      console.log(`📤 Processing file: ${file.name}`);

      const ext = path.extname(file.name).toLowerCase();
      const isHeic = HEIC_EXTENSIONS.has(ext);
      const isAllowed = ALLOWED_TYPES.has(file.type) || isHeic;

      if (!isAllowed) {
        console.log(`  ❌ Skipped: unsupported type ${file.type}`);
        continue; // skip unsupported files
      }

      const fileId = uuidv4();
      const buffer = Buffer.from(await file.arrayBuffer());
      console.log(`  ✓ Buffer created: ${buffer.length} bytes`);

      // Get image info
      console.log(`  🔍 Getting image info...`);
      const info = await getImageInfo(buffer);
      const format = isHeic ? 'heic' : info.format;
      const fileExt = formatToExt(format);
      console.log(`  ✓ Format: ${format}, ${info.width}x${info.height}`);

      // Save file
      console.log(`  💾 Saving file...`);
      await saveFile(sessionId, fileId, fileExt, buffer);
      console.log(`  ✓ File saved`);

      // Generate thumbnail (pass format for HEIC handling)
      console.log(`  🖼️  Generating thumbnail...`);
      const thumbBuffer = await generateThumbnail(buffer, format);
      if (thumbBuffer) {
        await saveThumbnail(sessionId, fileId, thumbBuffer);
        console.log(`  ✓ Thumbnail saved`);
      }

      // Extract metadata (EXIF, GPS, IPTC, etc.)
      console.log(`  📋 Reading metadata...`);
      let metadata;
      try {
        metadata = await readAllMetadata(buffer, format);
        console.log(`  ✓ Metadata extracted:`, {
          hasExif: !!metadata.exif,
          hasGps: !!metadata.gps,
          hasDates: !!metadata.dates,
          hasIptc: !!metadata.iptc,
          rawKeys: Object.keys(metadata.raw || {}),
        });
      } catch (metaError) {
        console.warn(`  ⚠️ Metadata extraction failed, using empty:`, metaError);
        metadata = { exif: null, gps: null, dates: null, iptc: null, xmp: null, icc: null, raw: {} };
      }

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
        // Preserve original file parameters for quality matching
        originalFileSize: buffer.length,
        originalQuality: info.quality,
        originalColorSpace: info.colorSpace,
        originalBitDepth: info.bitDepth,
      };

      results.push(imageFile);
      console.log(`✅ Processed: ${file.name}`);
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
