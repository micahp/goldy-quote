import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import Card from '../common/Card';
import Button from '../common/Button';
import CarrierStatusCard from './CarrierStatusCard';
import { Users, TrendingUp, Award, AlertCircle, CheckCircle, Clock } from 'lucide-react';

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

interface QuoteResult {
  price: string;
  term: string;
  carrier: string;
  coverageDetails: Record<string, any>;
  discounts?: Array<{
    name: string;
    amount: string;
  }>;
  features?: string[];
}

interface CarrierStatus {
  name: string;
  status: 'waiting' | 'processing' | 'completed' | 'error';
  quote?: QuoteResult;
  error?: string;
  progress?: number;
}

interface MultiCarrierQuoteFormProps {
  onQuotesReceived: (quotes: QuoteResult[]) => void;
}

const AVAILABLE_CARRIERS = [
  { id: 'geico', name: 'GEICO', description: 'Fast quotes, competitive rates' },
  { id: 'progressive', name: 'Progressive', description: 'Name Your Price® tool' },
  { id: 'statefarm', name: 'State Farm', description: 'Good neighbor service' },
  { id: 'libertymutual', name: 'Liberty Mutual', description: 'Customized coverage options' }
];

// Progressive form steps with comprehensive data collection
const FORM_STEPS = {
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

const MultiCarrierQuoteForm: React.FC<MultiCarrierQuoteFormProps> = ({ onQuotesReceived }) => {
  const [searchParams] = useSearchParams();
  const initialZip = searchParams.get('zip') || '';
  
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<Record<string, any>>({ zipCode: initialZip });
  const [selectedCarriers, setSelectedCarriers] = useState<string[]>(['geico', 'progressive']);
  const [carrierStatuses, setCarrierStatuses] = useState<Record<string, CarrierStatus>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quotes, setQuotes] = useState<QuoteResult[]>([]);

  // Initialize carrier statuses
  useEffect(() => {
    const statuses: Record<string, CarrierStatus> = {};
    selectedCarriers.forEach(carrierId => {
      const carrier = AVAILABLE_CARRIERS.find(c => c.id === carrierId);
      if (carrier) {
        statuses[carrierId] = {
          name: carrier.name,
          status: 'waiting',
          progress: 0
        };
      }
    });
    setCarrierStatuses(statuses);
  }, [selectedCarriers]);

  const handleFieldChange = useCallback((fieldId: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldId]: value
    }));
  }, []);

  const handleCarrierToggle = useCallback((carrierId: string) => {
    setSelectedCarriers(prev => 
      prev.includes(carrierId) 
        ? prev.filter(id => id !== carrierId)
        : [...prev, carrierId]
    );
  }, []);

  const isStepValid = useCallback(() => {
    const step = FORM_STEPS[currentStep as keyof typeof FORM_STEPS];
    if (!step) return false;

    return step.fields.every(field => {
      if (!field.required) return true;
      const value = formData[field.id];
      return value !== undefined && value !== '';
    });
  }, [currentStep, formData]);

  const handleNextStep = useCallback(() => {
    if (isStepValid() && currentStep < Object.keys(FORM_STEPS).length) {
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep, isStepValid]);

  const handlePrevStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const submitToCarriers = async () => {
    if (selectedCarriers.length === 0) {
      alert('Please select at least one carrier');
      return;
    }

    setIsSubmitting(true);
    
    try {
      console.log('Submitting unified form data to carriers:', formData);
      
      // Start quotes for all selected carriers simultaneously
      const carrierPromises = selectedCarriers.map(async (carrierId) => {
        try {
          // Update status to processing
          setCarrierStatuses(prev => ({
            ...prev,
            [carrierId]: { ...prev[carrierId], status: 'processing', progress: 10 }
          }));

          // Start the quote process
          const startResponse = await fetch(`/api/quotes/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              carrier: carrierId,
              userData: formData
            })
          });

          if (!startResponse.ok) {
            throw new Error(`Failed to start ${carrierId} quote`);
          }

          const startData = await startResponse.json();
          console.log(`${carrierId} quote started:`, startData);

          // Progress through steps automatically using unified data
          let stepCount = 0;
          const maxSteps = 10; // Reasonable limit
          
          while (stepCount < maxSteps) {
            // Update progress
            const progress = Math.min(90, 20 + (stepCount / maxSteps) * 70);
            setCarrierStatuses(prev => ({
              ...prev,
              [carrierId]: { ...prev[carrierId], progress }
            }));

            // Submit step data
            const stepResponse = await fetch(`/api/quotes/${startData.taskId}/step`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(formData)
            });

            if (!stepResponse.ok) {
              throw new Error(`Step failed for ${carrierId}`);
            }

            const stepData = await stepResponse.json();
            console.log(`${carrierId} step ${stepCount + 1}:`, stepData);

            // Check if quote is completed
            if (stepData.quote || stepData.status === 'completed') {
              setCarrierStatuses(prev => ({
                ...prev,
                [carrierId]: {
                  ...prev[carrierId],
                  status: 'completed',
                  progress: 100,
                  quote: stepData.quote
                }
              }));
              
              if (stepData.quote) {
                setQuotes(prev => [...prev, stepData.quote]);
              }
              break;
            }

            // Check for errors
            if (stepData.status === 'error') {
              throw new Error(stepData.error || `Unknown error in ${carrierId}`);
            }

            stepCount++;
            
            // Wait a bit before next step
            await new Promise(resolve => setTimeout(resolve, 1000));
          }

          if (stepCount >= maxSteps) {
            throw new Error(`${carrierId} exceeded maximum steps without completion`);
          }

        } catch (error) {
          console.error(`Error with ${carrierId}:`, error);
          setCarrierStatuses(prev => ({
            ...prev,
            [carrierId]: {
              ...prev[carrierId],
              status: 'error',
              error: error instanceof Error ? error.message : 'Unknown error'
            }
          }));
        }
      });

      // Wait for all carriers to complete
      await Promise.allSettled(carrierPromises);
      
      // Pass completed quotes to parent
      onQuotesReceived(quotes);
      
    } catch (error) {
      console.error('Error submitting to carriers:', error);
      alert('An error occurred while getting quotes. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderField = (field: FormField) => {
    const { id, name, type, options, required, placeholder } = field;
    const value = formData[id] || '';

    switch (type) {
      case 'select':
        return (
          <div key={id} className="mb-4">
            <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
              {name} {required && <span className="text-red-500">*</span>}
            </label>
            <select
              id={id}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              value={value}
              onChange={(e) => handleFieldChange(id, e.target.value)}
              required={required}
            >
              <option value="">Select an option</option>
              {options?.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
        );

      case 'radio':
        return (
          <div key={id} className="mb-4">
            <span className="block text-sm font-medium text-gray-700 mb-2">
              {name} {required && <span className="text-red-500">*</span>}
            </span>
            <div className="flex space-x-4">
              {options?.map(option => (
                <div key={option} className="flex items-center">
                  <input
                    id={`${id}-${option}`}
                    name={id}
                    type="radio"
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                    value={option}
                    checked={value === option}
                    onChange={(e) => handleFieldChange(id, e.target.value)}
                    required={required}
                  />
                  <label htmlFor={`${id}-${option}`} className="ml-2 block text-sm text-gray-700">
                    {option}
                  </label>
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return (
          <div key={id} className="mb-4">
            <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
              {name} {required && <span className="text-red-500">*</span>}
            </label>
            <input
              id={id}
              type={type}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              value={value}
              onChange={(e) => handleFieldChange(id, e.target.value)}
              placeholder={placeholder}
              required={required}
            />
          </div>
        );
    }
  };

  const currentStepData = FORM_STEPS[currentStep as keyof typeof FORM_STEPS];
  const isLastStep = currentStep === Object.keys(FORM_STEPS).length;
  const canProceed = isStepValid();

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Progress indicator */}
      <div className="flex items-center justify-between mb-8">
        {Object.keys(FORM_STEPS).map((step, index) => {
          const stepNumber = parseInt(step);
          const isActive = stepNumber === currentStep;
          const isCompleted = stepNumber < currentStep;
          
          return (
            <div key={step} className="flex items-center">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                isCompleted ? 'bg-green-500 border-green-500 text-white' :
                isActive ? 'bg-indigo-500 border-indigo-500 text-white' :
                'bg-gray-100 border-gray-300 text-gray-400'
              }`}>
                {isCompleted ? <CheckCircle className="w-5 h-5" /> : stepNumber}
              </div>
              {index < Object.keys(FORM_STEPS).length - 1 && (
                <div className={`w-12 h-1 mx-2 ${isCompleted ? 'bg-green-500' : 'bg-gray-200'}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Current step form */}
      <Card className="p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">{currentStepData.title}</h2>
          <p className="text-gray-600 mt-2">{currentStepData.description}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {currentStepData.fields.map(renderField)}
        </div>

        {/* Navigation buttons */}
        <div className="flex justify-between items-center mt-8">
          <Button
            variant="outline"
            onClick={handlePrevStep}
            disabled={currentStep === 1}
          >
            Previous
          </Button>

          {!isLastStep ? (
            <Button
              onClick={handleNextStep}
              disabled={!canProceed}
            >
              Next Step
            </Button>
          ) : (
            <div className="space-y-4">
              {/* Carrier selection */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Select Insurance Carriers</h3>
                <div className="grid grid-cols-2 gap-2">
                  {AVAILABLE_CARRIERS.map(carrier => (
                    <label key={carrier.id} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedCarriers.includes(carrier.id)}
                        onChange={() => handleCarrierToggle(carrier.id)}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <span className="text-sm font-medium text-gray-700">{carrier.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <Button
                onClick={submitToCarriers}
                disabled={!canProceed || isSubmitting || selectedCarriers.length === 0}
                className="bg-green-600 hover:bg-green-700"
              >
                {isSubmitting ? 'Getting Quotes...' : 'Get Quotes from Selected Carriers'}
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Carrier status cards - show after submission */}
      {isSubmitting || Object.keys(carrierStatuses).length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-gray-900">Quote Progress</h3>
          {Object.entries(carrierStatuses).map(([carrierId, status]) => (
            <CarrierStatusCard
              key={carrierId}
              carrier={status.name}
              status={status.status}
              quote={status.quote}
              error={status.error}
              progress={status.progress}
            />
          ))}
        </div>
      )}

      {/* Results summary */}
      {quotes.length > 0 && (
        <Card className="p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Your Quotes</h3>
          <div className="space-y-4">
            {quotes.map((quote, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-medium text-gray-900">{quote.carrier}</h4>
                    <p className="text-2xl font-bold text-green-600">{quote.price}/{quote.term}</p>
                  </div>
                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default MultiCarrierQuoteForm; 