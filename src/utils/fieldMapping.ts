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
    validate?: Record<string, (value: any) => boolean | string>;
  };
  /** Default value */
  defaultValue?: any;
  /** Whether the field spans full width */
  fullWidth?: boolean;
  /** Grid column span (for responsive layouts) */
  colSpan?: number;
  /** For array fields - defines the structure of each item */
  itemFields?: FormFieldConfig[];
  /** Whether this field is disabled */
  disabled?: boolean;
  /** Help text or description */
  description?: string;
  /** Field category for grouping */
  category?: string;
}

/**
 * Configuration for array field items
 */
export interface ArrayFieldConfig extends FormFieldConfig {
  itemFields: FormFieldConfig[];
  minItems?: number;
  maxItems?: number;
}

/**
 * Maps a FieldDefinition to the appropriate form input type
 */
export function mapFieldToInputType(field: FieldDefinition): string {
  switch (field.type) {
    case 'text':
      return 'text';
    case 'email':
      return 'email';
    case 'tel':
      return 'tel';
    case 'number':
      return 'number';
    case 'date':
      return 'date';
    case 'boolean':
      return 'checkbox';
    case 'select':
      return 'select';
    case 'radio':
      return 'radio';
    case 'checkbox':
      return 'checkbox';
    case 'array':
      return 'array'; // Special handling for arrays
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
        message: 'Invalid format'
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

  // Add custom validation functions
  rules.validate = {};

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
  // FieldDefinition doesn't have defaultValue property, so we'll derive it from type
  switch (field.type) {
    case 'boolean':
      return false;
    case 'number':
      return '';
    case 'select':
    case 'radio':
      return field.options?.[0] || '';
    case 'array':
      return [];
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
    name: normalizeFieldName(field.name || field.id || 'unknown'),
    type: mapFieldToInputType(field),
    label: field.label || field.name,
    placeholder: field.placeholder,
    required: field.required || false,
    disabled: false, // FieldDefinition doesn't have disabled property
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
    disabled: false, // FieldDefinition doesn't have disabled property
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

  // Handle array fields with itemFields
  if (fieldDef.type === 'array' && fieldDef.itemFields) {
    config.itemFields = Object.entries(fieldDef.itemFields).map(([key, itemFieldDef]) => {
      const itemField = { ...itemFieldDef };
      if (!itemField.id && !itemField.name) {
        itemField.id = key;
      }
      return mapFieldDefinitionToFormConfig(itemField);
    });
  }

  // Set layout preferences based on field type and content
  config.fullWidth = shouldFieldBeFullWidth(fieldDef);
  config.colSpan = getFieldColumnSpan(fieldDef);

  // Apply enhanced validation patterns
  enhanceFieldValidation(config);

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
      // Arrays need special handling in the form component
      return 'textarea'; // Fallback for now
    default:
      return 'text';
  }
}

/**
 * Determines if a field should take the full width of its container
 */
function shouldFieldBeFullWidth(fieldDef: FieldDefinition): boolean {
  // Arrays, addresses, long text fields, and textareas typically need full width
  const fullWidthTypes = ['array', 'textarea'];
  const fullWidthIds = ['address', 'streetAddress', 'street', 'notes', 'comments', 'description', 'vehicles', 'drivers'];
  
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
  const shortFieldIds = ['zip', 'zipcode', 'state', 'year', 'age', 'apt', 'suite'];
  const fieldId = (fieldDef.id || fieldDef.name || '').toLowerCase();
  if (shortFieldIds.some(id => fieldId.includes(id))) {
    return 6;
  }
  
  // Medium fields can be 8 columns
  const mediumFieldIds = ['city', 'phone', 'email'];
  if (mediumFieldIds.some(id => fieldId.includes(id))) {
    return 8;
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
  order: number;
}

export function groupFieldsIntoSections(fields: FormFieldConfig[]): FieldSection[] {
  const sections: Record<string, FormFieldConfig[]> = {
    'Personal Information': [],
    'Address Information': [],
    'Vehicle Information': [],
    'Driver Information': [],
    'Contact Information': [],
    'Coverage Information': [],
    'Other Information': []
  };

  // Categorize fields based on their IDs/labels
  fields.forEach(field => {
    const fieldId = field.id.toLowerCase();
    const fieldLabel = field.label.toLowerCase();
    
    if (fieldId.includes('name') || fieldId.includes('dob') || fieldId.includes('birth') || 
        fieldId.includes('gender') || fieldId.includes('marital') || fieldId.includes('date')) {
      sections['Personal Information'].push(field);
    } else if (fieldId.includes('address') || fieldId.includes('street') || fieldId.includes('city') || 
               fieldId.includes('state') || fieldId.includes('zip') || fieldId.includes('apt') ||
               fieldId.includes('housing') || fieldId.includes('residence')) {
      sections['Address Information'].push(field);
    } else if (fieldId.includes('vehicle') || fieldId.includes('car') || fieldId.includes('year') || 
               fieldId.includes('make') || fieldId.includes('model') || fieldId.includes('vin') ||
               fieldId.includes('mileage') || fieldId.includes('ownership') || fieldId.includes('use')) {
      sections['Vehicle Information'].push(field);
    } else if (fieldId.includes('driver') || fieldId.includes('license') || fieldId.includes('violation') ||
               fieldId.includes('accident') || fieldId.includes('education') || fieldId.includes('employment') ||
               fieldId.includes('occupation')) {
      sections['Driver Information'].push(field);
    } else if (fieldId.includes('email') || fieldId.includes('phone') || fieldId.includes('contact')) {
      sections['Contact Information'].push(field);
    } else if (fieldId.includes('coverage') || fieldId.includes('liability') || fieldId.includes('deductible') ||
               fieldId.includes('insurance') || fieldId.includes('policy')) {
      sections['Coverage Information'].push(field);
    } else {
      sections['Other Information'].push(field);
    }
  });

  // Convert to array format and filter out empty sections
  const sectionOrder = {
    'Personal Information': 1,
    'Contact Information': 2,
    'Address Information': 3,
    'Vehicle Information': 4,
    'Driver Information': 5,
    'Coverage Information': 6,
    'Other Information': 7
  };

  return Object.entries(sections)
    .filter(([_, fields]) => fields.length > 0)
    .map(([title, fields]) => ({
      title,
      fields,
      description: getSectionDescription(title),
      order: sectionOrder[title as keyof typeof sectionOrder] || 99
    }))
    .sort((a, b) => a.order - b.order);
}

function getSectionDescription(sectionTitle: string): string | undefined {
  const descriptions: Record<string, string> = {
    'Personal Information': 'Basic personal details',
    'Contact Information': 'How we can reach you',
    'Address Information': 'Your current residential address',
    'Vehicle Information': 'Details about the vehicle you want to insure',
    'Driver Information': 'Your driving history and background',
    'Coverage Information': 'Insurance coverage preferences',
    'Other Information': 'Additional details needed for your quote'
  };
  
  return descriptions[sectionTitle];
}

/**
 * Common field validation patterns
 */
export const ValidationPatterns = {
  email: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
  phone: /^[+]?\d{1,16}$/,
  phoneUS: /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/,
  zipCode: /^\d{5}(-\d{4})?$/,
  zipCodeUS: /^\d{5}(-\d{4})?$/,
  zipCodeCA: /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/,
  vin: /^[A-HJ-NPR-Z0-9]{17}$/i,
  ssn: /^\d{3}-?\d{2}-?\d{4}$/,
  date: /^\d{4}-\d{2}-\d{2}$/,
  dateUS: /^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/\d{4}$/,
  name: /^[a-zA-Z\s'-]{2,50}$/,
  alphanumeric: /^[a-zA-Z0-9\s]+$/,
  numeric: /^\d+$/,
  decimal: /^\d+(\.\d{1,2})?$/,
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
      value: ValidationPatterns.phoneUS,
      message: 'Please enter a valid phone number (e.g., 123-456-7890)'
    };
  }
  
  // Apply ZIP code pattern
  if (fieldId.includes('zip')) {
    config.validation.pattern = {
      value: ValidationPatterns.zipCodeUS,
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

  // Apply name pattern
  if (fieldId.includes('name')) {
    config.validation.pattern = {
      value: ValidationPatterns.name,
      message: 'Please enter a valid name (letters, spaces, hyphens, and apostrophes only)'
    };
  }

  // Apply date validation
  if (config.inputType === 'date') {
    config.validation.validate = config.validation.validate || {};
    
    if (fieldId.includes('birth') || fieldId.includes('dob')) {
      config.validation.validate.age = (value: string) => {
        if (!value) return true;
        const birthDate = new Date(value);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        
        return age >= 16 && age <= 100 || 'Age must be between 16 and 100 years';
      };
    }
  }

  // Apply numeric validation for number fields
  if (config.inputType === 'number') {
    if (fieldId.includes('mileage')) {
      config.validation.min = { value: 0, message: 'Mileage cannot be negative' };
      config.validation.max = { value: 100000, message: 'Mileage seems unrealistic' };
    }
    
    if (fieldId.includes('year')) {
      const currentYear = new Date().getFullYear();
      config.validation.min = { value: 1900, message: 'Year must be 1900 or later' };
      config.validation.max = { value: currentYear + 1, message: `Year cannot be later than ${currentYear + 1}` };
    }
  }
  
  return config;
}

/**
 * Validates a form field configuration for completeness and correctness
 */
export function validateFieldConfig(config: FormFieldConfig): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config.id) {
    errors.push('Field must have an ID');
  }

  if (!config.label) {
    errors.push('Field must have a label');
  }

  if (!config.inputType) {
    errors.push('Field must have an input type');
  }

  if ((config.inputType === 'select' || config.inputType === 'radio') && (!config.options || config.options.length === 0)) {
    errors.push('Select and radio fields must have options');
  }

  if (config.validation.min && config.validation.max && config.validation.min.value > config.validation.max.value) {
    errors.push('Minimum value cannot be greater than maximum value');
  }

  if (config.validation.minLength && config.validation.maxLength && config.validation.minLength.value > config.validation.maxLength.value) {
    errors.push('Minimum length cannot be greater than maximum length');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Converts form data to the format expected by the backend
 */
export function transformFormDataForSubmission(
  formData: Record<string, any>, 
  fieldConfigs: FormFieldConfig[]
): Record<string, any> {
  const transformed: Record<string, any> = {};

  fieldConfigs.forEach(config => {
    const value = formData[config.id];
    
    if (value !== undefined && value !== null && value !== '') {
      switch (config.inputType) {
        case 'number':
          transformed[config.id] = typeof value === 'string' ? parseFloat(value) : value;
          break;
        case 'checkbox':
          transformed[config.id] = Boolean(value);
          break;
        case 'date':
          // Ensure date is in ISO format
          if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}$/)) {
            transformed[config.id] = value;
          } else if (value instanceof Date) {
            transformed[config.id] = value.toISOString().split('T')[0];
          }
          break;
        default:
          transformed[config.id] = value;
      }
    }
  });

  return transformed;
}

