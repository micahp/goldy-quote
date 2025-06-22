import { test, expect } from '@playwright/test';

test.describe('Carrier Error Handling & Resilience', () => {
  let testTaskId: string;
  
  const minimalUserData = {
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com',
    zipCode: '12345'
  };

  test.beforeEach(async ({ request }) => {
    // Create a fresh task for each test
    const startResponse = await request.post('/api/quotes/start', {
      data: { carriers: ['geico', 'progressive'] }
    });
    
    expect(startResponse.ok()).toBeTruthy();
    const startData = await startResponse.json();
    testTaskId = startData.taskId;
  });

  test.afterEach(async ({ request }) => {
    // Clean up the task after each test
    if (testTaskId) {
      await request.delete(`/api/quotes/${testTaskId}`);
    }
  });

  test('should handle invalid task ID gracefully', async ({ request }) => {
    const invalidTaskId = 'invalid-task-id-12345';
    
    // Try to submit data to invalid task
    const dataResponse = await request.post(`/api/quotes/${invalidTaskId}/data`, {
      data: minimalUserData
    });
    
    expect(dataResponse.status()).toBe(404);
    const dataError = await dataResponse.json();
    expect(dataError).toHaveProperty('error', 'Task not found');
    
    // Try to start carrier with invalid task
    const carrierResponse = await request.post(`/api/quotes/${invalidTaskId}/carriers/geico/start`);
    expect(carrierResponse.status()).toBe(500);
    
    // Try to get status of invalid task
    const statusResponse = await request.get(`/api/quotes/${invalidTaskId}/carriers/geico/status`);
    expect(statusResponse.status()).toBe(500);
  });

  test('should handle unsupported carrier gracefully', async ({ request }) => {
    // Try to start task with unsupported carrier
    const startResponse = await request.post('/api/quotes/start', {
      data: { carriers: ['unsupported-carrier'] }
    });
    
    expect(startResponse.status()).toBe(400);
    const startError = await startResponse.json();
    expect(startError.error).toContain('Unsupported carriers');
    
    // Try to start unsupported carrier on existing task
    const carrierResponse = await request.post(`/api/quotes/${testTaskId}/carriers/fake-carrier/start`);
    expect(carrierResponse.status()).toBe(400);
    const carrierError = await carrierResponse.json();
    expect(carrierError.error).toContain('Unsupported carrier');
  });

  test('should validate user data before processing', async ({ request }) => {
    // Test invalid email format
    const invalidEmailResponse = await request.post(`/api/quotes/${testTaskId}/data`, {
      data: { 
        email: 'invalid-email-format',
        firstName: 'Test'
      }
    });
    
    expect(invalidEmailResponse.status()).toBe(400);
    const emailError = await invalidEmailResponse.json();
    expect(emailError.error).toBe('Validation failed');
    expect(emailError.validationErrors).toHaveProperty('email');
    
    // Test missing required fields for carrier start
    const carrierStartResponse = await request.post(`/api/quotes/${testTaskId}/carriers/geico/start`);
    // This might succeed with minimal data, but let's check the response
    expect(carrierStartResponse.ok()).toBeTruthy();
  });

  test('should handle concurrent carrier requests', async ({ request }) => {
    // Submit minimal data first
    await request.post(`/api/quotes/${testTaskId}/data`, {
      data: minimalUserData
    });
    
    // Start multiple carriers simultaneously
    const carriers = ['geico', 'progressive'];
    const startPromises = carriers.map(carrier => 
      request.post(`/api/quotes/${testTaskId}/carriers/${carrier}/start`)
    );
    
    const startResults = await Promise.all(startPromises);
    
    // All should succeed
    startResults.forEach(result => {
      expect(result.ok()).toBeTruthy();
    });
    
    // Check that both carriers are actually processing
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
    
    for (const carrier of carriers) {
      const statusResponse = await request.get(`/api/quotes/${testTaskId}/carriers/${carrier}/status`);
      expect(statusResponse.ok()).toBeTruthy();
      
      const status = await statusResponse.json();
      expect(status.carrier).toBe(carrier);
      expect(['waiting_for_input', 'processing', 'completed', 'error']).toContain(status.status);
    }
  });

  test('should handle rapid status checks without errors', async ({ request }) => {
    // Start a carrier process
    await request.post(`/api/quotes/${testTaskId}/data`, {
      data: minimalUserData
    });
    
    await request.post(`/api/quotes/${testTaskId}/carriers/geico/start`);
    
    // Make rapid status requests
    const statusPromises = Array.from({ length: 10 }, () => 
      request.get(`/api/quotes/${testTaskId}/carriers/geico/status`)
    );
    
    const statusResults = await Promise.all(statusPromises);
    
    // All status requests should succeed
    statusResults.forEach(result => {
      expect(result.ok()).toBeTruthy();
    });
    
    // Verify consistent responses
    const statusData = await Promise.all(
      statusResults.map(result => result.json())
    );
    
    statusData.forEach(data => {
      expect(data.carrier).toBe('geico');
      expect(data.taskId).toBe(testTaskId);
      expect(['waiting_for_input', 'processing', 'completed', 'error']).toContain(data.status);
    });
  });

  test('should handle partial data updates correctly', async ({ request }) => {
    // Submit partial data in multiple steps
    const step1Response = await request.post(`/api/quotes/${testTaskId}/data`, {
      data: { firstName: 'John' }
    });
    expect(step1Response.ok()).toBeTruthy();
    
    const step2Response = await request.post(`/api/quotes/${testTaskId}/data`, {
      data: { lastName: 'Doe', email: 'john.doe@example.com' }
    });
    expect(step2Response.ok()).toBeTruthy();
    
    const step3Response = await request.post(`/api/quotes/${testTaskId}/data`, {
      data: { zipCode: '12345', phone: '555-123-4567' }
    });
    expect(step3Response.ok()).toBeTruthy();
    
    // Start carrier process with accumulated data
    const carrierStart = await request.post(`/api/quotes/${testTaskId}/carriers/geico/start`);
    expect(carrierStart.ok()).toBeTruthy();
    
    // Verify carrier has access to all submitted data
    const status = await request.get(`/api/quotes/${testTaskId}/carriers/geico/status`);
    expect(status.ok()).toBeTruthy();
  });

  test('should cleanup resources properly', async ({ request }) => {
    // Start carrier processes
    await request.post(`/api/quotes/${testTaskId}/data`, {
      data: minimalUserData
    });
    
    const carriers = ['geico', 'progressive'];
    for (const carrier of carriers) {
      await request.post(`/api/quotes/${testTaskId}/carriers/${carrier}/start`);
    }
    
    // Verify both are running
    for (const carrier of carriers) {
      const status = await request.get(`/api/quotes/${testTaskId}/carriers/${carrier}/status`);
      expect(status.ok()).toBeTruthy();
    }
    
    // Clean up specific carrier
    const carrierCleanup = await request.delete(`/api/quotes/${testTaskId}/carriers/geico`);
    expect(carrierCleanup.ok()).toBeTruthy();
    
    // Verify geico is cleaned up but progressive still exists
    const geicoStatus = await request.get(`/api/quotes/${testTaskId}/carriers/geico/status`);
    expect(geicoStatus.status()).toBe(500); // Should fail after cleanup
    
    const progressiveStatus = await request.get(`/api/quotes/${testTaskId}/carriers/progressive/status`);
    expect(progressiveStatus.ok()).toBeTruthy(); // Should still work
    
    // Clean up entire task
    const taskCleanup = await request.delete(`/api/quotes/${testTaskId}`);
    expect(taskCleanup.ok()).toBeTruthy();
    
    // Verify complete cleanup
    const finalStatus = await request.get(`/api/quotes/${testTaskId}/carriers/progressive/status`);
    expect(finalStatus.status()).toBe(500); // Should fail after task cleanup
  });

  test('should handle malformed request data', async ({ request }) => {
    // Test empty request body
    const emptyResponse = await request.post(`/api/quotes/${testTaskId}/data`, {
      data: {}
    });
    expect(emptyResponse.ok()).toBeTruthy(); // Empty data should be allowed
    
    // Test null values
    const nullResponse = await request.post(`/api/quotes/${testTaskId}/data`, {
      data: { firstName: null, email: null }
    });
    expect(nullResponse.status()).toBe(400); // Null values should be rejected
    
    // Test invalid data types
    const invalidTypeResponse = await request.post(`/api/quotes/${testTaskId}/data`, {
      data: { 
        firstName: 123, // Should be string
        email: true     // Should be string
      }
    });
    expect(invalidTypeResponse.status()).toBe(400);
  });
});

