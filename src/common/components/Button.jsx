import React from 'react';

const Button = ({ children, variant = 'primary', ...props }) => {
  const styles = {
    padding: '0.6rem 1.2rem',
    borderRadius: '4px',
    fontWeight: '500',
    transition: '0.2s',
    backgroundColor: variant === 'primary' ? 'var(--navbar-primary)' : 'var(--secondary)',
    color: variant === 'primary' ? 'white' : 'var(--text-base)',
    border: variant === 'outline' ? '1px solid var(--accent)' : 'none',
  };

  return <button style={styles} {...props}>{children}</button>;
};

export default Button;