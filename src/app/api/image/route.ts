import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import sharp from 'sharp';
import { getSessionDir } from '@/lib/file-manager';

const execAsync = promisify(exec);

export const runtime = 'nodejs';

async function convertHeicToJpeg(heicPath: string): Promise<Buffer> {
  const tempJpegPath = heicPath.replace(/\.heic$/i, '_temp.jpg');

  try {
    // Use ImageMagick to convert HEIC to JPEG
    await execAsync(`convert "${heicPath}" -quality 90 "${tempJpegPath}"`);

    // Read the converted JPEG
    const jpegBuffer = await readFile(tempJpegPath);

    // Clean up temp file
    await unlink(tempJpegPath);

    return jpegBuffer;
  } catch (error) {
    // If ImageMagick fails, try Sharp as fallback
    try {
      return await sharp(heicPath).jpeg({ quality: 90 }).toBuffer();
    } catch (sharpError) {
      throw new Error(`Failed to convert HEIC: ${error}`);
    }
  }
}

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
      const matchPath = path.join(dir, match);

      // Convert HEIC/HEIF to JPEG for browser display using ImageMagick
      if (matchExt === '.heic' || matchExt === '.heif') {
        const jpegBuffer = await convertHeicToJpeg(matchPath);

        return new Response(jpegBuffer, {
          headers: {
            'Content-Type': 'image/jpeg',
            'Cache-Control': 'private, max-age=3600',
          },
        });
      }

      const buffer = await readFile(matchPath);
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

    const extLower = ext.toLowerCase();

    // Convert HEIC/HEIF to JPEG for browser display using ImageMagick
    if (extLower === '.heic' || extLower === '.heif') {
      const jpegBuffer = await convertHeicToJpeg(filePath);

      return new Response(jpegBuffer, {
        headers: {
          'Content-Type': 'image/jpeg',
          'Cache-Control': 'private, max-age=3600',
        },
      });
    }

    const buffer = await readFile(filePath);
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
  } catch (err) {
    console.error('Error serving image:', err);
    return NextResponse.json({ error: 'Error leyendo archivo' }, { status: 500 });
  }
}
