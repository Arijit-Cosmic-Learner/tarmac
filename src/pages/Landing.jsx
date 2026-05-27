import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Zap, BookOpen, BarChart2, Play, Building2, Library, ChevronRight, Star, ArrowRight } from 'lucide-react';
import './Landing.css';

const features = [
  { icon: BookOpen, title: '50-Question Bank', desc: 'Curated questions actually asked at Razorpay, Juspay, Freshworks — written by someone who sat in those interviews across SE, TAM, and Pre-Sales rounds.' },
  { icon: Star, title: 'Answer Frameworks', desc: 'STAR, SPAC, NEAT — structured frameworks for every question type. Strong answer + weak answer examples so you know exactly where the bar is.' },
  { icon: BarChart2, title: 'Progress Tracker', desc: 'Mark questions as Practiced or Confident. Track your 7-day streak. See your readiness score go up in real-time.' },
  { icon: Play, title: 'Mock Simulator', desc: 'Timed interview mode with a 2-min think phase and 3-min answer phase. Get scored feedback on structure and keywords.' },
  { icon: Building2, title: 'Company Intel', desc: 'Hiring process, round-by-round breakdown, insider tips, and commonly asked questions for 15 top companies.' },
  { icon: Library, title: 'Concept Library', desc: 'REST APIs, Webhooks, UPI flows, OAuth, SQL — explained at "interview-ready" depth. No CS degree needed.' },
];

const testimonials = [
  { quote: 'I\'m an ECE grad and every platform I found was for SDE roles. Tarmac is the only one that felt like it was written for me.', name: 'Ananya R.', role: 'SE at Cashfree Payments', batch: 'ECE, 2023' },
  { quote: 'The Razorpay company card alone saved me 3 hours of scattered research. I walked in knowing exactly what to expect.', name: 'Karan M.', role: 'TAM at Freshworks', batch: 'Mech, 2022' },
  { quote: 'The answer frameworks changed how I think about answering questions. I stopped saying "I am passionate about..." and started saying actual things.', name: 'Priya S.', role: 'Pre-Sales at Zoho', batch: 'Civil, 2024' },
];

