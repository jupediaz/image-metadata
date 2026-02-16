import { GoogleGenerativeAI } from '@google/generative-ai';

// Default Gemini model for image generation (Nano Banana - fast)
const DEFAULT_MODEL = 'gemini-2.5-flash-image';

interface EditImageParams {
  imageBase64: string;
  prompt: string;
  maskBase64?: string;
  model?: string;  // Optional model override
}

interface EditImageResult {
  imageBase64: string;
  text?: string;
}

/**
 * Edit an image using Google Gemini AI
 *
 * @param apiKey - Google Gemini API key
 * @param params - Image editing parameters
 * @returns Edited image as base64 data URL
 *
 * @example
 * ```typescript
 * const result = await editImageWithGemini(apiKey, {
 *   imageBase64: 'data:image/jpeg;base64,...',
 *   prompt: 'Remove the background',
 *   maskBase64: 'data:image/png;base64,...' // optional
 * });
 * ```
 */
export async function editImageWithGemini(
  apiKey: string,
  params: EditImageParams
): Promise<EditImageResult> {
  const modelName = params.model || DEFAULT_MODEL;
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelName,
    // Note: responseMimeType is not needed for image generation
    // Gemini returns images via inlineData in response parts
  });

  const parts: Array<{ inlineData: { mimeType: string; data: string } } | { text: string }> = [];

  // Add the original image (preserve format for quality)
  const imageData = params.imageBase64.replace(/^data:image\/\w+;base64,/, '');
  // Detect original mime type or default to PNG (lossless)
  const mimeTypeMatch = params.imageBase64.match(/^data:(image\/\w+);base64,/);
  const imageMimeType = mimeTypeMatch ? mimeTypeMatch[1] : 'image/png';

  console.log('📤 Sending image to Gemini:', {
    mimeType: imageMimeType,
    dataSize: imageData.length,
    hasMask: !!params.maskBase64,
    model: modelName
  });

  parts.push({
    inlineData: {
      mimeType: imageMimeType,
      data: imageData,
    },
  });

  // Add mask if provided
  if (params.maskBase64) {
    const maskData = params.maskBase64.replace(/^data:image\/\w+;base64,/, '');

    console.log('🎭 Sending mask to Gemini:', {
      maskSize: maskData.length,
      maskMimeType: 'image/png'
    });

    parts.push({
      inlineData: {
        mimeType: 'image/png',
        data: maskData,
      },
    });
    parts.push({
      text: [
        '🚨 CRITICAL: MASKED INPAINTING MODE - ABSOLUTE PRESERVATION REQUIRED 🚨',
        '',
        'You are receiving TWO images:',
        '1. FIRST IMAGE = Original image to edit',
        '2. SECOND IMAGE = Binary inpainting mask (white/black)',
        '',
        '═══════════════════════════════════════════════════════════',
        '                    MASK INTERPRETATION',
        '═══════════════════════════════════════════════════════════',
        '',
        '✅ WHITE PIXELS in mask = EDIT ZONES',
        '   → Apply the edit instruction ONLY to these white areas',
        '   → These are the ONLY pixels you are allowed to modify',
        '',
        '🚫 BLACK PIXELS in mask = PROTECTED ZONES (NO TOUCH!)',
        '   → These areas MUST be 100% IDENTICAL to the original',
        '   → Copy these pixels EXACTLY from the first image',
        '   → Do NOT touch, enhance, fix, or modify them in ANY way',
        '',
        '═══════════════════════════════════════════════════════════',
        '         NON-NEGOTIABLE RULES FOR BLACK AREAS',
        '═══════════════════════════════════════════════════════════',
        '',
        'BLACK areas are SACRED - treat them as if they were copyrighted:',
        '',
        '🚫 DO NOT alter colors, brightness, contrast, or saturation',
        '🚫 DO NOT enhance, sharpen, blur, denoise, or "improve"',
        '🚫 DO NOT change lighting, shadows, or highlights',
        '🚫 DO NOT modify textures, patterns, or details',
        '🚫 DO NOT recompress, resize, or change quality',
        '🚫 DO NOT touch text, logos, faces, or any identifiable features',
        '🚫 DO NOT "blend" or "smooth" transitions with white areas',
        '🚫 DO NOT do ANYTHING except copy them pixel-for-pixel',
        '',
        'Think of black areas as a cutout from the original photo',
        'that you must paste UNMODIFIED into your output.',
        '',
        '═══════════════════════════════════════════════════════════',
        '                  YOUR TASK (White areas only)',
        '═══════════════════════════════════════════════════════════',
        '',
        `INSTRUCTION: ${params.prompt}`,
        '',
        'Apply this instruction EXCLUSIVELY to WHITE masked areas.',
        'Leave BLACK areas absolutely untouched.',
        '',
        '═══════════════════════════════════════════════════════════',
        '                   OUTPUT REQUIREMENTS',
        '═══════════════════════════════════════════════════════════',
        '',
        '✅ Same resolution and dimensions as the original image',
        '✅ Maximum quality with no compression artifacts',
        '✅ Black masked areas copied pixel-perfect from original',
        '✅ White masked areas edited according to instruction',
        '✅ Clean transitions at mask edges (no halos or artifacts)',
        '',
        'REMEMBER: This is not a suggestion - it\'s a hard requirement.',
        'Black areas = zero modifications. White areas = apply instruction.',
      ].join('\n'),
    });
  } else {
    console.log('📝 No mask provided, applying prompt to entire image');
    parts.push({
      text: [
        params.prompt,
        '',
        'CRITICAL: Maintain the exact same image quality, sharpness, and detail level as the original image.',
        'Output the result in the same format and quality as the input image.',
      ].join('\n')
    });
  }

  const result = await model.generateContent(parts);
  const response = result.response;

  let imageBase64 = '';
  let text = '';

  // Log full response for debugging
  console.log('Gemini response:', JSON.stringify({
    candidates: response.candidates?.map(c => ({
      finishReason: c.finishReason,
      parts: c.content?.parts?.map(p => ({
        hasText: !!p.text,
        hasInlineData: !!p.inlineData,
        textPreview: p.text?.substring(0, 100),
        mimeType: p.inlineData?.mimeType,
      })),
    })),
  }, null, 2));

  // Extract image and text from response
  for (const candidate of response.candidates ?? []) {
    for (const part of candidate.content?.parts ?? []) {
      if (part.inlineData) {
        imageBase64 = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
      if (part.text) {
        text = part.text;
      }
    }
  }

  if (!imageBase64) {
    console.error('No image found in response. Model:', modelName);
    throw new Error(`Gemini did not return an image. Model "${modelName}" may not support image generation. Try using "gemini-2.5-flash-image" or "gemini-3-pro-image-preview" instead.`);
  }

  return { imageBase64, text };
}

/**
 * Validate API key by attempting a simple request
 */
export async function validateApiKey(apiKey: string): Promise<boolean> {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: DEFAULT_MODEL });
    await model.generateContent('test');
    return true;
  } catch {
    return false;
  }
}
