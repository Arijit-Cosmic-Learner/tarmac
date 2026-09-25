import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Save, Edit2, CheckCircle, AlertCircle, Phone, 
  CreditCard, History, Copy, Check, ArrowRight,
  ShieldCheck, Calendar, Clock, Repeat, Layers
} from 'lucide-react';
import './Account.css';

export default function Account() {
  const { user, profile, isPaid, daysLeft, refreshProfile, updateUserMetadata } = useAuth();

  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'billing'
  const [payments, setPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  const [cancelLoading, setCancelLoading] = useState(false);
  const [pauseLoading, setPauseLoading] = useState(false);
  const [resumeLoading, setResumeLoading] = useState(false);
  const [cancelStatus, setCancelStatus] = useState(null); // { type: 'success' | 'error', message: '' }
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const handleCancelSubscription = async () => {
    if (!profile?.razorpay_subscription_id) return;
    
    setCancelLoading(true);
    setCancelStatus(null);
    
    try {
      const res = await fetch('/api/cancel-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriptionId: profile.razorpay_subscription_id,
          userId: user.id
        })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to cancel subscription');
      
      setCancelStatus({
        type: 'success',
        message: 'Your subscription has been successfully scheduled for cancellation at the end of the current billing cycle.'
      });
      setShowCancelConfirm(false);
      await refreshProfile();
    } catch (err) {
      console.error('Cancellation error:', err);
      setCancelStatus({
        type: 'error',
        message: err.message || 'Failed to cancel subscription. Please contact support.'
      });
    } finally {
      setCancelLoading(false);
    }
  };

  const handlePauseSubscription = async () => {
    if (!profile?.razorpay_subscription_id) return;
    
    setPauseLoading(true);
    setCancelStatus(null);
    
    try {
      const res = await fetch('/api/pause-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriptionId: profile.razorpay_subscription_id,
          userId: user.id
        })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to pause subscription');
      
      setCancelStatus({
        type: 'success',
        message: 'Your subscription has been successfully paused immediately.'
      });
      setShowCancelConfirm(false);
      await refreshProfile();
    } catch (err) {
      console.error('Pause error:', err);
      setCancelStatus({
        type: 'error',
        message: err.message || 'Failed to pause subscription. Please contact support.'
      });
    } finally {
      setPauseLoading(false);
    }
  };

  const handleResumeSubscription = async () => {
    if (!profile?.razorpay_subscription_id) return;
    
    setResumeLoading(true);
    setCancelStatus(null);
    
    try {
      const res = await fetch('/api/resume-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriptionId: profile.razorpay_subscription_id,
          userId: user.id
        })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to resume subscription');
      
      setCancelStatus({
        type: 'success',
        message: 'Your subscription has been successfully resumed!'
      });
      await refreshProfile();
    } catch (err) {
      console.error('Resume error:', err);
      setCancelStatus({
        type: 'error',
        message: err.message || 'Failed to resume subscription. Please contact support.'
      });
    } finally {
      setResumeLoading(false);
    }
  };

  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    company: '',
    role: '',
    linkedin: ''
  });

  // Track original values to detect dirty state
  const originalRef = useRef({});

  // Pre-fill form when user object loads
  useEffect(() => {
    if (user) {
      const initial = {
        full_name: user.name || '',
        phone: user.phone || '',   // Reads from profiles.phone via context
        company: user.company || '',
        role: user.role || '',
        linkedin: user.linkedin || ''
      };
      setFormData(initial);
      originalRef.current = initial;
    }
  }, [user?.id]);

  // Fetch candidate payments when Billing tab is opened
  useEffect(() => {
    if (activeTab === 'billing' && user?.id) {
      setPaymentsLoading(true);
      fetch(`/api/my-payments?userId=${user.id}`)
        .then(res => res.json())
        .then(data => {
          setPayments(Array.isArray(data) ? data : []);
          setPaymentsLoading(false);
        })
        .catch(err => {
          console.error('Failed to load payments:', err);
          setPaymentsLoading(false);
        });
    }
  }, [activeTab, user?.id]);

  // Trigger refresh on mount to ensure we have latest billing state
  useEffect(() => {
    if (user?.id) {
      refreshProfile();
    }
  }, [user?.id]);

  // Whether the user has made any changes vs what's saved
  const isDirty = (
    formData.full_name !== (originalRef.current.full_name || '') ||
    formData.phone !== (originalRef.current.phone || '') ||
    formData.company !== (originalRef.current.company || '') ||
    formData.role !== (originalRef.current.role || '') ||
    formData.linkedin !== (originalRef.current.linkedin || '')
  );

  // Whether the user has any saved details at all
  const hasSavedDetails = !!(
    originalRef.current.phone ||
    originalRef.current.company ||
    originalRef.current.role ||
    originalRef.current.linkedin ||
    originalRef.current.full_name
  );

  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState(null); // { type: 'success' | 'error', message: '' }

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setStatus(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isDirty) return; // Nothing changed, don't submit
    
    setIsSaving(true);
    setStatus(null);

    try {
      await updateUserMetadata({
        full_name: formData.full_name,
        phone: formData.phone,
        company: formData.company,
        role: formData.role,
        linkedin: formData.linkedin
      });
      // Update the ref so isDirty becomes false
      originalRef.current = { ...formData };
      setStatus({ type: 'success', message: 'Account details saved successfully!' });
    } catch (err) {
      console.error('Save error:', err);
      setStatus({ type: 'error', message: err.message || 'Failed to save. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopy = (id) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getButtonLabel = () => {
    if (isSaving) return 'Saving...';
    if (isDirty) return 'Save Changes';
    if (hasSavedDetails) return 'Edit Details';
    return 'Save Details';
  };

  const getButtonIcon = () => {
    if (isDirty || !hasSavedDetails) return <Save size={18} />;
    return <Edit2 size={18} />;
  };

  const getPlanTitle = () => {
    if (!isPaid) return 'Free Tier Plan';
    const isSub = !!profile?.razorpay_subscription_id;
    const tier = profile?.access_type === 'all' ? 'All-Access' : 'Role-Specific';
    const roleLabel = profile?.access_role === 'PSE' ? 'Solutions Engineer' :
                      profile?.access_role === 'TAM' ? 'Technical Account Manager' :
                      profile?.access_role === 'Tech Support' ? 'Product Support' : profile?.access_role;
    
    const typeLabel = isSub ? 'Subscription' : '20-Day Pass';
    return tier === 'All-Access' ? `All-Access Pro ${typeLabel}` : `Course Pro: ${roleLabel} ${typeLabel}`;
  };

  return (
    <div className="account-page">
      <div className="account-container">
        <div className="account-header">
          <h1>Account Settings</h1>
          <p>Manage your candidate profile and track subscription plans.</p>
        </div>

        {/* Tab selection */}
        <div className="account-tabs">
          <button 
            className={`account-tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            Profile Details
          </button>
          <button 
            className={`account-tab-btn ${activeTab === 'billing' ? 'active' : ''}`}
            onClick={() => setActiveTab('billing')}
          >
            Billing & Payments
          </button>
        </div>

        {/* Profile Settings Tab */}
        {activeTab === 'profile' && (
          <>
            {/* Nudge banner: show when phone is missing */}
            {!formData.phone && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                background: 'rgba(163, 230, 53, 0.08)', border: '1px solid var(--lime-500)',
                borderRadius: '8px', padding: '0.9rem 1.25rem', marginBottom: '1.5rem'
              }}>
                <Phone size={18} style={{ color: 'var(--lime-500)', flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>Add your phone number</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>Get interview alerts and exclusive discount offers directly on WhatsApp.</div>
                </div>
              </div>
            )}

            <div className="account-card">
              <form className="account-form" onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="email">Email Address</label>
                  <input 
                    type="email" 
                    id="email"
                    value={user?.email || ''} 
                    disabled 
                    title="Email cannot be changed here"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="full_name">Display Name</label>
                  <input 
                    type="text" 
                    id="full_name" 
                    name="full_name"
                    value={formData.full_name} 
                    onChange={handleChange}
                    placeholder="John Doe"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="phone">Phone Number</label>
                  <input 
                    type="tel" 
                    id="phone" 
                    name="phone"
                    value={formData.phone} 
                    onChange={handleChange}
                    placeholder="+1 (555) 000-0000"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="company">Current Company</label>
                  <input 
                    type="text" 
                    id="company" 
                    name="company"
                    value={formData.company} 
                    onChange={handleChange}
                    placeholder="Google"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="role">Current Role</label>
                  <input 
                    type="text" 
                    id="role" 
                    name="role"
                    value={formData.role} 
                    onChange={handleChange}
                    placeholder="Solutions Engineer"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="linkedin">LinkedIn Profile URL</label>
                  <input 
                    type="url" 
                    id="linkedin" 
                    name="linkedin"
                    value={formData.linkedin} 
                    onChange={handleChange}
                    placeholder="https://linkedin.com/in/username"
                  />
                </div>

                {status && (
                  <div className={`save-status ${status.type}`}>
                    {status.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                    {status.message}
                  </div>
                )}

                <div className="account-actions">
                  <button 
                    type="submit" 
                    className={`btn-save ${isDirty ? 'btn-save--dirty' : ''}`}
                    disabled={isSaving || (!isDirty && hasSavedDetails)}
                  >
                    {isSaving ? (
                      <>
                        <span className="spinner" />
                        Saving...
                      </>
                    ) : (
                      <>
                        {getButtonIcon()}
                        {getButtonLabel()}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </>
        )}

        {/* Billing & Payments History Tab */}
        {activeTab === 'billing' && (
          <div className="billing-section">
            {/* Status Summary Card */}
            <div className="account-card billing-status-card">
              <div className="billing-status-header">
                <div className="billing-status-title">
                  <CreditCard size={18} className="billing-icon" />
                  <span>Current Access</span>
                </div>
                <span className={`billing-badge billing-badge--${isPaid ? 'active' : 'free'}`}>
                  {isPaid ? 'PRO ACTIVE' : 'FREE ACCESS'}
                </span>
              </div>
              
              <div className="billing-plan-info">
                <h3>{getPlanTitle()}</h3>
                
                {isPaid ? (
                  <p className="billing-plan-detail">
                    {profile?.razorpay_subscription_id ? (
                      (() => {
                        const subStatus = profile.subscription_status?.toLowerCase();
                        const nextChargeDate = new Date(profile.paid_until).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        });

                        const latestSubPayment = payments.find(p => p.purchaseType === 'subscription');
                        const tenureLabel = latestSubPayment?.tenureSelected || '3 Months';
                        const currentCharge = latestSubPayment?.chargeCount || 1;
                        const totalCharges = tenureLabel === '12 Months' ? '12' : tenureLabel === '6 Months' ? '6' : tenureLabel === '3 Months' ? '3' : 'selected';

                        if (subStatus === 'cancelled') {
                          return (
                            <>
                              <div style={{ marginBottom: '0.6rem' }}>
                                Subscription Status: <strong style={{ color: '#ef4444' }}>CANCELLED</strong>
                              </div>
                              <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                                Selected Plan commitment: <strong>{tenureLabel} Plan</strong> (auto-renewal is off).
                                <br />
                                Your subscription has been cancelled and no further payments will be charged. 
                                You retain full premium study prep access until the current cycle expires on <strong>{nextChargeDate}</strong>.
                              </div>
                            </>
                          );
                        }

                        return (
                          <>
                            <div style={{ marginBottom: '0.6rem' }}>
                              Subscription Status: <strong className="status-highlight">{profile.subscription_status?.toUpperCase() || 'ACTIVE'}</strong>
                            </div>
                            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                              Selected commitment: <strong>{tenureLabel} Plan</strong> (billed in monthly charges of ₹499).
                              <br />
                              Current period: <strong>Charge #{currentCharge}</strong> of {totalCharges}.
                              <br />
                              <span style={{ color: 'var(--lime-300)', fontWeight: 500 }}>
                                Next Monthly Charge: A fee of <strong>₹499</strong> will process automatically on <strong>{nextChargeDate}</strong> (in {daysLeft} days) to renew your access for the next month.
                              </span>
                            </div>
                          </>
                        );
                      })()
                    ) : (
                      <>
                        Pass validity: <strong>{daysLeft}</strong> days left.
                        <br />
                        Access expires on {new Date(profile?.paid_until).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}.
                      </>
                    )}
                  </p>
                ) : (
                  <p className="billing-plan-detail">
                    You are currently using the Free Plan. Access is limited to initial practice questions.
                  </p>
                )}
              </div>

              {profile?.razorpay_subscription_id && (
                <div className="billing-meta-row">
                  <span className="meta-label">Subscription Ref:</span>
                  <div className="meta-value-copy">
                    <code>{profile.razorpay_subscription_id}</code>
                    <button 
                      className="copy-btn-inline" 
                      onClick={() => handleCopy(profile.razorpay_subscription_id)}
                      title="Copy Subscription ID"
                    >
                      {copiedId === profile.razorpay_subscription_id ? <Check size={13} className="green-check" /> : <Copy size={13} />}
                    </button>
                  </div>
                </div>
              )}

              {profile?.razorpay_subscription_id && (
                <div style={{ marginTop: '1.25rem' }}>
                  {profile.subscription_status === 'paused' ? (
                    <div style={{
                      background: 'rgba(163, 230, 53, 0.04)',
                      border: '1px solid rgba(163, 230, 53, 0.15)',
                      padding: '1.25rem',
                      borderRadius: '10px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem',
                      animation: 'fadeIn 0.2s ease-out'
                    }}>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span style={{ color: '#fbbf24' }}>⏸️</span> Subscription is Paused
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                        Your premium mock interviews, solutions, and company intelligence are temporarily suspended. Resume your subscription to restore full access.
                      </div>
                      <button
                        className="btn-primary"
                        style={{
                          background: 'var(--lime-400)',
                          borderColor: 'var(--lime-400)',
                          color: '#0a0c1b',
                          fontSize: '0.8rem',
                          padding: '0.5rem 1.25rem',
                          fontWeight: 700,
                          borderRadius: '6px',
                          cursor: 'pointer',
                          width: 'fit-content'
                        }}
                        disabled={resumeLoading}
                        onClick={handleResumeSubscription}
                      >
                        {resumeLoading ? 'Resuming...' : 'Resume Subscription'}
                      </button>
                    </div>
                  ) : profile.subscription_status !== 'cancelled' ? (
                    <div>
                      {showCancelConfirm ? (
                        <div style={{
                          background: 'rgba(239, 68, 68, 0.08)',
                          border: '1px solid rgba(239, 68, 68, 0.2)',
                          padding: '1.25rem',
                          borderRadius: '10px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.75rem',
                          animation: 'fadeIn 0.2s ease-out'
                        }}>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 700 }}>
                            Pause or Cancel Subscription?
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                            Would you rather <strong>pause</strong> your billing temporarily? You can resume anytime without losing your mock interview feedback and track progress.
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.25rem' }}>
                            <button
                              className="btn-primary"
                              style={{
                                background: '#fbbf24',
                                borderColor: '#fbbf24',
                                color: '#0a0c1b',
                                fontSize: '0.75rem',
                                padding: '0.45rem 1rem',
                                fontWeight: 700,
                                borderRadius: '6px',
                                cursor: 'pointer'
                              }}
                              disabled={pauseLoading || cancelLoading}
                              onClick={handlePauseSubscription}
                            >
                              {pauseLoading ? 'Pausing...' : 'Pause Billing'}
                            </button>
                            <button
                              className="btn-primary"
                              style={{
                                background: '#ef4444',
                                borderColor: '#ef4444',
                                color: '#fff',
                                fontSize: '0.75rem',
                                padding: '0.45rem 1rem',
                                fontWeight: 700,
                                borderRadius: '6px',
                                cursor: 'pointer'
                              }}
                              disabled={pauseLoading || cancelLoading}
                              onClick={handleCancelSubscription}
                            >
                              {cancelLoading ? 'Cancelling...' : 'Cancel Subscription'}
                            </button>
                            <button
                              className="btn-secondary"
                              style={{ fontSize: '0.75rem', padding: '0.45rem 1rem', borderRadius: '6px', cursor: 'pointer' }}
                              disabled={pauseLoading || cancelLoading}
                              onClick={() => setShowCancelConfirm(false)}
                            >
                              Keep Subscription
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          className="btn-secondary cancel-sub-btn"
                          style={{
                            borderColor: 'rgba(239, 68, 68, 0.3)',
                            color: '#f87171',
                            fontSize: '0.8rem',
                            padding: '0.45rem 1rem',
                            background: 'transparent',
                            fontWeight: 600,
                            borderRadius: '6px',
                            cursor: 'pointer'
                          }}
                          onClick={() => setShowCancelConfirm(true)}
                        >
                          Cancel or Pause Auto-Renewal
                        </button>
                      )}
                    </div>
                  ) : null}
                </div>
              )}

              {cancelStatus && (
                <div className={`save-status ${cancelStatus.type}`} style={{ marginTop: '1rem' }}>
                  {cancelStatus.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                  {cancelStatus.message}
                </div>
              )}

              {!isPaid && (
                <div className="upgrade-callout-card">
                  <div className="upgrade-callout-content">
                    <h4>Supercharge your prep with Pro</h4>
                    <p>Gain unlimited access to AI mock interviews, company intelligence, and premium question banks.</p>
                  </div>
                  <button className="btn-primary upgrade-action-btn" onClick={() => window.location.href = '/pricing'}>
                    Upgrade to Pro <ArrowRight size={15} />
                  </button>
                </div>
              )}
            </div>

            {/* Payment History section (Only visible when payments exist or are loading) */}
            {(paymentsLoading || payments.length > 0) && (
              <div className="account-card payment-history-card" style={{ marginTop: '2.5rem' }}>
                <div className="history-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '1.25rem', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <History size={18} className="billing-icon" />
                    <span>Payment History</span>
                  </div>
                  <span className="history-secured-badge">
                    <ShieldCheck size={12} /> Razorpay Secured
                  </span>
                </div>

                {paymentsLoading ? (
                  <div className="billing-loading-state">
                    <div className="spinner" style={{ borderTopColor: 'var(--lime-400)', width: '24px', height: '24px' }} />
                    <p>Loading transaction logs...</p>
                  </div>
                ) : (
                  <div className="receipts-list">
                    {payments.map(receipt => {
                      const payDate = new Date(receipt.date);
                      const periodEndDate = receipt.periodEnd ? new Date(receipt.periodEnd) : null;

                      // Build payment method chip text
                      let methodChip = null;
                      if (receipt.method === 'card' && receipt.cardNetwork) {
                        methodChip = `${receipt.cardNetwork}${receipt.cardLast4 ? ' ···' + receipt.cardLast4 : ''}`;
                      } else if (receipt.method === 'upi' && receipt.vpa) {
                        methodChip = `UPI · ${receipt.vpa}`;
                      } else if (receipt.method === 'netbanking' && receipt.bank) {
                        methodChip = `Net Banking · ${receipt.bank}`;
                      } else if (receipt.method === 'wallet' && receipt.wallet) {
                        methodChip = `Wallet · ${receipt.wallet}`;
                      } else if (receipt.method) {
                        methodChip = receipt.method.toUpperCase();
                      }

                      return (
                        <div key={receipt.id} className="receipt-card">
                          {/* Top row: description + amount */}
                          <div className="receipt-card-header">
                            <div className="receipt-card-title">
                              <span className="receipt-event-badge">{receipt.eventLabel}</span>
                              <span className="receipt-desc-text">{receipt.description}</span>
                            </div>
                            <div className="receipt-amount-block">
                              <div className="receipt-amount">₹{receipt.amount.toLocaleString('en-IN')}</div>
                              <span className="receipt-status-dot">
                                <span className="dot-green" /> Success
                              </span>
                            </div>
                          </div>

                          {/* Info grid */}
                          <div className="receipt-info-grid">
                            {/* Date purchased */}
                            <div className="receipt-info-cell">
                              <span className="rinfo-label"><Clock size={11} /> Purchased</span>
                              <span className="rinfo-value">
                                {payDate.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                              </span>
                            </div>

                            {/* Valid Until / Next Charge Date */}
                            {periodEndDate && (
                              <div className="receipt-info-cell">
                                <span className="rinfo-label">
                                  <Calendar size={11} /> 
                                  {receipt.purchaseType === 'subscription' ? 'Next Charge' : 'Valid Until'}
                                </span>
                                <span className="rinfo-value rinfo-value--highlight" style={{ display: 'flex', flexDirection: 'column' }}>
                                  <span>{periodEndDate.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                  <span className="valid-month-label" style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 500, marginTop: '0.15rem' }}>
                                    {receipt.purchaseType === 'subscription' 
                                      ? 'Next monthly charge' 
                                      : `Valid through ${receipt.validUntilMonth || ''}`}
                                  </span>
                                </span>
                              </div>
                            )}

                            {/* Tenure purchased */}
                            <div className="receipt-info-cell">
                              <span className="rinfo-label"><Repeat size={11} /> Tenure</span>
                              <span className="rinfo-value">{receipt.tenureSelected}</span>
                            </div>

                            {/* Charge # in sequence */}
                            {receipt.chargeCount != null && (
                              <div className="receipt-info-cell">
                                <span className="rinfo-label"><Layers size={11} /> Charge #</span>
                                <span className="rinfo-value">{receipt.chargeCount}</span>
                              </div>
                            )}

                            {/* Payment method */}
                            {methodChip && (
                              <div className="receipt-info-cell">
                                <span className="rinfo-label"><CreditCard size={11} /> Via</span>
                                <span className="rinfo-value rinfo-value--mono">{methodChip}</span>
                              </div>
                            )}

                            {/* Access type */}
                            <div className="receipt-info-cell">
                              <span className="rinfo-label">Access</span>
                              <span className="rinfo-value">
                                {receipt.accessType === 'all' ? 'All Tracks' : receipt.accessRole || 'Role-Specific'}
                              </span>
                            </div>
                          </div>

                          {/* Simplified PG & Verification Details */}
                          <div className="receipt-security-panel" style={{ background: 'rgba(255, 255, 255, 0.01)', borderTop: '1px dashed var(--border)', padding: '0.85rem 1.25rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                              <ShieldCheck size={12} style={{ color: '#34d399' }} />
                              <span>Secured PG Information</span>
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem 1.5rem', fontSize: '0.75rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                  <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Gateway:</span>
                                  <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Razorpay Secure</span>
                                </div>
                                {receipt.paymentId && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                    <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Payment ID:</span>
                                    <span style={{ fontFamily: 'monospace', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.03)', padding: '0.1rem 0.35rem', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                      {receipt.paymentId}
                                      <button className="copy-btn-inline" onClick={() => handleCopy(receipt.paymentId)} style={{ padding: 0, background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignSelf: 'center' }}>
                                        {copiedId === receipt.paymentId ? <Check size={11} style={{ color: '#34d399' }} /> : <Copy size={11} style={{ color: 'var(--text-muted)' }} />}
                                      </button>
                                    </span>
                                  </div>
                                )}
                                {receipt.subscriptionId && receipt.purchaseType === 'subscription' && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                    <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Subscription ID:</span>
                                    <span style={{ fontFamily: 'monospace', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.03)', padding: '0.1rem 0.35rem', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                      {receipt.subscriptionId}
                                      <button className="copy-btn-inline" onClick={() => handleCopy(receipt.subscriptionId)} style={{ padding: 0, background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignSelf: 'center' }}>
                                        {copiedId === receipt.subscriptionId ? <Check size={11} style={{ color: '#34d399' }} /> : <Copy size={11} style={{ color: 'var(--text-muted)' }} />}
                                      </button>
                                    </span>
                                  </div>
                                )}
                              </div>
                              <div className="receipt-verified-chip" style={{ margin: 0, padding: '0.2rem 0.5rem', background: 'rgba(52, 211, 153, 0.08)', borderRadius: '20px', border: '1px solid rgba(52, 211, 153, 0.15)', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.68rem', fontWeight: 600, color: '#34d399' }}>
                                <ShieldCheck size={11} /> Verified by Razorpay
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
