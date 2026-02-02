import { NextRequest, NextResponse } from 'next/server';
import { readFile, readdir } from 'fs/promises';
import path from 'path';
import archiver from 'archiver';
import { Readable } from 'stream';
import { getSessionDir } from '@/lib/file-manager';
import { stripMetadata } from '@/lib/image-processing';
import { ExportRequest } from '@/types/api';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body: ExportRequest = await request.json();
    const { sessionId, imageIds, stripMetadata: shouldStrip } = body;

    if (!sessionId || !imageIds?.length) {
      return NextResponse.json({ error: 'Parametros requeridos' }, { status: 400 });
    }

    const dir = getSessionDir(sessionId);
    const files = await readdir(dir);

    // Collect files to export
    const filesToExport: Array<{ name: string; buffer: Buffer }> = [];

    for (const imageId of imageIds) {
      const imageFile = files.find((f) => f.startsWith(imageId) && !f.includes('_thumb'));
      if (!imageFile) continue;

      const fileBuffer = await readFile(path.join(dir, imageFile));
      const finalBuffer = shouldStrip
        ? Buffer.from(await stripMetadata(fileBuffer))
        : fileBuffer;

      filesToExport.push({ name: imageFile, buffer: finalBuffer });
    }

    if (filesToExport.length === 0) {
      return NextResponse.json({ error: 'No se encontraron imagenes' }, { status: 404 });
    }

    // Single file: return directly
    if (filesToExport.length === 1) {
      const file = filesToExport[0];
      const ext = path.extname(file.name).toLowerCase();
      const mimeMap: Record<string, string> = {
        '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
        '.webp': 'image/webp', '.heic': 'image/heic',
      };

      return new Response(new Uint8Array(file.buffer), {
        headers: {
          'Content-Type': mimeMap[ext] || 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${file.name}"`,
        },
      });
    }

    // Multiple files: create ZIP
    const archive = archiver('zip', { zlib: { level: 1 } });

    const chunks: Uint8Array[] = [];
    archive.on('data', (chunk: Buffer) => chunks.push(new Uint8Array(chunk)));

    const finishPromise = new Promise<Uint8Array>((resolve, reject) => {
      archive.on('end', () => {
        const total = chunks.reduce((acc, c) => acc + c.length, 0);
        const result = new Uint8Array(total);
        let offset = 0;
        for (const chunk of chunks) {
          result.set(chunk, offset);
          offset += chunk.length;
        }
        resolve(result);
      });
      archive.on('error', reject);
    });

    for (const file of filesToExport) {
      archive.append(file.buffer, { name: file.name });
    }

    await archive.finalize();
    const zipBuffer = await finishPromise;

    return new Response(zipBuffer.buffer as ArrayBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="imagenes.zip"',
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Error exportando' }, { status: 500 });
  }
}
