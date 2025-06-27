import { useCallback, useEffect, useRef, useState } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SnapshotMessage {
  type: 'automation.snapshot';
  taskId: string;
  url: string;
  screenshot: string; // filename saved on the server
  timestamp: string;  // ISO timestamp
  [key: string]: unknown; // allow future-proof extra fields
}

export interface UseSnapshotWebSocketOptions {
  /**
   * Task ID for which the caller wants to receive automation snapshots. If
   * provided, the hook will send a `{ type: 'subscribe', taskId }` message
   * once the socket is open so the backend can scope events appropriately.
   */
  taskId?: string;
  /**
   * Explicit WebSocket URL. Falls back to the current browser location using
   * the WS protocol with port 3001 (matching the default Express server).
   */
  url?: string;
  /**
   * Invoked whenever a new snapshot event is received.
   */
  onSnapshot?: (msg: SnapshotMessage) => void;
}

// Reasonable back-off intervals (ms) – 0.5s, 1s, 2s, 4s, 8s … max ~8s
const RECONNECT_DELAYS = [500, 1000, 2000, 4000, 8000];

/**
 * React hook that establishes a resilient WebSocket connection to the backend
 * and surfaces the latest `automation.snapshot` message.
 *
 * The hook automatically reconnects with exponential back-off and cleans up
 * on component unmount. Consumers can either read the `snapshot` state or
 * provide an `onSnapshot` callback for imperative handling.
 */
export function useSnapshotWebSocket(options: UseSnapshotWebSocketOptions = {}) {
  const { taskId, url, onSnapshot } = options;

  const getDefaultWsUrl = () => {
    const { protocol, hostname } = window.location;
    const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:';
    const port = 3001;
    return `${wsProtocol}//${hostname}:${port}`;
  };

  const defaultUrlRef = useRef<string>(getDefaultWsUrl());

  const socketUrl = url || defaultUrlRef.current;

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempt = useRef(0);
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [snapshot, setSnapshot] = useState<SnapshotMessage | null>(null);

  const cleanup = useCallback(() => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = null;
    }
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      wsRef.current.close();
    }
    wsRef.current = null;
  }, []);

  const connect = useCallback(() => {
    cleanup(); // ensure no stale socket
    const ws = new WebSocket(socketUrl);
    wsRef.current = ws;

    ws.addEventListener('open', () => {
      reconnectAttempt.current = 0; // reset back-off
      if (taskId) {
        // Inform backend which task we care about.
        ws.send(JSON.stringify({ type: 'subscribe', taskId }));
      }
    });

    ws.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data as string);
        if (data?.type === 'automation.snapshot') {
          setSnapshot(data as SnapshotMessage);
          onSnapshot?.(data as SnapshotMessage);
        }
      } catch (err) {
        // Silently ignore malformed messages – keep connection alive.
        console.warn('[useSnapshotWebSocket] Failed to parse message', err);
      }
    });

    ws.addEventListener('close', () => {
      scheduleReconnect();
    });

    ws.addEventListener('error', () => {
      // Error is followed by close – no need to do anything special.
    });
  }, [cleanup, onSnapshot, socketUrl, taskId]);

  const scheduleReconnect = useCallback(() => {
    // Prevent multiple parallel timers.
    if (reconnectTimeout.current) return;

    const delay = RECONNECT_DELAYS[Math.min(reconnectAttempt.current, RECONNECT_DELAYS.length - 1)];
    console.info(`[useSnapshotWebSocket] Socket closed – attempting reconnect #${reconnectAttempt.current + 1} in ${delay}ms`);

    reconnectTimeout.current = setTimeout(() => {
      reconnectAttempt.current += 1;
      connect();
    }, delay);
  }, [connect]);

  useEffect(() => {
    connect();
    return () => {
      cleanup();
    };
    // We intentionally omit connect from deps – we only want to run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socketUrl, taskId]);

  return snapshot;
} 