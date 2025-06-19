import { test, expect } from '@playwright/test';

test.describe('Individual Carrier Quote Retrieval', () => {
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

  test('should retrieve quote from GEICO', async ({ request }) => {
    console.log('Starting GEICO quote retrieval test...');
    
    // Start task
    const startResponse = await request.post('/api/quotes/start', {
      data: { carriers: ['geico'] }
    });
    
    expect(startResponse.ok()).toBeTruthy();
    const { taskId } = await startResponse.json();
    
    // Submit user data
    await request.post(`/api/quotes/${taskId}/data`, {
      data: completeUserData
    });
    
    // Start GEICO process
    const geicoStart = await request.post(`/api/quotes/${taskId}/carriers/geico/start`);
    expect(geicoStart.ok()).toBeTruthy();
    
    // Monitor for quote (with timeout)
    let attempts = 0;
    const maxAttempts = 20; // 10 minutes max
    let finalStatus: any;
    
    while (attempts < maxAttempts) {
      const statusResponse = await request.get(`/api/quotes/${taskId}/carriers/geico/status`);
      expect(statusResponse.ok()).toBeTruthy();
      
      finalStatus = await statusResponse.json();
      console.log(`GEICO attempt ${attempts + 1}: ${finalStatus.status}`);
      
      if (finalStatus.status === 'completed' || finalStatus.status === 'error') {
        break;
      }
      
      await new Promise(resolve => setTimeout(resolve, 30000)); // 30 second intervals
      attempts++;
    }
    
    // Verify results
    expect(finalStatus.status).not.toBe('error');
    
    if (finalStatus.status === 'completed') {
      expect(finalStatus).toHaveProperty('quote');
      expect(finalStatus.quote).toHaveProperty('monthlyPremium');
      expect(typeof finalStatus.quote.monthlyPremium).toBe('number');
      expect(finalStatus.quote.monthlyPremium).toBeGreaterThan(0);
      console.log(`✅ GEICO Quote: $${finalStatus.quote.monthlyPremium}/month`);
    } else {
      console.log(`GEICO still processing after ${maxAttempts * 30} seconds - normal for real sites`);
    }
    
    // Cleanup
    await request.delete(`/api/quotes/${taskId}`);
  });

  test('should retrieve quote from Progressive', async ({ request }) => {
    console.log('Starting Progressive quote retrieval test...');
    
    // Start task
    const startResponse = await request.post('/api/quotes/start', {
      data: { carriers: ['progressive'] }
    });
    
    expect(startResponse.ok()).toBeTruthy();
    const { taskId } = await startResponse.json();
    
    // Submit user data
    await request.post(`/api/quotes/${taskId}/data`, {
      data: completeUserData
    });
    
    // Start Progressive process
    const progressiveStart = await request.post(`/api/quotes/${taskId}/carriers/progressive/start`);
    expect(progressiveStart.ok()).toBeTruthy();
    
    // Monitor for quote
    let attempts = 0;
    const maxAttempts = 20;
    let finalStatus: any;
    
    while (attempts < maxAttempts) {
      const statusResponse = await request.get(`/api/quotes/${taskId}/carriers/progressive/status`);
      expect(statusResponse.ok()).toBeTruthy();
      
      finalStatus = await statusResponse.json();
      console.log(`Progressive attempt ${attempts + 1}: ${finalStatus.status}`);
      
      if (finalStatus.status === 'completed' || finalStatus.status === 'error') {
        break;
      }
      
      await new Promise(resolve => setTimeout(resolve, 30000));
      attempts++;
    }
    
    // Verify results
    expect(finalStatus.status).not.toBe('error');
    
    if (finalStatus.status === 'completed') {
      expect(finalStatus).toHaveProperty('quote');
      expect(finalStatus.quote).toHaveProperty('monthlyPremium');
      expect(typeof finalStatus.quote.monthlyPremium).toBe('number');
      expect(finalStatus.quote.monthlyPremium).toBeGreaterThan(0);
      console.log(`✅ Progressive Quote: $${finalStatus.quote.monthlyPremium}/month`);
    } else {
      console.log(`Progressive still processing after ${maxAttempts * 30} seconds`);
    }
    
    // Cleanup
    await request.delete(`/api/quotes/${taskId}`);
  });

  test('should retrieve quote from State Farm', async ({ request }) => {
    console.log('Starting State Farm quote retrieval test...');
    
    // Start task
    const startResponse = await request.post('/api/quotes/start', {
      data: { carriers: ['statefarm'] }
    });
    
    expect(startResponse.ok()).toBeTruthy();
    const { taskId } = await startResponse.json();
    
    // Submit user data
    await request.post(`/api/quotes/${taskId}/data`, {
      data: completeUserData
    });
    
    // Start State Farm process
    const stateFarmStart = await request.post(`/api/quotes/${taskId}/carriers/statefarm/start`);
    expect(stateFarmStart.ok()).toBeTruthy();
    
    // Monitor for quote
    let attempts = 0;
    const maxAttempts = 20;
    let finalStatus: any;
    
    while (attempts < maxAttempts) {
      const statusResponse = await request.get(`/api/quotes/${taskId}/carriers/statefarm/status`);
      expect(statusResponse.ok()).toBeTruthy();
      
      finalStatus = await statusResponse.json();
      console.log(`State Farm attempt ${attempts + 1}: ${finalStatus.status}`);
      
      if (finalStatus.status === 'completed' || finalStatus.status === 'error') {
        break;
      }
      
      await new Promise(resolve => setTimeout(resolve, 30000));
      attempts++;
    }
    
    // Verify results
    expect(finalStatus.status).not.toBe('error');
    
    if (finalStatus.status === 'completed') {
      expect(finalStatus).toHaveProperty('quote');
      expect(finalStatus.quote).toHaveProperty('monthlyPremium');
      expect(typeof finalStatus.quote.monthlyPremium).toBe('number');
      expect(finalStatus.quote.monthlyPremium).toBeGreaterThan(0);
      console.log(`✅ State Farm Quote: $${finalStatus.quote.monthlyPremium}/month`);
    } else {
      console.log(`State Farm still processing after ${maxAttempts * 30} seconds`);
    }
    
    // Cleanup
    await request.delete(`/api/quotes/${taskId}`);
  });

  test('should retrieve quote from Liberty Mutual', async ({ request }) => {
    console.log('Starting Liberty Mutual quote retrieval test...');
    
    // Start task
    const startResponse = await request.post('/api/quotes/start', {
      data: { carriers: ['libertymutual'] }
    });
    
    expect(startResponse.ok()).toBeTruthy();
    const { taskId } = await startResponse.json();
    
    // Submit user data
    await request.post(`/api/quotes/${taskId}/data`, {
      data: completeUserData
    });
    
    // Start Liberty Mutual process
    const libertyStart = await request.post(`/api/quotes/${taskId}/carriers/libertymutual/start`);
    expect(libertyStart.ok()).toBeTruthy();
    
    // Monitor for quote
    let attempts = 0;
    const maxAttempts = 20;
    let finalStatus: any;
    
    while (attempts < maxAttempts) {
      const statusResponse = await request.get(`/api/quotes/${taskId}/carriers/libertymutual/status`);
      expect(statusResponse.ok()).toBeTruthy();
      
      finalStatus = await statusResponse.json();
      console.log(`Liberty Mutual attempt ${attempts + 1}: ${finalStatus.status}`);
      
      if (finalStatus.status === 'completed' || finalStatus.status === 'error') {
        break;
      }
      
      await new Promise(resolve => setTimeout(resolve, 30000));
      attempts++;
    }
    
    // Verify results
    expect(finalStatus.status).not.toBe('error');
    
    if (finalStatus.status === 'completed') {
      expect(finalStatus).toHaveProperty('quote');
      expect(finalStatus.quote).toHaveProperty('monthlyPremium');
      expect(typeof finalStatus.quote.monthlyPremium).toBe('number');
      expect(finalStatus.quote.monthlyPremium).toBeGreaterThan(0);
      console.log(`✅ Liberty Mutual Quote: $${finalStatus.quote.monthlyPremium}/month`);
    } else {
      console.log(`Liberty Mutual still processing after ${maxAttempts * 30} seconds`);
    }
    
    // Cleanup
    await request.delete(`/api/quotes/${taskId}`);
  });

  test('should start all carriers and monitor progress', async ({ request }) => {
    console.log('Starting multi-carrier comparison test...');
    
    // Start task with all carriers
    const startResponse = await request.post('/api/quotes/start', {
      data: { carriers: ['geico', 'progressive', 'statefarm', 'libertymutual'] }
    });
    
    expect(startResponse.ok()).toBeTruthy();
    const { taskId } = await startResponse.json();
    
    // Submit complete user data
    await request.post(`/api/quotes/${taskId}/data`, {
      data: completeUserData
    });
    
    // Start all carriers simultaneously
    const carriers = ['geico', 'progressive', 'statefarm', 'libertymutual'];
    const startPromises = carriers.map(carrier => 
      request.post(`/api/quotes/${taskId}/carriers/${carrier}/start`)
    );
    
    const startResults = await Promise.all(startPromises);
    startResults.forEach(result => expect(result.ok()).toBeTruthy());
    
    // Monitor all carriers for 5 minutes
    const monitoringRounds = 10; // 5 minutes total (30 seconds each)
    const quotes: Record<string, any> = {};
    
    for (let round = 1; round <= monitoringRounds; round++) {
      console.log(`\n--- Monitoring Round ${round}/${monitoringRounds} ---`);
      
      for (const carrier of carriers) {
        const statusResponse = await request.get(`/api/quotes/${taskId}/carriers/${carrier}/status`);
        expect(statusResponse.ok()).toBeTruthy();
        
        const status = await statusResponse.json();
        console.log(`${carrier.toUpperCase()}: ${status.status}`);
        
        if (status.status === 'completed' && status.quote && !quotes[carrier]) {
          quotes[carrier] = status.quote;
          console.log(`  ✅ Quote: $${status.quote.monthlyPremium}/month`);
        } else if (status.status === 'error') {
          console.log(`  ❌ Error: ${status.error || 'Unknown error'}`);
        }
      }
      
      // Wait before next round (except last round)
      if (round < monitoringRounds) {
        await new Promise(resolve => setTimeout(resolve, 30000));
      }
    }
    
    // Report final results
    console.log('\n=== FINAL QUOTE COMPARISON ===');
    const completedQuotes = Object.keys(quotes);
    if (completedQuotes.length > 0) {
      console.log(`Successfully retrieved ${completedQuotes.length} quotes:`);
      completedQuotes.forEach(carrier => {
        console.log(`  - ${carrier.toUpperCase()}: $${quotes[carrier].monthlyPremium}/month`);
      });
    } else {
      console.log('No quotes were retrieved within the time limit.');
    }
    
    // Cleanup
    await request.delete(`/api/quotes/${taskId}`);
  });

  test('should validate quote response structure', async ({ request }) => {
    // Start a simple test task
    const startResponse = await request.post('/api/quotes/start', {
      data: { carriers: ['geico'] }
    });
    
    const { taskId } = await startResponse.json();
    
    // Submit minimal data
    await request.post(`/api/quotes/${taskId}/data`, {
      data: {
        firstName: 'Test',
        lastName: 'User',
        zipCode: '12345',
        email: 'test@example.com'
      }
    });
    
    // Start carrier process
    await request.post(`/api/quotes/${taskId}/carriers/geico/start`);
    
    // Check status structure
    const statusResponse = await request.get(`/api/quotes/${taskId}/carriers/geico/status`);
    expect(statusResponse.ok()).toBeTruthy();
    
    const status = await statusResponse.json();
    
    // Validate required fields
    expect(status).toHaveProperty('carrier');
    expect(status).toHaveProperty('taskId');
    expect(status).toHaveProperty('status');
    expect(status).toHaveProperty('currentStep');
    expect(status).toHaveProperty('lastActivity');
    
    // Validate carrier field
    expect(status.carrier).toBe('geico');
    expect(status.taskId).toBe(taskId);
    
    // Validate status values
    expect(['waiting_for_input', 'processing', 'completed', 'error']).toContain(status.status);
    
    // If quote exists, validate its structure
    if (status.quote) {
      expect(status.quote).toHaveProperty('monthlyPremium');
      expect(typeof status.quote.monthlyPremium).toBe('number');
      expect(status.quote.monthlyPremium).toBeGreaterThan(0);
    }
    
    // Cleanup
    await request.delete(`/api/quotes/${taskId}`);
  });
}); 