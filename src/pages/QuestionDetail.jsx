import { useParams, Link, useNavigate } from 'react-router-dom';
import { questions, isQuestionLocked } from '../data/questions';
import { useAuth } from '../context/AuthContext';
import { useProgress } from '../context/ProgressContext';
import FrameworkCard from '../components/FrameworkCard';
import AnswerToggle from '../components/AnswerToggle';
import { CheckCircle, Star, Circle, ChevronLeft, ChevronRight, Play, Lock } from 'lucide-react';
import './QuestionDetail.css';

const STATUS_ACTIONS = [
  { value: 'not_started', label: 'Not Started', icon: Circle },
  { value: 'practiced', label: 'Mark Practiced', icon: CheckCircle },
  { value: 'confident', label: 'Mark Confident', icon: Star },
];

export default function QuestionDetail() {
  const { id } = useParams();
  const { isPaid } = useAuth();
  const { getQuestionStatus, updateStatus } = useProgress();
  const navigate = useNavigate();

  const questionId = parseInt(id);
  const question = questions.find(q => q.id === questionId);
  const currentIdx = questions.findIndex(q => q.id === questionId);
  const prevQ = currentIdx > 0 ? questions[currentIdx - 1] : null;
  const nextQ = currentIdx < questions.length - 1 ? questions[currentIdx + 1] : null;

  if (!question) return (
    <div className="page-content">
      <div className="empty-state">
        <div className="empty-state-icon">❓</div>
        <p className="empty-state-text">Question not found.</p>
        <Link to="/track/solutions-engineer" className="btn-primary">Back to Question Bank</Link>
      </div>
    </div>
  );

  const locked = isQuestionLocked(question.id, isPaid);
  const status = getQuestionStatus(question.id);

  if (locked) return (
    <div className="page-content">
      <div className="locked-question-page">
        <Lock size={40} />
        <h2>This question is part of the Pro track</h2>
        <p>Unlock all 50 questions, answer frameworks, strong/weak answers, and AI feedback.</p>
        <Link to="/pricing" className="btn-primary">Upgrade to Pro — ₹499/mo</Link>
        <Link to="/track/solutions-engineer" className="btn-ghost">Back to Question Bank</Link>
      </div>
    </div>
  );

  return (
    <div className="question-detail-page page-enter">
      <div className="page-content">
        {/* Breadcrumb + Nav */}
        <div className="qd-nav">
          <div className="qd-breadcrumb">
            <Link to="/dashboard">Dashboard</Link>
            <span>/</span>
            <Link to="/track/solutions-engineer">Question Bank</Link>
            <span>/</span>
            <span>Q{question.id}</span>
          </div>
          <div className="qd-arrows">
            {prevQ ? (
              <button className="qd-arrow-btn" onClick={() => navigate(`/track/solutions-engineer/question/${prevQ.id}`)}>
                <ChevronLeft size={18} /> Previous
              </button>
            ) : <span />}
            <span className="qd-counter">{currentIdx + 1} / {questions.length}</span>
            {nextQ && (
              <button className="qd-arrow-btn" onClick={() => navigate(`/track/solutions-engineer/question/${nextQ.id}`)}>
                Next <ChevronRight size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Question */}
        <div className="qd-layout">
          <div className="qd-main">
            <div className="qd-badges">
              <span className="pill pill-blue">{question.category}</span>
              <span className={`pill ${question.difficulty === 'Fresher' ? 'pill-green' : question.difficulty === '1–3 Years' ? 'pill-lime' : 'pill-red'}`}>
                {question.difficulty}
              </span>
              {question.company_tags?.map(c => (
                <span key={c} className="pill" style={{ background: 'var(--surface-3)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>{c}</span>
              ))}
            </div>

            <h1 className="qd-question">{question.question}</h1>

            {/* Status tracker */}
            <div className="qd-status-bar">
              <span className="status-bar-label">Your progress:</span>
              <div className="status-bar-actions">
                {STATUS_ACTIONS.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    className={`status-bar-btn ${status === value ? `active-${value}` : ''}`}
                    onClick={() => updateStatus(question.id, value)}
                  >
                    <Icon size={15} />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
              <Link to="/mock" className="practice-mock-btn">
                <Play size={14} /> Practice in Mock Mode
              </Link>
            </div>

            <div className="qd-divider" />

            {/* Framework */}
            <section className="qd-section">
              <h2 className="qd-section-title">Answer Framework</h2>
              <FrameworkCard framework={question.framework} frameworkType={question.framework_type} />
            </section>

            <div className="qd-divider" />

            {/* Answers */}
            <section className="qd-section">
              <h2 className="qd-section-title">Sample Answers</h2>
              <p className="qd-section-sub">See what a strong answer sounds like — and what a weak one does wrong.</p>
              <AnswerToggle question={question} />
            </section>

            {/* Navigation */}
            <div className="qd-bottom-nav">
              {prevQ && (
                <Link to={`/track/solutions-engineer/question/${prevQ.id}`} className="qd-nav-card prev">
                  <ChevronLeft size={18} />
                  <div>
                    <div className="nav-card-label">Previous</div>
                    <div className="nav-card-q">{prevQ.question.substring(0, 55)}...</div>
                  </div>
                </Link>
              )}
              {nextQ && (
                <Link to={`/track/solutions-engineer/question/${nextQ.id}`} className="qd-nav-card next">
                  <div style={{ textAlign: 'right' }}>
                    <div className="nav-card-label">Next</div>
                    <div className="nav-card-q">{nextQ.question.substring(0, 55)}...</div>
                  </div>
                  <ChevronRight size={18} />
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
