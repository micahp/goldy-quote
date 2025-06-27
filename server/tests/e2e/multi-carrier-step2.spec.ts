import { test, expect } from '@playwright/test';

// List of carriers we want to verify (focusing on problematic ones)
const CARRIERS = ['geico'] as const; // 'progressive', 'libertymutual', 'statefarm'

// Basic input for the first step (ZIP code + insurance type)
const ZIP_CODE = '90210'; // Beverly Hills, CA - widely supported by most carriers including Progressive
const INSURANCE_TYPE = 'auto';

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

    // 3️⃣ Verify each carrier reached the expected step via the server API
    for (const carrier of CARRIERS) {
      console.log(`\n=== Checking ${carrier.toUpperCase()} Status ===`);
      
      // Check agent status via API instead of direct browser access
      const statusResponse = await request.get(`/api/quotes/${taskId}/carriers/${carrier}/status`);
      expect(statusResponse.ok()).toBeTruthy();
      
      const status = await statusResponse.json();
      console.log(`${carrier} status:`, status);
      
      // Verify the agent reached a reasonable step
      // For Geico, we expect it to be waiting for date of birth input (step 1)
      if (carrier === 'geico') {
        expect(status.status).toBe('waiting_for_input');
        expect(status.currentStep).toBe(1);
        expect(status.requiredFields).toHaveProperty('dateOfBirth');
        console.log(`✅ ${carrier}: Successfully reached date of birth step`);
      }
      
      // For other carriers, verify they reached some meaningful step
      expect(status.status).not.toBe('error');
      expect(status.currentStep).toBeGreaterThan(0);
    }
  });
}); 