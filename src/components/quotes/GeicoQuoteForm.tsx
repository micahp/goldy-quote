import React, { useState, useEffect } from 'react';

interface FieldDefinition {
  name: string;
  type: string;
  options?: string[];
  required: boolean;
}

interface QuoteFormProps {
  onQuoteReceived: (quote: any) => void;
}

const GeicoQuoteForm: React.FC<QuoteFormProps> = ({ onQuoteReceived }) => {
  const [taskId, setTaskId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [step, setStep] = useState<number>(0);
  const [totalSteps, setTotalSteps] = useState<number>(0);
  const [fields, setFields] = useState<Record<string, FieldDefinition>>({});
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [quote, setQuote] = useState<any>(null);
  const [previousFieldSignatures, setPreviousFieldSignatures] = useState<Set<string>>(new Set());

  // Start the quote process when component mounts
  useEffect(() => {
    startQuoteProcess();
  }, []);

  // Generate a unique signature for the current set of fields to detect duplicates
  const generateFieldSignature = (fields: Record<string, FieldDefinition>): string => {
    return Object.keys(fields)
      .sort()
      .map(key => `${key}-${fields[key].name}-${fields[key].type}`)
      .join('|');
  };

  // Function to start the quote process
  const startQuoteProcess = async () => {
    setLoading(true);
    setError(null);
    setPreviousFieldSignatures(new Set()); // Reset field signatures
    setStep(0); // Reset step counter
    
    try {
      const response = await fetch('http://localhost:3001/api/quotes/geico/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      setTaskId(data.taskId);
      setStatus(data.status);
      setStep(1); // Start at step 1
      setFields(data.requiredFields || {});
      setTotalSteps(estimateTotalSteps(data.requiredFields || {}));
      
      // Initialize form data with empty values
      const initialFormData: Record<string, any> = {};
      Object.keys(data.requiredFields || {}).forEach(key => {
        initialFormData[key] = '';
      });
      setFormData(initialFormData);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start quote process');
      console.error('Error starting quote process:', err);
    } finally {
      setLoading(false);
    }
  };

  // Estimate total steps based on field types
  const estimateTotalSteps = (fields: Record<string, FieldDefinition>): number => {
    const fieldNames = Object.values(fields).map(field => field.name.toLowerCase());
    const hasZipCode = fieldNames.some(name => name.includes('zip'));
    const hasPersonalInfo = fieldNames.some(name => 
      name.includes('first name') || name.includes('last name') || name.includes('dob')
    );
    const hasVehicleInfo = fieldNames.some(name => 
      name.includes('vehicle') || name.includes('car') || name.includes('auto')
    );
    const hasDrivingHistory = fieldNames.some(name => 
      name.includes('driving') || name.includes('accident') || name.includes('violation')
    );
    const hasCoverage = fieldNames.some(name => 
      name.includes('coverage') || name.includes('limit') || name.includes('deductible')
    );
    
    // Count expected form types
    let estimatedSteps = 0;
    if (hasZipCode) estimatedSteps++;
    if (hasPersonalInfo) estimatedSteps++;
    if (hasVehicleInfo) estimatedSteps++;
    if (hasDrivingHistory) estimatedSteps++;
    if (hasCoverage) estimatedSteps++;
    
    // Add one more step for review/submission
    estimatedSteps++;
    
    // Ensure at least 2 steps (for the current form and a final step)
    return Math.max(estimatedSteps, 2);
  };

  // Function to handle form input changes
  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Function to submit the current step data
  const submitStepData = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!taskId) {
      setError('No active quote process');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Store the current field signature before submitting
      const currentSignature = generateFieldSignature(fields);
      setPreviousFieldSignatures(prev => new Set([...prev, currentSignature]));
      
      const response = await fetch('http://localhost:3001/api/quotes/geico/step', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskId,
          data: formData
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      setStatus(data.status);
      
      if (data.status === 'completed' && data.quote) {
        // Quote completed
        setQuote(data.quote);
        onQuoteReceived(data.quote);
      } else if (data.status === 'waiting_for_input') {
        // Move to next step
        setStep(prevStep => prevStep + 1);
        setFields(data.requiredFields || {});
        
        // Update estimated total steps if needed
        const newEstimatedSteps = estimateTotalSteps(data.requiredFields || {});
        setTotalSteps(current => Math.max(current, step + newEstimatedSteps));
        
        // Initialize form data for new fields
        const newFormData: Record<string, any> = {};
        Object.keys(data.requiredFields || {}).forEach(key => {
          newFormData[key] = '';
        });
        setFormData(newFormData);
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process step data');
      console.error('Error submitting step data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Cleanup the task when component unmounts
  useEffect(() => {
    return () => {
      if (taskId) {
        fetch(`http://localhost:3001/api/quotes/geico/task/${taskId}`, {
          method: 'DELETE'
        }).catch(err => {
          console.error('Error cleaning up task:', err);
        });
      }
    };
  }, [taskId]);

  // Determine form type based on field analysis
  const getFormTitle = (): string => {
    const fieldNames = Object.values(fields).map(field => field.name.toLowerCase());
    
    if (fieldNames.some(name => name.includes('zip'))) {
      return 'Starting Your Quote';
    }
    
    if (fieldNames.some(name => 
      name.includes('address') || name.includes('street') || name.includes('apt')
    )) {
      return 'Your Address';
    }
    
    if (fieldNames.some(name => 
      name.includes('first name') || name.includes('last name') || name.includes('birth')
    )) {
      return 'Personal Information';
    }
    
    if (fieldNames.some(name => 
      name.includes('vehicle') || name.includes('car') || name.includes('auto') || 
      name.includes('make') || name.includes('model')
    )) {
      return 'Vehicle Information';
    }
    
    if (fieldNames.some(name => 
      name.includes('driving') || name.includes('accident') || name.includes('violation')
    )) {
      return 'Driving History';
    }
    
    if (fieldNames.some(name => 
      name.includes('coverage') || name.includes('limit') || name.includes('deductible')
    )) {
      return 'Coverage Options';
    }
    
    return 'Geico Auto Insurance Quote';
  };

  // Render step indicator
  const renderStepIndicator = () => {
    return (
      <div className="mb-6">
        <div className="flex items-center justify-center">
          <div className="text-center">
            <div className="text-sm text-gray-500 uppercase tracking-wide font-semibold mb-1">
              Step {step} of {totalSteps}
            </div>
            <div className="relative">
              <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-gray-200">
                <div 
                  style={{ width: `${Math.min((step / totalSteps) * 100, 100)}%` }} 
                  className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-indigo-600">
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render the form based on current fields
  const renderFormFields = () => {
    return Object.entries(fields).map(([fieldId, field]) => {
      // Skip hidden fields
      if (field.type === 'hidden') return null;
      
      const { name, type, options, required } = field;
      
      switch (type) {
        case 'select':
          return (
            <div key={fieldId} className="mb-4">
              <label htmlFor={fieldId} className="block text-sm font-medium text-gray-700 mb-1">
                {name} {required && <span className="text-red-500">*</span>}
              </label>
              <select
                id={fieldId}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                value={formData[fieldId] || ''}
                onChange={(e) => handleInputChange(fieldId, e.target.value)}
                required={required}
              >
                <option value="">Select an option</option>
                {options?.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
          );
          
        case 'checkbox':
          return (
            <div key={fieldId} className="mb-4 flex items-center">
              <input
                id={fieldId}
                type="checkbox"
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                checked={!!formData[fieldId]}
                onChange={(e) => handleInputChange(fieldId, e.target.checked)}
                required={required}
              />
              <label htmlFor={fieldId} className="ml-2 block text-sm text-gray-700">
                {name} {required && <span className="text-red-500">*</span>}
              </label>
            </div>
          );
          
        case 'radio':
          return (
            <div key={fieldId} className="mb-4">
              <span className="block text-sm font-medium text-gray-700 mb-1">
                {name} {required && <span className="text-red-500">*</span>}
              </span>
              <div className="space-y-2">
                {options?.map(option => (
                  <div key={option} className="flex items-center">
                    <input
                      id={`${fieldId}-${option}`}
                      name={fieldId}
                      type="radio"
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                      value={option}
                      checked={formData[fieldId] === option}
                      onChange={(e) => handleInputChange(fieldId, e.target.value)}
                      required={required}
                    />
                    <label htmlFor={`${fieldId}-${option}`} className="ml-2 block text-sm text-gray-700">
                      {option}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          );
          
        case 'textarea':
          return (
            <div key={fieldId} className="mb-4">
              <label htmlFor={fieldId} className="block text-sm font-medium text-gray-700 mb-1">
                {name} {required && <span className="text-red-500">*</span>}
              </label>
              <textarea
                id={fieldId}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                value={formData[fieldId] || ''}
                onChange={(e) => handleInputChange(fieldId, e.target.value)}
                required={required}
              />
            </div>
          );
          
        default:
          // Default to text input for all other types
          return (
            <div key={fieldId} className="mb-4">
              <label htmlFor={fieldId} className="block text-sm font-medium text-gray-700 mb-1">
                {name} {required && <span className="text-red-500">*</span>}
              </label>
              <input
                id={fieldId}
                type={type === 'password' ? 'password' : 'text'}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                value={formData[fieldId] || ''}
                onChange={(e) => handleInputChange(fieldId, e.target.value)}
                required={required}
              />
            </div>
          );
      }
    });
  };

  // Display quote if completed
  if (quote) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-indigo-700 mb-4">Your Geico Quote</h2>
        <div className="mb-4">
          <p className="text-lg font-semibold">Price: <span className="text-green-600">{quote.price}</span></p>
          <p>Term: {quote.term}</p>
        </div>
        
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-2">Quote Details:</h3>
          <div className="bg-gray-50 p-4 rounded-md">
            <pre className="whitespace-pre-wrap text-sm">
              {JSON.stringify(quote.details, null, 2)}
            </pre>
          </div>
        </div>
        
        <button
          className="mt-6 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          onClick={startQuoteProcess}
        >
          Start New Quote
        </button>
      </div>
    );
  }

  // Show loading indicator
  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        {renderStepIndicator()}
        <h2 className="text-xl font-bold text-gray-800 mb-4">{getFormTitle()}</h2>
        <div className="flex justify-center items-center py-10">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
          <p className="ml-3">Processing...</p>
        </div>
      </div>
    );
  }

  // Show error message
  if (error) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        {renderStepIndicator()}
        <h2 className="text-xl font-bold text-gray-800 mb-4">{getFormTitle()}</h2>
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          Error: {error}
          <div className="mt-2">
            <button
              onClick={startQuoteProcess}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Restart Quote Process
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      {renderStepIndicator()}
      <h2 className="text-xl font-bold text-gray-800 mb-4">{getFormTitle()}</h2>
      
      <form onSubmit={submitStepData}>
        {renderFormFields()}
        
        <div className="mt-6">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Continue
          </button>
        </div>
      </form>
      
      {status && (
        <div className="mt-4 text-sm text-gray-500">
          Status: {status} | Task ID: {taskId} | Step: {step} of {totalSteps}
        </div>
      )}
    </div>
  );
};

export default GeicoQuoteForm; 