/**
 * Gets field configuration by ID
 */
export function getFieldConfigById(configs: FormFieldConfig[], id: string): FormFieldConfig | undefined {
  return configs.find(config => config.id === id);
}

/**
 * Filters field configurations by category or type
 */
export function filterFieldConfigs(
  configs: FormFieldConfig[], 
  criteria: { 
    inputType?: FormFieldConfig['inputType'];
    required?: boolean;
    category?: string;
  }
): FormFieldConfig[] {
  return configs.filter(config => {
    if (criteria.inputType && config.inputType !== criteria.inputType) {
      return false;
    }
    if (criteria.required !== undefined && config.required !== criteria.required) {
      return false;
    }
    if (criteria.category && config.category !== criteria.category) {
      return false;
    }
    return true;
  });
}

/**
 * Sorts field configurations by a specified order
 */
export function sortFieldConfigs(
  configs: FormFieldConfig[], 
  sortBy: 'label' | 'id' | 'required' | 'custom',
  customOrder?: string[]
): FormFieldConfig[] {
  const sorted = [...configs];
  
  switch (sortBy) {
    case 'label':
      return sorted.sort((a, b) => a.label.localeCompare(b.label));
    case 'id':
      return sorted.sort((a, b) => a.id.localeCompare(b.id));
    case 'required':
      return sorted.sort((a, b) => {
        if (a.required === b.required) return 0;
        return a.required ? -1 : 1; // Required fields first
      });
    case 'custom':
      if (!customOrder) return sorted;
      return sorted.sort((a, b) => {
        const aIndex = customOrder.indexOf(a.id);
        const bIndex = customOrder.indexOf(b.id);
        if (aIndex === -1 && bIndex === -1) return 0;
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
      });
    default:
      return sorted;
  }
} 