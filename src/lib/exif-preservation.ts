import piexif from 'piexifjs';

/**
 * Extract EXIF data from an image buffer
 *
 * @param imageBuffer - Buffer containing the image data
 * @returns EXIF dump as string (to be re-injected later) or null if no EXIF
 *
 * @note piexifjs only works with JPEG format
 */
export async function extractExif(imageBuffer: Buffer): Promise<string | null> {
  try {
    // piexifjs requires base64 data URL for JPEG
    const dataUrl = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;
    const exifObj = piexif.load(dataUrl);

    // Check if there's any EXIF data
    if (!exifObj || Object.keys(exifObj).length === 0) {
      return null;
    }

    return piexif.dump(exifObj);
  } catch (error) {
    console.warn('Failed to extract EXIF:', error instanceof Error ? error.message : error);
    return null;
  }
}

/**
 * Inject EXIF data into a base64 image
 *
 * @param imageBase64 - Base64 data URL (data:image/jpeg;base64,...)
 * @param exifDump - EXIF dump string from extractExif()
 * @returns Base64 data URL with EXIF injected
 *
 * @note Only works with JPEG images
 */
export function injectExif(imageBase64: string, exifDump: string): string {
  try {
    // Ensure we have a proper data URL
    if (!imageBase64.startsWith('data:image/')) {
      imageBase64 = `data:image/jpeg;base64,${imageBase64}`;
    }

    return piexif.insert(exifDump, imageBase64);
  } catch (error) {
    console.error('Failed to inject EXIF:', error instanceof Error ? error.message : error);
    return imageBase64; // Return original if injection fails
  }
}

/**
 * Copy EXIF metadata from one image buffer to another
 *
 * @param sourceBuffer - Source image with EXIF
 * @param targetBuffer - Target image to inject EXIF into
 * @returns Target buffer with EXIF injected
 *
 * @note Only works with JPEG images
 */
export async function copyExifFromTo(
  sourceBuffer: Buffer,
  targetBuffer: Buffer
): Promise<Buffer> {
  const exifDump = await extractExif(sourceBuffer);
  if (!exifDump) {
    console.warn('No EXIF found in source image, returning target unchanged');
    return targetBuffer;
  }

  const targetDataUrl = `data:image/jpeg;base64,${targetBuffer.toString('base64')}`;
  const resultDataUrl = injectExif(targetDataUrl, exifDump);

  // Convert back to buffer
  const base64Data = resultDataUrl.replace(/^data:image\/jpeg;base64,/, '');
  return Buffer.from(base64Data, 'base64');
}

/**
 * Check if a buffer contains EXIF data
 */
export async function hasExif(imageBuffer: Buffer): Promise<boolean> {
  const exifDump = await extractExif(imageBuffer);
  return exifDump !== null;
}

/**
 * Extract human-readable EXIF summary
 */
export function getExifSummary(exifDump: string): Record<string, string> {
  try {
    const exifObj = piexif.load(`data:image/jpeg;base64,${exifDump}`);
    return {
      camera: String(exifObj['0th']?.[piexif.ImageIFD.Make] || 'Unknown'),
      model: String(exifObj['0th']?.[piexif.ImageIFD.Model] || 'Unknown'),
      dateTime: String(exifObj['Exif']?.[piexif.ExifIFD.DateTimeOriginal] || 'Unknown'),
      gps: exifObj['GPS'] ? 'Present' : 'None',
    };
  } catch {
    return {};
  }
}
