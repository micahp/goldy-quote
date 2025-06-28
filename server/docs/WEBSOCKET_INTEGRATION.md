# WebSocket Integration Guide

## Quick Start

Connect to the WebSocket server and listen for carrier status updates:

```javascript
const ws = new WebSocket('ws://localhost:3001');

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  if (message.type === 'carrier_status') {
    handleCarrierStatus(message);
  }
};

function handleCarrierStatus(message) {
  // Check version for compatibility
  const hasRequiredFields = message.version >= '1.1.0' && message.requiredFields;
  
  if (hasRequiredFields) {
    // Modern dynamic form
    renderDynamicForm(message.requiredFields);
  } else {
    // Legacy static form
    renderStaticForm(message.carrier, message.currentStep);
  }
}
```

## Message Types

### carrier_status
Real-time updates as the automation progresses through steps.

**New in v1.1.0:** Includes `requiredFields` for dynamic form generation.

### carrier_started  
Emitted when a new carrier automation begins.

### carrier_completed
Emitted when carrier automation finishes successfully.

### carrier_error
Emitted when carrier automation encounters an error.

## Field Types

- `text` - Text input
- `email` - Email input with validation
- `number` - Numeric input
- `date` - Date picker
- `select` - Dropdown with options
- `boolean` - Checkbox
- `array` - Dynamic list of items

## Environment Configuration

```bash
# Enable requiredFields in WebSocket payload
WS_ENABLE_REQUIRED_FIELDS=true

# Set payload version
WS_PAYLOAD_VERSION=1.1.0
```

For complete documentation, see [websocket-payload-schema.md](./websocket-payload-schema.md).
