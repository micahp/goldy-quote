import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MultiCarrierQuoteForm from '../components/quotes/MultiCarrierQuoteForm';

interface InsuranceQuote {
  provider: string;
  price: string;
  term: string;
  details: Record<string, any>;
}

const QuoteFormPage: React.FC = () => {
  const navigate = useNavigate();
  const [receivedQuotes, setReceivedQuotes] = useState<InsuranceQuote[]>([]);

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
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-center text-indigo-800 mb-8">Get Your Auto Insurance Quotes</h1>
      
      <MultiCarrierQuoteForm onQuotesReceived={handleQuotesReceived} />
      
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
  );
};

export default QuoteFormPage;