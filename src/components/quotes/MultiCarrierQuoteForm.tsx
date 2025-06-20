import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import Card from '../common/Card';
import Button from '../common/Button';
import CarrierStatusCard from './CarrierStatusCard';
import ProgressiveFormStep from './ProgressiveFormStep';
import { Users, TrendingUp, Award, AlertCircle } from 'lucide-react';

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
  carrier: string;
  taskId: string;
  status: 'idle' | 'filtering' | 'step_1' | 'step_2' | 'step_3' | 'completing' | 'complete' | 'error';
  currentStep?: string;
  stepDescription?: string;
  estimatedPrice?: string;
  discountsFound?: string[];
  animationState?: 'idle' | 'pulsing' | 'celebrating';
  error?: string;
  quote?: QuoteResult;
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

// Progressive form step definitions
const FORM_STEPS = {
  1: {
    title: "Tell Us About You",
    description: "Basic personal information to get started",
    fields: [
      { id: 'firstName', name: 'First Name', type: 'text' as const, required: true, placeholder: 'Enter your first name' },
      { id: 'lastName', name: 'Last Name', type: 'text' as const, required: true, placeholder: 'Enter your last name' },
      { id: 'dateOfBirth', name: 'Date of Birth', type: 'date' as const, required: true },
      { id: 'email', name: 'Email', type: 'email' as const, required: true, placeholder: 'Enter your email address' }
    ]
  },
  2: {
    title: "Your Vehicle",
    description: "Tell us about the vehicle you want to insure",
    fields: [
      { id: 'vehicleYear', name: 'Year', type: 'select' as const, required: true, options: Array.from({length: 30}, (_, i) => (2024 - i).toString()) },
      { id: 'vehicleMake', name: 'Make', type: 'select' as const, required: true, options: ['Honda', 'Toyota', 'Ford', 'Chevrolet', 'BMW', 'Mercedes-Benz', 'Audi', 'Other'] },
      { id: 'vehicleModel', name: 'Model', type: 'text' as const, required: true, placeholder: 'Enter vehicle model' },
      { id: 'annualMileage', name: 'Annual Mileage', type: 'select' as const, required: true, options: ['Less than 5,000', '5,000 - 10,000', '10,000 - 15,000', '15,000 - 20,000', 'More than 20,000'] }
    ]
  },
  3: {
    title: "Driver Details",
    description: "Help us understand your driving profile",
    fields: [
      { id: 'maritalStatus', name: 'Marital Status', type: 'select' as const, required: true, options: ['Single', 'Married', 'Divorced', 'Widowed'] },
      { id: 'education', name: 'Education Level', type: 'select' as const, required: true, options: ['High School', 'Some College', 'Bachelor\'s Degree', 'Master\'s Degree', 'Doctorate'] },
      { id: 'homeOwnership', name: 'Home Ownership', type: 'select' as const, required: true, options: ['Own', 'Rent', 'Live with Parents', 'Other'] },
      { id: 'yearsLicensed', name: 'Years Licensed', type: 'select' as const, required: true, options: ['Less than 1', '1-3', '4-6', '7-10', 'More than 10'] }
    ]
  },
  4: {
    title: "Insurance History",
    description: "Current coverage and claims history",
    fields: [
      { id: 'currentlyInsured', name: 'Currently Insured', type: 'radio' as const, required: true, options: ['Yes', 'No'] },
      { id: 'yearsInsured', name: 'Years with Current Insurer', type: 'select' as const, required: false, options: ['Less than 1', '1-2', '3-5', '6-10', 'More than 10'] },
      { id: 'claimsHistory', name: 'Claims in Last 5 Years', type: 'select' as const, required: true, options: ['None', '1', '2', '3 or more'] },
      { id: 'violations', name: 'Moving Violations in Last 3 Years', type: 'select' as const, required: true, options: ['None', '1', '2', '3 or more'] }
    ]
  }
};

