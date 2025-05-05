import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import QuotesPage from './pages/QuotesPage';
import QuoteFormPage from './pages/QuoteFormPage';
import NotFoundPage from './pages/NotFoundPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/quotes" element={<QuotesPage />} />
        <Route path="/quote-form" element={<QuoteFormPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Router>
  );
}

export default App;