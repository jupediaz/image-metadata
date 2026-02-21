import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 60000,
  use: {
    baseURL: 'http://localhost:6605',
    headless: true,
    viewport: { width: 1280, height: 900 },
  },
});
