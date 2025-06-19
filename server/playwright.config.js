const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  // Test directory - compiled tests output
  testDir: './tests-out/e2e',
  
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
        channel: 'chrome', // Use system Google Chrome
      },
    },
  ],
  
  // Global setup and teardown - compiled versions
  globalSetup: './tests-out/setup/global-setup.cjs',
  globalTeardown: './tests-out/setup/global-teardown.cjs',
  
  // Run your local dev server before starting the tests
  webServer: {
    command: 'pnpm run dev',
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