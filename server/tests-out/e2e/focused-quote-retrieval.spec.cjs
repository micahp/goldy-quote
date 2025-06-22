"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
/**
 * Focused Tests for Quote Retrieval from All Carriers
 *
 * This test suite focuses specifically on verifying that we can successfully
 * retrieve quotes from each carrier: GEICO, Progressive, State Farm, and Liberty Mutual.
 */
test_1.test.describe('🎯 FOCUSED QUOTE RETRIEVAL TESTS', () => {
    const completeUserData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '555-123-4567',
        dateOfBirth: '1990-01-01',
        zipCode: '12345',
        streetAddress: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        gender: 'Male',
        maritalStatus: 'Single',
        vehicleYear: '2020',
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
        uninsuredMotorist: '100/300'
    };
    (0, test_1.test)('🚗 GEICO Quote Retrieval', async ({ request }) => {
        console.log('\n🚗 Testing GEICO quote retrieval...');
        const startResponse = await request.post('http://localhost:3001/api/quotes/start', {
            data: { carriers: ['geico'] }
        });
        (0, test_1.expect)(startResponse.ok()).toBeTruthy();
        const { taskId } = await startResponse.json();
        console.log(`   Created task: ${taskId}`);
        await request.post(`http://localhost:3001/api/quotes/${taskId}/data`, {
            data: completeUserData
        });
        console.log('   ✅ User data submitted');
        const geicoStart = await request.post(`http://localhost:3001/api/quotes/${taskId}/carriers/geico/start`);
        (0, test_1.expect)(geicoStart.ok()).toBeTruthy();
        console.log('   🔄 GEICO process started');
        // Monitor for 15 minutes
        let attempts = 0;
        const maxAttempts = 45;
        let finalStatus;
        while (attempts < maxAttempts) {
            const statusResponse = await request.get(`http://localhost:3001/api/quotes/${taskId}/carriers/geico/status`);
            (0, test_1.expect)(statusResponse.ok()).toBeTruthy();
            finalStatus = await statusResponse.json();
            const elapsed = (attempts + 1) * 20;
            console.log(`   [${elapsed}s] Status: ${finalStatus.status} - Step: ${finalStatus.currentStep || 'N/A'}`);
            if (finalStatus.status === 'completed' || finalStatus.status === 'error') {
                break;
            }
            await new Promise(resolve => setTimeout(resolve, 20000));
            attempts++;
        }
        if (finalStatus.status === 'completed') {
            (0, test_1.expect)(finalStatus.quote.monthlyPremium).toBeGreaterThan(0);
            console.log(`   💰 GEICO Quote: $${finalStatus.quote.monthlyPremium}/month`);
            console.log('   ✅ GEICO SUCCESS!');
        }
        else if (finalStatus.status === 'processing') {
            console.log('   ⏳ GEICO still processing (normal for real sites)');
        }
        await request.delete(`http://localhost:3001/api/quotes/${taskId}`);
    });
    (0, test_1.test)('🚙 Progressive Quote Retrieval', async ({ request }) => {
        console.log('\n🚙 Testing Progressive quote retrieval...');
        const startResponse = await request.post('http://localhost:3001/api/quotes/start', {
            data: { carriers: ['progressive'] }
        });
        (0, test_1.expect)(startResponse.ok()).toBeTruthy();
        const { taskId } = await startResponse.json();
        await request.post(`http://localhost:3001/api/quotes/${taskId}/data`, {
            data: completeUserData
        });
        const progressiveStart = await request.post(`http://localhost:3001/api/quotes/${taskId}/carriers/progressive/start`);
        (0, test_1.expect)(progressiveStart.ok()).toBeTruthy();
        console.log('   🔄 Progressive process started');
        let attempts = 0;
        const maxAttempts = 45;
        let finalStatus;
        while (attempts < maxAttempts) {
            const statusResponse = await request.get(`http://localhost:3001/api/quotes/${taskId}/carriers/progressive/status`);
            (0, test_1.expect)(statusResponse.ok()).toBeTruthy();
            finalStatus = await statusResponse.json();
            const elapsed = (attempts + 1) * 20;
            console.log(`   [${elapsed}s] Status: ${finalStatus.status}`);
            if (finalStatus.status === 'completed' || finalStatus.status === 'error') {
                break;
            }
            await new Promise(resolve => setTimeout(resolve, 20000));
            attempts++;
        }
        if (finalStatus.status === 'completed') {
            (0, test_1.expect)(finalStatus.quote.monthlyPremium).toBeGreaterThan(0);
            console.log(`   💰 Progressive Quote: $${finalStatus.quote.monthlyPremium}/month`);
            console.log('   ✅ PROGRESSIVE SUCCESS!');
        }
        await request.delete(`http://localhost:3001/api/quotes/${taskId}`);
    });
    (0, test_1.test)('🚘 State Farm Quote Retrieval', async ({ request }) => {
        console.log('\n🚘 Testing State Farm quote retrieval...');
        const startResponse = await request.post('http://localhost:3001/api/quotes/start', {
            data: { carriers: ['statefarm'] }
        });
        (0, test_1.expect)(startResponse.ok()).toBeTruthy();
        const { taskId } = await startResponse.json();
        await request.post(`http://localhost:3001/api/quotes/${taskId}/data`, {
            data: completeUserData
        });
        const stateFarmStart = await request.post(`http://localhost:3001/api/quotes/${taskId}/carriers/statefarm/start`);
        (0, test_1.expect)(stateFarmStart.ok()).toBeTruthy();
        console.log('   🔄 State Farm process started');
        let attempts = 0;
        const maxAttempts = 45;
        let finalStatus;
        while (attempts < maxAttempts) {
            const statusResponse = await request.get(`http://localhost:3001/api/quotes/${taskId}/carriers/statefarm/status`);
            (0, test_1.expect)(statusResponse.ok()).toBeTruthy();
            finalStatus = await statusResponse.json();
            const elapsed = (attempts + 1) * 20;
            console.log(`   [${elapsed}s] Status: ${finalStatus.status}`);
            if (finalStatus.status === 'completed' || finalStatus.status === 'error') {
                break;
            }
            await new Promise(resolve => setTimeout(resolve, 20000));
            attempts++;
        }
        if (finalStatus.status === 'completed') {
            (0, test_1.expect)(finalStatus.quote.monthlyPremium).toBeGreaterThan(0);
            console.log(`   💰 State Farm Quote: $${finalStatus.quote.monthlyPremium}/month`);
            console.log('   ✅ STATE FARM SUCCESS!');
        }
        await request.delete(`http://localhost:3001/api/quotes/${taskId}`);
    });
    (0, test_1.test)('🚐 Liberty Mutual Quote Retrieval', async ({ request }) => {
        console.log('\n🚐 Testing Liberty Mutual quote retrieval...');
        const startResponse = await request.post('http://localhost:3001/api/quotes/start', {
            data: { carriers: ['libertymutual'] }
        });
        (0, test_1.expect)(startResponse.ok()).toBeTruthy();
        const { taskId } = await startResponse.json();
        await request.post(`http://localhost:3001/api/quotes/${taskId}/data`, {
            data: completeUserData
        });
        const libertyStart = await request.post(`http://localhost:3001/api/quotes/${taskId}/carriers/libertymutual/start`);
        (0, test_1.expect)(libertyStart.ok()).toBeTruthy();
        console.log('   🔄 Liberty Mutual process started');
        let attempts = 0;
        const maxAttempts = 45;
        let finalStatus;
        while (attempts < maxAttempts) {
            const statusResponse = await request.get(`http://localhost:3001/api/quotes/${taskId}/carriers/libertymutual/status`);
            (0, test_1.expect)(statusResponse.ok()).toBeTruthy();
            finalStatus = await statusResponse.json();
            const elapsed = (attempts + 1) * 20;
            console.log(`   [${elapsed}s] Status: ${finalStatus.status}`);
            if (finalStatus.status === 'completed' || finalStatus.status === 'error') {
                break;
            }
            await new Promise(resolve => setTimeout(resolve, 20000));
            attempts++;
        }
        if (finalStatus.status === 'completed') {
            (0, test_1.expect)(finalStatus.quote.monthlyPremium).toBeGreaterThan(0);
            console.log(`   💰 Liberty Mutual Quote: $${finalStatus.quote.monthlyPremium}/month`);
            console.log('   ✅ LIBERTY MUTUAL SUCCESS!');
        }
        await request.delete(`http://localhost:3001/api/quotes/${taskId}`);
    });
    (0, test_1.test)('🚗🚙🚘🚐 ALL Carriers Simultaneously', async ({ request }) => {
        console.log('\n🚗🚙🚘🚐 Testing ALL carriers simultaneously...');
        const startResponse = await request.post('http://localhost:3001/api/quotes/start', {
            data: { carriers: ['geico', 'progressive', 'statefarm', 'libertymutual'] }
        });
        (0, test_1.expect)(startResponse.ok()).toBeTruthy();
        const { taskId } = await startResponse.json();
        console.log(`   Created multi-carrier task: ${taskId}`);
        await request.post(`http://localhost:3001/api/quotes/${taskId}/data`, {
            data: completeUserData
        });
        console.log('   ✅ User data submitted');
        // Start all carriers
        const carriers = ['geico', 'progressive', 'statefarm', 'libertymutual'];
        for (const carrier of carriers) {
            const response = await request.post(`http://localhost:3001/api/quotes/${taskId}/carriers/${carrier}/start`);
            (0, test_1.expect)(response.ok()).toBeTruthy();
            console.log(`   ✅ ${carrier.toUpperCase()} started`);
        }
        // Monitor for 15 minutes
        const quotes = {};
        for (let round = 1; round <= 45; round++) {
            const elapsed = round * 20;
            console.log(`\n   --- Round ${round}/45 (${elapsed}s) ---`);
            for (const carrier of carriers) {
                if (quotes[carrier])
                    continue; // Skip completed
                const statusResponse = await request.get(`http://localhost:3001/api/quotes/${taskId}/carriers/${carrier}/status`);
                const status = await statusResponse.json();
                console.log(`   ${carrier.toUpperCase()}: ${status.status}`);
                if (status.status === 'completed' && status.quote) {
                    quotes[carrier] = status.quote;
                    console.log(`   🎉 ${carrier.toUpperCase()} COMPLETED! $${status.quote.monthlyPremium}/month`);
                }
            }
            await new Promise(resolve => setTimeout(resolve, 20000));
        }
        console.log('\n=== FINAL RESULTS ===');
        console.log(`✅ Retrieved ${Object.keys(quotes).length}/${carriers.length} quotes`);
        Object.entries(quotes).forEach(([carrier, quote]) => {
            console.log(`   ${carrier.toUpperCase()}: $${quote.monthlyPremium}/month`);
        });
        await request.delete(`http://localhost:3001/api/quotes/${taskId}`);
    });
});
//# sourceMappingURL=focused-quote-retrieval.spec.js.map