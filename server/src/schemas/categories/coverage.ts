import { FieldDefinition } from '../../types/index.js';

export const coverageFields: Record<string, FieldDefinition> = {
  liabilityLimit: {
    id: 'liabilityLimit',
    name: 'Preferred Liability Coverage',
    type: 'select',
    required: true,
    options: [
      'State Minimum','25/50/25 ($25K/$50K/$25K)','50/100/50 ($50K/$100K/$50K)',
      '100/300/100 ($100K/$300K/$100K)','250/500/250 ($250K/$500K/$250K)','500/500/500 ($500K/$500K/$500K)'
    ]
  },
  collisionDeductible: {
    id: 'collisionDeductible',
    name: 'Collision Deductible',
    type: 'select',
    required: true,
    options: ['$250','$500','$1,000','$2,500','No Coverage']
  },
  comprehensiveDeductible: {
    id: 'comprehensiveDeductible',
    name: 'Comprehensive Deductible',
    type: 'select',
    required: true,
    options: ['$250','$500','$1,000','$2,500','No Coverage']
  },
  medicalPayments: {
    id: 'medicalPayments',
    name: 'Medical Payments Coverage',
    type: 'select',
    required: true,
    options: ['$1,000','$2,500','$5,000','$10,000','No Coverage']
  },
  uninsuredMotorist: {
    id: 'uninsuredMotorist',
    name: 'Uninsured Motorist Coverage',
    type: 'select',
    required: true,
    options: ['State Minimum','25/50','50/100','100/300','250/500','No Coverage']
  },
  rentalCoverage: {
    id: 'rentalCoverage',
    name: 'Rental Car Coverage',
    type: 'select',
    required: true,
    options: ['No Coverage','$30/day, $900 max','$50/day, $1,500 max','$75/day, $2,250 max']
  },
  roadsideAssistance: {
    id: 'roadsideAssistance',
    name: 'Roadside Assistance',
    type: 'radio',
    required: true,
    options: ['Yes','No']
  }
}; 