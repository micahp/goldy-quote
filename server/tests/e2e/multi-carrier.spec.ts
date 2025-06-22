import { test, expect } from '@playwright/test';

test.describe('Multi-Carrier Quote Process', () => {
  test('should start a multi-carrier quote process and collect unified data', async ({ request }) => {
    // Start a multi-carrier quote process
    const startResponse = await request.post('/api/quotes/start', {
      data: {
        carriers: ['geico', 'progressive']
      }
    });
    
    expect(startResponse.ok()).toBeTruthy();
    const startData = await startResponse.json();
    
    expect(startData).toHaveProperty('taskId');
    expect(startData).toHaveProperty('status', 'waiting_for_input');
    expect(startData).toHaveProperty('requiredFields');
    
    const taskId = startData.taskId;
    
    // Submit user data
    const userData = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '555-123-4567',
      dateOfBirth: '1990-01-01',
      zipCode: '12345',
      streetAddress: '123 Main St',
      city: 'Anytown',
      state: 'CA',
      vehicleYear: '2020',
      vehicleMake: 'Honda',
      vehicleModel: 'Civic'
    };
    
    const dataResponse = await request.post(`/api/quotes/${taskId}/data`, {
      data: userData
    });
    
    expect(dataResponse.ok()).toBeTruthy();
    const dataResponseData = await dataResponse.json();
    expect(dataResponseData).toHaveProperty('success', true);
  });
  
  test('should start carrier-specific quote processes using cached data', async ({ request }) => {
    // Start a multi-carrier quote process
    const startResponse = await request.post('/api/quotes/start', {
      data: {
        carriers: ['geico']
      }
    });
    
    const startData = await startResponse.json();
    const taskId = startData.taskId;
    
    // Submit complete user data
    const userData = {
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane.smith@example.com',
      phone: '555-987-6543',
      dateOfBirth: '1985-05-15',
      zipCode: '90210',
      streetAddress: '456 Oak Ave',
      city: 'Beverly Hills',
      state: 'CA',
      vehicleYear: '2019',
      vehicleMake: 'Toyota',
      vehicleModel: 'Camry'
    };
    
    await request.post(`/api/quotes/${taskId}/data`, {
      data: userData
    });
    
    // Start Geico quote process using cached data
    const geicoStartResponse = await request.post(`/api/quotes/${taskId}/carriers/geico/start`);
    
    expect(geicoStartResponse.ok()).toBeTruthy();
    const geicoData = await geicoStartResponse.json();
    
    expect(geicoData).toHaveProperty('carrier', 'geico');
    expect(geicoData).toHaveProperty('taskId', taskId);
    expect(geicoData.status).toMatch(/waiting_for_input|processing|completed/);
  });
  
  test('should handle carrier status checks', async ({ request }) => {
    // Start a task
    const startResponse = await request.post('/api/quotes/start', {
      data: {
        carriers: ['progressive']
      }
    });
    
    const startData = await startResponse.json();
    const taskId = startData.taskId;
    
    // Submit data and start Progressive
    await request.post(`/api/quotes/${taskId}/data`, {
      data: {
        zipCode: '10001',
        firstName: 'Test',
        lastName: 'User'
      }
    });
    
    await request.post(`/api/quotes/${taskId}/carriers/progressive/start`);
    
    // Check status
    const statusResponse = await request.get(`/api/quotes/${taskId}/carriers/progressive/status`);
    
    expect(statusResponse.ok()).toBeTruthy();
    const statusData = await statusResponse.json();
    
    expect(statusData).toHaveProperty('carrier', 'progressive');
    expect(statusData).toHaveProperty('taskId', taskId);
    expect(statusData).toHaveProperty('status');
  });
  
  test('should clean up tasks and carriers', async ({ request }) => {
    // Start a task
    const startResponse = await request.post('/api/quotes/start', {
      data: {
        carriers: ['geico', 'progressive']
      }
    });
    
    const startData = await startResponse.json();
    const taskId = startData.taskId;
    
    // Clean up specific carrier
    const carrierCleanupResponse = await request.delete(`/api/quotes/${taskId}/carriers/geico`);
    expect(carrierCleanupResponse.ok()).toBeTruthy();
    
    // Clean up entire task
    const taskCleanupResponse = await request.delete(`/api/quotes/${taskId}`);
    expect(taskCleanupResponse.ok()).toBeTruthy();
    
    const cleanupData = await taskCleanupResponse.json();
    expect(cleanupData).toHaveProperty('success', true);
  });
  
  test('should validate user data', async ({ request }) => {
    // Start a task
    const startResponse = await request.post('/api/quotes/start', {
      data: {
        carriers: ['geico']
      }
    });
    
    const startData = await startResponse.json();
    const taskId = startData.taskId;
    
    // Submit invalid data (missing required fields)
    const invalidDataResponse = await request.post(`/api/quotes/${taskId}/data`, {
      data: {
        firstName: 'John'
        // Missing other required fields
      }
    });
    
    // Should succeed as partial data is allowed
    expect(invalidDataResponse.ok()).toBeTruthy();
    
    // Submit invalid email format
    const invalidEmailResponse = await request.post(`/api/quotes/${taskId}/data`, {
      data: {
        email: 'invalid-email'
      }
    });
    
    expect(invalidEmailResponse.status()).toBe(400);
    const errorData = await invalidEmailResponse.json();
    expect(errorData).toHaveProperty('error', 'Validation failed');
    expect(errorData).toHaveProperty('validationErrors');
  });
});

test.describe('API Health and Status', () => {
  test('should return health status', async ({ request }) => {
    const response = await request.get('/api/health');
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    expect(data).toHaveProperty('status', 'ok');
    expect(data).toHaveProperty('timestamp');
    expect(data).toHaveProperty('environment');
  });
  
  test('should return available carriers', async ({ request }) => {
    const response = await request.get('/api/carriers');
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    expect(data).toHaveProperty('carriers');
    expect(Array.isArray(data.carriers)).toBeTruthy();
    expect(data.carriers).toContain('geico');
    expect(data.carriers).toContain('progressive');
    expect(data.carriers).toContain('statefarm');
    expect(data.carriers).toContain('libertymutual');
  });
  
  test('should return browser status', async ({ request }) => {
    const response = await request.get('/api/browser/status');
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    expect(data).toHaveProperty('isInitialized');
    expect(data).toHaveProperty('activeContexts');
  });
  
  test('should return active tasks', async ({ request }) => {
    const response = await request.get('/api/tasks');
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    
    expect(data).toHaveProperty('tasks');
    expect(Array.isArray(data.tasks)).toBeTruthy();
  });
}); 