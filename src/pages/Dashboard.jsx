import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useProgress } from '../context/ProgressContext';
import { questions } from '../data/questions';
import ProgressRing from '../components/ProgressRing';
import StreakWidget from '../components/StreakWidget';
import QuestionCard from '../components/QuestionCard';
import { BookOpen, Play, Building2, Library, ArrowRight, Lock } from 'lucide-react';
import './Dashboard.css';

const tracks = [
  { id: 'solutions-engineer', name: 'Solutions Engineer', emoji: '⚡', available: true, count: 50 },
  { id: 'technical-account-manager', name: 'Technical Account Manager', emoji: '🤝', available: false },
  { id: 'pre-sales-engineer', name: 'Pre-Sales Engineer', emoji: '🎯', available: false },
  { id: 'customer-success-manager', name: 'Customer Success Manager', emoji: '💚', available: false },
  { id: 'product-support-engineer', name: 'Product Support Engineer', emoji: '🛠️', available: false },
];

const quickActions = [
  { to: '/track/solutions-engineer', icon: BookOpen, label: 'Question Bank', sub: 'Browse all 50 questions' },
  { to: '/mock', icon: Play, label: 'Mock Interview', sub: 'Timed practice session', pro: true },
  { to: '/companies', icon: Building2, label: 'Company Intel', sub: '15 company profiles', pro: true },
  { to: '/resources', icon: Library, label: 'Resources', sub: '8 concept explainers' },
];

export default function Dashboard() {
  const { user, isPaid } = useAuth();
  const { getStats, getQuestionStatus } = useProgress();
  const stats = getStats();

  const recentQuestions = questions
    .filter(q => getQuestionStatus(q.id) !== 'not_started')
    .slice(0, 3);

  const firstName = user?.name?.split(' ')[0] || 'there';
  const practiceCount = stats.practiced + stats.confident;

  return (
    <div className="dashboard-page page-enter">
      <div className="page-content">
        {/* Header */}
        <div className="dash-header">
          <div>
            <h1 className="dash-greeting">Welcome back, {firstName} 👋</h1>
            <p className="dash-sub">
              {practiceCount === 0
                ? "You haven't started yet — that's okay. Let's change that today."
                : practiceCount < 10
                ? `You've practiced ${practiceCount} questions. Keep going — consistency beats intensity.`
                : practiceCount < 30
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
              <ProgressRing practiced={stats.practiced} confident={stats.confident} total={50} />
              <div className="dash-progress-breakdown">
                <h3>Solutions Engineer Track</h3>
                <div className="progress-stats">
                  <div className="progress-stat">
                    <div className="stat-dot not-started" />
                    <span className="stat-label">Not started</span>
                    <span className="stat-val">{50 - stats.practiced - stats.confident}</span>
                  </div>
                  <div className="progress-stat">
                    <div className="stat-dot practiced" />
                    <span className="stat-label">Practiced</span>
                    <span className="stat-val">{stats.practiced}</span>
                  </div>
                  <div className="progress-stat">
                    <div className="stat-dot confident" />
                    <span className="stat-label">Confident</span>
                    <span className="stat-val">{stats.confident}</span>
                  </div>
                </div>
                <Link to="/track/solutions-engineer" className="btn-primary" style={{ fontSize: '0.875rem', padding: '0.6rem 1.25rem', marginTop: '0.5rem', width: 'fit-content' }}>
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
              <Link to="/track/solutions-engineer" className="view-all-link">View all →</Link>
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
            {tracks.map(track => (
              <div key={track.id} className={`track-card ${!track.available ? 'coming-soon' : ''}`}>
                <span className="track-emoji">{track.emoji}</span>
                <div className="track-info">
                  <div className="track-name">{track.name}</div>
                  <div className="track-meta">
                    {track.available ? `${track.count} questions` : 'Coming Soon'}
                  </div>
                </div>
                {track.available ? (
                  <Link to={`/track/${track.id}`} className="track-action">Prepare →</Link>
                ) : (
                  <span className="coming-soon-badge">Q2 2025</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
