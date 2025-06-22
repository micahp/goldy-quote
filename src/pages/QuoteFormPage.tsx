import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import MultiCarrierQuoteForm from '../components/quotes/MultiCarrierQuoteForm';

interface InsuranceQuote {
  provider: string;
  price: string;
  term: string;
  details: Record<string, any>;
}

const QuoteFormPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [receivedQuotes, setReceivedQuotes] = useState<InsuranceQuote[]>([]);

  // Extract parameters from URL
  const taskId = searchParams.get('taskId');
  const carriersParam = searchParams.get('carriers');
  const zipCode = searchParams.get('zip') || '';
  const insuranceType = searchParams.get('type') || 'auto';
  
  const carriers = carriersParam ? carriersParam.split(',') : [];

  // Redirect if missing required parameters
  if (!taskId || carriers.length === 0 || !zipCode) {
    return (
      <div className="bg-gray-50 min-h-screen px-4 py-12 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Missing Required Information</h1>
          <p className="text-gray-600 mb-4">
            Please start from the carrier selection page to get quotes.
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

  const handleQuotesReceived = (quotes: any[]) => {
    const formattedQuotes: InsuranceQuote[] = quotes.map(quote => ({
      provider: quote.carrier,
      price: quote.price,
      term: quote.term,
      details: quote.coverageDetails || {}
    }));
    
    setReceivedQuotes(formattedQuotes);
    
    // Store quotes in localStorage for the quotes page to access
    localStorage.setItem('insuranceQuotes', JSON.stringify(formattedQuotes));
    
    // Navigate to quotes page when we have quotes
    if (formattedQuotes.length > 0) {
      navigate('/quotes');
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen px-4 py-12">
      <div className="container mx-auto">
        <h1 className="text-3xl font-bold text-center text-[#800000] mb-8">Get Your Auto Insurance Quotes</h1>
        
        <MultiCarrierQuoteForm 
          onQuotesReceived={handleQuotesReceived}
          taskId={taskId}
          carriers={carriers}
          zipCode={zipCode}
          insuranceType={insuranceType}
        />
        
        {receivedQuotes.length > 0 && (
          <div className="mt-8 bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Quotes Received</h2>
            <ul className="divide-y divide-gray-200">
              {receivedQuotes.map((quote, index) => (
                <li key={index} className="py-4">
                  <div className="flex justify-between">
                    <div className="font-medium">{quote.provider}</div>
                    <div className="text-green-600 font-bold">{quote.price}</div>
                  </div>
                  <div className="text-sm text-gray-500">Term: {quote.term}</div>
                </li>
              ))}
            </ul>
            
            <button
              className="mt-6 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              onClick={() => {
                localStorage.setItem('insuranceQuotes', JSON.stringify(receivedQuotes));
                navigate('/quotes');
              }}
            >
              Compare All Quotes
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuoteFormPage;