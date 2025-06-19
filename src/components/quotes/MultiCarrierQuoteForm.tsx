import React, { useState, useEffect, useCallback } from 'react';
import Card from '../common/Card';
import Button from '../common/Button';

interface FieldDefinition {
  id: string;
  name: string;
  type: 'text' | 'email' | 'tel' | 'date' | 'select' | 'radio' | 'checkbox' | 'number';
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
  status: 'idle' | 'starting' | 'collecting_data' | 'processing' | 'completed' | 'error';
  currentStep?: number;
  error?: string;
  quote?: QuoteResult;
}

interface MultiCarrierQuoteFormProps {
  onQuotesReceived: (quotes: QuoteResult[]) => void;
}

const AVAILABLE_CARRIERS = [
  { id: 'geico', name: 'GEICO' },
  { id: 'progressive', name: 'Progressive' },
  { id: 'statefarm', name: 'State Farm' },
  { id: 'libertymutual', name: 'Liberty Mutual' }
];

const MultiCarrierQuoteForm: React.FC<MultiCarrierQuoteFormProps> = ({ onQuotesReceived }) => {
  const [selectedCarriers, setSelectedCarriers] = useState<string[]>(['geico', 'progressive']);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [currentPhase, setCurrentPhase] = useState<'selection' | 'data_collection' | 'processing' | 'results'>('selection');
  const [requiredFields, setRequiredFields] = useState<Record<string, FieldDefinition>>({});
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
              setCurrentPhase('data_collection');
            }
            break;
          case 'carrier_started':
            updateCarrierStatus(data.carrier, { status: 'processing' });
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
    updateCarrierStatus(carrier, { status: 'completed', quote });
    setCompletedQuotes(prev => {
      const newQuotes = [...prev, quote];
      onQuotesReceived(newQuotes);
      return newQuotes;
    });
  }, [onQuotesReceived, updateCarrierStatus]);

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
          carriers: selectedCarriers
        }),
      });

      console.log('Response status:', response.status, response.statusText);

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Received data from server:', data);
      
      setTaskId(data.taskId);
      setRequiredFields(data.requiredFields || {});
      
      console.log('Set taskId to:', data.taskId);
      
      // Only move to data collection phase if we successfully got a taskId
      if (data.taskId) {
        setCurrentPhase('data_collection');
      }
      
      // Initialize carrier statuses
      const initialStatuses: Record<string, CarrierStatus> = {};
      selectedCarriers.forEach(carrier => {
        initialStatuses[carrier] = {
          carrier,
          taskId: data.taskId,
          status: 'collecting_data'
        };
      });
      setCarrierStatuses(initialStatuses);

      // Initialize form data
      const initialFormData: Record<string, any> = {};
      Object.keys(data.requiredFields || {}).forEach(key => {
        initialFormData[key] = '';
      });
      setFormData(initialFormData);

    } catch (err) {
      console.error('Error starting multi-carrier process:', err);
      setError(err instanceof Error ? err.message : 'Failed to start quote process');
      // Reset phase back to selection on error
      setCurrentPhase('selection');
    } finally {
      setLoading(false);
    }
  };

  // Submit user data
  const submitUserData = async () => {
    console.log('Submitting user data, current taskId:', taskId);
    
    if (!taskId) {
      setError('No active quote process');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('Submitting form data:', formData);
      
      const response = await fetch(`http://localhost:3001/api/quotes/${taskId}/data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      console.log('Submit data response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Submit data error response:', errorData);
        throw new Error(errorData.error || 'Failed to submit data');
      }

      const data = await response.json();
      console.log('Submit data success response:', data);
      
      if (data.success) {
        setCurrentPhase('processing');
        startCarrierProcesses();
      }

    } catch (err) {
      console.error('Error submitting user data:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit user data');
    } finally {
      setLoading(false);
    }
  };

  // Start individual carrier processes
  const startCarrierProcesses = async () => {
    if (!taskId) return;

    for (const carrier of selectedCarriers) {
      try {
        updateCarrierStatus(carrier, { status: 'starting' });

        const response = await fetch(`http://localhost:3001/api/quotes/${taskId}/carriers/${carrier}/start`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to start ${carrier}`);
        }

        const data = await response.json();
        updateCarrierStatus(carrier, { status: 'processing' });

      } catch (error) {
        console.error(`Error starting ${carrier}:`, error);
        updateCarrierStatus(carrier, { 
          status: 'error', 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }
  };

  // Handle form input changes
  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Validate form data
  const isFormValid = () => {
    return Object.entries(requiredFields).every(([fieldId, field]) => {
      if (!field.required) return true;
      const value = formData[fieldId];
      return value !== undefined && value !== null && value !== '';
    });
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
    <Card className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Choose Insurance Carriers</h2>
      <p className="text-gray-600 mb-6">
        Select the insurance carriers you'd like to get quotes from. We'll collect your information once and get quotes from all selected carriers.
      </p>
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        {AVAILABLE_CARRIERS.map(carrier => (
          <label key={carrier.id} className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
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
              className="w-4 h-4 text-blue-600"
            />
            <span className="font-medium">{carrier.name}</span>
          </label>
        ))}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <Button
        onClick={startMultiCarrierProcess}
        disabled={loading || selectedCarriers.length === 0}
        className="w-full"
      >
        {loading ? 'Starting...' : `Get Quotes from ${selectedCarriers.length} Carrier${selectedCarriers.length !== 1 ? 's' : ''}`}
      </Button>
    </Card>
  );

  // Render data collection form
  const renderDataCollection = () => (
    <Card className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Your Information</h2>
      <p className="text-gray-600 mb-6">
        Provide your information once, and we'll use it to get quotes from all selected carriers.
      </p>

      <form onSubmit={(e) => { e.preventDefault(); submitUserData(); }} className="space-y-4">
        {Object.entries(requiredFields).map(([fieldId, field]) => (
          <div key={fieldId}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.name}
              {field.required && <span className="text-red-500">*</span>}
            </label>
            
            {field.type === 'select' ? (
              <select
                value={formData[fieldId] || ''}
                onChange={(e) => handleInputChange(fieldId, e.target.value)}
                required={field.required}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select {field.name}</option>
                {field.options?.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            ) : (
              <input
                type={field.type}
                value={formData[fieldId] || ''}
                onChange={(e) => handleInputChange(fieldId, e.target.value)}
                placeholder={field.placeholder}
                required={field.required}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}
          </div>
        ))}

        {error && (
          <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <Button
          type="submit"
          disabled={loading || !isFormValid()}
          className="w-full"
        >
          {loading ? 'Submitting...' : 'Start Getting Quotes'}
        </Button>
      </form>
    </Card>
  );

  // Render processing status
  const renderProcessing = () => (
    <Card className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Getting Your Quotes</h2>
      <p className="text-gray-600 mb-6">
        We're now getting quotes from your selected carriers. This may take a few minutes.
      </p>

      <div className="grid gap-4">
        {selectedCarriers.map(carrierId => {
          const carrier = AVAILABLE_CARRIERS.find(c => c.id === carrierId);
          const status = carrierStatuses[carrierId];
          
          return (
            <div key={carrierId} className="border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{carrier?.name}</h3>
                <div className="flex items-center space-x-2">
                  {status?.status === 'processing' && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  )}
                  {status?.status === 'completed' && (
                    <div className="text-green-600">✓ Complete</div>
                  )}
                  {status?.status === 'error' && (
                    <div className="text-red-600">✗ Error</div>
                  )}
                </div>
              </div>
              
              {status?.error && (
                <p className="text-red-600 text-sm mt-2">{status.error}</p>
              )}
              
              {status?.quote && (
                <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded">
                  <p className="text-green-800 font-semibold">
                    Quote: {status.quote.price} per {status.quote.term}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {completedQuotes.length > 0 && (
        <div className="mt-6">
          <Button
            onClick={() => setCurrentPhase('results')}
            className="w-full"
          >
            View All Quotes ({completedQuotes.length})
          </Button>
        </div>
      )}
    </Card>
  );

  // Render results
  const renderResults = () => (
    <Card className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Your Quotes</h2>
      
      <div className="grid gap-4">
        {completedQuotes.map((quote, index) => (
          <div key={index} className="border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">{quote.carrier.toUpperCase()}</h3>
              <div className="text-right">
                <p className="text-2xl font-bold text-green-600">{quote.price}</p>
                <p className="text-gray-600">per {quote.term}</p>
              </div>
            </div>
            
            {quote.features && quote.features.length > 0 && (
              <div className="mb-4">
                <h4 className="font-medium mb-2">Features:</h4>
                <ul className="list-disc list-inside text-sm text-gray-600">
                  {quote.features.map((feature, idx) => (
                    <li key={idx}>{feature}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {quote.discounts && quote.discounts.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Discounts:</h4>
                <ul className="list-disc list-inside text-sm text-gray-600">
                  {quote.discounts.map((discount, idx) => (
                    <li key={idx}>{discount.name}: {discount.amount}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 flex space-x-4">
        <Button
          onClick={() => {
            setCurrentPhase('selection');
            setTaskId(null);
            setFormData({});
            setCarrierStatuses({});
            setCompletedQuotes([]);
            setError(null);
          }}
          variant="outline"
          className="flex-1"
        >
          Start New Quote
        </Button>
      </div>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        {/* Debug info - remove in production */}
        {import.meta.env.DEV && (
          <div className="mb-4 p-2 bg-yellow-100 border border-yellow-300 rounded text-xs">
            <strong>Debug:</strong> Phase: {currentPhase}, TaskId: {taskId || 'null'}, Loading: {loading.toString()}
          </div>
        )}
        
        {currentPhase === 'selection' && renderCarrierSelection()}
        {currentPhase === 'data_collection' && renderDataCollection()}
        {currentPhase === 'processing' && renderProcessing()}
        {currentPhase === 'results' && renderResults()}
      </div>
    </div>
  );
};

export default MultiCarrierQuoteForm; 