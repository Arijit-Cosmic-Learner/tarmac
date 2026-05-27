import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { questions, CATEGORIES, DIFFICULTIES, FREE_QUESTION_LIMIT } from '../data/questions';
import { useAuth } from '../context/AuthContext';
import { useProgress } from '../context/ProgressContext';
import QuestionCard from '../components/QuestionCard';
import PaywallBanner from '../components/PaywallBanner';
import ProgressRing from '../components/ProgressRing';
import { Filter, ChevronDown } from 'lucide-react';
import './Track.css';

const ALL = 'All';

export default function Track() {
  const { isPaid } = useAuth();
  const { getStats, getQuestionStatus } = useProgress();
  const stats = getStats();

  const [catFilter, setCatFilter] = useState(ALL);
  const [diffFilter, setDiffFilter] = useState(ALL);
  const [statusFilter, setStatusFilter] = useState(ALL);

  const categories = [ALL, ...Object.values(CATEGORIES)];
  const difficulties = [ALL, ...Object.values(DIFFICULTIES)];
  const statuses = [ALL, 'not_started', 'practiced', 'confident'];
  const statusLabels = { all: 'All', not_started: 'Not Started', practiced: 'Practiced', confident: 'Confident' };

  const filtered = useMemo(() => {
    return questions.filter(q => {
      if (catFilter !== ALL && q.category !== catFilter) return false;
      if (diffFilter !== ALL && q.difficulty !== diffFilter) return false;
      if (statusFilter !== ALL && getQuestionStatus(q.id) !== statusFilter) return false;
      return true;
    });
  }, [catFilter, diffFilter, statusFilter, getQuestionStatus]);

  const freeQuestions = filtered.filter(q => q.id <= FREE_QUESTION_LIMIT);
  const lockedQuestions = filtered.filter(q => q.id > FREE_QUESTION_LIMIT);

  return (
    <div className="track-page page-enter">
      <div className="page-content">
        {/* Header */}
        <div className="track-header">
          <div className="track-header-text">
            <div className="track-breadcrumb">
              <Link to="/dashboard">Dashboard</Link>
              <span>/</span>
              <span>Solutions Engineer</span>
            </div>
            <h1>Solutions Engineer <span className="gradient-text">Question Bank</span></h1>
            <p className="track-desc">
              50 questions across 5 categories — behavioral, technical, situational, role understanding, and company-specific. 
              Written by someone who sat in these interviews.
            </p>
          </div>
          <div className="track-header-stats card">
            <ProgressRing practiced={stats.practiced} confident={stats.confident} total={50} size={100} />
            <div className="track-stats-text">
              <div className="ts-row"><span className="ts-dot lime" /><span>{stats.practiced} Practiced</span></div>
              <div className="ts-row"><span className="ts-dot green" /><span>{stats.confident} Confident</span></div>
              <div className="ts-row"><span className="ts-dot gray" /><span>{50 - stats.practiced - stats.confident} Remaining</span></div>
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
          Showing <strong>{filtered.length}</strong> of 50 questions
          {catFilter !== ALL && <span> · {catFilter}</span>}
          {diffFilter !== ALL && <span> · {diffFilter}</span>}
        </div>

        {/* Questions grid — free */}
        {freeQuestions.length > 0 && (
          <div className="questions-grid">
            {freeQuestions.map(q => <QuestionCard key={q.id} question={q} />)}
          </div>
        )}

        {/* Paywall + locked */}
        {!isPaid && lockedQuestions.length > 0 && (
          <div className="paywall-section">
            <PaywallBanner context="questions" />
            <div className="questions-grid locked-grid">
              {lockedQuestions.map(q => <QuestionCard key={q.id} question={q} />)}
            </div>
          </div>
        )}

        {isPaid && lockedQuestions.length > 0 && (
          <div className="questions-grid">
            {lockedQuestions.map(q => <QuestionCard key={q.id} question={q} />)}
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
