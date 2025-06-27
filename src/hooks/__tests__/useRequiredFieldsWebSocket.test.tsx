import { renderHook, act } from '@testing-library/react';
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { useRequiredFieldsWebSocket, FieldDefinition, CarrierStatusMessage } from '../useRequiredFieldsWebSocket';

// Mock WebSocket
class MockWebSocket {
  static instance: MockWebSocket | null = null;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  readyState: number = WebSocket.CONNECTING;
  
  private listeners: Record<string, Function[]> = {};

  constructor(url: string) {
    MockWebSocket.instance = this;
    // Simulate async connection
    setTimeout(() => {
      this.readyState = WebSocket.OPEN;
      this.onopen?.(new Event('open'));
      this.dispatchEvent('open', new Event('open'));
    }, 0);
  }

  addEventListener(type: string, listener: Function) {
    if (!this.listeners[type]) {
      this.listeners[type] = [];
    }
    this.listeners[type].push(listener);
  }

  dispatchEvent(type: string, event: Event) {
    this.listeners[type]?.forEach(listener => listener(event));
  }

  send(data: string) {
    // Mock implementation - stores sent data for verification
    (this as any).lastSentData = data;
  }

  close() {
    this.readyState = WebSocket.CLOSED;
    this.onclose?.(new CloseEvent('close'));
    this.dispatchEvent('close', new CloseEvent('close'));
  }

  // Helper method to simulate receiving messages
  simulateMessage(data: any) {
    const event = new MessageEvent('message', {
      data: JSON.stringify(data)
    });
    this.onmessage?.(event);
    this.dispatchEvent('message', event);
  }
}

// Override global WebSocket
(global as any).WebSocket = MockWebSocket;

