import { Link } from "react-router-dom";
import {
  Sparkles, Wallet, Users, FileText, Landmark, ShieldCheck,
  TrendingUp, ArrowRight, CheckCircle2, LayoutDashboard, LogIn, UserPlus
} from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import "./Landing.css";

export default function Landing() {
  const { user } = useAuth();

  return (
    <div className="landing-page">
      {/* Static Top Navbar */}
      <header className="landing-navbar">
        <div className="landing-nav-container">
          <Link to="/welcome" className="landing-brand">
            <span className="landing-brand-mark">$</span>
            <span className="landing-brand-name">SoloCFO</span>
          </Link>

          <nav className="landing-nav-links">
            <a href="#features">Features</a>
            <a href="#ai-cfo">AI CFO</a>
            <a href="#cashflow">Cash Flow</a>
            <a href="#loans">Loan Engine</a>
          </nav>

          <div className="landing-nav-actions">
            {user ? (
              <Link to="/" className="nav-btn-primary">
                <LayoutDashboard size={16} />
                <span>Go to Dashboard</span>
              </Link>
            ) : (
              <>
                <Link to="/login" className="nav-btn-secondary">
                  <LogIn size={15} />
                  <span>Log In</span>
                </Link>
                <Link to="/signup" className="nav-btn-primary">
                  <UserPlus size={15} />
                  <span>Get Started</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="landing-hero">
        <div className="hero-content">
          <div className="hero-eyebrow mono">FREELANCER FINANCIAL OS</div>
          <h1 className="hero-title">
            The AI Financial OS for Freelancers & Solo Creators
          </h1>
          <p className="hero-subtitle">
            Stop guessing your monthly cash buffer. SoloCFO combines real-time runway tracking,
            smart invoice risk scoring, AI CFO advisory, and loan consequence modeling into a single dark-mode dashboard.
          </p>

          <div className="hero-cta">
            <Link to={user ? "/" : "/signup"} className="hero-btn-primary">
              <span>{user ? "Open Dashboard" : "Start Free Now"}</span>
              <ArrowRight size={16} />
            </Link>
            {!user && (
              <Link to="/login" className="hero-btn-secondary">
                <span>Live Login</span>
              </Link>
            )}
          </div>

          <div className="hero-highlights">
            <div className="highlight-item">
              <CheckCircle2 size={16} className="highlight-icon" />
              <span>Real-Time Safe-to-Spend</span>
            </div>
            <div className="highlight-item">
              <CheckCircle2 size={16} className="highlight-icon" />
              <span>Automated Tax Reserve</span>
            </div>
            <div className="highlight-item">
              <CheckCircle2 size={16} className="highlight-icon" />
              <span>Client Reliability Scoring</span>
            </div>
          </div>
        </div>

        {/* Hero Mockup Panel */}
        <div className="hero-preview panel">
          <div className="preview-header">
            <div className="preview-dots">
              <span></span><span></span><span></span>
            </div>
            <span className="preview-title mono">SOLOCFO — FINANCIAL SNAPSHOT</span>
          </div>
          <div className="preview-grid">
            <div className="preview-card">
              <div className="preview-card-label">CURRENT CASH</div>
              <div className="preview-card-val mono">₹4,20,000</div>
              <div className="preview-card-sub positive">+12.4% vs last month</div>
            </div>
            <div className="preview-card">
              <div className="preview-card-label">RUNWAY</div>
              <div className="preview-card-val mono">8.2 mos</div>
              <div className="preview-card-sub positive">Low risk level</div>
            </div>
            <div className="preview-card">
              <div className="preview-card-label">SAFE-TO-SPEND</div>
              <div className="preview-card-val mono">₹2,84,000</div>
              <div className="preview-card-sub">Calculated buffer</div>
            </div>
            <div className="preview-card">
              <div className="preview-card-label">FINANCIAL HEALTH</div>
              <div className="preview-card-val mono">86/100</div>
              <div className="preview-card-sub positive">Good health</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid Section */}
      <section id="features" className="landing-section">
        <div className="section-header">
          <div className="section-eyebrow mono">BUILT FOR FREELANCERS</div>
          <h2 className="section-title">Everything you need to master your solo finances</h2>
          <p className="section-desc">
            No bloated accounting software or spreadsheets. SoloCFO gives you instant clarity on your true cash position.
          </p>
        </div>

        <div className="features-grid">
          <div className="feature-card panel" id="cashflow">
            <div className="feature-icon"><Wallet size={24} /></div>
            <h3>Cash Flow & Runway Projection</h3>
            <p>
              Reconstruct monthly net income, forecast cash balance 6 months forward, and track your true burn rate.
            </p>
          </div>

          <div className="feature-card panel" id="ai-cfo">
            <div className="feature-icon"><Sparkles size={24} /></div>
            <h3>AI CFO Intelligence</h3>
            <p>
              Ask plain-language questions like "Can I afford a ₹80k laptop?" and get instant affordability breakdowns.
            </p>
          </div>

          <div className="feature-card panel">
            <div className="feature-icon"><Users size={24} /></div>
            <h3>Client Reliability & Risk</h3>
            <p>
              Track payment delay averages per client, revenue concentration risk, and historical pay probabilities.
            </p>
          </div>

          <div className="feature-card panel">
            <div className="feature-icon"><FileText size={24} /></div>
            <h3>Smart Invoices & Status Tracking</h3>
            <p>
              Manage draft, sent, due, overdue, and paid invoices with status indicators and search filtering.
            </p>
          </div>

          <div className="feature-card panel" id="loans">
            <div className="feature-icon"><Landmark size={24} /></div>
            <h3>Loan EMI & Missed-Payment Simulator</h3>
            <p>
              Model loan arrears, compounding penal interest, and catch-up schedules before missing installments.
            </p>
          </div>

          <div className="feature-card panel">
            <div className="feature-icon"><ShieldCheck size={24} /></div>
            <h3>Safe-to-Spend & Tax Reserve</h3>
            <p>
              Automatically set aside tax reserves based on recent income so tax season is never a surprise.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="landing-cta-section panel">
        <div className="cta-content">
          <h2>Ready to take control of your freelance finances?</h2>
          <p>Sign up in seconds and get instant visibility into your cash flow, runway, and invoices.</p>
          <div className="cta-buttons">
            <Link to={user ? "/" : "/signup"} className="hero-btn-primary">
              <span>{user ? "Go to Application" : "Create Free Account"}</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-container">
          <div className="footer-brand">
            <span className="landing-brand-mark">$</span>
            <span>SoloCFO</span>
          </div>
          <p className="footer-copy">
            © {new Date().getFullYear()} SoloCFO. The AI Financial OS for Freelancers.
          </p>
        </div>
      </footer>
    </div>
  );
}
