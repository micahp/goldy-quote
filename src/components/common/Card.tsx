import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  elevation?: 'none' | 'sm' | 'md' | 'lg';
  bordered?: boolean;
}

const Card: React.FC<CardProps> = ({
  children,
  className = '',
  elevation = 'md',
  bordered = false,
}) => {
  const elevationStyles = {
    none: '',
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
  };

  const borderStyles = bordered ? 'border border-gray-200' : '';
  
  return (
    <div className={`bg-white rounded-lg p-4 ${elevationStyles[elevation]} ${borderStyles} ${className}`}>
      {children}
    </div>
  );
};

export default Card;