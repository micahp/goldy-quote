/**
 * Field Mapping Utilities for Dynamic Form Generation
 * 
 * This module provides utilities to map schema field definitions to form components
 * and handle the transformation between backend schema and frontend form inputs.
 */

import type { FieldDefinition } from '../hooks/useRequiredFieldsWebSocket';

// Form input configuration that will be used by React Hook Form or similar libraries
export interface FormFieldConfig {
  /** Field identifier */
  id: string;
  /** Display label */
  label: string;
  /** Input type for HTML form elements */
  inputType: 'text' | 'email' | 'tel' | 'date' | 'number' | 'select' | 'radio' | 'checkbox' | 'textarea';
  /** Placeholder text */
  placeholder?: string;
  /** Whether the field is required */
  required: boolean;
  /** Options for select/radio inputs */
  options?: Array<{ value: string; label: string }>;
  /** Validation rules for React Hook Form */
  validation: {
    required?: boolean | string;
    pattern?: { value: RegExp; message: string };
    min?: { value: number; message: string };
    max?: { value: number; message: string };
    minLength?: { value: number; message: string };
    maxLength?: { value: number; message: string };
  };
  /** Default value */
  defaultValue?: any;
  /** Whether the field spans full width */
  fullWidth?: boolean;
  /** Grid column span (for responsive layouts) */
  colSpan?: number;
}

/**
 * Maps a FieldDefinition to the appropriate form input type
 */
export function mapFieldToInputType(field: FieldDefinition): string {
  switch (field.type) {
    case 'text':
    case 'string':
      return 'text';
    case 'email':
      return 'email';
    case 'number':
    case 'integer':
      return 'number';
    case 'date':
      return 'date';
    case 'boolean':
      return 'checkbox';
    case 'select':
    case 'enum':
      return 'select';
    case 'radio':
      return 'radio';
    case 'textarea':
      return 'textarea';
    default:
      return 'text';
  }
}

/**
 * Generates validation rules based on field definition
 */
export function generateValidationRules(field: FieldDefinition) {
  const rules: Record<string, any> = {};

  if (field.required) {
    rules.required = {
      value: true,
      message: `${field.label || field.name} is required`
    };
  }

  if (field.validation) {
    if (field.validation.minLength) {
      rules.minLength = {
        value: field.validation.minLength,
        message: `Minimum length is ${field.validation.minLength} characters`
      };
    }

    if (field.validation.maxLength) {
      rules.maxLength = {
        value: field.validation.maxLength,
        message: `Maximum length is ${field.validation.maxLength} characters`
      };
    }

    if (field.validation.pattern) {
      rules.pattern = {
        value: new RegExp(field.validation.pattern),
        message: field.validation.message || 'Invalid format'
      };
    }

    if (field.validation.min !== undefined) {
      rules.min = {
        value: field.validation.min,
        message: `Minimum value is ${field.validation.min}`
      };
    }

    if (field.validation.max !== undefined) {
      rules.max = {
        value: field.validation.max,
        message: `Maximum value is ${field.validation.max}`
      };
    }
  }

  return rules;
}

/**
 * Transforms field options for select/radio components
 */
export function transformFieldOptions(field: FieldDefinition) {
  if (!field.options) return [];

  return field.options.map(option => {
    if (typeof option === 'string') {
      return { value: option, label: option };
    }
    return option;
  });
}

/**
 * Gets the default value for a field based on its type and definition
 */
export function getDefaultValue(field: FieldDefinition): any {
  if (field.defaultValue !== undefined) {
    return field.defaultValue;
  }

  switch (field.type) {
    case 'boolean':
      return false;
    case 'number':
    case 'integer':
      return '';
    case 'select':
    case 'radio':
      return field.options?.[0] ? 
        (typeof field.options[0] === 'string' ? field.options[0] : field.options[0].value) : 
        '';
    default:
      return '';
  }
}

/**
 * Normalizes field name for form handling (removes spaces, special chars)
 */
export function normalizeFieldName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

/**
 * Creates a field configuration object for form rendering
 */
export function createFieldConfig(field: FieldDefinition) {
  return {
    name: normalizeFieldName(field.name),
    type: mapFieldToInputType(field),
    label: field.label || field.name,
    placeholder: field.placeholder,
    required: field.required || false,
    disabled: field.disabled || false,
    validation: generateValidationRules(field),
    options: transformFieldOptions(field),
    defaultValue: getDefaultValue(field),
    originalField: field
  };
}

