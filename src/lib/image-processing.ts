import sharp from 'sharp';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, readFile, unlink } from 'fs/promises';
import path from 'path';
import os from 'os';

const execAsync = promisify(exec);

export async function generateThumbnail(buffer: Buffer, format?: string): Promise<Buffer | null> {
  try {
    // For HEIC/HEIF files, use ImageMagick
    if (format === 'heic' || format === 'heif') {
      const tempInput = path.join(os.tmpdir(), `thumb-input-${Date.now()}.heic`);
      const tempOutput = path.join(os.tmpdir(), `thumb-output-${Date.now()}.jpg`);

      try {
        // Write buffer to temp file
        await writeFile(tempInput, buffer);

        // Convert using ImageMagick
        await execAsync(
          `magick "${tempInput}" -auto-orient -thumbnail 300x300^ -gravity center -extent 300x300 -quality 80 "${tempOutput}"`
        );

        // Read result
        const thumbBuffer = await readFile(tempOutput);

        // Cleanup
        await unlink(tempInput).catch(() => {});
        await unlink(tempOutput).catch(() => {});

        return thumbBuffer;
      } catch (error) {
        // Cleanup on error
        await unlink(tempInput).catch(() => {});
        await unlink(tempOutput).catch(() => {});
        throw error;
      }
    }

    // For other formats, use Sharp
    return await sharp(buffer)
      .rotate() // auto-rotate based on EXIF orientation
      .resize(300, 300, { fit: 'cover', position: 'centre' })
      .jpeg({ quality: 80 })
      .toBuffer();
  } catch (error) {
    console.warn('Failed to generate thumbnail:', error instanceof Error ? error.message : error);
    return null;
  }
}

export async function getImageInfo(buffer: Buffer): Promise<{
  width: number;
  height: number;
  format: string;
  size: number;
  quality?: number;
  colorSpace?: string;
  bitDepth?: number;
}> {
  const metadata = await sharp(buffer).metadata();
  return {
    width: metadata.width ?? 0,
    height: metadata.height ?? 0,
    format: metadata.format ?? 'unknown',
    size: buffer.length,
    quality: (metadata as unknown as Record<string, unknown>).quality as number | undefined,
    colorSpace: metadata.space,
    bitDepth: metadata.depth ? parseInt(metadata.depth.replace('uchar', '8').replace('ushort', '16')) : undefined,
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

/**
 * Convert image to HEIC with precise quality control using ImageMagick
 * This preserves the exact dimensions and attempts to match file size/quality
 */
export async function convertToHeicWithQuality(
  buffer: Buffer,
  options: {
    width: number;
    height: number;
    quality?: number;
    targetFileSize?: number;
  }
): Promise<Buffer> {
  const { width, height, quality = 85, targetFileSize } = options;

  const tempInput = path.join(os.tmpdir(), `convert-input-${Date.now()}.png`);
  const tempOutput = path.join(os.tmpdir(), `convert-output-${Date.now()}.heic`);

  try {
    // Write buffer to temp file
    await writeFile(tempInput, buffer);

    // Build ImageMagick command with precise parameters
    // -resize ensures exact dimensions
    // -quality controls compression (0-100, where 100 is lossless)
    const command = [
      `magick "${tempInput}"`,
      `-resize ${width}x${height}!`, // ! forces exact dimensions
      `-quality ${quality}`,
      `"${tempOutput}"`,
    ].join(' ');

    await execAsync(command);

    // Read result
    const heicBuffer = await readFile(tempOutput);

    // If targetFileSize provided, adjust quality if needed
    if (targetFileSize && Math.abs(heicBuffer.length - targetFileSize) > targetFileSize * 0.1) {
      // File size differs by more than 10%, try to adjust quality
      const ratio = targetFileSize / heicBuffer.length;
      const adjustedQuality = Math.round(Math.max(50, Math.min(100, quality * ratio)));

      if (adjustedQuality !== quality) {
        console.log(`Adjusting HEIC quality from ${quality} to ${adjustedQuality} to match target size`);

        const adjustedCommand = [
          `magick "${tempInput}"`,
          `-resize ${width}x${height}!`,
          `-quality ${adjustedQuality}`,
          `"${tempOutput}"`,
        ].join(' ');

        await execAsync(adjustedCommand);
        const adjustedBuffer = await readFile(tempOutput);

        // Cleanup
        await unlink(tempInput).catch(() => {});
        await unlink(tempOutput).catch(() => {});

        return adjustedBuffer;
      }
    }

    // Cleanup
    await unlink(tempInput).catch(() => {});
    await unlink(tempOutput).catch(() => {});

    return heicBuffer;
  } catch (error) {
    // Cleanup on error
    await unlink(tempInput).catch(() => {});
    await unlink(tempOutput).catch(() => {});
    throw error;
  }
}
