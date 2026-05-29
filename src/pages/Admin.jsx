import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { 
  Users, Zap, Shield, Search, Filter, Mail, Download, 
  ChevronRight, ChevronDown, CheckCircle, AlertCircle, 
  ExternalLink, Phone, Briefcase, RefreshCw, BarChart2,
  CreditCard, Activity, Settings, Link as LinkIcon, Clock, X, Copy
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
  const [leads, setLeads] = useState([]);
  
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
  const [generatedLink, setGeneratedLink] = useState(null);
  
  // Retargeting State
  const [retargetSegment, setRetargetSegment] = useState('all');
  const [retargetSearchTerm, setRetargetSearchTerm] = useState('');
  
  // Email Modal State
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailDraft, setEmailDraft] = useState({ to: '', subject: '', body: '' });
  
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

        const mappedP = {
          ...p,
          phone: String(history.phone || ''),
          company: String(history.company || ''),
          role: String(history.role || ''),
          visits: history.visits || 1,
          payment_attempts: history.payment_attempts || 0,
          journey: Array.isArray(history.journey) ? history.journey : []
        };
        
        let lastVisited = 'Unknown';
        if (mappedP.journey.length > 0) {
          const lastE = mappedP.journey[mappedP.journey.length - 1];
          lastVisited = lastE.type === 'page_view' ? lastE.path : (lastE.name || 'Unknown');
        }
        mappedP.last_visited_label = lastVisited;
        
        return mappedP;
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
      const { data, error: wErr } = await supabase
        .from('webhook_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (!wErr) setWebhooks(data || []);
    } catch (err) {
      console.error('Failed to fetch webhooks:', err);
    } finally {
      setLoadingWebhooks(false);
    }
  };

  // Fetch Pre-Auth Leads from Supabase
  const fetchLeads = async () => {
    try {
      const { data, error: lErr } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (!lErr) setLeads(data || []);
    } catch (err) {
      console.error('Failed to fetch leads:', err);
    }
  };

  useEffect(() => {
    fetchProfiles();
    fetchLeads();
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
  const totalVisits = profiles.reduce((acc, p) => acc + (p.visits || 0), 0);
  const totalPaymentAttempts = profiles.reduce((acc, p) => acc + (p.payment_attempts || 0), 0);

  // Copy helper
  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    // Visual feedback could be added via a toast, but keeping it simple
  };

  // Analytics Tracking Parsing (Funnel)
  const funnelMetrics = {
    hero: 0, dashboard: 0, questions: 0, mock: 0, companies: 0, resources: 0, pricing: 0
  };

  profiles.forEach(p => {
    let hasHero = false, hasDash = false, hasQ = false, hasMock = false, hasComp = false, hasRes = false, hasPrice = false;
    (p.journey || []).forEach(e => {
      if (e.type !== 'page_view') return;
      const path = e.path || '';
      if (path === '/') hasHero = true;
      if (path.includes('/dashboard')) hasDash = true;
      if (path.includes('/questions')) hasQ = true;
      if (path.includes('/mock')) hasMock = true;
      if (path.includes('/companies')) hasComp = true;
      if (path.includes('/resources')) hasRes = true;
      if (path.includes('/pricing')) hasPrice = true;
    });

    if (hasHero) funnelMetrics.hero++;
    if (hasDash) funnelMetrics.dashboard++;
    if (hasQ) funnelMetrics.questions++;
    if (hasMock) funnelMetrics.mock++;
    if (hasComp) funnelMetrics.companies++;
    if (hasRes) funnelMetrics.resources++;
    if (hasPrice) funnelMetrics.pricing++;
  });

  const funnelChartData = [
    { name: 'Hero', users: funnelMetrics.hero },
    { name: 'Dashboard', users: funnelMetrics.dashboard },
    { name: 'Questions', users: funnelMetrics.questions },
    { name: 'Mock', users: funnelMetrics.mock },
    { name: 'Companies', users: funnelMetrics.companies },
    { name: 'Resources', users: funnelMetrics.resources },
    { name: 'Pricing', users: funnelMetrics.pricing },
  ];

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
        
        <div className="chart-container" style={{ background: 'transparent', border: 'none', padding: 0, boxShadow: 'none' }}>
          <h3 style={{ marginBottom: '1rem' }}>Feature Exploration Funnel</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem' }}>
            {funnelChartData.map(item => (
              <div key={item.name} className="stat-card" style={{ padding: '1.25rem', flexDirection: 'column', alignItems: 'flex-start', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>{item.name}</span>
                <span style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{item.users}</span>
                <span style={{ fontSize: '0.65rem', color: 'var(--lime-500)', fontWeight: 600 }}>UNIQUE EXPLORERS</span>
              </div>
            ))}
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

      <div className="admin-table-container" style={{overflowX: 'auto', marginTop: '1rem', borderTop: '1px solid var(--border)'}}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>User ID</th>
              <th>Tier</th>
              <th>Last Click / Section Visited</th>
              <th>Number</th>
              <th>View Count</th>
            </tr>
          </thead>
          <tbody>
            {filteredProfiles.map((p) => (
              <tr key={p.id}>
                <td>
                  <div style={{fontWeight: 600}}>{p.full_name || 'Anonymous User'}</div>
                  <div style={{fontSize: '0.7rem', color: 'var(--text-muted)'}}>Active: {p.last_active_date || 'Unknown'}</div>
                </td>
                <td>
                  <div className="candidate-id-sub" onClick={() => handleCopy(p.id)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    {p.id} <Copy size={12} />
                  </div>
                </td>
                <td>
                  {p.is_paid ? <span className="badge-status pro" style={{padding: '0.2rem 0.5rem', borderRadius: '4px'}}>PRO</span> : <span className="badge-status free" style={{padding: '0.2rem 0.5rem', borderRadius: '4px'}}>FREE</span>}
                </td>
                <td>
                  <span className="highlight-pill" style={{ background: 'var(--surface-3)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem' }}>
                    <Activity size={12} /> {p.last_visited_label || 'Unknown'}
                  </span>
                </td>
                <td>
                  {p.phone ? (
                    <div className="highlight-pill" onClick={() => handleCopy(p.phone)} style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem' }}>
                      <Phone size={12} /> {p.phone} <Copy size={12} />
                    </div>
                  ) : 'N/A'}
                </td>
                <td>
                  <div style={{fontSize: '0.8rem', fontWeight: 600}}>{p.visits || 0} visits</div>
                </td>
              </tr>
            ))}
            {filteredProfiles.length === 0 && (
              <tr><td colSpan="6" style={{textAlign: 'center', padding: '2rem'}}>No candidates found.</td></tr>
            )}
          </tbody>
        </table>
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
                    {['failed', 'created', 'authorizing'].includes(txn.status?.toLowerCase()) && (
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
                    )}
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
    // Determine the filtered candidates based on the selected segment
    let segmentedCandidates = profiles;
    
    if (retargetSegment === 'preauth') {
      segmentedCandidates = leads.map(lead => ({
        id: lead.id,
        full_name: 'Anonymous (Pre-Auth)',
        last_active_date: new Date(lead.created_at).toLocaleString(),
        visits: 0,
        payment_attempts: 0,
        phone: lead.phone,
        email: null,
        is_preauth: true
      }));
    } else if (retargetSegment === 'dropped') {
      segmentedCandidates = profiles.filter(p => p.payment_attempts > 0 && !p.is_paid);
    } else if (retargetSegment === 'free') {
      segmentedCandidates = profiles.filter(p => p.payment_attempts === 0 && !p.is_paid);
    } else if (retargetSegment !== 'all') {
      // Filter by journey path
      const targetPath = retargetSegment; 
      segmentedCandidates = profiles.filter(p => {
        if (p.is_paid) return false; // Usually we only retarget free users
        let explored = false;
        (p.journey || []).forEach(e => {
          if (e.type === 'page_view' && (e.path || '').includes(targetPath)) {
            explored = true;
          }
        });
        return explored;
      });
    }

    if (retargetSearchTerm) {
      const term = retargetSearchTerm.toLowerCase();
      segmentedCandidates = segmentedCandidates.filter(p => 
        (p.full_name || '').toLowerCase().includes(term) ||
        (p.phone || '').toLowerCase().includes(term) ||
        p.id.toLowerCase().includes(term)
      );
    }

    const openEmailModal = (u, segment) => {
      let subject = '';
      let body = '';

      if (segment !== 'all') {
        subject = 'Exclusive Offer for Tarmac Pro';
        body = `Hi ${u.full_name || 'there'},\n\nWe noticed you checking out Tarmac.\n\n`;

        if (segment === '/questions') {
          body = `Hi ${u.full_name || 'there'},\n\nWe saw you exploring the question bank! Did you know the free tier limits you to only 20 questions?\n\nUpgrade to Pro today to unlock unlimited questions and skyrocket your interview prep.\n\n`;
        } else if (segment === 'dropped') {
          body = `Hi ${u.full_name || 'there'},\n\nWe noticed you started checking out but didn't complete your upgrade to Tarmac Pro.\n\nIs there anything we can help clarify? Here is a payment link to complete your purchase when you're ready.\n\n`;
        } else if (segment === '/mock') {
          body = `Hi ${u.full_name || 'there'},\n\nWe saw you checking out the mock interviews. AI-driven mock interviews are one of our most powerful features for landing top tier jobs.\n\nUpgrade to Pro to unlock full access.\n\n`;
        }
      }

      setEmailDraft({ to: u.email || '', subject, body });
      setShowEmailModal(true);
    };

    return (
      <div className="tab-content">
        <div className="tab-header">
          <div>
            <h2>Behavioral Retargeting</h2>
            <p>Target specific segments based on their exploration behavior.</p>
          </div>
          <select 
            className="filter-select" 
            value={retargetSegment} 
            onChange={(e) => setRetargetSegment(e.target.value)}
            style={{ padding: '0.5rem', background: 'var(--surface-2)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}
          >
            <option value="all">All Profiles</option>
            <option value="preauth">Pre-Auth Leads (Dropped at Signup)</option>
            <option value="free">All Free Users</option>
            <option value="dropped">Dropped at Checkout (High Intent)</option>
            <option value="/pricing">Viewed Pricing Page</option>
            <option value="/questions">Explored Question Bank</option>
            <option value="/mock">Explored Mock Interviews</option>
            <option value="/companies">Explored Companies</option>
            <option value="/resources">Explored Resources</option>
          </select>
        </div>
        
        <div className="settings-card" style={{ borderLeft: '4px solid var(--lime-500)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3>Target Segment: {segmentedCandidates.length} Users</h3>
              <p>You can generate custom payment links or email these users directly.</p>
            </div>
            <div className="search-box" style={{ width: '300px', margin: 0 }}>
              <Search size={18} className="search-icon" />
              <input 
                type="text" 
                placeholder="Search segment by name, phone, or ID..."
                value={retargetSearchTerm}
                onChange={(e) => setRetargetSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <div className="admin-table-container" style={{overflowX: 'auto', marginTop: '1rem'}}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Behavior Metrics</th>
                  <th>Contact</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {segmentedCandidates.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div style={{fontWeight: 600}}>{u.full_name || 'Anonymous'}</div>
                      <div className="candidate-id-sub" onClick={(e) => { e.stopPropagation(); handleCopy(u.id); }} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>{u.id} <Copy size={10} /></div>
                    </td>
                    <td>
                      <div style={{fontSize: '0.8rem'}}>Visits: {u.visits || 0}</div>
                      <div style={{fontSize: '0.8rem', color: 'var(--text-secondary)'}}>Checkouts: {u.payment_attempts || 0}</div>
                    </td>
                    <td>
                      {u.email && <div>{u.email}</div>}
                      {u.phone && <div className="highlight-pill" onClick={(e) => { e.stopPropagation(); handleCopy(u.phone); }} style={{ cursor: 'pointer', display: 'inline-flex', marginTop: '4px' }}><Phone size={12} /> {u.phone} <Copy size={10} style={{marginLeft: '4px'}}/></div>}
                      {!u.email && !u.phone && 'N/A'}
                    </td>
                    <td>
                      <div style={{display: 'flex', flexWrap: 'wrap', gap: '0.5rem'}}>
                        {!u.is_preauth && (
                          <>
                            <button className="btn-generate" onClick={() => openLinkModal(u, 499)} style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem' }}>
                              Generate Link
                            </button>
                            <button className="btn-generate" style={{ background: 'var(--lime-500)', color: '#000', padding: '0.35rem 0.6rem', fontSize: '0.75rem' }} onClick={() => openLinkModal(u, 299)}>
                              ₹299 Discount
                            </button>
                          </>
                        )}
                        {u.is_preauth && (
                          <button className="btn-generate" onClick={() => {
                             alert('To generate a link for a pre-auth lead, you must manually create it in Razorpay and send it via WhatsApp to: ' + u.phone);
                          }}>
                            Manual Razorpay Link
                          </button>
                        )}
                        <button 
                          onClick={() => openEmailModal(u, retargetSegment)} 
                          className="btn-sync" 
                          style={{textDecoration: 'none', padding: '0.35rem 0.6rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem', border: 'none', cursor: 'pointer', background: 'var(--surface-3)', color: 'var(--text-primary)'}}
                        >
                          <Mail size={12}/> Draft Email
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {segmentedCandidates.length === 0 && (
                  <tr><td colSpan="4" style={{textAlign: 'center', padding: '2rem'}}>No candidates found in this segment.</td></tr>
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
      {/* Email Draft Modal */}
      {showEmailModal && (
        <div className="modal-overlay" onClick={() => setShowEmailModal(false)}>
          <div className="modal-content admin-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Draft Email to Candidate</h3>
              <button className="close-btn" onClick={() => setShowEmailModal(false)}><X size={20} /></button>
            </div>
            
            <div className="admin-form" style={{ marginTop: '1rem' }}>
              <div className="form-group">
                <label>To:</label>
                <input 
                  type="text" 
                  value={emailDraft.to} 
                  onChange={e => setEmailDraft({...emailDraft, to: e.target.value})}
                  placeholder="Candidate Email (optional)"
                />
              </div>
              
              <div className="form-group">
                <label>Subject:</label>
                <input 
                  type="text" 
                  value={emailDraft.subject} 
                  onChange={e => setEmailDraft({...emailDraft, subject: e.target.value})}
                  placeholder="Email Subject"
                />
              </div>
              
              <div className="form-group">
                <label>Body:</label>
                <textarea 
                  value={emailDraft.body} 
                  onChange={e => setEmailDraft({...emailDraft, body: e.target.value})}
                  rows={8}
                  style={{ fontFamily: 'inherit' }}
                />
              </div>

              <div className="modal-actions" style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={() => {
                    handleCopy(emailDraft.body);
                    alert("Email body copied to clipboard!");
                  }}
                  style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
                >
                  <Copy size={16} /> Copy Body
                </button>
                <button 
                  type="button" 
                  className="btn-primary" 
                  onClick={() => {
                    const mailtoStr = `mailto:${emailDraft.to}?subject=${encodeURIComponent(emailDraft.subject)}&body=${encodeURIComponent(emailDraft.body)}`;
                    window.location.href = mailtoStr;
                  }}
                  style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
                >
                  <Mail size={16} /> Open Mail Client
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
