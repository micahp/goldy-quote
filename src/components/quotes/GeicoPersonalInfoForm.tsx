import React, { useState } from 'react';

interface PersonalInfoFormProps {
  onSubmit: (personalData: {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
  }) => void;
}

const GeicoPersonalInfoForm: React.FC<PersonalInfoFormProps> = ({ onSubmit }) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [dateError, setDateError] = useState('');

  const validateDateFormat = (date: string) => {
    // Simple MM/DD/YYYY validation
    const regex = /^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])\/\d{4}$/;
    return regex.test(date);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setDateOfBirth(value);
    
    if (value && !validateDateFormat(value)) {
      setDateError('Please enter a valid date in MM/DD/YYYY format');
    } else {
      setDateError('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate date format before submitting
    if (dateOfBirth && !validateDateFormat(dateOfBirth)) {
      setDateError('Please enter a valid date in MM/DD/YYYY format');
      return;
    }
    
    onSubmit({
      firstName,
      lastName,
      dateOfBirth
    });
  };

  return (
    <div className="max-w-2xl mx-auto p-4 bg-white rounded-lg">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Please provide your information</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* First Name Field */}
        <div className="space-y-2">
          <label htmlFor="firstName" className="block text-gray-700 font-medium">
            First Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="firstName"
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />
        </div>

        {/* Last Name Field */}
        <div className="space-y-2">
          <label htmlFor="lastName" className="block text-gray-700 font-medium">
            Last Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="lastName"
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
          />
        </div>

        {/* Date of Birth Field */}
        <div className="space-y-2">
          <label htmlFor="dateOfBirth" className="block text-gray-700 font-medium">
            Date of Birth (MM/DD/YYYY) <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="dateOfBirth"
            placeholder="MM/DD/YYYY"
            className={`block w-full px-3 py-2 border ${dateError ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500`}
            value={dateOfBirth}
            onChange={handleDateChange}
            required
          />
          {dateError && (
            <p className="mt-1 text-sm text-red-600">{dateError}</p>
          )}
        </div>

        {/* Submit Button */}
        <div className="flex justify-center mt-8">
          <button
            type="submit"
            className="px-6 py-3 bg-blue-700 text-white font-medium rounded-md hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Continue
          </button>
        </div>
      </form>
    </div>
  );
};

export default GeicoPersonalInfoForm; 