import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Shield } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import './Auth.css';

export default function Auth() {
  const [params] = useSearchParams();
  const [tab, setTab] = useState(params.get('tab') === 'signup' ? 'signup' : 'login');
  const [form, setForm] = useState({ email: '', name: '', password: '', phone: '' });
  const [showPw, setShowPw] = useState(false);
  
  // Pre-Auth Lead Capture States
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [capturePhone, setCapturePhone] = useState('');
  const [showPostLoginPhone, setShowPostLoginPhone] = useState(false);
  const [postLoginUserId, setPostLoginUserId] = useState(null);
  const [postLoginPhone, setPostLoginPhone] = useState('');
  
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, signup, loginWithGoogle, isAuthenticated } = useAuth();
  
  const isPhoneCaptured = localStorage.getItem('tarmac_phone_captured') === 'true';
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard');
  }, [isAuthenticated, navigate]);

  const handleTabChange = (newTab) => {
    setTab(newTab);
    setError('');
    setSuccessMsg('');
  };

  const captureLead = async (phoneStr, sourceStr, emailStr = null) => {
    try {
      await supabase.from('leads').insert([{ 
        phone: phoneStr, 
        source: sourceStr,
        email: emailStr || null
      }]);
      localStorage.setItem('tarmac_phone_captured', 'true');
      localStorage.setItem('tarmac_captured_phone_number', phoneStr);
    } catch (err) {
      console.error('Failed to capture lead:', err);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setSuccessMsg('');
    
    // Check if admin is trying to sign in
    const isAdmin = form.email.trim().toLowerCase() === 'admin.tarmac@gmail.com';

    if (!isAdmin && !isPhoneCaptured && !capturePhone) {
      setShowPhoneModal(true);
      return;
    }
    
    try {
      await loginWithGoogle();
    } catch (err) {
      setError(err.message || 'Google Sign-In failed');
    }
  };

  const submitPhoneModal = async (e) => {
    e.preventDefault();
    if (!capturePhone || capturePhone.length < 10) {
      setError('Please enter a valid phone number');
      return;
    }
    setShowPhoneModal(false);
    setLoading(true);
    // Also capture the email field value if the user typed it in the form
    await captureLead(capturePhone, 'google_oauth_intercept', form.email || null);
    try {
      await loginWithGoogle();
    } catch (err) {
      setError(err.message || 'Google Sign-In failed');
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);
    try {
      if (tab === 'login') {
        const loggedInUser = await login(form.email, form.password);
        // After login, check if profile has a phone. If not, intercept and ask.
        // Bypass completely for admin accounts
        try {
          const { data: prof } = await supabase
            .from('profiles')
            .select('phone, is_admin')
            .eq('id', loggedInUser.id)
            .maybeSingle();

          const isUserAdmin = prof?.is_admin || loggedInUser.email === 'admin.tarmac@gmail.com';

          if (isUserAdmin) {
            navigate('/admin');
            return;
          }

          if (!prof?.phone) {
            setPostLoginUserId(loggedInUser.id);
            setShowPostLoginPhone(true);
            setLoading(false);
            return; // don't navigate yet — wait for phone
          }
        } catch (_) {}
        navigate('/dashboard');
      } else {
        if (!form.name.trim()) { setError('Please enter your name'); setLoading(false); return; }
        if (!isPhoneCaptured && !form.phone.trim()) { setError('Please enter your phone number'); setLoading(false); return; }
        
        // Capture lead before auth if not already captured
        if (!isPhoneCaptured) {
          await captureLead(form.phone, 'email_signup', form.email);
        }
        
        const signUpData = await signup(form.email, form.name.trim(), form.password);
        
        if (!signUpData?.session) {
          setSuccessMsg('Account created successfully! Please check your inbox for a confirmation link to activate your account.');
        } else {
          // Write phone to profiles.phone column directly (clean architecture)
          if (form.phone && signUpData?.user?.id) {
            try {
              await supabase
                .from('profiles')
                .update({ phone: form.phone })
                .eq('id', signUpData.user.id);
            } catch(e) {
              console.warn('Could not write phone to profiles.phone on signup:', e);
            }
          }
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

        <form className="auth-form" onSubmit={handleSubmit} autoComplete="off">
          {tab === 'signup' && (
            <>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text" className="form-input" placeholder="Arjun Sharma"
                  value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  required autoFocus={tab === 'signup'}
                  autoComplete="off"
                />
              </div>
              {!isPhoneCaptured && (
                <>
                  <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                    <label className="form-label">WhatsApp Number</label>
                    <input
                      type="tel" className="form-input" placeholder="+91 98765 43210"
                      value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                      required
                      autoComplete="off"
                    />
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Shield size={12} /> We promise not to spam or disturb you.
                  </p>
                </>
              )}
            </>
          )}
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email" className="form-input" placeholder="you@email.com"
              value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              required autoFocus={tab === 'login'}
              autoComplete="off"
            />
            {form.email.trim().toLowerCase() === 'admin.tarmac@gmail.com' && (
              <div className="admin-detection-badge">
                👑 Admin Access — WhatsApp prompt bypassed
              </div>
            )}
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="password-wrap">
              <input
                type={showPw ? 'text' : 'password'} className="form-input" placeholder="Min. 6 characters"
                value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                required minLength={6}
                autoComplete="new-password"
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

        <div style={{ marginTop: '0.5rem', textAlign: 'center' }}>
          <Link to="/admin-login" className="admin-portal-link">
            System Administrator Portal
          </Link>
        </div>
      </div>

      {showPhoneModal && (
        <div className="modal-overlay">
          <div className="modal-content animate-slide" style={{ maxWidth: '400px', width: '90%' }}>
            <h3 style={{ marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Just one more step</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Please enter your WhatsApp number to secure your account and receive interview alerts.
            </p>
            <form onSubmit={submitPhoneModal}>
              <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                <input
                  type="tel"
                  className="form-input"
                  placeholder="+91 98765 43210"
                  value={capturePhone}
                  onChange={(e) => setCapturePhone(e.target.value)}
                  autoFocus
                  required
                />
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Shield size={12} /> We promise not to spam or disturb you.
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <button type="button" className="btn-sync" onClick={() => setShowPhoneModal(false)} style={{ flex: 1 }}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>
                  Continue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Post-Login Phone Capture Modal */}
      {showPostLoginPhone && (
        <div className="modal-overlay">
          <div className="modal-content animate-slide" style={{ maxWidth: '420px', width: '90%' }}>
            <h3 style={{ marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Welcome back! One quick thing 👋</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              We don't have your WhatsApp number yet. Add it now to receive interview alerts and exclusive offers.
            </p>
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!postLoginPhone || postLoginPhone.length < 10) return;
              try {
                await supabase.from('profiles').update({ phone: postLoginPhone }).eq('id', postLoginUserId);
                localStorage.setItem('tarmac_captured_phone_number', postLoginPhone);
              } catch(err) {
                console.warn('Could not save phone after login:', err);
              }
              setShowPostLoginPhone(false);
              navigate('/dashboard');
            }}>
              <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                <input
                  type="tel"
                  className="form-input"
                  placeholder="+91 98765 43210"
                  value={postLoginPhone}
                  onChange={(e) => setPostLoginPhone(e.target.value)}
                  autoFocus
                  required
                />
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Shield size={12} /> We promise not to spam or disturb you.
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <button type="button" className="btn-sync" onClick={() => { setShowPostLoginPhone(false); navigate('/dashboard'); }} style={{ flex: 1 }}>
                  Skip for now
                </button>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>
                  Save & Continue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
