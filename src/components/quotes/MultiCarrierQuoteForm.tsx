import React, { useState, useEffect, useCallback } from 'react';
import Card from '../common/Card';
import Button from '../common/Button';
import { FORM_STEPS, FormField } from './formSteps';
import { CheckCircle } from 'lucide-react';
import { useSnapshotWebSocket, SnapshotMessage } from '../../hooks/useSnapshotWebSocket';
import { useRequiredFieldsWebSocket } from '../../hooks/useRequiredFieldsWebSocket';
import type { CarrierStatusMessage } from '../../hooks/useRequiredFieldsWebSocket';
import type { CarrierStalledMessage } from '../../hooks/useRequiredFieldsWebSocket';
import { normalizeCarrierId } from './carrierUtils';

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
  error?: string;
  progress?: number;
  /** Array of screenshot URLs (server-relative) that were captured during the
   *  carrier automation process. The first item is the oldest.
   */
  snapshots?: string[];
  /** True when the carrier automation step does not match the user's current wizard step */
  outOfSync?: boolean;
  /** True when backend reports transition timeout without label advancement */
  stalled?: boolean;
  stalledReason?: string;
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

// ---------------------------------------------------------------------------
// 🗺️  Global mapping between React wizard step numbers and expected carrier
//      currentStepLabel values. Carrier-specific overrides can map known
//      divergences (e.g., Geico’s date_of_birth standalone screen).
// ---------------------------------------------------------------------------

const STEP_LABEL_MAPPINGS: Record<string, Record<number, string>> = {
  geico: {
    1: 'date_of_birth',
    2: 'name_collection',
    3: 'address_collection',
  },
  progressive: {
    1: 'personal_info',
    2: 'address_info',
    3: 'vehicle_info',
    4: 'driver_details',
    5: 'coverage_selection',
  },
  libertymutual: {
    1: 'personal_info',
  },
  statefarm: {
    1: 'personal_info',
  },
  // Fallback mapping shared by most carriers
  default: {
    1: 'personal_info',
    2: 'address_info',
    3: 'vehicle_info',
    4: 'driver_details',
    5: 'coverage_selection',
  },
};

const DOB_MM_DD_YYYY = /^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])\/\d{4}$/;
const DOB_YYYY_MM_DD = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/;

