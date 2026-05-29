import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { 
  Users, Zap, Shield, Search, Filter, Mail, Download, 
  ChevronRight, ChevronDown, CheckCircle, AlertCircle, 
  ExternalLink, Phone, Briefcase, Calendar, RefreshCw
} from 'lucide-react';
import './Admin.css';

export default function Admin() {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, pro, free
  const [phoneFilter, setPhoneFilter] = useState('all'); // all, has_phone
  const [paymentFilter, setPaymentFilter] = useState('all'); // all, attempted
  
  const [expandedUser, setExpandedUser] = useState(null);
  const [retargetUser, setRetargetUser] = useState(null);
  const [emailTemplate, setEmailTemplate] = useState('discount'); // discount, guide, checkin
  const [emailSentStatus, setEmailSentStatus] = useState(false);

  // Fetch profiles from database
  const fetchAllProfiles = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .order('last_active_date', { ascending: false, nullsFirst: false });

      if (fetchError) throw fetchError;

      // Parse JSON/objects from streak_history and clean up records
      const parsedProfiles = (data || []).map(p => {
        let history = { dates: [], visits: 0, journey: [], payment_attempts: 0 };
        try {
          if (p.streak_history) {
            const raw = typeof p.streak_history === 'string'
              ? JSON.parse(p.streak_history)
              : p.streak_history;
            
            if (Array.isArray(raw)) {
              history.dates = raw;
            } else if (raw && typeof raw === 'object') {
              history = {
                dates: Array.isArray(raw.dates) ? raw.dates : [],
                visits: raw.visits || 0,
                journey: Array.isArray(raw.journey) ? raw.journey : [],
                payment_attempts: raw.payment_attempts || 0,
                phone: raw.phone || '',
                company: raw.company || '',
                role: raw.role || '',
                linkedin: raw.linkedin || '',
                ...raw
              };
            }
          }
        } catch (e) {
          console.error('Failed parsing history for profile', p.id, e);
        }

        return {
          ...p,
          parsedHistory: history,
          // Fallbacks for display
          phone: history.phone || '',
          company: history.company || '',
          role: history.role || '',
          linkedin: history.linkedin || '',
          visits: history.visits || (history.journey?.length ? history.journey.length : 0) || 1,
          payment_attempts: history.payment_attempts || 0,
          journey: history.journey || []
        };
      });

      setProfiles(parsedProfiles);
    } catch (err) {
      console.error('Failed to load admin stats:', err);
      setError('Could not retrieve analytics. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllProfiles();
  }, []);

  // Filtered Users List
  const filteredProfiles = profiles.filter(p => {
    const nameMatch = (p.full_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const phoneMatch = (p.phone || '').includes(searchTerm);
    const companyMatch = (p.company || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSearch = nameMatch || phoneMatch || companyMatch;
    
    const matchesStatus = 
      statusFilter === 'all' || 
      (statusFilter === 'pro' && p.is_paid) || 
      (statusFilter === 'free' && !p.is_paid);
      
    const matchesPhone = 
      phoneFilter === 'all' || 
      (phoneFilter === 'has_phone' && p.phone.trim() !== '');

    const matchesPayment = 
      paymentFilter === 'all' || 
      (paymentFilter === 'attempted' && p.payment_attempts > 0);

    return matchesSearch && matchesStatus && matchesPhone && matchesPayment;
  });

  // Calculate Metrics
  const totalUsers = profiles.length;
  const proUsersCount = profiles.filter(p => p.is_paid).length;
  const freeUsersCount = totalUsers - proUsersCount;
  const conversionRate = totalUsers > 0 ? ((proUsersCount / totalUsers) * 100).toFixed(1) : 0;
  
  const totalVisits = profiles.reduce((sum, p) => sum + (p.visits || 0), 0);
  const totalPaymentAttempts = profiles.reduce((sum, p) => sum + (p.payment_attempts || 0), 0);

  // Retargeting Email Content Simulation
  const getEmailContent = () => {
    if (!retargetUser) return { subject: '', body: '' };
    const firstName = (retargetUser.full_name || 'Candidate').split(' ')[0];
    
    switch (emailTemplate) {
      case 'discount':
        return {
          subject: `🔥 ${firstName}, unlock full Tarmac Pro access (25% off code)`,
          body: `Hi ${firstName},\n\nWe noticed you explored our Pro features and started prepare sessions on Tarmac.\n\nTo help you ace your upcoming Solutions Engineer interviews, use code TARMAC25 at checkout to unlock Tarmac Pro for just ₹374 (normally ₹499).\n\nUnlock all 50 questions, AI-powered simulator evaluation, and company cheat-sheets: ${window.location.origin}/pricing\n\nBest,\nTarmac Recruiting Team`
        };
      case 'guide':
        return {
          subject: `💡 How non-CS grads land ₹15LPA+ Solutions Engineer roles`,
          body: `Hi ${firstName},\n\nWe saw you practiced some concepts on Tarmac! Since we don't assume a Computer Science degree, we put together a list of the 3 most crucial topics you need to master:\n\n1. System Integrations (APIs, Webhooks, REST vs SOAP)\n2. Querying Databases (practical SQL joins and indexes)\n3. Designing high-availability architectures\n\nContinue practicing the mock simulator and get instant AI scoring: ${window.location.origin}/mock\n\nBest,\nSolutions Engineer Coach`
        };
      case 'checkin':
        return {
          subject: `👋 Quick check-in from the Tarmac team`,
          body: `Hi ${firstName},\n\nHope your prep is going great! We noticed you entered your phone details (${retargetUser.phone}) to edit your account settings but haven't taken a mock trial yet.\n\nWould you like a free 15-minute onboarding review of your system design strategy? Reply to this email and let us know your availability.\n\nGood luck with your prep!\nRegards,\nTarmac Team`
        };
      default:
        return { subject: '', body: '' };
    }
  };

  const handleSendEmail = (e) => {
    e.preventDefault();
    setEmailSentStatus(true);
    setTimeout(() => {
      setEmailSentStatus(false);
      setRetargetUser(null);
    }, 2500);
  };

  // CSV Lead Export
  const exportToCSV = () => {
    const headers = ['Full Name', 'Paid Status', 'Visits', 'Payment Attempts', 'Phone', 'Company', 'Role', 'LinkedIn', 'Last Active'];
    const rows = filteredProfiles.map(p => [
      p.full_name || 'Anonymous User',
      p.is_paid ? 'Pro' : 'Free',
      p.visits,
      p.payment_attempts,
      p.phone || 'N/A',
      p.company || 'N/A',
      p.role || 'N/A',
      p.linkedin || 'N/A',
      p.last_active_date || 'N/A'
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(r => r.map(val => `"${val.replace(/"/g, '""')}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `tarmac_retargeting_leads_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="admin-page">
      <div className="admin-container">
        
        {/* Header */}
        <div className="admin-header">
          <div className="header-badge">
            <Shield size={14} />
            <span>Admin Console</span>
          </div>
          <h1>System Analytics & Leads</h1>
          <p>Analyze candidate explorations, retrieve documented leads, and launch retargeting communications.</p>
        </div>

        {/* Sync Button */}
        <div className="admin-actions-row">
          <button className="btn-sync" onClick={fetchAllProfiles} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
            Refresh Analytics
          </button>
          <button className="btn-export" onClick={exportToCSV} disabled={filteredProfiles.length === 0}>
            <Download size={16} />
            Export Leads CSV ({filteredProfiles.length})
          </button>
        </div>

        {error && (
          <div className="admin-error">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        {/* Stats Summary Grid */}
        <div className="admin-stats-grid">
          <div className="stat-card">
            <div className="stat-icon-wrapper blue">
              <Users size={20} />
            </div>
            <div className="stat-info">
              <span className="stat-label">Total Registered</span>
              <span className="stat-value">{totalUsers}</span>
              <span className="stat-sub">{freeUsersCount} Free Candidates</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-wrapper orange">
              <Zap size={20} />
            </div>
            <div className="stat-info">
              <span className="stat-label">Pro Upgrades</span>
              <span className="stat-value">{proUsersCount}</span>
              <span className="stat-sub">Conversion Rate: {conversionRate}%</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-wrapper purple">
              <Briefcase size={20} />
            </div>
            <div className="stat-info">
              <span className="stat-label">Exploration Visits</span>
              <span className="stat-value">{totalVisits}</span>
              <span className="stat-sub">Across all registered user sessions</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-wrapper warning">
              <Zap size={20} />
            </div>
            <div className="stat-info">
              <span className="stat-label">Payment Attempts</span>
              <span className="stat-value">{totalPaymentAttempts}</span>
              <span className="stat-sub">Clicks on Checkout Flow</span>
            </div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="admin-filters-card">
          <div className="search-box">
            <Search size={18} className="search-icon" />
            <input 
              type="text" 
              placeholder="Search by candidate name, phone, current company..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="filters-row">
            <div className="filter-group">
              <label>
                <Filter size={12} />
                <span>Tier:</span>
              </label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="all">All Tiers</option>
                <option value="pro">Pro Only</option>
                <option value="free">Free Only</option>
              </select>
            </div>

            <div className="filter-group">
              <label>
                <Phone size={12} />
                <span>Phone:</span>
              </label>
              <select value={phoneFilter} onChange={(e) => setPhoneFilter(e.target.value)}>
                <option value="all">All Users</option>
                <option value="has_phone">Documented Phone Only</option>
              </select>
            </div>

            <div className="filter-group">
              <label>
                <Zap size={12} />
                <span>Intent:</span>
              </label>
              <select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)}>
                <option value="all">All Intent</option>
                <option value="attempted">Attempted Payment</option>
              </select>
            </div>
          </div>
        </div>

        {/* Lead/Candidate Grid List */}
        <div className="admin-leads-wrapper">
          {loading ? (
            <div className="leads-loading">
              <RefreshCw size={24} className="spin" />
              <span>Loading registered candidate list...</span>
            </div>
          ) : filteredProfiles.length === 0 ? (
            <div className="leads-empty">
              <AlertCircle size={32} />
              <p>No candidates found matching the active search or filters.</p>
            </div>
          ) : (
            <div className="leads-list">
              {filteredProfiles.map((p) => {
                const isExpanded = expandedUser === p.id;
                const hasDetails = p.phone || p.company || p.role;
                
                return (
                  <div key={p.id} className={`lead-row-card ${isExpanded ? 'expanded' : ''} ${p.is_paid ? 'pro' : ''}`}>
                    <div className="lead-row-main" onClick={() => setExpandedUser(isExpanded ? null : p.id)}>
                      <div className="lead-identity">
                        <div className="avatar-circle">
                          {(p.full_name || 'U')[0].toUpperCase()}
                        </div>
                        <div className="identity-text">
                          <div className="name-wrapper">
                            <span className="candidate-name">{p.full_name || 'Anonymous User'}</span>
                            <span className={`badge-status ${p.is_paid ? 'pro' : 'free'}`}>
                              {p.is_paid ? 'Pro Access' : 'Free Trial'}
                            </span>
                          </div>
                          <span className="candidate-id-sub">{p.id}</span>
                        </div>
                      </div>

                      <div className="lead-highlights">
                        {p.phone && (
                          <div className="highlight-pill">
                            <Phone size={12} />
                            <span>{p.phone}</span>
                          </div>
                        )}
                        {p.company && (
                          <div className="highlight-pill">
                            <Briefcase size={12} />
                            <span>{p.company}</span>
                          </div>
                        )}
                        <div className="highlight-pill visits">
                          <span>{p.visits} pageviews</span>
                        </div>
                        {p.payment_attempts > 0 && (
                          <div className="highlight-pill attempts warning">
                            <span>{p.payment_attempts} checkouts</span>
                          </div>
                        )}
                      </div>

                      <div className="lead-expand-arrow">
                        {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="lead-details-pane">
                        <div className="details-grid">
                          <div className="details-col">
                            <h4>Candidate Information</h4>
                            <div className="detail-item">
                              <label>Display Name:</label>
                              <span>{p.full_name || 'Not provided'}</span>
                            </div>
                            <div className="detail-item">
                              <label>Phone Contact:</label>
                              <span>{p.phone || 'N/A'}</span>
                            </div>
                            <div className="detail-item">
                              <label>Current Role:</label>
                              <span>{p.role || 'N/A'}</span>
                            </div>
                            <div className="detail-item">
                              <label>Current Company:</label>
                              <span>{p.company || 'N/A'}</span>
                            </div>
                            <div className="detail-item">
                              <label>LinkedIn Link:</label>
                              {p.linkedin ? (
                                <a href={p.linkedin} target="_blank" rel="noopener noreferrer" className="linkedin-link">
                                  <span>View Profile</span>
                                  <ExternalLink size={12} />
                                </a>
                              ) : (
                                <span>N/A</span>
                              )}
                            </div>
                            <div className="detail-item">
                              <label>Last Active Date:</label>
                              <span>{p.last_active_date || 'N/A'}</span>
                            </div>
                          </div>

                          <div className="details-col journey-col">
                            <h4>Exploration Journey Timeline</h4>
                            {p.journey.length === 0 ? (
                              <p className="no-events">No journey logs captured for this user yet.</p>
                            ) : (
                              <div className="timeline-events">
                                {p.journey.map((e, index) => (
                                  <div key={index} className="timeline-item">
                                    <div className="timeline-badge" />
                                    <div className="timeline-event-info">
                                      <span className="event-type">
                                        {e.type === 'page_view' ? `Viewed page: ${e.path}` : `Event: ${e.name}`}
                                      </span>
                                      <span className="event-time">
                                        {new Date(e.time).toLocaleString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Actions block inside expanded details */}
                        <div className="lead-details-actions">
                          {!p.is_paid && (
                            <button className="btn-retarget" onClick={() => setRetargetUser(p)}>
                              <Mail size={14} />
                              Retarget Candidate
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Retargeting Campaign Modal Overlay */}
        {retargetUser && (
          <div className="retarget-modal-overlay">
            <div className="retarget-modal">
              <div className="modal-header">
                <h3>Launch Retargeting Campaign</h3>
                <button className="btn-close-modal" onClick={() => setRetargetUser(null)}>×</button>
              </div>

              <form onSubmit={handleSendEmail}>
                <div className="recipient-info">
                  <span className="recipient-label">Recipient:</span>
                  <span className="recipient-value">{retargetUser.full_name || 'Candidate'}</span>
                  {retargetUser.phone && <span className="recipient-phone">({retargetUser.phone})</span>}
                </div>

                <div className="form-group-admin">
                  <label>Select Retargeting Template:</label>
                  <div className="template-selectors">
                    <button 
                      type="button" 
                      className={`template-tab ${emailTemplate === 'discount' ? 'active' : ''}`}
                      onClick={() => setEmailTemplate('discount')}
                    >
                      ⚡ 25% Pro Discount
                    </button>
                    <button 
                      type="button" 
                      className={`template-tab ${emailTemplate === 'guide' ? 'active' : ''}`}
                      onClick={() => setEmailTemplate('guide')}
                    >
                      💡 Coaching Guide
                    </button>
                    <button 
                      type="button" 
                      className={`template-tab ${emailTemplate === 'checkin' ? 'active' : ''}`}
                      onClick={() => setEmailTemplate('checkin')}
                    >
                      👋 Onboarding Checkin
                    </button>
                  </div>
                </div>

                <div className="form-group-admin">
                  <label>Email Subject Preview:</label>
                  <input type="text" readOnly value={getEmailContent().subject} className="preview-subject-input" />
                </div>

                <div className="form-group-admin">
                  <label>Email Body Preview:</label>
                  <textarea readOnly value={getEmailContent().body} className="preview-body-textarea" rows={10} />
                </div>

                {emailSentStatus ? (
                  <div className="sent-success-alert">
                    <CheckCircle size={16} />
                    <span>Email sent successfully in test simulation!</span>
                  </div>
                ) : (
                  <div className="modal-actions">
                    <button type="button" className="btn-secondary" onClick={() => setRetargetUser(null)}>Cancel</button>
                    <button type="submit" className="btn-primary">
                      <Mail size={16} />
                      Send Retargeting Email
                    </button>
                  </div>
                )}
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
