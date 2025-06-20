import { FieldDefinition, UnifiedFieldSchema } from '../types/index.js';

// Enhanced unified schema that captures ALL fields needed across carriers
// Based on documentation analysis from Progressive, State Farm, Liberty Mutual, and GEICO
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
    middleInitial: {
      id: 'middleInitial',
      name: 'Middle Initial',
      type: 'text',
      required: false,
      placeholder: 'M',
      validation: {
        maxLength: 1
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
      options: ['Less than 3 months', '3-6 months', '6 months - 1 year', '1-3 years', 'More than 3 years']
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
      name: 'Vehicle Trim/Body Style',
      type: 'text',
      required: false,
      placeholder: 'e.g., LX 4D SED GAS, Sport, Premium'
    },
    vin: {
      id: 'vehicleVin',
      name: 'VIN (Vehicle Identification Number)',
      type: 'text',
      required: false,
      placeholder: '17-character VIN (optional)',
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
    commuteMiles: {
      id: 'commuteMiles',
      name: 'Miles to Work/School (One Way)',
      type: 'select',
      required: true,
      options: [
        'Work from home',
        'Less than 5 miles',
        '5-10 miles',
        '11-15 miles',
        '16-25 miles',
        '26-50 miles',
        'More than 50 miles'
      ]
    },
    primaryUse: {
      id: 'primaryUse',
      name: 'Primary Use',
      type: 'select',
      required: true,
      options: [
        'Pleasure (recreational, errands)',
        'Commuting to work/school',
        'Business use',
        'Farm/Ranch use'
      ]
    },
    ownership: {
      id: 'ownership',
      name: 'Vehicle Ownership',
      type: 'select',
      required: true,
      options: [
        'Own (fully paid off)',
        'Finance (making payments)',
        'Lease'
      ]
    },
    purchaseDate: {
      id: 'purchaseDate',
      name: 'When did you acquire this vehicle?',
      type: 'date',
      required: false,
      placeholder: 'MM/DD/YYYY'
    },
    antiTheftDevice: {
      id: 'antiTheftDevice',
      name: 'Anti-Theft Device',
      type: 'radio',
      required: true,
      options: ['Yes', 'No']
    },
    rideshareUsage: {
      id: 'rideshareUsage',
      name: 'Rideshare/Delivery Usage',
      type: 'select',
      required: true,
      options: [
        'No',
        'Yes, less than 50% of time',
        'Yes, 50% or more of time'
      ]
    },
    trackingDevice: {
      id: 'trackingDevice',
      name: 'GPS Tracking Device',
      type: 'radio',
      required: true,
      options: ['Yes', 'No']
    }
  },
  drivingHistory: {
    licenseAge: {
      id: 'licenseAge',
      name: 'Age When First Licensed',
      type: 'select',
      required: true,
      options: [
        '14', '15', '16', '17', '18', '19', '20', '21-25', '26-30', '31+'
      ]
    },
    yearsLicensed: {
      id: 'yearsLicensed',
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
    foreignLicense: {
      id: 'foreignLicense',
      name: 'Ever had a foreign license?',
      type: 'radio',
      required: true,
      options: ['Yes', 'No']
    },
    licenseIssues: {
      id: 'licenseIssues',
      name: 'License Issues (last 3 years)',
      type: 'select',
      required: true,
      options: [
        'No issues',
        'License suspended',
        'License revoked',
        'License surrendered voluntarily'
      ]
    },
    accidents: {
      id: 'accidents',
      name: 'At-Fault Accidents (Last 5 Years)',
      type: 'select',
      required: true,
      options: ['0', '1', '2', '3', '4+']
    },
    violations: {
      id: 'violations',
      name: 'Moving Violations/Tickets (Last 5 Years)',
      type: 'select',
      required: true,
      options: ['0', '1', '2', '3', '4+']
    },
    majorViolations: {
      id: 'majorViolations',
      name: 'Major Violations (DUI/DWI, Reckless Driving)',
      type: 'select',
      required: true,
      options: ['None', '1', '2', '3+']
    },
    continuousCoverage: {
      id: 'continuousCoverage',
      name: 'Continuous Insurance Coverage',
      type: 'select',
      required: true,
      options: [
        'Currently insured (3+ years)',
        'Currently insured (1-3 years)',
        'Currently insured (less than 1 year)',
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
      placeholder: 'Current insurer name (if any)'
    },
    currentLiabilityLimits: {
      id: 'currentLiabilityLimits',
      name: 'Current Liability Limits',
      type: 'select',
      required: false,
      options: [
        'State Minimum',
        '$25,000/$50,000',
        '$50,000/$100,000',
        '$100,000/$300,000',
        '$250,000/$500,000',
        '$500,000/$1,000,000',
        'I don\'t know'
      ]
    }
  },
  demographics: {
    education: {
      id: 'education',
      name: 'Highest Education Level',
      type: 'select',
      required: true,
      options: [
        'High school diploma/equivalent',
        'Vocational school',
        'Associate degree/some college',
        'Bachelor\'s degree',
        'Master\'s, Ph.D., J.D., etc.',
        'Other'
      ]
    },
    employmentStatus: {
      id: 'employmentStatus',
      name: 'Employment Status',
      type: 'select',
      required: true,
      options: [
        'Employed/Self-employed (full- or part-time)',
        'Retired',
        'Student',
        'Homemaker',
        'In the military',
        'Not seeking employment',
        'Unemployed'
      ]
    },
    occupation: {
      id: 'occupation',
      name: 'Occupation',
      type: 'text',
      required: false,
      placeholder: 'e.g., Teacher, Engineer, Manager'
    },
    industry: {
      id: 'industry',
      name: 'Industry',
      type: 'text',
      required: false,
      placeholder: 'e.g., Education, Technology, Healthcare'
    },
    militaryAffiliation: {
      id: 'militaryAffiliation',
      name: 'Military/Government Affiliation',
      type: 'select',
      required: false,
      options: [
        'None',
        'Active Military',
        'Military Veteran',
        'Military Reserves/National Guard',
        'Federal Employee',
        'State/Local Government Employee'
      ]
    }
  },
  coverage: {
    liabilityLimit: {
      id: 'liabilityLimit',
      name: 'Preferred Liability Coverage',
      type: 'select',
      required: true,
      options: [
        'State Minimum',
        '25/50/25 ($25K/$50K/$25K)',
        '50/100/50 ($50K/$100K/$50K)',
        '100/300/100 ($100K/$300K/$100K)',
        '250/500/250 ($250K/$500K/$250K)',
        '500/500/500 ($500K/$500K/$500K)'
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
    },
    rentalCoverage: {
      id: 'rentalCoverage',
      name: 'Rental Car Coverage',
      type: 'select',
      required: true,
      options: [
        'No Coverage',
        '$30/day, $900 max',
        '$50/day, $1,500 max',
        '$75/day, $2,250 max'
      ]
    },
    roadsideAssistance: {
      id: 'roadsideAssistance',
      name: 'Roadside Assistance',
      type: 'radio',
      required: true,
      options: ['Yes', 'No']
    }
  }
});

// Generate year options for vehicles (current year + 1 down to 1990)
function generateYearOptions(): string[] {
  const currentYear = new Date().getFullYear();
  const years: string[] = [];
  
  for (let year = currentYear + 1; year >= 1990; year--) {
    years.push(year.toString());
  }
  
  return years;
}

// Merge multiple carrier field definitions into a unified set
export function mergeCarrierFields(carrierFields: Record<string, FieldDefinition>[]): Record<string, FieldDefinition> {
  const merged: Record<string, FieldDefinition> = {};
  
  carrierFields.forEach(fields => {
    Object.entries(fields).forEach(([key, field]) => {
      if (!merged[key] || field.required) {
        merged[key] = field;
      }
    });
  });
  
  return merged;
}

// Get fields by category for progressive disclosure
export function getFieldsByCategory(schema: UnifiedFieldSchema, category: keyof UnifiedFieldSchema): Record<string, FieldDefinition> {
  return schema[category];
}

// Get all fields flattened into a single object
export function getAllFields(schema: UnifiedFieldSchema): Record<string, FieldDefinition> {
  const allFields: Record<string, FieldDefinition> = {};
  
  Object.values(schema).forEach(category => {
    Object.entries(category).forEach(([key, field]) => {
      allFields[key] = field;
    });
  });
  
  return allFields;
}

// Create progressive form steps for better UX
export function createProgressiveFormSteps(): Array<{
  id: string;
  title: string;
  description: string;
  categories: (keyof UnifiedFieldSchema)[];
  fields: string[];
}> {
  return [
    {
      id: 'basic_info',
      title: 'Basic Information',
      description: 'Tell us about yourself to get started',
      categories: ['personalInfo', 'address'],
      fields: [
        'firstName', 'lastName', 'dateOfBirth', 'email', 'phone',
        'streetAddress', 'city', 'state', 'zipCode', 'housingType'
      ]
    },
    {
      id: 'vehicle_details',
      title: 'Vehicle Information',
      description: 'Details about the vehicle you want to insure',
      categories: ['vehicle'],
      fields: [
        'vehicleYear', 'vehicleMake', 'vehicleModel', 'vehicleTrim',
        'ownership', 'primaryUse', 'annualMileage', 'commuteMiles',
        'antiTheftDevice', 'rideshareUsage'
      ]
    },
    {
      id: 'driver_profile',
      title: 'Driver Profile',
      description: 'Your personal and driving background',
      categories: ['drivingHistory', 'demographics'],
      fields: [
        'gender', 'maritalStatus', 'education', 'employmentStatus',
        'licenseAge', 'yearsLicensed', 'accidents', 'violations',
        'continuousCoverage', 'currentInsurer'
      ]
    },
    {
      id: 'coverage_preferences',
      title: 'Coverage Preferences',
      description: 'Choose your preferred coverage levels',
      categories: ['coverage'],
      fields: [
        'liabilityLimit', 'collisionDeductible', 'comprehensiveDeductible',
        'medicalPayments', 'uninsuredMotorist', 'rentalCoverage', 'roadsideAssistance'
      ]
    }
  ];
}

// Map unified data to carrier-specific field formats
export interface CarrierFieldMapping {
  [carrierName: string]: {
    [unifiedFieldId: string]: {
      carrierFieldId: string;
      transform?: (value: any) => any;
      required?: boolean;
    };
  };
}

// Carrier-specific field mappings based on documentation
export const carrierFieldMappings: CarrierFieldMapping = {
  progressive: {
    firstName: { carrierFieldId: 'firstName' },
    lastName: { carrierFieldId: 'lastName' },
    dateOfBirth: { carrierFieldId: 'dateOfBirth', transform: (date: string) => date }, // MM/DD/YYYY format
    email: { carrierFieldId: 'email' },
    vehicleYear: { carrierFieldId: 'vehicleYear' },
    vehicleMake: { carrierFieldId: 'vehicleMake' },
    vehicleModel: { carrierFieldId: 'vehicleModel' },
    primaryUse: { 
      carrierFieldId: 'primaryUse',
      transform: (value: string) => {
        const mapping: Record<string, string> = {
          'Pleasure (recreational, errands)': 'Pleasure (recreational, errands)',
          'Commuting to work/school': 'Business',
          'Business use': 'Business',
          'Farm/Ranch use': 'Farm Use'
        };
        return mapping[value] || value;
      }
    },
    gender: { carrierFieldId: 'gender' },
    maritalStatus: { carrierFieldId: 'maritalStatus' },
    education: { carrierFieldId: 'education' },
    employmentStatus: { carrierFieldId: 'employmentStatus' },
    occupation: { carrierFieldId: 'occupation' },
    liabilityLimit: { 
      carrierFieldId: 'liabilityLimits',
      transform: (value: string) => {
        // Map unified format to Progressive format
        const mapping: Record<string, string> = {
          'State Minimum': '$15,000/$30,000',
          '25/50/25 ($25K/$50K/$25K)': '$25,000/$50,000',
          '50/100/50 ($50K/$100K/$50K)': '$50,000/$100,000',
          '100/300/100 ($100K/$300K/$100K)': '$100,000/$300,000',
          '250/500/250 ($250K/$500K/$250K)': '$250,000/$500,000',
          '500/500/500 ($500K/$500K/$500K)': '$500,000/$1,000,000'
        };
        return mapping[value] || value;
      }
    }
  },
  statefarm: {
    firstName: { carrierFieldId: 'firstName' },
    lastName: { carrierFieldId: 'lastName' },
    dateOfBirth: { carrierFieldId: 'dateOfBirth' },
    email: { carrierFieldId: 'email' },
    phone: { carrierFieldId: 'phone' },
    streetAddress: { carrierFieldId: 'streetAddress' },
    city: { carrierFieldId: 'city' },
    state: { carrierFieldId: 'state' },
    zipCode: { carrierFieldId: 'zipCode' },
    vehicleYear: { carrierFieldId: 'vehicleYear' },
    vehicleMake: { carrierFieldId: 'vehicleMake' },
    vehicleModel: { carrierFieldId: 'vehicleModel' },
    ownership: { carrierFieldId: 'ownership' },
    purchaseDate: { carrierFieldId: 'purchaseDate' },
    antiTheftDevice: { carrierFieldId: 'antiTheftDevice' },
    gender: { carrierFieldId: 'gender' }
  },
  libertymutual: {
    firstName: { carrierFieldId: 'firstName' },
    lastName: { carrierFieldId: 'lastName' },
    dateOfBirth: { carrierFieldId: 'birthday' }, // Note: Liberty Mutual uses 'birthday'
    email: { carrierFieldId: 'email' },
    phone: { carrierFieldId: 'phone' },
    maritalStatus: { carrierFieldId: 'maritalStatus' },
    gender: { carrierFieldId: 'genderIdentity' },
    vehicleYear: { carrierFieldId: 'year' },
    vehicleMake: { carrierFieldId: 'make' },
    vehicleModel: { carrierFieldId: 'model' },
    vehicleTrim: { carrierFieldId: 'trim' },
    ownership: { 
      carrierFieldId: 'ownershipStatus',
      transform: (value: string) => {
        const mapping: Record<string, string> = {
          'Own (fully paid off)': 'Own',
          'Finance (making payments)': 'Finance',
          'Lease': 'Lease'
        };
        return mapping[value] || value;
      }
    },
    education: { carrierFieldId: 'education' },
    employmentStatus: { carrierFieldId: 'employmentStatus' }
  },
  geico: {
    dateOfBirth: { carrierFieldId: 'dateOfBirth' },
    firstName: { carrierFieldId: 'firstName' },
    lastName: { carrierFieldId: 'lastName' },
    vehicleYear: { carrierFieldId: 'vehicleYear' },
    vehicleMake: { carrierFieldId: 'vehicleMake' },
    vehicleModel: { carrierFieldId: 'vehicleModel' },
    vehicleVin: { carrierFieldId: 'vin' },
    gender: { carrierFieldId: 'gender' },
    maritalStatus: { carrierFieldId: 'maritalStatus' },
    housingType: { 
      carrierFieldId: 'homeOwnership',
      transform: (value: string) => {
        return value.includes('Own') ? 'Own' : 'Rent';
      }
    },
    education: { carrierFieldId: 'education' },
    occupation: { carrierFieldId: 'occupation' },
    industry: { carrierFieldId: 'industry' }
  }
};

// Transform unified data to carrier-specific format
export function transformDataForCarrier(unifiedData: Record<string, any>, carrierName: string): Record<string, any> {
  const mapping = carrierFieldMappings[carrierName];
  if (!mapping) {
    console.warn(`No field mapping found for carrier: ${carrierName}`);
    return unifiedData;
  }

  const transformedData: Record<string, any> = {};

  Object.entries(unifiedData).forEach(([unifiedFieldId, value]) => {
    const carrierMapping = mapping[unifiedFieldId];
    if (carrierMapping && value !== undefined && value !== '') {
      const transformedValue = carrierMapping.transform ? carrierMapping.transform(value) : value;
      transformedData[carrierMapping.carrierFieldId] = transformedValue;
    }
  });

  return transformedData;
} 