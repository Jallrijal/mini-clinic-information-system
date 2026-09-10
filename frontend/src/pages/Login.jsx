import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, LogIn, Stethoscope, AlertCircle } from 'lucide-react';
import './Login.css';

const Login = () => {
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email.trim() || !form.password.trim()) {
      setError('Email dan password wajib diisi.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await login(form.email, form.password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.errors ||
        'Login gagal. Periksa kembali username dan password Anda.';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-root">
      {/* Animated background blobs */}
      <div className="login-blob login-blob-1" aria-hidden="true" />
      <div className="login-blob login-blob-2" aria-hidden="true" />
      <div className="login-blob login-blob-3" aria-hidden="true" />

      <div className="login-container">
        {/* Left panel – branding */}
        <div className="login-left">
          <div className="login-brand">
            <div className="login-brand-icon">
              <Stethoscope size={36} />
            </div>
            <h1 className="login-brand-name">MediCare</h1>
            <p className="login-brand-tagline">Mini Clinic Information System</p>
          </div>

          <div className="login-features">
            <div className="login-feature-item">
              <span className="feature-dot" />
              <span>Manajemen Data Pasien Terintegrasi</span>
            </div>
            <div className="login-feature-item">
              <span className="feature-dot" />
              <span>Sistem Antrean Otomatis</span>
            </div>
            <div className="login-feature-item">
              <span className="feature-dot" />
              <span>Rekam Medis Digital (SOAP)</span>
            </div>
            <div className="login-feature-item">
              <span className="feature-dot" />
              <span>Dashboard Analytics Real-time</span>
            </div>
          </div>

          <p className="login-left-footer">
            © 2025 MediCare · Sistem Klinik Pratama
          </p>
        </div>

        {/* Right panel – form */}
        <div className="login-right">
          <div className="login-card">
            <div className="login-card-header">
              <div className="login-card-icon">
                <Stethoscope size={22} />
              </div>
              <h2 className="login-title">Selamat Datang</h2>
              <p className="login-subtitle">
                Masuk ke akun Anda untuk melanjutkan
              </p>
            </div>

            {error && (
              <div className="login-error" role="alert">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <form className="login-form" onSubmit={handleSubmit} noValidate>
              <div className="form-group">
                <label className="form-label" htmlFor="login-email">
                  Email
                </label>
                <div className="form-input-wrap">
                  <input
                    id="login-email"
                    type="email"
                    name="email"
                    className="form-input"
                    placeholder="Masukkan email Anda"
                    value={form.email}
                    onChange={handleChange}
                    autoComplete="email"
                    autoFocus
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="login-password">
                  Password
                </label>
                <div className="form-input-wrap">
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    className="form-input form-input--password"
                    placeholder="Masukkan password Anda"
                    value={form.password}
                    onChange={handleChange}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                id="btn-login"
                type="submit"
                className={`login-btn ${loading ? 'login-btn--loading' : ''}`}
                disabled={loading}
              >
                {loading ? (
                  <span className="btn-spinner" aria-hidden="true" />
                ) : (
                  <LogIn size={18} />
                )}
                <span>{loading ? 'Memproses...' : 'Masuk'}</span>
              </button>
            </form>

            <div className="login-hint">
              <p>Demo akun tersedia:</p>
              <div className="login-hint-badges">
                <span className="hint-badge hint-badge--admin">admin@clinic.com</span>
                <span className="hint-badge hint-badge--doctor">budi.doctor@clinic.com</span>
                <span className="hint-badge hint-badge--officer">siti.officer@clinic.com</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
