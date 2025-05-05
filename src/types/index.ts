export interface InsuranceProvider {
  id: string;
  name: string;
  logo: string;
  rating: number;
  reviewCount: number;
}

export interface VehicleInfo {
  year: string;
  make: string;
  model: string;
}

export interface DriverInfo {
  age: number;
  gender: 'male' | 'female' | 'other';
  maritalStatus: 'single' | 'married' | 'divorced' | 'widowed';
  drivingExperience: number;
  accidentsLast5Years: number;
  creditScore: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface CoverageOption {
  type: string;
  limit: string;
  premium: number;
}

export interface InsuranceQuote {
  id: string;
  providerId: string;
  monthlyRate: number;
  annualRate: number;
  coverage: {
    liability: CoverageOption;
    collision: CoverageOption;
    comprehensive: CoverageOption;
    uninsured: CoverageOption;
    medicalPayments: CoverageOption;
  };
  discounts: {
    name: string;
    amount: number;
  }[];
  features: string[];
  bestFor?: string;
}

export interface QuoteFormData {
  zipCode: string;
  vehicle: VehicleInfo;
  driver: DriverInfo;
}

export interface Article {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  category: string;
  readTime: number;
}