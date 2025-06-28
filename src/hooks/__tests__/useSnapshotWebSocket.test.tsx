import { describe, it, vi, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react-hooks';
import { useSnapshotWebSocket, SnapshotMessage } from '../useSnapshotWebSocket';

// Mock global WebSocket
class MockWebSocket {
  static instances: MockWebSocket[] = [];
  public readyState: number = 0; // 0 = CONNECTING
  public url: string;

  // Map of event type -> array of listeners. Using explicit function signature instead of `Function` type.
  private listeners: Record<string, Array<(event?: any) => void>> = {};

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
    // Simulate async open
    setTimeout(() => {
      this.readyState = 1; // 1 = OPEN
      this.dispatchEvent('open');
    }, 0);
  }

  send(_data: string) {/* noop for tests */}
  close() {
    this.readyState = 3; // 3 = CLOSED
    this.dispatchEvent('close');
  }

  addEventListener(type: string, cb: (event?: any) => void) {
    if (!this.listeners[type]) this.listeners[type] = [];
    this.listeners[type].push(cb);
  }
  removeEventListener(type: string, cb: (event?: any) => void) {
    this.listeners[type] = (this.listeners[type] || []).filter((fn) => fn !== cb);
  }
  // Helper to emit events
  dispatchEvent(type: string, event: Partial<MessageEvent> = {}) {
    (this.listeners[type] || []).forEach((cb) => cb({ ...event }));
  }
}

// Replace global WebSocket with mock
beforeEach(() => {
  // @ts-ignore
  global.WebSocket = MockWebSocket;
  MockWebSocket.instances = [];
});

afterEach(() => {
  // @ts-ignore
  delete global.WebSocket;
});

describe('useSnapshotWebSocket', () => {
  it('establishes a WebSocket connection and receives snapshot messages', async () => {
    const onSnapshot = vi.fn();

    renderHook(() => useSnapshotWebSocket({ url: 'ws://localhost:1234', onSnapshot }));

    // Wait for socket to open
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    expect(MockWebSocket.instances.length).toBe(1);
    const wsInstance = MockWebSocket.instances[0];

    // Send a snapshot event
    const fakeSnapshot: SnapshotMessage = {
      type: 'automation.snapshot',
      taskId: 'task-1',
      url: 'https://example.com',
      screenshot: '123.png',
      timestamp: new Date().toISOString(),
    };

    act(() => {
      wsInstance.dispatchEvent('message', { data: JSON.stringify(fakeSnapshot) });
    });

    expect(onSnapshot).toHaveBeenCalledWith(fakeSnapshot);
  });

  it('reconnects when the socket closes', async () => {
    renderHook(() => useSnapshotWebSocket({ url: 'ws://localhost:5678' }));

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    // Switch to fake timers *before* inducing the close so that the reconnect
    // back-off `setTimeout` is captured by the mocked timers.
    vi.useFakeTimers();

    const first = MockWebSocket.instances[0];
    act(() => {
      first.close();
    });

    // Fast-forward timers to trigger the first reconnect attempt.
    vi.advanceTimersByTime(500); // first back-off delay
    vi.useRealTimers();

    expect(MockWebSocket.instances.length).toBeGreaterThan(1);
  });
}); 