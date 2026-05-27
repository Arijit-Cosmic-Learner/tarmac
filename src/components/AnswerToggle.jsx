import { useState } from 'react';
import { ChevronDown, ThumbsUp, ThumbsDown } from 'lucide-react';
import './AnswerToggle.css';

export default function AnswerToggle({ question }) {
  const [showing, setShowing] = useState(null); // 'strong' | 'weak' | null

  const toggle = (type) => setShowing(s => s === type ? null : type);

  return (
    <div className="answer-toggle">
      <div className="answer-btns">
        <button
          className={`answer-tab strong ${showing === 'strong' ? 'open' : ''}`}
          onClick={() => toggle('strong')}
        >
          <ThumbsUp size={15} />
          <span>Strong Answer</span>
          <ChevronDown size={15} className={`chevron ${showing === 'strong' ? 'rotated' : ''}`} />
        </button>
        <button
          className={`answer-tab weak ${showing === 'weak' ? 'open' : ''}`}
          onClick={() => toggle('weak')}
        >
          <ThumbsDown size={15} />
          <span>Weak Answer</span>
          <ChevronDown size={15} className={`chevron ${showing === 'weak' ? 'rotated' : ''}`} />
        </button>
      </div>

      {showing === 'strong' && (
        <div className="answer-panel strong-panel">
          <div className="answer-label">
            <ThumbsUp size={14} />
            <span>What a strong answer looks like</span>
          </div>
          <blockquote className="answer-text">{question.strong_answer}</blockquote>
          {question.strong_answer_analysis && (
            <div className="answer-analysis strong-analysis">
              <span className="analysis-label">Why this works:</span>
              <span>{question.strong_answer_analysis}</span>
            </div>
          )}
          {question.keywords && (
            <div className="answer-keywords">
              <span className="keywords-label">Keywords used:</span>
              <div className="keywords-list">
                {question.keywords.map(kw => (
                  <span key={kw} className="keyword-chip">{kw}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {showing === 'weak' && (
        <div className="answer-panel weak-panel">
          <div className="answer-label">
            <ThumbsDown size={14} />
            <span>What a weak answer sounds like</span>
          </div>
          <blockquote className="answer-text weak-text">{question.weak_answer}</blockquote>
          {question.weak_answer_analysis && (
            <div className="answer-analysis weak-analysis">
              <span className="analysis-label">Why this fails:</span>
              <span>{question.weak_answer_analysis}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
