import Button from '../common/components/Button';
import Card from '../common/components/Card';
import '../styles/globalStyles.css';
const StyleGuide = () => {
  // Styles used within this guide to organize sections
  const sectionStyle = { marginBottom: '3rem' };
  const sectionTitleStyle = {
    borderBottom: '2px solid var(--secondary)',
    paddingBottom: '0.5rem',
    marginBottom: '1.5rem',
    fontSize: '1.25rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  };

  return (
    <div className="container" style={{ padding: '2rem 0' }}>
      <header style={{ marginBottom: 'var(--space-lg)' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: '800' }}>Project Style Guide</h1>
        <p style={{ color: 'var(--accent)', marginTop: 'var(--space-sm)' }}>
          Reviewing global tokens from <code>styles/gobalstyles.css</code>
        </p>
      </header>

      {/* 1. COLORS SECTION */}
      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>1. Colors</h2>
        <div style={{ display: 'flex', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
          <ColorBlock color="var(--navbar-bg)" name="Navbar BG" />
          <ColorBlock color="var(--navbar-primary)" name="Teal Primary" />
          <ColorBlock color="var(--primary)" name="White Primary" />
          <ColorBlock color="var(--secondary)" name="Light Blue" />
          <ColorBlock color="var(--accent)" name="Gray Accent" />
        </div>
      </section>

      {/* 2. BUTTONS SECTION */}
      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>2. Buttons</h2>
        <Card>
          <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
          </div>
        </Card>
      </section>

      {/* 3. FORMS & INPUTS SECTION */}
      <section style={sectionStyle}>
        <h2 style={sectionTitleStyle}>3. Forms & Inputs</h2>
        <Card title="Data Entry Preview">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                Username
              </label>
              <input 
                type="text" 
                placeholder="Enter name..." 
                style={inputBaseStyle} 
              />
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                Bio
              </label>
              <textarea 
                placeholder="Tell us about yourself..." 
                rows={3}
                style={inputBaseStyle}
              ></textarea>
            </div>
            
            <Button variant="primary">Submit Form</Button>
          </div>
        </Card>
      </section>
    </div>
  );
};

// --- Helpers ---

const inputBaseStyle = {
  padding: '0.6rem',
  border: '1px solid var(--accent)',
  borderRadius: '4px',
  backgroundColor: 'var(--primary)',
  color: 'var(--text-base)',
  width: '100%'
};

const ColorBlock = ({ color, name }: { color: string; name: string }) => (
  <div style={{ textAlign: 'center' }}>
    <div style={{ 
      backgroundColor: color, 
      width: '100px', 
      height: '60px', 
      borderRadius: '6px', 
      border: '1px solid var(--secondary)',
      marginBottom: '0.5rem'
    }} />
    <div style={{ fontWeight: '600', fontSize: '0.8rem' }}>{name}</div>
  </div>
);
export default StyleGuide;