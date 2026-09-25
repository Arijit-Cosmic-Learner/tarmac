import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useProgress } from '../context/ProgressContext';
import { questions, getQuestionsForTrack } from '../data/questions';
import ProgressRing from '../components/ProgressRing';
import StreakWidget from '../components/StreakWidget';
import QuestionCard from '../components/QuestionCard';
import { BookOpen, Play, Building2, Library, ArrowRight, Lock, Shield } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import './Dashboard.css';

const rawTracks = [
  { id: 'solutions-engineer', name: 'Solutions Engineer', emoji: '⚡', available: true },
  { id: 'technical-account-manager', name: 'Technical Account Manager', emoji: '🤝', available: true },
  { id: 'product-support-engineer', name: 'Product Support Engineer', emoji: '🛠️', available: true },
  { id: 'pre-sales-engineer', name: 'Pre-Sales Engineer', emoji: '🎯', available: false },
  { id: 'customer-success-manager', name: 'Customer Success Manager', emoji: '💚', available: false },
];

export default function Dashboard() {
  const { 
    user, 
    isPaid, 
    daysLeft, 
    accessType, 
    accessRole, 
    subscriptionStatus, 
    isExpired,
    profile,
    refreshProfile
  } = useAuth();
  const { getStats, getQuestionStatus } = useProgress();

  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');
  const [savingPhone, setSavingPhone] = useState(false);

  useEffect(() => {
    // Show modal if user is logged in, not an admin, and profile phone is missing
    if (user && !user.isAdmin && profile && !profile.phone) {
      setShowPhoneModal(true);
    } else {
      setShowPhoneModal(false);
    }
  }, [user, profile]);

  const handlePhoneSubmit = async (e) => {
    e.preventDefault();
    if (!phoneInput || phoneInput.length < 10) return;
    setSavingPhone(true);
    try {
      await supabase.from('profiles').update({ phone: phoneInput }).eq('id', user.id);
      
      // Update local storage too
      localStorage.setItem('tarmac_phone_captured', 'true');
      localStorage.setItem('tarmac_captured_phone_number', phoneInput);

      if (typeof refreshProfile === 'function') {
        await refreshProfile();
      }
      setShowPhoneModal(false);
    } catch (err) {
      console.error('Failed to save phone number on dashboard:', err);
    } finally {
      setSavingPhone(false);
    }
  };

  // Determine current active track based on paid role access
  const currentTrackId = accessType === 'role' && accessRole === 'TAM'
    ? 'technical-account-manager'
    : accessType === 'role' && accessRole === 'Tech Support'
    ? 'product-support-engineer'
    : 'solutions-engineer';

  const trackQuestions = getQuestionsForTrack(currentTrackId);
  const totalQuestionsCount = trackQuestions.length;

  // Track-specific stats
  const trackPracticed = trackQuestions.filter(q => getQuestionStatus(q.id) === 'practiced').length;
  const trackConfident = trackQuestions.filter(q => getQuestionStatus(q.id) === 'confident').length;
  const trackRemaining = totalQuestionsCount - trackPracticed - trackConfident;

  const recentQuestions = questions
    .filter(q => getQuestionStatus(q.id) !== 'not_started')
    .slice(0, 3);

  const firstName = user?.name?.split(' ')[0] || 'there';
  const practiceCount = trackPracticed + trackConfident;

  const checkTrackLocked = (trackId) => {
    if (!isPaid) return false; // Free users can access first 20 questions of any track
    if (user?.isAdmin) return false;
    if (accessType === 'all') return false; // All access unlocks everything

    const roleMap = {
      'solutions-engineer': 'PSE',
      'technical-account-manager': 'TAM',
      'product-support-engineer': 'Tech Support'
    };
    const mapped = roleMap[trackId];
    return mapped !== accessRole;
  };

  const getQuestionBankLink = () => {
    if (accessType === 'role' && accessRole === 'TAM') {
      return '/track/technical-account-manager';
    }
    if (accessType === 'role' && accessRole === 'Tech Support') {
      return '/track/product-support-engineer';
    }
    return '/track/solutions-engineer';
  };

  const quickActions = [
    { to: getQuestionBankLink(), icon: BookOpen, label: 'Question Bank', sub: `Browse all ${totalQuestionsCount} questions` },
    { to: '/mock', icon: Play, label: 'Mock Interview', sub: 'Timed practice session', pro: true },
    { to: '/companies', icon: Building2, label: 'Company Intel', sub: '15 company profiles', pro: true },
    { to: '/resources', icon: Library, label: 'Resources', sub: '8 concept explainers' },
  ];

  const renderExpiryBanner = () => {
    if (isExpired) {
      return (
        <div className="dash-banner banner-expired card">
          <div className="banner-inner">
            <div className="banner-left">
              <span className="banner-emoji">⚠️</span>
              <div>
                <h4>Your Prep Pass Has Expired</h4>
                <p>Your 20-day access period has ended. You are in a 10-day viewing window. To restore practice, please continue manual payment or start a subscription.</p>
              </div>
            </div>
            <Link to="/pricing" className="btn-primary banner-btn">Renew Now</Link>
          </div>
        </div>
      );
    }

    if (isPaid && daysLeft > 0) {
      const isSub = !!subscriptionStatus || !!user?.razorpay_subscription_id;
      const roleLabel = accessType === 'role' ? accessRole : 'All-Access';
      if (isSub) {
        return (
          <div className="dash-banner banner-active banner-sub card">
            <div className="banner-inner">
              <div className="banner-left">
                <span className="banner-emoji">🔄</span>
                <div>
                  <h4>Active Subscription — {roleLabel}</h4>
                  <p>Your subscription is active. Next billing cycle processes in <strong>{daysLeft}</strong> days.</p>
                </div>
              </div>
            </div>
          </div>
        );
      } else {
        return (
          <div className="dash-banner banner-active banner-pass card">
            <div className="banner-inner">
              <div className="banner-left">
                <span className="banner-emoji">⚡</span>
                <div>
                  <h4>Active 20-Day Pass — {roleLabel}</h4>
                  <p>Your manual prep pass is active. You have <strong>{daysLeft}</strong> days left of study access.</p>
                </div>
              </div>
            </div>
          </div>
        );
      }
    }

    return null;
  };

  const getTrackDisplayName = (trackId) => {
    if (trackId === 'solutions-engineer') return 'Solutions Engineer';
    if (trackId === 'technical-account-manager') return 'Technical Account Manager';
    if (trackId === 'product-support-engineer') return 'Product Support Engineer';
    return 'Solutions Engineer';
  };

  return (
    <div className="dashboard-page page-enter">
      <div className="page-content">
        {/* Expiry Banner */}
        {renderExpiryBanner()}

        {/* Header */}
        <div className="dash-header">
          <div>
            <h1 className="dash-greeting">Welcome back, {firstName} 👋</h1>
            <p className="dash-sub">
              {practiceCount === 0
                ? "You haven't started yet — that's okay. Let's change that today."
                : practiceCount < 5
                ? `You've practiced ${practiceCount} questions. Keep going — consistency beats intensity.`
                : practiceCount < 15
                ? `${practiceCount} questions in. You're building real momentum.`
                : `${practiceCount} questions practiced. You're one of the most prepared candidates out there.`}
            </p>
          </div>
          {!isPaid && (
            <Link to="/pricing" className="upgrade-nudge">
              <span>⚡ Upgrade to Pro</span>
              <ArrowRight size={14} />
            </Link>
          )}
        </div>

        {/* Stats Row */}
        <div className="dash-stats-row">
          <div className="dash-progress-card card">
            <div className="dash-progress-inner">
              <ProgressRing practiced={trackPracticed} confident={trackConfident} total={totalQuestionsCount} />
              <div className="dash-progress-breakdown">
                <h3>{getTrackDisplayName(currentTrackId)} Track</h3>
                <div className="progress-stats">
                  <div className="progress-stat">
                    <div className="stat-dot not-started" />
                    <span className="stat-label">Not started</span>
                    <span className="stat-val">{trackRemaining}</span>
                  </div>
                  <div className="progress-stat">
                    <div className="stat-dot practiced" />
                    <span className="stat-label">Practiced</span>
                    <span className="stat-val">{trackPracticed}</span>
                  </div>
                  <div className="progress-stat">
                    <div className="stat-dot confident" />
                    <span className="stat-label">Confident</span>
                    <span className="stat-val">{trackConfident}</span>
                  </div>
                </div>
                <Link to={getQuestionBankLink()} className="btn-primary" style={{ fontSize: '0.875rem', padding: '0.6rem 1.25rem', marginTop: '0.5rem', width: 'fit-content' }}>
                  Continue Practicing
                </Link>
              </div>
            </div>
          </div>

          <div className="dash-streak-card card">
            <h3 className="card-section-title">Practice Streak</h3>
            <StreakWidget />
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <div className="section-header">
            <h2 className="section-title">Quick Access</h2>
          </div>
          <div className="quick-actions-grid">
            {quickActions.map(({ to, icon: Icon, label, sub, pro }) => (
              <Link key={to} to={to} className={`quick-action-card ${pro && !isPaid ? 'locked' : ''}`}>
                <div className="qa-icon"><Icon size={22} /></div>
                <div className="qa-content">
                  <div className="qa-label">{label} {pro && !isPaid && <Lock size={13} />}</div>
                  <div className="qa-sub">{sub}</div>
                </div>
                <ArrowRight size={16} className="qa-arrow" />
              </Link>
            ))}
          </div>
        </div>

        {/* Continue Where Left Off */}
        {recentQuestions.length > 0 && (
          <div>
            <div className="section-header">
              <h2 className="section-title">Continue where you left off</h2>
              <Link to={getQuestionBankLink()} className="view-all-link">View all →</Link>
            </div>
            <div className="recent-questions-grid">
              {recentQuestions.map(q => <QuestionCard key={q.id} question={q} />)}
            </div>
          </div>
        )}

        {/* All Tracks */}
        <div>
          <div className="section-header">
            <h2 className="section-title">All Interview Tracks</h2>
          </div>
          <div className="tracks-grid">
            {rawTracks.map(track => {
              const locked = checkTrackLocked(track.id);
              const qCount = track.available ? getQuestionsForTrack(track.id).length : 0;
              return (
                <div key={track.id} className={`track-card ${!track.available ? 'coming-soon' : ''} ${locked ? 'locked' : ''}`}>
                  <span className="track-emoji">{track.emoji}</span>
                  <div className="track-info">
                    <div className="track-name">
                      {track.name} {locked && <Lock size={13} style={{ marginLeft: '4px', verticalAlign: 'middle', color: 'var(--text-muted)' }} />}
                    </div>
                    <div className="track-meta">
                      {track.available ? `${qCount} questions` : 'Coming Soon'}
                    </div>
                  </div>
                  {track.available ? (
                    locked ? (
                      <Link to="/pricing" className="track-action" style={{ color: 'var(--text-muted)' }}>Unlock →</Link>
                    ) : (
                      <Link to={`/track/${track.id}`} className="track-action">Prepare →</Link>
                    )
                  ) : (
                    <span className="coming-soon-badge">Q2 2025</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {showPhoneModal && (
        <div className="modal-overlay">
          <div className="modal-content animate-slide" style={{ maxWidth: '420px', width: '90%' }}>
            <h3 style={{ marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Welcome! One quick thing 👋</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              We don't have your WhatsApp number yet. Add it now to secure your account, receive interview alerts, and exclusive offers.
            </p>
            <form onSubmit={handlePhoneSubmit}>
              <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                <input
                  type="tel"
                  className="form-input"
                  placeholder="+91 98765 43210"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  autoFocus
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    fontSize: '1rem',
                    outline: 'none'
                  }}
                />
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.35rem', justifyContent: 'flex-start' }}>
                <Shield size={12} /> We promise not to spam or disturb you.
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <button 
                  type="button" 
                  className="btn-sync" 
                  onClick={() => setShowPhoneModal(false)} 
                  style={{ 
                    flex: 1,
                    padding: '0.75rem',
                    background: 'transparent',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer'
                  }}
                >
                  Skip for now
                </button>
                <button 
                  type="submit" 
                  className="btn-primary" 
                  disabled={savingPhone}
                  style={{ 
                    flex: 1,
                    padding: '0.75rem',
                    background: 'var(--lime-400)',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'var(--bg-main)',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  {savingPhone ? 'Saving...' : 'Save & Continue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
