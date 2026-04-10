import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShieldCheck, Menu, X } from 'lucide-react';

const Header: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const isHomeRoute = location.pathname === '/';
  const useTransparentTopStyle = isHomeRoute && !isScrolled;
  
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
  
  const headerClass = useTransparentTopStyle
    ? 'bg-transparent py-5 transition-all duration-300'
    : 'bg-white shadow-md py-3 transition-all duration-300';
  
  // Dynamic text colors based on scroll state
  const logoTextColor = useTransparentTopStyle ? 'text-white' : 'text-[#7A0019]';
  const navTextColor = useTransparentTopStyle ? 'text-white' : 'text-[#7A0019]';
  const navHoverColor = 'hover:text-[#FFCC33]';
  const menuButtonColor = useTransparentTopStyle ? 'text-white' : 'text-[#7A0019]';
  
  const navItems = [
    { name: 'Auto Insurance', path: '#' },
    { name: 'Insurance Guide', path: '/blog' },
    { name: 'About Us', path: '/about' },
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
              item.path === '#' ? (
                <a
                  key={index}
                  href={item.path}
                  className={`${navTextColor} ${navHoverColor} transition-colors duration-300 font-medium`}
                >
                  {item.name}
                </a>
              ) : (
                <Link
                  key={index}
                  to={item.path}
                  className={`${navTextColor} ${navHoverColor} transition-colors duration-300 font-medium`}
                >
                  {item.name}
                </Link>
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
              item.path === '#' ? (
                <a
                  key={index}
                  href={item.path}
                  className="block text-[#7A0019] hover:text-[#FFCC33] py-2 transition-colors duration-200 font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.name}
                </a>
              ) : (
                <Link
                  key={index}
                  to={item.path}
                  className="block text-[#7A0019] hover:text-[#FFCC33] py-2 transition-colors duration-200 font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.name}
                </Link>
              )
            ))}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;