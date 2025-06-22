import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Button from '../common/Button';
import { ShieldCheck, Menu, X } from 'lucide-react';

const Header: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };
  
  const headerClass = isScrolled 
    ? 'bg-white shadow-md py-3 transition-all duration-300'
    : 'bg-transparent py-5 transition-all duration-300';
  
  // Dynamic text colors based on scroll state
  const logoTextColor = isScrolled ? 'text-[#7A0019]' : 'text-white';
  const navTextColor = isScrolled ? 'text-[#7A0019]' : 'text-white';
  const navHoverColor = isScrolled ? 'hover:text-[#FFCC33]' : 'hover:text-[#FFCC33]';
  const menuButtonColor = isScrolled ? 'text-[#7A0019]' : 'text-white';
  
  const navItems = [
    { name: 'Auto Insurance', path: '/auto' },
    { name: 'Insurance Guide', path: '/guide' },
    { name: 'About Us', path: '/about' },
    { name: 'Login', path: '/login', isButton: true },
  ];
  
  return (
    <header className={`fixed top-0 left-0 w-full z-50 ${headerClass}`}>
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <ShieldCheck className="w-8 h-8 text-[#FFCC33]" />
            <span className={`ml-2 text-xl font-bold ${logoTextColor} transition-colors duration-300`}>GoldyQuote</span>
          </Link>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            {navItems.map((item, index) => (
              !item.isButton ? (
                <Link
                  key={index}
                  to={item.path}
                  className={`${navTextColor} ${navHoverColor} transition-colors duration-300 font-medium`}
                >
                  {item.name}
                </Link>
              ) : (
                <Button
                  key={index}
                  variant="primary"
                  size="sm"
                  onClick={() => window.location.href = item.path}
                >
                  {item.name}
                </Button>
              )
            ))}
          </nav>
          
          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button 
              className={`${menuButtonColor} p-2 transition-colors duration-300`}
              onClick={toggleMenu}
              aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-white shadow-lg">
          <div className="container mx-auto px-4 py-4 space-y-4">
            {navItems.map((item, index) => (
              !item.isButton ? (
                <Link
                  key={index}
                  to={item.path}
                  className="block text-[#7A0019] hover:text-[#FFCC33] py-2 transition-colors duration-200 font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ) : (
                <Button
                  key={index}
                  variant="primary"
                  size="sm"
                  fullWidth
                  onClick={() => {
                    window.location.href = item.path;
                    setIsMenuOpen(false);
                  }}
                >
                  {item.name}
                </Button>
              )
            ))}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;