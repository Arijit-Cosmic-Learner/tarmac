import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Check, Zap, Loader } from 'lucide-react';
import { trackEvent } from '../lib/analytics';
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

// Dynamically load the Razorpay checkout script
function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function Pricing() {
  const { user, isPaid, accessType, accessRole, subscriptionStatus, refreshProfile } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const reason = searchParams.get('reason');

  const initialTab = searchParams.get('tab') === 'subscription' ? 'subscription' : 'pass';
  const [activeTab, setActiveTab] = useState(initialTab); // 'pass' | 'subscription'
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null); // 'success' | 'error' | 'info' | 'warning' | null
  const [paymentMessage, setPaymentMessage] = useState('');

  // Dropdown states
  const [passRole, setPassRole] = useState('PSE'); // 'PSE' | 'TAM' | 'Tech Support'
  const [subRole, setSubRole] = useState('PSE'); // 'PSE' | 'TAM' | 'Tech Support'
  const [allAccessTenure, setAllAccessTenure] = useState(3); // default 3 months
  const [roleTenure, setRoleTenure] = useState(3); // default 3 months

  // Pre-load Razorpay script on mount
  useEffect(() => {
    loadRazorpayScript();
  }, []);

  // Sync activeTab with URL tab param changes
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'pass' || tabParam === 'subscription') {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const handleCheckout = async (purchaseType, tier, role = 'all', months = 1) => {
    if (!user) {
      navigate('/login?tab=signup');
      return;
    }

    setCheckoutLoading(true);
    setPaymentStatus(null);
    setPaymentMessage('');

    // Track payment attempt event
    trackEvent('payment_attempt', { purchaseType, tier, role, months }, user?.id);

    // Step 1: Ensure Razorpay script is loaded
    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded) {
      setPaymentStatus('error');
      setPaymentMessage('Failed to load payment gateway. Please check your connection and try again.');
      setCheckoutLoading(false);
      return;
    }

    const isSubscription = purchaseType === 'subscription';

    // Step 2: Initialize transaction on backend (order or subscription)
    let checkData = null;
    try {
      if (isSubscription) {
        // Create dynamic monthly subscription plan
        const res = await fetch('/api/create-subscription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            planType: tier, // 'all' or 'role'
            accessRole: tier === 'role' ? role : 'all',
            tenure: months,
          }),
        });
        checkData = await res.json();
        if (!res.ok) throw new Error(checkData.error || 'Could not initiate subscription');
      } else {
        // Create standard order for passes
        const amount = tier === 'all' ? 69900 : 29900; // ₹699 vs ₹299
        const res = await fetch('/api/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount,
            currency: 'INR',
            userId: user.id,
            purchaseType: 'pass',
            accessType: tier,
            accessRole: tier === 'role' ? role : 'all',
          }),
        });
        checkData = await res.json();
        if (!res.ok) throw new Error(checkData.error || 'Could not initiate order');
      }
    } catch (err) {
      setPaymentStatus('error');
      setPaymentMessage(err.message || 'Failed to initiate payment. Please try again.');
      setCheckoutLoading(false);
      return;
    }

    setCheckoutLoading(false);

    // Step 3: Open Razorpay checkout modal
    const options = {
      key: 'rzp_test_Suhia3L6uLade0',
      name: 'Tarmac',
      description: isSubscription 
        ? `${tier === 'all' ? 'All-Access' : role} Subscription`
        : `${tier === 'all' ? 'All-Access' : role} 20-Day Pass`,
      image: `${window.location.origin}/tarmac-icon-transparent.svg`,
      prefill: {
        name: user?.name || '',
        email: user?.email || '',
        contact: user?.phone || '',
      },
      notes: {
        userId: user.id,
        purchaseType,
        accessType: tier,
        accessRole: tier === 'role' ? role : 'all',
        tenure: isSubscription ? String(months) : '0',
      },
      theme: {
        color: '#0d0d0d',
      },

      // Checkout Success Handler
      handler: async function (response) {
        setCheckoutLoading(true);
        setPaymentStatus('info');
        setPaymentMessage('Verifying signature with bank...');

        try {
          const verifyPayload = {
            userId: user.id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            purchaseType,
            accessType: tier,
            accessRole: tier === 'role' ? role : 'all',
            tenure: months,
          };

          if (isSubscription) {
            verifyPayload.razorpay_subscription_id = response.razorpay_subscription_id;
          } else {
            verifyPayload.razorpay_order_id = response.razorpay_order_id;
          }

          const verifyRes = await fetch('/api/verify-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(verifyPayload),
          });

          const verifyData = await verifyRes.json();
          if (!verifyRes.ok) throw new Error(verifyData.error || 'Signature check failed');

          setPaymentMessage('Signature verified. Activating access...');

          // Start polling backend status
          const maxAttempts = 15;
          let attempt = 0;

          const pollInterval = setInterval(async () => {
            attempt++;
            try {
              const checkRes = await fetch(
                `/api/check-payment-status?userId=${user.id}&paymentId=${response.razorpay_payment_id}`
              );
              const checkStatusData = await checkRes.json();

              if (checkRes.ok && checkStatusData.isPaid) {
                clearInterval(pollInterval);
                await refreshProfile();
                setPaymentStatus('success');
                setPaymentMessage('🎉 Welcome! Access to your selected prep plan is active.');
                setCheckoutLoading(false);
              } else if (attempt >= maxAttempts) {
                clearInterval(pollInterval);
                setPaymentStatus('warning');
                setPaymentMessage(`Payment verified, but activation is taking longer. Please refresh this page or contact support with payment ID: ${response.razorpay_payment_id}`);
                setCheckoutLoading(false);
              } else {
                setPaymentMessage(`Activating your prep plan... (Attempt ${attempt}/${maxAttempts})`);
              }
            } catch (err) {
              console.error('Polling payment status error:', err);
              if (attempt >= maxAttempts) {
                clearInterval(pollInterval);
                setPaymentStatus('warning');
                setPaymentMessage(`Payment verified, but checking activation status failed. Please refresh or contact support with payment ID: ${response.razorpay_payment_id}`);
                setCheckoutLoading(false);
              }
            }
          }, 2000);

        } catch (err) {
          setPaymentStatus('error');
          setPaymentMessage(`Payment verification failed: ${err.message}. Please contact support with payment ID: ${response.razorpay_payment_id}`);
          setCheckoutLoading(false);
        }
      },

      modal: {
        ondismiss: () => {
          setCheckoutLoading(false);
        },
      },
    };

    if (isSubscription) {
      options.subscription_id = checkData.subscription_id;
    } else {
      options.order_id = checkData.order_id;
      options.amount = checkData.amount;
      options.currency = checkData.currency;
    }

    const rzp = new window.Razorpay(options);
    rzp.on('payment.failed', function (response) {
      setPaymentStatus('error');
      setPaymentMessage(`Payment failed: ${response.error.description}. Reason: ${response.error.reason}. Please try again.`);
    });

    rzp.open();
  };

  const getRoleLabel = (roleKey) => {
    if (roleKey === 'PSE') return 'Solutions Engineer';
    if (roleKey === 'TAM') return 'Technical Account Manager';
    if (roleKey === 'Tech Support') return 'Product Support Engineer';
    return roleKey;
  };

  return (
    <div className="pricing-page page-enter">
      <div className="pricing-bg-glow" />
      <div className="page-content">
        <div className="pricing-header">
          <div className="pricing-pill">Honest Pricing</div>
          <h1>Choose your <span className="gradient-text">prep pathway</span></h1>
          <p className="pricing-sub">
            Pick a one-time pass for immediate short-term prep or start a subscription for continuous recurring learning.
          </p>
        </div>

        {/* Expired lockout prompt */}
        {reason === 'expired' && (
          <div className="pricing-warning-alert">
            <strong>⚠️ Access Window Expired</strong>
            <p>Your 20-day manual pass has expired and the 30-day access window has ended. To continue practicing questions and mock interviews, please continue manual payment or start a subscription below.</p>
          </div>
        )}

        {/* Payment status banner */}
        {paymentStatus && (
          <div className={`payment-banner payment-banner--${paymentStatus}`}>
            {paymentMessage}
          </div>
        )}

        {/* Tab Selection */}
        <div className="pricing-tabs">
          <button 
            className={`pricing-tab-btn ${activeTab === 'pass' ? 'active' : ''}`}
            onClick={() => setActiveTab('pass')}
          >
            One-Time Passes
          </button>
          <button 
            className={`pricing-tab-btn ${activeTab === 'subscription' ? 'active' : ''}`}
            onClick={() => setActiveTab('subscription')}
          >
            Subscriptions
          </button>
        </div>

        {/* Pricing Cards Grid */}
        <div className="pricing-grid">
          {/* Card A: All-Access pass/sub */}
          {activeTab === 'pass' ? (
            // ONE TIME ALL ACCESS
            <div className="pricing-card pro-card">
              <div className="pro-most-popular">Most Popular</div>
              <div className="pricing-card-header">
                <div className="pricing-tier-name pro-tier-name">All-Access Pass</div>
                <div className="pricing-amount-display">
                  <span className="pricing-amount-big">₹699</span>
                  <span className="pricing-per">/20 days</span>
                </div>
                <p className="pricing-card-sub">One-time manual payment. Cutoff after 20 days. 30-day dashboard viewing window.</p>
              </div>
              <div className="features-list">
                <div className="feature-row pro-feature-row">
                  <Check size={15} className="feature-check pro-check" />
                  <span>Unlocks ALL roles (Solutions Engineer, TAM, Tech Support)</span>
                </div>
                {PRO_FEATURES.map(f => (
                  <div key={f} className="feature-row pro-feature-row">
                    <Check size={15} className="feature-check pro-check" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
              <button
                className="btn-primary pricing-cta pro-cta"
                onClick={() => handleCheckout('pass', 'all', 'all')}
                disabled={checkoutLoading || (isPaid && accessType === 'all')}
              >
                {checkoutLoading ? (
                  <><Loader size={16} className="spin" /> Preparing checkout...</>
                ) : isPaid && accessType === 'all' && !subscriptionStatus ? (
                  <>Active All-Access Pass</>
                ) : isPaid && accessType === 'all' && subscriptionStatus === 'active' ? (
                  <>Unlocked via Subscription</>
                ) : (
                  <><Zap size={16} /> Purchase All-Access Pass</>
                )}
              </button>
            </div>
          ) : (
            // RECURRING ALL ACCESS
            <div className="pricing-card pro-card">
              <div className="pro-most-popular">Recurring value</div>
              <div className="pricing-card-header">
                <div className="pricing-tier-name pro-tier-name">All-Access Subscription</div>
                <div className="pricing-amount-display">
                  <span className="pricing-amount-big">₹499</span>
                  <span className="pricing-per">/month</span>
                </div>
                <p className="pricing-card-sub">Recurring subscription. Cancel anytime. Unlocks all features and tracks.</p>
              </div>
              <div className="card-selectors">
                <div className="selector-group">
                  <label>Choose Tenure (Months)</label>
                  <select 
                    className="selector-select" 
                    value={allAccessTenure}
                    onChange={(e) => setAllAccessTenure(parseInt(e.target.value))}
                  >
                    {[1, 2, 3, 4, 5, 6, 12].map(m => (
                      <option key={m} value={m}>{m} {m === 1 ? 'Month' : 'Months'}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="features-list">
                <div className="feature-row pro-feature-row">
                  <Check size={15} className="feature-check pro-check" />
                  <span>Unlocks ALL roles (Solutions Engineer, TAM, Tech Support)</span>
                </div>
                {PRO_FEATURES.map(f => (
                  <div key={f} className="feature-row pro-feature-row">
                    <Check size={15} className="feature-check pro-check" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
              <button
                className="btn-primary pricing-cta pro-cta"
                onClick={() => handleCheckout('subscription', 'all', 'all', allAccessTenure)}
                disabled={checkoutLoading || (isPaid && accessType === 'all' && subscriptionStatus === 'active')}
              >
                {checkoutLoading ? (
                  <><Loader size={16} className="spin" /> Preparing checkout...</>
                ) : isPaid && accessType === 'all' && subscriptionStatus === 'active' ? (
                  <>Active All-Access Subscription</>
                ) : (
                  <><Zap size={16} /> Subscribe All-Access (₹499/mo)</>
                )}
              </button>
            </div>
          )}

          {/* Card B: Role-Specific pass/sub */}
          {activeTab === 'pass' ? (
            // ONE TIME ROLE SPECIFIC
            <div className="pricing-card">
              <div className="pricing-card-header">
                <div className="pricing-tier-name">Role-Specific Pass</div>
                <div className="pricing-amount-display">
                  <span className="pricing-amount-big">₹299</span>
                  <span className="pricing-per">/20 days</span>
                </div>
                <p className="pricing-card-sub">One-time payment for 20 days. Only the chosen role questions and interviews are unlocked.</p>
              </div>
              <div className="card-selectors">
                <div className="selector-group">
                  <label>Select Track / Role</label>
                  <select 
                    className="selector-select"
                    value={passRole}
                    onChange={(e) => setPassRole(e.target.value)}
                  >
                    <option value="PSE">Solutions Engineer (PSE)</option>
                    <option value="TAM">Technical Account Manager (TAM)</option>
                    <option value="Tech Support">Product Support Engineer (Tech Support)</option>
                  </select>
                </div>
              </div>
              <div className="features-list">
                <div className="feature-row">
                  <Check size={15} className="feature-check" />
                  <span>Only questions for <strong>{getRoleLabel(passRole)}</strong> visible</span>
                </div>
                <div className="feature-row">
                  <Check size={15} className="feature-check" />
                  <span>Mock simulator locked to <strong>{getRoleLabel(passRole)}</strong></span>
                </div>
                <div className="feature-row">
                  <Check size={15} className="feature-check" />
                  <span>Full explanation frameworks & sample answers for chosen track</span>
                </div>
                <div className="feature-row">
                  <Check size={15} className="feature-check" />
                  <span>AI Feedback & score evaluator</span>
                </div>
                <div className="feature-row locked-feature-row">
                  <span className="feature-x">✗</span>
                  <span>Access to other interview tracks</span>
                </div>
              </div>
              <button
                className="btn-secondary pricing-cta"
                onClick={() => handleCheckout('pass', 'role', passRole)}
                disabled={checkoutLoading || (isPaid && (accessType === 'all' || (accessType === 'role' && accessRole === passRole)))}
              >
                {checkoutLoading ? (
                  <><Loader size={16} className="spin" /> Preparing checkout...</>
                ) : isPaid && accessType === 'all' ? (
                  <>Unlocked via All-Access</>
                ) : isPaid && accessType === 'role' && accessRole === passRole && !subscriptionStatus ? (
                  <>Active {getRoleLabel(passRole)} Pass</>
                ) : isPaid && accessType === 'role' && accessRole === passRole && subscriptionStatus === 'active' ? (
                  <>Unlocked via Subscription</>
                ) : (
                  <><Zap size={16} /> Purchase {getRoleLabel(passRole)} Pass</>
                )}
              </button>
            </div>
          ) : (
            // RECURRING ROLE SPECIFIC
            <div className="pricing-card">
              <div className="pricing-card-header">
                <div className="pricing-tier-name">Role-Specific Subscription</div>
                <div className="pricing-amount-display">
                  <span className="pricing-amount-big">₹199</span>
                  <span className="pricing-per">/month</span>
                </div>
                <p className="pricing-card-sub">Subscription for one specific role. Cancel anytime. Only selected role questions/interviews are unlocked.</p>
              </div>
              <div className="card-selectors">
                <div className="selector-group">
                  <label>Select Track / Role</label>
                  <select 
                    className="selector-select"
                    value={subRole}
                    onChange={(e) => setSubRole(e.target.value)}
                  >
                    <option value="PSE">Solutions Engineer (PSE)</option>
                    <option value="TAM">Technical Account Manager (TAM)</option>
                    <option value="Tech Support">Product Support Engineer (Tech Support)</option>
                  </select>
                </div>
                <div className="selector-group">
                  <label>Choose Tenure (Months)</label>
                  <select 
                    className="selector-select"
                    value={roleTenure}
                    onChange={(e) => setRoleTenure(parseInt(e.target.value))}
                  >
                    {[1, 2, 3, 4, 5, 6, 12].map(m => (
                      <option key={m} value={m}>{m} {m === 1 ? 'Month' : 'Months'}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="features-list">
                <div className="feature-row">
                  <Check size={15} className="feature-check" />
                  <span>Only questions for <strong>{getRoleLabel(subRole)}</strong> visible</span>
                </div>
                <div className="feature-row">
                  <Check size={15} className="feature-check" />
                  <span>Mock simulator locked to <strong>{getRoleLabel(subRole)}</strong></span>
                </div>
                <div className="feature-row">
                  <Check size={15} className="feature-check" />
                  <span>Full explanation frameworks & sample answers for chosen track</span>
                </div>
                <div className="feature-row">
                  <Check size={15} className="feature-check" />
                  <span>AI Feedback & score evaluator</span>
                </div>
                <div className="feature-row locked-feature-row">
                  <span className="feature-x">✗</span>
                  <span>Access to other interview tracks</span>
                </div>
              </div>
              <button
                className="btn-secondary pricing-cta"
                onClick={() => handleCheckout('subscription', 'role', subRole, roleTenure)}
                disabled={checkoutLoading || (isPaid && ((accessType === 'all' && subscriptionStatus === 'active') || (accessType === 'role' && accessRole === subRole && subscriptionStatus === 'active')))}
              >
                {checkoutLoading ? (
                  <><Loader size={16} className="spin" /> Preparing checkout...</>
                ) : isPaid && accessType === 'all' && subscriptionStatus === 'active' ? (
                  <>Unlocked via All-Access</>
                ) : isPaid && accessType === 'role' && accessRole === subRole && subscriptionStatus === 'active' ? (
                  <>Active {getRoleLabel(subRole)} Subscription</>
                ) : (
                  <><Zap size={16} /> Subscribe {getRoleLabel(subRole)} (₹199/mo)</>
                )}
              </button>
            </div>
          )}
        </div>

        {/* FAQ */}
        <div className="pricing-faq">
          <h2>Common questions</h2>
          <div className="faq-grid">
            {[
              { q: 'What happens when a 20-day pass expires?', a: 'Your access to Pro questions, company intelligence, and the mock interview simulator is cut off after 20 days. However, you can still view the dashboard and see your practice analytics for another 10 days (the 30-day window). After 30 days, your dashboard is fully locked and you are redirected to the pricing page to renew.' },
              { q: 'Can I switch from a pass to a subscription?', a: 'Yes! Once your pass expires or at any time during your prep, you can purchase a recurring subscription. Subscriptions provide continuous month-on-month access at a discounted monthly rate.' },
              { q: 'How does the role-specific option work?', a: 'If you choose the role-specific pass or subscription, you select a single track (TAM, Solutions Engineer, or Product Support). Only the questions and simulated interviews relevant to that specific track will be unlocked in your account.' },
              { q: 'What does All-Access unlock?', a: 'All-Access unlocks all 50 questions across all three tracks, the mock simulator with dynamic track selection, 15 company profiles, and all resources. It is highly recommended if you are applying for multiple technical customer-facing roles.' },
              { q: 'How often is content updated?', a: 'We add new questions, company profiles, and resources every month. All-Access users and active role subscribers get access to new content in their tracks automatically.' },
              { q: 'Can I cancel my subscription?', a: 'Absolutely. You can cancel your subscription at any time via your Account page. You will maintain full study access until the end of your current billing period.' },
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
