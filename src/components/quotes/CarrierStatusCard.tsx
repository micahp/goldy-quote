import React from 'react';
import { Check, Clock, AlertCircle, Zap, Shield, DollarSign, Loader } from 'lucide-react';

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

interface CarrierStatusCardProps {
  carrier: string;
  status: 'waiting' | 'processing' | 'completed' | 'error';
  quote?: QuoteResult;
  error?: string;
  progress?: number;
  /** Server-relative URLs for navigation snapshots captured during automation. */
  snapshots?: string[];
}

const CARRIER_CONFIGS = {
  GEICO: {
    name: 'GEICO',
    color: 'blue',
    logo: '🦎',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    accentColor: 'text-blue-600'
  },
  Progressive: {
    name: 'Progressive',
    color: 'blue',
    logo: '🅿️',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    accentColor: 'text-blue-600'
  },
  'State Farm': {
    name: 'State Farm',
    color: 'red',
    logo: '🏛️',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    accentColor: 'text-red-600'
  },
  'Liberty Mutual': {
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
  quote,
  error,
  progress = 0,
  snapshots
}) => {
  const config = CARRIER_CONFIGS[carrier as keyof typeof CARRIER_CONFIGS] || {
    name: carrier,
    color: 'gray',
    logo: '🏢',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    accentColor: 'text-gray-600'
  };
  
  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return <Check className="w-5 h-5 text-green-600" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case 'processing':
        return <Loader className="w-5 h-5 text-blue-600 animate-spin" />;
      case 'waiting':
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'waiting':
        return 'Waiting to start...';
      case 'processing':
        if (progress < 30) return 'Starting quote process...';
        if (progress < 60) return 'Filling application forms...';
        if (progress < 90) return 'Processing your information...';
        return 'Finalizing quote...';
      case 'completed':
        return 'Quote completed!';
      case 'error':
        return 'Error occurred';
      default:
        return 'Unknown status';
    }
  };

  const isProcessing = status === 'processing';
  const isCompleted = status === 'completed';
  const hasError = status === 'error';

  return (
    <div className={`
      relative border-2 rounded-lg p-4 transition-all duration-300
      ${config.bgColor} ${config.borderColor}
      ${isProcessing ? 'ring-2 ring-blue-300 shadow-lg' : ''}
      ${isCompleted ? 'ring-2 ring-green-300 bg-green-50 border-green-300' : ''}
      ${hasError ? 'ring-2 ring-red-300 bg-red-50 border-red-300' : ''}
    `}>
      
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">{config.logo}</span>
          <div>
            <h3 className="font-semibold text-gray-800">{config.name}</h3>
            {isProcessing && progress > 0 && (
              <p className="text-sm text-gray-500">{Math.round(progress)}% complete</p>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {getStatusIcon()}
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
              className="h-2 rounded-full bg-blue-500 transition-all duration-500"
              style={{ width: `${Math.max(5, progress)}%` }}
            />
          </div>
        </div>
      )}

      {/* Quote Result */}
      {isCompleted && quote && (
        <div className="mt-3 p-3 bg-green-100 border border-green-300 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-green-800">Final Quote:</span>
            <span className="font-bold text-xl text-green-700">
              {quote.price}/{quote.term}
            </span>
          </div>
          
          {/* Discounts */}
          {quote.discounts && quote.discounts.length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-medium text-green-700 mb-1">Applied Discounts:</p>
              <div className="flex flex-wrap gap-1">
                {quote.discounts.map((discount, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-200 text-green-800"
                  >
                    <DollarSign className="w-3 h-3 mr-1" />
                    {discount.name}: {discount.amount}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Features */}
          {quote.features && quote.features.length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-medium text-green-700 mb-1">Features:</p>
              <div className="flex flex-wrap gap-1">
                {quote.features.slice(0, 3).map((feature, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                  >
                    <Shield className="w-3 h-3 mr-1" />
                    {feature}
                  </span>
                ))}
                {quote.features.length > 3 && (
                  <span className="text-xs text-gray-500">+{quote.features.length - 3} more</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error Details */}
      {hasError && (
        <div className="mt-3 p-3 bg-red-100 border border-red-300 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span className="text-sm font-medium text-red-800">Unable to get quote</span>
          </div>
          {error && (
            <p className="text-xs text-red-600 mt-1">{error}</p>
          )}
        </div>
      )}

      {/* Snapshot Thumbnails */}
      {snapshots && snapshots.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-medium text-gray-600 mb-1">Snapshots:</p>
          <div className="flex space-x-2 overflow-x-auto pb-1">
            {snapshots.map((src, idx) => (
              <img
                key={idx}
                src={src}
                alt={`Snapshot ${idx + 1}`}
                className="h-20 w-32 object-cover rounded border border-gray-300 flex-none"
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CarrierStatusCard; 