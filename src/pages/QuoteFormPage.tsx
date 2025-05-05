import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import GeicoQuoteForm from '../components/quotes/GeicoQuoteForm';

interface InsuranceQuote {
  provider: string;
  price: string;
  term: string;
  details: Record<string, any>;
}

const QuoteFormPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedProvider, setSelectedProvider] = useState<string>('geico');
  const [receivedQuotes, setReceivedQuotes] = useState<InsuranceQuote[]>([]);

  const handleQuoteReceived = (quote: any, provider: string = selectedProvider) => {
    const newQuote: InsuranceQuote = {
      provider,
      price: quote.price,
      term: quote.term,
      details: quote.details || {}
    };
    
    setReceivedQuotes(prev => [...prev, newQuote]);
    
    // If we have quotes from all selected providers, navigate to the quotes page
    if (receivedQuotes.length > 0) {
      // Store quotes in localStorage for the quotes page to access
      localStorage.setItem('insuranceQuotes', JSON.stringify([...receivedQuotes, newQuote]));
      navigate('/quotes');
    }
  };

  const renderProviderForm = () => {
    switch (selectedProvider) {
      case 'geico':
        return <GeicoQuoteForm onQuoteReceived={(quote) => handleQuoteReceived(quote, 'Geico')} />;
      default:
        return (
          <div className="bg-yellow-100 p-4 rounded-md border border-yellow-400 text-yellow-700">
            Provider '{selectedProvider}' form not implemented yet.
          </div>
        );
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-center text-indigo-800 mb-8">Get Your Auto Insurance Quotes</h1>
      
      <div className="mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Select Insurance Providers</h2>
          <p className="text-gray-600 mb-4">
            Choose which insurance providers you'd like to get quotes from:
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="flex items-center p-4 border rounded-md cursor-pointer hover:bg-gray-50">
              <input
                type="checkbox"
                className="h-5 w-5 text-indigo-600"
                checked={selectedProvider === 'geico'}
                onChange={() => setSelectedProvider('geico')}
              />
              <span className="ml-2 text-gray-700 font-medium">Geico</span>
            </label>
            
            <label className="flex items-center p-4 border rounded-md cursor-pointer hover:bg-gray-50 opacity-50">
              <input
                type="checkbox"
                className="h-5 w-5 text-indigo-600"
                disabled
              />
              <span className="ml-2 text-gray-700 font-medium">Progressive (Coming Soon)</span>
            </label>
            
            <label className="flex items-center p-4 border rounded-md cursor-pointer hover:bg-gray-50 opacity-50">
              <input
                type="checkbox"
                className="h-5 w-5 text-indigo-600"
                disabled
              />
              <span className="ml-2 text-gray-700 font-medium">State Farm (Coming Soon)</span>
            </label>
          </div>
        </div>
      </div>
      
      {renderProviderForm()}
      
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