import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { 
  Users, Zap, Shield, Search, Filter, Mail, Download, 
  ChevronRight, ChevronDown, CheckCircle, AlertCircle, 
  ExternalLink, Phone, Briefcase, RefreshCw, BarChart2,
  CreditCard, Activity, Settings, Link as LinkIcon, Clock, X
} from 'lucide-react';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, 
  CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import './Admin.css';

export default function Admin() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('analytics');
  
  // Data States
  const [profiles, setProfiles] = useState([]);
  const [payments, setPayments] = useState([]);
  const [webhooks, setWebhooks] = useState([]);
  
  // Loading & Error States
  const [loading, setLoading] = useState(true);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [loadingWebhooks, setLoadingWebhooks] = useState(false);
  const [error, setError] = useState(null);

  // Filters & UI States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedUser, setExpandedUser] = useState(null);
  
  // Custom Link Modal State
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [linkForm, setLinkForm] = useState({ amount: 499, description: 'Tarmac Pro - Premium Upgrade', notes: '' });
  const [generatingLink, setGeneratingLink] = useState(false);
  const [generatedLink, setGeneratedLink] = useState(null); // Stores object: { userId, url }

  // Fetch Core Data (Profiles)
  const fetchProfiles = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .order('last_active_date', { ascending: false, nullsFirst: false });

      if (fetchError) throw fetchError;

      const parsedProfiles = (data || []).map(p => {
        let history = { dates: [], visits: 0, journey: [], payment_attempts: 0 };
        try {
          if (p.streak_history) {
            const raw = typeof p.streak_history === 'string'
              ? JSON.parse(p.streak_history)
              : p.streak_history;
            
            if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
              history = { ...history, ...raw };
            }
          }
        } catch (e) {
          console.error('Failed parsing history for profile', p.id, e);
        }

        return {
          ...p,
          phone: String(history.phone || ''),
          company: String(history.company || ''),
          role: String(history.role || ''),
          visits: history.visits || 1,
          payment_attempts: history.payment_attempts || 0,
          journey: Array.isArray(history.journey) ? history.journey : []
        };
      });

      setProfiles(parsedProfiles);
    } catch (err) {
      console.error('Failed to load admin stats:', err);
      setError('Could not retrieve candidate analytics.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch Payments from Razorpay API
  const fetchPayments = async () => {
    setLoadingPayments(true);
    try {
      const res = await fetch('/api/razorpay-fetch-payments');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPayments(data.items || []);
    } catch (err) {
      console.error('Failed to fetch payments:', err);
    } finally {
      setLoadingPayments(false);
    }
  };

  // Fetch Webhooks from Supabase
  const fetchWebhooks = async () => {
    setLoadingWebhooks(true);
    try {
      const { data, error } = await supabase
        .from('webhook_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      setWebhooks(data || []);
    } catch (err) {
      console.error('Failed to fetch webhooks:', err);
    } finally {
      setLoadingWebhooks(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  useEffect(() => {
    if (activeTab === 'payments' && payments.length === 0) fetchPayments();
    if (activeTab === 'webhooks' && webhooks.length === 0) fetchWebhooks();
  }, [activeTab]);

  // Open Modal for link generation
  const openLinkModal = (candidate, defaultAmount = 499) => {
    setSelectedCandidate(candidate);
    setLinkForm({ amount: defaultAmount, description: 'Tarmac Pro - Premium Upgrade', notes: '' });
    setShowLinkModal(true);
    setGeneratedLink(null);
  };

  // Submit custom link payload to Razorpay
  const submitCustomLink = async (e) => {
    e.preventDefault();
    if (!selectedCandidate) return;
    
    setGeneratingLink(true);
    try {
      let notesObj = {};
      if (linkForm.notes) {
        try {
          notesObj = JSON.parse(linkForm.notes);
        } catch {
          notesObj = { note: linkForm.notes };
        }
      }

      const res = await fetch('/api/razorpay-create-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedCandidate.id,
          name: selectedCandidate.full_name,
          email: selectedCandidate.email || '',
          phone: selectedCandidate.phone,
          amount: Math.round(Number(linkForm.amount) * 100), // convert to paise
          description: linkForm.description,
          notes: notesObj
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setGeneratedLink({ userId: selectedCandidate.id, url: data.short_url });
    } catch (err) {
      alert('Failed to generate link: ' + err.message);
    } finally {
      setGeneratingLink(false);
    }
  };

  // Metrics for Analytics Tab
  const totalUsers = profiles.length;
  const proUsersCount = profiles.filter(p => p.is_paid).length;
  const totalVisits = profiles.reduce((sum, p) => sum + (p.visits || 0), 0);
  const totalPaymentAttempts = profiles.reduce((sum, p) => sum + (p.payment_attempts || 0), 0);

  // Generate mock chart data based on real profiles
  const chartData = [
    { name: 'Mon', visits: totalVisits > 0 ? Math.floor(totalVisits * 0.1) : 0, signups: 0 },
    { name: 'Tue', visits: totalVisits > 0 ? Math.floor(totalVisits * 0.15) : 0, signups: 1 },
    { name: 'Wed', visits: totalVisits > 0 ? Math.floor(totalVisits * 0.2) : 0, signups: 0 },
    { name: 'Thu', visits: totalVisits > 0 ? Math.floor(totalVisits * 0.25) : 0, signups: 2 },
    { name: 'Fri', visits: totalVisits > 0 ? Math.floor(totalVisits * 0.1) : 0, signups: 0 },
    { name: 'Sat', visits: totalVisits > 0 ? Math.floor(totalVisits * 0.05) : 0, signups: 0 },
    { name: 'Sun', visits: totalVisits > 0 ? Math.floor(totalVisits * 0.15) : 0, signups: totalUsers > 3 ? totalUsers - 3 : totalUsers },
  ];

  const filteredProfiles = profiles.filter(p => {
    const searchMatch = (p.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                        (p.phone || '').includes(searchTerm);
    const statusMatch = statusFilter === 'all' || 
                        (statusFilter === 'pro' && p.is_paid) || 
                        (statusFilter === 'free' && !p.is_paid);
    return searchMatch && statusMatch;
  });

  const renderSidebar = () => (
    <div className="admin-sidebar">
      <div className="sidebar-header">
        <Shield size={20} className="sidebar-icon" />
        <h2>Admin Console</h2>
      </div>
      <nav className="sidebar-nav">
        <button className={`nav-btn ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => setActiveTab('analytics')}>
          <BarChart2 size={18} /> Analytics Overview
        </button>
        <button className={`nav-btn ${activeTab === 'candidates' ? 'active' : ''}`} onClick={() => setActiveTab('candidates')}>
          <Users size={18} /> Candidate Details
        </button>
        <button className={`nav-btn ${activeTab === 'payments' ? 'active' : ''}`} onClick={() => setActiveTab('payments')}>
          <CreditCard size={18} /> Payment Links
        </button>
        <button className={`nav-btn ${activeTab === 'retargeting' ? 'active' : ''}`} onClick={() => setActiveTab('retargeting')}>
          <Mail size={18} /> Retargeting
        </button>
        <button className={`nav-btn ${activeTab === 'webhooks' ? 'active' : ''}`} onClick={() => setActiveTab('webhooks')}>
          <Activity size={18} /> Webhook Logs
        </button>
        <button className={`nav-btn ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
          <Settings size={18} /> System Settings
        </button>
      </nav>
    </div>
  );

  const renderAnalytics = () => (
    <div className="tab-content">
      <div className="tab-header">
        <div>
          <h2>Analytics Overview</h2>
          <p>High-level metrics and exploration trends.</p>
        </div>
        <button className="btn-sync" onClick={fetchProfiles}>
          <RefreshCw size={16} className={loading ? 'spin' : ''} /> Refresh
        </button>
      </div>

      <div className="admin-stats-grid">
        <div className="stat-card">
          <div className="stat-icon-wrapper blue"><Users size={20} /></div>
          <div className="stat-info">
            <span className="stat-label">Total Registered</span>
            <span className="stat-value">{totalUsers}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-wrapper orange"><Zap size={20} /></div>
          <div className="stat-info">
            <span className="stat-label">Pro Upgrades</span>
            <span className="stat-value">{proUsersCount}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-wrapper purple"><Briefcase size={20} /></div>
          <div className="stat-info">
            <span className="stat-label">Exploration Visits</span>
            <span className="stat-value">{totalVisits}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-wrapper warning"><CreditCard size={20} /></div>
          <div className="stat-info">
            <span className="stat-label">Payment Attempts</span>
            <span className="stat-value">{totalPaymentAttempts}</span>
          </div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-container">
          <h3>Weekly Platform Visits</h3>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                <XAxis dataKey="name" stroke="#888" />
                <YAxis stroke="#888" />
                <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', borderColor: '#333' }} />
                <Legend />
                <Line type="monotone" dataKey="visits" name="Page Views" stroke="#a78bfa" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="chart-container">
          <h3>New Registrations</h3>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                <XAxis dataKey="name" stroke="#888" />
                <YAxis stroke="#888" allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', borderColor: '#333' }} />
                <Bar dataKey="signups" name="New Candidates" fill="#ff5c00" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCandidates = () => (
    <div className="tab-content">
      <div className="tab-header">
        <div>
          <h2>Candidate Details</h2>
          <p>Search and inspect registered users.</p>
        </div>
      </div>

      <div className="admin-filters-card">
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input 
            type="text" 
            placeholder="Search by name, phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filters-row">
          <div className="filter-group">
            <label><Filter size={12} /> Tier:</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All</option>
              <option value="pro">Pro</option>
              <option value="free">Free</option>
            </select>
          </div>
        </div>
      </div>

      <div className="data-list">
        {filteredProfiles.map((p) => {
          const isExpanded = expandedUser === p.id;
          return (
            <div key={p.id} className={`lead-row-card ${isExpanded ? 'expanded' : ''} ${p.is_paid ? 'pro' : ''}`}>
              <div className="lead-row-main" onClick={() => setExpandedUser(isExpanded ? null : p.id)}>
                <div className="lead-identity">
                  <div className="avatar-circle">{(p.full_name || 'U')[0].toUpperCase()}</div>
                  <div className="identity-text">
                    <span className="candidate-name">{p.full_name || 'Anonymous User'}</span>
                    <span className="candidate-id-sub">{p.id}</span>
                  </div>
                </div>
                <div className="lead-highlights">
                  {p.is_paid ? <span className="badge-status pro">Pro</span> : <span className="badge-status free">Free</span>}
                  {p.phone && <span className="highlight-pill"><Phone size={12} /> {p.phone}</span>}
                  <span className="highlight-pill visits">{p.visits} views</span>
                </div>
                <ChevronDown size={18} className={`expand-icon ${isExpanded ? 'rotated' : ''}`} />
              </div>
              
              {isExpanded && (
                <div className="lead-details-pane">
                  <div className="details-grid">
                    <div className="details-col">
                      <h4>Contact & Profile</h4>
                      <div className="detail-item"><label>Email:</label> <span>{p.email || 'N/A'}</span></div>
                      <div className="detail-item"><label>Company:</label> <span>{p.company || 'N/A'}</span></div>
                      <div className="detail-item"><label>Role:</label> <span>{p.role || 'N/A'}</span></div>
                      <div className="detail-item"><label>Last Active:</label> <span>{p.last_active_date || 'N/A'}</span></div>
                      {p.linkedin && (
                        <div className="detail-item">
                          <label>LinkedIn:</label> 
                          <a href={p.linkedin} target="_blank" rel="noreferrer" className="linkedin-link">View Profile <ExternalLink size={12} /></a>
                        </div>
                      )}
                    </div>
                    <div className="details-col journey-col">
                      <h4>Recent Activity</h4>
                      {p.journey.length === 0 ? <p className="no-events">No logs.</p> : (
                        <div className="timeline-events">
                          {p.journey.slice(-5).map((e, idx) => (
                            <div key={idx} className="timeline-item">
                              <div className="timeline-badge" />
                              <div className="timeline-event-info">
                                <span className="event-type">{e.type === 'page_view' ? `Viewed: ${e.path}` : e.name}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderPayments = () => {
    const droppedCandidates = profiles.filter(p => p.payment_attempts > 0 && !p.is_paid);
    const otherFreeCandidates = profiles.filter(p => p.payment_attempts === 0 && !p.is_paid);

    const renderCandidateRow = (c) => (
      <div key={c.id} className="recovery-card">
        <div className="recovery-info">
          <strong>{c.full_name || 'Anonymous'}</strong>
          <span>{c.payment_attempts} attempts • Last active: {c.last_active_date}</span>
          {c.phone && <span>Phone: {c.phone}</span>}
        </div>
        <button 
          className="btn-generate" 
          onClick={() => openLinkModal(c, 499)}
        >
          <LinkIcon size={14} /> Custom Link
        </button>
      </div>
    );

    return (
      <div className="tab-content">
        <div className="tab-header">
          <div>
            <h2>Payments & Recovery</h2>
            <p>Recent transactions and manual payment links.</p>
          </div>
          <button className="btn-sync" onClick={fetchPayments} disabled={loadingPayments}>
            <RefreshCw size={16} className={loadingPayments ? 'spin' : ''} /> Refresh API
          </button>
        </div>

        <div className="payments-layout">
          <div className="link-generation-sections">
            <div className="recovery-section">
              <h3>Needs Manual Recovery</h3>
              <p className="section-desc">Candidates who clicked checkout but didn't pay.</p>
              {droppedCandidates.length === 0 ? (
                <div className="empty-state" style={{padding: '1.5rem'}}>No dropped checkouts found.</div>
              ) : (
                <div className="recovery-list">
                  {droppedCandidates.map(renderCandidateRow)}
                </div>
              )}
            </div>

            <div className="recovery-section" style={{marginTop: '1.5rem'}}>
              <h3>All Other Free Users</h3>
              <p className="section-desc">Generate links proactively for anyone.</p>
              {otherFreeCandidates.length === 0 ? (
                <div className="empty-state" style={{padding: '1.5rem'}}>No other free candidates.</div>
              ) : (
                <div className="recovery-list">
                  {otherFreeCandidates.map(renderCandidateRow)}
                </div>
              )}
            </div>
          </div>

          <div className="transactions-section">
            <h3>Recent Razorpay Transactions</h3>
            {loadingPayments ? (
              <div className="empty-state"><RefreshCw className="spin" /> Loading from Razorpay...</div>
            ) : payments.length === 0 ? (
              <div className="empty-state">No recent payments found.</div>
            ) : (
              <div className="transactions-list">
                {payments.map(txn => (
                  <div key={txn.id} className="txn-card">
                    <div className="txn-header">
                      <span className="txn-amount">₹{txn.amount / 100}</span>
                      <span className={`txn-status ${txn.status}`}>{txn.status}</span>
                    </div>
                    <div className="txn-details">
                      <span>ID: {txn.id}</span>
                      <span>Email: {txn.email || 'N/A'}</span>
                      <span>Contact: {txn.contact || 'N/A'}</span>
                      <span>Date: {new Date(txn.created_at * 1000).toLocaleString()}</span>
                    </div>
                    <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'flex-end' }}>
                      <button 
                        className="btn-generate" 
                        onClick={() => openLinkModal({
                          id: txn.notes?.userId || `razorpay_${txn.id}`,
                          full_name: txn.notes?.name || 'Razorpay Customer',
                          email: txn.email,
                          phone: txn.contact
                        }, 499)}
                      >
                        <LinkIcon size={14} /> Custom Link
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderWebhooks = () => (
    <div className="tab-content">
      <div className="tab-header">
        <div>
          <h2>Webhook Monitoring</h2>
          <p>Real-time stream of events from Razorpay.</p>
        </div>
        <button className="btn-sync" onClick={fetchWebhooks} disabled={loadingWebhooks}>
          <RefreshCw size={16} className={loadingWebhooks ? 'spin' : ''} /> Refresh Logs
        </button>
      </div>

      <div className="webhook-list">
        {loadingWebhooks ? (
          <div className="empty-state"><RefreshCw className="spin" /> Fetching logs...</div>
        ) : webhooks.length === 0 ? (
          <div className="empty-state">
            <AlertCircle size={24} style={{marginBottom: '0.5rem', color: 'var(--text-muted)'}}/>
            <p>No webhook events recorded yet.</p>
            <p style={{fontSize: '0.8rem', marginTop: '0.5rem'}}>Ensure the <code>webhook_events</code> table is created in Supabase.</p>
          </div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Event Type</th>
                <th>Payment ID</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {webhooks.map(log => (
                <tr key={log.id}>
                  <td className="time-col">
                    <Clock size={12} /> {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td><span className="event-badge">{log.event_type}</span></td>
                  <td className="code-font">{log.payment_id || '-'}</td>
                  <td>
                    <span className={`status-dot ${log.status === 'received' ? 'success' : ''}`}>
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );

  const renderRetargeting = () => {
    const droppedCandidates = profiles.filter(p => p.payment_attempts > 0 && !p.is_paid);
    const otherFreeCandidates = profiles.filter(p => p.payment_attempts === 0 && !p.is_paid);
    
    return (
      <div className="tab-content">
        <div className="tab-header">
          <div>
            <h2>Retargeting Campaigns</h2>
            <p>Target dropped checkouts and free users with emails and discounts.</p>
          </div>
        </div>
        
        {/* Discount Retargeting Section */}
        <div className="settings-card" style={{ marginBottom: '1.5rem', borderLeft: '4px solid var(--lime-500)' }}>
          <h3>Discount Retargeting (High Intent)</h3>
          <p>These candidates clicked "Upgrade" but failed or abandoned checkout.</p>
          
          <div className="admin-table-container" style={{overflowX: 'auto', marginTop: '1rem'}}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Attempts</th>
                  <th>Contact</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {droppedCandidates.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div style={{fontWeight: 600}}>{u.full_name || 'Anonymous'}</div>
                      <div style={{fontSize: '0.7rem', color: 'var(--text-muted)'}}>Last active: {u.last_active_date}</div>
                    </td>
                    <td>{u.payment_attempts} attempts</td>
                    <td>{u.email || u.phone || 'N/A'}</td>
                    <td>
                      <div style={{display: 'flex', gap: '0.5rem'}}>
                        <button className="btn-generate" onClick={() => openLinkModal(u, 299)}>
                          Generate 299₹ Link
                        </button>
                        {u.email && (
                          <a 
                            href={`mailto:${u.email}?subject=Did you forget something? Here's a special discount on Tarmac Pro`} 
                            className="btn-sync" 
                            style={{textDecoration: 'none', padding: '0.35rem 0.5rem'}}
                          >
                            <Mail size={14}/>
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {droppedCandidates.length === 0 && (
                  <tr><td colSpan="4" style={{textAlign: 'center', padding: '2rem'}}>No dropped checkouts to retarget.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* General Audience Retargeting */}
        <div className="settings-card">
          <h3>General Retargeting (Free Users)</h3>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button 
              className="btn-sync" 
              onClick={() => alert('Feature coming soon: Integrated Emailing')}
              style={{ background: 'var(--surface-3)', color: 'var(--text-primary)' }}
            >
              <Mail size={16} /> Broadcast to All Free Users ({otherFreeCandidates.length})
            </button>
          </div>

          <h4 style={{marginTop: '2rem', marginBottom: '1rem'}}>Direct Contact Links</h4>
          <div className="admin-table-container" style={{overflowX: 'auto'}}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Visits</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {otherFreeCandidates.map(u => (
                  <tr key={u.id}>
                    <td>{u.full_name || 'Anonymous'}</td>
                    <td>{u.email || 'N/A'}</td>
                    <td>{u.visits}</td>
                    <td>
                      {u.email ? (
                        <a href={`mailto:${u.email}?subject=Exclusive Offer for Tarmac Pro`} className="btn-generate" style={{textDecoration: 'none'}}>
                          <Mail size={14}/> Send Email
                        </a>
                      ) : (
                        <span style={{color: 'var(--text-muted)'}}>No Email</span>
                      )}
                    </td>
                  </tr>
                ))}
                {otherFreeCandidates.length === 0 && (
                  <tr><td colSpan="4" style={{textAlign: 'center', padding: '2rem'}}>No other free users found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderSettings = () => (
    <div className="tab-content">
      <div className="tab-header">
        <div>
          <h2>System Settings</h2>
          <p>Configure payment gateways and integrations.</p>
        </div>
      </div>
      <div className="settings-card">
        <h3>Payment Gateway Switcher</h3>
        <p>This section is a placeholder for dynamically switching between Razorpay, Easebuzz, or Stripe.</p>
        
        <div className="gateway-options">
          <label className="gateway-radio active">
            <input type="radio" name="pg" defaultChecked />
            <div className="radio-content">
              <strong>Razorpay</strong>
              <span>Active Gateway</span>
            </div>
          </label>
          <label className="gateway-radio disabled">
            <input type="radio" name="pg" disabled />
            <div className="radio-content">
              <strong>Easebuzz</strong>
              <span>Pending Approval</span>
            </div>
          </label>
        </div>
      </div>
    </div>
  );

  return (
    <div className="admin-layout">
      {renderSidebar()}
      
      <div className="admin-main">
        {error && (
          <div className="admin-error">
            <AlertCircle size={20} /> <span>{error}</span>
          </div>
        )}
        
        {activeTab === 'analytics' && renderAnalytics()}
        {activeTab === 'candidates' && renderCandidates()}
        {activeTab === 'payments' && renderPayments()}
        {activeTab === 'retargeting' && renderRetargeting()}
        {activeTab === 'webhooks' && renderWebhooks()}
        {activeTab === 'settings' && renderSettings()}
      </div>

      {/* Custom Payment Link Modal */}
      {showLinkModal && selectedCandidate && (
        <div className="modal-overlay" onClick={() => !generatingLink && setShowLinkModal(false)}>
          <div className="modal-content admin-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create Custom Payment Link</h3>
              <button className="close-btn" onClick={() => setShowLinkModal(false)}><X size={20} /></button>
            </div>
            
            {!generatedLink ? (
              <form onSubmit={submitCustomLink} className="admin-form">
                <div className="form-group">
                  <label>Candidate</label>
                  <input type="text" value={selectedCandidate.full_name || selectedCandidate.phone} disabled />
                </div>
                
                <div className="form-group">
                  <label>Amount (₹)</label>
                  <input 
                    type="number" 
                    value={linkForm.amount} 
                    onChange={e => setLinkForm({...linkForm, amount: e.target.value})}
                    required 
                  />
                </div>
                
                <div className="form-group">
                  <label>Description</label>
                  <input 
                    type="text" 
                    value={linkForm.description} 
                    onChange={e => setLinkForm({...linkForm, description: e.target.value})}
                    placeholder="e.g. Tarmac Pro Discounted"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Internal Notes (JSON or Text)</label>
                  <textarea 
                    value={linkForm.notes} 
                    onChange={e => setLinkForm({...linkForm, notes: e.target.value})}
                    placeholder='e.g. {"discount": "70%"}'
                    rows={2}
                  />
                </div>

                <div className="modal-actions">
                  <button type="button" className="btn-secondary" onClick={() => setShowLinkModal(false)}>Cancel</button>
                  <button type="submit" className="btn-primary" disabled={generatingLink}>
                    {generatingLink ? 'Creating...' : 'Create Link'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="success-state">
                <CheckCircle size={48} color="var(--lime-500)" style={{margin: '0 auto 1rem'}} />
                <h4>Link Created Successfully!</h4>
                <div className="link-result-box">
                  <input type="text" value={generatedLink.url} readOnly onClick={e => e.target.select()} />
                  <p>Share this URL with the candidate.</p>
                </div>
                <button className="btn-primary" style={{width: '100%', marginTop: '1rem'}} onClick={() => setShowLinkModal(false)}>
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
