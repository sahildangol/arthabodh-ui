import React from 'react';

const Card = ({ title, children }) => {
  return (
    <div style={{
      backgroundColor: 'var(--primary)', // White based on your tokens
      border: '1px solid var(--secondary)',
      borderRadius: '8px',
      padding: 'var(--space-lg)',
      boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
    }}>
      {title && <h3 style={{ marginBottom: 'var(--space-md)' }}>{title}</h3>}
      {children}
    </div>
  );
};

export default Card;