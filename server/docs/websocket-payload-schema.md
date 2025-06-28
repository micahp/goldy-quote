# WebSocket Payload Schema and Integration Guidelines

## Overview

The Goldy Quote backend provides real-time carrier status updates via WebSocket. As of version 1.1.0, the payload includes `requiredFields` metadata to enable dynamic frontend forms.

## Payload Versioning

### Version 1.1.0 (Current)
- Includes `requiredFields` for dynamic form generation
- Backward compatible with v1.0.0 clients

### Version 1.0.0 (Legacy)  
- Basic carrier status without `requiredFields`
- Still supported for backward compatibility

## WebSocket Message Schema

```typescript
interface CarrierStatusMessage {
  type: 'carrier_status';
  taskId: string;
  carrier: string; 
  status: TaskStatus;
  currentStep: number;
  version: string;
  requiredFields?: Record<string, FieldDefinition>;
}

interface FieldDefinition {
  type: FieldType;
  required: boolean;
  label: string;
  options?: string[];
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
  };
}
```

## Integration Guidelines

### 1. Version Detection
Always check the `version` field to determine payload capabilities.

### 2. Handle Empty Fields
When `requiredFields` is empty, no user input is required.

### 3. Dynamic Form Generation
Generate forms based on field definitions.

### 4. Error Handling
Implement graceful fallbacks for invalid data.

## Configuration

Control payload features via environment variables:
- `WS_ENABLE_REQUIRED_FIELDS=true` (default)
- `WS_PAYLOAD_VERSION=1.1.0` (default)
