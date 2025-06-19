import { FieldDefinition, UnifiedFieldSchema } from '../types/index.js';

export const createUnifiedSchema = (): UnifiedFieldSchema => ({
  personalInfo: {
    firstName: {
      id: 'firstName',
      name: 'First Name',
      type: 'text',
      required: true,
      placeholder: 'Enter your first name',
      validation: {
        minLength: 1,
        maxLength: 50
      }
    },
    lastName: {
      id: 'lastName',
      name: 'Last Name', 
      type: 'text',
      required: true,
      placeholder: 'Enter your last name',
      validation: {
        minLength: 1,
        maxLength: 50
      }
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
      options: ['Male', 'Female', 'Other']
    },
    maritalStatus: {
      id: 'maritalStatus',
      name: 'Marital Status',
      type: 'select',
      required: true,
      options: ['Single', 'Married', 'Divorced', 'Widowed', 'Separated']
    },
    email: {
      id: 'email',
      name: 'Email Address',
      type: 'email',
      required: true,
      placeholder: 'your.email@example.com',
      validation: {
        pattern: '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$'
      }
    },
    phone: {
      id: 'phone',
      name: 'Phone Number',
      type: 'tel',
      required: true,
      placeholder: '(555) 123-4567',
      validation: {
        pattern: '^\\(?([0-9]{3})\\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$'
      }
    }
  },
  address: {
    streetAddress: {
      id: 'streetAddress',
      name: 'Street Address',
      type: 'text',
      required: true,
      placeholder: '123 Main Street',
      validation: {
        minLength: 5,
        maxLength: 100
      }
    },
    apt: {
      id: 'apt',
      name: 'Apartment/Unit #',
      type: 'text',
      required: false,
      placeholder: 'Apt 2B',
      validation: {
        maxLength: 20
      }
    },
    city: {
      id: 'city',
      name: 'City',
      type: 'text',
      required: true,
      placeholder: 'Your city',
      validation: {
        minLength: 1,
        maxLength: 50
      }
    },
    state: {
      id: 'state',
      name: 'State',
      type: 'select',
      required: true,
      options: [
        'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
        'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
        'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
        'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
        'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
      ]
    },
    zipCode: {
      id: 'zipCode',
      name: 'ZIP Code',
      type: 'text',
      required: true,
      placeholder: '12345',
      validation: {
        pattern: '^[0-9]{5}$',
        minLength: 5,
        maxLength: 5
      }
    }
  },
  vehicle: {
    year: {
      id: 'vehicleYear',
      name: 'Vehicle Year',
      type: 'select',
      required: true,
      options: generateYearOptions()
    },
    make: {
      id: 'vehicleMake',
      name: 'Vehicle Make',
      type: 'select',
      required: true,
      options: [
        'Acura', 'Audi', 'BMW', 'Buick', 'Cadillac', 'Chevrolet', 'Chrysler',
        'Dodge', 'Ford', 'GMC', 'Honda', 'Hyundai', 'Infiniti', 'Jeep',
        'Kia', 'Lexus', 'Lincoln', 'Mazda', 'Mercedes-Benz', 'Mitsubishi',
        'Nissan', 'Pontiac', 'Porsche', 'Ram', 'Subaru', 'Toyota', 'Volkswagen', 'Volvo'
      ]
    },
    model: {
      id: 'vehicleModel',
      name: 'Vehicle Model',
      type: 'text',
      required: true,
      placeholder: 'e.g., Camry, Accord, F-150'
    },
    trim: {
      id: 'vehicleTrim',
      name: 'Vehicle Trim',
      type: 'text',
      required: false,
      placeholder: 'e.g., LX, Sport, Premium'
    },
    vin: {
      id: 'vehicleVin',
      name: 'VIN (Vehicle Identification Number)',
      type: 'text',
      required: false,
      placeholder: '17-character VIN',
      validation: {
        pattern: '^[A-HJ-NPR-Z0-9]{17}$',
        minLength: 17,
        maxLength: 17
      }
    },
    annualMileage: {
      id: 'annualMileage',
      name: 'Annual Mileage',
      type: 'select',
      required: true,
      options: [
        'Less than 5,000',
        '5,000 - 7,500',
        '7,500 - 10,000',
        '10,000 - 12,500',
        '12,500 - 15,000',
        '15,000 - 20,000',
        '20,000 - 25,000',
        'More than 25,000'
      ]
    },
    primaryUse: {
      id: 'primaryUse',
      name: 'Primary Use',
      type: 'select',
      required: true,
      options: [
        'Commuting to work/school',
        'Business use',
        'Pleasure/Personal use',
        'Farm/Ranch use'
      ]
    },
    ownership: {
      id: 'ownership',
      name: 'Vehicle Ownership',
      type: 'select',
      required: true,
      options: [
        'Own',
        'Lease',
        'Finance'
      ]
    }
  },
  drivingHistory: {
    licenseAge: {
      id: 'licenseAge',
      name: 'Years Licensed',
      type: 'select',
      required: true,
      options: [
        'Less than 1 year',
        '1-2 years',
        '3-5 years',
        '6-10 years',
        '11-15 years',
        'More than 15 years'
      ]
    },
    accidents: {
      id: 'accidents',
      name: 'Accidents in Last 5 Years',
      type: 'select',
      required: true,
      options: ['0', '1', '2', '3', '4+']
    },
    violations: {
      id: 'violations',
      name: 'Moving Violations in Last 5 Years',
      type: 'select',
      required: true,
      options: ['0', '1', '2', '3', '4+']
    },
    continuousCoverage: {
      id: 'continuousCoverage',
      name: 'Continuous Insurance Coverage',
      type: 'select',
      required: true,
      options: [
        'Currently insured',
        'Lapsed within 30 days',
        'Lapsed 31-90 days',
        'Lapsed more than 90 days',
        'Never insured'
      ]
    },
    currentInsurer: {
      id: 'currentInsurer',
      name: 'Current Insurance Company',
      type: 'text',
      required: false,
      placeholder: 'Current insurer name'
    }
  },
  coverage: {
    liabilityLimit: {
      id: 'liabilityLimit',
      name: 'Liability Coverage Limit',
      type: 'select',
      required: true,
      options: [
        'State Minimum',
        '25/50/25',
        '50/100/50',
        '100/300/100',
        '250/500/250',
        '500/500/500'
      ]
    },
    collisionDeductible: {
      id: 'collisionDeductible',
      name: 'Collision Deductible',
      type: 'select',
      required: true,
      options: ['$250', '$500', '$1,000', '$2,500', 'No Coverage']
    },
    comprehensiveDeductible: {
      id: 'comprehensiveDeductible',
      name: 'Comprehensive Deductible',
      type: 'select',
      required: true,
      options: ['$250', '$500', '$1,000', '$2,500', 'No Coverage']
    },
    medicalPayments: {
      id: 'medicalPayments',
      name: 'Medical Payments Coverage',
      type: 'select',
      required: true,
      options: ['$1,000', '$2,500', '$5,000', '$10,000', 'No Coverage']
    },
    uninsuredMotorist: {
      id: 'uninsuredMotorist',
      name: 'Uninsured Motorist Coverage',
      type: 'select',
      required: true,
      options: [
        'State Minimum',
        '25/50',
        '50/100',
        '100/300',
        '250/500',
        'No Coverage'
      ]
    }
  }
});

