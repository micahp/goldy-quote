import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Page } from 'playwright';
import { StateFarmAgent } from '../stateFarmAgent.js';
import { CarrierContext } from '../../types/index.js';

// Mock the Page object
const createMockPage = (overrides: Partial<Page> = {}): Page => {
  const mockPage = {
    url: vi.fn().mockReturnValue('https://www.statefarm.com/quote'),
    title: vi.fn().mockResolvedValue('State Farm Quote'),
    locator: vi.fn().mockReturnValue({
      first: vi.fn().mockReturnValue({
        isVisible: vi.fn().mockResolvedValue(false),
      }),
      count: vi.fn().mockResolvedValue(0),
      waitFor: vi.fn().mockResolvedValue(undefined),
      fill: vi.fn().mockResolvedValue(undefined),
      click: vi.fn().mockResolvedValue(undefined),
      textContent: vi.fn().mockResolvedValue(null),
    }),
    waitForNavigation: vi.fn().mockResolvedValue({ ok: () => true }),
    ...overrides,
  } as unknown as Page;
  return mockPage;
};

describe('StateFarmAgent - Combined Vehicle and Address Step', () => {
  let agent: StateFarmAgent;
  let mockContext: CarrierContext;

  beforeEach(() => {
    agent = new StateFarmAgent();
    mockContext = {
      taskId: 'test-task-123',
      userData: {
        zipCode: '55330',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1990-01-01',
        address: {
          street: '123 Main St',
          city: 'Minneapolis',
          state: 'MN',
          zipCode: '55330',
        },
        vehicles: [{
          vehicleYear: '2020',
          vehicleMake: 'Toyota',
          vehicleModel: 'Camry',
        }],
      },
    };

    // Mock browser actions and task management
    vi.spyOn(agent, 'getBrowserPage').mockResolvedValue(createMockPage());
    vi.spyOn(agent, 'fillForm').mockResolvedValue(undefined);
    vi.spyOn(agent, 'clickContinueButton').mockResolvedValue(undefined);
    vi.spyOn(agent, 'createWaitingResponse').mockReturnValue({
      status: 'waiting_for_input',
      requiredFields: {},
      message: 'Waiting for driver details',
    });
  });

  describe('isVehicleAndAddressCombined', () => {
    it('should return true when both vehicle and address fields are visible', async () => {
      const mockPage = createMockPage({
        locator: vi.fn().mockImplementation((selector: string) => {
          if (selector.includes('vehicleYear')) {
            return {
              first: () => ({
                isVisible: vi.fn().mockResolvedValue(true),
              }),
            };
          }
          if (selector.includes('street')) {
            return {
              first: () => ({
                isVisible: vi.fn().mockResolvedValue(true),
              }),
            };
          }
          return {
            first: () => ({
              isVisible: vi.fn().mockResolvedValue(false),
            }),
          };
        }),
      });

      vi.spyOn(agent, 'getBrowserPage').mockResolvedValue(mockPage);

      // Access private method for testing
      const result = await (agent as any).isVehicleAndAddressCombined(mockPage);
      expect(result).toBe(true);
    });

    it('should return false when only vehicle fields are visible', async () => {
      const mockPage = createMockPage({
        locator: vi.fn().mockImplementation((selector: string) => {
          if (selector.includes('vehicleYear')) {
            return {
              first: () => ({
                isVisible: vi.fn().mockResolvedValue(true),
              }),
            };
          }
          return {
            first: () => ({
              isVisible: vi.fn().mockResolvedValue(false),
            }),
          };
        }),
      });

      const result = await (agent as any).isVehicleAndAddressCombined(mockPage);
      expect(result).toBe(false);
    });

    it('should return false when only address fields are visible', async () => {
      const mockPage = createMockPage({
        locator: vi.fn().mockImplementation((selector: string) => {
          if (selector.includes('street')) {
            return {
              first: () => ({
                isVisible: vi.fn().mockResolvedValue(true),
              }),
            };
          }
          return {
            first: () => ({
              isVisible: vi.fn().mockResolvedValue(false),
            }),
          };
        }),
      });

      const result = await (agent as any).isVehicleAndAddressCombined(mockPage);
      expect(result).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      const mockPage = createMockPage({
        locator: vi.fn().mockImplementation(() => {
          throw new Error('DOM error');
        }),
      });

      const result = await (agent as any).isVehicleAndAddressCombined(mockPage);
      expect(result).toBe(false);
    });
  });

  describe('identifyCurrentStep', () => {
    it('should return "vehicle_and_address" when combined fields are detected', async () => {
      const mockPage = createMockPage();
      vi.spyOn(agent as any, 'isVehicleAndAddressCombined').mockResolvedValue(true);

      const result = await (agent as any).identifyCurrentStep(mockPage);
      expect(result).toBe('vehicle_and_address');
    });

    it('should fall back to URL-based detection when combined fields are not detected', async () => {
      const mockPage = createMockPage({
        url: vi.fn().mockReturnValue('https://www.statefarm.com/quote/vehicle'),
      });
      vi.spyOn(agent as any, 'isVehicleAndAddressCombined').mockResolvedValue(false);

      const result = await (agent as any).identifyCurrentStep(mockPage);
      expect(result).toBe('vehicle_info');
    });
  });

  describe('handleVehicleAndAddressStep', () => {
    it('should fill both vehicle and address fields', async () => {
      const mockPage = createMockPage();
      const fillFormSpy = vi.spyOn(agent, 'fillForm').mockResolvedValue(undefined);
      const clickContinueSpy = vi.spyOn(agent, 'clickContinueButton').mockResolvedValue(undefined);

      await (agent as any).handleVehicleAndAddressStep(mockPage, mockContext, mockContext.userData);

      // Verify vehicle fields were filled
      expect(fillFormSpy).toHaveBeenCalledWith('test-task-123', {
        vehicleYear: ['2020'],
        vehicleMake: ['Toyota'],
        vehicleModel: ['Camry'],
      });

      // Verify address fields were filled
      expect(fillFormSpy).toHaveBeenCalledWith('test-task-123', {
        street: '123 Main St',
        city: 'Minneapolis',
        state: 'MN',
        zipCode: '55330',
      });

      expect(clickContinueSpy).toHaveBeenCalledWith(mockPage, 'test-task-123');
    });

    it('should handle missing vehicle data gracefully', async () => {
      const mockPage = createMockPage();
      const contextWithoutVehicle = {
        ...mockContext,
        userData: {
          ...mockContext.userData,
          vehicles: undefined,
        },
      };

      const fillFormSpy = vi.spyOn(agent, 'fillForm').mockResolvedValue(undefined);

      await (agent as any).handleVehicleAndAddressStep(mockPage, contextWithoutVehicle, contextWithoutVehicle.userData);

      // Should still fill address fields
      expect(fillFormSpy).toHaveBeenCalledWith('test-task-123', {
        street: '123 Main St',
        city: 'Minneapolis',
        state: 'MN',
        zipCode: '55330',
      });
    });

    it('should handle missing address data gracefully', async () => {
      const mockPage = createMockPage();
      const contextWithoutAddress = {
        ...mockContext,
        userData: {
          ...mockContext.userData,
          address: undefined,
        },
      };

      const fillFormSpy = vi.spyOn(agent, 'fillForm').mockResolvedValue(undefined);

      await (agent as any).handleVehicleAndAddressStep(mockPage, contextWithoutAddress, contextWithoutAddress.userData);

      // Should still fill vehicle fields
      expect(fillFormSpy).toHaveBeenCalledWith('test-task-123', {
        vehicleYear: ['2020'],
        vehicleMake: ['Toyota'],
        vehicleModel: ['Camry'],
      });
    });

    it('should return driver details fields as next step', async () => {
      const mockPage = createMockPage();
      const createWaitingResponseSpy = vi.spyOn(agent, 'createWaitingResponse');
      const getDriverDetailsFieldsSpy = vi.spyOn(agent as any, 'getDriverDetailsFields').mockReturnValue({
        gender: { label: 'Gender', type: 'select', required: true },
        maritalStatus: { label: 'Marital Status', type: 'select', required: true },
      });

      await (agent as any).handleVehicleAndAddressStep(mockPage, mockContext, mockContext.userData);

      expect(getDriverDetailsFieldsSpy).toHaveBeenCalled();
      expect(createWaitingResponseSpy).toHaveBeenCalledWith({
        gender: { label: 'Gender', type: 'select', required: true },
        maritalStatus: { label: 'Marital Status', type: 'select', required: true },
      });
    });
  });

  describe('step method integration', () => {
    it('should route to handleVehicleAndAddressStep when current step is vehicle_and_address', async () => {
      const mockPage = createMockPage();
      vi.spyOn(agent, 'getBrowserPage').mockResolvedValue(mockPage);
      vi.spyOn(agent, 'getTask').mockReturnValue({
        taskId: 'test-task-123',
        userData: mockContext.userData,
        status: 'processing',
      });
      vi.spyOn(agent, 'updateTask').mockReturnValue(undefined);
      vi.spyOn(agent, 'extractQuoteInfo').mockResolvedValue(null);
      vi.spyOn(agent as any, 'identifyCurrentStep').mockResolvedValue('vehicle_and_address');
      
      const handleVehicleAndAddressStepSpy = vi.spyOn(agent as any, 'handleVehicleAndAddressStep').mockResolvedValue({
        status: 'waiting_for_input',
        requiredFields: {},
        message: 'Waiting for driver details',
      });

      await agent.step(mockContext, mockContext.userData);

      expect(handleVehicleAndAddressStepSpy).toHaveBeenCalledWith(mockPage, mockContext, mockContext.userData);
    });
  });
}); 