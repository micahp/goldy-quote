import React, { useState, useEffect, useCallback } from 'react';
import Card from '../common/Card';
import Button from '../common/Button';
import CarrierStatusCard from './CarrierStatusCard';
import { FORM_STEPS, FormField } from './formSteps';
import { Users, TrendingUp, Award, AlertCircle, CheckCircle, Clock } from 'lucide-react';

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
  taskId: string;
  carriers: string[];
  zipCode: string;
  insuranceType: string;
}

const AVAILABLE_CARRIERS = [
  { id: 'geico', name: 'GEICO', description: 'Fast quotes, competitive rates' },
  { id: 'progressive', name: 'Progressive', description: 'Name Your Price® tool' },
  { id: 'statefarm', name: 'State Farm', description: 'Good neighbor service' },
  { id: 'libertymutual', name: 'Liberty Mutual', description: 'Customized coverage options' }
];



const MultiCarrierQuoteForm: React.FC<MultiCarrierQuoteFormProps> = ({ 
  onQuotesReceived, 
  taskId, 
  carriers, 
  zipCode, 
  insuranceType 
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<Record<string, any>>({ 
    zipCode,
    insuranceType 
  });
  const [carrierStatuses, setCarrierStatuses] = useState<Record<string, CarrierStatus>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quotes, setQuotes] = useState<QuoteResult[]>([]);

  // Initialize carrier statuses when component mounts
  useEffect(() => {
    console.log('📋 Initializing MultiCarrierQuoteForm with:', { taskId, carriers, zipCode, insuranceType });
    
    // Set up initial carrier statuses
    const initialStatuses: Record<string, CarrierStatus> = {};
    carriers.forEach(carrierId => {
          const carrier = AVAILABLE_CARRIERS.find(c => c.id === carrierId);
          if (carrier) {
        initialStatuses[carrierId] = {
              name: carrier.name,
          status: 'waiting',
          progress: 0
            };
          }
        });
    setCarrierStatuses(initialStatuses);
  }, [taskId, carriers, zipCode, insuranceType]);

  const handleFieldChange = useCallback((fieldId: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldId]: value
    }));
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

  const handleNextStep = useCallback(async () => {
    if (!isStepValid()) {
      console.log('Step validation failed, cannot proceed');
      return;
    }

    if (!taskId) {
      console.log('No taskId available, cannot send step data');
      return;
    }

    try {
      // Get current step data to send to backend
      const currentStepFields = FORM_STEPS[currentStep as keyof typeof FORM_STEPS];
      const stepData: Record<string, any> = {};
      
      // Extract only the fields from the current step
      currentStepFields.fields.forEach(field => {
        if (formData[field.id] !== undefined) {
          stepData[field.id] = formData[field.id];
        }
      });

      console.log(`📤 Sending step ${currentStep} data to backend:`, stepData);

      // Send step data to backend
      const response = await fetch(`/api/quotes/${taskId}/data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stepData)
      });

      if (!response.ok) {
        throw new Error(`Failed to send step data: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ Step data sent successfully:', result);

      // Update carrier progress
      setCarrierStatuses(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(carrierId => {
          if (updated[carrierId].status === 'processing') {
            updated[carrierId].progress = Math.min(90, (currentStep / Object.keys(FORM_STEPS).length) * 80 + 10);
          }
        });
        return updated;
      });

      // Move to next step
      if (currentStep < Object.keys(FORM_STEPS).length) {
        setCurrentStep(prev => prev + 1);
      }

    } catch (error) {
      console.error('❌ Error sending step data:', error);
      
      // Update carrier statuses to show error
      setCarrierStatuses(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(carrierId => {
          if (updated[carrierId].status === 'processing') {
            updated[carrierId] = {
              ...updated[carrierId],
              status: 'error',
              error: 'Failed to process step data'
            };
          }
        });
        return updated;
      });
    }
  }, [currentStep, isStepValid, formData, taskId]);

  const handlePrevStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const submitToCarriers = async () => {
    if (carriers.length === 0) {
      alert('Please select at least one carrier');
      return;
    }

    setIsSubmitting(true);
    
    try {
      console.log('Submitting unified form data to carriers:', formData);
      
      // Start quotes for all selected carriers simultaneously
      const carrierPromises = carriers.map(async (carrierId) => {
        try {
          // Update status to processing
          setCarrierStatuses(prev => ({
            ...prev,
            [carrierId]: { ...prev[carrierId], status: 'processing', progress: 10 }
          }));

          // Start the quote process for this carrier using task-specific endpoint
          const startResponse = await fetch(`/api/quotes/${taskId}/carriers/${carrierId}/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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
            const stepResponse = await fetch(`/api/quotes/${taskId}/carriers/${carrierId}/step`, {
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
              <Button
                onClick={submitToCarriers}
                  disabled={!canProceed || isSubmitting || carriers.length === 0}
                className="bg-green-600 hover:bg-green-700"
              >
                  {isSubmitting ? 'Getting Quotes...' : `Get Quotes from ${carriers.length} Carrier${carriers.length !== 1 ? 's' : ''}`}
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