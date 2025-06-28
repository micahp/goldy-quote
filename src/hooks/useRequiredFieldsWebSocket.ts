import { useCallback, useEffect, useRef, useState } from 'react';

// Define FieldDefinition locally since we can't import from server in client code
export interface FieldDefinition {
  id?: string;
  name?: string;
  label?: string;
  type: 'text' | 'email' | 'tel' | 'date' | 'select' | 'radio' | 'checkbox' | 'number' | 'boolean' | 'array';
  required: boolean;
  options?: string[];
  placeholder?: string;
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
  };
  itemFields?: Record<string, FieldDefinition>;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CarrierStatusMessage {
  type: 'carrier_status';
  taskId: string;
  carrier: string;
  status: 'initializing' | 'waiting_for_input' | 'processing' | 'completed' | 'error' | 'inactive' | 'starting' | 'extracting_quote';
  currentStep: number;
  requiredFields?: Record<string, FieldDefinition>;
  version?: string;
}

export interface UseRequiredFieldsWebSocketOptions {
  /**
   * Task ID for which the caller wants to receive carrier status updates with requiredFields.
   * If provided, the hook will send a `{ type: 'subscribe', taskId }` message
   * once the socket is open so the backend can scope events appropriately.
   */
  taskId?: string;
  /**
   * Specific carrier to filter messages for. If provided, only messages for this carrier will be processed.
   */
  carrier?: string;
  /**
   * Explicit WebSocket URL. Falls back to the current browser location using
   * the WS protocol with port 3001 (matching the default Express server).
   */
  url?: string;
  /**
   * Invoked whenever a new carrier status message with requiredFields is received.
   */
  onRequiredFieldsUpdate?: (carrier: string, requiredFields: Record<string, FieldDefinition>, message: CarrierStatusMessage) => void;
  /**
   * Invoked whenever any carrier status update is received (with or without requiredFields).
   */
  onCarrierStatusUpdate?: (message: CarrierStatusMessage) => void;
}

export interface RequiredFieldsState {
  /** Current requiredFields schema for the tracked carrier(s) */
  requiredFields: Record<string, FieldDefinition> | null;
  /** Current carrier status */
  status: CarrierStatusMessage['status'] | null;
  /** Current step number */
  currentStep: number | null;
  /** Carrier name that last sent the schema */
  carrier: string | null;
  /** Last received message timestamp */
  lastUpdated: Date | null;
  /** Whether the WebSocket is currently connected */
  isConnected: boolean;
}

// Reasonable back-off intervals (ms) – 0.5s, 1s, 2s, 4s, 8s … max ~8s
const RECONNECT_DELAYS = [500, 1000, 2000, 4000, 8000];

/**
 * React hook that establishes a resilient WebSocket connection to receive
 * CarrierStatusMessage events with requiredFields schema updates.
 *
 * The hook automatically reconnects with exponential back-off and cleans up
 * on component unmount. It specifically listens for 'carrier_status' messages
 * and extracts the requiredFields schema for dynamic form generation.
 */
export function useRequiredFieldsWebSocket(options: UseRequiredFieldsWebSocketOptions = {}): RequiredFieldsState {
  const { taskId, carrier, url, onRequiredFieldsUpdate, onCarrierStatusUpdate } = options;

  const getDefaultWsUrl = () => {
    // Allow build-time override
    if (import.meta.env.VITE_WS_URL) {
      return import.meta.env.VITE_WS_URL as string;
    }

    const { protocol, hostname, port: pagePort } = window.location;
    const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:';

    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
    const socketPort = isLocalhost ? '3001' : pagePort;

    return `${wsProtocol}//${hostname}${socketPort ? `:${socketPort}` : ''}`;
  };

  const defaultUrlRef = useRef<string>(getDefaultWsUrl());
  const socketUrl = url || defaultUrlRef.current;

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempt = useRef(0);
  const reconnectTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [state, setState] = useState<RequiredFieldsState>({
    requiredFields: null,
    status: null,
    currentStep: null,
    carrier: null,
    lastUpdated: null,
    isConnected: false,
  });

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
      console.log('🔗 RequiredFields WebSocket connected');
      reconnectAttempt.current = 0; // reset back-off
      setState(prev => ({ ...prev, isConnected: true }));
      
      if (taskId) {
        // Inform backend which task we care about.
        ws.send(JSON.stringify({ type: 'subscribe', taskId }));
        console.log(`📡 Subscribed to task: ${taskId}`);
      }
    });

    ws.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data as string);
        
        // Only process carrier_status messages
        if (data?.type === 'carrier_status') {
          const message = data as CarrierStatusMessage;
          
          // Filter by carrier if specified
          if (carrier && message.carrier !== carrier) {
            return;
          }

          console.log(`📋 Received carrier status for ${message.carrier}:`, {
            status: message.status,
            step: message.currentStep,
            hasRequiredFields: !!message.requiredFields,
            fieldCount: message.requiredFields ? Object.keys(message.requiredFields).length : 0
          });

          // Update state with new information
          setState(prev => {
            let mergedFields = prev.requiredFields;
            if (message.requiredFields) {
              mergedFields = {
                ...prev.requiredFields,
                ...message.requiredFields,
              };
            }
            return {
              ...prev,
              status: message.status,
              currentStep: message.currentStep,
              carrier: message.carrier,
              lastUpdated: new Date(),
              requiredFields: mergedFields,
            };
          });

          // Call callbacks
          onCarrierStatusUpdate?.(message);
          
          if (message.requiredFields) {
            onRequiredFieldsUpdate?.(message.carrier, message.requiredFields, message);
          }
        }
      } catch (err) {
        // Silently ignore malformed messages – keep connection alive.
        console.warn('[useRequiredFieldsWebSocket] Failed to parse message', err);
      }
    });

    ws.addEventListener('close', () => {
      console.log('🔌 RequiredFields WebSocket disconnected');
      setState(prev => ({ ...prev, isConnected: false }));
      scheduleReconnect();
    });

    ws.addEventListener('error', (err) => {
      console.warn('[useRequiredFieldsWebSocket] WebSocket error:', err);
      // Error is followed by close – no need to do anything special.
    });
  }, [cleanup, onRequiredFieldsUpdate, onCarrierStatusUpdate, socketUrl, taskId, carrier]);

  const scheduleReconnect = useCallback(() => {
    // Prevent multiple parallel timers.
    if (reconnectTimeout.current) return;

    const delay = RECONNECT_DELAYS[Math.min(reconnectAttempt.current, RECONNECT_DELAYS.length - 1)];
    console.info(`[useRequiredFieldsWebSocket] Socket closed – attempting reconnect #${reconnectAttempt.current + 1} in ${delay}ms`);

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
  }, [socketUrl, taskId, carrier]);

  return state;
} 