import { NextRequest, NextResponse } from 'next/server';
import { readFile, readdir } from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, unlink } from 'fs/promises';
import os from 'os';
import { getSessionDir } from '@/lib/file-manager';
import { convertToHeicWithQuality } from '@/lib/image-processing';

const execAsync = promisify(exec);

export const runtime = 'nodejs';

interface ExportVersionRequest {
  sessionId: string;
  versionId: string;
  originalImageId: string;
  originalFilename: string;
  originalFormat: string;
  originalWidth: number;
  originalHeight: number;
  originalFileSize?: number;
  originalQuality?: number;
  targetFormat: 'heic' | 'jpg';
}

/** Find a file in the session directory by ID prefix, trying multiple extensions */
async function findFileOnDisk(dir: string, fileId: string): Promise<string | null> {
  const exts = ['.heic', '.heif', '.jpg', '.jpeg', '.png', '.webp', '.tiff'];
  for (const ext of exts) {
    const candidate = path.join(dir, `${fileId}${ext}`);
    try {
      await readFile(candidate, { flag: 'r' });
      return candidate;
    } catch {
      continue;
    }
  }
  // Fallback: scan directory for any file starting with fileId (not thumbs)
  try {
    const files = await readdir(dir);
    const match = files.find(
      (f) => f.startsWith(fileId) && !f.includes('_thumb')
    );
    if (match) return path.join(dir, match);
  } catch { /* ignore */ }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body: ExportVersionRequest = await request.json();
    const {
      sessionId,
      versionId,
      originalImageId,
      originalFilename,
      originalFormat,
      originalWidth,
      originalHeight,
      originalFileSize,
      originalQuality,
      targetFormat,
    } = body;

    if (!sessionId || !versionId || !originalFilename) {
      return NextResponse.json({ error: 'Parametros requeridos' }, { status: 400 });
    }

    const dir = getSessionDir(sessionId);

    // Find the edited version file on disk
    const versionPath = await findFileOnDisk(dir, versionId);
    if (!versionPath) {
      return NextResponse.json({ error: 'Version file not found' }, { status: 404 });
    }
    const versionBuffer = await readFile(versionPath);

    // Find the ORIGINAL file on disk (for metadata copying)
    const originalPath = await findFileOnDisk(dir, originalImageId);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let finalBuffer: any = versionBuffer;
    const finalExt = targetFormat === 'heic' ? '.heic' : '.jpg';

    // Convert to target format with exact quality preservation
    if (targetFormat === 'heic' && originalFormat === 'heic') {
      console.log('Converting to HEIC with quality preservation');
      console.log(`Original: ${originalWidth}x${originalHeight}, size: ${originalFileSize}, quality: ${originalQuality}`);

      finalBuffer = await convertToHeicWithQuality(versionBuffer, {
        width: originalWidth,
        height: originalHeight,
        quality: originalQuality || 85,
        targetFileSize: originalFileSize,
      });
    } else if (targetFormat === 'jpg') {
      const tempInput = path.join(os.tmpdir(), `jpg-input-${Date.now()}.png`);
      const tempOutput = path.join(os.tmpdir(), `jpg-output-${Date.now()}.jpg`);

      try {
        await writeFile(tempInput, versionBuffer);
        const quality = originalQuality || 90;
        await execAsync(
          `magick "${tempInput}" -resize ${originalWidth}x${originalHeight}! -quality ${quality} "${tempOutput}"`
        );
        finalBuffer = await readFile(tempOutput);
      } finally {
        await unlink(tempInput).catch(() => {});
        await unlink(tempOutput).catch(() => {});
      }
    }

    // Copy ALL metadata from the original file using exiftool -tagsfromfile
    if (originalPath) {
      const tempOutput = path.join(os.tmpdir(), `export-meta-${Date.now()}${finalExt}`);
      try {
        await writeFile(tempOutput, finalBuffer);

        // Copy every metadata tag from original, preserve image dimensions
        await execAsync(
          `exiftool -overwrite_original -tagsfromfile "${originalPath}" -all:all -ImageWidth=${originalWidth} -ImageHeight=${originalHeight} "${tempOutput}"`
        );

        finalBuffer = await readFile(tempOutput);
      } catch (error) {
        console.warn('exiftool metadata copy failed, trying without dimension override:', error);
        // Retry without dimension override
        try {
          await writeFile(tempOutput, finalBuffer);
          await execAsync(
            `exiftool -overwrite_original -tagsfromfile "${originalPath}" -all:all "${tempOutput}"`
          );
          finalBuffer = await readFile(tempOutput);
        } catch (err2) {
          console.warn('exiftool metadata copy failed entirely:', err2);
        }
      } finally {
        await unlink(tempOutput).catch(() => {});
      }
    } else {
      console.warn('Original file not found on disk, skipping metadata copy');
    }

    // Generate filename: originalname_updated.ext
    const baseName = originalFilename.replace(/\.[^/.]+$/, '');
    const exportFilename = `${baseName}_updated${finalExt}`;

    console.log(`Exported: ${exportFilename}`);
    console.log(`   Original size: ${originalFileSize} bytes`);
    console.log(`   Exported size: ${finalBuffer.length} bytes`);
    console.log(`   Size difference: ${Math.abs((finalBuffer.length - (originalFileSize || 0)) / (originalFileSize || 1) * 100).toFixed(1)}%`);

    const mimeType = targetFormat === 'heic' ? 'image/heic' : 'image/jpeg';

    return new Response(new Uint8Array(finalBuffer), {
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${exportFilename}"`,
      },
    });
  } catch (error) {
    console.error('Export version error:', error);
    return NextResponse.json(
      { error: `Error exportando: ${error instanceof Error ? error.message : 'Unknown'}` },
      { status: 500 }
    );
  }
}
