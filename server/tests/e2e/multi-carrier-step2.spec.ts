import { test, expect } from '@playwright/test';
import { browserManager } from '../../src/browser/BrowserManager.js';

// List of carriers we want to verify (focusing on problematic ones)
const CARRIERS = ['geico'] as const; // 'progressive', 'libertymutual', 'statefarm'

// Basic input for the first step (ZIP code + insurance type)
const ZIP_CODE = '90210'; // Beverly Hills, CA - widely supported by most carriers including Progressive
const INSURANCE_TYPE = 'auto';

// Carrier-specific selectors for step 2 validation
const CARRIER_STEP2_SELECTORS = {
  geico: {
    // Geico lands on date of birth step after ZIP entry
    primary: 'input[name*="birth" i], input[placeholder*="birth" i], input[id*="birth" i], input[name*="dob" i], input[placeholder*="dob" i], input[id*="dob" i]',
    description: 'date of birth field'
  },
  progressive: {
    // Progressive lands on application start page with form elements
    primary: 'input[name*="first" i], input[placeholder*="first" i], input[id*="first" i], form input[type="text"], form input[type="email"]',
    description: 'form input field'
  },
  libertymutual: {
    primary: 'input[placeholder*="first" i], input[name*="first" i], input[id*="first" i]',
    description: 'first name field'
  },
  statefarm: {
    primary: 'input[placeholder*="first" i], input[name*="first" i], input[id*="first" i]',
    description: 'first name field'
  }
} as const;

// Utility to pause execution (Playwright has waitForTimeout but Node timeout is clearer)
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

test.describe('Smoke ▸ Multi-carrier step 2 reachability', () => {
  test('all carriers reach personal-info page', async ({ request }) => {
    // 1️⃣ Kick off a multi-carrier quote task via the public API
    const response = await request.post('/api/quotes/start', {
      data: {
        carriers: [...CARRIERS],
        zipCode: ZIP_CODE,
        insuranceType: INSURANCE_TYPE,
        debug: true,
      },
    });

    expect(response.ok()).toBeTruthy();
    const { taskId } = await response.json();
    expect(taskId, 'Task ID should be returned').toBeTruthy();

    // 2️⃣ Allow the carrier agents up to 60 s to auto-navigate to step 2
    await sleep(60_000);

    // 3️⃣ For each carrier, grab its dedicated page from BrowserManager and check carrier-specific inputs
    for (const carrier of CARRIERS) {
      const contextId = `${taskId}_${carrier}`;
      const { page } = await browserManager.getBrowserContext(contextId);
      
      const selector = CARRIER_STEP2_SELECTORS[carrier];
      
      // Soft-assert visibility with carrier-specific expectations
      await expect(
        page.locator(selector.primary), 
        `${carrier}: ${selector.description} visible`
      ).toBeVisible({ timeout: 10_000 });
    }
  });
}); 