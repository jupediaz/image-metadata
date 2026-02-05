import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getFile, saveFile, saveThumbnail, getFilePath, formatToExt } from '@/lib/file-manager';
import { generateThumbnail, getImageInfo } from '@/lib/image-processing';
import { editImageWithGemini } from '@/lib/gemini-client';
import { extractExif, injectExif } from '@/lib/exif-preservation';
import { GeminiEditApiRequest, GeminiEditApiResponse } from '@/types/api';

export const runtime = 'nodejs';
export const maxDuration = 60; // Gemini may take some time

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body: GeminiEditApiRequest = await request.json();
    const { sessionId, imageId, prompt, maskDataUrl, preserveExif } = body;

    // Validation
    if (!sessionId || !imageId || !prompt) {
      return NextResponse.json(
        { error: 'sessionId, imageId, and prompt are required' },
        { status: 400 }
      );
    }

    // Get API key (user-provided or server env var)
    const userApiKey = request.headers.get('x-gemini-api-key');
    const apiKey = userApiKey || process.env.GOOGLE_GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error: 'No Gemini API key provided. Either set GOOGLE_GEMINI_API_KEY environment variable or provide x-gemini-api-key header.',
        },
        { status: 401 }
      );
    }

    // Load original image
    // Try to find the file with various extensions
    let originalBuffer: Buffer | null = null;
    let originalExt = '';
    const possibleExts = ['.jpg', '.jpeg', '.png', '.heic', '.webp', '.tiff'];

    for (const ext of possibleExts) {
      try {
        originalBuffer = await getFile(sessionId, imageId, ext);
        originalExt = ext;
        break;
      } catch {
        // Try next extension
      }
    }

    if (!originalBuffer) {
      return NextResponse.json(
        { error: `Image not found: ${imageId}` },
        { status: 404 }
      );
    }

    // Extract EXIF if preservation requested
    let exifDump: string | null = null;
    if (preserveExif) {
      exifDump = await extractExif(originalBuffer);
    }

    // Convert to base64 for Gemini
    const imageBase64 = `data:image/jpeg;base64,${originalBuffer.toString('base64')}`;

    // Call Gemini API
    let editResult;
    try {
      editResult = await editImageWithGemini(apiKey, {
        imageBase64,
        prompt,
        maskBase64: maskDataUrl || undefined,
      });
    } catch (error) {
      console.error('Gemini API error:', error);
      return NextResponse.json(
        {
          error: `Gemini API failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
        { status: 500 }
      );
    }

    // Convert Gemini result back to buffer
    const editedBase64 = editResult.imageBase64.replace(/^data:image\/\w+;base64,/, '');
    let editedBuffer = Buffer.from(editedBase64, 'base64');

    // Re-inject EXIF if we have it
    if (exifDump) {
      try {
        const withExif = injectExif(editResult.imageBase64, exifDump);
        const withExifBase64 = withExif.replace(/^data:image\/\w+;base64,/, '');
        editedBuffer = Buffer.from(withExifBase64, 'base64');
      } catch (error) {
        console.warn('Failed to inject EXIF into edited image:', error);
        // Continue without EXIF
      }
    }

    // Generate new version ID
    const versionId = uuidv4();
    const versionFileId = `${imageId}_v${versionId}`;

    // Get image info
    const info = await getImageInfo(editedBuffer);
    const format = info.format || 'jpeg';
    const fileExt = formatToExt(format);

    // Save edited version
    await saveFile(sessionId, versionFileId, fileExt, editedBuffer);

    // Generate thumbnail for edited version
    const thumbBuffer = await generateThumbnail(editedBuffer);
    let thumbnailUrl: string | undefined;
    if (thumbBuffer) {
      await saveThumbnail(sessionId, versionFileId, thumbBuffer);
      thumbnailUrl = `/api/thumbnail?sessionId=${sessionId}&id=${versionFileId}`;
    }

    const processingTimeMs = Date.now() - startTime;

    const response: GeminiEditApiResponse = {
      success: true,
      newVersionId: versionFileId,
      editedImageUrl: `/api/image?sessionId=${sessionId}&id=${versionFileId}`,
      thumbnailUrl,
      processingTimeMs,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Gemini edit error:', error);
    return NextResponse.json(
      {
        success: false,
        error: `Error processing edit: ${error instanceof Error ? error.message : 'Unknown error'}`,
        newVersionId: '',
        editedImageUrl: '',
        processingTimeMs: Date.now() - startTime,
      } as GeminiEditApiResponse,
      { status: 500 }
    );
  }
}
