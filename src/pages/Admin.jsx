import React, { useState, useEffect } from 'react';
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
  const [webhookSearchTerm, setWebhookSearchTerm] = useState('');
  const [webhookEventFilter, setWebhookEventFilter] = useState('all');
  
  // Loading & Error States
  const [loading, setLoading] = useState(true);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [loadingWebhooks, setLoadingWebhooks] = useState(false);
  const [error, setError] = useState(null);

  // Backfill & Repair States
  const [runningBackfill, setRunningBackfill] = useState(false);
  const [backfillMsg, setBackfillMsg] = useState(null);

  // Date Filtering & Role Segmentation States
  const [dateFilter, setDateFilter] = useState('all');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('all');

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
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState(false);
  const [emailError, setEmailError] = useState('');

  // Webhook Grouping & Payload View States
  const [expandedWebhookGroups, setExpandedWebhookGroups] = useState({});
  const [expandedPayloads, setExpandedPayloads] = useState({});

  // Helper to check if a date string/timestamp is within the selected filter range
  const isWithinDateRange = (dateValue, range) => {
    if (range === 'all' || !range) return true;
    if (!dateValue) return false;

    let ms;
    if (typeof dateValue === 'number') {
      ms = dateValue * 1000; // Razorpay Unix timestamp
    } else {
      ms = new Date(dateValue).getTime();
    }

    if (isNaN(ms)) return false;

    const now = Date.now();
    if (range === '30m') return (now - ms) <= 30 * 60 * 1000;
    if (range === '24h') return (now - ms) <= 24 * 60 * 60 * 1000;
    if (range === '7d') return (now - ms) <= 7 * 24 * 60 * 60 * 1000;
    if (range === '30d') return (now - ms) <= 30 * 24 * 60 * 60 * 1000;

    return true;
  };
  
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
        // Parse analytics from streak_history JSONB
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
          // CLEAN: Use dedicated columns first, fall back to JSONB for old data
          phone: p.phone || String(history.phone || ''),
          email: p.email || '',
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
    setError(null);
    try {
      const { data, error: wErr } = await supabase
        .from('webhook_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (wErr) {
        console.error('Failed to fetch webhooks:', wErr);
        setError('Webhook logs RLS permission error: ' + wErr.message + '. Run the Database Backfill utility in System Settings.');
      } else {
        setWebhooks(data || []);
      }
    } catch (err) {
      console.error('Failed to fetch webhooks:', err);
      setError('Failed to fetch webhooks: ' + err.message);
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

  const candidates = profiles.filter(p => !p.is_admin && p.email !== 'admin.tarmac@gmail.com');

  // Date-filtered candidates for analytics
  const filteredCandidates = candidates.filter(p => isWithinDateRange(p.last_active_date || p.created_at, dateFilter));

  // Metrics for Analytics Tab
  const totalUsers = filteredCandidates.length;
  const proUsersCount = filteredCandidates.filter(p => p.is_paid).length;
  const totalVisits = filteredCandidates.reduce((acc, p) => acc + (p.visits || 0), 0);
  const totalPaymentAttempts = filteredCandidates.reduce((acc, p) => acc + (p.payment_attempts || 0), 0);

  const activeSubsCount = filteredCandidates.filter(p => p.subscription_status === 'active').length;
  const cancelledSubsCount = filteredCandidates.filter(p => p.subscription_status === 'cancelled').length;
  const activePassesCount = filteredCandidates.filter(p => 
    p.is_paid && 
    !p.razorpay_subscription_id && 
    (!p.paid_until || new Date(p.paid_until) > new Date())
  ).length;
  const expiredPassesCount = filteredCandidates.filter(p => 
    !p.is_admin && 
    p.email !== 'admin.tarmac@gmail.com' && 
    !!p.paid_until && 
    new Date(p.paid_until) <= new Date()
  ).length;

  // Copy helper
  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
  };

  // Send Email Handler
  const handleSendEmail = async (e) => {
    e.preventDefault();
    if (!emailDraft.to) {
      setEmailError('Please specify a recipient email address.');
      return;
    }
    setSendingEmail(true);
    setEmailError('');
    setEmailSuccess(false);

    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: emailDraft.to,
          subject: emailDraft.subject,
          body: emailDraft.body
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send email.');
      }

      setEmailSuccess(true);
    } catch (err) {
      console.error('Error sending email:', err);
      setEmailError(err.message || 'An error occurred while sending the email.');
    } finally {
      setSendingEmail(false);
    }
  };

  // Extract Roles/Courses dynamically to build segmentation controls
  const availableRoles = Array.from(
    new Set(
      candidates
        .map(p => p.role ? p.role.trim() : '')
        .filter(r => r !== '' && r.toLowerCase() !== 'undefined' && r.toLowerCase() !== 'null')
    )
  ).sort();

  const standardRoles = ['Solutions Engineer', 'Technical Account Manager', 'Customer Success Engineer', 'Software Engineer'];
  const allUniqueRoles = Array.from(new Set([...availableRoles, ...standardRoles]));

  // Funnel candidates based on date filter + selected role filter
  const funnelCandidates = filteredCandidates.filter(p => {
    if (selectedRoleFilter === 'all') return true;
    return p.role && p.role.trim().toLowerCase() === selectedRoleFilter.toLowerCase();
  });

  // Analytics Tracking Parsing (Funnel)
  const funnelMetrics = {
    hero: 0, dashboard: 0, questions: 0, mock: 0, companies: 0, resources: 0, pricing: 0
  };

  funnelCandidates.forEach(p => {
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

  // Generate chart data based on filtered candidate visits
  const chartData = [
    { name: 'Mon', visits: totalVisits > 0 ? Math.floor(totalVisits * 0.1) : 0, signups: 0 },
    { name: 'Tue', visits: totalVisits > 0 ? Math.floor(totalVisits * 0.15) : 0, signups: 1 },
    { name: 'Wed', visits: totalVisits > 0 ? Math.floor(totalVisits * 0.2) : 0, signups: 0 },
    { name: 'Thu', visits: totalVisits > 0 ? Math.floor(totalVisits * 0.25) : 0, signups: 2 },
    { name: 'Fri', visits: totalVisits > 0 ? Math.floor(totalVisits * 0.1) : 0, signups: 0 },
    { name: 'Sat', visits: totalVisits > 0 ? Math.floor(totalVisits * 0.05) : 0, signups: 0 },
    { name: 'Sun', visits: totalVisits > 0 ? Math.floor(totalVisits * 0.15) : 0, signups: totalUsers > 3 ? totalUsers - 3 : totalUsers },
  ];

  // Compile registration & conversion statistics for each Role/Course
  const roleComparisonData = allUniqueRoles.map(role => {
    const roleCandidates = filteredCandidates.filter(p => p.role && p.role.trim().toLowerCase() === role.toLowerCase());
    const signups = roleCandidates.length;
    const pro = roleCandidates.filter(p => p.is_paid).length;
    const rate = signups > 0 ? Math.round((pro / signups) * 100) : 0;
    return { role, signups, pro, rate };
  }).filter(d => d.signups > 0 || d.pro > 0 || standardRoles.includes(d.role));

  const filteredProfiles = candidates.filter(p => {
    const searchMatch = (p.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                        (p.phone || '').includes(searchTerm);
    const statusMatch = statusFilter === 'all' || 
                        (statusFilter === 'pro' && p.is_paid) || 
                        (statusFilter === 'free' && !p.is_paid);
    const dateMatch = isWithinDateRange(p.last_active_date || p.created_at, dateFilter);
    return searchMatch && statusMatch && dateMatch;
  });

  // Run Database Backfill & Repair Utility
  const handleRunBackfill = async () => {
    setRunningBackfill(true);
    setBackfillMsg(null);
    try {
      const res = await fetch('/api/admin-backfill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'BACKFILL' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to run backfill.');
      
      const logSummary = data.logs ? data.logs.join('\n') : '';
      setBackfillMsg({ 
        type: 'success', 
        text: `Success! Webhooks resolved/updated: ${data.updated_webhooks || 0}\n\nLogs:\n${logSummary}` 
      });
      
      // Reload everything
      fetchProfiles();
      fetchWebhooks();
    } catch (err) {
      setBackfillMsg({ type: 'error', text: err.message });
    } finally {
      setRunningBackfill(false);
    }
  };

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
          <CreditCard size={18} /> Payments Management
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
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <select 
            value={dateFilter} 
            onChange={(e) => setDateFilter(e.target.value)}
            className="filter-select"
            style={{ 
              padding: '0.5rem 1rem', 
              background: 'var(--surface-2)', 
              color: 'var(--text-primary)', 
              border: '1px solid var(--border)', 
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.85rem'
            }}
          >
            <option value="all">All Time</option>
            <option value="30m">Last 30 Minutes</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days (1 Month)</option>
          </select>
          <button className="btn-sync" onClick={fetchProfiles}>
            <RefreshCw size={16} className={loading ? 'spin' : ''} /> Refresh
          </button>
        </div>
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

      <div className="admin-stats-grid" style={{ marginTop: '1.25rem' }}>
          <div className="stat-card" style={{ borderLeft: '3px solid #3b82f6' }}>
            <div className="stat-info">
              <span className="stat-label">Active Subscriptions</span>
              <span className="stat-value" style={{ color: '#3b82f6' }}>{activeSubsCount}</span>
            </div>
          </div>
          <div className="stat-card" style={{ borderLeft: '3px solid var(--lime-400)' }}>
            <div className="stat-info">
              <span className="stat-label">Active 20-Day Passes</span>
              <span className="stat-value" style={{ color: 'var(--lime-400)' }}>{activePassesCount}</span>
            </div>
          </div>
          <div className="stat-card" style={{ borderLeft: '3px solid #ef4444' }}>
            <div className="stat-info">
              <span className="stat-label">Cancelled Subscriptions</span>
              <span className="stat-value" style={{ color: '#ef4444' }}>{cancelledSubsCount}</span>
            </div>
          </div>
          <div className="stat-card" style={{ borderLeft: '3px solid #f87171' }}>
            <div className="stat-info">
              <span className="stat-label">Expired Passes / Cycles</span>
              <span className="stat-value" style={{ color: '#f87171' }}>{expiredPassesCount}</span>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0 }}>Feature Exploration Funnel</h3>
            <select 
              value={selectedRoleFilter} 
              onChange={(e) => setSelectedRoleFilter(e.target.value)}
              style={{
                background: 'var(--surface-3)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.35rem 0.75rem',
                color: 'var(--text-primary)',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <option value="all">All Roles & Courses</option>
              {allUniqueRoles.map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
          </div>
          
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

      {/* Role & Course Performance Analysis */}
      <div className="chart-container" style={{ gridColumn: '1 / -1', marginTop: '1rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>Conversion Rates & Signups by Role/Course</h3>
        <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--surface-2)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-3)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '0.75rem 1rem' }}>Role / Course Track</th>
                <th style={{ padding: '0.75rem 1rem' }}>Total Signups</th>
                <th style={{ padding: '0.75rem 1rem' }}>Pro Users</th>
                <th style={{ padding: '0.75rem 1rem' }}>Conversion Rate</th>
                <th style={{ padding: '0.75rem 1rem', width: '30%' }}>Conversion Funnel Bar</th>
              </tr>
            </thead>
            <tbody>
              {roleComparisonData.map(row => (
                <tr key={row.role} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', color: 'var(--text-secondary)' }}>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text-primary)' }}>{row.role}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>{row.signups} candidates</td>
                  <td style={{ padding: '0.75rem 1rem', color: 'var(--lime-400)' }}>{row.pro} pro</td>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>{row.rate}%</td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <div style={{ width: '100%', background: 'var(--surface-3)', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${row.rate}%`, background: 'var(--lime-500)', height: '100%' }} />
                    </div>
                  </td>
                </tr>
              ))}
              {roleComparisonData.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>
                    No candidates with role data registered in this date range.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderTierBadge = (p) => {
    const isPaid = (p.is_paid || p.subscription_status === 'active') && (!p.paid_until || new Date(p.paid_until) > new Date());
    const isSub = !!p.subscription_status || !!p.razorpay_subscription_id;
    const isExpired = !isPaid && !!p.paid_until && new Date(p.paid_until) <= new Date();

    if (p.is_admin) {
      return <span className="badge-status admin" style={{padding: '0.2rem 0.5rem', borderRadius: '4px', background: '#3b82f6', color: '#fff', fontSize: '0.75rem', fontWeight: 600}}>ADMIN</span>;
    }

    if (isPaid) {
      const typeLabel = p.access_type === 'role' ? p.access_role : 'All-Access';
      const modeLabel = isSub ? 'Sub' : 'Pass';
      let daysLeft = '';
      if (p.paid_until && !isSub) {
        const diff = new Date(p.paid_until) - new Date();
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
        daysLeft = ` (${days}d left)`;
      } else if (p.paid_until && isSub) {
        const diff = new Date(p.paid_until) - new Date();
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
        daysLeft = ` (renews in ${days}d)`;
      }
      
      const badgeBg = isSub ? 'rgba(59, 130, 246, 0.15)' : 'rgba(163, 230, 53, 0.15)';
      const badgeBorder = isSub ? 'rgba(59, 130, 246, 0.3)' : 'rgba(163, 230, 53, 0.3)';
      const badgeColor = isSub ? '#60a5fa' : 'var(--lime-400)';

      return (
        <span className="badge-status pro" style={{padding: '0.2rem 0.5rem', borderRadius: '4px', background: badgeBg, border: `1px solid ${badgeBorder}`, color: badgeColor, fontSize: '0.75rem', fontWeight: 600}}>
          {typeLabel} ({modeLabel}){daysLeft}
        </span>
      );
    }

    if (isExpired) {
      return <span className="badge-status expired" style={{padding: '0.2rem 0.5rem', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', fontSize: '0.75rem', fontWeight: 600}}>EXPIRED</span>;
    }

    return <span className="badge-status free" style={{padding: '0.2rem 0.5rem', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600}}>FREE</span>;
  };

  const renderCandidates = () => (
    <div className="tab-content">
      <div className="tab-header">
        <div>
          <h2>Candidate Details</h2>
          <p>Search and inspect registered users.</p>
        </div>
        <div>
          <select 
            value={dateFilter} 
            onChange={(e) => setDateFilter(e.target.value)}
            className="filter-select"
            style={{ 
              padding: '0.5rem 1rem', 
              background: 'var(--surface-2)', 
              color: 'var(--text-primary)', 
              border: '1px solid var(--border)', 
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.85rem'
            }}
          >
            <option value="all">All Time</option>
            <option value="30m">Last 30 Minutes</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days (1 Month)</option>
          </select>
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
                  {renderTierBadge(p)}
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
    const droppedCandidates = candidates.filter(p => p.payment_attempts > 0 && !p.is_paid && isWithinDateRange(p.last_active_date || p.created_at, dateFilter));
    const otherFreeCandidates = candidates.filter(p => p.payment_attempts === 0 && !p.is_paid && isWithinDateRange(p.last_active_date || p.created_at, dateFilter));
    const filteredPayments = payments.filter(txn => isWithinDateRange(txn.created_at, dateFilter));

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
            <h2>Payments Management</h2>
            <p>Recent transactions and manual payment links.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <select 
              value={dateFilter} 
              onChange={(e) => setDateFilter(e.target.value)}
              className="filter-select"
              style={{ 
                padding: '0.5rem 1rem', 
                background: 'var(--surface-2)', 
                color: 'var(--text-primary)', 
                border: '1px solid var(--border)', 
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.85rem'
              }}
            >
              <option value="all">All Time</option>
              <option value="30m">Last 30 Minutes</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days (1 Month)</option>
            </select>
            <button className="btn-sync" onClick={fetchPayments} disabled={loadingPayments}>
              <RefreshCw size={16} className={loadingPayments ? 'spin' : ''} /> Refresh API
            </button>
          </div>
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
            ) : filteredPayments.length === 0 ? (
              <div className="empty-state">No recent payments found.</div>
            ) : (
              <div className="transactions-list">
                {filteredPayments.map(txn => (
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

  const renderWebhooks = () => {
    const filteredWebhooks = webhooks.filter(log => {
      // 1. Resolve student details
      const userProfile = profiles.find(p => p.id === log.user_id);
      const studentName = (userProfile?.full_name || '').toLowerCase();
      const studentEmail = (userProfile?.email || '').toLowerCase();
      
      const payloadEmail = (
        log.payload?.payload?.payment?.entity?.email || 
        log.payload?.payload?.payment_link?.entity?.customer?.email || 
        log.payload?.payload?.subscription?.entity?.customer?.email ||
        ''
      ).toLowerCase();

      const payloadName = (
        log.payload?.payload?.payment?.entity?.notes?.name || 
        log.payload?.payload?.payment_link?.entity?.customer?.name || 
        log.payload?.payload?.subscription?.entity?.notes?.name ||
        ''
      ).toLowerCase();

      const searchMatch = webhookSearchTerm === '' ||
                          studentName.includes(webhookSearchTerm.toLowerCase()) ||
                          studentEmail.includes(webhookSearchTerm.toLowerCase()) ||
                          payloadEmail.includes(webhookSearchTerm.toLowerCase()) ||
                          payloadName.includes(webhookSearchTerm.toLowerCase()) ||
                          (log.payment_id || '').toLowerCase().includes(webhookSearchTerm.toLowerCase()) ||
                          (log.order_id || '').toLowerCase().includes(webhookSearchTerm.toLowerCase());

      const eventMatch = webhookEventFilter === 'all' || log.event_type === webhookEventFilter;
      const dateMatch = isWithinDateRange(log.created_at, dateFilter);

      return searchMatch && eventMatch && dateMatch;
    });

    // Grouping logic: Group webhooks by user_id if present, else by guest email, else fallback
    const groups = {};
    filteredWebhooks.forEach(log => {
      let groupKey = log.user_id;
      let email = '';
      let name = '';

      const userProfile = profiles.find(p => p.id === log.user_id);
      if (userProfile) {
        email = userProfile.email;
        name = userProfile.full_name;
      } else {
        email = log.payload?.payload?.payment?.entity?.email || 
                log.payload?.payload?.payment_link?.entity?.customer?.email ||
                log.payload?.payload?.subscription?.entity?.customer?.email ||
                '';
        name = log.payload?.payload?.payment?.entity?.notes?.name || 
               log.payload?.payload?.payment_link?.entity?.customer?.name ||
               log.payload?.payload?.subscription?.entity?.notes?.name ||
               '';
      }

      if (!groupKey) {
        groupKey = email ? `email_${email.toLowerCase()}` : 'guest_unknown';
      }

      if (!groups[groupKey]) {
        groups[groupKey] = {
          id: groupKey,
          name: name || 'Guest User',
          email: email || 'Unknown Email',
          phone: userProfile?.phone || log.payload?.payload?.payment?.entity?.contact || log.payload?.payload?.payment_link?.entity?.customer?.contact || '',
          events: []
        };
      }
      groups[groupKey].events.push(log);
    });

    // Sort groups by the most recent event time in each group
    const sortedGroups = Object.values(groups).sort((a, b) => {
      const aTime = a.events[0]?.created_at ? new Date(a.events[0].created_at).getTime() : 0;
      const bTime = b.events[0]?.created_at ? new Date(b.events[0].created_at).getTime() : 0;
      return bTime - aTime;
    });

    const toggleGroup = (groupId) => {
      setExpandedWebhookGroups(prev => ({
        ...prev,
        [groupId]: !prev[groupId]
      }));
    };

    const togglePayload = (logId) => {
      setExpandedPayloads(prev => ({
        ...prev,
        [logId]: !prev[logId]
      }));
    };

    return (
      <div className="tab-content">
        <div className="tab-header">
          <div>
            <h2>Webhook Monitoring</h2>
            <p>Real-time stream of events from Razorpay (grouped by student).</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <select 
              value={dateFilter} 
              onChange={(e) => setDateFilter(e.target.value)}
              className="filter-select"
              style={{ 
                padding: '0.5rem 1rem', 
                background: 'var(--surface-2)', 
                color: 'var(--text-primary)', 
                border: '1px solid var(--border)', 
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.85rem'
              }}
            >
              <option value="all">All Time</option>
              <option value="30m">Last 30 Minutes</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days (1 Month)</option>
            </select>
            <button className="btn-sync" onClick={fetchWebhooks} disabled={loadingWebhooks}>
              <RefreshCw size={16} className={loadingWebhooks ? 'spin' : ''} /> Refresh Logs
            </button>
          </div>
        </div>

        {/* Webhook Filters */}
        <div className="admin-filters-card" style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div className="search-box" style={{ flex: 1, minWidth: '260px' }}>
            <Search size={18} className="search-icon" />
            <input 
              type="text" 
              placeholder="Search by student name, email, payment or link ID..."
              value={webhookSearchTerm}
              onChange={(e) => setWebhookSearchTerm(e.target.value)}
            />
          </div>
          <select 
            value={webhookEventFilter} 
            onChange={(e) => setWebhookEventFilter(e.target.value)}
            style={{
              background: 'var(--surface-3)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem 1rem',
              color: 'var(--text-primary)',
              outline: 'none',
              minWidth: '200px',
              fontFamily: 'var(--font-body)',
              cursor: 'pointer'
            }}
          >
            <option value="all">All Event Types</option>
            {Array.from(new Set(webhooks.map(w => w.event_type))).sort().map(evt => (
              <option key={evt} value={evt}>{evt}</option>
            ))}
          </select>
        </div>

        <div className="webhook-list" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {loadingWebhooks ? (
            <div className="empty-state"><RefreshCw className="spin" /> Fetching logs...</div>
          ) : sortedGroups.length === 0 ? (
            <div className="empty-state">
              <AlertCircle size={24} style={{marginBottom: '0.5rem', color: 'var(--text-muted)'}}/>
              <p>No matching webhook events found.</p>
            </div>
          ) : (
            sortedGroups.map(group => {
              const isExpanded = !!expandedWebhookGroups[group.id];
              const latestEvent = group.events[0];
              
              return (
                <div key={group.id} style={{
                  background: 'var(--surface-1)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)',
                  overflow: 'hidden',
                  boxShadow: 'var(--card-shadow)'
                }}>
                  {/* Collapsible Header */}
                  <div 
                    onClick={() => toggleGroup(group.id)}
                    style={{
                      padding: '1.25rem 1.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      background: isExpanded ? 'var(--surface-2)' : 'transparent',
                      transition: 'background 0.2s',
                      flexWrap: 'wrap',
                      gap: '1rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      {isExpanded ? <ChevronDown size={18} className="expand-icon" /> : <ChevronRight size={18} className="expand-icon" />}
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>{group.name}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{group.email}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                      {group.phone && (
                        <span className="highlight-pill" style={{ fontSize: '0.75rem' }}>
                          <Phone size={12} /> {group.phone}
                        </span>
                      )}

                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        background: 'var(--surface-3)',
                        padding: '0.25rem 0.6rem',
                        borderRadius: '99px',
                        color: 'var(--text-secondary)'
                      }}>
                        {group.events.length} {group.events.length === 1 ? 'Event' : 'Events'}
                      </span>

                      {latestEvent && (
                        <span className="event-badge" style={{ 
                          fontSize: '0.75rem',
                          background: latestEvent.event_type.startsWith('subscription') ? 'rgba(59, 130, 246, 0.12)' : latestEvent.event_type.startsWith('payment_link') ? 'rgba(99,102,241,0.12)' : 'rgba(163,230,53,0.08)',
                          color: latestEvent.event_type.startsWith('subscription') ? '#60a5fa' : latestEvent.event_type.startsWith('payment_link') ? '#818cf8' : 'var(--lime-400)',
                          border: latestEvent.event_type.startsWith('subscription') ? '1px solid rgba(59, 130, 246, 0.2)' : latestEvent.event_type.startsWith('payment_link') ? '1px solid rgba(99,102,241,0.2)' : '1px solid rgba(163,230,53,0.1)'
                        }}>
                          Latest: {latestEvent.event_type}
                        </span>
                      )}

                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Clock size={12} /> {latestEvent ? new Date(latestEvent.created_at).toLocaleString() : ''}
                      </span>
                    </div>
                  </div>

                  {/* Expanded Logs Panel */}
                  {isExpanded && (
                    <div style={{ padding: '1rem 1.5rem', background: 'rgba(0,0,0,0.1)', borderTop: '1px solid var(--border)' }}>
                      <table className="admin-table" style={{ background: 'transparent', boxShadow: 'none', border: 'none' }}>
                        <thead>
                          <tr style={{ background: 'transparent' }}>
                            <th style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border)', fontSize: '0.75rem' }}>Timestamp</th>
                            <th style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border)', fontSize: '0.75rem' }}>Event Type</th>
                            <th style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border)', fontSize: '0.75rem' }}>IDs (Payment/Order/Subscription)</th>
                            <th style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border)', fontSize: '0.75rem' }}>Status</th>
                            <th style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border)', fontSize: '0.75rem', textAlign: 'right' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.events.map(log => {
                            const isPayloadOpen = !!expandedPayloads[log.id];
                            return (
                              <React.Fragment key={log.id}>
                                <tr style={{ background: 'transparent' }}>
                                  <td style={{ padding: '0.75rem 0.75rem', borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                    {new Date(log.created_at).toLocaleString()}
                                  </td>
                                  <td style={{ padding: '0.75rem 0.75rem', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                    <span className="event-badge" style={{ 
                                      background: log.event_type.startsWith('subscription') ? 'rgba(59, 130, 246, 0.1)' : log.event_type.startsWith('payment_link') ? 'rgba(99,102,241,0.1)' : 'rgba(163,230,53,0.06)',
                                      color: log.event_type.startsWith('subscription') ? '#60a5fa' : log.event_type.startsWith('payment_link') ? '#818cf8' : 'var(--lime-400)',
                                      border: 'none',
                                      fontSize: '0.7rem'
                                    }}>{log.event_type}</span>
                                  </td>
                                  <td style={{ padding: '0.75rem 0.75rem', borderBottom: '1px solid rgba(255,255,255,0.03)', fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                      {log.payment_id && <span>Pay: {log.payment_id}</span>}
                                      {log.order_id && <span>Link/Ord: {log.order_id}</span>}
                                      {!log.payment_id && !log.order_id && <span>-</span>}
                                    </div>
                                  </td>
                                  <td style={{ padding: '0.75rem 0.75rem', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                    <span className={`status-dot ${log.status === 'received' ? 'success' : ''}`} style={{ fontSize: '0.8rem' }}>
                                      {log.status}
                                    </span>
                                  </td>
                                  <td style={{ padding: '0.75rem 0.75rem', borderBottom: '1px solid rgba(255,255,255,0.03)', textAlign: 'right' }}>
                                    <button 
                                      onClick={() => togglePayload(log.id)}
                                      className="btn-sync"
                                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem', height: 'auto' }}
                                    >
                                      {isPayloadOpen ? 'Hide Payload' : 'View Payload'}
                                    </button>
                                  </td>
                                </tr>
                                
                                {isPayloadOpen && (
                                  <tr>
                                    <td colSpan="5" style={{ padding: '1rem', background: 'var(--surface-3)', borderBottom: '1px solid var(--border)' }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Raw JSON Payload</span>
                                        <button 
                                          onClick={() => {
                                            navigator.clipboard.writeText(JSON.stringify(log.payload, null, 2));
                                            alert('Payload copied to clipboard!');
                                          }}
                                          className="btn-sync" 
                                          style={{ padding: '0.2rem 0.4rem', fontSize: '0.65rem' }}
                                        >
                                          Copy JSON
                                        </button>
                                      </div>
                                      <pre style={{
                                        margin: 0,
                                        padding: '1rem',
                                        background: 'var(--bg)',
                                        borderRadius: '4px',
                                        color: 'var(--lime-400)',
                                        fontFamily: 'monospace',
                                        fontSize: '0.75rem',
                                        overflowX: 'auto',
                                        maxHeight: '250px',
                                        overflowY: 'auto'
                                      }}>
                                        {JSON.stringify(log.payload, null, 2)}
                                      </pre>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  const renderRetargeting = () => {
    // Determine the filtered candidates based on the selected segment and date filter
    let segmentedCandidates = candidates.filter(p => isWithinDateRange(p.last_active_date || p.created_at, dateFilter));
    
    if (retargetSegment === 'preauth') {
      segmentedCandidates = leads
        .filter(lead => lead.email !== 'admin.tarmac@gmail.com' && isWithinDateRange(lead.created_at, dateFilter))
        .map(lead => ({
          id: lead.id,
          full_name: 'Anonymous (Pre-Auth)',
          last_active_date: new Date(lead.created_at).toLocaleString(),
          visits: 0,
          payment_attempts: 0,
          phone: lead.phone,
          email: lead.email,
          is_preauth: true
        }));
    } else if (retargetSegment === 'dropped') {
      segmentedCandidates = candidates.filter(p => p.payment_attempts > 0 && !p.is_paid && isWithinDateRange(p.last_active_date || p.created_at, dateFilter));
    } else if (retargetSegment === 'free') {
      segmentedCandidates = candidates.filter(p => p.payment_attempts === 0 && !p.is_paid && isWithinDateRange(p.last_active_date || p.created_at, dateFilter));
    } else if (retargetSegment === 'no_contact') {
      segmentedCandidates = candidates.filter(p => !p.phone && !p.email && isWithinDateRange(p.last_active_date || p.created_at, dateFilter));
    } else if (retargetSegment !== 'all') {
      // Filter by journey path
      const targetPath = retargetSegment; 
      segmentedCandidates = candidates.filter(p => {
        if (p.is_paid) return false; // Usually we only retarget free users
        if (!isWithinDateRange(p.last_active_date || p.created_at, dateFilter)) return false;
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
      setEmailSuccess(false);
      setEmailError('');
    };

    return (
      <div className="tab-content">
        <div className="tab-header">
          <div>
            <h2>Behavioral Retargeting</h2>
            <p>Target specific segments based on their exploration behavior.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <select 
              value={dateFilter} 
              onChange={(e) => setDateFilter(e.target.value)}
              className="filter-select"
              style={{ 
                padding: '0.5rem 1rem', 
                background: 'var(--surface-2)', 
                color: 'var(--text-primary)', 
                border: '1px solid var(--border)', 
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.85rem'
              }}
            >
              <option value="all">All Time</option>
              <option value="30m">Last 30 Minutes</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days (1 Month)</option>
            </select>
            <select 
              className="filter-select" 
              value={retargetSegment} 
              onChange={(e) => setRetargetSegment(e.target.value)}
              style={{ 
                padding: '0.5rem 1rem', 
                background: 'var(--surface-2)', 
                color: 'var(--text-primary)', 
                border: '1px solid var(--border)', 
                borderRadius: 'var(--radius-sm)',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              <option value="all">All Profiles</option>
              <option value="preauth">Pre-Auth Leads (Dropped at Signup)</option>
              <option value="free">All Free Users</option>
              <option value="dropped">Dropped at Checkout (High Intent)</option>
              <option value="no_contact">⚠️ Missing Contact Info</option>
              <option value="/pricing">Viewed Pricing Page</option>
              <option value="/questions">Explored Question Bank</option>
              <option value="/mock">Explored Mock Interviews</option>
              <option value="/companies">Explored Companies</option>
              <option value="/resources">Explored Resources</option>
            </select>
          </div>
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
                        {u.phone && (
                          <a
                            href={`https://wa.me/${u.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hi ${u.full_name || 'there'}, this is Arijit from Tarmac Prep!`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-sync"
                            style={{textDecoration: 'none', padding: '0.35rem 0.6rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem', background: '#25D366', color: '#fff', borderRadius: '4px'}}
                          >
                            <Phone size={12}/> WhatsApp
                          </a>
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

  const [resetConfirm, setResetConfirm] = useState('');
  const [resetting, setResetting] = useState(false);
  const [resetMsg, setResetMsg] = useState(null);

  const handleAnalyticsReset = async () => {
    if (resetConfirm !== 'RESET') {
      setResetMsg({ type: 'error', text: 'Type RESET exactly to confirm.' });
      return;
    }
    setResetting(true);
    setResetMsg(null);
    try {
      const res = await fetch('/api/admin-reset-analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmToken: 'RESET' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResetMsg({ type: 'success', text: 'All analytics and leads cleared successfully.' });
      setResetConfirm('');
      fetchProfiles(); // refresh data
    } catch (err) {
      setResetMsg({ type: 'error', text: err.message });
    } finally {
      setResetting(false);
    }
  };

  const [adminEmailInput, setAdminEmailInput] = useState('');
  const [addingAdmin, setAddingAdmin] = useState(false);
  const [adminMsg, setAdminMsg] = useState(null);

  // Grant Admin Access
  const handleGrantAdmin = async (e) => {
    e.preventDefault();
    if (!adminEmailInput.trim()) return;
    
    setAddingAdmin(true);
    setAdminMsg(null);
    try {
      // Find candidate by email first
      const { data: candidate, error: findError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('email', adminEmailInput.trim().toLowerCase())
        .maybeSingle();
      
      if (findError) throw findError;
      if (!candidate) {
        throw new Error(`No registered user found with email "${adminEmailInput}". They must sign up first.`);
      }

      // Update their is_admin column to true
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ is_admin: true })
        .eq('id', candidate.id);
      
      if (updateError) throw updateError;

      setAdminMsg({ type: 'success', text: `Successfully granted Administrator access to ${candidate.full_name || adminEmailInput}.` });
      setAdminEmailInput('');
      fetchProfiles(); // reload lists
    } catch (err) {
      setAdminMsg({ type: 'error', text: err.message || 'Failed to grant admin access.' });
    } finally {
      setAddingAdmin(false);
    }
  };

  // Revoke Admin Access
  const handleRevokeAdmin = async (adminId, adminEmail, adminName) => {
    if (adminEmail === user?.email) {
      alert("Safety Lock: You cannot revoke your own administrator access.");
      return;
    }

    if (!confirm(`Are you sure you want to revoke administrator access for ${adminName || adminEmail}?`)) {
      return;
    }

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ is_admin: false })
        .eq('id', adminId);

      if (updateError) throw updateError;

      alert(`Successfully revoked Administrator access for ${adminName || adminEmail}.`);
      fetchProfiles(); // reload lists
    } catch (err) {
      alert('Failed to revoke admin access: ' + err.message);
    }
  };

  const renderSettings = () => (
    <div className="tab-content">
      <div className="tab-header">
        <div>
          <h2>System Settings</h2>
          <p>Configure payment gateways and integrations.</p>
        </div>
      </div>
      {/* Browser Storage Clear - Testing Utility */}
      <div className="settings-card" style={{ borderLeft: '4px solid #a78bfa', marginBottom: '1.5rem' }}>
        <h3 style={{ color: '#a78bfa', marginBottom: '0.5rem' }}>🧪 Testing Utility — Clear Browser Storage</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
          Clears all Tarmac localStorage keys (phone flags, guest analytics, auth tokens) for <strong>this browser only</strong>. 
          Use this to simulate a fresh user visiting the site so you can test the phone capture flow again.
        </p>
        <button
          className="btn-generate"
          style={{ background: '#a78bfa', color: '#000' }}
          onClick={() => {
            const keysToRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key && (key.startsWith('tarmac_') || key.startsWith('sb-'))) {
                keysToRemove.push(key);
              }
            }
            keysToRemove.forEach(k => localStorage.removeItem(k));
            alert(`✅ Cleared ${keysToRemove.length} keys:\n${keysToRemove.join('\n')}\n\nReloading...`);
            window.location.href = '/login';
          }}
        >
          Clear My Browser Storage & Go to Login
        </button>
      </div>

      {/* Webhook & Admin Backfill Utility */}
      <div className="settings-card" style={{ borderLeft: '4px solid var(--lime-500)', marginBottom: '1.5rem' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
          <Activity size={18} style={{ color: 'var(--lime-400)' }} /> Webhook Logs Backfill & Admin Repair
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
          Runs an administrative routine to force `is_admin=true` for admin.tarmac@gmail.com and matches older webhook logs to their respective registered student profiles using emails, contacts, or payload notes.
        </p>
        {backfillMsg && (
          <div style={{ 
            padding: '0.75rem', borderRadius: '6px', marginBottom: '1.25rem', fontSize: '0.85rem',
            background: backfillMsg.type === 'success' ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)',
            border: `1px solid ${backfillMsg.type === 'success' ? 'var(--lime-500)' : '#ef4444'}`,
            color: backfillMsg.type === 'success' ? 'var(--lime-500)' : '#ef4444',
            whiteSpace: 'pre-wrap',
            maxHeight: '200px',
            overflowY: 'auto',
            fontFamily: 'monospace'
          }}>
            {backfillMsg.text}
          </div>
        )}
        <button
          className="btn-generate"
          style={{ background: 'var(--lime-500)', color: '#000' }}
          disabled={runningBackfill}
          onClick={handleRunBackfill}
        >
          {runningBackfill ? 'Running Repair & Backfill...' : 'Run Repair & Backfill Utility'}
        </button>
      </div>

      {/* Administrator Management */}
      <div className="settings-card" style={{ marginBottom: '1.5rem', borderLeft: '4px solid var(--lime-500)' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
          <Shield size={18} style={{ color: 'var(--lime-400)' }} /> Manage Administrators
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
          Grant or revoke admin permissions. Administrators can access the Admin Console, view payments, analyze candidate journeys, and send emails.
        </p>

        {/* Admin Form */}
        <form onSubmit={handleGrantAdmin} style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <input
            type="email"
            value={adminEmailInput}
            onChange={e => { setAdminEmailInput(e.target.value); setAdminMsg(null); }}
            placeholder="enter-new-admin-email@gmail.com"
            disabled={addingAdmin}
            style={{ 
              flex: 1, minWidth: '240px', padding: '0.55rem 0.75rem', 
              background: 'var(--surface-3)', border: '1px solid var(--border)',
              borderRadius: '6px', color: 'var(--text-primary)', fontSize: '0.9rem'
            }}
            required
          />
          <button
            type="submit"
            className="btn-primary"
            disabled={addingAdmin}
            style={{ padding: '0.55rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--lime-500)', color: '#000' }}
          >
            {addingAdmin ? 'Granting...' : 'Grant Admin Access'}
          </button>
        </form>

        {adminMsg && (
          <div style={{ 
            padding: '0.75rem', borderRadius: '6px', marginBottom: '1.25rem', fontSize: '0.85rem',
            background: adminMsg.type === 'success' ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)',
            border: `1px solid ${adminMsg.type === 'success' ? 'var(--lime-500)' : '#ef4444'}`,
            color: adminMsg.type === 'success' ? 'var(--lime-500)' : '#ef4444',
          }}>
            {adminMsg.text}
          </div>
        )}

        {/* Admin List Table */}
        <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--surface-2)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-3)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '0.75rem 1rem' }}>Name</th>
                <th style={{ padding: '0.75rem 1rem' }}>Email</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {profiles.filter(p => p.is_admin || p.email === 'admin.tarmac@gmail.com').map(adminUser => (
                <tr key={adminUser.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', color: 'var(--text-secondary)' }}>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                    {adminUser.full_name || 'Admin User'}
                    {adminUser.email === user?.email && <span style={{ marginLeft: '0.5rem', fontSize: '0.7rem', color: 'var(--lime-400)', background: 'rgba(163,230,53,0.1)', padding: '2px 6px', borderRadius: '4px' }}>You</span>}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>{adminUser.email}</td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                    {adminUser.email === user?.email ? (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', paddingRight: '0.5rem' }}>Protected</span>
                    ) : (
                      <button
                        onClick={() => handleRevokeAdmin(adminUser.id, adminUser.email, adminUser.full_name)}
                        style={{
                          background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer',
                          fontSize: '0.8rem', fontWeight: 600, padding: '2px 8px'
                        }}
                        onMouseEnter={e => e.target.style.textDecoration = 'underline'}
                        onMouseLeave={e => e.target.style.textDecoration = 'none'}
                      >
                        Revoke Access
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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

      {/* Danger Zone */}
      <div className="settings-card" style={{ borderLeft: '4px solid #ef4444', marginTop: '1.5rem' }}>
        <h3 style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={18} /> Danger Zone — Reset All Analytics
        </h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem', fontSize: '0.85rem' }}>
          This will wipe all <strong>streak_history</strong> (visits, journeys, payment attempts) from every profile, and delete all pre-auth leads. 
          Phone numbers and emails stored in dedicated columns will <strong>NOT</strong> be affected.
          This action is <strong>irreversible</strong>.
        </p>
        {resetMsg && (
          <div style={{ 
            padding: '0.75rem', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.85rem',
            background: resetMsg.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
            border: `1px solid ${resetMsg.type === 'success' ? 'var(--lime-500)' : '#ef4444'}`,
            color: resetMsg.type === 'success' ? 'var(--lime-500)' : '#ef4444',
          }}>
            {resetMsg.text}
          </div>
        )}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            value={resetConfirm}
            onChange={e => { setResetConfirm(e.target.value); setResetMsg(null); }}
            placeholder='Type "RESET" to confirm'
            style={{ 
              flex: 1, minWidth: '200px', padding: '0.5rem 0.75rem', 
              background: 'var(--surface-3)', border: '1px solid #ef4444',
              borderRadius: '4px', color: 'var(--text-primary)', fontSize: '0.9rem'
            }}
          />
          <button
            onClick={handleAnalyticsReset}
            disabled={resetting || resetConfirm !== 'RESET'}
            style={{
              padding: '0.5rem 1.25rem', borderRadius: '4px', border: 'none', cursor: 'pointer',
              background: resetting || resetConfirm !== 'RESET' ? '#555' : '#ef4444',
              color: '#fff', fontWeight: 600, fontSize: '0.85rem',
              opacity: resetting || resetConfirm !== 'RESET' ? 0.6 : 1
            }}
          >
            {resetting ? 'Resetting...' : 'Wipe All Analytics'}
          </button>
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
        <div className="modal-overlay" onClick={() => !sendingEmail && setShowEmailModal(false)}>
          <div className="modal-content admin-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Draft Email to Candidate</h3>
              <button className="close-btn" onClick={() => setShowEmailModal(false)} disabled={sendingEmail}><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSendEmail} className="admin-form" style={{ marginTop: '1rem' }}>
              {emailSuccess && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--lime-500)', color: 'var(--lime-500)', padding: '0.75rem', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.85rem' }}>
                  <CheckCircle size={16} />
                  <span>Email sent successfully!</span>
                </div>
              )}
              {emailError && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444', padding: '0.75rem', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.85rem' }}>
                  <AlertCircle size={16} />
                  <span>{emailError}</span>
                </div>
              )}

              <div className="form-group">
                <label>To:</label>
                <input 
                  type="text" 
                  value={emailDraft.to} 
                  onChange={e => setEmailDraft({...emailDraft, to: e.target.value})}
                  placeholder="Candidate Email (required)"
                  required
                  disabled={sendingEmail}
                />
              </div>
              
              <div className="form-group">
                <label>Subject:</label>
                <input 
                  type="text" 
                  value={emailDraft.subject} 
                  onChange={e => setEmailDraft({...emailDraft, subject: e.target.value})}
                  placeholder="Email Subject"
                  required
                  disabled={sendingEmail}
                />
              </div>
              
              <div className="form-group">
                <label>Body:</label>
                <textarea 
                  value={emailDraft.body} 
                  onChange={e => setEmailDraft({...emailDraft, body: e.target.value})}
                  rows={8}
                  style={{ fontFamily: 'inherit' }}
                  required
                  disabled={sendingEmail}
                />
              </div>

              <div className="modal-actions" style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={() => {
                    handleCopy(emailDraft.body);
                    alert("Email body copied to clipboard!");
                  }}
                  style={{ flex: '1 1 120px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
                  disabled={sendingEmail}
                >
                  <Copy size={16} /> Copy Body
                </button>
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={() => {
                    const mailtoStr = `mailto:${emailDraft.to}?subject=${encodeURIComponent(emailDraft.subject)}&body=${encodeURIComponent(emailDraft.body)}`;
                    window.location.href = mailtoStr;
                  }}
                  style={{ flex: '1 1 120px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
                  disabled={sendingEmail}
                >
                  <Mail size={16} /> Open Mail Client
                </button>
                <button 
                  type="submit" 
                  className="btn-primary" 
                  disabled={sendingEmail || !emailDraft.to}
                  style={{ flex: '1 1 150px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', background: 'var(--lime-500)', color: '#000' }}
                >
                  <Mail size={16} /> {sendingEmail ? 'Sending...' : 'Send Email'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
