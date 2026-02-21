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
        'INPAINTING MODE: You are receiving TWO images.',
        '1. FIRST IMAGE = Original photograph to edit',
        '2. SECOND IMAGE = Black & white mask (white = edit zone, black = keep)',
        '',
        `INSTRUCTION: ${params.prompt}`,
        '',
        'RULES:',
        '- Edit ONLY the white areas of the mask. Black areas must be pixel-identical to the original.',
        '- CRITICAL: The edited content must SEAMLESSLY BLEND with the surrounding area.',
        '  Match the EXACT texture, grain, color temperature, lighting, and paper/surface quality',
        '  of the surrounding area. The edit must be INVISIBLE — as if the image was always this way.',
        '- DO NOT add any white backgrounds, borders, halos, or shapes around the edited content.',
        '- DO NOT render the mask shape into the output. The mask is invisible guidance, not visual.',
        '- If replacing text, the new text must use the SAME ink style, color, and printing method',
        '  as the existing text in the document. Place it directly on the same surface/background.',
        '- Same resolution and dimensions as the original. Maximum quality.',
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
