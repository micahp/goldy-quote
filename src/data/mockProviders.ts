import { InsuranceProvider } from '../types';

export const mockProviders: InsuranceProvider[] = [
  {
    id: 'geico',
    name: 'Geico',
    logo: 'https://images.pexels.com/photos/6348105/pexels-photo-6348105.jpeg?auto=compress&w=150',
    rating: 4.3,
    reviewCount: 12489,
  },
  {
    id: 'progressive',
    name: 'Progressive',
    logo: 'https://images.pexels.com/photos/7233354/pexels-photo-7233354.jpeg?auto=compress&w=150',
    rating: 4.1,
    reviewCount: 10562,
  },
  {
    id: 'statefarm',
    name: 'State Farm',
    logo: 'https://images.pexels.com/photos/8370752/pexels-photo-8370752.jpeg?auto=compress&w=150',
    rating: 4.4,
    reviewCount: 15320,
  },
  {
    id: 'allstate',
    name: 'Allstate',
    logo: 'https://images.pexels.com/photos/8369648/pexels-photo-8369648.jpeg?auto=compress&w=150',
    rating: 4.0,
    reviewCount: 9870,
  },
  {
    id: 'liberty',
    name: 'Liberty Mutual',
    logo: 'https://images.pexels.com/photos/5699514/pexels-photo-5699514.jpeg?auto=compress&w=150',
    rating: 3.9,
    reviewCount: 7254,
  }
];

export const getProviderById = (id: string): InsuranceProvider | undefined => {
  return mockProviders.find(provider => provider.id === id);
};