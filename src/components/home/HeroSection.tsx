import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../common/Button';
import { Car, Shield, DollarSign, Clock } from 'lucide-react';

const HeroSection: React.FC = () => {
  const [zipCode, setZipCode] = useState('');
  const [insuranceType, setInsuranceType] = useState('auto');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (zipCode.length !== 5 || !/^\d+$/.test(zipCode)) {
      setError('Please enter a valid 5-digit ZIP code');
      return;
    }
    
    navigate(`/quote-form?zip=${zipCode}&type=${insuranceType}`);
  };
  
  const features = [
    {
      icon: <Shield className="w-6 h-6 text-[#FFCC33]" />,
      text: 'Compare top insurers',
    },
    {
      icon: <DollarSign className="w-6 h-6 text-[#FFCC33]" />,
      text: 'Save up to $500',
    },
    {
      icon: <Clock className="w-6 h-6 text-[#FFCC33]" />,
      text: 'Quick & easy process',
    },
  ];
  
  return (
    <div className="relative min-h-screen bg-gradient-to-b from-[#7A0019] to-[#630014] pt-32 pb-20">
      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-12">
          <div className="lg:w-1/2 text-center lg:text-left">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
              <span className="text-[#FFCC33]">Save Money</span> On Your 
              <span className="relative inline-block mx-2">
                Car
                <span className="absolute -bottom-2 left-0 w-full h-1 bg-[#FFCC33] rounded-full"></span>
              </span>
              Insurance
            </h1>
            <p className="text-lg md:text-xl text-gray-300 mb-8">
              Compare quotes from multiple providers in minutes. 
              Get the best rates, customize your coverage, and save up to $500 annually.
            </p>
            
            <div className="mb-8">
              <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-full max-w-lg mx-auto lg:mx-0">
                <div className="w-full">
                  <label htmlFor="insuranceType" className="block text-sm font-medium text-gray-300 mb-2">
                    Insurance Type
                  </label>
                  <select
                    id="insuranceType"
                    value={insuranceType}
                    onChange={(e) => setInsuranceType(e.target.value)}
                    className="w-full px-4 py-3 text-lg rounded-md focus:outline-none focus:ring-2 focus:ring-[#FFCC33] text-gray-800 bg-white"
                  >
                    <option value="auto">Auto Insurance</option>
                    <option value="home" disabled>Home Insurance (Coming Soon)</option>
                    <option value="life" disabled>Life Insurance (Coming Soon)</option>
                    <option value="health" disabled>Health Insurance (Coming Soon)</option>
                  </select>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 w-full">
                  <div className="flex-1">
                    <label htmlFor="zipCode" className="sr-only">Enter ZIP Code</label>
                    <input
                      type="text"
                      id="zipCode"
                      value={zipCode}
                      onChange={(e) => {
                        setZipCode(e.target.value);
                        setError('');
                      }}
                      placeholder="Enter ZIP Code"
                      maxLength={5}
                      className={`w-full px-4 py-3 text-lg rounded-md focus:outline-none focus:ring-2 focus:ring-[#FFCC33] text-gray-800 ${
                        error ? 'border-red-500 ring-1 ring-red-500' : ''
                      }`}
                    />
                    {error && (
                      <p className="mt-1 text-red-400 text-sm">{error}</p>
                    )}
                  </div>
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="font-bold transition-transform hover:scale-105"
                  >
                    Get Quotes
                  </Button>
                </div>
              </form>
            </div>
            
            <div className="flex flex-wrap justify-center lg:justify-start gap-6">
              {features.map((feature, index) => (
                <div key={index} className="flex items-center">
                  <div className="p-2 bg-white bg-opacity-10 rounded-full">
                    {feature.icon}
                  </div>
                  <span className="ml-2 text-gray-200 font-medium">{feature.text}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="lg:w-1/2">
            <div className="relative flex items-center justify-center">
              <img 
                src="/goldy-quote-logo+wordmark.png" 
                alt="Goldy Quote - Your Insurance Savings Companion" 
                className="relative z-10 max-w-full h-auto drop-shadow-2xl rounded-2xl"
                style={{ maxHeight: '500px' }}
              />
              <div className="absolute -bottom-12 -right-6 bg-white p-4 rounded-lg shadow-lg z-20 max-w-xs transform rotate-2 hidden md:block">
                <div className="flex items-center">
                  <Car className="w-10 h-10 text-[#FFCC33] mr-3" />
                  <div>
                    <p className="font-bold text-gray-800">Drivers save an average of</p>
                    <p className="text-2xl font-bold text-[#7A0019]">$357/year</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;