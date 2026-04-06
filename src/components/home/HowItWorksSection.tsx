import React from 'react';
import { ClipboardList, Send, PhoneCall, CheckCircle } from 'lucide-react';

const HowItWorksSection: React.FC = () => {
  const steps = [
    {
      icon: <ClipboardList className="w-12 h-12 text-white" />,
      title: 'Tell Us About Yourself',
      description: 'Enter your basic information and vehicle details to get started.',
      color: '#F7B538',
    },
    {
      icon: <Send className="w-12 h-12 text-white" />,
      title: 'Submit Your Details',
      description: 'We securely send your information to our local agent team.',
      color: '#00A6A6',
    },
    {
      icon: <PhoneCall className="w-12 h-12 text-white" />,
      title: 'Agent Follow-Up',
      description: 'An agent contacts you directly to discuss options and pricing.',
      color: '#1A3A63',
    },
    {
      icon: <CheckCircle className="w-12 h-12 text-white" />,
      title: 'Finalize Your Coverage',
      description: 'Work with your agent to choose a policy and complete enrollment.',
      color: '#4CAF50',
    },
  ];
  
  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-[#1A3A63] mb-4">How It Works</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            A simple intake process connects you with a licensed agent quickly.
          </p>
        </div>
        
        <div className="relative">
          {/* Connecting line */}
          <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-1 bg-gray-200 -translate-y-1/2 z-0"></div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative z-10">
            {steps.map((step, index) => (
              <div key={index} className="flex flex-col items-center text-center">
                <div 
                  className="w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-lg relative"
                  style={{ backgroundColor: step.color }}
                >
                  {step.icon}
                  <div className="absolute -right-2 -bottom-2 w-8 h-8 rounded-full bg-white text-[#1A3A63] flex items-center justify-center font-bold shadow-md">
                    {index + 1}
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-[#1A3A63] mb-3">{step.title}</h3>
                <p className="text-gray-600">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;