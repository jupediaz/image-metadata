import sharp from 'sharp';

export async function generateThumbnail(buffer: Buffer): Promise<Buffer | null> {
  try {
    return await sharp(buffer)
      .rotate() // auto-rotate based on EXIF orientation
      .resize(300, 300, { fit: 'cover', position: 'centre' })
      .jpeg({ quality: 80 })
      .toBuffer();
  } catch (error) {
    // Sharp puede fallar con HEIF/HEIC si no tiene soporte compilado
    console.warn('Failed to generate thumbnail:', error instanceof Error ? error.message : error);
    return null;
  }
}

export async function getImageInfo(buffer: Buffer): Promise<{
  width: number;
  height: number;
  format: string;
  size: number;
}> {
  const metadata = await sharp(buffer).metadata();
  return {
    width: metadata.width ?? 0,
    height: metadata.height ?? 0,
    format: metadata.format ?? 'unknown',
    size: buffer.length,
  };
}

export async function convertImage(
  buffer: Buffer,
  targetFormat: 'jpeg' | 'png' | 'webp',
  options: { quality?: number; preserveMetadata?: boolean } = {}
): Promise<Buffer> {
  const { quality = 90, preserveMetadata = true } = options;

  let pipeline = sharp(buffer).rotate();

  if (preserveMetadata) {
    pipeline = pipeline.withMetadata();
  }

  switch (targetFormat) {
    case 'jpeg':
      pipeline = pipeline.jpeg({ quality, mozjpeg: true });
      break;
    case 'png':
      pipeline = pipeline.png({ compressionLevel: 6 });
      break;
    case 'webp':
      pipeline = pipeline.webp({ quality });
      break;
  }

  return pipeline.toBuffer();
}

export async function stripMetadata(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer).rotate().toBuffer();
}
