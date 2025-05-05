import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Home } from 'lucide-react';
import Button from '../components/common/Button';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';

const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow flex items-center justify-center bg-gray-50 py-12">
        <div className="container mx-auto px-4 md:px-6 text-center">
          <div className="max-w-md mx-auto">
            <div className="flex justify-center mb-6">
              <div className="bg-red-100 rounded-full p-4">
                <AlertTriangle className="w-16 h-16 text-red-500" />
              </div>
            </div>
            <h1 className="text-4xl font-bold text-[#1A3A63] mb-4">Page Not Found</h1>
            <p className="text-gray-600 mb-8">
              Sorry, we couldn't find the page you're looking for. It might have been moved or deleted.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button 
                variant="primary" 
                size="lg"
                onClick={() => window.history.back()}
              >
                Go Back
              </Button>
              <Link to="/">
                <Button 
                  variant="outline" 
                  size="lg"
                  className="w-full sm:w-auto"
                >
                  <Home className="w-5 h-5 mr-2" /> Home Page
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default NotFoundPage;