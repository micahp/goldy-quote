import React, { useState } from 'react';
import { SlidersHorizontal, ChevronDown, ChevronUp } from 'lucide-react';

interface QuoteFilterProps {
  onFilterChange: (filters: FilterOptions) => void;
}

export interface FilterOptions {
  sortBy: 'price_low' | 'price_high' | 'rating' | 'coverage';
  coverage: string[];
  priceRange: [number, number];
  features: string[];
}

const QuoteFilter: React.FC<QuoteFilterProps> = ({ onFilterChange }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    sortBy: 'price_low',
    coverage: [],
    priceRange: [0, 500],
    features: [],
  });
  
  const coverageOptions = [
    { id: 'liability', label: 'Liability' },
    { id: 'collision', label: 'Collision' },
    { id: 'comprehensive', label: 'Comprehensive' },
    { id: 'uninsured', label: 'Uninsured Motorist' },
    { id: 'medical', label: 'Medical Payments' },
  ];
  
  const featureOptions = [
    { id: 'roadside', label: 'Roadside Assistance' },
    { id: 'accident_forgiveness', label: 'Accident Forgiveness' },
    { id: 'rental', label: 'Rental Reimbursement' },
    { id: 'gap', label: 'Gap Insurance' },
    { id: 'new_car', label: 'New Car Replacement' },
  ];
  
  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newFilters = {
      ...filters,
      sortBy: e.target.value as FilterOptions['sortBy'],
    };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };
  
  const handleCoverageChange = (id: string) => {
    const newCoverage = filters.coverage.includes(id)
      ? filters.coverage.filter(item => item !== id)
      : [...filters.coverage, id];
    
    const newFilters = {
      ...filters,
      coverage: newCoverage,
    };
    
    setFilters(newFilters);
    onFilterChange(newFilters);
  };
  
  const handleFeatureChange = (id: string) => {
    const newFeatures = filters.features.includes(id)
      ? filters.features.filter(item => item !== id)
      : [...filters.features, id];
    
    const newFilters = {
      ...filters,
      features: newFeatures,
    };
    
    setFilters(newFilters);
    onFilterChange(newFilters);
  };
  
  const handlePriceRangeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    const newPriceRange: [number, number] = [...filters.priceRange] as [number, number];
    
    if (e.target.id === 'min-price') {
      newPriceRange[0] = value;
    } else {
      newPriceRange[1] = value;
    }
    
    const newFilters = {
      ...filters,
      priceRange: newPriceRange,
    };
    
    setFilters(newFilters);
    onFilterChange(newFilters);
  };
  
  const resetFilters = () => {
    const defaultFilters = {
      sortBy: 'price_low',
      coverage: [],
      priceRange: [0, 500],
      features: [],
    };
    setFilters(defaultFilters);
    onFilterChange(defaultFilters);
  };
  
  return (
    <div className="bg-white rounded-lg shadow-md mb-6">
      <div className="p-4 flex justify-between items-center cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center">
          <SlidersHorizontal className="w-5 h-5 text-[#1A3A63] mr-2" />
          <h3 className="font-semibold text-[#1A3A63]">Filter & Sort</h3>
        </div>
        <button className="text-gray-500 hover:text-[#1A3A63]">
          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
      </div>
      
      {isExpanded && (
        <div className="p-4 border-t border-gray-200 animate-fadeIn">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Sort By */}
            <div>
              <label htmlFor="sort-by" className="block text-sm font-medium text-gray-700 mb-2">
                Sort By
              </label>
              <select
                id="sort-by"
                value={filters.sortBy}
                onChange={handleSortChange}
                className="w-full rounded-md border border-gray-300 py-2 px-3 focus:outline-none focus:ring-1 focus:ring-[#F7B538] focus:border-[#F7B538]"
              >
                <option value="price_low">Price: Low to High</option>
                <option value="price_high">Price: High to Low</option>
                <option value="rating">Customer Rating</option>
                <option value="coverage">Coverage Level</option>
              </select>
            </div>
            
            {/* Price Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Monthly Price Range
              </label>
              <div className="flex space-x-2 items-center mb-2">
                <div>
                  <span className="text-xs text-gray-500">Min</span>
                  <div className="relative mt-1 rounded-md shadow-sm">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <span className="text-gray-500 sm:text-sm">$</span>
                    </div>
                    <input
                      type="number"
                      id="min-price"
                      value={filters.priceRange[0]}
                      onChange={handlePriceRangeChange}
                      className="block w-full rounded-md border border-gray-300 py-2 pl-7 pr-3 focus:outline-none focus:ring-1 focus:ring-[#F7B538] focus:border-[#F7B538]"
                      placeholder="0"
                      min="0"
                      max={filters.priceRange[1]}
                    />
                  </div>
                </div>
                <span className="text-gray-500">-</span>
                <div>
                  <span className="text-xs text-gray-500">Max</span>
                  <div className="relative mt-1 rounded-md shadow-sm">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <span className="text-gray-500 sm:text-sm">$</span>
                    </div>
                    <input
                      type="number"
                      id="max-price"
                      value={filters.priceRange[1]}
                      onChange={handlePriceRangeChange}
                      className="block w-full rounded-md border border-gray-300 py-2 pl-7 pr-3 focus:outline-none focus:ring-1 focus:ring-[#F7B538] focus:border-[#F7B538]"
                      placeholder="500"
                      min={filters.priceRange[0]}
                    />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Coverage Options */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Coverage Options
              </label>
              <div className="space-y-2">
                {coverageOptions.map((option) => (
                  <div key={option.id} className="flex items-center">
                    <input
                      id={`coverage-${option.id}`}
                      type="checkbox"
                      checked={filters.coverage.includes(option.id)}
                      onChange={() => handleCoverageChange(option.id)}
                      className="h-4 w-4 rounded border-gray-300 text-[#F7B538] focus:ring-[#F7B538]"
                    />
                    <label htmlFor={`coverage-${option.id}`} className="ml-2 text-sm text-gray-700">
                      {option.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Features */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Features
              </label>
              <div className="space-y-2">
                {featureOptions.map((option) => (
                  <div key={option.id} className="flex items-center">
                    <input
                      id={`feature-${option.id}`}
                      type="checkbox"
                      checked={filters.features.includes(option.id)}
                      onChange={() => handleFeatureChange(option.id)}
                      className="h-4 w-4 rounded border-gray-300 text-[#F7B538] focus:ring-[#F7B538]"
                    />
                    <label htmlFor={`feature-${option.id}`} className="ml-2 text-sm text-gray-700">
                      {option.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Reset Button */}
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={resetFilters}
              className="text-sm text-[#1A3A63] hover:text-[#F7B538] font-medium"
            >
              Reset Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuoteFilter;