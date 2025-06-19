import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // Test directory
  testDir: './tests/e2e',
  
  // Run tests in files in parallel
  fullyParallel: true,
  
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  
  // Retry on CI only
  retries: process.env.CI ? 2 : 0,
  
  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter to use
  reporter: [
    ['list'],
    ['html', { outputFolder: 'test-results/html' }],
    ['junit', { outputFile: 'test-results/junit.xml' }]
  ],
  
  // Shared settings for all the projects below
  use: {
    // Base URL to use in actions like `await page.goto('/')`
    baseURL: 'http://localhost:3001',
    
    // Collect trace when retrying the failed test
    trace: 'on-first-retry',
    
    // Capture screenshot on failure
    screenshot: 'only-on-failure',
    
    // Record video on failure
    video: 'retain-on-failure',
    
    // Browser timeout
    actionTimeout: 15000,
    navigationTimeout: 60000,
  },
  
  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        channel: 'chrome', // Use system Chrome
      },
    },
    
    // Uncomment to test on other browsers
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],
  
  // Global setup and teardown
  globalSetup: './tests/setup/global-setup.ts',
  globalTeardown: './tests/setup/global-teardown.ts',
  
  // Run your local dev server before starting the tests
  webServer: {
    command: 'npm run dev',
    port: 3001,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
  
  // Test timeout
  timeout: 120000,
  
  // Expect timeout
  expect: {
    timeout: 10000,
  },
  
  // Output directory for test artifacts
  outputDir: 'test-results/artifacts',
}); 