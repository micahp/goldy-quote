import { describe, it, expect } from 'vitest';
import {
  mapFieldDefinitionToFormConfig,
  mapFieldsToFormConfigs,
  groupFieldsIntoSections,
  enhanceFieldValidation,
  validateFieldConfig,
  transformFormDataForSubmission,
  getFieldConfigById,
  filterFieldConfigs,
  sortFieldConfigs,
  ValidationPatterns,
  type FormFieldConfig
} from '../fieldMapping';
import type { FieldDefinition } from '../../hooks/useRequiredFieldsWebSocket';

describe('fieldMapping', () => {
  describe('mapFieldDefinitionToFormConfig', () => {
    it('should map basic field definition to form config', () => {
      const fieldDef: FieldDefinition = {
        id: 'firstName',
        name: 'firstName',
        label: 'First Name',
        type: 'text',
        required: true,
        placeholder: 'Enter your first name'
      };

      const result = mapFieldDefinitionToFormConfig(fieldDef);

      expect(result).toEqual({
        id: 'firstName',
        label: 'First Name',
        inputType: 'text',
        placeholder: 'Enter your first name',
        required: true,
        validation: {
          required: 'First Name is required',
          pattern: {
            value: ValidationPatterns.name,
            message: 'Please enter a valid name (letters, spaces, hyphens, and apostrophes only)'
          }
        },
        fullWidth: false,
        colSpan: 12,
        disabled: false
      });
    });

    it('should handle select fields with options', () => {
      const fieldDef: FieldDefinition = {
        id: 'gender',
        type: 'select',
        required: true,
        label: 'Gender',
        options: ['Male', 'Female', 'Non-Binary']
      };

      const result = mapFieldDefinitionToFormConfig(fieldDef);

      expect(result.inputType).toBe('select');
      expect(result.options).toEqual([
        { value: 'Male', label: 'Male' },
        { value: 'Female', label: 'Female' },
        { value: 'Non-Binary', label: 'Non-Binary' }
      ]);
    });

    it('should handle array fields with itemFields', () => {
      const fieldDef: FieldDefinition = {
        id: 'vehicles',
        type: 'array',
        required: true,
        label: 'Vehicles',
        itemFields: {
          year: { type: 'number', required: true, label: 'Year' },
          make: { type: 'text', required: true, label: 'Make' }
        }
      };

      const result = mapFieldDefinitionToFormConfig(fieldDef);

      expect(result.inputType).toBe('textarea'); // Fallback for arrays
      expect(result.itemFields).toHaveLength(2);
      expect(result.itemFields?.[0].id).toBe('year');
      expect(result.itemFields?.[1].id).toBe('make');
    });

    it('should handle validation rules', () => {
      const fieldDef: FieldDefinition = {
        id: 'age',
        type: 'number',
        required: true,
        label: 'Age',
        validation: {
          min: 16,
          max: 100
        }
      };

      const result = mapFieldDefinitionToFormConfig(fieldDef);

      expect(result.validation.min).toEqual({
        value: 16,
        message: 'Age must be at least 16'
      });
      expect(result.validation.max).toEqual({
        value: 100,
        message: 'Age must be no more than 100'
      });
    });
  });

  describe('mapFieldsToFormConfigs', () => {
    it('should map multiple field definitions', () => {
      const fields: Record<string, FieldDefinition> = {
        firstName: {
          type: 'text',
          required: true,
          label: 'First Name'
        },
        email: {
          type: 'email',
          required: true,
          label: 'Email'
        }
      };

      const result = mapFieldsToFormConfigs(fields);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('firstName');
      expect(result[1].id).toBe('email');
    });
  });

  describe('groupFieldsIntoSections', () => {
    it('should group fields into logical sections', () => {
      const fields: FormFieldConfig[] = [
        {
          id: 'firstName',
          label: 'First Name',
          inputType: 'text',
          required: true,
          validation: {},
          fullWidth: false,
          colSpan: 12,
          disabled: false
        },
        {
          id: 'email',
          label: 'Email',
          inputType: 'email',
          required: true,
          validation: {},
          fullWidth: false,
          colSpan: 12,
          disabled: false
        },
        {
          id: 'streetAddress',
          label: 'Street Address',
          inputType: 'text',
          required: true,
          validation: {},
          fullWidth: true,
          colSpan: 12,
          disabled: false
        },
        {
          id: 'vehicleYear',
          label: 'Vehicle Year',
          inputType: 'number',
          required: true,
          validation: {},
          fullWidth: false,
          colSpan: 6,
          disabled: false
        }
      ];

      const result = groupFieldsIntoSections(fields);

      expect(result).toHaveLength(4);
      
      const personalSection = result.find(s => s.title === 'Personal Information');
      const contactSection = result.find(s => s.title === 'Contact Information');
      const addressSection = result.find(s => s.title === 'Address Information');
      const vehicleSection = result.find(s => s.title === 'Vehicle Information');

      expect(personalSection?.fields).toHaveLength(1);
      expect(contactSection?.fields).toHaveLength(1);
      expect(addressSection?.fields).toHaveLength(1);
      expect(vehicleSection?.fields).toHaveLength(1);
    });

    it('should sort sections in logical order', () => {
      const fields: FormFieldConfig[] = [
        {
          id: 'vehicleYear',
          label: 'Vehicle Year',
          inputType: 'number',
          required: true,
          validation: {},
          fullWidth: false,
          colSpan: 6,
          disabled: false
        },
        {
          id: 'firstName',
          label: 'First Name',
          inputType: 'text',
          required: true,
          validation: {},
          fullWidth: false,
          colSpan: 12,
          disabled: false
        }
      ];

      const result = groupFieldsIntoSections(fields);

      expect(result[0].title).toBe('Personal Information');
      expect(result[1].title).toBe('Vehicle Information');
    });
  });

  describe('enhanceFieldValidation', () => {
    it('should add email validation pattern', () => {
      const config: FormFieldConfig = {
        id: 'email',
        label: 'Email',
        inputType: 'email',
        required: true,
        validation: {},
        fullWidth: false,
        colSpan: 12,
        disabled: false
      };

      const result = enhanceFieldValidation(config);

      expect(result.validation.pattern).toEqual({
        value: ValidationPatterns.email,
        message: 'Please enter a valid email address'
      });
    });

    it('should add phone validation pattern', () => {
      const config: FormFieldConfig = {
        id: 'phone',
        label: 'Phone',
        inputType: 'tel',
        required: true,
        validation: {},
        fullWidth: false,
        colSpan: 8,
        disabled: false
      };

      const result = enhanceFieldValidation(config);

      expect(result.validation.pattern).toEqual({
        value: ValidationPatterns.phoneUS,
        message: 'Please enter a valid phone number (e.g., 123-456-7890)'
      });
    });

    it('should add age validation for date of birth', () => {
      const config: FormFieldConfig = {
        id: 'dateOfBirth',
        label: 'Date of Birth',
        inputType: 'date',
        required: true,
        validation: {},
        fullWidth: false,
        colSpan: 12,
        disabled: false
      };

      const result = enhanceFieldValidation(config);

      expect(result.validation.validate?.age).toBeDefined();
      
      // Test the age validation function
      const ageValidator = result.validation.validate!.age;
      expect(ageValidator('2000-01-01')).toBe(true); // Valid age
      expect(ageValidator('2010-01-01')).toBe('Age must be between 16 and 100 years'); // Too young
      expect(ageValidator('1920-01-01')).toBe('Age must be between 16 and 100 years'); // Too old
    });
  });

  describe('validateFieldConfig', () => {
    it('should validate a correct field configuration', () => {
      const config: FormFieldConfig = {
        id: 'firstName',
        label: 'First Name',
        inputType: 'text',
        required: true,
        validation: {},
        fullWidth: false,
        colSpan: 12,
        disabled: false
      };

      const result = validateFieldConfig(config);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing required properties', () => {
      const config: FormFieldConfig = {
        id: '',
        label: '',
        inputType: 'text',
        required: true,
        validation: {},
        fullWidth: false,
        colSpan: 12,
        disabled: false
      };

      const result = validateFieldConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Field must have an ID');
      expect(result.errors).toContain('Field must have a label');
    });

    it('should detect missing options for select fields', () => {
      const config: FormFieldConfig = {
        id: 'gender',
        label: 'Gender',
        inputType: 'select',
        required: true,
        validation: {},
        fullWidth: false,
        colSpan: 12,
        disabled: false
      };

      const result = validateFieldConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Select and radio fields must have options');
    });
  });

  describe('transformFormDataForSubmission', () => {
    it('should transform form data correctly', () => {
      const formData = {
        firstName: 'John',
        age: '25',
        isActive: true,
        birthDate: '1998-01-01'
      };

      const fieldConfigs: FormFieldConfig[] = [
        {
          id: 'firstName',
          label: 'First Name',
          inputType: 'text',
          required: true,
          validation: {},
          fullWidth: false,
          colSpan: 12,
          disabled: false
        },
        {
          id: 'age',
          label: 'Age',
          inputType: 'number',
          required: true,
          validation: {},
          fullWidth: false,
          colSpan: 6,
          disabled: false
        },
        {
          id: 'isActive',
          label: 'Is Active',
          inputType: 'checkbox',
          required: false,
          validation: {},
          fullWidth: false,
          colSpan: 6,
          disabled: false
        },
        {
          id: 'birthDate',
          label: 'Birth Date',
          inputType: 'date',
          required: true,
          validation: {},
          fullWidth: false,
          colSpan: 12,
          disabled: false
        }
      ];

      const result = transformFormDataForSubmission(formData, fieldConfigs);

      expect(result).toEqual({
        firstName: 'John',
        age: 25, // Converted to number
        isActive: true, // Remains boolean
        birthDate: '1998-01-01' // Remains ISO date string
      });
    });
  });

  describe('utility functions', () => {
    const sampleConfigs: FormFieldConfig[] = [
      {
        id: 'firstName',
        label: 'First Name',
        inputType: 'text',
        required: true,
        validation: {},
        fullWidth: false,
        colSpan: 12,
        disabled: false
      },
      {
        id: 'email',
        label: 'Email',
        inputType: 'email',
        required: false,
        validation: {},
        fullWidth: false,
        colSpan: 12,
        disabled: false
      },
      {
        id: 'gender',
        label: 'Gender',
        inputType: 'select',
        required: true,
        validation: {},
        fullWidth: false,
        colSpan: 6,
        disabled: false,
        options: [
          { value: 'male', label: 'Male' },
          { value: 'female', label: 'Female' }
        ]
      }
    ];

    describe('getFieldConfigById', () => {
      it('should find field by ID', () => {
        const result = getFieldConfigById(sampleConfigs, 'email');
        expect(result?.id).toBe('email');
      });

      it('should return undefined for non-existent ID', () => {
        const result = getFieldConfigById(sampleConfigs, 'nonExistent');
        expect(result).toBeUndefined();
      });
    });

    describe('filterFieldConfigs', () => {
      it('should filter by input type', () => {
        const result = filterFieldConfigs(sampleConfigs, { inputType: 'text' });
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('firstName');
      });

      it('should filter by required status', () => {
        const result = filterFieldConfigs(sampleConfigs, { required: true });
        expect(result).toHaveLength(2);
        expect(result.map(c => c.id)).toEqual(['firstName', 'gender']);
      });
    });

    describe('sortFieldConfigs', () => {
      it('should sort by label', () => {
        const result = sortFieldConfigs(sampleConfigs, 'label');
        expect(result.map(c => c.label)).toEqual(['Email', 'First Name', 'Gender']);
      });

      it('should sort by required status', () => {
        const result = sortFieldConfigs(sampleConfigs, 'required');
        expect(result[0].required).toBe(true);
        expect(result[1].required).toBe(true);
        expect(result[2].required).toBe(false);
      });

      it('should sort by custom order', () => {
        const customOrder = ['gender', 'firstName', 'email'];
        const result = sortFieldConfigs(sampleConfigs, 'custom', customOrder);
        expect(result.map(c => c.id)).toEqual(['gender', 'firstName', 'email']);
      });
    });
  });

  describe('ValidationPatterns', () => {
    it('should validate email addresses', () => {
      expect(ValidationPatterns.email.test('test@example.com')).toBe(true);
      expect(ValidationPatterns.email.test('invalid-email')).toBe(false);
    });

    it('should validate US phone numbers', () => {
      expect(ValidationPatterns.phoneUS.test('123-456-7890')).toBe(true);
      expect(ValidationPatterns.phoneUS.test('(123) 456-7890')).toBe(true);
      expect(ValidationPatterns.phoneUS.test('123.456.7890')).toBe(true);
      expect(ValidationPatterns.phoneUS.test('invalid-phone')).toBe(false);
    });

    it('should validate ZIP codes', () => {
      expect(ValidationPatterns.zipCodeUS.test('12345')).toBe(true);
      expect(ValidationPatterns.zipCodeUS.test('12345-6789')).toBe(true);
      expect(ValidationPatterns.zipCodeUS.test('invalid-zip')).toBe(false);
    });

    it('should validate VIN numbers', () => {
      expect(ValidationPatterns.vin.test('1HGBH41JXMN109186')).toBe(true);
      expect(ValidationPatterns.vin.test('invalid-vin')).toBe(false);
    });

    it('should validate names', () => {
      expect(ValidationPatterns.name.test('John Doe')).toBe(true);
      expect(ValidationPatterns.name.test("O'Connor")).toBe(true);
      expect(ValidationPatterns.name.test('Jean-Pierre')).toBe(true);
      expect(ValidationPatterns.name.test('123Invalid')).toBe(false);
    });
  });
}); 