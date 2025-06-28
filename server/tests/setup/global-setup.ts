import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('Starting global test setup...');
  
  // Create a browser instance for setup
  const browser = await chromium.launch({
    channel: 'chrome',
  });
  
  // Perform any global setup tasks here
  console.log('Browser launched for setup');
  
  // Close the setup browser
  await browser.close();
  
  console.log('Global test setup completed');
}

export default globalSetup; 