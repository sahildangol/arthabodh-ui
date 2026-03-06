import { Twirl as Hamburger } from 'hamburger-react';

// Accept isOpen and setIsOpen from the parent (MainLayout)
const Title = ({ isOpen, setIsOpen }) => {
    return (
        <div className="title-container" style={{
            backgroundColor: 'var(--navbar-bg)', 
            position: 'fixed',                  
            top: 0,
            left: 0,
            width: '100%',
            height: '60px',                   
            display: 'flex',                    
            alignItems: 'center',
            justifyContent: 'space-between', 
            padding: '0 20px',
            zIndex: 1200 
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <Hamburger 
                    toggled={isOpen} 
                    toggle={setIsOpen} 
                    size={24} 
                    color="var(--navbar-text)" 
                />
                
                <h1 className="title" style={{
                    color: 'var(--navbar-text)', 
                    fontSize: '1.5rem', 
                    margin: 0,
                    letterSpacing: '1px'
                }}>
                    ArthaBodh
                </h1>
            </div>

            <div className="nav-actions">
                <button style={{
                    background: 'transparent',
                    border: '1px solid var(--navbar-text)',
                    color: 'var(--navbar-text)',
                    padding: '5px 15px',
                    borderRadius: '4px',
                    cursor: 'pointer'
                }}>
                    Login
                </button>
            </div>
        </div>
    );
};

export default Title;