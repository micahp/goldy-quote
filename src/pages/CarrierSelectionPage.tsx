import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, ChevronRight, Shield, Star, Clock, Award } from 'lucide-react';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';

interface Carrier {
  id: string;
  name: string;
  description: string;
  logo: string;
  rating: number;
  features: string[];
  popular?: boolean;
}

const AVAILABLE_CARRIERS: Carrier[] = [
  {
    id: 'geico',
    name: 'GEICO',
    description: '15 minutes could save you 15% or more',
    logo: '🦎',
    rating: 4.5,
    features: ['15-minute quotes', 'Military discounts', 'Digital claim filing', '24/7 roadside assistance'],
    popular: true
  },
  {
    id: 'progressive',
    name: 'Progressive',
    description: 'A company you can rely on',
    logo: '🅿️',
    rating: 4.1,
    features: ['Snapshot® program', 'Name Your Price® tool', 'Pet injury coverage', 'Gap coverage'],
    popular: true
  },
  {
    id: 'statefarm',
    name: 'State Farm',
    description: 'Like a good neighbor, State Farm is there',
    logo: '🏛️',
    rating: 4.4,
    features: ['18,000+ agents nationwide', 'Drive Safe & Save®', 'Good student discounts', 'Steer Clear® program']
  },
  {
    id: 'libertymutual',
    name: 'Liberty Mutual',
    description: 'Only pay for what you need',
    logo: '🗽',
    rating: 3.8,
    features: ['RightTrack® program', 'Accident forgiveness', 'New car replacement', 'Better car replacement']
  },
  // {
  //   id: 'allstate',
  //   name: 'Allstate',
  //   description: 'You\'re in good hands with Allstate',
  //   logo: '👋',
  //   rating: 4.2,
  //   features: ['Drivewise® program', 'Claim RateGuard®', 'Safe driving bonus', 'QuickFoto Claim®']
  // },
  // {
  //   id: 'nationwide',
  //   name: 'Nationwide',
  //   description: 'Nationwide is on your side',
  //   logo: '🦅',
  //   rating: 4.3,
  //   features: ['SmartRide® program', 'Accident Forgiveness', 'New Car Replacement', 'Vanishing Deductible®', 'Gap Coverage']
  // }
];

const CarrierSelectionPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const zipCode = searchParams.get('zip') || '';
  const insuranceType = searchParams.get('type') || 'auto';
  
  const [selectedCarriers, setSelectedCarriers] = useState<string[]>(['geico', 'progressive']);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCarrierToggle = (carrierId: string) => {
    setSelectedCarriers(prev => 
      prev.includes(carrierId) 
        ? prev.filter(id => id !== carrierId)
        : [...prev, carrierId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedCarriers.length === 0) {
      alert('Please select at least one insurance carrier');
      return;
    }

    setIsSubmitting(true);

    try {
      // Send the initial carrier selection to the backend
      const response = await fetch('/api/quotes/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          carriers: selectedCarriers,
          zipCode,
          insuranceType
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to start quote process: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ Carriers initialized with taskId:', result.taskId);
      
      // Navigate to quote form with selected carriers and task ID
      navigate(`/quote-form?taskId=${result.taskId}&carriers=${selectedCarriers.join(',')}&zip=${zipCode}&type=${insuranceType}`);
      
    } catch (error) {
      console.error('❌ Error starting quote process:', error);
      alert('Failed to start quote process. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStarRating = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    
    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />);
    }
    
    if (hasHalfStar) {
      stars.push(<Star key="half" className="w-4 h-4 fill-yellow-400 text-yellow-400 opacity-50" />);
    }
    
    const remainingStars = 5 - Math.ceil(rating);
    for (let i = 0; i < remainingStars; i++) {
      stars.push(<Star key={`empty-${i}`} className="w-4 h-4 text-gray-300" />);
    }
    
    return stars;
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow pt-24 pb-16 bg-gray-50">
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-4xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-[#7A0019] mb-2">Choose Your Insurance Carriers</h1>
              <p className="text-gray-600">
                Select which insurance companies you'd like to compare quotes from. 
                We'll get personalized rates from each carrier for ZIP code <strong>{zipCode}</strong>.
              </p>
              
              {/* Progress Steps */}
              <div className="flex items-center mt-6">
                <div className="flex items-center text-[#FFCC33]">
                  <CheckCircle className="w-6 h-6" />
                  <span className="ml-2 font-medium">ZIP Code</span>
                </div>
                <ChevronRight className="w-5 h-5 mx-2 text-gray-400" />
                <div className="flex items-center text-[#7A0019]">
                  <div className="w-6 h-6 rounded-full border-2 border-current flex items-center justify-center">
                    <span className="text-sm font-bold">2</span>
                  </div>
                  <span className="ml-2 font-medium">Choose Carriers</span>
                </div>
                <ChevronRight className="w-5 h-5 mx-2 text-gray-400" />
                <div className="flex items-center text-gray-400">
                  <div className="w-6 h-6 rounded-full border-2 border-current flex items-center justify-center">
                    <span className="text-sm font-bold">3</span>
                  </div>
                  <span className="ml-2 font-medium">Personal Info</span>
                </div>
                <ChevronRight className="w-5 h-5 mx-2 text-gray-400" />
                <div className="flex items-center text-gray-400">
                  <div className="w-6 h-6 rounded-full border-2 border-current flex items-center justify-center">
                    <span className="text-sm font-bold">4</span>
                  </div>
                  <span className="ml-2 font-medium">Compare Quotes</span>
                </div>
              </div>
            </div>
            
            <form onSubmit={handleSubmit}>
              <Card className="mb-6">
                <div className="flex items-center mb-6">
                  <Shield className="w-6 h-6 text-[#FFCC33] mr-2" />
                  <h2 className="text-xl font-semibold text-[#7A0019]">Available Insurance Carriers</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {AVAILABLE_CARRIERS.map(carrier => (
                    <div 
                      key={carrier.id}
                      className={`relative border-2 rounded-lg p-4 cursor-pointer transition-all duration-200 ${
                        selectedCarriers.includes(carrier.id)
                          ? 'border-[#FFCC33] bg-yellow-50'
                          : 'border-gray-200 hover:border-[#FFCC33] hover:bg-yellow-50'
                      }`}
                      onClick={() => handleCarrierToggle(carrier.id)}
                    >
                      {carrier.popular && (
                        <div className="absolute -top-2 -right-2 bg-[#7A0019] text-white text-xs px-2 py-1 rounded-full">
                          Popular
                        </div>
                      )}
                      
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center">
                          <span className="text-3xl mr-3">{carrier.logo}</span>
                          <div>
                            <h3 className="font-bold text-lg text-gray-900">{carrier.name}</h3>
                            <p className="text-sm text-gray-600">{carrier.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={selectedCarriers.includes(carrier.id)}
                            readOnly
                            className="h-5 w-5 text-[#FFCC33] focus:ring-[#FFCC33] border-gray-300 rounded pointer-events-none"
                          />
                        </div>
                      </div>
                      
                      <div className="flex items-center mb-3">
                        <div className="flex items-center mr-2">
                          {renderStarRating(carrier.rating)}
                        </div>
                        <span className="text-sm text-gray-600">{carrier.rating} rating</span>
                      </div>
                      
                      <ul className="space-y-1">
                        {carrier.features.map((feature, index) => (
                          <li key={index} className="flex items-center text-sm text-gray-700">
                            <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
                
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start">
                    <Clock className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-900">More carriers = better comparison</h4>
                      <p className="text-sm text-blue-700 mt-1">
                        Selecting multiple carriers increases your chances of finding the best rate. 
                        Each quote takes just a few minutes to complete.
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
              
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  {selectedCarriers.length} carrier{selectedCarriers.length !== 1 ? 's' : ''} selected
                </div>
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="font-bold"
                  disabled={isSubmitting || selectedCarriers.length === 0}
                >
                  {isSubmitting 
                    ? 'Initializing Carriers...' 
                    : `Continue with ${selectedCarriers.length} Carrier${selectedCarriers.length !== 1 ? 's' : ''}`
                  }
                </Button>
              </div>
            </form>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default CarrierSelectionPage; 