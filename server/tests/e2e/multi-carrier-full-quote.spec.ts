import { test, expect } from '@playwright/test';

// End-to-end: auto-complete the forms for ALL carriers at the same time and
// require every one of them to reach a quote. This is the scenario that kept
// breaking (one carrier stalling, or a step racing the auto-advance, took the
// others down with it), so it asserts per-carrier outcomes rather than
// stopping at the first failure.
//
// Narrow with CARRIERS=geico,progressive (or CARRIER=statefarm) while debugging.

const ALL_CARRIERS = ['geico', 'progressive', 'statefarm', 'libertymutual'];
const carriers = (process.env.CARRIER || process.env.CARRIERS || ALL_CARRIERS.join(','))
  .toLowerCase()
  .split(',')
  .map((c) => c.trim())
  .filter(Boolean);

// Liberty Mutual does not write auto in CA, so use MN like the step-2 smoke spec.
const profile = {
  firstName: 'Test',
  lastName: 'Driver',
  dateOfBirth: '1988-04-12',
  email: 'test.driver@example.com',
  phone: '6125550142',
  streetAddress: '123 Main St',
  city: 'Saint Paul',
  state: 'MN',
  zipCode: '55330',
  housingType: 'own',
  vehicleYear: '2019',
  vehicleMake: 'Honda',
  vehicleModel: 'Civic',
  ownership: 'owned',
  primaryUse: 'commute',
  annualMileage: '10000',
  gender: 'male',
  maritalStatus: 'single',
  education: 'bachelors',
  employmentStatus: 'employed',
  accidents: 'none',
  violations: 'none',
  continuousCoverage: 'yes',
  liabilityLimit: '100/300',
};

const TERMINAL = new Set(['completed', 'error']);
// A carrier that has not touched its task for this long is stuck, not working.
const STALL_MS = 3 * 60_000;

test.describe('Full flow ▸ all carriers reach a quote concurrently', () => {
  test.setTimeout(10 * 60_000);

  test('every carrier completes with a quote', async ({ request }) => {
    const startRes = await request.post('/api/quotes/start', {
      data: { carriers, zipCode: profile.zipCode, insuranceType: 'auto' },
    });
    expect(startRes.ok()).toBeTruthy();
    const { taskId } = await startRes.json();
    expect(taskId).toBeTruthy();

    // Wait for every carrier to leave "initializing" (they boot concurrently).
    for (const carrier of carriers) {
      await expect
        .poll(
          async () => {
            const res = await request.get(`/api/quotes/${taskId}_${carrier}/carriers/${carrier}/status`);
            return res.ok() ? (await res.json()).status : 'unknown';
          },
          { message: `${carrier} should reach its first input step`, timeout: 90_000, intervals: [2_000] },
        )
        .not.toMatch(/^(initializing|unknown)$/);
    }

    // Submit the whole profile once; the server fans it out to every carrier.
    const dataRes = await request.post(`/api/quotes/${taskId}/data`, { data: profile });
    expect(dataRes.ok(), await dataRes.text()).toBeTruthy();
    expect((await dataRes.json()).carriersProcessing).toBe(carriers.length);

    // Poll all carriers together until each is terminal.
    const results: Record<string, { status: string; error?: string }> = {};
    await expect
      .poll(
        async () => {
          for (const carrier of carriers) {
            const res = await request.get(`/api/quotes/${taskId}_${carrier}/carriers/${carrier}/status`);
            if (res.ok()) results[carrier] = await res.json();
            const r = results[carrier] as any;
            if (r && !TERMINAL.has(r.status) && r.lastActivity && Date.now() - Date.parse(r.lastActivity) > STALL_MS) {
              results[carrier] = { status: 'error', error: `stalled at step ${r.currentStep} (${r.currentStepLabel ?? 'unknown'}), no activity for ${STALL_MS / 1000}s` };
            }
          }
          return carriers.every((c) => TERMINAL.has(results[c]?.status));
        },
        { message: 'all carriers should finish', timeout: 8 * 60_000, intervals: [5_000] },
      )
      .toBeTruthy();

    // Report every carrier, not just the first failure.
    const failures = carriers.filter((c) => results[c]?.status !== 'completed');
    expect(
      failures,
      `Carriers that did not reach a quote: ${failures.map((c) => `${c}=${results[c]?.status}(${results[c]?.error ?? ''})`).join(', ')}`,
    ).toEqual([]);
  });
});
