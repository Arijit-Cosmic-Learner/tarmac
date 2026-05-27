import './FrameworkCard.css';

const FRAMEWORK_DESCRIPTIONS = {
  STAR: 'Situation → Task → Action → Result — the gold standard for behavioral questions.',
  SPAC: 'Situation → Problem → Action → Client Impact — built for customer-facing scenarios.',
  NEAT: 'Name → Example → Alternative → Trade-off — for explaining technical concepts clearly.',
  '3-Step Explain': 'Analogy → Context → Value — explain any technical concept in under 90 seconds.',
  'Situation-First': 'Hook → Bridge → Fit → Vision — for "tell me about yourself" style questions.',
};

export default function FrameworkCard({ framework, frameworkType }) {
  if (!framework) return null;

  return (
    <div className="framework-card">
      <div className="framework-header">
        <div className="framework-type-badge">{frameworkType || framework.label}</div>
        {FRAMEWORK_DESCRIPTIONS[frameworkType] && (
          <p className="framework-desc">{FRAMEWORK_DESCRIPTIONS[frameworkType]}</p>
        )}
      </div>

      <div className="framework-steps">
        {framework.steps?.map((step, i) => (
          <div key={i} className="framework-step">
            <div className="step-number">{i + 1}</div>
            <div className="step-content">
              <h4 className="step-title">{step.title}</h4>
              <p className="step-desc">{step.description}</p>
            </div>
          </div>
        ))}
      </div>

      {framework.tip && (
        <div className="framework-tip">
          <span className="tip-label">💡 Pro Tip</span>
          <p className="tip-text">{framework.tip}</p>
        </div>
      )}
    </div>
  );
}
