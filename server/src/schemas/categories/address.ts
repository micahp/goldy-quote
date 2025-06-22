import { FieldDefinition } from '../../types/index.js';

export const addressFields: Record<string, FieldDefinition> = {
  streetAddress: {
    id: 'streetAddress',
    name: 'Street Address',
    type: 'text',
    required: true,
    placeholder: '123 Main Street',
    validation: { minLength: 5, maxLength: 100 }
  },
  apt: {
    id: 'apt',
    name: 'Apartment/Unit #',
    type: 'text',
    required: false,
    placeholder: 'Apt 2B',
    validation: { maxLength: 20 }
  },
  city: {
    id: 'city',
    name: 'City',
    type: 'text',
    required: true,
    placeholder: 'Your city',
    validation: { minLength: 1, maxLength: 50 }
  },
  state: {
    id: 'state',
    name: 'State',
    type: 'select',
    required: true,
    options: [
      'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
      'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
      'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'
    ]
  },
  zipCode: {
    id: 'zipCode',
    name: 'ZIP Code',
    type: 'text',
    required: true,
    placeholder: '12345',
    validation: { pattern: '^[0-9]{5}$', minLength: 5, maxLength: 5 }
  },
  housingType: {
    id: 'housingType',
    name: 'Housing Type',
    type: 'select',
    required: true,
    options: ['Own house', 'Rent house', 'Apartment', 'Condo', 'Mobile home', 'Other']
  },
  residenceDuration: {
    id: 'residenceDuration',
    name: 'How long have you lived at this address?',
    type: 'select',
    required: true,
    options: ['Less than 3 months','3-6 months','6 months - 1 year','1-3 years','More than 3 years']
  }
}; 