import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import MultiCarrierQuoteForm from '../components/quotes/MultiCarrierQuoteForm';

const QuoteFormPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Extract parameters from URL
  const taskId = searchParams.get('taskId');
  const zipCode = searchParams.get('zip') || '';
  const insuranceType = searchParams.get('type') || 'auto';
  const carriers: string[] = [];

  // Redirect if missing required parameters
  if (!taskId || !zipCode) {
    return (
      <div className="bg-gray-50 min-h-screen px-4 py-12 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Missing Required Information</h1>
          <p className="text-gray-600 mb-4">
            Please start from the home page to begin your intake.
          </p>
          <button
            onClick={() => navigate(`/?zip=${zipCode}`)}
            className="px-4 py-2 bg-[#7A0019] text-white rounded-md hover:bg-[#5A0013]"
          >
            Start Over
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen px-4 py-12">
      <div className="container mx-auto">
        <h1 className="text-3xl font-bold text-center text-[#800000] mb-8">Get Your Quote</h1>
        
        <MultiCarrierQuoteForm 
          onQuotesReceived={() => {}}
          taskId={taskId}
          carriers={carriers}
          zipCode={zipCode}
          insuranceType={insuranceType}
        />
      </div>
    </div>
  );
};

export default QuoteFormPage;