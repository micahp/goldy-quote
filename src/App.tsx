import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import QuoteFormPage from './pages/QuoteFormPage';
import NotFoundPage from './pages/NotFoundPage';
import AboutPage from './pages/AboutPage';
import BlogPage from './pages/BlogPage';
import BlogArticlePage from './pages/BlogArticlePage';
import FAQPage from './pages/FAQPage';
import CoverageCalculatorPage from './pages/CoverageCalculatorPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsOfServicePage from './pages/TermsOfServicePage';
import DisclaimerPage from './pages/DisclaimerPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/quote-form" element={<QuoteFormPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/blog" element={<BlogPage />} />
        <Route path="/blog/:articleId" element={<BlogArticlePage />} />
        <Route path="/faqs" element={<FAQPage />} />
        <Route path="/calculator" element={<CoverageCalculatorPage />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/terms" element={<TermsOfServicePage />} />
        <Route path="/disclaimer" element={<DisclaimerPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Router>
  );
}

export default App;