describe('useRequiredFieldsWebSocket', () => {
  beforeEach(() => {
    MockWebSocket.instance = null;
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useRequiredFieldsWebSocket());

    expect(result.current).toEqual({
      requiredFields: null,
      status: null,
      currentStep: null,
      carrier: null,
      lastUpdated: null,
      isConnected: false,
    });
  });

  it('should connect to WebSocket and update connection state', async () => {
    const { result } = renderHook(() => useRequiredFieldsWebSocket({ taskId: 'test-task' }));

    expect(result.current.isConnected).toBe(false);

    // Trigger WebSocket open event
    await act(async () => {
      vi.runAllTimers();
    });

    expect(result.current.isConnected).toBe(true);
    
    // Verify subscription message was sent
    const mockWs = MockWebSocket.instance as any;
    expect(mockWs.lastSentData).toBe(JSON.stringify({ type: 'subscribe', taskId: 'test-task' }));
  });

  it('should handle carrier status messages with requiredFields', async () => {
    const onRequiredFieldsUpdate = vi.fn();
    const onCarrierStatusUpdate = vi.fn();

    const { result } = renderHook(() => 
      useRequiredFieldsWebSocket({
        taskId: 'test-task',
        onRequiredFieldsUpdate,
        onCarrierStatusUpdate
      })
    );

    await act(async () => {
      vi.runAllTimers();
    });

    const mockFields: Record<string, FieldDefinition> = {
      firstName: {
        id: 'firstName',
        type: 'text',
        required: true,
        label: 'First Name'
      },
      email: {
        id: 'email',
        type: 'email',
        required: true,
        label: 'Email Address'
      }
    };

    const mockMessage: CarrierStatusMessage = {
      type: 'carrier_status',
      taskId: 'test-task',
      carrier: 'geico',
      status: 'waiting_for_input',
      currentStep: 2,
      requiredFields: mockFields
    };

    // Simulate receiving message
    await act(async () => {
      MockWebSocket.instance?.simulateMessage(mockMessage);
    });

    // Verify state was updated
    expect(result.current.requiredFields).toEqual(mockFields);
    expect(result.current.status).toBe('waiting_for_input');
    expect(result.current.currentStep).toBe(2);
    expect(result.current.carrier).toBe('geico');
    expect(result.current.lastUpdated).toBeInstanceOf(Date);

    // Verify callbacks were called
    expect(onCarrierStatusUpdate).toHaveBeenCalledWith(mockMessage);
    expect(onRequiredFieldsUpdate).toHaveBeenCalledWith('geico', mockFields, mockMessage);
  });

  it('should filter messages by carrier when specified', async () => {
    const onRequiredFieldsUpdate = vi.fn();

    const { result } = renderHook(() => 
      useRequiredFieldsWebSocket({
        taskId: 'test-task',
        carrier: 'progressive',
        onRequiredFieldsUpdate
      })
    );

    await act(async () => {
      vi.runAllTimers();
    });

    // Send message for different carrier
    const geicoMessage: CarrierStatusMessage = {
      type: 'carrier_status',
      taskId: 'test-task',
      carrier: 'geico',
      status: 'waiting_for_input',
      currentStep: 1,
      requiredFields: { test: { id: 'test', type: 'text', required: true } }
    };

    await act(async () => {
      MockWebSocket.instance?.simulateMessage(geicoMessage);
    });

    // Should not update state or call callbacks for filtered carrier
    expect(result.current.carrier).toBe(null);
    expect(onRequiredFieldsUpdate).not.toHaveBeenCalled();

    // Send message for correct carrier
    const progressiveMessage: CarrierStatusMessage = {
      ...geicoMessage,
      carrier: 'progressive'
    };

    await act(async () => {
      MockWebSocket.instance?.simulateMessage(progressiveMessage);
    });

    // Should update state for correct carrier
    expect(result.current.carrier).toBe('progressive');
    expect(onRequiredFieldsUpdate).toHaveBeenCalledWith('progressive', expect.any(Object), progressiveMessage);
  });

  it('should handle messages without requiredFields', async () => {
    const onCarrierStatusUpdate = vi.fn();
    const onRequiredFieldsUpdate = vi.fn();

    const { result } = renderHook(() => 
      useRequiredFieldsWebSocket({
        taskId: 'test-task',
        onCarrierStatusUpdate,
        onRequiredFieldsUpdate
      })
    );

    await act(async () => {
      vi.runAllTimers();
    });

    const messageWithoutFields: CarrierStatusMessage = {
      type: 'carrier_status',
      taskId: 'test-task',
      carrier: 'geico',
      status: 'processing',
      currentStep: 3
      // No requiredFields
    };

    await act(async () => {
      MockWebSocket.instance?.simulateMessage(messageWithoutFields);
    });

    // Should update general state but not requiredFields
    expect(result.current.status).toBe('processing');
    expect(result.current.currentStep).toBe(3);
    expect(result.current.carrier).toBe('geico');
    expect(result.current.requiredFields).toBe(null);

    // Should call status update but not requiredFields update
    expect(onCarrierStatusUpdate).toHaveBeenCalledWith(messageWithoutFields);
    expect(onRequiredFieldsUpdate).not.toHaveBeenCalled();
  });

  it('should ignore non-carrier_status messages', async () => {
    const onCarrierStatusUpdate = vi.fn();

    const { result } = renderHook(() => 
      useRequiredFieldsWebSocket({
        taskId: 'test-task',
        onCarrierStatusUpdate
      })
    );

    await act(async () => {
      vi.runAllTimers();
    });

    // Send different message type
    await act(async () => {
      MockWebSocket.instance?.simulateMessage({
        type: 'automation.snapshot',
        taskId: 'test-task',
        url: 'https://example.com',
        screenshot: 'test.png'
      });
    });

    // Should not update state or call callbacks
    expect(result.current.status).toBe(null);
    expect(onCarrierStatusUpdate).not.toHaveBeenCalled();
  });

  it('should preserve requiredFields across status updates without fields', async () => {
    const { result } = renderHook(() => useRequiredFieldsWebSocket({ taskId: 'test-task' }));

    await act(async () => {
      vi.runAllTimers();
    });

    // First message with requiredFields
    const initialFields = { firstName: { id: 'firstName', type: 'text' as const, required: true } };
    await act(async () => {
      MockWebSocket.instance?.simulateMessage({
        type: 'carrier_status',
        taskId: 'test-task',
        carrier: 'geico',
        status: 'waiting_for_input',
        currentStep: 1,
        requiredFields: initialFields
      });
    });

    expect(result.current.requiredFields).toEqual(initialFields);

    // Second message without requiredFields
    await act(async () => {
      MockWebSocket.instance?.simulateMessage({
        type: 'carrier_status',
        taskId: 'test-task',
        carrier: 'geico',
        status: 'processing',
        currentStep: 2
        // No requiredFields
      });
    });

    // Should preserve previous requiredFields
    expect(result.current.requiredFields).toEqual(initialFields);
    expect(result.current.status).toBe('processing');
    expect(result.current.currentStep).toBe(2);
  });
}); 