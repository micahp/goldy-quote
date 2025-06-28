// DynamicStepForm.tsx 
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Button from '../common/Button';
import Card from '../common/Card';
import {
  useRequiredFieldsWebSocket,
} from '../../hooks/useRequiredFieldsWebSocket';
import {
  mapFieldDefinitionToFormConfig,
  mapFieldToInputType,
} from '../../utils/fieldMapping';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DynamicStepFormProps {
  /** Task ID – required for subscribing to carrier_status events */
  taskId: string;
  /**
   * Called whenever the user submits the current step. Receives the form data
   * for *only* the fields in the current requiredFields object.
   */
  onSubmitStep?: (stepData: Record<string, any>) => Promise<void> | void;
  /** Optional: Restrict events to a single carrier. Useful when showing one carrier at a time. */
  carrier?: string;
  /** Optional className override */
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const DynamicStepForm: React.FC<DynamicStepFormProps> = ({
  taskId,
  carrier,
  onSubmitStep,
  className = '',
}) => {
  // WebSocket state
  const {
    requiredFields,
    currentStep,
    status,
    isConnected,
  } = useRequiredFieldsWebSocket({ taskId, carrier });

  // Local form state – store values keyed by field ID
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // When requiredFields changes (e.g., agent progressed to next step), reset formData
  useEffect(() => {
    if (requiredFields) {
      const initial: Record<string, any> = {};
      Object.values(requiredFields).forEach((field) => {
        const inputType = mapFieldToInputType(field);
        // Simple default values – leverage util if needed
        if (inputType === 'checkbox') {
          initial[field.id || field.name || ''] = false;
        } else {
          initial[field.id || field.name || ''] = '';
        }
      });
      setFormData(initial);
    }
  }, [requiredFields]);

  // Memoized array of mapped configs for rendering
  const fieldConfigs = useMemo(() => {
    if (!requiredFields) return [];
    return Object.values(requiredFields).map(mapFieldDefinitionToFormConfig);
  }, [requiredFields]);

  // -------------------------------------------------------------------------
  // Event handlers
  // -------------------------------------------------------------------------

  const handleInputChange = useCallback(
    (fieldId: string, value: any) => {
      setFormData((prev) => ({
        ...prev,
        [fieldId]: value,
      }));
    },
    []
  );

  const handleSubmit = useCallback(async () => {
    if (!requiredFields) return;

    // Extract only fields present in requiredFields (ignore stray keys)
    const stepData: Record<string, any> = {};
    Object.keys(requiredFields).forEach((fieldId) => {
      if (formData[fieldId] !== undefined) {
        stepData[fieldId] = formData[fieldId];
      }
    });

    setSubmitError(null);
    setSubmitting(true);

    try {
      if (onSubmitStep) {
        await onSubmitStep(stepData);
      } else {
        // Fallback: POST directly to backend endpoint
        const response = await fetch(`/api/quotes/${taskId}/data`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            step: currentStep,
            data: stepData,
          }),
        });

        if (!response.ok) {
          throw new Error(`Server responded with ${response.status}`);
        }
      }

      // Optionally clear form or rely on requiredFields update to reset
    } catch (error: any) {
      console.error('DynamicStepForm submit error:', error);
      setSubmitError(error.message || 'Unknown error');
    } finally {
      setSubmitting(false);
    }
  }, [formData, onSubmitStep, requiredFields, taskId, currentStep]);

  // -------------------------------------------------------------------------
  // Render helpers
  // -------------------------------------------------------------------------

  const renderField = (config: ReturnType<typeof mapFieldDefinitionToFormConfig>) => {
    const { id, inputType, label, required, options, placeholder } = config;
    const value = formData[id] ?? '';

    switch (inputType) {
      case 'select':
        return (
          <div key={id} className="mb-4">
            <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
              {label} {required && <span className="text-red-500">*</span>}
            </label>
            <select
              id={id}
              name={id}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              value={value}
              onChange={(e) => handleInputChange(id, e.target.value)}
              required={required}
              aria-required={required}
            >
              <option value="">Select an option</option>
              {options?.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        );
      case 'radio':
        return (
          <fieldset key={id} className="mb-4">
            <legend className="block text-sm font-medium text-gray-700 mb-2">
              {label} {required && <span className="text-red-500">*</span>}
            </legend>
            <div className="flex space-x-4">
              {options?.map((opt) => (
                <div key={opt.value} className="flex items-center">
                  <input
                    id={`${id}-${opt.value}`}
                    name={id}
                    type="radio"
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                    value={opt.value}
                    checked={value === opt.value}
                    onChange={(e) => handleInputChange(id, e.target.value)}
                    required={required}
                    aria-required={required}
                  />
                  <label htmlFor={`${id}-${opt.value}`} className="ml-2 block text-sm text-gray-700">
                    {opt.label}
                  </label>
                </div>
              ))}
            </div>
          </fieldset>
        );
      case 'checkbox':
        return (
          <div key={id} className="mb-4 flex items-center">
            <input
              id={id}
              type="checkbox"
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              checked={!!value}
              onChange={(e) => handleInputChange(id, e.target.checked)}
              aria-required={required}
            />
            <label htmlFor={id} className="ml-2 text-sm text-gray-700">
              {label}
            </label>
          </div>
        );
      default:
        // text, email, tel, number, date, etc.
        return (
          <div key={id} className="mb-4">
            <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
              {label} {required && <span className="text-red-500">*</span>}
            </label>
            <input
              id={id}
              type={inputType}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              value={value}
              onChange={(e) => handleInputChange(id, e.target.value)}
              placeholder={placeholder}
              required={required}
              aria-required={required}
            />
          </div>
        );
    }
  };

  // Determine if current data satisfies required fields
  const isStepValid = useMemo(() => {
    if (!requiredFields) return false;
    return Object.values(requiredFields).every((field) => {
      if (!field.required) return true;
      const val = formData[field.id || field.name || ''];
      return val !== undefined && val !== '' && val !== null;
    });
  }, [requiredFields, formData]);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  if (!isConnected) {
    return <p className="text-gray-500">Connecting to server...</p>;
  }

  if (!requiredFields) {
    return <p className="text-gray-500">Waiting for required fields…</p>;
  }

  return (
    <Card className={`p-6 ${className}`}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Step {currentStep ?? '-'} </h2>
        {status && (
          <p className="text-gray-600 mt-1 capitalize">Status: {status.replace(/_/g, ' ')}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {fieldConfigs.map(renderField)}
      </div>

      <div className="flex justify-end mt-8">
        {onSubmitStep && (
          <Button onClick={handleSubmit} disabled={!isStepValid || submitting}>
            {submitting ? 'Submitting…' : 'Submit Step'}
          </Button>
        )}
        {!onSubmitStep && (
          <Button onClick={handleSubmit} disabled={!isStepValid || submitting}>
            {submitting ? 'Submitting…' : 'Submit Step'}
          </Button>
        )}
      </div>
      {submitError && (
        <p className="mt-4 text-sm text-red-600" role="alert">
          {submitError}
        </p>
      )}
    </Card>
  );
};

export default DynamicStepForm; 