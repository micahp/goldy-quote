import React, { useState } from 'react';

interface VehicleFormProps {
  onSubmit: (vehicleData: { year: string; make: string; model: string }) => void;
}

const GeicoVehicleForm: React.FC<VehicleFormProps> = ({ onSubmit }) => {
  const [year, setYear] = useState<string>('');
  const [make, setMake] = useState<string>('');
  const [model, setModel] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!year.trim()) {
      newErrors.year = 'Vehicle year is required';
    } else if (!/^\d{4}$/.test(year)) {
      newErrors.year = 'Please enter a valid 4-digit year';
    }
    
    if (!make.trim()) {
      newErrors.make = 'Vehicle make is required';
    }
    
    if (!model.trim()) {
      newErrors.model = 'Vehicle model is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSubmit({
        year,
        make,
        model
      });
    }
  };

  // Get current year
  const currentYear = new Date().getFullYear();
  // Generate an array of years for the dropdown (from 1990 to current year + 1)
  const yearOptions = Array.from({ length: currentYear - 1989 }, (_, i) => (currentYear - i).toString());

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-4">Vehicle Information</h2>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="year" className="block text-sm font-medium text-gray-700 mb-1">
            Vehicle Year <span className="text-red-500">*</span>
          </label>
          <select
            id="year"
            className={`w-full px-3 py-2 border ${errors.year ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500`}
            value={year}
            onChange={(e) => setYear(e.target.value)}
          >
            <option value="">Select Year</option>
            {yearOptions.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          {errors.year && <p className="mt-1 text-sm text-red-500">{errors.year}</p>}
        </div>
        
        <div className="mb-4">
          <label htmlFor="make" className="block text-sm font-medium text-gray-700 mb-1">
            Vehicle Make <span className="text-red-500">*</span>
          </label>
          <input
            id="make"
            type="text"
            className={`w-full px-3 py-2 border ${errors.make ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500`}
            value={make}
            onChange={(e) => setMake(e.target.value)}
            placeholder="e.g., Toyota, Honda, Ford"
          />
          {errors.make && <p className="mt-1 text-sm text-red-500">{errors.make}</p>}
        </div>
        
        <div className="mb-4">
          <label htmlFor="model" className="block text-sm font-medium text-gray-700 mb-1">
            Vehicle Model <span className="text-red-500">*</span>
          </label>
          <input
            id="model"
            type="text"
            className={`w-full px-3 py-2 border ${errors.model ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500`}
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="e.g., Camry, Civic, F-150"
          />
          {errors.model && <p className="mt-1 text-sm text-red-500">{errors.model}</p>}
        </div>
        
        <div className="mt-6">
          <button
            type="submit"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Continue
          </button>
        </div>
      </form>
    </div>
  );
};

export default GeicoVehicleForm; 