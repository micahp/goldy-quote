import React from 'react';
import { ShieldCheck, Zap, BarChart3, Settings } from 'lucide-react';
import Card from '../common/Card';

const FeaturesSection: React.FC = () => {
  const features = [
    {
      icon: <ShieldCheck className="w-10 h-10 text-[#F7B538]" />,
      title: 'Compare Multiple Insurers',
      description: 'Get accurate quotes from top insurance companies side by side in one simple search.',
    },
    {
      icon: <Zap className="w-10 h-10 text-[#F7B538]" />,
      title: 'Fast & Accurate Quotes',
      description: 'Our powerful comparison engine delivers real-time quotes in less than 2 minutes.',
    },
    {
      icon: <BarChart3 className="w-10 h-10 text-[#F7B538]" />,
      title: 'Personalized Recommendations',
      description: 'We analyze your profile to suggest the best coverage options for your specific needs.',
    },
    {
      icon: <Settings className="w-10 h-10 text-[#F7B538]" />,
      title: 'Customizable Coverage',
      description: 'Adjust deductibles, coverage limits, and add-ons to find the perfect balance of protection and price.',
    },
  ];
  
  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-[#1A3A63] mb-4">Why Choose GoldyQuote?</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            We make finding the perfect car insurance simple, transparent, and hassle-free.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <Card 
              key={index} 
              className="transition-all duration-300 hover:shadow-lg hover:-translate-y-1 h-full p-6"
              elevation="sm"
            >
              <div className="flex flex-col items-center text-center h-full">
                <div className="p-3 bg-[#F7B538]/10 rounded-full mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-[#1A3A63] mb-3">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;