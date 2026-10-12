import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60000,
  expect: {
    timeout: 15000,
  },
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:5173',
    channel: 'chrome',
    headless: true,
    screenshot: 'on',
    trace: 'on',
    video: 'off',
  },
  webServer: {
    command: 'export PATH="/Users/macos/.nvm/versions/node/v20.12.2/bin:/Users/macos/.local/bin:$PATH" && npm run dev -- --host 127.0.0.1 --port 5173',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: true,
    timeout: 30000,
  },
});
