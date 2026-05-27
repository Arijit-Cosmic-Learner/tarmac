import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { resources } from '../data/resources';
import PaywallBanner from '../components/PaywallBanner';
import { ChevronDown, ChevronUp, Clock, Lock } from 'lucide-react';
import './Resources.css';

function ResourceCard({ resource, locked }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className={`resource-card ${locked ? 'res-locked' : ''} ${expanded ? 'res-expanded' : ''}`}>
      <button className="resource-header" onClick={() => !locked && setExpanded(e => !e)}>
        <div className="res-icon">{resource.icon}</div>
        <div className="res-header-info">
          <div className="res-title">{resource.title}</div>
          <div className="res-meta">
            <span className="res-time"><Clock size={12} />{resource.read_time}</span>
            {locked && <span className="res-pro-badge">Pro</span>}
          </div>
        </div>
        <div className="res-expand">
          {locked ? <Lock size={16} /> : expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </button>

      {!locked && (
        <div className="res-why">{resource.why_you_need_this}</div>
      )}

      {!locked && expanded && (
        <div className="res-content">
          <div className="res-divider" />
          {resource.sections.map((s, i) => (
            <div key={i} className="res-section">
              <h4 className="res-section-heading">{s.heading}</h4>
              <p className="res-section-content">{s.content}</p>
            </div>
          ))}
          <div className="res-takeaway">
            <span className="takeaway-label">🔑 Key Takeaway</span>
            <p>{resource.key_takeaway}</p>
          </div>
        </div>
      )}

      {locked && (
        <div className="res-locked-why">{resource.why_you_need_this}</div>
      )}
    </div>
  );
}

export default function Resources() {
  const { isPaid } = useAuth();
  const FREE_COUNT = 3;

  const freeResources = resources.slice(0, FREE_COUNT);
  const lockedResources = resources.slice(FREE_COUNT);

  return (
    <div className="resources-page page-enter">
      <div className="page-content">
        <div className="resources-header">
          <div>
            <h1>Resource <span className="gradient-text">Library</span></h1>
            <p className="resources-sub">
              Everything a non-CS grad needs to know for a technical customer-facing role — 
              explained in plain English, in under 5 minutes each.
            </p>
          </div>
          <div className="resources-count-badge">{resources.length} explainers</div>
        </div>

        <div className="resources-list">
          {freeResources.map(r => (
            <ResourceCard key={r.id} resource={r} locked={false} />
          ))}
        </div>

        {!isPaid && (
          <div className="resources-paywall-section">
            <PaywallBanner context="resources" />
            <div className="resources-list locked-resources">
              {lockedResources.map(r => (
                <ResourceCard key={r.id} resource={r} locked={true} />
              ))}
            </div>
          </div>
        )}

        {isPaid && (
          <div className="resources-list">
            {lockedResources.map(r => (
              <ResourceCard key={r.id} resource={r} locked={false} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
