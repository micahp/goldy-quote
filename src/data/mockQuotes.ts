import { InsuranceQuote } from '../types';

export const mockQuotes: InsuranceQuote[] = [
  {
    id: 'quote-1',
    providerId: 'geico',
    monthlyRate: 102.50,
    annualRate: 1230.00,
    coverage: {
      liability: { type: 'Liability', limit: '100/300/50', premium: 540 },
      collision: { type: 'Collision', limit: '$500 deductible', premium: 320 },
      comprehensive: { type: 'Comprehensive', limit: '$500 deductible', premium: 220 },
      uninsured: { type: 'Uninsured/Underinsured', limit: '100/300', premium: 100 },
      medicalPayments: { type: 'Medical Payments', limit: '$5,000', premium: 50 },
    },
    discounts: [
      { name: 'Multi-Policy', amount: 80 },
      { name: 'Good Driver', amount: 120 },
    ],
    features: ['24/7 Customer Service', 'Mobile App', 'Roadside Assistance'],
    bestFor: 'Overall Value',
  },
  {
    id: 'quote-2',
    providerId: 'progressive',
    monthlyRate: 98.75,
    annualRate: 1185.00,
    coverage: {
      liability: { type: 'Liability', limit: '100/300/50', premium: 510 },
      collision: { type: 'Collision', limit: '$500 deductible', premium: 310 },
      comprehensive: { type: 'Comprehensive', limit: '$500 deductible', premium: 215 },
      uninsured: { type: 'Uninsured/Underinsured', limit: '100/300', premium: 100 },
      medicalPayments: { type: 'Medical Payments', limit: '$5,000', premium: 50 },
    },
    discounts: [
      { name: 'Snapshot Program', amount: 85 },
      { name: 'Paperless Billing', amount: 50 },
    ],
    features: ['Name Your Price Tool', 'Accident Forgiveness', 'Snapshot Discount'],
    bestFor: 'Budget-Conscious Drivers',
  },
  {
    id: 'quote-3',
    providerId: 'statefarm',
    monthlyRate: 118.25,
    annualRate: 1419.00,
    coverage: {
      liability: { type: 'Liability', limit: '100/300/50', premium: 610 },
      collision: { type: 'Collision', limit: '$500 deductible', premium: 350 },
      comprehensive: { type: 'Comprehensive', limit: '$500 deductible', premium: 250 },
      uninsured: { type: 'Uninsured/Underinsured', limit: '100/300', premium: 150 },
      medicalPayments: { type: 'Medical Payments', limit: '$5,000', premium: 59 },
    },
    discounts: [
      { name: 'Drive Safe & Save', amount: 75 },
      { name: 'Good Student', amount: 100 },
    ],
    features: ['Local Agent', 'Banking Integration', 'Drive Safe & Save Program'],
    bestFor: 'Customer Service',
  },
  {
    id: 'quote-4',
    providerId: 'allstate',
    monthlyRate: 125.00,
    annualRate: 1500.00,
    coverage: {
      liability: { type: 'Liability', limit: '100/300/50', premium: 650 },
      collision: { type: 'Collision', limit: '$500 deductible', premium: 380 },
      comprehensive: { type: 'Comprehensive', limit: '$500 deductible', premium: 270 },
      uninsured: { type: 'Uninsured/Underinsured', limit: '100/300', premium: 150 },
      medicalPayments: { type: 'Medical Payments', limit: '$5,000', premium: 50 },
    },
    discounts: [
      { name: 'Drivewise', amount: 90 },
      { name: 'New Car', amount: 120 },
    ],
    features: ['Accident Forgiveness', 'Deductible Rewards', 'New Car Replacement'],
    bestFor: 'Comprehensive Coverage',
  },
  {
    id: 'quote-5',
    providerId: 'liberty',
    monthlyRate: 110.30,
    annualRate: 1323.60,
    coverage: {
      liability: { type: 'Liability', limit: '100/300/50', premium: 580 },
      collision: { type: 'Collision', limit: '$500 deductible', premium: 340 },
      comprehensive: { type: 'Comprehensive', limit: '$500 deductible', premium: 240 },
      uninsured: { type: 'Uninsured/Underinsured', limit: '100/300', premium: 120 },
      medicalPayments: { type: 'Medical Payments', limit: '$5,000', premium: 43.60 },
    },
    discounts: [
      { name: 'RightTrack', amount: 70 },
      { name: 'Online Purchase', amount: 50 },
    ],
    features: ['Lifetime Repair Guarantee', 'Better Car Replacement', 'Teacher Discount'],
    bestFor: 'Customizable Policies',
  }
];

export const getQuoteById = (id: string): InsuranceQuote | undefined => {
  return mockQuotes.find(quote => quote.id === id);
};

export const getQuotesByProviderId = (providerId: string): InsuranceQuote[] => {
  return mockQuotes.filter(quote => quote.providerId === providerId);
};