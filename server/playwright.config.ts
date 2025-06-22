// @ts-nocheck
import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

// @ts-nocheck

// Resolve __dirname in ESM
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  // Look for .spec.ts files in the unreleased source (no pre-compilation needed)
  testDir: './tests/e2e',
  testMatch: ['**/*.spec.ts'],

  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  reporter: [
    ['list'],
    ['html', { outputFolder: 'test-results/html' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
  ],

  use: {
    baseURL: 'http://localhost:3001',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 60_000,
    ...devices['Desktop Chrome'],
    executablePath: '/Users/micah/Downloads/chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
    // headless: false, // (optional, for debugging)
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],

  // Reference the TypeScript global setup/teardown files directly
  globalSetup: './tests/setup/global-setup.ts',
  globalTeardown: './tests/setup/global-teardown.ts',

  /* @ts-ignore -- Playwright supports array of web servers although TS types lag behind */
  /* multiple servers */
  webServer: [
    {
      command: 'npm run dev',
      port: 3001,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      stdout: 'pipe',
    },
    {
      command: 'npm run dev -- --host localhost',
      cwd: path.resolve(__dirname, '..'), // project root
      port: 5173,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      stdout: 'pipe',
    },
  ],

  timeout: 120_000,
  expect: { timeout: 10_000 },
  outputDir: 'test-results/artifacts',
}); 