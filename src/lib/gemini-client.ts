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

  // Add the original image
  const imageData = params.imageBase64.replace(/^data:image\/\w+;base64,/, '');
  parts.push({
    inlineData: {
      mimeType: 'image/jpeg',
      data: imageData,
    },
  });

  // Add mask if provided
  if (params.maskBase64) {
    const maskData = params.maskBase64.replace(/^data:image\/\w+;base64,/, '');
    parts.push({
      inlineData: {
        mimeType: 'image/png',
        data: maskData,
      },
    });
    parts.push({
      text: `The second image is a mask where white areas indicate regions to edit. Focus your edits only on the white regions. ${params.prompt}`,
    });
  } else {
    parts.push({ text: params.prompt });
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
