import { FieldDefinition } from '../../types/index.js';

// Generate year options for vehicles (current year + 1 down to 1990)
function generateYearOptions(): string[] {
  const currentYear = new Date().getFullYear();
  const years: string[] = [];
  for (let year = currentYear + 1; year >= 1990; year--) {
    years.push(year.toString());
  }
  return years;
}

export const vehicleFields: Record<string, FieldDefinition> = {
  vehicleYear: {
    id: 'vehicleYear',
    name: 'Vehicle Year',
    type: 'select',
    required: true,
    options: generateYearOptions()
  },
  vehicleMake: {
    id: 'vehicleMake',
    name: 'Vehicle Make',
    type: 'select',
    required: true,
    options: [
      'Acura', 'Audi', 'BMW', 'Buick', 'Cadillac', 'Chevrolet', 'Chrysler', 'Dodge', 'Ford', 'GMC',
      'Honda', 'Hyundai', 'Infiniti', 'Jeep', 'Kia', 'Lexus', 'Lincoln', 'Mazda', 'Mercedes-Benz',
      'Mitsubishi', 'Nissan', 'Pontiac', 'Porsche', 'Ram', 'Subaru', 'Toyota', 'Volkswagen', 'Volvo'
    ]
  },
  vehicleModel: {
    id: 'vehicleModel',
    name: 'Vehicle Model',
    type: 'text',
    required: true,
    placeholder: 'e.g., Camry, Accord, F-150'
  },
  vehicleTrim: {
    id: 'vehicleTrim',
    name: 'Vehicle Trim/Body Style',
    type: 'text',
    required: false,
    placeholder: 'e.g., LX 4D SED GAS, Sport, Premium'
  },
  vehicleVin: {
    id: 'vehicleVin',
    name: 'VIN (Vehicle Identification Number)',
    type: 'text',
    required: false,
    placeholder: '17-character VIN (optional)',
    validation: { pattern: '^[A-HJ-NPR-Z0-9]{17}$', minLength: 17, maxLength: 17 }
  },
  annualMileage: {
    id: 'annualMileage',
    name: 'Annual Mileage',
    type: 'select',
    required: true,
    options: [
      'Less than 5,000', '5,000 - 7,500', '7,500 - 10,000', '10,000 - 12,500',
      '12,500 - 15,000', '15,000 - 20,000', '20,000 - 25,000', 'More than 25,000'
    ]
  },
  commuteMiles: {
    id: 'commuteMiles',
    name: 'Miles to Work/School (One Way)',
    type: 'select',
    required: true,
    options: [
      'Work from home', 'Less than 5 miles', '5-10 miles', '11-15 miles',
      '16-25 miles', '26-50 miles', 'More than 50 miles'
    ]
  },
  primaryUse: {
    id: 'primaryUse',
    name: 'Primary Use',
    type: 'select',
    required: true,
    options: [
      'Pleasure (recreational, errands)', 'Commuting to work/school', 'Business use', 'Farm/Ranch use'
    ]
  },
  ownership: {
    id: 'ownership',
    name: 'Vehicle Ownership',
    type: 'select',
    required: true,
    options: ['Own (fully paid off)', 'Finance (making payments)', 'Lease']
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
    options: ['No', 'Yes, less than 50% of time', 'Yes, 50% or more of time']
  },
  trackingDevice: {
    id: 'trackingDevice',
    name: 'GPS Tracking Device',
    type: 'radio',
    required: true,
    options: ['Yes', 'No']
  }
}; 