/**
 * Maps a FieldDefinition from the WebSocket schema to a FormFieldConfig
 * that can be used with React Hook Form or similar form libraries.
 */
export function mapFieldDefinitionToFormConfig(fieldDef: FieldDefinition): FormFieldConfig {
  const config: FormFieldConfig = {
    id: fieldDef.id || fieldDef.name || 'unknown',
    label: fieldDef.label || fieldDef.name || 'Field',
    inputType: mapFieldTypeToInputType(fieldDef.type),
    placeholder: fieldDef.placeholder,
    required: fieldDef.required,
    validation: {},
    fullWidth: false,
    colSpan: 1,
  };

  // Map validation rules
  if (fieldDef.required) {
    config.validation.required = `${config.label} is required`;
  }

  if (fieldDef.validation) {
    const val = fieldDef.validation;
    
    if (val.pattern) {
      config.validation.pattern = {
        value: new RegExp(val.pattern),
        message: `${config.label} format is invalid`
      };
    }
    
    if (val.min !== undefined) {
      config.validation.min = {
        value: val.min,
        message: `${config.label} must be at least ${val.min}`
      };
    }
    
    if (val.max !== undefined) {
      config.validation.max = {
        value: val.max,
        message: `${config.label} must be no more than ${val.max}`
      };
    }
    
    if (val.minLength !== undefined) {
      config.validation.minLength = {
        value: val.minLength,
        message: `${config.label} must be at least ${val.minLength} characters`
      };
    }
    
    if (val.maxLength !== undefined) {
      config.validation.maxLength = {
        value: val.maxLength,
        message: `${config.label} must be no more than ${val.maxLength} characters`
      };
    }
  }

  // Map options for select/radio inputs
  if (fieldDef.options) {
    config.options = fieldDef.options.map(option => ({
      value: option,
      label: option
    }));
  }

  // Set layout preferences based on field type and content
  config.fullWidth = shouldFieldBeFullWidth(fieldDef);
  config.colSpan = getFieldColumnSpan(fieldDef);

  return config;
}

/**
 * Maps FieldDefinition type to HTML input type
 */
function mapFieldTypeToInputType(fieldType: FieldDefinition['type']): FormFieldConfig['inputType'] {
  switch (fieldType) {
    case 'text':
      return 'text';
    case 'email':
      return 'email';
    case 'tel':
      return 'tel';
    case 'date':
      return 'date';
    case 'number':
      return 'number';
    case 'select':
      return 'select';
    case 'radio':
      return 'radio';
    case 'checkbox':
      return 'checkbox';
    case 'boolean':
      return 'checkbox';
    case 'array':
      // Arrays might need special handling - for now treat as textarea
      return 'textarea';
    default:
      return 'text';
  }
}

/**
 * Determines if a field should take the full width of its container
 */
function shouldFieldBeFullWidth(fieldDef: FieldDefinition): boolean {
  // Addresses, long text fields, and textareas typically need full width
  const fullWidthTypes = ['array'];
  const fullWidthIds = ['address', 'streetAddress', 'street', 'notes', 'comments', 'description'];
  
  if (fullWidthTypes.includes(fieldDef.type)) {
    return true;
  }
  
  const fieldId = (fieldDef.id || fieldDef.name || '').toLowerCase();
  return fullWidthIds.some(id => fieldId.includes(id));
}

/**
 * Determines how many columns a field should span in a grid layout
 */
function getFieldColumnSpan(fieldDef: FieldDefinition): number {
  // Full width fields span all columns
  if (shouldFieldBeFullWidth(fieldDef)) {
    return 12; // Assuming 12-column grid
  }
  
  // Checkboxes and radio buttons can be smaller
  if (fieldDef.type === 'checkbox' || fieldDef.type === 'boolean') {
    return 6;
  }
  
  // Short fields can be half width
  const shortFieldIds = ['zip', 'zipcode', 'state', 'year', 'age'];
  const fieldId = (fieldDef.id || fieldDef.name || '').toLowerCase();
  if (shortFieldIds.some(id => fieldId.includes(id))) {
    return 6;
  }
  
  // Default to full width for most fields to ensure readability
  return 12;
}

