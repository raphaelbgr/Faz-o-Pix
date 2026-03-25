import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  retries: 0,
  workers: 1, // Sequential to save memory, kill browser between tests
  use: {
    headless: true,
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'localhost',
      use: { browserName: 'chromium', baseURL: 'http://localhost:63293' },
    },
    {
      name: 'lan',
      use: { browserName: 'chromium', baseURL: 'http://192.168.7.13:63293' },
    },
    {
      name: 'public',
      use: { browserName: 'chromium', baseURL: 'https://pix.fastsoftware.uk' },
    },
  ],
});
