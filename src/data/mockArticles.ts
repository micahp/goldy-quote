import { Article } from '../types';

export const mockArticles: Article[] = [
  {
    id: 'article-1',
    title: 'Understanding Auto Insurance Coverage Types',
    description: 'Learn about the different types of auto insurance coverage and what they protect.',
    imageUrl: 'https://images.pexels.com/photos/7138812/pexels-photo-7138812.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    category: 'Insurance Basics',
    readTime: 8,
  },
  {
    id: 'article-2',
    title: 'How to Lower Your Car Insurance Premiums',
    description: 'Discover practical tips to reduce your auto insurance costs without sacrificing coverage.',
    imageUrl: 'https://images.pexels.com/photos/5699514/pexels-photo-5699514.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    category: 'Saving Money',
    readTime: 9,
  },
  {
    id: 'article-3',
    title: 'What Affects Your Car Insurance Rates?',
    description: 'Explore the factors that insurance companies consider when determining your premiums.',
    imageUrl: 'https://images.pexels.com/photos/6348105/pexels-photo-6348105.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    category: 'Insurance Basics',
    readTime: 8,
  },
  {
    id: 'article-4',
    title: 'Car Insurance for New Drivers: What You Need to Know',
    description: 'Essential information for first-time drivers looking to get insured.',
    imageUrl: 'https://images.pexels.com/photos/7048043/pexels-photo-7048043.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    category: 'New Drivers',
    readTime: 10,
  },
  {
    id: 'article-5',
    title: 'Comparing Full Coverage vs. Liability-Only Insurance',
    description: 'Understand the differences and decide which type of coverage is right for your situation.',
    imageUrl: 'https://images.pexels.com/photos/4386370/pexels-photo-4386370.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    category: 'Coverage Options',
    readTime: 9,
  },
  {
    id: 'article-6',
    title: 'What to Do After a Car Accident: Insurance Perspective',
    description: 'Learn the steps to take after an accident to ensure a smooth insurance claim process.',
    imageUrl: 'https://images.pexels.com/photos/170811/pexels-photo-170811.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    category: 'Claims',
    readTime: 10,
  },
  {
    id: 'article-7',
    title: 'Why College Students Should Buy Life Insurance Now',
    description: 'If you\'re a student at the U of M, UW-Madison, or anywhere in between, here\'s why locking in life insurance while you\'re young is one of the smartest financial moves you can make.',
    imageUrl: 'https://images.pexels.com/photos/1438081/pexels-photo-1438081.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    category: 'Life Insurance',
    readTime: 9,
  }
];

export const getArticleById = (id: string): Article | undefined => {
  return mockArticles.find(article => article.id === id);
};

export const getArticlesByCategory = (category: string): Article[] => {
  return mockArticles.filter(article => article.category === category);
};