export interface FieldDefinition {
  /**
   * A stable identifier for the field.  This typically matches the key used in
   * the unified schema (e.g. "firstName", "vehicleYear", etc.).  Front-end
   * components rely on this property when reading/writing form state.
   */
  id?: string;

  /**
   * Human-readable label shown to end-users (e.g. "First Name").  Some legacy
   * components still reference `name` instead of `label`, so we expose both to
   * preserve backwards compatibility.
   */
  name?: string;

  /**
   * Preferred display label.  `label` supersedes the older `name` property but
   * is optional to avoid breaking existing code that hasn't migrated yet.
   */
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

export interface QuoteResult {
  carrier: string;
  premium: number;
  coverages: Array<{
    name: string;
    details: string;
  }>;

  /**
   * Some carrier agents expose the raw monthly/term price as a formatted
   * string instead of a numeric premium.  These fields are optional so we
   * remain backwards-compatible with existing consumers that rely on the
   * original `premium` field.
   */
  price?: string;
  term?: string;

  /**
   * JSON blob containing carrier-specific coverage information (deductibles,
   * liability limits, etc.).  Each agent structures this object slightly
   * differently so we treat it as an untyped catch-all.
   */
  coverageDetails?: Record<string, any>;

  discounts?: Array<{
    name: string;
    amount: string;
  }>;
  features?: string[];
}

export interface TaskState {
  taskId: string;
  carrier: string;
  status: 'initializing' | 'waiting_for_input' | 'processing' | 'completed' | 'error' | 'inactive' | 'starting' | 'extracting_quote';
  currentStep: number;
  /**
   * Human-readable identifier for the current page/step the automation has
   * detected (e.g. "personal_info", "vehicle_details", etc.).  This is used
   * by the React client to determine whether a carrier is in sync with the
   * user-driven multi-step form.
   */
  currentStepLabel?: string;
  requiredFields: Record<string, FieldDefinition>;
  userData: Record<string, any>;
  error?: string;
  quote?: QuoteResult;
  createdAt: Date;
  lastActivity: Date;
  selectedCarriers?: string[];
}

export interface CarrierContext {
  taskId: string;
  carrier: string;
  initialData: Record<string, any>;
  userData: Record<string, any>;
  stepTimeout: number;
  screenshotsDir: string;
  headful: boolean;
  debug?: boolean;
}

export type CarrierResponseStatus = TaskState['status'] | 'success';

export interface CarrierResponse {
  status: CarrierResponseStatus;
  requiredFields?: Record<string, FieldDefinition>;
  quote?: QuoteResult;
  error?: string;
  message?: string;
}

export interface WebSocketConfig {
  enableRequiredFields?: boolean; // Whether to include requiredFields in WebSocket payloads
  payloadVersion?: string; // Version identifier for payload structure
}

export interface CarrierAgent {
  readonly name: string;
  start(context: CarrierContext): Promise<CarrierResponse>;
  step(context: CarrierContext, stepData: Record<string, any>): Promise<CarrierResponse>;
  status(taskId: string): Promise<Pick<TaskState, 'status' | 'currentStep' | 'error'>>;
  cleanup(taskId: string): Promise<{ success: boolean; message?: string }>;
}

export interface BrowserManager {
  getBrowserContext(taskId: string): Promise<{ context: any; page: any }>;
  closePage(taskId: string): Promise<void>;
  cleanupContext(taskId: string): Promise<void>;
  cleanup(): Promise<void>;
}

// Unified field schema for all carriers - Enhanced to include ALL carrier requirements
export interface UnifiedFieldSchema {
  personalInfo: {
    firstName: FieldDefinition;
    middleInitial: FieldDefinition;
    lastName: FieldDefinition;
    suffix: FieldDefinition;
    dateOfBirth: FieldDefinition;
    gender: FieldDefinition;
    maritalStatus: FieldDefinition;
    email: FieldDefinition;
    phone: FieldDefinition;
  };
  address: {
    streetAddress: FieldDefinition;
    apt: FieldDefinition;
    city: FieldDefinition;
    state: FieldDefinition;
    zipCode: FieldDefinition;
    housingType: FieldDefinition;
    residenceDuration: FieldDefinition;
  };
  vehicle: {
    year: FieldDefinition;
    make: FieldDefinition;
    model: FieldDefinition;
    trim: FieldDefinition;
    vin: FieldDefinition;
    annualMileage: FieldDefinition;
    commuteMiles: FieldDefinition;
    primaryUse: FieldDefinition;
    ownership: FieldDefinition;
    purchaseDate: FieldDefinition;
    antiTheftDevice: FieldDefinition;
    rideshareUsage: FieldDefinition;
    trackingDevice: FieldDefinition;
  };
  drivingHistory: {
    licenseAge: FieldDefinition;
    yearsLicensed: FieldDefinition;
    foreignLicense: FieldDefinition;
    licenseIssues: FieldDefinition;
    accidents: FieldDefinition;
    violations: FieldDefinition;
    majorViolations: FieldDefinition;
    continuousCoverage: FieldDefinition;
    currentInsurer: FieldDefinition;
    currentLiabilityLimits: FieldDefinition;
  };
  demographics: {
    education: FieldDefinition;
    employmentStatus: FieldDefinition;
    occupation: FieldDefinition;
    industry: FieldDefinition;
    militaryAffiliation: FieldDefinition;
  };
  coverage: {
    liabilityLimit: FieldDefinition;
    collisionDeductible: FieldDefinition;
    comprehensiveDeductible: FieldDefinition;
    medicalPayments: FieldDefinition;
    uninsuredMotorist: FieldDefinition;
    rentalCoverage: FieldDefinition;
    roadsideAssistance: FieldDefinition;
  };
}

// WebSocket Message Types
export interface BaseWebSocketMessage {
  type: string;
  taskId: string;
  version?: string; // Optional version field for backward compatibility
}

export interface CarrierStatusMessage extends BaseWebSocketMessage {
  type: 'carrier_status';
  carrier: string;
  status: TaskState['status'];
  currentStep: number;
  /**
   * Human-readable identifier for the current page/step the automation has
   * detected (e.g. "personal_info", "vehicle_details", etc.).  This is used
   * by the React client to determine whether a carrier is in sync with the
   * user-driven multi-step form.
   */
  currentStepLabel?: string;
  requiredFields?: Record<string, FieldDefinition>; // Made optional for backward compatibility
}

export interface CarrierStartedMessage extends BaseWebSocketMessage {
  type: 'carrier_started';
  carrier: string;
  status: CarrierResponseStatus;
}

export interface CarrierStepCompletedMessage extends BaseWebSocketMessage {
  type: 'carrier_step_completed';
  carrier: string;
  status: CarrierResponseStatus;
}

export interface CarrierErrorMessage extends BaseWebSocketMessage {
  type: 'carrier_error';
  carrier: string;
  error: string;
}

export interface AutomationSnapshotMessage extends BaseWebSocketMessage {
  type: 'automation.snapshot';
  url: string;
  screenshot: string;
}

export interface AutomationErrorMessage extends BaseWebSocketMessage {
  type: 'automation.error';
  carrier: string;
  step: number | string;
  selector: string;
  url: string;
}

export type WebSocketMessage = 
  | CarrierStatusMessage
  | CarrierStartedMessage
  | CarrierStepCompletedMessage
  | CarrierErrorMessage
  | AutomationSnapshotMessage
  | AutomationErrorMessage; 