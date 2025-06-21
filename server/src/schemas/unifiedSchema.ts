import { FieldDefinition, UnifiedFieldSchema } from '../types/index.js';
import { personalInfoFields } from './categories/personalInfo.js';
import { addressFields } from './categories/address.js';
import { vehicleFields } from './categories/vehicle.js';
import { drivingHistoryFields } from './categories/drivingHistory.js';
import { demographicsFields } from './categories/demographics.js';
import { coverageFields } from './categories/coverage.js';

// Enhanced unified schema that captures ALL fields needed across carriers
// Based on documentation analysis from Progressive, State Farm, Liberty Mutual, and GEICO
export const createUnifiedSchema = (): UnifiedFieldSchema => ({
  personalInfo: personalInfoFields,
  address: addressFields,
  vehicle: vehicleFields,
  drivingHistory: drivingHistoryFields,
  demographics: demographicsFields,
  coverage: coverageFields,
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
      allFields[key] = field as FieldDefinition;
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