export default function Landing() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <div className="landing">
      {/* ── HERO ─────────────────────────────── */}
      <section 
        className="hero-section"
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="hero-bg-grid" />
        <div className="hero-glow" />
        {isHovered && (
          <div 
            className="hero-mouse-glow" 
            style={{ 
              left: `${mousePos.x}px`, 
              top: `${mousePos.y}px` 
            }} 
          />
        )}
        <div className="page-container hero-content">
          <div className="hero-pill">
            <Zap size={13} />
            <span>ECE · Mech · Civil · EEE · IT grads — this is for you</span>
          </div>
          <h1 className="hero-headline">
            Get hired in
            <span className="gradient-text display-text"> tech.</span>
            <br />
            <span className="hero-headline-sub">Crack techno-functional interviews — India's only dedicated prep platform</span>
          </h1>
          <div className="hero-roles-marquee">
            <div className="hero-roles-track">
              <span className="hero-role-chip">⚡ Solutions Engineer</span>
              <span className="hero-role-chip">🤝 Technical Account Manager</span>
              <span className="hero-role-chip">🎯 Pre-Sales Engineer</span>
              <span className="hero-role-chip">💚 Customer Success</span>
              <span className="hero-role-chip">🛠️ Technical Support</span>
              <span className="hero-role-chip">💼 Technical Consultant</span>
              <span className="hero-role-chip">⚙️ Product Operations</span>
              <span className="hero-role-chip">📈 Operations Manager</span>
              <span className="hero-role-chip">🔍 Operations Analyst</span>
              <span className="hero-role-chip">💳 Financial Operations</span>
              
              {/* Duplicate for seamless infinite loop */}
              <span className="hero-role-chip">⚡ Solutions Engineer</span>
              <span className="hero-role-chip">🤝 Technical Account Manager</span>
              <span className="hero-role-chip">🎯 Pre-Sales Engineer</span>
              <span className="hero-role-chip">💚 Customer Success</span>
              <span className="hero-role-chip">🛠️ Technical Support</span>
              <span className="hero-role-chip">💼 Technical Consultant</span>
              <span className="hero-role-chip">⚙️ Product Operations</span>
              <span className="hero-role-chip">📈 Operations Manager</span>
              <span className="hero-role-chip">🔍 Operations Analyst</span>
              <span className="hero-role-chip">💳 Financial Operations</span>
            </div>
          </div>
          <p className="hero-sub">
            The only structured interview prep built for non-CS engineers targeting business-technical
            hybrid roles at Indian tech companies.
            <br /><em>Written by an ECE grad who did it at Razorpay, PhonePe, and Juspay.</em>
          </p>
          <div className="hero-ctas">
            <Link to="/login?tab=signup" className="btn-primary hero-cta-primary">
              Start Preparing Free <ArrowRight size={18} />
            </Link>
            <Link to="/pricing" className="btn-secondary">
              See Pricing
            </Link>
          </div>
          <div className="hero-social-proof">
            <div className="proof-avatars">
              {['A', 'K', 'P', 'R', 'S'].map((l, i) => (
                <div key={i} className="proof-avatar" style={{ zIndex: 5 - i }}>{l}</div>
              ))}
            </div>
            <span className="proof-text">Joined by <strong>500+</strong> non-CS engineers preparing for tech roles</span>
          </div>
        </div>
      </section>

      {/* ── THE GAP ──────────────────────────── */}
      <section className="gap-section">
        <div className="page-container">
          <div className="gap-header">
            <h2>You're not preparing for a coding interview.<br /><span className="gradient-text">So why are you using platforms built for one?</span></h2>
          </div>
          <div className="gap-grid">
            <div className="gap-card red">
              <div className="gap-card-icon">❌</div>
              <h3>LeetCode / InterviewBit</h3>
              <p>DSA problems, system design, code challenges. Built for SDE roles. None of this appears in an SE, TAM, Pre-Sales, or CSM interview.</p>
            </div>
            <div className="gap-card yellow">
              <div className="gap-card-icon">💸</div>
              <h3>Exponent / PM-focused platforms</h3>
              <p>Made for US-based PM and SDE roles. $150+/month. Zero coverage of Indian companies, Indian salary expectations, or business-technical hybrid tracks.</p>
            </div>
            <div className="gap-card green">
              <div className="gap-card-icon">✅</div>
              <h3>Tarmac</h3>
              <p>Built for the full business-technical hybrid track — SE, TAM, Pre-Sales, CSM — at Indian tech companies. Priced for an Indian fresher. Written by someone who sat in these rooms.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────── */}
      <section className="features-section">
        <div className="page-container">
          <div className="section-header">
            <div>
              <h2 className="section-title">Everything you need. Nothing you don\'t.</h2>
              <p className="section-sub">Six core features, one focused goal: get you to offer stage.</p>
            </div>
          </div>
          <div className="features-grid">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="feature-card">
                <div className="feature-icon"><Icon size={22} /></div>
                <h3 className="feature-title">{title}</h3>
                <p className="feature-desc">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOUNDER NOTE ─────────────────────── */}
      <section className="founder-section">
        <div className="page-container">
          <div className="founder-card">
            <div className="founder-quote-mark">"</div>
            <p className="founder-quote">
              I graduated with an ECE degree from a tier-2 college in 2019. I had no CS background, 
              no coding skills, and no idea what a webhook was. Three years later, I was an SE at Razorpay, 
              then a TAM at PhonePe, then at Juspay. I walked into those interviews not because I was the 
              smartest candidate — but because I was the most prepared. I built Tarmac because when I 
              was preparing, nothing like this existed. It still doesn\'t. Until now.
            </p>
            <div className="founder-info">
              <img src="/founder.jpg.png" alt="The Founder" className="founder-avatar-img" />
              <div>
                <div className="founder-name">The Founder</div>
                <div className="founder-role">ECE grad → SE at Razorpay → TAM at PhonePe → Juspay</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ─────────────────────── */}
      <section className="testimonials-section">
        <div className="page-container">
          <h2 className="section-title" style={{ textAlign: 'center', marginBottom: '2rem' }}>From the community</h2>
          <div className="testimonials-grid">
            {testimonials.map((t, i) => (
              <div key={i} className="testimonial-card">
                <div className="testimonial-stars">{'★★★★★'}</div>
                <p className="testimonial-quote">"{t.quote}"</p>
                <div className="testimonial-author">
                  <div className="t-avatar">{t.name[0]}</div>
                  <div>
                    <div className="t-name">{t.name}</div>
                    <div className="t-role">{t.role} · {t.batch}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING PREVIEW ──────────────────── */}
      <section className="pricing-preview-section">
        <div className="page-container">
          <h2 className="section-title" style={{ textAlign: 'center', marginBottom: '0.5rem' }}>Honest pricing</h2>
          <p className="section-sub" style={{ textAlign: 'center', marginBottom: '2.5rem' }}>Free tier is genuinely useful. Pro is worth it.</p>
          <div className="pricing-preview-grid">
            <div className="pricing-preview-card">
              <div className="pricing-tier">Free</div>
              <div className="pricing-amount">₹0</div>
              <ul className="pricing-features-list">
                <li>✓ 20 questions (Solutions Engineer track)</li>
                <li>✓ Answer frameworks for free questions</li>
                <li>✓ Progress tracker</li>
                <li>✓ 3 resource explainers</li>
                <li className="locked-feature">✗ Mock interview simulator</li>
                <li className="locked-feature">✗ Company intelligence (15 companies)</li>
                <li className="locked-feature">✗ All 50 questions</li>
              </ul>
              <Link to="/login?tab=signup" className="btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>
                Start Free
              </Link>
            </div>
            <div className="pricing-preview-card pro">
              <div className="pro-badge">Most Popular</div>
              <div className="pricing-tier">Pro</div>
              <div className="pricing-amount">₹499 <span className="pricing-period">/month</span></div>
              <div className="pricing-annual">or ₹3,499/year — save ₹2,489</div>
              <ul className="pricing-features-list">
                <li>✓ All 50 questions + frameworks</li>
                <li>✓ Mock interview simulator with AI feedback</li>
                <li>✓ Company intelligence (15 companies)</li>
                <li>✓ Full resource library (8 explainers)</li>
                <li>✓ Progress tracker + streak</li>
                <li>✓ New content monthly</li>
              </ul>
              <Link to="/pricing" className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                Get Pro Access
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────── */}
      <section className="final-cta-section">
        <div className="page-container">
          <div className="final-cta-card">
            <h2>Your degree got you here.<br />Tarmac gets you the offer.</h2>
            <p>Join 500+ ECE, Mech, Civil, and EEE grads who stopped winging it and started walking into interviews fully prepared.</p>
            <Link to="/login?tab=signup" className="btn-primary" style={{ fontSize: '1rem', padding: '0.875rem 2rem' }}>
              Start Preparing Free <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────── */}
      <footer className="footer">
        <div className="page-container">
          <div className="footer-inner">
            <div className="footer-brand">
              <img src="/tarmac-icon-transparent.svg" alt="Tarmac Logo" className="logo-icon" width="18" height="18" />
              <span>Tar<span className="logo-accent">mac</span></span>
            </div>
            <div className="footer-links">
              <Link to="/pricing">Pricing</Link>
              <Link to="/resources">Resources</Link>
              <Link to="/companies">Companies</Link>
            </div>
            <p className="footer-copy">© 2024 Tarmac. Made with 🔥 for non-CS engineers.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