const normalizeDateOfBirth = (rawValue: unknown): string => {
  if (typeof rawValue !== 'string') return '';
  const value = rawValue.trim();
  if (!value) return '';
  if (DOB_YYYY_MM_DD.test(value)) return value;
  if (!DOB_MM_DD_YYYY.test(value)) return value;

  const [month, day, year] = value.split('/');
  return `${year}-${month}-${day}`;
};


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
  const [handoffComplete, setHandoffComplete] = useState(false);
  const [handoffMessage, setHandoffMessage] = useState('');
  const [handoffError, setHandoffError] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // 🧩  WebSocket subscription – Phase 1.1
  // ---------------------------------------------------------------------------
  // Helper to guess carrier ID from the navigated URL (best-effort).
  const detectCarrierFromUrl = (url: string): string | null => {
    const lower = url.toLowerCase();
    if (lower.includes('geico.com')) return 'geico';
    if (lower.includes('progressive.com')) return 'progressive';
    if (lower.includes('statefarm.com') || lower.includes('statefarminsurance')) return 'statefarm';
    if (lower.includes('libertymutual.com') || lower.includes('liberty') || lower.includes('lmi.co')) return 'libertymutual';
    return null;
  };

  const handleSnapshot = useCallback((payload: SnapshotMessage) => {
    const carrierId = detectCarrierFromUrl(payload.url);
    if (!carrierId) {
      console.debug('📸 Snapshot received but carrier could not be determined from URL:', payload.url);
      return;
    }

    // NOTE: the backend stores screenshots under a directory that includes the
    // carrier-specific taskId (e.g. "<baseTaskId>_geico").  The payload we
    // receive already contains that exact identifier, so we must use *that*
    // value when building the public URL; otherwise we point to a directory
    // that does not exist and the image 404s.
    const screenshotUrl = `/api/quotes/${payload.taskId}/screenshots/${payload.screenshot}`;

    setCarrierStatuses(prev => {
      const prevStatus = prev[carrierId];
      if (!prevStatus) return prev; // carrier not tracked in UI

      const updatedSnapshots = prevStatus.snapshots ? [...prevStatus.snapshots, screenshotUrl] : [screenshotUrl];

      return {
        ...prev,
        [carrierId]: {
          ...prevStatus,
          snapshots: updatedSnapshots,
        },
      };
    });

    console.debug(` Snapshot mapped to carrier "${carrierId}" →`, screenshotUrl);
  }, []);

  // Establish the socket connection as soon as the component mounts.
  useSnapshotWebSocket({ taskId, onSnapshot: handleSnapshot, enabled: !handoffComplete });

  // -----------------------------------------------------------------------
  // 🔗  Handle live carrier_status events to compute out-of-sync status
  // -----------------------------------------------------------------------
  const handleCarrierStatusUpdate = useCallback((message: CarrierStatusMessage) => {
    const { carrier, currentStepLabel, status: carrierStatus, currentStep: carrierStep } = message;
    if (!carrier) return;
    const carrierId = normalizeCarrierId(carrier);

    setCarrierStatuses(prev => {
      if (!prev[carrierId]) return prev; // Ignore unknown carrier

      const mapping = STEP_LABEL_MAPPINGS[carrierId] || STEP_LABEL_MAPPINGS.default;
      const expected = mapping[currentStep];
      const outOfSync: boolean = currentStepLabel && expected ? expected !== currentStepLabel : false;
      const shouldClearStalled = !!prev[carrierId].stalled;
      const hasOutOfSyncChange = prev[carrierId].outOfSync !== outOfSync;

      const normalizedStatus: CarrierStatus['status'] =
        carrierStatus === 'completed'
          ? 'completed'
          : carrierStatus === 'error'
            ? 'error'
            : carrierStatus === 'processing'
              ? 'processing'
              : 'waiting';
      const estimatedProgress =
        normalizedStatus === 'completed'
          ? 100
          : normalizedStatus === 'processing'
            ? Math.min(95, Math.max(prev[carrierId].progress ?? 0, carrierStep * 20))
            : prev[carrierId].progress ?? 0;

      const hasStatusChange = prev[carrierId].status !== normalizedStatus;
      const hasProgressChange = (prev[carrierId].progress ?? 0) !== estimatedProgress;
      if (!hasOutOfSyncChange && !shouldClearStalled && !hasStatusChange && !hasProgressChange) return prev;

      return {
        ...prev,
        [carrierId]: {
          ...prev[carrierId],
          status: normalizedStatus,
          progress: estimatedProgress,
          outOfSync,
          stalled: false,
          stalledReason: undefined,
        },
      };
    });
  }, [currentStep]);

  const handleCarrierStalled = useCallback((message: CarrierStalledMessage) => {
    const { carrier, expectedStepLabel, detectedStepLabel } = message;
    if (!carrier) return;
    const carrierId = normalizeCarrierId(carrier);

    setCarrierStatuses(prev => {
      if (!prev[carrierId]) return prev;
      const reason = detectedStepLabel
        ? `Expected ${expectedStepLabel}, still at ${detectedStepLabel}`
        : `Expected ${expectedStepLabel}, no confirmed step transition`;
      return {
        ...prev,
        [carrierId]: {
          ...prev[carrierId],
          stalled: true,
          stalledReason: reason,
        },
      };
    });
  }, []);

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
          progress: 0,
          snapshots: [],
          outOfSync: false,
          stalled: false,
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
      if (value === undefined || value === '') return false;
      if (field.id === 'dateOfBirth' && typeof value === 'string') {
        const normalizedDob = normalizeDateOfBirth(value);
        return DOB_MM_DD_YYYY.test(value.trim()) || DOB_YYYY_MM_DD.test(normalizedDob);
      }
      return true;
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
          const value = formData[field.id];
          stepData[field.id] = field.id === 'dateOfBirth' ? normalizeDateOfBirth(value) : value;
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

  const submitIntakeHandoff = async () => {
    setIsSubmitting(true);
    setHandoffError(null);
    
    try {
      const response = await fetch(`/api/quotes/${taskId}/handoff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          carriers,
          zipCode,
          insuranceType,
          userData: formData,
        })
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error || 'Failed to submit intake handoff');
      }

      setHandoffMessage(
        result?.message || 'Your information has been received. An agent will be in contact soon.'
      );
      setHandoffComplete(true);
      onQuotesReceived([]);
    } catch (error) {
      console.error('Error submitting intake handoff:', error);
      setHandoffError(
        error instanceof Error ? error.message : 'Unable to submit your information right now.'
      );
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
  const hasCarrierSyncRisk = Object.values(carrierStatuses).some((status) => status.outOfSync || status.stalled);

  // ---------------------------------------------------------------------------
  // 🔗  WebSocket subscription – Required fields (display-only)
  // ---------------------------------------------------------------------------
  const {
    requiredFields: liveRequiredFields,
  } = useRequiredFieldsWebSocket({
    taskId,
    onCarrierStatusUpdate: handleCarrierStatusUpdate,
    onCarrierStalled: handleCarrierStalled,
    enabled: !handoffComplete,
  });

  if (handoffComplete) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Information Received</h2>
          <p className="text-gray-700 mb-4">
            {handoffMessage || 'Thanks! An agent will be in contact with you soon.'}
          </p>
          <p className="text-sm text-gray-600 mb-6">
            We have sent your submitted details to our team for follow-up.
          </p>
          <div className="mx-auto w-full max-w-[360px] rounded-lg overflow-hidden border border-gray-200 bg-black">
            <video
              className="block w-full h-auto max-h-[640px]"
              autoPlay
              controls
              muted
              playsInline
              preload="auto"
              src="/api/media/info-received.mp4"
            >
              Your browser does not support the video tag.
            </video>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* ------------------------------------------------------------------ */}
      {/* Legacy wizard (static form) */}
      {/* ------------------------------------------------------------------ */}
      <>
        {/* Progress indicator */}
        <div className="flex items-center mb-8">
          {Object.entries(FORM_STEPS).map(([stepKey, stepData], idx, arr) => {
            const stepNumber = parseInt(stepKey);
            const isActive = stepNumber === currentStep;
            const isCompleted = stepNumber < currentStep;

            return (
              <React.Fragment key={stepKey}>
                <div className="flex flex-col items-center min-w-[90px] text-center">
                  {/* Step circle */}
                  <div
                    className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors ${
                      isCompleted
                        ? 'bg-green-500 border-green-500 text-white'
                        : isActive
                        ? 'bg-indigo-500 border-indigo-500 text-white'
                        : 'bg-gray-100 border-gray-300 text-gray-400'
                    }`}
                  >
                    {isCompleted ? <CheckCircle className="w-5 h-5" /> : stepNumber}
                  </div>
                  {/* Step title */}
                  <span
                    className={`mt-2 text-xs font-medium leading-snug ${
                      isCompleted
                        ? 'text-green-700'
                        : isActive
                        ? 'text-indigo-700'
                        : 'text-gray-600'
                    }`}
                  >
                    {stepData.title}
                  </span>
                </div>

                {/* Connector line (skip after last step) */}
                {idx < arr.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 transition-colors ${
                      isCompleted ? 'bg-green-500' : 'bg-gray-200'
                    }`}
                  />
                )}
              </React.Fragment>
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

          {/* Display required fields coming from backend as plain text */}
          {liveRequiredFields && !hasCarrierSyncRisk && (
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-gray-700">
              <p className="font-medium mb-2">Backend-required fields for this step:</p>
              <ul className="list-disc list-inside space-y-1">
                {Object.values(liveRequiredFields).map((f) => (
                  <li key={f.id || f.name}>{f.label || f.name}</li>
                ))}
              </ul>
            </div>
          )}

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
                  onClick={submitIntakeHandoff}
                  disabled={!canProceed || isSubmitting}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isSubmitting ? 'Submitting Info...' : 'Send To Agent'}
                </Button>
                {handoffError && (
                  <p className="text-sm text-red-600">{handoffError}</p>
                )}
              </div>
            )}
          </div>
        </Card>
      </>

    </div>
  );
};

export default MultiCarrierQuoteForm; 