import React from 'react';

const Sidebar = () => {
  const sidebarStyle = {
    width: '260px',
    height: '100vh',
    backgroundColor: 'var(--navbar-bg)',
    color: 'var(--navbar-text)',
    display: 'flex',
    flexDirection: 'column',
    position: 'fixed',
    left: 0,
    top: 0,
    padding: 'var(--space-lg)'
  };

  const navLinkStyle = {
    padding: 'var(--space-md) 0',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    cursor: 'pointer',
    color: 'var(--navbar-text)',
    fontSize: '0.95rem',
    display: 'block'
  };

  return (
    <nav style={sidebarStyle}>
      <div style={{ marginBottom: '2rem', fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--navbar-primary)' }}>
        PROJECT LOGO
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        <a href="#dashboard" style={navLinkStyle}>Dashboard</a>
        <a href="#projects" style={navLinkStyle}>Projects</a>
        <a href="#settings" style={navLinkStyle}>Settings</a>
      </div>

      <div style={{ marginTop: 'auto' }}>
        <button style={{ 
          backgroundColor: 'var(--navbar-primary)', 
          color: 'white', 
          width: '100%', 
          padding: '0.8rem',
          borderRadius: '4px'
        }}>
          New Action
        </button>
      </div>
    </nav>
  );
};

export default Sidebar;