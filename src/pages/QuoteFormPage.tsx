import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Car, Calendar, AlertCircle, CheckCircle, ChevronRight } from 'lucide-react';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';

interface FormErrors {
  vehicle?: {
    year?: string;
    make?: string;
    model?: string;
  };
  driver?: {
    firstName?: string;
    lastName?: string;
    birthDate?: string;
    email?: string;
  };
}

const QuoteFormPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const zipCode = searchParams.get('zip') || '';
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const [formData, setFormData] = useState({
    vehicle: {
      year: '',
      make: '',
      model: '',
    },
    driver: {
      firstName: '',
      lastName: '',
      birthDate: '',
      email: '',
    }
  });

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    let isValid = true;

    // Vehicle validation
    if (!formData.vehicle.year) {
      newErrors.vehicle = { ...newErrors.vehicle, year: 'Year is required' };
      isValid = false;
    } else if (!/^\d{4}$/.test(formData.vehicle.year)) {
      newErrors.vehicle = { ...newErrors.vehicle, year: 'Enter a valid 4-digit year' };
      isValid = false;
    }

    if (!formData.vehicle.make) {
      newErrors.vehicle = { ...newErrors.vehicle, make: 'Make is required' };
      isValid = false;
    }

    if (!formData.vehicle.model) {
      newErrors.vehicle = { ...newErrors.vehicle, model: 'Model is required' };
      isValid = false;
    }

    // Driver validation
    if (!formData.driver.firstName) {
      newErrors.driver = { ...newErrors.driver, firstName: 'First name is required' };
      isValid = false;
    }

    if (!formData.driver.lastName) {
      newErrors.driver = { ...newErrors.driver, lastName: 'Last name is required' };
      isValid = false;
    }

    if (!formData.driver.birthDate) {
      newErrors.driver = { ...newErrors.driver, birthDate: 'Birth date is required' };
      isValid = false;
    } else {
      const birthDate = new Date(formData.driver.birthDate);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      
      if (age < 16) {
        newErrors.driver = { ...newErrors.driver, birthDate: 'Must be at least 16 years old' };
        isValid = false;
      } else if (age > 100) {
        newErrors.driver = { ...newErrors.driver, birthDate: 'Please enter a valid birth date' };
        isValid = false;
      }
    }

    if (!formData.driver.email) {
      newErrors.driver = { ...newErrors.driver, email: 'Email is required' };
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.driver.email)) {
      newErrors.driver = { ...newErrors.driver, email: 'Enter a valid email address' };
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      navigate('/quotes');
    } catch (error) {
      console.error('Error submitting form:', error);
      // Handle error
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const [section, field] = e.target.name.split('.');
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section as keyof typeof prev],
        [field]: e.target.value
      }
    }));

    // Clear error when user starts typing
    if (errors[section as keyof FormErrors]?.[field as keyof (typeof errors.vehicle | typeof errors.driver)]) {
      setErrors(prev => ({
        ...prev,
        [section]: {
          ...prev[section as keyof FormErrors],
          [field]: undefined
        }
      }));
    }
  };

  const renderInput = (
    section: 'vehicle' | 'driver',
    field: string,
    label: string,
    type: string = 'text',
    placeholder: string = ''
  ) => {
    const error = errors[section]?.[field as keyof (typeof errors.vehicle | typeof errors.driver)];
    
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        <input
          type={type}
          name={`${section}.${field}`}
          value={formData[section][field as keyof typeof formData.vehicle | keyof typeof formData.driver]}
          onChange={handleChange}
          placeholder={placeholder}
          className={`block w-full rounded-md border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-[#FFCC33] focus:ring-2 focus:ring-[#FFCC33] focus:ring-opacity-50 sm:text-sm ${
            error ? 'border-red-500 ring-1 ring-red-500' : ''
          }`}
          required
        />
        {error && (
          <p className="mt-1 text-sm text-red-600">{error}</p>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow pt-24 pb-16 bg-gray-50">
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-2xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-[#7A0019] mb-2">Get Your Car Insurance Quote</h1>
              <p className="text-gray-600">
                Fill out the form below to receive personalized quotes from top insurance providers.
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
                  <span className="ml-2 font-medium">Vehicle & Driver Info</span>
                </div>
                <ChevronRight className="w-5 h-5 mx-2 text-gray-400" />
                <div className="flex items-center text-gray-400">
                  <div className="w-6 h-6 rounded-full border-2 border-current flex items-center justify-center">
                    <span className="text-sm font-bold">3</span>
                  </div>
                  <span className="ml-2 font-medium">Compare Quotes</span>
                </div>
              </div>
            </div>
            
            <form onSubmit={handleSubmit}>
              <Card className="mb-6">
                <div className="flex items-center mb-4">
                  <Car className="w-6 h-6 text-[#FFCC33] mr-2" />
                  <h2 className="text-xl font-semibold text-[#7A0019]">Vehicle Information</h2>
                </div>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {renderInput('vehicle', 'year', 'Year', 'text', 'YYYY')}
                    {renderInput('vehicle', 'make', 'Make', 'text', 'e.g., Honda')}
                    {renderInput('vehicle', 'model', 'Model', 'text', 'e.g., Accord')}
                  </div>
                </div>
              </Card>
              
              <Card className="mb-6">
                <div className="flex items-center mb-4">
                  <Calendar className="w-6 h-6 text-[#FFCC33] mr-2" />
                  <h2 className="text-xl font-semibold text-[#7A0019]">Driver Information</h2>
                </div>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {renderInput('driver', 'firstName', 'First Name')}
                    {renderInput('driver', 'lastName', 'Last Name')}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {renderInput('driver', 'birthDate', 'Birth Date', 'date')}
                    {renderInput('driver', 'email', 'Email', 'email')}
                  </div>
                </div>
              </Card>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center text-sm text-gray-500">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  <span>Your information is secure and will not be shared.</span>
                </div>
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="font-bold"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Getting Quotes...' : 'Get Quotes'}
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

export default QuoteFormPage;