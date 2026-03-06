
const Input = ({ label, error, ...props }) => {
  return (
    <div style={{ marginBottom: '1.25rem' }}>
      {label && (
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
          {label}
        </label>
      )}
      <input
        style={{
          width: '100%',
          padding: '0.6rem 0.8rem',
          borderRadius: '6px',
          border: error ? '1px solid var(--error)' : '1px solid #d1d5db',
          fontSize: '1rem',
          outline: 'none'
        }}
        {...props}
      />
      {error && <span style={{ color: 'var(--error)', fontSize: '0.85rem' }}>{error}</span>}
    </div>
  );
};

export default Input;