import React, { useState } from 'react';

interface AddressFormProps {
  onSubmit: (addressData: {
    address: string;
    aptNumber: string;
    zipCode: string;
  }) => void;
  initialZipCode?: string;
}

const GeicoAddressForm: React.FC<AddressFormProps> = ({ onSubmit, initialZipCode = '' }) => {
  const [address, setAddress] = useState('');
  const [aptNumber, setAptNumber] = useState('');
  const [zipCode, setZipCode] = useState(initialZipCode);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      address,
      aptNumber,
      zipCode
    });
  };

  return (
    <div className="max-w-2xl mx-auto p-4 bg-white rounded-lg">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Thanks! Now, what's your address?</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Address Field */}
        <div className="space-y-2">
          <label htmlFor="address" className="block text-gray-700 font-medium">
            Address
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            </div>
            <input
              type="text"
              id="address"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter a location"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Apartment Number Field */}
        <div className="space-y-2">
          <label htmlFor="aptNumber" className="block text-gray-700 font-medium">
            Apt #
          </label>
          <input
            type="text"
            id="aptNumber"
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            value={aptNumber}
            onChange={(e) => setAptNumber(e.target.value)}
          />
        </div>

        {/* ZIP Code Field */}
        <div className="space-y-2">
          <label htmlFor="zipCode" className="block text-gray-700 font-medium">
            5-Digit ZIP Code
          </label>
          <input
            type="text"
            id="zipCode"
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            pattern="[0-9]{5}"
            maxLength={5}
            placeholder="78753"
            value={zipCode}
            onChange={(e) => setZipCode(e.target.value.replace(/\D/g, '').slice(0, 5))}
            required
          />
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-3 bg-blue-700 text-white font-medium rounded-md hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Next
          </button>
        </div>
      </form>
    </div>
  );
};

export default GeicoAddressForm; 