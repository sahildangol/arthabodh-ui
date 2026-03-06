import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline';
}

const Button = ({ children, variant = 'primary', ...props }: ButtonProps) => {
  // Use a class name instead of an inline hover object
  const className = `button-${variant}`;

  return (
    <button className={className} {...props}>
      {children}
    </button>
  );
};

export default Button;