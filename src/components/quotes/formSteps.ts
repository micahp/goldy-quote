interface FormField {
  id: string;
  name: string;
  type: 'text' | 'email' | 'tel' | 'date' | 'select' | 'radio' | 'number';
  options?: string[];
  required: boolean;
  placeholder?: string;
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
  };
}

interface FormStep {
  title: string;
  description: string;
  fields: FormField[];
}

// Progressive form steps with comprehensive data collection
export const FORM_STEPS: Record<number, FormStep> = {
  1: {
    title: "Basic Information",
    description: "Tell us about yourself to get started",
    fields: [
      { id: 'firstName', name: 'First Name', type: 'text' as const, required: true, placeholder: 'Enter your first name' },
      { id: 'lastName', name: 'Last Name', type: 'text' as const, required: true, placeholder: 'Enter your last name' },
      { id: 'dateOfBirth', name: 'Date of Birth', type: 'date' as const, required: true },
      { id: 'gender', name: 'Gender', type: 'select' as const, required: true, options: ['Male', 'Female', 'Non-binary', 'Prefer not to say'] },
      { id: 'maritalStatus', name: 'Marital Status', type: 'select' as const, required: true, options: ['Single', 'Married', 'Civil Union', 'Divorced', 'Widowed'] },
      { id: 'email', name: 'Email', type: 'email' as const, required: true, placeholder: 'your.email@gmail.com' },
      { id: 'phone', name: 'Phone Number', type: 'tel' as const, required: true, placeholder: '(555) 123-4567' }
    ]
  },
  2: {
    title: "Address Information",
    description: "Where do you live and keep your vehicle?",
    fields: [
      { id: 'streetAddress', name: 'Street Address', type: 'text' as const, required: true, placeholder: '123 Main Street' },
      { id: 'apt', name: 'Apartment/Unit #', type: 'text' as const, required: false, placeholder: 'Apt 2B' },
      { id: 'city', name: 'City', type: 'text' as const, required: true, placeholder: 'Your city' },
      { id: 'state', name: 'State', type: 'select' as const, required: true, options: ['CA', 'TX', 'FL', 'NY', 'IL', 'PA', 'OH', 'GA', 'NC', 'MI'] },
      { id: 'zipCode', name: 'ZIP Code', type: 'text' as const, required: true, placeholder: '12345' },
      { id: 'housingType', name: 'Housing Type', type: 'select' as const, required: true, options: ['Own house', 'Rent house', 'Apartment', 'Condo', 'Mobile home', 'Other'] }
    ]
  },
  3: {
    title: "Vehicle Information", 
    description: "Details about the vehicle you want to insure",
    fields: [
      { id: 'vehicleYear', name: 'Year', type: 'select' as const, required: true, options: Array.from({length: 35}, (_, i) => (2025 - i).toString()) },
      { id: 'vehicleMake', name: 'Make', type: 'select' as const, required: true, options: ['Honda', 'Toyota', 'Ford', 'Chevrolet', 'BMW', 'Mercedes-Benz', 'Audi', 'Nissan', 'Hyundai', 'Kia', 'Other'] },
      { id: 'vehicleModel', name: 'Model', type: 'text' as const, required: true, placeholder: 'e.g., Camry, Accord, F-150' },
      { id: 'vehicleTrim', name: 'Trim/Body Style', type: 'text' as const, required: false, placeholder: 'e.g., LX 4D SED GAS' },
      { id: 'ownership', name: 'Ownership', type: 'select' as const, required: true, options: ['Own (fully paid off)', 'Finance (making payments)', 'Lease'] },
      { id: 'primaryUse', name: 'Primary Use', type: 'select' as const, required: true, options: ['Pleasure (recreational, errands)', 'Commuting to work/school', 'Business use', 'Farm/Ranch use'] },
      { id: 'annualMileage', name: 'Annual Mileage', type: 'select' as const, required: true, options: ['Less than 5,000', '5,000 - 10,000', '10,000 - 15,000', '15,000 - 20,000', '20,000 - 25,000', 'More than 25,000'] },
      { id: 'commuteMiles', name: 'Miles to Work/School (One Way)', type: 'select' as const, required: true, options: ['Work from home', 'Less than 5 miles', '5-15 miles', '16-25 miles', '26-50 miles', 'More than 50 miles'] },
      { id: 'antiTheftDevice', name: 'Anti-Theft Device', type: 'radio' as const, required: true, options: ['Yes', 'No'] }
    ]
  },
  4: {
    title: "Driver Profile & History",
    description: "Your driving background and experience",
    fields: [
      { id: 'education', name: 'Education Level', type: 'select' as const, required: true, options: ['High school diploma/equivalent', 'Some college', 'Bachelor\'s degree', 'Master\'s degree or higher'] },
      { id: 'employmentStatus', name: 'Employment Status', type: 'select' as const, required: true, options: ['Employed/Self-employed', 'Retired', 'Student', 'Homemaker', 'Unemployed'] },
      { id: 'occupation', name: 'Occupation', type: 'text' as const, required: false, placeholder: 'e.g., Teacher, Engineer, Manager' },
      { id: 'licenseAge', name: 'Age When First Licensed', type: 'select' as const, required: true, options: ['14', '15', '16', '17', '18', '19', '20', '21-25', '26+'] },
      { id: 'accidents', name: 'At-Fault Accidents (Last 5 Years)', type: 'select' as const, required: true, options: ['0', '1', '2', '3', '4+'] },
      { id: 'violations', name: 'Moving Violations/Tickets (Last 5 Years)', type: 'select' as const, required: true, options: ['0', '1', '2', '3', '4+'] },
      { id: 'continuousCoverage', name: 'Continuous Insurance Coverage', type: 'select' as const, required: true, options: ['Currently insured (3+ years)', 'Currently insured (1-3 years)', 'Lapsed within 30 days', 'Lapsed more than 30 days', 'Never insured'] }
    ]
  },
  5: {
    title: "Coverage Preferences",
    description: "Choose your preferred coverage levels",
    fields: [
      { id: 'liabilityLimit', name: 'Liability Coverage', type: 'select' as const, required: true, options: ['State Minimum', '25/50/25 ($25K/$50K/$25K)', '50/100/50 ($50K/$100K/$50K)', '100/300/100 ($100K/$300K/$100K)', '250/500/250 ($250K/$500K/$250K)'] },
      { id: 'collisionDeductible', name: 'Collision Deductible', type: 'select' as const, required: true, options: ['$250', '$500', '$1,000', '$2,500', 'No Coverage'] },
      { id: 'comprehensiveDeductible', name: 'Comprehensive Deductible', type: 'select' as const, required: true, options: ['$250', '$500', '$1,000', '$2,500', 'No Coverage'] },
      { id: 'medicalPayments', name: 'Medical Payments', type: 'select' as const, required: true, options: ['$1,000', '$2,500', '$5,000', '$10,000', 'No Coverage'] },
      { id: 'roadsideAssistance', name: 'Roadside Assistance', type: 'radio' as const, required: true, options: ['Yes', 'No'] }
    ]
  }
};

export type { FormField, FormStep }; 