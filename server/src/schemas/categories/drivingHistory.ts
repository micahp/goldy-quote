import { FieldDefinition } from '../../types/index.js';

export const drivingHistoryFields: Record<string, FieldDefinition> = {
  licenseAge: {
    id: 'licenseAge',
    name: 'Age When First Licensed',
    type: 'select',
    required: true,
    options: ['14', '15', '16', '17', '18', '19', '20', '21-25', '26-30', '31+']
  },
  yearsLicensed: {
    id: 'yearsLicensed',
    name: 'Years Licensed',
    type: 'select',
    required: true,
    options: ['Less than 1 year','1-2 years','3-5 years','6-10 years','11-15 years','More than 15 years']
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
    options: ['No issues','License suspended','License revoked','License surrendered voluntarily']
  },
  accidents: {
    id: 'accidents',
    name: 'At-Fault Accidents (Last 5 Years)',
    type: 'select',
    required: true,
    options: ['0','1','2','3','4+']
  },
  violations: {
    id: 'violations',
    name: 'Moving Violations/Tickets (Last 5 Years)',
    type: 'select',
    required: true,
    options: ['0','1','2','3','4+']
  },
  majorViolations: {
    id: 'majorViolations',
    name: 'Major Violations (DUI/DWI, Reckless Driving)',
    type: 'select',
    required: true,
    options: ['None','1','2','3+']
  },
  continuousCoverage: {
    id: 'continuousCoverage',
    name: 'Continuous Insurance Coverage',
    type: 'select',
    required: true,
    options: [
      'Currently insured (3+ years)','Currently insured (1-3 years)','Currently insured (less than 1 year)',
      'Lapsed within 30 days','Lapsed 31-90 days','Lapsed more than 90 days','Never insured'
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
      'State Minimum','$25,000/$50,000','$50,000/$100,000','$100,000/$300,000','$250,000/$500,000',
      '$500,000/$1,000,000','I don\'t know'
    ]
  }
}; 