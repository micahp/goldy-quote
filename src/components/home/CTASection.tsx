import React from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../common/Button';
import { CheckCircle, ArrowRight } from 'lucide-react';

const CTASection: React.FC = () => {
  const navigate = useNavigate();
  
  const benefits = [
    'Compare quotes from top insurers in one place',
    'Save up to $500 on your car insurance',
    'Customize coverage to fit your needs',
    'Quick and easy process takes only minutes',
  ];
  
  return (
    <section className="py-16 bg-[#F7B538]/10 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-[#F7B538]/20 rounded-full -translate-y-1/2 translate-x-1/2"></div>
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#00A6A6]/10 rounded-full translate-y-1/2 -translate-x-1/2"></div>
      
      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-[#1A3A63] mb-6">
            Ready to Find Your Perfect Car Insurance?
          </h2>
          <p className="text-lg text-gray-700 mb-8 max-w-2xl mx-auto">
            Join thousands of drivers who save time and money by comparing multiple insurance quotes in one place.
          </p>
          
          <div className="flex flex-wrap justify-center gap-4 mb-10">
            {benefits.map((benefit, index) => (
              <div 
                key={index} 
                className="flex items-center bg-white px-4 py-2 rounded-full shadow-sm"
              >
                <CheckCircle className="w-5 h-5 text-[#00A6A6] mr-2 flex-shrink-0" />
                <span className="text-sm font-medium text-gray-700">{benefit}</span>
              </div>
            ))}
          </div>
          
          <Button 
            variant="primary" 
            size="lg" 
            onClick={() => navigate('/quote-form')}
            className="font-bold px-8 shadow-lg transition-transform hover:scale-105"
          >
            Get Free Quotes Now <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
          
          <p className="mt-4 text-sm text-gray-600">
            No obligations. No spam. Just great rates from trusted insurers.
          </p>
        </div>
      </div>
    </section>
  );
};

export default CTASection;