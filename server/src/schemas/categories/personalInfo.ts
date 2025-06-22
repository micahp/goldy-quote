import { FieldDefinition } from '../../types/index.js';

export const personalInfoFields: Record<string, FieldDefinition> = {
  firstName: {
    id: 'firstName',
    name: 'First Name',
    type: 'text',
    required: true,
    placeholder: 'Enter your first name',
    validation: { minLength: 1, maxLength: 50 }
  },
  middleInitial: {
    id: 'middleInitial',
    name: 'Middle Initial',
    type: 'text',
    required: false,
    placeholder: 'M',
    validation: { maxLength: 1 }
  },
  lastName: {
    id: 'lastName',
    name: 'Last Name',
    type: 'text',
    required: true,
    placeholder: 'Enter your last name',
    validation: { minLength: 1, maxLength: 50 }
  },
  suffix: {
    id: 'suffix',
    name: 'Suffix',
    type: 'select',
    required: false,
    options: ['Jr.', 'Sr.', 'II', 'III', 'IV']
  },
  dateOfBirth: {
    id: 'dateOfBirth',
    name: 'Date of Birth',
    type: 'date',
    required: true,
    placeholder: 'MM/DD/YYYY'
  },
  gender: {
    id: 'gender',
    name: 'Gender',
    type: 'select',
    required: true,
    options: ['Male', 'Female', 'Non-binary', 'Prefer not to say']
  },
  maritalStatus: {
    id: 'maritalStatus',
    name: 'Marital Status',
    type: 'select',
    required: true,
    options: ['Single', 'Married', 'Civil Union', 'Divorced', 'Widowed', 'Separated']
  },
  email: {
    id: 'email',
    name: 'Email Address',
    type: 'email',
    required: true,
    placeholder: 'your.email@gmail.com',
    validation: { pattern: '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$' }
  },
  phone: {
    id: 'phone',
    name: 'Phone Number',
    type: 'tel',
    required: true,
    placeholder: '(555) 123-4567',
    validation: { pattern: '^\\(?([0-9]{3})\\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$' }
  }
}; 