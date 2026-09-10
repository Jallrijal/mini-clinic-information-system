import { useNavigate } from 'react-router-dom';

const NotFound = () => {
  const navigate = useNavigate();
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0d1117',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#f1f5f9',
        fontFamily: 'Inter, system-ui, sans-serif',
        gap: '16px',
      }}
    >
      <h1 style={{ fontSize: '72px', fontWeight: 800, margin: 0, color: '#6366f1' }}>404</h1>
      <p style={{ fontSize: '18px', color: '#64748b', margin: 0 }}>Halaman tidak ditemukan.</p>
      <button
        onClick={() => navigate('/dashboard')}
        style={{
          marginTop: '12px',
          padding: '10px 24px',
          background: '#6366f1',
          color: '#fff',
          border: 'none',
          borderRadius: '10px',
          fontSize: '14px',
          fontWeight: 600,
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        Kembali ke Dashboard
      </button>
    </div>
  );
};

export default NotFound;
