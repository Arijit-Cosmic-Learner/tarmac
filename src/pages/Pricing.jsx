import { useAuth } from '../context/AuthContext';
import { Check, Zap } from 'lucide-react';
import './Pricing.css';

const FREE_FEATURES = [
  '20 questions (Solutions Engineer track)',
  'Answer frameworks for free questions',
  'Progress tracker + streak',
  '3 concept explainers',
];

const PRO_FEATURES = [
  'All 50 questions + answer frameworks',
  'Strong + weak answer examples for every question',
  'Mock interview simulator',
  'AI-powered feedback (structure, keywords, score)',
  'Company intelligence for 15 companies',
  'Full resource library (8 explainers)',
  'Progress tracker + daily streak',
  'New content added monthly',
];

export default function Pricing() {
  const { user, isPaid, upgradeToPaid } = useAuth();

  const handleUpgrade = () => {
    // In production: open Razorpay. For MVP: simulate upgrade.
    const confirmed = window.confirm('This would open Razorpay payment. For this demo, we\'ll simulate a successful upgrade. Continue?');
    if (confirmed) upgradeToPaid();
  };

  return (
    <div className="pricing-page page-enter">
      <div className="pricing-bg-glow" />
      <div className="page-content">
        <div className="pricing-header">
          <div className="pricing-pill">Honest Pricing</div>
          <h1>Everything you need to <span className="gradient-text">get the offer</span></h1>
          <p className="pricing-sub">
            No dark patterns. No features hidden behind "contact us." Two tiers, clearly explained.
          </p>
        </div>

        <div className="pricing-grid">
          {/* Free */}
          <div className="pricing-card">
            <div className="pricing-card-header">
              <div className="pricing-tier-name">Free</div>
              <div className="pricing-amount-display">
                <span className="pricing-amount-big">₹0</span>
              </div>
              <p className="pricing-card-sub">Try before you commit. No credit card needed.</p>
            </div>
            <div className="features-list">
              {FREE_FEATURES.map(f => (
                <div key={f} className="feature-row">
                  <Check size={15} className="feature-check" />
                  <span>{f}</span>
                </div>
              ))}
              <div className="feature-row locked-feature-row">
                <span className="feature-x">✗</span>
                <span>Mock interview simulator</span>
              </div>
              <div className="feature-row locked-feature-row">
                <span className="feature-x">✗</span>
                <span>Company intelligence</span>
              </div>
              <div className="feature-row locked-feature-row">
                <span className="feature-x">✗</span>
                <span>All 50 questions</span>
              </div>
            </div>
            {user ? (
              <div className="current-plan-badge">
                {isPaid ? 'You\'re on Pro' : '✓ Current Plan'}
              </div>
            ) : (
              <a href="/login?tab=signup" className="btn-secondary pricing-cta">Start Free</a>
            )}
          </div>

          {/* Pro */}
          <div className="pricing-card pro-card">
            <div className="pro-most-popular">Most Popular</div>
            <div className="pricing-card-header">
              <div className="pricing-tier-name pro-tier-name">Pro</div>
              <div className="pricing-amount-display">
                <span className="pricing-amount-big">₹499</span>
                <span className="pricing-per">/month</span>
              </div>
              <div className="pricing-annual-note">
                or ₹3,499/year · <span className="save-highlight">Save ₹2,489 (41%)</span>
              </div>
              <p className="pricing-card-sub">Everything you need. Cancel anytime.</p>
            </div>
            <div className="features-list">
              {PRO_FEATURES.map(f => (
                <div key={f} className="feature-row pro-feature-row">
                  <Check size={15} className="feature-check pro-check" />
                  <span>{f}</span>
                </div>
              ))}
            </div>
            {isPaid ? (
              <div className="current-plan-badge pro">✓ Current Plan — Pro</div>
            ) : (
              <button className="btn-primary pricing-cta pro-cta" onClick={handleUpgrade}>
                <Zap size={16} />
                {user ? 'Upgrade to Pro' : 'Get Pro Access'}
              </button>
            )}
          </div>
        </div>

        {/* FAQ */}
        <div className="pricing-faq">
          <h2>Common questions</h2>
          <div className="faq-grid">
            {[
              { q: 'What does "cancel anytime" mean?', a: 'You can cancel your Pro subscription at any time. You\'ll retain access until the end of your billing period.' },
              { q: 'Is this really built for non-CS grads?', a: 'Yes — 100%. Every question, answer, and resource is written assuming you did not study computer science. The technical concepts are explained in plain language.' },
              { q: 'How often is content updated?', a: 'We add new questions, company profiles, and resources every month. Pro users get access to all new content automatically.' },
              { q: 'Will this help for TAM / Pre-Sales roles too?', a: 'Most of the Solutions Engineer questions directly apply to TAM and Pre-Sales roles. Dedicated tracks for these roles are coming in Q2 2025.' },
              { q: 'Is my data safe?', a: 'For this version, your progress is stored in your browser\'s local storage. We never send your data to third parties.' },
              { q: 'What if I\'m already placed?', a: 'Pass it on. Send Tarmac to a junior from your college who\'s still figuring out how to prepare. Pay it forward.' },
            ].map((item, i) => (
              <div key={i} className="faq-item">
                <h4 className="faq-q">{item.q}</h4>
                <p className="faq-a">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
