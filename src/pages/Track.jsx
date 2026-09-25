import { useState, useMemo } from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import { CATEGORIES, DIFFICULTIES, getQuestionsForTrack } from '../data/questions';
import { useAuth } from '../context/AuthContext';
import { useProgress } from '../context/ProgressContext';
import QuestionCard from '../components/QuestionCard';
import PaywallBanner from '../components/PaywallBanner';
import ProgressRing from '../components/ProgressRing';
import { Filter, Lock } from 'lucide-react';
import './Track.css';

const ALL = 'All';

export default function Track() {
  const { trackId } = useParams();
  const { isPaid, accessType, accessRole, checkQuestionLocked } = useAuth();
  const { getStats, getQuestionStatus } = useProgress();

  const [catFilter, setCatFilter] = useState(ALL);
  const [diffFilter, setDiffFilter] = useState(ALL);
  const [statusFilter, setStatusFilter] = useState(ALL);

  const categories = [ALL, ...Object.values(CATEGORIES)];
  const difficulties = [ALL, ...Object.values(DIFFICULTIES)];
  const statuses = [ALL, 'not_started', 'practiced', 'confident'];
  const statusLabels = { all: 'All', not_started: 'Not Started', practiced: 'Practiced', confident: 'Confident' };

  const roleMap = {
    'solutions-engineer': 'PSE',
    'pre-sales-engineer': 'PSE',
    'technical-account-manager': 'TAM',
    'product-support-engineer': 'Tech Support'
  };

  const currentTrackTag = roleMap[trackId];

  // If invalid track, redirect to dashboard
  if (!currentTrackTag) {
    return <Navigate to="/dashboard" replace />;
  }

  // Lock the entire track if user has a role-specific pass for a different track
  const isTrackLocked = isPaid && accessType === 'role' && accessRole !== currentTrackTag;

  const trackQuestions = useMemo(() => getQuestionsForTrack(trackId), [trackId]);
  const totalQuestions = trackQuestions.length;

  const filtered = useMemo(() => {
    return trackQuestions.filter(q => {
      if (catFilter !== ALL && q.category !== catFilter) return false;
      if (diffFilter !== ALL && q.difficulty !== diffFilter) return false;
      if (statusFilter !== ALL && getQuestionStatus(q.id) !== statusFilter) return false;
      return true;
    });
  }, [trackQuestions, catFilter, diffFilter, statusFilter, getQuestionStatus]);

  // Track specific stats
  const stats = useMemo(() => {
    const practiced = trackQuestions.filter(q => getQuestionStatus(q.id) === 'practiced').length;
    const confident = trackQuestions.filter(q => getQuestionStatus(q.id) === 'confident').length;
    return { practiced, confident };
  }, [trackQuestions, getQuestionStatus]);

  const freeQuestions = useMemo(() => {
    return filtered.filter(q => !checkQuestionLocked(q.id, trackId));
  }, [filtered, checkQuestionLocked, trackId]);

  const lockedQuestions = useMemo(() => {
    return filtered.filter(q => checkQuestionLocked(q.id, trackId));
  }, [filtered, checkQuestionLocked, trackId]);

  const getTrackDisplayName = () => {
    if (trackId === 'solutions-engineer') return 'Solutions Engineer';
    if (trackId === 'technical-account-manager') return 'Technical Account Manager';
    if (trackId === 'product-support-engineer') return 'Product Support Engineer';
    return 'Solutions Engineer';
  };

  if (isTrackLocked) {
    return (
      <div className="track-page page-enter">
        <div className="page-content">
          <div className="track-breadcrumb">
            <Link to="/dashboard">Dashboard</Link>
            <span>/</span>
            <span>{getTrackDisplayName()}</span>
          </div>
          <div className="locked-question-page" style={{ textAlign: 'center', padding: '4rem 2rem', background: 'var(--surface-1)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', marginTop: '2rem' }}>
            <Lock size={48} className="mock-lock-icon" style={{ color: '#ef4444', marginBottom: '1.5rem' }} />
            <h2>Track Locked Under Current Pass</h2>
            <p style={{ color: 'var(--text-muted)', maxWidth: '500px', margin: '0.5rem auto 1.5rem auto' }}>
              Your active plan is locked to the <strong>{accessRole}</strong> track. Please upgrade to Pro All-Access or subscribe to this role to unlock.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <Link to="/pricing" className="btn-primary">View Pricing</Link>
              <Link to="/dashboard" className="btn-secondary">Back to Dashboard</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="track-page page-enter">
      <div className="page-content">
        {/* Header */}
        <div className="track-header">
          <div className="track-header-text">
            <div className="track-breadcrumb">
              <Link to="/dashboard">Dashboard</Link>
              <span>/</span>
              <span>{getTrackDisplayName()}</span>
            </div>
            <h1>{getTrackDisplayName()} <span className="gradient-text">Question Bank</span></h1>
            <p className="track-desc">
              {totalQuestions} questions across categories — behavioral, technical, situational, role understanding, and company-specific. 
              Tailored specifically for {getTrackDisplayName()} interviews.
            </p>
          </div>
          <div className="track-header-stats card">
            <ProgressRing practiced={stats.practiced} confident={stats.confident} total={totalQuestions} size={100} />
            <div className="track-stats-text">
              <div className="ts-row"><span className="ts-dot lime" /><span>{stats.practiced} Practiced</span></div>
              <div className="ts-row"><span className="ts-dot green" /><span>{stats.confident} Confident</span></div>
              <div className="ts-row"><span className="ts-dot gray" /><span>{totalQuestions - stats.practiced - stats.confident} Remaining</span></div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="track-filters">
          <div className="filter-group">
            <Filter size={15} className="filter-icon" />
            <span className="filter-label">Category:</span>
            <div className="filter-pills">
              {categories.map(c => (
                <button key={c} className={`filter-pill ${catFilter === c ? 'active' : ''}`} onClick={() => setCatFilter(c)}>
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div className="filter-group">
            <span className="filter-label">Level:</span>
            <div className="filter-pills">
              {difficulties.map(d => (
                <button key={d} className={`filter-pill ${diffFilter === d ? 'active' : ''}`} onClick={() => setDiffFilter(d)}>
                  {d}
                </button>
              ))}
            </div>
          </div>
          <div className="filter-group">
            <span className="filter-label">Status:</span>
            <div className="filter-pills">
              {statuses.map(s => (
                <button key={s} className={`filter-pill ${statusFilter === s ? 'active' : ''}`} onClick={() => setStatusFilter(s)}>
                  {s === ALL ? 'All' : statusLabels[s]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Result count */}
        <div className="track-result-count">
          Showing <strong>{filtered.length}</strong> of {totalQuestions} questions
          {catFilter !== ALL && <span> · {catFilter}</span>}
          {diffFilter !== ALL && <span> · {diffFilter}</span>}
        </div>

        {/* Questions grid — free */}
        {freeQuestions.length > 0 && (
          <div className="questions-grid">
            {freeQuestions.map(q => <QuestionCard key={q.id} question={q} trackId={trackId} />)}
          </div>
        )}

        {/* Paywall + locked */}
        {lockedQuestions.length > 0 && (
          <div className="paywall-section" style={{ marginTop: freeQuestions.length > 0 ? '2rem' : '0' }}>
            <PaywallBanner context="questions" />
            <div className="questions-grid locked-grid">
              {lockedQuestions.map(q => <QuestionCard key={q.id} question={q} trackId={trackId} />)}
            </div>
          </div>
        )}

        {filtered.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">🔍</div>
            <p className="empty-state-text">No questions match your filters. Try clearing some filters.</p>
            <button className="btn-secondary" onClick={() => { setCatFilter(ALL); setDiffFilter(ALL); setStatusFilter(ALL); }}>
              Clear Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
