export interface FieldDefinition {
  id: string;
  name: string;
  type: 'text' | 'email' | 'tel' | 'date' | 'select' | 'radio' | 'checkbox' | 'number';
  options?: string[];
  required: boolean;
  placeholder?: string;
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
  };
}

export interface QuoteResult {
  price: string;
  term: string;
  carrier: string;
  coverageDetails: Record<string, any>;
  discounts?: Array<{
    name: string;
    amount: string;
  }>;
  features?: string[];
}

export interface TaskState {
  taskId: string;
  carrier: string;
  status: 'initializing' | 'waiting_for_input' | 'processing' | 'completed' | 'error' | 'inactive' | 'starting';
  currentStep: number;
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
  userData: Record<string, any>;
  stepTimeout: number;
  screenshotsDir: string;
  headful: boolean;
}

export interface CarrierResponse {
  status: TaskState['status'];
  requiredFields?: Record<string, FieldDefinition>;
  quote?: QuoteResult;
  error?: string;
  message?: string;
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
  cleanup(): Promise<void>;
}

// Unified field schema for all carriers
export interface UnifiedFieldSchema {
  personalInfo: {
    firstName: FieldDefinition;
    lastName: FieldDefinition;
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
  };
  vehicle: {
    year: FieldDefinition;
    make: FieldDefinition;
    model: FieldDefinition;
    trim: FieldDefinition;
    vin: FieldDefinition;
    annualMileage: FieldDefinition;
    primaryUse: FieldDefinition;
    ownership: FieldDefinition;
  };
  drivingHistory: {
    licenseAge: FieldDefinition;
    accidents: FieldDefinition;
    violations: FieldDefinition;
    continuousCoverage: FieldDefinition;
    currentInsurer: FieldDefinition;
  };
  coverage: {
    liabilityLimit: FieldDefinition;
    collisionDeductible: FieldDefinition;
    comprehensiveDeductible: FieldDefinition;
    medicalPayments: FieldDefinition;
    uninsuredMotorist: FieldDefinition;
  };
} 