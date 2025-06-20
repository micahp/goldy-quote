import React from 'react';
import { Check, Clock, AlertCircle, Zap, Shield, DollarSign } from 'lucide-react';

interface CarrierStatusCardProps {
  carrier: string;
  status: 'idle' | 'filtering' | 'step_1' | 'step_2' | 'step_3' | 'completing' | 'complete' | 'error';
  currentStep?: string;
  stepDescription?: string;
  estimatedPrice?: string;
  discountsFound?: string[];
  animationState?: 'idle' | 'pulsing' | 'celebrating';
  error?: string;
}

const CARRIER_CONFIGS = {
  geico: {
    name: 'GEICO',
    color: 'blue',
    logo: '🦎',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    accentColor: 'text-blue-600'
  },
  progressive: {
    name: 'Progressive',
    color: 'blue',
    logo: '🅿️',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    accentColor: 'text-blue-600'
  },
  statefarm: {
    name: 'State Farm',
    color: 'red',
    logo: '🏛️',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    accentColor: 'text-red-600'
  },
  libertymutual: {
    name: 'Liberty Mutual',
    color: 'yellow',
    logo: '🗽',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    accentColor: 'text-yellow-600'
  }
};

const CarrierStatusCard: React.FC<CarrierStatusCardProps> = ({
  carrier,
  status,
  currentStep,
  stepDescription,
  estimatedPrice,
  discountsFound = [],
  animationState = 'idle',
  error
}) => {
  const config = CARRIER_CONFIGS[carrier as keyof typeof CARRIER_CONFIGS];
  
  const getStatusIcon = () => {
    switch (status) {
      case 'complete':
        return <Check className="w-5 h-5 text-green-600" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'idle':
        return 'Ready to start';
      case 'filtering':
        return 'Checking availability...';
      case 'step_1':
        return 'Processing personal info...';
      case 'step_2':
        return 'Analyzing vehicle details...';
      case 'step_3':
        return 'Calculating discounts...';
      case 'completing':
        return 'Finalizing quote...';
      case 'complete':
        return 'Quote ready!';
      case 'error':
        return 'Error occurred';
      default:
        return stepDescription || 'Processing...';
    }
  };

  const isProcessing = ['filtering', 'step_1', 'step_2', 'step_3', 'completing'].includes(status);
  const isActive = isProcessing || animationState === 'pulsing';

  return (
    <div className={`
      relative border-2 rounded-lg p-4 transition-all duration-300
      ${config.bgColor} ${config.borderColor}
      ${isActive ? 'ring-2 ring-blue-300 shadow-lg transform scale-105' : ''}
      ${animationState === 'celebrating' ? 'animate-pulse' : ''}
      ${status === 'complete' ? 'ring-2 ring-green-300 bg-green-50' : ''}
      ${status === 'error' ? 'ring-2 ring-red-300 bg-red-50' : ''}
    `}>
      
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">{config.logo}</span>
          <div>
            <h3 className="font-semibold text-gray-800">{config.name}</h3>
            {currentStep && (
              <p className="text-sm text-gray-500">Step {currentStep}</p>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {getStatusIcon()}
          {isProcessing && (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          )}
        </div>
      </div>

      {/* Status Description */}
      <div className="mb-3">
        <p className="text-sm text-gray-600">
          {getStatusText()}
        </p>
        {error && (
          <p className="text-sm text-red-600 mt-1">{error}</p>
        )}
      </div>

      {/* Progress Bar */}
      {isProcessing && (
        <div className="mb-3">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-500 ${
                status === 'filtering' ? 'w-1/6 bg-blue-400' :
                status === 'step_1' ? 'w-2/6 bg-blue-500' :
                status === 'step_2' ? 'w-4/6 bg-blue-600' :
                status === 'step_3' ? 'w-5/6 bg-blue-700' :
                status === 'completing' ? 'w-full bg-green-500' :
                'w-0'
              } ${animationState === 'pulsing' ? 'animate-pulse' : ''}`}
            />
          </div>
        </div>
      )}

      {/* Estimated Price */}
      {estimatedPrice && (
        <div className="mb-3 p-2 bg-white rounded border">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Estimated Price:</span>
            <span className={`font-bold text-lg ${
              animationState === 'celebrating' ? 'text-green-600 animate-bounce' : 'text-gray-800'
            }`}>
              {estimatedPrice}
            </span>
          </div>
        </div>
      )}

      {/* Discounts Found */}
      {discountsFound.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center space-x-1 text-sm font-medium text-gray-700">
            <DollarSign className="w-4 h-4" />
            <span>Discounts Found:</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {discountsFound.map((discount, index) => (
              <span
                key={discount}
                className={`
                  inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                  bg-green-100 text-green-800 border border-green-200
                  ${animationState === 'celebrating' ? 'animate-pulse' : ''}
                `}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <Zap className="w-3 h-3 mr-1" />
                {discount}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Final Quote Display */}
      {status === 'complete' && estimatedPrice && (
        <div className="mt-3 p-3 bg-green-100 border border-green-300 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Shield className="w-5 h-5 text-green-600" />
              <span className="font-semibold text-green-800">Final Quote</span>
            </div>
            <span className="text-xl font-bold text-green-800">{estimatedPrice}</span>
          </div>
          {discountsFound.length > 0 && (
            <p className="text-sm text-green-700 mt-1">
              {discountsFound.length} discount{discountsFound.length !== 1 ? 's' : ''} applied
            </p>
          )}
        </div>
      )}

      {/* Pulse Animation Overlay */}
      {animationState === 'pulsing' && (
        <div className="absolute inset-0 rounded-lg bg-blue-200 opacity-20 animate-ping pointer-events-none" />
      )}
    </div>
  );
};

export default CarrierStatusCard; 