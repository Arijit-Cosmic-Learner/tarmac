import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { companies } from '../data/companies';
import PaywallBanner from '../components/PaywallBanner';
import { ChevronDown, ChevronUp, MapPin, Users, Briefcase, Lock } from 'lucide-react';
import './Companies.css';

function CompanyCard({ company }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className={`company-card ${expanded ? 'expanded' : ''}`}>
      <button className="company-card-header" onClick={() => setExpanded(e => !e)}>
        <div className="company-logo" style={{ background: company.color + '22', border: `1px solid ${company.color}44` }}>
          <span>{company.logo}</span>
        </div>
        <div className="company-info">
          <div className="company-name">{company.name}</div>
          <div className="company-meta">
            <span><MapPin size={12} /> {company.hq}</span>
            <span><Users size={12} /> {company.size}</span>
            <span className="company-stage">{company.stage}</span>
          </div>
          <div className="company-roles">
            {company.roles.slice(0, 2).map(r => <span key={r} className="role-tag">{r}</span>)}
            {company.roles.length > 2 && <span className="role-tag">+{company.roles.length - 2}</span>}
          </div>
        </div>
        <div className="company-expand-icon">
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </button>

      {expanded && (
        <div className="company-details">
          <p className="company-tagline">{company.tagline}</p>
          <div className="details-grid">
            {/* Hiring Process */}
            <div className="details-section">
              <h4 className="details-title">Hiring Process</h4>
              <div className="hiring-steps">
                {company.hiring_process.map(step => (
                  <div key={step.step} className="hiring-step">
                    <div className="step-num">{step.step}</div>
                    <div className="step-body">
                      <div className="step-title-text">{step.title}</div>
                      <div className="step-detail">{step.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Commonly Asked */}
            <div className="details-section">
              <h4 className="details-title">Commonly Asked Questions</h4>
              <ul className="asked-list">
                {company.commonly_asked.map((q, i) => <li key={i}>{q}</li>)}
              </ul>

              {/* What They Value */}
              <h4 className="details-title" style={{ marginTop: '1.25rem' }}>What They Value</h4>
              <ul className="values-list">
                {company.what_they_value.map((v, i) => (
                  <li key={i}><span className="value-check">✓</span>{v}</li>
                ))}
              </ul>

              {/* Insider Tips */}
              <h4 className="details-title" style={{ marginTop: '1.25rem' }}>Insider Tips</h4>
              <div className="tips-list">
                {company.insider_tips.map((tip, i) => (
                  <div key={i} className="tip-item">
                    <span className="tip-num">{i + 1}</span>
                    <p>{tip}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Companies() {
  const { isPaid } = useAuth();

  if (!isPaid) {
    return (
      <div className="page-content">
        <div className="companies-header">
          <h1>Company <span className="gradient-text">Intelligence</span></h1>
          <p>Hiring processes, commonly asked questions, and insider tips for 15 top companies.</p>
        </div>
        <PaywallBanner context="companies" />
        <div className="companies-preview">
          {companies.slice(0, 3).map(c => (
            <div key={c.id} className="company-preview-card">
              <span className="preview-logo">{c.logo}</span>
              <span className="preview-name">{c.name}</span>
              <Lock size={14} className="preview-lock" />
            </div>
          ))}
          <div className="more-count">+ {companies.length - 3} more companies</div>
        </div>
      </div>
    );
  }

  return (
    <div className="companies-page page-enter">
      <div className="page-content">
        <div className="companies-header">
          <div>
            <h1>Company <span className="gradient-text">Intelligence</span></h1>
            <p className="companies-sub">Expand any card to see the full hiring process, commonly asked questions, what they value, and insider tips.</p>
          </div>
          <div className="company-count-badge">{companies.length} companies</div>
        </div>

        <div className="companies-list">
          {companies.map(c => <CompanyCard key={c.id} company={c} />)}
        </div>
      </div>
    </div>
  );
}
