import React, { useState } from 'react';
import { ChevronDown, ChevronUp, CheckCircle } from 'lucide-react';
import Card from '../common/Card';
import Button from '../common/Button';
import StarRating from '../common/StarRating';
import { InsuranceQuote, InsuranceProvider } from '../../types';

interface QuoteCardProps {
  quote: InsuranceQuote;
  provider: InsuranceProvider;
  isSelected?: boolean;
  onSelect: () => void;
}

const QuoteCard: React.FC<QuoteCardProps> = ({ quote, provider, isSelected = false, onSelect }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const totalDiscounts = quote.discounts.reduce((sum, discount) => sum + discount.amount, 0);

  const handleSelect = () => {
    if (!isSelected) {
      onSelect();
      
      // If this is Geico, redirect to their site
      if (provider.id === 'geico') {
        // In a real app, this would be your affiliate link
        const affiliateUrl = 'https://www.geico.com';
        
        // Track the conversion
        try {
          // In a real app, you would implement proper conversion tracking
          console.log('Tracking conversion for Geico redirect');
        } catch (error) {
          console.error('Error tracking conversion:', error);
        }
        
        // Redirect to Geico
        window.location.href = affiliateUrl;
      }
    }
  };
  
  return (
    <Card 
      className={`transition-all duration-300 ${
        isSelected ? 'border-2 border-[#FFCC33] ring-2 ring-[#FFCC33]/30' : ''
      }`}
      elevation={isSelected ? 'md' : 'sm'}
    >
      {quote.bestFor && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-[#FFCC33] text-[#7A0019] font-bold py-1 px-4 rounded-full text-sm shadow-md">
          Best For {quote.bestFor}
        </div>
      )}
      
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <img 
              src={provider.logo} 
              alt={provider.name} 
              className="w-12 h-12 object-contain mr-3"
            />
            <div>
              <h3 className="font-bold text-lg text-[#7A0019]">{provider.name}</h3>
              <StarRating rating={provider.rating} size="sm" reviewCount={provider.reviewCount} />
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-2xl font-bold text-[#7A0019]">${quote.monthlyRate.toFixed(2)}<span className="text-sm font-medium text-gray-500">/mo</span></div>
            <div className="text-sm text-gray-500">${quote.annualRate.toFixed(2)}/year</div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
          <div className="bg-gray-50 p-3 rounded-md">
            <div className="text-gray-500 mb-1">Liability</div>
            <div className="font-medium">{quote.coverage.liability.limit}</div>
          </div>
          <div className="bg-gray-50 p-3 rounded-md">
            <div className="text-gray-500 mb-1">Deductible</div>
            <div className="font-medium">{quote.coverage.collision.limit}</div>
          </div>
        </div>
        
        <div className="mb-4">
          <h4 className="font-medium text-[#7A0019] mb-2">Key Features</h4>
          <ul className="space-y-1">
            {quote.features.slice(0, 3).map((feature, index) => (
              <li key={index} className="flex items-center text-sm">
                <CheckCircle className="w-4 h-4 text-[#00A6A6] mr-2 flex-shrink-0" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>
        
        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-gray-200 animate-fadeIn">
            <h4 className="font-medium text-[#7A0019] mb-3">Coverage Details</h4>
            <div className="space-y-3 mb-4">
              {Object.entries(quote.coverage).map(([key, coverage]) => (
                <div key={key} className="flex justify-between text-sm">
                  <div className="text-gray-600">{coverage.type}</div>
                  <div className="flex items-center">
                    <span className="mr-3 font-medium">{coverage.limit}</span>
                    <span className="text-[#7A0019] font-medium">${coverage.premium.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
            
            <h4 className="font-medium text-[#7A0019] mb-3">Discounts Applied</h4>
            <div className="space-y-3 mb-4">
              {quote.discounts.map((discount, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <div className="text-gray-600">{discount.name}</div>
                  <div className="text-green-600 font-medium">-${discount.amount.toFixed(2)}</div>
                </div>
              ))}
              <div className="flex justify-between text-sm font-bold border-t border-gray-200 pt-2">
                <div>Total Discounts</div>
                <div className="text-green-600">-${totalDiscounts.toFixed(2)}</div>
              </div>
            </div>
          </div>
        )}
        
        <div className="flex flex-col gap-3 mt-4">
          <Button 
            variant={isSelected ? 'secondary' : 'primary'} 
            fullWidth
            onClick={handleSelect}
          >
            {isSelected ? 'Selected' : provider.id === 'geico' ? 'Continue to Geico' : 'Select Quote'}
          </Button>
          
          <Button 
            variant="outline" 
            fullWidth
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <span className="flex items-center justify-center">
                Show Less <ChevronUp className="ml-1 w-4 h-4" />
              </span>
            ) : (
              <span className="flex items-center justify-center">
                Show Details <ChevronDown className="ml-1 w-4 h-4" />
              </span>
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default QuoteCard;