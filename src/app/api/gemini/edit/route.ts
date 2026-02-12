import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getFile, saveFile, saveThumbnail, getFilePath, formatToExt } from '@/lib/file-manager';
import { generateThumbnail, getImageInfo } from '@/lib/image-processing';
import { editImageWithGemini } from '@/lib/gemini-client';
import { extractExif, injectExif } from '@/lib/exif-preservation';
import { GeminiEditApiRequest, GeminiEditApiResponse } from '@/types/api';
import sharp from 'sharp';

export const runtime = 'nodejs';
export const maxDuration = 60; // Gemini may take some time

/**
 * Combines inpainting mask and safe zone mask into a single mask for Gemini.
 *
 * Logic:
 * - Inpainting mask (red): white = areas to edit, black = keep as is
 * - Safe zone mask (green): white = areas to protect, black = can edit
 * - Final mask: white = edit, black = don't edit
 *
 * Priority: Safe zone overrides inpainting (protected areas never get edited)
 */
async function combineMasks(
  inpaintMask: string | undefined,
  safeZoneMask: string | undefined,
  width: number,
  height: number
): Promise<string | undefined> {
  console.log('🎭 Combining masks:', {
    hasInpaint: !!inpaintMask,
    hasSafeZone: !!safeZoneMask,
    targetSize: { width, height }
  });

  // If no masks, return undefined
  if (!inpaintMask && !safeZoneMask) {
    console.log('  → No masks provided');
    return undefined;
  }

  // If only inpainting mask, use it directly
  if (inpaintMask && !safeZoneMask) {
    console.log('  → Using inpaint mask only');
    return inpaintMask;
  }

  // If only safe zone mask, invert it (protected areas = black in final mask)
  if (!inpaintMask && safeZoneMask) {
    console.log('  → Inverting safe zone mask');
    const safeZoneBuffer = Buffer.from(safeZoneMask.replace(/^data:image\/\w+;base64,/, ''), 'base64');

    // Invert: white (protected) → black (don't edit)
    const invertedBuffer = await sharp(safeZoneBuffer)
      .resize(width, height, { fit: 'fill' })
      .negate()
      .toBuffer();

    console.log('  → Safe zone mask inverted successfully');
    return `data:image/png;base64,${invertedBuffer.toString('base64')}`;
  }

  // Both masks exist: combine them
  // Start with inpainting mask, then paint safe zones as black (protected)
  console.log('  → Combining both masks');

  const inpaintBuffer = Buffer.from(inpaintMask!.replace(/^data:image\/\w+;base64,/, ''), 'base64');
  const safeZoneBuffer = Buffer.from(safeZoneMask!.replace(/^data:image\/\w+;base64,/, ''), 'base64');

  console.log('  → Processing buffers:', {
    inpaintSize: inpaintBuffer.length,
    safeZoneSize: safeZoneBuffer.length
  });

  // Process both masks
  const [inpaintImg, safeZoneImg] = await Promise.all([
    sharp(inpaintBuffer).resize(width, height, { fit: 'fill' }).raw().toBuffer({ resolveWithObject: true }),
    sharp(safeZoneBuffer).resize(width, height, { fit: 'fill' }).raw().toBuffer({ resolveWithObject: true })
  ]);

  const inpaintData = inpaintImg.data;
  const safeZoneData = safeZoneImg.data;
  const channels = inpaintImg.info.channels;

  console.log('  → Images loaded:', {
    size: { width: inpaintImg.info.width, height: inpaintImg.info.height },
    channels,
    dataLength: inpaintData.length
  });

  let protectedPixels = 0;
  let editPixels = 0;

  // Combine: where safe zone is white (protected), set to black (don't edit)
  for (let i = 0; i < inpaintData.length; i += channels) {
    // Check if safe zone pixel is white (protected area)
    const safeZoneValue = safeZoneData[i]; // R channel
    const inpaintValue = inpaintData[i];

    if (safeZoneValue > 128) {
      // This is a protected area, paint it black in final mask
      inpaintData[i] = 0;     // R
      inpaintData[i + 1] = 0; // G
      inpaintData[i + 2] = 0; // B
      protectedPixels++;
    } else if (inpaintValue > 128) {
      editPixels++;
    }
  }

  console.log('  → Mask statistics:', {
    protectedPixels,
    editPixels,
    protectedPercent: ((protectedPixels / (inpaintData.length / channels)) * 100).toFixed(2) + '%',
    editPercent: ((editPixels / (inpaintData.length / channels)) * 100).toFixed(2) + '%'
  });

  // Convert back to PNG
  const combinedBuffer = await sharp(inpaintData, {
    raw: {
      width: inpaintImg.info.width,
      height: inpaintImg.info.height,
      channels: channels
    }
  }).png().toBuffer();

  console.log('  → Combined mask created successfully');
  return `data:image/png;base64,${combinedBuffer.toString('base64')}`;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body: GeminiEditApiRequest = await request.json();
    const { sessionId, imageId, prompt, maskDataUrl, safeZoneMaskDataUrl, preserveExif, model } = body;

    console.log('📥 Gemini Edit API Request:', {
      imageId,
      prompt: prompt.substring(0, 50) + '...',
      hasInpaintMask: !!maskDataUrl,
      hasSafeZoneMask: !!safeZoneMaskDataUrl,
      inpaintMaskLength: maskDataUrl?.length || 0,
      safeZoneMaskLength: safeZoneMaskDataUrl?.length || 0,
      model
    });

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

    // Get image dimensions for mask processing
    const imageInfo = await getImageInfo(originalBuffer);
    const imageWidth = imageInfo.width || 1024;
    const imageHeight = imageInfo.height || 768;
    const imageFormat = imageInfo.format || 'jpeg';

    // Combine masks if both are provided
    let finalMask: string | undefined;
    if (maskDataUrl || safeZoneMaskDataUrl) {
      console.log('Processing masks:', {
        hasInpaintMask: !!maskDataUrl,
        hasSafeZoneMask: !!safeZoneMaskDataUrl,
        imageSize: { width: imageWidth, height: imageHeight }
      });

      finalMask = await combineMasks(maskDataUrl, safeZoneMaskDataUrl, imageWidth, imageHeight);
    }

    // Convert to base64 for Gemini (preserve original format for quality)
    const imageMimeType = `image/${imageFormat}`;
    const imageBase64 = `data:${imageMimeType};base64,${originalBuffer.toString('base64')}`;

    console.log('📤 Preparing to send to Gemini:', {
      format: imageFormat,
      mimeType: imageMimeType,
      width: imageWidth,
      height: imageHeight,
      hasMask: !!finalMask,
      preserveExif
    });

    // Call Gemini API
    let editResult;
    try {
      editResult = await editImageWithGemini(apiKey, {
        imageBase64,
        prompt,
        maskBase64: finalMask,
        model: model || undefined,
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
        const uint8Array = Uint8Array.from(Buffer.from(withExifBase64, 'base64'));
        editedBuffer = Buffer.from(uint8Array);
        console.log('✅ EXIF re-injected successfully');
      } catch (error) {
        console.warn('⚠️ Failed to inject EXIF into edited image:', error);
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
      exifDump: exifDump || undefined,
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
