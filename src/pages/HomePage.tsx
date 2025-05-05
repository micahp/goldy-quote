import React from 'react';
import HeroSection from '../components/home/HeroSection';
import FeaturesSection from '../components/home/FeaturesSection';
import HowItWorksSection from '../components/home/HowItWorksSection';
import TestimonialsSection from '../components/home/TestimonialsSection';
import ArticleSection from '../components/home/ArticleSection';
import CTASection from '../components/home/CTASection';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';

const HomePage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow">
        <HeroSection />
        <FeaturesSection />
        <HowItWorksSection />
        <TestimonialsSection />
        <ArticleSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

export default HomePage;