/**
 * Maps an array of FieldDefinitions to FormFieldConfigs
 */
export function mapFieldsToFormConfigs(fields: Record<string, FieldDefinition>): FormFieldConfig[] {
  return Object.entries(fields).map(([key, fieldDef]) => {
    // Ensure the field has an ID
    if (!fieldDef.id && !fieldDef.name) {
      fieldDef.id = key;
    }
    return mapFieldDefinitionToFormConfig(fieldDef);
  });
}

/**
 * Groups form fields into logical sections for better UX
 */
export interface FieldSection {
  title: string;
  fields: FormFieldConfig[];
  description?: string;
}

export function groupFieldsIntoSections(fields: FormFieldConfig[]): FieldSection[] {
  const sections: Record<string, FormFieldConfig[]> = {
    'Personal Information': [],
    'Address Information': [],
    'Vehicle Information': [],
    'Contact Information': [],
    'Other Information': []
  };

  // Categorize fields based on their IDs/labels
  fields.forEach(field => {
    const fieldId = field.id.toLowerCase();
    const fieldLabel = field.label.toLowerCase();
    
    if (fieldId.includes('name') || fieldId.includes('dob') || fieldId.includes('birth') || 
        fieldId.includes('gender') || fieldId.includes('marital')) {
      sections['Personal Information'].push(field);
    } else if (fieldId.includes('address') || fieldId.includes('street') || fieldId.includes('city') || 
               fieldId.includes('state') || fieldId.includes('zip') || fieldId.includes('apt')) {
      sections['Address Information'].push(field);
    } else if (fieldId.includes('vehicle') || fieldId.includes('car') || fieldId.includes('year') || 
               fieldId.includes('make') || fieldId.includes('model') || fieldId.includes('vin')) {
      sections['Vehicle Information'].push(field);
    } else if (fieldId.includes('email') || fieldId.includes('phone') || fieldId.includes('contact')) {
      sections['Contact Information'].push(field);
    } else {
      sections['Other Information'].push(field);
    }
  });

  // Convert to array format and filter out empty sections
  return Object.entries(sections)
    .filter(([_, fields]) => fields.length > 0)
    .map(([title, fields]) => ({
      title,
      fields,
      description: getSectionDescription(title)
    }));
}

function getSectionDescription(sectionTitle: string): string | undefined {
  const descriptions: Record<string, string> = {
    'Personal Information': 'Basic personal details',
    'Address Information': 'Your current residential address',
    'Vehicle Information': 'Details about the vehicle you want to insure',
    'Contact Information': 'How we can reach you',
    'Other Information': 'Additional details needed for your quote'
  };
  
  return descriptions[sectionTitle];
}

/**
 * Common field validation patterns
 */
export const ValidationPatterns = {
  email: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
  phone: /^[\+]?[1-9][\d]{0,15}$/,
  zipCode: /^\d{5}(-\d{4})?$/,
  vin: /^[A-HJ-NPR-Z0-9]{17}$/i,
  ssn: /^\d{3}-?\d{2}-?\d{4}$/,
} as const;

/**
 * Applies common validation patterns based on field type and ID
 */
export function enhanceFieldValidation(config: FormFieldConfig): FormFieldConfig {
  const fieldId = config.id.toLowerCase();
  
  // Apply email pattern
  if (config.inputType === 'email' || fieldId.includes('email')) {
    config.validation.pattern = {
      value: ValidationPatterns.email,
      message: 'Please enter a valid email address'
    };
  }
  
  // Apply phone pattern
  if (config.inputType === 'tel' || fieldId.includes('phone')) {
    config.validation.pattern = {
      value: ValidationPatterns.phone,
      message: 'Please enter a valid phone number'
    };
  }
  
  // Apply ZIP code pattern
  if (fieldId.includes('zip')) {
    config.validation.pattern = {
      value: ValidationPatterns.zipCode,
      message: 'Please enter a valid ZIP code (e.g., 12345 or 12345-6789)'
    };
  }
  
  // Apply VIN pattern
  if (fieldId.includes('vin')) {
    config.validation.pattern = {
      value: ValidationPatterns.vin,
      message: 'Please enter a valid 17-character VIN'
    };
  }
  
  return config;
} 