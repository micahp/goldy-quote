import { defineConfig } from '@playwright/test';

// Pure unit specs: no browser, no dev servers, no global setup.
export default defineConfig({
  testDir: './tests/unit',
  testMatch: ['**/*.spec.ts'],
  reporter: [['list']],
});