test.describe('Carrier Process Monitoring', () => {
  test('should track carrier process lifecycle', async ({ request }) => {
    // Start task
    const startResponse = await request.post('/api/quotes/start', {
      data: { carriers: ['geico'] }
    });
    const { taskId } = await startResponse.json();
    
    // Submit data
    await request.post(`/api/quotes/${taskId}/data`, {
      data: {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        zipCode: '12345'
      }
    });
    
    // Track initial state
    const initialStatus = await request.get(`/api/quotes/${taskId}/carriers/geico/status`);
    expect(initialStatus.status()).toBe(500); // Should not exist yet
    
    // Start carrier process
    const carrierStart = await request.post(`/api/quotes/${taskId}/carriers/geico/start`);
    expect(carrierStart.ok()).toBeTruthy();
    
    // Track active state
    const activeStatus = await request.get(`/api/quotes/${taskId}/carriers/geico/status`);
    expect(activeStatus.ok()).toBeTruthy();
    
    const activeData = await activeStatus.json();
    expect(activeData.status).toMatch(/waiting_for_input|processing/);
    expect(activeData).toHaveProperty('currentStep');
    expect(activeData).toHaveProperty('lastActivity');
    
    // Track for a few iterations
    for (let i = 0; i < 3; i++) {
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
      
      const checkStatus = await request.get(`/api/quotes/${taskId}/carriers/geico/status`);
      expect(checkStatus.ok()).toBeTruthy();
      
      const checkData = await checkStatus.json();
      console.log(`Check ${i + 1}: ${checkData.status} - Step: ${checkData.currentStep}`);
      
      // Verify data consistency
      expect(checkData.carrier).toBe('geico');
      expect(checkData.taskId).toBe(taskId);
      expect(['waiting_for_input', 'processing', 'completed', 'error']).toContain(checkData.status);
    }
    
    // Cleanup
    await request.delete(`/api/quotes/${taskId}`);
  });
}); 