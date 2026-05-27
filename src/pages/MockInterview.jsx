import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { questions } from '../data/questions';
import { useAuth } from '../context/AuthContext';
import { useProgress } from '../context/ProgressContext';
import Timer from '../components/Timer';
import PaywallBanner from '../components/PaywallBanner';
import { Play, RotateCcw, Send, CheckCircle, XCircle, AlertCircle, Lock } from 'lucide-react';
import './MockInterview.css';

const PHASES = { IDLE: 'idle', THINKING: 'thinking', ANSWERING: 'answering', DONE: 'done' };

function analyzeAnswer(answer, question) {
  if (!answer || answer.trim().length < 30) {
    return { score: 2, feedback: 'Your answer is too short. A good answer to this question needs at least 3-4 sentences.', found: [], missing: question.keywords || [], structure: false };
  }
  const lower = answer.toLowerCase();
  const found = (question.keywords || []).filter(kw => lower.includes(kw.toLowerCase()));
  const missing = (question.keywords || []).filter(kw => !lower.includes(kw.toLowerCase()));

  const hasStructure = question.framework?.steps?.some(step =>
    lower.includes(step.title.toLowerCase().split(' ').slice(-1)[0])
  ) || answer.includes('.') && answer.split('.').length > 2;

  const wordCount = answer.trim().split(/\s+/).length;
  let score = 4;
  if (found.length >= question.keywords?.length * 0.7) score += 2;
  if (found.length >= question.keywords?.length * 0.4) score += 1;
  if (hasStructure) score += 1;
  if (wordCount > 100) score += 1;
  if (wordCount > 200) score += 1;
  score = Math.min(score, 10);

  const feedbackLines = [];
  if (found.length > 0) feedbackLines.push(`Good — you covered: ${found.slice(0, 3).join(', ')}.`);
  if (missing.length > 0) feedbackLines.push(`You could strengthen this by including: ${missing.slice(0, 3).join(', ')}.`);
  if (!hasStructure) feedbackLines.push(`Try to use the ${question.framework_type} structure more explicitly.`);
  if (wordCount < 80) feedbackLines.push(`Your answer is a bit brief (${wordCount} words). Aim for 100-200 words.`);
  if (score >= 8) feedbackLines.push('Overall: strong answer. You demonstrated role-relevant thinking.');
  else if (score >= 6) feedbackLines.push('Overall: good answer with room to go deeper on specifics.');
  else feedbackLines.push('Overall: solid start — review the framework and try to add more concrete detail.');

  return { score, feedback: feedbackLines.join(' '), found, missing, structure: hasStructure };
}

