import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
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

// Dynamically load the Easebuzz checkout script
function loadEasebuzzScript() {
  return new Promise((resolve) => {
    if (window.EasebuzzCheckout) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://ebz-static.s3.ap-south-1.amazonaws.com/easecheckout/v2.0.0/easebuzz-checkout-v2.min.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function Pricing() {
  const { user, isPaid, upgradeToPaid } = useAuth();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null); // 'success' | 'error' | null
  const [paymentMessage, setPaymentMessage] = useState('');

  // Pre-load payment scripts on mount for faster checkout
  useEffect(() => {
    loadRazorpayScript();
    loadEasebuzzScript();
  }, []);

  const handleEasebuzzUpgrade = async () => {
    if (!user) {
      window.location.href = '/login?tab=signup';
      return;
    }

    setCheckoutLoading(true);
    setPaymentStatus(null);
    setPaymentMessage('');

    // Track payment attempt event
    trackEvent('payment_attempt', { step: 'initiated_easebuzz' }, user.id);

    // Step 1: Ensure Easebuzz script is loaded
    const scriptLoaded = await loadEasebuzzScript();
    if (!scriptLoaded) {
      setPaymentStatus('error');
      setPaymentMessage('Failed to load Easebuzz checkout gateway. Please check your connection and try again.');
      setCheckoutLoading(false);
      return;
    }

    // Step 2: Create order via our secure Vercel backend
    let sessionData;
    try {
      const res = await fetch('/api/easebuzz-create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: '499.00', // ₹499.00
          userId: user.id,
          email: user.email,
          firstname: user.name || user.email.split('@')[0] || 'Candidate',
          phone: user.phone || '9999999999', // fallback phone required by Easebuzz
        }),
      });
      sessionData = await res.json();
      if (!res.ok) throw new Error(sessionData.error || 'Could not initiate checkout session');
    } catch (err) {
      setPaymentStatus('error');
      setPaymentMessage(err.message || 'Failed to initiate payment. Please try again.');
      setCheckoutLoading(false);
      return;
    }

    setCheckoutLoading(false);

    // Step 3: Open Easebuzz checkout modal
    try {
      const env = sessionData.env === 'prod' ? 'prod' : 'test';
      const easebuzzCheckout = new window.EasebuzzCheckout(sessionData.key, env);

      const options = {
        access_key: sessionData.access_key,
        onResponse: async (response) => {
          console.log('Easebuzz payment response:', response);

          if (response.status === 'success') {
            setCheckoutLoading(true);
            setPaymentStatus('info');
            setPaymentMessage('Verifying transaction details...');

            try {
              // Post to verify payment backend
              const verifyRes = await fetch('/api/easebuzz-verify-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(response),
              });
              const verifyData = await verifyRes.json();
              
              if (!verifyRes.ok || !verifyData.success) {
                throw new Error(verifyData.error || 'Signature verification failed.');
              }

              // Upgrade success
              await upgradeToPaid();
              setPaymentStatus('success');
              setPaymentMessage('🎉 Welcome to Pro! All features are now unlocked.');
            } catch (err) {
              setPaymentStatus('error');
              setPaymentMessage(`Verification failed: ${err.message || 'Please contact support with Txn ID: ' + response.txnid}`);
            } finally {
              setCheckoutLoading(false);
            }
          } else {
            setPaymentStatus('error');
            setPaymentMessage(`Payment failed or cancelled: ${response.error_Message || 'Please try again.'}`);
          }
        },
        theme: '#FF5C00' // Amber accent
      };

      easebuzzCheckout.initiatePayment(options);
    } catch (err) {
      console.error('Easebuzz SDK runtime error:', err);
      setPaymentStatus('error');
      setPaymentMessage('Failed to open the checkout screen. Please try again.');
    }
  };

  const handleUpgrade = async () => {
    setCheckoutLoading(true);
    setPaymentStatus(null);
    setPaymentMessage('');

    // Track payment attempt event
    trackEvent('payment_attempt', { step: 'initiated_razorpay' }, user?.id);

    // Step 1: Ensure Razorpay script is loaded
    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded) {
      setPaymentStatus('error');
      setPaymentMessage('Failed to load payment gateway. Please check your connection and try again.');
      setCheckoutLoading(false);
      return;
    }

    // Step 2: Create order via our secure serverless backend
    let orderData;
    try {
      const res = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: 49900, // ₹499 in paise
          currency: 'INR',
          userId: user?.id || 'guest',
        }),
      });
      orderData = await res.json();
      if (!res.ok) throw new Error(orderData.error || 'Could not create order');
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
      amount: orderData.amount,
      currency: orderData.currency,
      name: 'Tarmac',
      description: 'Pro Plan — ₹499/month',
      image: `${window.location.origin}/tarmac-icon-transparent.svg`,
      order_id: orderData.order_id,
      prefill: {
        name: user?.name || '',
        email: user?.email || '',
        contact: user?.phone || '',
      },
      notes: {
        userId: user?.id || '',
      },
      theme: {
        color: '#0d0d0d', // Dark background — lime dots remain as Razorpay branding accent
      },

      // ── Success Handler ───────────────────────────────────────────────────
      handler: async function (response) {
        setCheckoutLoading(true);
        setPaymentStatus('info');
        setPaymentMessage('Verifying payment signature with bank...');

        try {
          const verifyRes = await fetch('/api/verify-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              userId: user?.id,
            }),
          });
          const verifyData = await verifyRes.json();
          if (!verifyRes.ok) throw new Error(verifyData.error);

          setPaymentMessage('Signature verified. Activating Pro access...');

          // Start polling backend checking status
          const maxAttempts = 15; // 30 seconds total (15 attempts * 2 seconds)
          let attempt = 0;

          const pollInterval = setInterval(async () => {
            attempt++;
            try {
              const checkRes = await fetch(
                `/api/check-payment-status?userId=${user?.id}&paymentId=${response.razorpay_payment_id}`
              );
              const checkData = await checkRes.json();

              if (checkRes.ok && checkData.isPaid) {
                clearInterval(pollInterval);
                await upgradeToPaid();
                setPaymentStatus('success');
                setPaymentMessage('🎉 Welcome to Pro! All features are now unlocked.');
                setCheckoutLoading(false);
              } else if (attempt >= maxAttempts) {
                clearInterval(pollInterval);
                setPaymentStatus('warning');
                setPaymentMessage(
                  `Payment verified, but activation is taking longer than expected. Please refresh this page or contact support with payment ID: ${response.razorpay_payment_id}`
                );
                setCheckoutLoading(false);
              } else {
                setPaymentMessage(
                  `Activating Pro access... (Attempt ${attempt}/${maxAttempts})`
                );
              }
            } catch (err) {
              console.error('Polling payment status error:', err);
              if (attempt >= maxAttempts) {
                clearInterval(pollInterval);
                setPaymentStatus('warning');
                setPaymentMessage(
                  `Payment verified, but checking activation status failed. Please refresh this page or contact support with payment ID: ${response.razorpay_payment_id}`
                );
                setCheckoutLoading(false);
              }
            }
          }, 2000);

        } catch (err) {
          setPaymentStatus('error');
          setPaymentMessage(
            `Payment verification failed: ${err.message}. Please contact support with payment ID: ${response.razorpay_payment_id}`
          );
          setCheckoutLoading(false);
        }
      },

      modal: {
        ondismiss: () => {
          setCheckoutLoading(false);
        },
      },
    };

    const rzp = new window.Razorpay(options);

    // ── Failure Handler ───────────────────────────────────────────────────
    rzp.on('payment.failed', function (response) {
      setPaymentStatus('error');
      setPaymentMessage(
        `Payment failed: ${response.error.description}. Reason: ${response.error.reason}. Please try again or use a different payment method.`
      );
    });

    rzp.open();
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

        {/* Payment status banner */}
        {paymentStatus && (
          <div className={`payment-banner payment-banner--${paymentStatus}`}>
            {paymentMessage}
          </div>
        )}

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
                {isPaid ? "You're on Pro" : '✓ Current Plan'}
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
              <button
                className="btn-primary pricing-cta pro-cta"
                onClick={handleEasebuzzUpgrade}
                disabled={checkoutLoading}
              >
                {checkoutLoading ? (
                  <><Loader size={16} className="spin" /> Preparing checkout...</>
                ) : (
                  <><Zap size={16} /> {user ? 'Upgrade to Pro' : 'Get Pro Access'}</>
                )}
              </button>
            )}
          </div>
        </div>

        {/* FAQ */}
        <div className="pricing-faq">
          <h2>Common questions</h2>
          <div className="faq-grid">
            {[
              { q: 'What does "cancel anytime" mean?', a: "You can cancel your Pro subscription at any time. You'll retain access until the end of your billing period." },
              { q: 'Is this really built for non-CS grads?', a: 'Yes — 100%. Every question, answer, and resource is written assuming you did not study computer science. The technical concepts are explained in plain language.' },
              { q: 'How often is content updated?', a: 'We add new questions, company profiles, and resources every month. Pro users get access to all new content automatically.' },
              { q: 'Will this help for TAM / Pre-Sales roles too?', a: 'Most of the Solutions Engineer questions directly apply to TAM and Pre-Sales roles. Dedicated tracks for these roles are coming in Q2 2025.' },
              { q: 'Is my data safe?', a: "Your progress is stored securely in your account. We never send your data to third parties." },
              { q: "What if I'm already placed?", a: 'Pass it on. Send Tarmac to a junior from your college who\'s still figuring out how to prepare. Pay it forward.' },
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
