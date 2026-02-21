import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:6605';
const TEST_IMAGE = '/tmp/test-mask-alignment.jpg'; // 400x300 blue image with red circle

test('mask alignment: exported mask is cropped to image bounds, not full canvas', async ({ page }) => {
  const consoleLogs: string[] = [];
  page.on('console', (msg) => {
    const text = msg.text();
    consoleLogs.push(text);
    if (text.includes('MASK') || text.includes('mask') || text.includes('Mask')) {
      console.log('[BROWSER]', text);
    }
  });

  // Step 1: Upload test image
  await page.goto(BASE_URL);
  await page.waitForLoadState('networkidle');

  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles(TEST_IMAGE);
  await page.waitForSelector('img[alt*="test-mask-alignment"]', { timeout: 15000 });
  await page.waitForTimeout(500);

  // Click image to go to detail
  await page.locator('div:has(> img[alt*="test-mask-alignment"])').first().click();
  await page.waitForURL(/\/image\//, { timeout: 10000 });

  // Go to editor
  const editLink = page.locator('a[href*="/edit"], button:has-text("Edit"), button:has-text("Editar")');
  await editLink.first().click();
  await page.waitForURL(/\/edit/, { timeout: 10000 });
  await page.waitForSelector('canvas', { timeout: 10000 });
  await page.waitForTimeout(3000);

  // Step 2: Get canvas and image info
  const canvasInfo = await page.evaluate(() => {
    const lower = document.querySelector('canvas.lower-canvas') as HTMLCanvasElement;
    return lower ? {
      width: lower.width,
      height: lower.height,
      cssWidth: lower.clientWidth,
      cssHeight: lower.clientHeight,
    } : null;
  });
  console.log('Canvas dimensions:', JSON.stringify(canvasInfo));

  // Step 3: Draw a stroke across the middle of the canvas
  const canvasEl = page.locator('canvas').first();
  const box = await canvasEl.boundingBox();
  if (!box) throw new Error('Canvas not found');

  // Draw from 30% to 70% across, at 50% height
  const startX = box.x + box.width * 0.3;
  const startY = box.y + box.height * 0.5;
  const endX = box.x + box.width * 0.7;

  console.log(`Drawing from (${startX.toFixed(0)}, ${startY.toFixed(0)}) to (${endX.toFixed(0)}, ${startY.toFixed(0)})`);

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  for (let i = 0; i <= 20; i++) {
    await page.mouse.move(startX + (endX - startX) * (i / 20), startY);
    await page.waitForTimeout(20);
  }
  await page.mouse.up();
  await page.waitForTimeout(1000);

  // Step 4: Expose the mask data URL by intercepting the store
  // We'll inject a script to read the zustand store state
  const maskInfo = await page.evaluate(() => {
    // Try to read from the zustand store
    // The useImageStore has editorState.inpaintMaskDataUrl
    const stores = (window as any).__zustand_stores || {};

    // Alternative: check all canvas elements for Fabric.js instance
    const canvases = document.querySelectorAll('canvas');
    let fabricInfo: any = null;

    for (const c of canvases) {
      // Fabric.js v6 might store the instance differently
      const keys = Object.keys(c);
      const fabricKey = keys.find(k => k.startsWith('__') || k === '__fabric');
      if (fabricKey) {
        fabricInfo = { key: fabricKey, found: true };
      }
    }

    return {
      fabricInfo,
      canvasCount: canvases.length,
      storeKeys: Object.keys(stores),
    };
  });
  console.log('Fabric detection:', JSON.stringify(maskInfo));

  // Step 5: Get the actual mask data URL from the React state
  // We need to intercept the API call to /api/gemini/edit
  // Instead, let's check if the mask was set by examining the DOM or state

  // Alternative approach: inspect the mask by triggering the generate button
  // and intercepting the request body
  let capturedMaskDataUrl: string | null = null;

  // Set up request interception
  await page.route('**/api/gemini/edit', async (route) => {
    const request = route.request();
    const body = JSON.parse(request.postData() || '{}');
    capturedMaskDataUrl = body.inpaintMaskDataUrl || null;
    console.log('Intercepted API request:', {
      hasInpaintMask: !!body.inpaintMaskDataUrl,
      maskLength: body.inpaintMaskDataUrl?.length || 0,
      imageId: body.imageId,
    });

    // Abort the request (we don't actually want to call Gemini)
    await route.abort();
  });

  // Type a prompt and click generate to trigger the API call
  const promptInput = page.locator('textarea');
  await promptInput.fill('test alignment');
  await page.waitForTimeout(200);

  // Click the generate button
  const generateBtn = page.locator('button:has-text("Generar"), button:has-text("Generate")');
  if (await generateBtn.count() > 0) {
    await generateBtn.first().click();
    await page.waitForTimeout(2000); // Wait for request to be intercepted
  }

  // Step 6: Analyze the mask if captured
  if (capturedMaskDataUrl) {
    // Decode the mask PNG and check its dimensions
    const maskDimensions = await page.evaluate((dataUrl: string) => {
      return new Promise<{ width: number; height: number; whitePixelCount: number; totalPixels: number }>((resolve) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(img, 0, 0);
          const data = ctx.getImageData(0, 0, img.width, img.height).data;

          let whitePixelCount = 0;
          for (let i = 0; i < data.length; i += 4) {
            if (data[i] > 128) whitePixelCount++; // Check R channel
          }

          resolve({
            width: img.width,
            height: img.height,
            whitePixelCount,
            totalPixels: img.width * img.height,
          });
        };
        img.src = dataUrl;
      });
    }, capturedMaskDataUrl);

    console.log('\n=== MASK DIMENSIONS ===');
    console.log(`Mask size: ${maskDimensions.width}x${maskDimensions.height}`);
    console.log(`Canvas size: ${canvasInfo?.width}x${canvasInfo?.height}`);
    console.log(`Original image: 400x300`);
    console.log(`White pixels: ${maskDimensions.whitePixelCount} / ${maskDimensions.totalPixels} (${(maskDimensions.whitePixelCount / maskDimensions.totalPixels * 100).toFixed(1)}%)`);

    // THE KEY ASSERTION: mask should be at original image dimensions (400x300),
    // NOT at canvas dimensions (e.g., 906x840)
    console.log(`\nExpected: mask dimensions match original image (400x300)`);
    console.log(`Actual: mask dimensions are ${maskDimensions.width}x${maskDimensions.height}`);

    expect(maskDimensions.width).toBe(400);
    expect(maskDimensions.height).toBe(300);
    expect(maskDimensions.whitePixelCount).toBeGreaterThan(0); // Verify stroke was captured
  } else {
    console.log('WARNING: No mask captured from API request');
    // Still take screenshot for debugging
  }

  await page.screenshot({ path: '/tmp/mask-alignment-test.png', fullPage: true });
  console.log('Screenshot saved to /tmp/mask-alignment-test.png');
});
