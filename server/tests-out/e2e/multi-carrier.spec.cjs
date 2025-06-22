"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
test_1.test.describe('Multi-Carrier Quote Process', () => {
    (0, test_1.test)('should start a multi-carrier quote process and collect unified data', async ({ request }) => {
        // Start a multi-carrier quote process
        const startResponse = await request.post('/api/quotes/start', {
            data: {
                carriers: ['geico', 'progressive']
            }
        });
        (0, test_1.expect)(startResponse.ok()).toBeTruthy();
        const startData = await startResponse.json();
        (0, test_1.expect)(startData).toHaveProperty('taskId');
        (0, test_1.expect)(startData).toHaveProperty('status', 'waiting_for_input');
        (0, test_1.expect)(startData).toHaveProperty('requiredFields');
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
        (0, test_1.expect)(dataResponse.ok()).toBeTruthy();
        const dataResponseData = await dataResponse.json();
        (0, test_1.expect)(dataResponseData).toHaveProperty('success', true);
    });
    (0, test_1.test)('should start carrier-specific quote processes using cached data', async ({ request }) => {
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
        (0, test_1.expect)(geicoStartResponse.ok()).toBeTruthy();
        const geicoData = await geicoStartResponse.json();
        (0, test_1.expect)(geicoData).toHaveProperty('carrier', 'geico');
        (0, test_1.expect)(geicoData).toHaveProperty('taskId', taskId);
        (0, test_1.expect)(geicoData.status).toMatch(/waiting_for_input|processing|completed/);
    });
    (0, test_1.test)('should handle carrier status checks', async ({ request }) => {
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
        (0, test_1.expect)(statusResponse.ok()).toBeTruthy();
        const statusData = await statusResponse.json();
        (0, test_1.expect)(statusData).toHaveProperty('carrier', 'progressive');
        (0, test_1.expect)(statusData).toHaveProperty('taskId', taskId);
        (0, test_1.expect)(statusData).toHaveProperty('status');
    });
    (0, test_1.test)('should clean up tasks and carriers', async ({ request }) => {
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
        (0, test_1.expect)(carrierCleanupResponse.ok()).toBeTruthy();
        // Clean up entire task
        const taskCleanupResponse = await request.delete(`/api/quotes/${taskId}`);
        (0, test_1.expect)(taskCleanupResponse.ok()).toBeTruthy();
        const cleanupData = await taskCleanupResponse.json();
        (0, test_1.expect)(cleanupData).toHaveProperty('success', true);
    });
    (0, test_1.test)('should validate user data', async ({ request }) => {
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
        (0, test_1.expect)(invalidDataResponse.ok()).toBeTruthy();
        // Submit invalid email format
        const invalidEmailResponse = await request.post(`/api/quotes/${taskId}/data`, {
            data: {
                email: 'invalid-email'
            }
        });
        (0, test_1.expect)(invalidEmailResponse.status()).toBe(400);
        const errorData = await invalidEmailResponse.json();
        (0, test_1.expect)(errorData).toHaveProperty('error', 'Validation failed');
        (0, test_1.expect)(errorData).toHaveProperty('validationErrors');
    });
});
test_1.test.describe('API Health and Status', () => {
    (0, test_1.test)('should return health status', async ({ request }) => {
        const response = await request.get('/api/health');
        (0, test_1.expect)(response.ok()).toBeTruthy();
        const data = await response.json();
        (0, test_1.expect)(data).toHaveProperty('status', 'ok');
        (0, test_1.expect)(data).toHaveProperty('timestamp');
        (0, test_1.expect)(data).toHaveProperty('environment');
    });
    (0, test_1.test)('should return available carriers', async ({ request }) => {
        const response = await request.get('/api/carriers');
        (0, test_1.expect)(response.ok()).toBeTruthy();
        const data = await response.json();
        (0, test_1.expect)(data).toHaveProperty('carriers');
        (0, test_1.expect)(Array.isArray(data.carriers)).toBeTruthy();
        (0, test_1.expect)(data.carriers).toContain('geico');
        (0, test_1.expect)(data.carriers).toContain('progressive');
        (0, test_1.expect)(data.carriers).toContain('statefarm');
        (0, test_1.expect)(data.carriers).toContain('libertymutual');
    });
    (0, test_1.test)('should return browser status', async ({ request }) => {
        const response = await request.get('/api/browser/status');
        (0, test_1.expect)(response.ok()).toBeTruthy();
        const data = await response.json();
        (0, test_1.expect)(data).toHaveProperty('isInitialized');
        (0, test_1.expect)(data).toHaveProperty('activeContexts');
    });
    (0, test_1.test)('should return active tasks', async ({ request }) => {
        const response = await request.get('/api/tasks');
        (0, test_1.expect)(response.ok()).toBeTruthy();
        const data = await response.json();
        (0, test_1.expect)(data).toHaveProperty('tasks');
        (0, test_1.expect)(Array.isArray(data.tasks)).toBeTruthy();
    });
});
//# sourceMappingURL=multi-carrier.spec.js.map