const MultiCarrierQuoteForm: React.FC<MultiCarrierQuoteFormProps> = ({ onQuotesReceived }) => {
  const [searchParams] = useSearchParams();
  const zipCode = searchParams.get('zip') || '';
  
  const [selectedCarriers, setSelectedCarriers] = useState<string[]>(['geico', 'progressive']);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [currentPhase, setCurrentPhase] = useState<'carrier_selection' | 'progressive_disclosure' | 'live_processing' | 'comparison'>('carrier_selection');
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [carrierStatuses, setCarrierStatuses] = useState<Record<string, CarrierStatus>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [completedQuotes, setCompletedQuotes] = useState<QuoteResult[]>([]);

  // WebSocket connection for real-time updates
  useEffect(() => {
    const websocket = new WebSocket('ws://localhost:3001');
    
    websocket.onopen = () => {
      console.log('WebSocket connected');
      setWs(websocket);
    };

    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('WebSocket message:', data);

        switch (data.type) {
          case 'task_started':
            if (data.taskId && taskId === data.taskId) {
              setCurrentPhase('progressive_disclosure');
            }
            break;
          case 'carrier_started':
            updateCarrierStatus(data.carrier, { status: 'step_1' });
            break;
          case 'carrier_step_progress':
            updateCarrierStatus(data.carrier, { 
              status: data.step, 
              currentStep: data.currentStep,
              stepDescription: data.description 
            });
            break;
          case 'price_estimate_update':
            updateCarrierStatus(data.carrier, { 
              estimatedPrice: data.price,
              animationState: 'celebrating'
            });
            // Reset animation after delay
            setTimeout(() => {
              updateCarrierStatus(data.carrier, { animationState: 'idle' });
            }, 2000);
            break;
          case 'discount_discovered':
            updateCarrierStatus(data.carrier, { 
              discountsFound: data.discounts,
              animationState: 'celebrating'
            });
            setTimeout(() => {
              updateCarrierStatus(data.carrier, { animationState: 'idle' });
            }, 2000);
            break;
          case 'quote_completed':
            handleQuoteCompleted(data.carrier, data.quote);
            break;
          case 'carrier_error':
            updateCarrierStatus(data.carrier, { status: 'error', error: data.error });
            break;
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    websocket.onclose = () => {
      console.log('WebSocket disconnected');
      setWs(null);
    };

    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      websocket.close();
    };
  }, [taskId]);

  const updateCarrierStatus = useCallback((carrier: string, updates: Partial<CarrierStatus>) => {
    setCarrierStatuses(prev => ({
      ...prev,
      [carrier]: { ...prev[carrier], ...updates }
    }));
  }, []);

  const handleQuoteCompleted = useCallback((carrier: string, quote: QuoteResult) => {
    updateCarrierStatus(carrier, { status: 'complete', quote });
    setCompletedQuotes(prev => {
      const newQuotes = [...prev, quote];
      onQuotesReceived(newQuotes);
      return newQuotes;
    });
  }, [onQuotesReceived, updateCarrierStatus]);

  // Progressive form step handlers
  const handleStepComplete = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    } else {
      // All steps complete - start carrier processing
      startCarrierProcesses();
    }
  };

  const handleStepBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFieldChange = (fieldId: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  // Start individual carrier processes
  const startCarrierProcesses = async () => {
    if (!taskId) return;

    setCurrentPhase('live_processing');

    for (const carrier of selectedCarriers) {
      try {
        updateCarrierStatus(carrier, { status: 'step_1' });

        const response = await fetch(`http://localhost:3001/api/quotes/${taskId}/carriers/${carrier}/start`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        });

        if (!response.ok) {
          throw new Error(`Failed to start ${carrier}`);
        }

        updateCarrierStatus(carrier, { status: 'step_2' });

      } catch (error) {
        console.error(`Error starting ${carrier}:`, error);
        updateCarrierStatus(carrier, { 
          status: 'error', 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }
  };

  // Validate current step
  const isCurrentStepValid = () => {
    const step = FORM_STEPS[currentStep as keyof typeof FORM_STEPS];
    return step.fields.every(field => {
      if (!field.required) return true;
      const value = formData[field.id];
      return value !== undefined && value !== null && value !== '';
    });
  };

  // Get immediate value content for current step
  const getImmediateValue = () => {
    switch (currentStep) {
      case 1:
        return {
          show: isCurrentStepValid(),
          title: "Carrier Availability",
          content: (
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-blue-600" />
                <span className="text-sm">Checking {selectedCarriers.length} carriers in {zipCode}</span>
              </div>
              {selectedCarriers.map(carrierId => {
                const carrier = AVAILABLE_CARRIERS.find(c => c.id === carrierId);
                return (
                  <div key={carrierId} className="text-sm text-gray-600">
                    ✓ {carrier?.name} available
                  </div>
                );
              })}
            </div>
          )
        };
      case 2:
        return {
          show: isCurrentStepValid(),
          title: "Price Estimates",
          content: (
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium">Getting estimates...</span>
              </div>
              <div className="text-lg font-bold text-green-600">$75 - $180</div>
              <div className="text-xs text-gray-500">Based on your vehicle</div>
            </div>
          )
        };
      case 3:
        return {
          show: isCurrentStepValid(),
          title: "Discount Opportunities",
          content: (
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Award className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-medium">Potential Savings</span>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-gray-600">• Good Driver Discount</div>
                <div className="text-xs text-gray-600">• Multi-Policy Savings</div>
                <div className="text-xs text-gray-600">• Safe Driver Program</div>
              </div>
            </div>
          )
        };
      case 4:
        return {
          show: isCurrentStepValid(),
          title: "Ready to Compare",
          content: (
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium">All set!</span>
              </div>
              <div className="text-sm text-gray-600">
                Starting your personalized quotes now...
              </div>
            </div>
          )
        };
      default:
        return undefined;
    }
  };

  // Start the multi-carrier process
  const startMultiCarrierProcess = async () => {
    if (selectedCarriers.length === 0) {
      setError('Please select at least one carrier');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('Starting multi-carrier process for carriers:', selectedCarriers);
      
      const response = await fetch('http://localhost:3001/api/quotes/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          carriers: selectedCarriers,
          zipCode
        }),
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setTaskId(data.taskId);
      
      // Move to progressive disclosure phase
      if (data.taskId) {
        setCurrentPhase('progressive_disclosure');
      }
      
      // Initialize carrier statuses
      const initialStatuses: Record<string, CarrierStatus> = {};
      selectedCarriers.forEach(carrier => {
        initialStatuses[carrier] = {
          carrier,
          taskId: data.taskId,
          status: 'filtering'
        };
      });
      setCarrierStatuses(initialStatuses);

    } catch (err) {
      console.error('Error starting multi-carrier process:', err);
      setError(err instanceof Error ? err.message : 'Failed to start quote process');
      setCurrentPhase('carrier_selection');
    } finally {
      setLoading(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (taskId) {
        fetch(`http://localhost:3001/api/quotes/${taskId}`, {
          method: 'DELETE'
        }).catch(err => {
          console.error('Error cleaning up task:', err);
        });
      }
    };
  }, [taskId]);

  // Render carrier selection
  const renderCarrierSelection = () => (
    <Card className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-4">Choose Your Insurance Carriers</h2>
        <p className="text-gray-600 text-lg">
          {zipCode && `Available in ${zipCode} • `}
          Select carriers to compare quotes side-by-side
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {AVAILABLE_CARRIERS.map(carrier => (
          <label 
            key={carrier.id} 
            className={`
              flex items-center p-6 border-2 rounded-lg cursor-pointer transition-all duration-200
              ${selectedCarriers.includes(carrier.id) 
                ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' 
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }
            `}
          >
            <input
              type="checkbox"
              checked={selectedCarriers.includes(carrier.id)}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedCarriers(prev => [...prev, carrier.id]);
                } else {
                  setSelectedCarriers(prev => prev.filter(id => id !== carrier.id));
                }
              }}
              className="w-5 h-5 text-blue-600 mr-4"
            />
            <div className="flex-1">
              <h3 className="font-semibold text-lg">{carrier.name}</h3>
              <p className="text-gray-600 text-sm">{carrier.description}</p>
            </div>
          </label>
        ))}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          {selectedCarriers.length} carrier{selectedCarriers.length !== 1 ? 's' : ''} selected
        </div>
        <Button
          onClick={startMultiCarrierProcess}
          disabled={loading || selectedCarriers.length === 0}
          size="lg"
          className="px-8"
        >
          {loading ? 'Starting...' : 'Start Comparing Quotes'}
        </Button>
      </div>
    </Card>
  );

  // Render progressive disclosure
  const renderProgressiveDisclosure = () => {
    const step = FORM_STEPS[currentStep as keyof typeof FORM_STEPS];
    
    return (
      <div className="space-y-8">
        {/* Progress indicator */}
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            {[1, 2, 3, 4].map(stepNum => (
              <div key={stepNum} className="flex items-center">
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                  ${stepNum <= currentStep ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}
                `}>
                  {stepNum}
                </div>
                {stepNum < 4 && (
                  <div className={`
                    w-16 h-1 mx-2
                    ${stepNum < currentStep ? 'bg-blue-600' : 'bg-gray-200'}
                  `} />
                )}
              </div>
            ))}
          </div>
        </div>

        <ProgressiveFormStep
          stepNumber={currentStep}
          title={step.title}
          description={step.description}
          fields={step.fields}
          formData={formData}
          onFieldChange={handleFieldChange}
          onStepComplete={handleStepComplete}
          onBack={currentStep > 1 ? handleStepBack : undefined}
          isValid={isCurrentStepValid()}
          loading={loading}
          immediateValue={getImmediateValue()}
        />
      </div>
    );
  };

  // Render live processing
  const renderLiveProcessing = () => (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-4">Getting Your Quotes</h2>
        <p className="text-gray-600 text-lg">
          Watch as carriers compete for your business in real-time
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {selectedCarriers.map(carrierId => {
          const status = carrierStatuses[carrierId];
          return (
            <CarrierStatusCard
              key={carrierId}
              carrier={carrierId}
              status={status?.status || 'idle'}
              currentStep={status?.currentStep}
              stepDescription={status?.stepDescription}
              estimatedPrice={status?.estimatedPrice}
              discountsFound={status?.discountsFound}
              animationState={status?.animationState}
              error={status?.error}
            />
          );
        })}
      </div>

      {completedQuotes.length > 0 && (
        <div className="text-center">
          <Button
            onClick={() => setCurrentPhase('comparison')}
            size="lg"
            className="px-8"
          >
            View All Quotes ({completedQuotes.length})
          </Button>
        </div>
      )}
    </div>
  );

  // Render comparison
  const renderComparison = () => (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-4">Your Quote Results</h2>
        <p className="text-gray-600 text-lg">
          Compare your personalized quotes and choose the best option
        </p>
      </div>
      
      <div className="grid gap-6">
        {completedQuotes.sort((a, b) => parseFloat(a.price.replace(/[$,]/g, '')) - parseFloat(b.price.replace(/[$,]/g, ''))).map((quote, index) => (
          <Card key={index} className={`relative ${index === 0 ? 'ring-2 ring-green-500' : ''}`}>
            {index === 0 && (
              <div className="absolute -top-3 left-6 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                Best Value
              </div>
            )}
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold">{quote.carrier.toUpperCase()}</h3>
                <div className="text-right">
                  <p className="text-3xl font-bold text-green-600">{quote.price}</p>
                  <p className="text-gray-600">per {quote.term}</p>
                </div>
              </div>
              
              {quote.features && quote.features.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-medium mb-2">Coverage Features:</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {quote.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center text-sm text-gray-600">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                        {feature}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {quote.discounts && quote.discounts.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-medium mb-2">Applied Discounts:</h4>
                  <div className="flex flex-wrap gap-2">
                    {quote.discounts.map((discount, idx) => (
                      <span key={idx} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {discount.name}: {discount.amount}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex space-x-4 pt-4 border-t border-gray-200">
                <Button variant="primary" className="flex-1">
                  Select This Quote
                </Button>
                <Button variant="outline">
                  View Details
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="text-center">
        <Button
          onClick={() => {
            setCurrentPhase('carrier_selection');
            setTaskId(null);
            setCurrentStep(1);
            setFormData({});
            setCarrierStatuses({});
            setCompletedQuotes([]);
            setError(null);
          }}
          variant="outline"
        >
          Start New Quote
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        {/* Debug info - remove in production */}
        {import.meta.env.DEV && (
          <div className="mb-4 p-2 bg-yellow-100 border border-yellow-300 rounded text-xs">
            <strong>Debug:</strong> Phase: {currentPhase}, Step: {currentStep}, TaskId: {taskId || 'null'}, ZIP: {zipCode}
          </div>
        )}
        
        {currentPhase === 'carrier_selection' && renderCarrierSelection()}
        {currentPhase === 'progressive_disclosure' && renderProgressiveDisclosure()}
        {currentPhase === 'live_processing' && renderLiveProcessing()}
        {currentPhase === 'comparison' && renderComparison()}
      </div>
    </div>
  );
};

export default MultiCarrierQuoteForm; 