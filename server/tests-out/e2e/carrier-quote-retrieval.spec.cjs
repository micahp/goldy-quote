"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
/**
 * @file This file contains end-to-end tests for retrieving insurance quotes from various carriers.
 * It is the primary test suite for verifying the core functionality of the quote retrieval system.
 *
 * Test Strategy:
 * 1.  A single test suite `All Carrier Quote Retrieval` is defined.
 * 2.  A `test.beforeAll` hook creates a single task with all necessary data for all tests in the suite.
 *     This improves performance by avoiding repeated setup.
 * 3.  A `test.afterAll` hook cleans up the task after all tests have run.
 * 4.  Each carrier has a dedicated `test` case for individual quote retrieval verification.
 * 5.  A final `test` case runs all carriers simultaneously to test for race conditions and performance.
 * 6.  Tests use long timeouts (up to 15 minutes) to accommodate real-world carrier website performance.
 * 7.  Detailed logging is included to provide clear feedback on the status of each carrier process.
 */
test_1.test.describe('✅ All Carrier Quote Retrieval', () => {
    let taskId;
    const completeUserData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '555-123-4567',
        dateOfBirth: '1990-01-01',
        zipCode: '94105', // A valid zip for better results
        streetAddress: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        gender: 'Male',
        maritalStatus: 'Single',
        vehicleYear: '2022',
        vehicleMake: 'Honda',
        vehicleModel: 'Civic',
        annualMileage: '10,000 - 12,500',
        primaryUse: 'Commuting to work/school',
        vehicleOwnership: 'Own',
        yearsLicensed: 'More than 15 years',
        accidentsLastFiveYears: '0',
        violationsLastFiveYears: '0',
        continuousInsurance: 'Currently insured',
        liabilityCoverage: '100/300/100',
        collisionDeductible: '$500',
        comprehensiveDeductible: '$500',
        medicalPayments: '$5,000',
        uninsuredMotorist: '100/300',
    };
    // Create one task for all tests in this suite
    test_1.test.beforeAll(async ({ request }) => {
        console.log('Setting up a single task for all carrier tests...');
        const startResponse = await request.post('/api/quotes/start', {
            data: {
                carriers: ['geico', 'progressive', 'statefarm', 'libertymutual'],
            },
        });
        (0, test_1.expect)(startResponse.ok()).toBeTruthy();
        const startData = await startResponse.json();
        taskId = startData.taskId;
        console.log(`   Task created: ${taskId}`);
        const dataResponse = await request.post(`/api/quotes/${taskId}/data`, {
            data: completeUserData,
        });
        (0, test_1.expect)(dataResponse.ok()).toBeTruthy();
        console.log('   ✅ User data submitted for the task.');
    });
    // Clean up the single task after all tests are done
    test_1.test.afterAll(async ({ request }) => {
        if (taskId) {
            console.log(`\n🧹 Cleaning up task: ${taskId}`);
            await request.delete(`/api/quotes/${taskId}`);
            console.log('   ✅ Cleanup complete.');
        }
    });
    // Function to run and monitor a carrier process
    const monitorCarrier = async (carrier, request) => {
        // Start carrier process
        const startResponse = await request.post(`/api/quotes/${taskId}/carriers/${carrier}/start`);
        (0, test_1.expect)(startResponse.ok()).toBeTruthy();
        console.log(`   🔄 ${carrier.toUpperCase()} process started.`);
        // Monitor for quote with extended timeout (15 minutes)
        const maxAttempts = 45; // 15 minutes at 20-second intervals
        let finalStatus;
        for (let attempts = 0; attempts < maxAttempts; attempts++) {
            const statusResponse = await request.get(`/api/quotes/${taskId}/carriers/${carrier}/status`);
            (0, test_1.expect)(statusResponse.ok()).toBeTruthy();
            finalStatus = await statusResponse.json();
            const elapsed = (attempts + 1) * 20;
            console.log(`   [${elapsed}s] ${carrier.toUpperCase()} Status: ${finalStatus.status} - Step: ${finalStatus.currentStep || 'N/A'}`);
            if (finalStatus.status === 'completed' ||
                finalStatus.status === 'error') {
                break;
            }
            await new Promise((resolve) => setTimeout(resolve, 20000));
        }
        // Verify final results
        if (finalStatus.status === 'completed') {
            (0, test_1.expect)(finalStatus).toHaveProperty('quote');
            (0, test_1.expect)(finalStatus.quote).toHaveProperty('monthlyPremium');
            (0, test_1.expect)(typeof finalStatus.quote.monthlyPremium).toBe('number');
            (0, test_1.expect)(finalStatus.quote.monthlyPremium).toBeGreaterThan(0);
            console.log(`   💰 ${carrier.toUpperCase()} Quote: $${finalStatus.quote.monthlyPremium}/month`);
            console.log(`   ✅ ${carrier.toUpperCase()} QUOTE RETRIEVAL SUCCESSFUL!`);
        }
        else {
            console.log(`   ❌ ${carrier.toUpperCase()} FAILED or timed out. Final status: ${finalStatus.status}`);
            if (finalStatus.error) {
                console.log(`      Error: ${finalStatus.error}`);
            }
            // This assertion will fail the test if the process errored out.
            (0, test_1.expect)(finalStatus.status).not.toBe('error');
            // This will fail if it's still processing after the timeout.
            (0, test_1.expect)(finalStatus.status).toBe('completed');
        }
    };
    (0, test_1.test)('should successfully retrieve quote from GEICO', async ({ request }) => {
        console.log('\n🚗 Testing GEICO quote retrieval...');
        await monitorCarrier('geico', request);
    });
    (0, test_1.test)('should successfully retrieve quote from Progressive', async ({ request, }) => {
        console.log('\n🚙 Testing Progressive quote retrieval...');
        await monitorCarrier('progressive', request);
    });
    (0, test_1.test)('should successfully retrieve quote from State Farm', async ({ request, }) => {
        console.log('\n🚘 Testing State Farm quote retrieval...');
        await monitorCarrier('statefarm', request);
    });
    (0, test_1.test)('should successfully retrieve quote from Liberty Mutual', async ({ request, }) => {
        console.log('\n🚐 Testing Liberty Mutual quote retrieval...');
        await monitorCarrier('libertymutual', request);
    });
    (0, test_1.test)('should handle all carriers simultaneously', async ({ request }) => {
        console.log('\n🚗🚙🚘🚐 Testing ALL carriers simultaneously...');
        // The task and data are already set up in `beforeAll`.
        // We just need to start and monitor them.
        const carriers = ['geico', 'progressive', 'statefarm', 'libertymutual'];
        // Using a new task for the simultaneous run to avoid conflicts with single tests
        console.log('   Setting up a dedicated task for the simultaneous run...');
        const simStartResponse = await request.post('/api/quotes/start', {
            data: { carriers },
        });
        (0, test_1.expect)(simStartResponse.ok()).toBeTruthy();
        const { taskId: simTaskId } = await simStartResponse.json();
        console.log(`   Simultaneous task created: ${simTaskId}`);
        await request.post(`/api/quotes/${simTaskId}/data`, {
            data: completeUserData,
        });
        console.log('   ✅ User data submitted for simultaneous task.');
        // Start all carriers
        console.log('   🔄 Starting all carriers...');
        const startPromises = carriers.map(async (carrier) => {
            const response = await request.post(`/api/quotes/${simTaskId}/carriers/${carrier}/start`);
            (0, test_1.expect)(response.ok()).toBeTruthy();
            console.log(`   ✅ ${carrier.toUpperCase()} started.`);
        });
        await Promise.all(startPromises);
        // Monitor all carriers
        const maxAttempts = 45; // 15 minutes
        const quotes = {};
        const errors = {};
        for (let i = 0; i < maxAttempts; i++) {
            const allDone = carriers.every((c) => quotes[c] || errors[c]);
            if (allDone) {
                console.log('\n   🏁 All carriers have finished.');
                break;
            }
            console.log(`\n--- Monitoring Round ${i + 1}/${maxAttempts} ---`);
            for (const carrier of carriers) {
                if (quotes[carrier] || errors[carrier])
                    continue;
                const statusResponse = await request.get(`/api/quotes/${simTaskId}/carriers/${carrier}/status`);
                const status = await statusResponse.json();
                console.log(`   ${carrier.toUpperCase()}: ${status.status}`);
                if (status.status === 'completed' && status.quote) {
                    quotes[carrier] = status.quote;
                    console.log(`   🎉 ${carrier.toUpperCase()} COMPLETED! Quote: $${status.quote.monthlyPremium}/month`);
                }
                else if (status.status === 'error') {
                    errors[carrier] = status;
                    console.log(`   ❌ ${carrier.toUpperCase()} ERROR: ${status.error}`);
                }
            }
            await new Promise((resolve) => setTimeout(resolve, 20000));
        }
        // Final validation
        console.log('\n--- FINAL RESULTS ---');
        for (const carrier of carriers) {
            if (quotes[carrier]) {
                console.log(`✅ ${carrier.toUpperCase()}: Success ($${quotes[carrier].monthlyPremium}/month)`);
            }
            else if (errors[carrier]) {
                console.error(`❌ ${carrier.toUpperCase()}: Failed (${errors[carrier].error})`);
            }
            else {
                console.warn(`⏳ ${carrier.toUpperCase()}: Timed out (still processing)`);
            }
        }
        // Fail the test if any carrier errored
        (0, test_1.expect)(Object.keys(errors).length).toBe(0);
        // Fail the test if not all carriers completed
        (0, test_1.expect)(Object.keys(quotes).length).toBe(carriers.length);
        await request.delete(`/api/quotes/${simTaskId}`);
        console.log(`   ✅ Simultaneous task ${simTaskId} cleaned up.`);
    });
});
//# sourceMappingURL=carrier-quote-retrieval.spec.js.map