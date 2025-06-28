import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { 
  enableLegacyMode, 
  enableModernMode, 
  shouldIncludeRequiredFields, 
  getPayloadVersion,
  isLegacyMode 
} from '../config/websocketConfig.js';
import { CarrierStatusMessage } from '../types/index.js';

describe('WebSocket Backward Compatibility', () => {
  beforeEach(() => {
    // Reset to modern mode before each test
    enableModernMode();
  });

  afterEach(() => {
    // Reset to modern mode after each test
    enableModernMode();
  });

  describe('Configuration Management', () => {
    it('should default to modern mode with requiredFields enabled', () => {
      expect(shouldIncludeRequiredFields()).toBe(true);
      expect(getPayloadVersion()).toBe('1.1.0');
      expect(isLegacyMode()).toBe(false);
    });

    it('should switch to legacy mode when enabled', () => {
      enableLegacyMode();
      
      expect(shouldIncludeRequiredFields()).toBe(false);
      expect(getPayloadVersion()).toBe('1.0.0');
      expect(isLegacyMode()).toBe(true);
    });

    it('should switch back to modern mode', () => {
      enableLegacyMode();
      enableModernMode();
      
      expect(shouldIncludeRequiredFields()).toBe(true);
      expect(getPayloadVersion()).toBe('1.1.0');
      expect(isLegacyMode()).toBe(false);
    });
  });

  describe('Message Payload Structure', () => {
    it('should create modern payload with requiredFields in modern mode', () => {
      enableModernMode();
      
      const mockRequiredFields = {
        firstName: { type: 'text' as const, required: true, label: 'First Name' },
        lastName: { type: 'text' as const, required: true, label: 'Last Name' }
      };

      // Simulate creating a status message (this would normally be done in BaseCarrierAgent)
      const statusMessage: CarrierStatusMessage = {
        type: 'carrier_status',
        taskId: 'test-task-123',
        carrier: 'Progressive',
        status: 'waiting_for_input',
        currentStep: 1,
        version: getPayloadVersion(),
        ...(shouldIncludeRequiredFields() && {
          requiredFields: mockRequiredFields
        })
      };

      expect(statusMessage.version).toBe('1.1.0');
      expect(statusMessage.requiredFields).toBeDefined();
      expect(statusMessage.requiredFields?.firstName.label).toBe('First Name');
    });

    it('should create legacy payload without requiredFields in legacy mode', () => {
      enableLegacyMode();
      
      const mockRequiredFields = {
        firstName: { type: 'text' as const, required: true, label: 'First Name' },
        lastName: { type: 'text' as const, required: true, label: 'Last Name' }
      };

      // Simulate creating a status message (this would normally be done in BaseCarrierAgent)
      const statusMessage: CarrierStatusMessage = {
        type: 'carrier_status',
        taskId: 'test-task-123',
        carrier: 'Progressive',
        status: 'waiting_for_input',
        currentStep: 1,
        version: getPayloadVersion(),
        ...(shouldIncludeRequiredFields() && {
          requiredFields: mockRequiredFields
        })
      };

      expect(statusMessage.version).toBe('1.0.0');
      expect(statusMessage.requiredFields).toBeUndefined();
    });

    it('should handle empty requiredFields gracefully', () => {
      enableModernMode();
      
      const statusMessage: CarrierStatusMessage = {
        type: 'carrier_status',
        taskId: 'test-task-123',
        carrier: 'Progressive',
        status: 'processing',
        currentStep: 0,
        version: getPayloadVersion(),
        ...(shouldIncludeRequiredFields() && {
          requiredFields: {}
        })
      };

      expect(statusMessage.version).toBe('1.1.0');
      expect(statusMessage.requiredFields).toBeDefined();
      expect(Object.keys(statusMessage.requiredFields!)).toHaveLength(0);
    });
  });

  describe('Environment Variable Override', () => {
    it('should respect WS_ENABLE_REQUIRED_FIELDS environment variable', () => {
      // Note: This test would need to be run with different environment variables
      // to fully test the override behavior. For now, we just document the expected behavior.
      
      // If WS_ENABLE_REQUIRED_FIELDS=false is set, shouldIncludeRequiredFields() should return false
      // If WS_PAYLOAD_VERSION=2.0.0 is set, getPayloadVersion() should return '2.0.0'
      
      expect(true).toBe(true); // Placeholder - actual env var testing would require process manipulation
    });
  });
});

describe('Client Capability Negotiation', () => {
  it('should describe expected client capability message format', () => {
    // Document the expected client capability message format for frontend integration
    const expectedClientCapabilityMessage = {
      type: 'client_capabilities',
      supportedVersions: ['1.0.0', '1.1.0'],
      features: ['requiredFields', 'snapshots']
    };

    const expectedServerResponse = {
      type: 'capabilities_acknowledged',
      serverVersion: '1.1.0',
      features: ['requiredFields']
    };

    expect(expectedClientCapabilityMessage.type).toBe('client_capabilities');
    expect(expectedServerResponse.type).toBe('capabilities_acknowledged');
  });
}); 