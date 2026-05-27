import { Link } from 'react-router-dom';
import { Lock, Zap } from 'lucide-react';
import './PaywallBanner.css';

export default function PaywallBanner({ context = 'questions' }) {
  const messages = {
    questions: {
      title: 'You\'ve seen the free 20 questions.',
      sub: '30 more questions — including company-specific deep dives — are waiting for you.',
    },
    mock: {
      title: 'Mock Interview is a Pro feature.',
      sub: 'Practice with timed sessions and get AI feedback on your answers.',
    },
    companies: {
      title: 'Company Intelligence is a Pro feature.',
      sub: 'Get insider hiring process, commonly asked questions, and tips for 15 top companies.',
    },
    resources: {
      title: '5 more concept explainers in the library.',
      sub: 'Master payment flows, SQL, OAuth, integrations, and SLAs — all in under 5 minutes each.',
    },
  };
  const msg = messages[context] || messages.questions;

  return (
    <div className="paywall-banner">
      <div className="paywall-lock-icon">
        <Lock size={28} />
      </div>
      <div className="paywall-content">
        <h3 className="paywall-title">{msg.title}</h3>
        <p className="paywall-sub">{msg.sub}</p>
        <div className="paywall-features">
          <span>✓ All 50 questions</span>
          <span>✓ Mock interview simulator</span>
          <span>✓ Company intelligence</span>
          <span>✓ AI feedback</span>
        </div>
      </div>
      <div className="paywall-cta">
        <Link to="/pricing" className="btn-paywall-upgrade">
          <Zap size={16} />
          Upgrade to Pro — ₹499/mo
        </Link>
        <p className="paywall-cta-sub">₹3,499/year · Cancel anytime</p>
      </div>
    </div>
  );
}
