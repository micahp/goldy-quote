import { WebSocketConfig } from '../types/index.js';

/**
 * Default WebSocket configuration with versioning and feature flags
 */
const DEFAULT_CONFIG: WebSocketConfig = {
  enableRequiredFields: true, // Enable requiredFields by default
  payloadVersion: '1.1.0', // Version that includes requiredFields
};

/**
 * Legacy compatibility configuration (pre-requiredFields)
 */
const LEGACY_CONFIG: WebSocketConfig = {
  enableRequiredFields: false,
  payloadVersion: '1.0.0', // Legacy version without requiredFields
};

/**
 * Global WebSocket configuration
 * Can be overridden by environment variables or runtime settings
 */
let currentConfig: WebSocketConfig = {
  ...DEFAULT_CONFIG,
  // Allow environment variable overrides
  enableRequiredFields: process.env.WS_ENABLE_REQUIRED_FIELDS !== 'false',
  payloadVersion: process.env.WS_PAYLOAD_VERSION || DEFAULT_CONFIG.payloadVersion,
};

/**
 * Get current WebSocket configuration
 */
export function getWebSocketConfig(): WebSocketConfig {
  return { ...currentConfig };
}

/**
 * Update WebSocket configuration at runtime
 */
export function updateWebSocketConfig(updates: Partial<WebSocketConfig>): void {
  currentConfig = {
    ...currentConfig,
    ...updates,
  };
}

/**
 * Check if requiredFields should be included in WebSocket payloads
 */
export function shouldIncludeRequiredFields(): boolean {
  return currentConfig.enableRequiredFields ?? true;
}

/**
 * Get the current payload version string
 */
export function getPayloadVersion(): string {
  return currentConfig.payloadVersion ?? DEFAULT_CONFIG.payloadVersion!;
}

/**
 * Set configuration to legacy mode (for backward compatibility testing)
 */
export function enableLegacyMode(): void {
  updateWebSocketConfig(LEGACY_CONFIG);
}

/**
 * Set configuration to modern mode (default behavior)
 */
export function enableModernMode(): void {
  updateWebSocketConfig(DEFAULT_CONFIG);
}

/**
 * Check if current configuration is in legacy mode
 */
export function isLegacyMode(): boolean {
  return !shouldIncludeRequiredFields();
} 