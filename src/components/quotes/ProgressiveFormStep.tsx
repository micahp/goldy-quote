import React, { useState, useEffect } from 'react';
import { ChevronRight, User, Car, Shield, FileText, Check } from 'lucide-react';
import Button from '../common/Button';

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

interface ProgressiveFormStepProps {
  stepNumber: number;
  title: string;
  description: string;
  fields: FormField[];
  formData: Record<string, any>;
  onFieldChange: (fieldId: string, value: any) => void;
  onStepComplete: () => void;
  onBack?: () => void;
  isValid: boolean;
  loading?: boolean;
  immediateValue?: {
    show: boolean;
    title: string;
    content: React.ReactNode;
  };
}

const STEP_ICONS = {
  1: User,
  2: Car,
  3: Shield,
  4: FileText
};

const ProgressiveFormStep: React.FC<ProgressiveFormStepProps> = ({
  stepNumber,
  title,
  description,
  fields,
  formData,
  onFieldChange,
  onStepComplete,
  onBack,
  isValid,
  loading = false,
  immediateValue
}) => {
  const [showImmediateValue, setShowImmediateValue] = useState(false);
  const [fieldAnimations, setFieldAnimations] = useState<Record<string, boolean>>({});

  const StepIcon = STEP_ICONS[stepNumber as keyof typeof STEP_ICONS] || User;

  // Show immediate value after a short delay when fields are filled
  useEffect(() => {
    if (immediateValue?.show && isValid) {
      const timer = setTimeout(() => {
        setShowImmediateValue(true);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setShowImmediateValue(false);
    }
  }, [immediateValue?.show, isValid]);

  // Animate field completion
  const handleFieldChange = (fieldId: string, value: any) => {
    onFieldChange(fieldId, value);
    
    // Trigger animation for filled fields
    if (value && value !== '') {
      setFieldAnimations(prev => ({ ...prev, [fieldId]: true }));
      setTimeout(() => {
        setFieldAnimations(prev => ({ ...prev, [fieldId]: false }));
      }, 300);
    }
  };

  const renderField = (field: FormField) => {
    const fieldValue = formData[field.id] || '';
    const isFieldValid = !field.required || (fieldValue !== '' && fieldValue !== null && fieldValue !== undefined);

    return (
      <div key={field.id} className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          {field.name}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        
        {field.type === 'select' ? (
          <select
            value={fieldValue}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            required={field.required}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
          >
            <option value="">Select {field.name}</option>
            {field.options?.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        ) : field.type === 'radio' ? (
          <div className="space-y-2">
            {field.options?.map(option => (
              <label key={option} className="flex items-center space-x-2">
                <input
                  type="radio"
                  name={field.id}
                  value={option}
                  checked={fieldValue === option}
                  onChange={(e) => handleFieldChange(field.id, e.target.value)}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm text-gray-700">{option}</span>
              </label>
            ))}
          </div>
        ) : (
          <input
            type={field.type}
            value={fieldValue}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            min={field.validation?.min}
            max={field.validation?.max}
            minLength={field.validation?.minLength}
            maxLength={field.validation?.maxLength}
            pattern={field.validation?.pattern}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
          />
        )}
      </div>
    );
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Step Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-4">
          <div className="flex-shrink-0 w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
            <StepIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
            <p className="text-gray-600">{description}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form Fields */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
            {fields.map(renderField)}

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-6 border-t border-gray-200">
              {onBack ? (
                <Button variant="outline" onClick={onBack}>
                  Back
                </Button>
              ) : (
                <div></div>
              )}

              <Button
                onClick={onStepComplete}
                disabled={!isValid || loading}
                className="flex items-center space-x-2"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
                <span>{loading ? 'Processing...' : 'Continue'}</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Immediate Value Sidebar */}
        {immediateValue && (
          <div className="lg:col-span-1">
            <div className={`
              bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6 
              transition-all duration-500 transform
              ${showImmediateValue ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'}
            `}>
              <h3 className="font-semibold text-gray-900 mb-3">{immediateValue.title}</h3>
              <div className="space-y-3">
                {immediateValue.content}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProgressiveFormStep; 