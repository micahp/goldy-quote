import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'text';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  children: React.ReactNode;
  className?: string;
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  children,
  className = '',
  ...rest
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variantStyles = {
    primary: 'bg-[#FFCC33] hover:bg-[#ffc519] text-[#7A0019] focus:ring-yellow-400',
    secondary: 'bg-[#7A0019] hover:bg-[#630014] text-white focus:ring-red-700',
    outline: 'border border-[#FFCC33] text-[#FFCC33] hover:bg-[#FFCC33]/10 focus:ring-yellow-400',
    text: 'text-[#FFCC33] hover:text-[#ffc519] hover:bg-[#FFCC33]/5 focus:ring-transparent',
  };
  
  const sizeStyles = {
    sm: 'text-sm px-3 py-2',
    md: 'text-base px-4 py-2',
    lg: 'text-lg px-6 py-3',
  };
  
  const widthStyles = fullWidth ? 'w-full' : '';
  
  const buttonClasses = `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${widthStyles} ${className}`;
  
  return (
    <button className={buttonClasses} {...rest}>
      {children}
    </button>
  );
};

export default Button;