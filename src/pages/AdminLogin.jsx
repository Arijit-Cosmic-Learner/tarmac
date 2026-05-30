import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, ShieldAlert, KeyRound } from 'lucide-react';
import './AdminLogin.css';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login, logout, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  const ADMIN_EMAIL = 'admin.tarmac@gmail.com';

  useEffect(() => {
    // If already logged in as admin, send directly to /admin
    if (isAuthenticated) {
      if (user?.email === ADMIN_EMAIL || localStorage.getItem('tarmac_admin_override') === 'true') {
        navigate('/admin');
      } else {
        // If logged in as non-admin, log them out and prompt
        logout();
        setError('Your current session is not authorized for Admin Console.');
      }
    }
  }, [isAuthenticated, user, navigate, logout]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (email.trim().toLowerCase() !== ADMIN_EMAIL) {
      setError('Access Denied: This portal is restricted to authorized admin accounts.');
      setLoading(false);
      return;
    }

    try {
      const loggedInUser = await login(email.trim(), password);
      
      const isAdmin = loggedInUser.email === ADMIN_EMAIL || 
                      localStorage.getItem('tarmac_admin_override') === 'true';

      if (isAdmin) {
        navigate('/admin');
      } else {
        await logout();
        setError('Access Denied: Unauthorized account credentials.');
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-page">
      <div className="admin-login-bg-glow" />
      
      <div className="admin-login-card animate-slide">
        <Link to="/" className="admin-login-logo">
          <img src="/tarmac-icon-transparent.svg" alt="Tarmac Logo" width="22" height="22" />
          <span>Tar<span style={{ color: 'var(--lime-400)' }}>mac</span> <span className="admin-sub-tag">Admin</span></span>
        </Link>

        <div className="admin-login-header">
          <div className="shield-icon-wrapper">
            <KeyRound size={28} className="shield-icon" />
          </div>
          <h1 className="admin-login-title">Administrative Portal</h1>
          <p className="admin-login-sub">
            Authorized personnel access only. Actions are monitored.
          </p>
        </div>

        <form className="admin-login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Admin Email</label>
            <input
              type="email"
              className="form-input admin-input"
              placeholder="admin@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="password-wrap">
              <input
                type={showPw ? 'text' : 'password'}
                className="form-input admin-input"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                disabled={loading}
              />
              <button
                type="button"
                className="pw-toggle"
                onClick={() => setShowPw(s => !s)}
                disabled={loading}
              >
                {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="admin-login-error">
              <ShieldAlert size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            className="btn-admin-submit"
            disabled={loading}
          >
            {loading ? 'Authorizing Session...' : 'Authenticate Access'}
          </button>
        </form>

        <div className="admin-login-footer">
          <Link to="/login" className="back-link">
            Return to Candidate Login
          </Link>
        </div>
      </div>
    </div>
  );
}
