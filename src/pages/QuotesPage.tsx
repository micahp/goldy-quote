import React, { useState } from 'react';
import { mockQuotes } from '../data/mockQuotes';
import { mockProviders, getProviderById } from '../data/mockProviders';
import QuoteCard from '../components/quotes/QuoteCard';
import QuoteFilter, { FilterOptions } from '../components/quotes/QuoteFilter';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';

const QuotesPage: React.FC = () => {
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterOptions>({
    sortBy: 'price_low',
    coverage: [],
    priceRange: [0, 500],
    features: [],
  });
  
  // Apply filters and sorting to quotes
  const filteredQuotes = mockQuotes.filter(quote => {
    // Price range filter
    if (quote.monthlyRate < filters.priceRange[0] || quote.monthlyRate > filters.priceRange[1]) {
      return false;
    }
    
    // Coverage filter
    if (filters.coverage.length > 0) {
      const quoteHasAllCoverages = filters.coverage.every(coverage => 
        Object.keys(quote.coverage).includes(coverage)
      );
      if (!quoteHasAllCoverages) return false;
    }
    
    // Features filter
    if (filters.features.length > 0) {
      const quoteHasAllFeatures = filters.features.every(feature =>
        quote.features.includes(feature)
      );
      if (!quoteHasAllFeatures) return false;
    }
    
    return true;
  });
  
  // Apply sorting
  const sortedQuotes = [...filteredQuotes].sort((a, b) => {
    switch (filters.sortBy) {
      case 'price_low':
        return a.monthlyRate - b.monthlyRate;
      case 'price_high':
        return b.monthlyRate - a.monthlyRate;
      case 'rating': {
        const providerA = getProviderById(a.providerId);
        const providerB = getProviderById(b.providerId);
        return (providerB?.rating || 0) - (providerA?.rating || 0);
      }
      case 'coverage': {
        // Sort by total coverage amount
        const totalCoverageA = Object.values(a.coverage).reduce((sum, c) => sum + c.premium, 0);
        const totalCoverageB = Object.values(b.coverage).reduce((sum, c) => sum + c.premium, 0);
        return totalCoverageB - totalCoverageA;
      }
      default:
        return a.monthlyRate - b.monthlyRate;
    }
  });
  
  const handleFilterChange = (newFilters: FilterOptions) => {
    setFilters(newFilters);
  };

  const handleQuoteSelect = (quoteId: string) => {
    setSelectedQuoteId(quoteId);
  };
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow pt-24 pb-16 bg-gray-50">
        <div className="container mx-auto px-4 md:px-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-[#7A0019] mb-2">Your Insurance Quotes</h1>
            <p className="text-gray-600">
              We found {sortedQuotes.length} quotes from top insurance providers. Compare and choose the best option for you.
            </p>
          </div>
          
          <QuoteFilter onFilterChange={handleFilterChange} />
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedQuotes.map(quote => {
              const provider = getProviderById(quote.providerId);
              if (!provider) return null;
              
              return (
                <div key={quote.id}>
                  <QuoteCard 
                    quote={quote} 
                    provider={provider}
                    isSelected={quote.id === selectedQuoteId}
                    onSelect={() => handleQuoteSelect(quote.id)}
                  />
                </div>
              );
            })}
          </div>
          
          {sortedQuotes.length === 0 && (
            <div className="text-center py-12">
              <h3 className="text-xl font-medium text-[#7A0019] mb-2">No quotes match your filters</h3>
              <p className="text-gray-600 mb-4">Try adjusting your filter criteria to see more options.</p>
              <button 
                onClick={() => setFilters({
                  sortBy: 'price_low',
                  coverage: [],
                  priceRange: [0, 500],
                  features: [],
                })}
                className="text-[#00A6A6] font-medium hover:underline"
              >
                Reset all filters
              </button>
            </div>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default QuotesPage;