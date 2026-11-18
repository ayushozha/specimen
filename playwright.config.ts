import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 120_000,
  workers: 1,
  use: { baseURL: 'http://localhost:4321' },
  webServer: { command: 'node tests/serve.mjs', url: 'http://localhost:4321/landing.html', reuseExistingServer: true },
});
