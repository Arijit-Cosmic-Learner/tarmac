import { Link } from 'react-router-dom';
import { useProgress } from '../context/ProgressContext';
import { useAuth } from '../context/AuthContext';
import { isQuestionLocked } from '../data/questions';
import { Lock, CheckCircle, Circle, Star } from 'lucide-react';
import './QuestionCard.css';

const CATEGORY_COLORS = {
  'Behavioral': 'purple',
  'Technical Concepts': 'blue',
  'Situational': 'teal',
  'Role Understanding': 'green',
  'Company-Specific': 'lime',
};

const DIFFICULTY_COLORS = {
  'Fresher': 'green',
  '1–3 Years': 'lime',
  '3–5 Years': 'red',
};

const STATUS_OPTIONS = [
  { value: 'not_started', label: 'Not Started', icon: Circle },
  { value: 'practiced', label: 'Practiced', icon: CheckCircle },
  { value: 'confident', label: 'Confident', icon: Star },
];

export default function QuestionCard({ question, compact = false }) {
  const { getQuestionStatus, updateStatus } = useProgress();
  const { isPaid } = useAuth();
  const status = getQuestionStatus(question.id);
  const locked = isQuestionLocked(question.id, isPaid);
  const catColor = CATEGORY_COLORS[question.category] || 'blue';
  const diffColor = DIFFICULTY_COLORS[question.difficulty] || 'lime';

  const handleStatusChange = (e, newStatus) => {
    e.preventDefault();
    e.stopPropagation();
    if (locked) return;
    updateStatus(question.id, newStatus);
  };

  return (
    <div className={`question-card ${status} ${locked ? 'locked' : ''} ${compact ? 'compact' : ''}`}>
      <div className="qcard-header">
        <div className="qcard-badges">
          <span className={`badge cat-${catColor}`}>{question.category}</span>
          <span className={`badge diff-${diffColor}`}>{question.difficulty}</span>
          {question.company_tags?.slice(0, 2).map(c => (
            <span key={c} className="badge company-tag">{c}</span>
          ))}
        </div>
        {locked && <Lock size={15} className="lock-icon" />}
      </div>

      <p className={`qcard-question ${locked ? 'blurred' : ''}`}>
        {locked ? 'Upgrade to Pro to unlock this question' : question.question}
      </p>

      <div className="qcard-footer">
        {!locked ? (
          <div className="status-pills">
            {STATUS_OPTIONS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                className={`status-pill ${status === value ? `active-${value}` : ''}`}
                onClick={(e) => handleStatusChange(e, value)}
              >
                <Icon size={13} />
                {!compact && <span>{label}</span>}
              </button>
            ))}
          </div>
        ) : (
          <Link to="/pricing" className="unlock-btn">⚡ Unlock with Pro</Link>
        )}

        {!locked && (
          <Link to={`/track/solutions-engineer/question/${question.id}`} className="view-btn">
            Study →
          </Link>
        )}
      </div>
    </div>
  );
}
