import React from 'react';
import Button from '../common/Button';
import { CheckCircle, ArrowRight } from 'lucide-react';

const CTASection: React.FC = () => {
  const scrollToIntake = () => {
    const intakeSection = document.getElementById('start-intake-form');
    intakeSection?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const benefits = [
    'Quick intake form with guided questions',
    'Information is sent directly to our local agent team',
    'No carrier account creation required in v1',
    'Fast follow-up from a licensed agent',
  ];
  
  return (
    <section className="py-16 bg-[#FFCC33]/10 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-[#FFCC33]/20 rounded-full -translate-y-1/2 translate-x-1/2"></div>
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#7A0019]/10 rounded-full translate-y-1/2 -translate-x-1/2"></div>
      
      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-[#7A0019] mb-6">
            Ready To Start Your Insurance Intake?
          </h2>
          <p className="text-lg text-[#333333] mb-8 max-w-2xl mx-auto">
            Share your details once and our team will contact you to help finalize coverage.
          </p>
          
          <div className="flex flex-wrap justify-center gap-4 mb-10">
            {benefits.map((benefit, index) => (
              <div 
                key={index} 
                className="flex items-center bg-white px-4 py-2 rounded-full shadow-sm border border-[#FFCC33]/20"
              >
                <CheckCircle className="w-5 h-5 text-[#7A0019] mr-2 flex-shrink-0" />
                <span className="text-sm font-medium text-[#333333]">{benefit}</span>
              </div>
            ))}
          </div>
          
          <Button
            variant="primary"
            size="lg"
            onClick={scrollToIntake}
            className="font-bold px-8 shadow-lg transition-transform hover:scale-105"
          >
            Start Intake Now <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
          
          <p className="mt-4 text-sm text-gray-600">
            No obligation. Your information goes directly to our agent team.
          </p>
        </div>
      </div>
    </section>
  );
};

export default CTASection;