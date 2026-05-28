import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import './Auth.css';

export default function Auth() {
  const [params] = useSearchParams();
  const [tab, setTab] = useState(params.get('tab') === 'signup' ? 'signup' : 'login');
  const [form, setForm] = useState({ email: '', name: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, signup, loginWithGoogle, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard');
  }, [isAuthenticated, navigate]);

  const handleTabChange = (newTab) => {
    setTab(newTab);
    setError('');
    setSuccessMsg('');
  };

  const handleGoogleLogin = async () => {
    setError('');
    setSuccessMsg('');
    try {
      await loginWithGoogle();
    } catch (err) {
      setError(err.message || 'Google Sign-In failed');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);
    try {
      if (tab === 'login') {
        await login(form.email, form.password);
        navigate('/dashboard');
      } else {
        if (!form.name.trim()) { setError('Please enter your name'); setLoading(false); return; }
        const signUpData = await signup(form.email, form.name.trim(), form.password);
        if (!signUpData?.session) {
          setSuccessMsg('Account created successfully! Please check your inbox for a confirmation link to activate your account.');
        } else {
          navigate('/dashboard');
        }
      }
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg-glow" />
      <div className="auth-card animate-slide">
        <Link to="/" className="auth-logo">
          <img src="/tarmac-icon-transparent.svg" alt="Tarmac Logo" width="20" height="20" />
          <span>Tar<span style={{ color: 'var(--lime-400)' }}>mac</span></span>
        </Link>

        <div className="auth-tabs">
          <button className={`auth-tab ${tab === 'login' ? 'active' : ''}`} onClick={() => handleTabChange('login')}>Sign In</button>
          <button className={`auth-tab ${tab === 'signup' ? 'active' : ''}`} onClick={() => handleTabChange('signup')}>Create Account</button>
        </div>

        <div className="auth-header">
          <h1 className="auth-title">
            {tab === 'login' ? 'Welcome back' : 'Start your prep journey'}
          </h1>
          <p className="auth-sub">
            {tab === 'login'
              ? 'Sign in to continue your interview preparation.'
              : 'Free forever. Upgrade when you\'re ready.'}
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {tab === 'signup' && (
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                type="text" className="form-input" placeholder="Arjun Sharma"
                value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                required autoFocus={tab === 'signup'}
              />
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email" className="form-input" placeholder="you@email.com"
              value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              required autoFocus={tab === 'login'}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="password-wrap">
              <input
                type={showPw ? 'text' : 'password'} className="form-input" placeholder="Min. 6 characters"
                value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                required minLength={6}
              />
              <button type="button" className="pw-toggle" onClick={() => setShowPw(s => !s)}>
                {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          {error && <div className="auth-error">{error}</div>}
          {successMsg && <div className="auth-success">{successMsg}</div>}

          <button type="submit" className="btn-primary auth-submit" disabled={loading}>
            {loading ? 'Please wait...' : tab === 'login' ? 'Sign In' : 'Create Free Account'}
          </button>
        </form>

        <div className="auth-divider"><span>or</span></div>

        <button type="button" className="btn-google" onClick={handleGoogleLogin}>
          <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
          Continue with Google
        </button>

        <p className="auth-switch">
          {tab === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button className="auth-switch-btn" onClick={() => handleTabChange(tab === 'login' ? 'signup' : 'login')}>
            {tab === 'login' ? 'Sign up free' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );
}