export default function MockInterview() {
  const { isPaid } = useAuth();
  const { updateStatus } = useProgress();
  const [phase, setPhase] = useState(PHASES.IDLE);
  const [currentQ, setCurrentQ] = useState(null);
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState(null);
  const [sessionCount, setSessionCount] = useState(0);

  if (!isPaid) {
    return (
      <div className="page-content">
        <div className="mock-locked">
          <Lock size={48} className="mock-lock-icon" />
          <h1>Mock Interview Simulator</h1>
          <p>Practice with timed sessions. Get AI-powered feedback on your structure, keywords, and what's missing.</p>
          <PaywallBanner context="mock" />
        </div>
      </div>
    );
  }

  const startSession = () => {
    const pool = questions.filter(q => !result || q.id !== currentQ?.id);
    const q = pool[Math.floor(Math.random() * pool.length)];
    setCurrentQ(q);
    setAnswer('');
    setResult(null);
    setPhase(PHASES.THINKING);
  };

  const handlePhaseChange = (idx) => {
    if (idx === 1) setPhase(PHASES.ANSWERING);
  };

  const handleTimerComplete = () => setPhase(PHASES.DONE);

  const submitAnswer = () => {
    if (!currentQ) return;
    const r = analyzeAnswer(answer, currentQ);
    setResult(r);
    setPhase(PHASES.DONE);
    if (r.score >= 7) updateStatus(currentQ.id, 'confident');
    else if (r.score >= 4) updateStatus(currentQ.id, 'practiced');
    setSessionCount(c => c + 1);
  };

  const reset = () => { setPhase(PHASES.IDLE); setCurrentQ(null); setAnswer(''); setResult(null); };

  return (
    <div className="mock-page page-enter">
      <div className="page-content">
        <div className="mock-header">
          <h1>Mock Interview <span className="gradient-text">Simulator</span></h1>
          <p className="mock-sub">Get a random question. Think for 2 minutes. Answer in 3 minutes. Get feedback. Repeat.</p>
          {sessionCount > 0 && <div className="session-badge">Session {sessionCount} complete</div>}
        </div>

        {phase === PHASES.IDLE && (
          <div className="mock-idle">
            <div className="mock-idle-card card-lg card">
              <div className="idle-icon">🎯</div>
              <h2>Ready to practice?</h2>
              <p>A random question from the Solutions Engineer track will appear. You'll get 2 minutes to think and 3 minutes to type your answer.</p>
              <div className="mock-rules">
                <div className="rule"><span className="rule-dot blue" />2 min: Think phase — organize your thoughts</div>
                <div className="rule"><span className="rule-dot green" />3 min: Answer phase — type your response</div>
                <div className="rule"><span className="rule-dot lime" />Feedback: keywords, structure, score out of 10</div>
              </div>
              <button className="btn-primary mock-start-btn" onClick={startSession}>
                <Play size={18} /> Start Mock Session
              </button>
            </div>
          </div>
        )}

        {phase !== PHASES.IDLE && currentQ && (
          <div className="mock-session">
            <div className="mock-session-layout">
              {/* Left: Timer */}
              <div className="mock-timer-panel card">
                <Timer onPhaseChange={handlePhaseChange} onComplete={handleTimerComplete} />
                <div className="mock-timer-tip">
                  {phase === PHASES.THINKING && <p>Read the question. What type is it? What framework fits?</p>}
                  {phase === PHASES.ANSWERING && <p>Structure your answer clearly. Use the framework you thought of.</p>}
                  {phase === PHASES.DONE && !result && <p>Timer done — submit your answer when ready.</p>}
                </div>
              </div>

              {/* Right: Question + Answer */}
              <div className="mock-qa-panel">
                <div className="mock-question card">
                  <div className="mock-q-badges">
                    <span className="pill pill-blue">{currentQ.category}</span>
                    <span className={`pill ${currentQ.difficulty === 'Fresher' ? 'pill-green' : currentQ.difficulty === '1–3 Years' ? 'pill-lime' : 'pill-red'}`}>{currentQ.difficulty}</span>
                  </div>
                  <p className="mock-q-text">{currentQ.question}</p>
                  <div className="mock-framework-hint">
                    <span>Framework: </span><strong>{currentQ.framework_type}</strong>
                  </div>
                </div>

                {!result ? (
                  <div className="mock-answer-area">
                    <label className="form-label">Your Answer</label>
                    <textarea
                      className="form-input mock-textarea"
                      placeholder={phase === PHASES.THINKING ? 'Wait for the think phase to end...' : 'Type your answer here...'}
                      value={answer}
                      onChange={e => setAnswer(e.target.value)}
                      disabled={phase === PHASES.THINKING}
                    />
                    <div className="mock-answer-footer">
                      <span className="word-count">{answer.trim().split(/\s+/).filter(Boolean).length} words</span>
                      <div className="mock-footer-btns">
                        <button className="btn-ghost" onClick={reset}><RotateCcw size={15} /> New Question</button>
                        <button className="btn-primary" onClick={submitAnswer} disabled={!answer.trim() || phase === PHASES.THINKING}>
                          <Send size={15} /> Get Feedback
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mock-result card">
                    <div className="result-score">
                      <div className={`score-circle ${result.score >= 8 ? 'good' : result.score >= 5 ? 'ok' : 'poor'}`}>
                        {result.score}<span>/10</span>
                      </div>
                      <div className="result-verdict">
                        {result.score >= 8 ? '🎉 Strong answer' : result.score >= 5 ? '👍 Good effort' : '💪 Keep practicing'}
                      </div>
                    </div>

                    <p className="result-feedback">{result.feedback}</p>

                    {result.found.length > 0 && (
                      <div className="result-section">
                        <div className="result-section-title"><CheckCircle size={14} /> Keywords found</div>
                        <div className="result-chips found">{result.found.map(k => <span key={k}>{k}</span>)}</div>
                      </div>
                    )}
                    {result.missing.length > 0 && (
                      <div className="result-section">
                        <div className="result-section-title"><AlertCircle size={14} /> Could strengthen with</div>
                        <div className="result-chips missing">{result.missing.map(k => <span key={k}>{k}</span>)}</div>
                      </div>
                    )}

                    <div className="result-actions">
                      <Link to={`/track/solutions-engineer/question/${currentQ.id}`} className="btn-secondary">
                        View Full Framework
                      </Link>
                      <button className="btn-primary" onClick={startSession}>
                        <Play size={15} /> Next Question
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