// Helper function to generate year options (current year back to 1990)
function generateYearOptions(): string[] {
  const currentYear = new Date().getFullYear();
  const years: string[] = [];
  
  for (let year = currentYear + 1; year >= 1990; year--) {
    years.push(year.toString());
  }
  
  return years;
}

// Function to merge required fields for multiple carriers
export function mergeCarrierFields(carrierFields: Record<string, FieldDefinition>[]): Record<string, FieldDefinition> {
  const merged: Record<string, FieldDefinition> = {};
  
  carrierFields.forEach(fields => {
    Object.entries(fields).forEach(([id, field]) => {
      if (!merged[id]) {
        merged[id] = field;
      }
    });
  });
  
  return merged;
}

// Function to get fields for a specific category
export function getFieldsByCategory(schema: UnifiedFieldSchema, category: keyof UnifiedFieldSchema): Record<string, FieldDefinition> {
  return schema[category];
}

// Function to get all fields flattened
export function getAllFields(schema: UnifiedFieldSchema): Record<string, FieldDefinition> {
  const allFields: Record<string, FieldDefinition> = {};
  
  Object.values(schema).forEach(categoryFields => {
    Object.entries(categoryFields).forEach(([id, field]) => {
      allFields[id] = field as FieldDefinition;
    });
  });
  
  return allFields;
} 