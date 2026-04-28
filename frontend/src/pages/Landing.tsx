import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useScrollReveal } from '../hooks/useScrollReveal'
import '../styles/landing.css'

export default function Landing() {
  const navigate = useNavigate()
  useScrollReveal()

  useEffect(() => {
    const root = document.getElementById('root')
    if (root) root.style.overflow = 'auto'
    document.body.style.overflow = 'auto'
    document.documentElement.style.overflow = 'auto'
    return () => {
      if (root) root.style.overflow = ''
      document.body.style.overflow = ''
      document.documentElement.style.overflow = ''
    }
  }, [])

  return (
    <>
      {/* =============== NAV =============== */}
      <nav className="nav">
        <a href="#" className="nav-logo" onClick={e => e.preventDefault()}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L3 6v6c0 5 3.5 9 9 10 5.5-1 9-5 9-10V6z"/>
            <path d="M12 7v10M7 12h10"/>
            <circle cx="12" cy="12" r="2" fill="currentColor"/>
          </svg>
          SENTRY
        </a>
        <span className="nav-meta">DAP · v2.4.1</span>
        <div className="nav-links">
          <a className="nav-link" href="#" onClick={e => e.preventDefault()}>Documentation</a>
          <a className="nav-link" href="#" onClick={e => e.preventDefault()}>Pricing</a>
          <button className="btn btn-ghost" onClick={() => navigate('/dashboard')}>Sign In</button>
          <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>Launch App →</button>
        </div>
      </nav>

      {/* =============== HERO =============== */}
      <section className="hero">
        <div className="hero-gradient">
          <div className="stars"></div>
          <div className="grain"></div>
          <svg viewBox="0 0 600 800" preserveAspectRatio="xMidYMid slice">
            <defs>
              <linearGradient id="beamCore" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0%" stopColor="#00d4ff" stopOpacity={0}/>
                <stop offset="20%" stopColor="#00d4ff" stopOpacity={0.85}/>
                <stop offset="40%" stopColor="#7fe8ff" stopOpacity={1}/>
                <stop offset="50%" stopColor="#e8faff" stopOpacity={1}/>
                <stop offset="60%" stopColor="#7fe8ff" stopOpacity={1}/>
                <stop offset="80%" stopColor="#00d4ff" stopOpacity={0.85}/>
                <stop offset="100%" stopColor="#00d4ff" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="beamCool" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0%" stopColor="#00d4ff" stopOpacity={0}/>
                <stop offset="35%" stopColor="#00d4ff" stopOpacity={0.95}/>
                <stop offset="50%" stopColor="#cfeaff" stopOpacity={1}/>
                <stop offset="65%" stopColor="#00d4ff" stopOpacity={0.95}/>
                <stop offset="100%" stopColor="#00d4ff" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="beamWarm" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0%" stopColor="#00d4ff" stopOpacity={0}/>
                <stop offset="40%" stopColor="#1ee0ff" stopOpacity={0.85}/>
                <stop offset="55%" stopColor="#ffffff" stopOpacity={0.95}/>
                <stop offset="70%" stopColor="#1ee0ff" stopOpacity={0.85}/>
                <stop offset="100%" stopColor="#00d4ff" stopOpacity={0}/>
              </linearGradient>
            </defs>

            <g className="bloom-layer-2">
              <path className="beam b1" d="M280 -50 Q220 200 320 400 T280 850" stroke="url(#beamCore)" strokeWidth="55" fill="none" strokeLinecap="round"/>
              <path className="beam b2" d="M310 -50 Q360 220 260 420 T340 850" stroke="url(#beamCool)" strokeWidth="50" fill="none" strokeLinecap="round"/>
              <path className="beam b3" d="M250 -50 Q300 240 220 460 T300 850" stroke="url(#beamWarm)" strokeWidth="46" fill="none" strokeLinecap="round"/>
              <path className="beam b4" d="M340 -50 Q280 240 380 440 T260 850" stroke="url(#beamCore)" strokeWidth="48" fill="none" strokeLinecap="round"/>
              <path className="beam b5" d="M220 -50 Q380 200 240 440 T360 850" stroke="url(#beamCool)" strokeWidth="44" fill="none" strokeLinecap="round"/>
            </g>

            <g className="bloom-layer">
              <path className="beam b1" d="M280 -50 Q220 200 320 400 T280 850" stroke="url(#beamCore)" strokeWidth="22" fill="none" strokeLinecap="round"/>
              <path className="beam b2" d="M310 -50 Q360 220 260 420 T340 850" stroke="url(#beamCool)" strokeWidth="20" fill="none" strokeLinecap="round"/>
              <path className="beam b3" d="M250 -50 Q300 240 220 460 T300 850" stroke="url(#beamWarm)" strokeWidth="18" fill="none" strokeLinecap="round"/>
              <path className="beam b4" d="M340 -50 Q280 240 380 440 T260 850" stroke="url(#beamCore)" strokeWidth="19" fill="none" strokeLinecap="round"/>
              <path className="beam b5" d="M220 -50 Q380 200 240 440 T360 850" stroke="url(#beamCool)" strokeWidth="17" fill="none" strokeLinecap="round"/>
            </g>

            <g className="sharp-layer">
              <path className="beam b1" d="M280 -50 Q220 200 320 400 T280 850" stroke="url(#beamCore)" strokeWidth="6" fill="none" strokeLinecap="round"/>
              <path className="beam b2" d="M310 -50 Q360 220 260 420 T340 850" stroke="url(#beamCool)" strokeWidth="5" fill="none" strokeLinecap="round"/>
              <path className="beam b3" d="M250 -50 Q300 240 220 460 T300 850" stroke="url(#beamWarm)" strokeWidth="4" fill="none" strokeLinecap="round"/>
              <path className="beam b4" d="M340 -50 Q280 240 380 440 T260 850" stroke="url(#beamCore)" strokeWidth="4" fill="none" strokeLinecap="round"/>
              <path className="beam b5" d="M220 -50 Q380 200 240 440 T360 850" stroke="url(#beamCool)" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
            </g>
          </svg>
        </div>
        <div className="hero-grid"></div>
        <div className="hero-glow"></div>

        <div className="hero-content">
          <div className="hero-eyebrow">
            <span>SENTRY</span>
            <span className="sep">·</span>
            <span>Digital Asset Protection</span>
          </div>

          <h1>
            Find where your work
            <br />gets <span className="accent">stolen.</span>
          </h1>

          <p className="hero-sub">
            Sentry indexes your images, watches the open web, and prepares the takedown
            paperwork when something turns up where it shouldn't.
          </p>

          <div className="hero-ctas">
            <button className="btn btn-primary btn-lg" onClick={() => navigate('/dashboard')}>
              Open the dashboard
            </button>
            <button className="btn btn-ghost btn-lg" onClick={() => document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' })}>
              How it works
            </button>
          </div>

          <div className="hero-tech mono">Runs on CLIP, pgvector, Vision API, Gemini 1.5</div>
        </div>

        {/* Hero preview mockup */}
        <div className="hero-preview">
          <div className="preview-frame">
            <div className="preview-chrome">
              <div className="dots"><span/><span/><span/></div>
              <span className="path">sentry.app / infringements</span>
              <span className="status">CRAWLER ONLINE</span>
            </div>
            <div className="preview-body">
              <aside className="preview-side">
                <div className="preview-side-label">Workspace</div>
                <div className="preview-nav active">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l10 18H2z"/><path d="M12 10v5"/></svg>
                  Infringements
                </div>
                <div className="preview-nav">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
                  Evidence
                </div>
                <div className="preview-nav">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4v12"/><path d="M7 9l5-5 5 5"/><path d="M4 20h16"/></svg>
                  Assets
                </div>
                <div className="preview-nav">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M22 20H2"/></svg>
                  Analytics
                </div>
              </aside>
              <div className="preview-main">
                <div className="preview-kpi-row">
                  <div className="preview-kpi">
                    <div className="preview-kpi-label">Active Matches</div>
                    <div className="preview-kpi-value danger" data-count="47">0</div>
                  </div>
                  <div className="preview-kpi">
                    <div className="preview-kpi-label">High Confidence</div>
                    <div className="preview-kpi-value" data-count="12">0</div>
                  </div>
                  <div className="preview-kpi">
                    <div className="preview-kpi-label">Resolution Rate</div>
                    <div className="preview-kpi-value ok" data-count="78" data-suffix="%">0</div>
                  </div>
                </div>
                <div className="preview-table">
                  <div className="preview-table-head">
                    <span>ID</span>
                    <span>ASSET</span>
                    <span>CONF.</span>
                    <span>PLATFORM</span>
                    <span>STATUS</span>
                    <span style={{textAlign:'right'}}>DETECTED</span>
                  </div>
                  <div className="preview-table-row">
                    <span className="id">2871</span>
                    <span style={{color:'var(--ink)'}}>Neon Alley — 03</span>
                    <span><span className="mini-badge danger"><span className="dotsq"></span>97.2%</span></span>
                    <span><span className="mini-badge muted">Reddit</span></span>
                    <span><span className="mini-badge info"><span className="dotsq"></span>Pending</span></span>
                    <span style={{textAlign:'right',color:'var(--ink-3)'}}>2m ago</span>
                  </div>
                  <div className="preview-table-row">
                    <span className="id">2870</span>
                    <span style={{color:'var(--ink)'}}>Portrait Study, Iris</span>
                    <span><span className="mini-badge danger"><span className="dotsq"></span>94.8%</span></span>
                    <span><span className="mini-badge muted">DeviantArt</span></span>
                    <span><span className="mini-badge danger"><span className="dotsq"></span>Valid</span></span>
                    <span style={{textAlign:'right',color:'var(--ink-3)'}}>14m ago</span>
                  </div>
                  <div className="preview-table-row">
                    <span className="id">2869</span>
                    <span style={{color:'var(--ink)'}}>Holographic Koi #08</span>
                    <span><span className="mini-badge warn"><span className="dotsq"></span>82.1%</span></span>
                    <span><span className="mini-badge muted">Twitter/X</span></span>
                    <span><span className="mini-badge warn"><span className="dotsq"></span>DMCA</span></span>
                    <span style={{textAlign:'right',color:'var(--ink-3)'}}>1h ago</span>
                  </div>
                  <div className="preview-table-row">
                    <span className="id">2868</span>
                    <span style={{color:'var(--ink)'}}>Glass Mountain</span>
                    <span><span className="mini-badge warn"><span className="dotsq"></span>78.9%</span></span>
                    <span><span className="mini-badge muted">Pinterest</span></span>
                    <span><span className="mini-badge info"><span className="dotsq"></span>Pending</span></span>
                    <span style={{textAlign:'right',color:'var(--ink-3)'}}>3h ago</span>
                  </div>
                  <div className="preview-table-row">
                    <span className="id">2867</span>
                    <span style={{color:'var(--ink)'}}>Midnight Train</span>
                    <span><span className="mini-badge danger"><span className="dotsq"></span>91.5%</span></span>
                    <span><span className="mini-badge muted">Reddit</span></span>
                    <span><span className="mini-badge muted"><span className="dotsq"></span>Resolved</span></span>
                    <span style={{textAlign:'right',color:'var(--ink-3)'}}>5h ago</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <a
          href="#how"
          className="scroll-indicator"
          onClick={e => { e.preventDefault(); document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' }) }}
          aria-label="Scroll to How it works"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </a>
      </section>

      {/* =============== STATS BAR =============== */}
      <section className="stats-bar">
        <div className="stats-grid">
          <div className="stat reveal">
            <div className="stat-value mono"><span className="accent" data-count="5000">0</span>+</div>
            <div className="stat-label">Assets Indexed</div>
          </div>
          <div className="stat reveal" data-delay="1">
            <div className="stat-value mono">&lt; <span className="accent" data-count="3">0</span>s</div>
            <div className="stat-label">Fingerprint Speed</div>
          </div>
          <div className="stat reveal" data-delay="2">
            <div className="stat-value mono"><span className="accent" data-count="4">0</span> Services</div>
            <div className="stat-label">Google AI Stack</div>
          </div>
          <div className="stat reveal" data-delay="3">
            <div className="stat-value mono"><span className="accent" data-count="90">0</span>%+</div>
            <div className="stat-label">Detection Accuracy</div>
          </div>
        </div>
      </section>

      {/* =============== HOW IT WORKS =============== */}
      <section className="how-section section-pad" id="how">
        <div className="section">
          <div className="section-header reveal">
            <span className="section-title">How Sentry Works</span>
            <h2 className="section-heading">Three stages, one pipeline.</h2>
          </div>

          <div className="how-steps">
            <div className="how-step reveal">
              <div className="how-step-num">Step 01 / Fingerprint</div>
              <div className="how-step-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12,2 21,7 21,17 12,22 3,17 3,7"/>
                  <path d="M3 7l9 5 9-5"/>
                  <path d="M12 12v10"/>
                </svg>
              </div>
              <h3 className="how-step-title">Upload & Fingerprint</h3>
              <p className="how-step-desc">CLIP ViT-B/32 generates a 512-dimensional visual fingerprint. Google Vision API checks for existing web presence.</p>
              <span className="how-step-tag">CLIP · pHash · Vision API</span>
            </div>

            <div className="how-arrow reveal" data-delay="1">
              <svg width="60" height="14" viewBox="0 0 60 14" fill="none">
                <line x1="2" y1="7" x2="50" y2="7" stroke="currentColor" strokeWidth="1.2" strokeDasharray="3 3"/>
                <path d="M48 3l6 4-6 4" stroke="var(--accent)" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>

            <div className="how-step reveal" data-delay="2">
              <div className="how-step-num">Step 02 / Detect</div>
              <div className="how-step-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="9"/>
                  <circle cx="12" cy="12" r="5"/>
                  <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
                  <line x1="12" y1="3" x2="12" y2="6"/>
                  <line x1="12" y1="18" x2="12" y2="21"/>
                </svg>
              </div>
              <h3 className="how-step-title">Crawl & Detect</h3>
              <p className="how-step-desc">pgvector similarity search runs against thousands of indexed assets. 4-component confidence scoring identifies true infringements.</p>
              <span className="how-step-tag">pgvector · Cosine Similarity</span>
            </div>

            <div className="how-arrow reveal" data-delay="3">
              <svg width="60" height="14" viewBox="0 0 60 14" fill="none">
                <line x1="2" y1="7" x2="50" y2="7" stroke="currentColor" strokeWidth="1.2" strokeDasharray="3 3"/>
                <path d="M48 3l6 4-6 4" stroke="var(--accent)" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>

            <div className="how-step reveal" data-delay="4">
              <div className="how-step-num">Step 03 / Enforce</div>
              <div className="how-step-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 3h9l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/>
                  <path d="M14 3v5h5"/>
                  <path d="M9 13l2 2 4-4"/>
                </svg>
              </div>
              <h3 className="how-step-title">Alert & Enforce</h3>
              <p className="how-step-desc">Instant email alerts via Resend. Gemini 1.5 Flash generates DMCA takedown notices ready to send.</p>
              <span className="how-step-tag">Gemini 1.5 Flash · Resend</span>
            </div>
          </div>
        </div>
      </section>

      {/* =============== FEATURES =============== */}
      <section className="features-section section-pad">
        <div className="section">
          <div className="section-header reveal">
            <span className="section-title">Features</span>
            <h2 className="section-heading">A full forensic stack <span className="accent">for creators.</span></h2>
          </div>

          <div className="features-grid">
            <div className="feature-card reveal">
              <div className="feature-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/></svg>
              </div>
              <div className="feature-meta"><span className="num">F.01</span> · CORE</div>
              <h3 className="feature-title">AI Fingerprinting</h3>
              <p className="feature-desc">CLIP embeddings + perceptual hashing detect exact copies, near-duplicates, and transformed versions.</p>
            </div>

            <div className="feature-card reveal" data-delay="1">
              <div className="feature-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
              </div>
              <div className="feature-meta"><span className="num">F.02</span> · DISCOVERY</div>
              <h3 className="feature-title">Web Detection</h3>
              <p className="feature-desc">Google Vision API scans the entire web for unauthorized copies the moment you upload.</p>
            </div>

            <div className="feature-card reveal" data-delay="2">
              <div className="feature-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M22 20H2"/></svg>
              </div>
              <div className="feature-meta"><span className="num">F.03</span> · SCORING</div>
              <h3 className="feature-title">Confidence Scoring</h3>
              <p className="feature-desc">4-component formula weighing CLIP similarity, pHash distance, Vision API hits, and domain trust.</p>
            </div>

            <div className="feature-card reveal" data-delay="3">
              <div className="feature-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M18 16v-5a6 6 0 0 0-12 0v5l-2 2v1h16v-1z"/><path d="M10 21h4"/></svg>
              </div>
              <div className="feature-meta"><span className="num">F.04</span> · NOTIFY</div>
              <h3 className="feature-title">Instant Alerts</h3>
              <p className="feature-desc">Email notifications the moment an infringement is detected. Asset name, source URL, confidence score.</p>
            </div>

            <div className="feature-card reveal" data-delay="4">
              <div className="feature-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3h9l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h6"/></svg>
              </div>
              <div className="feature-meta"><span className="num">F.05</span> · ENFORCE</div>
              <h3 className="feature-title">DMCA Generation</h3>
              <p className="feature-desc">Gemini 1.5 Flash writes professional legal takedown notices. One click to download.</p>
            </div>

            <div className="feature-card reveal" data-delay="5">
              <div className="feature-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/></svg>
              </div>
              <div className="feature-meta"><span className="num">F.06</span> · OPS</div>
              <h3 className="feature-title">Evidence Dashboard</h3>
              <p className="feature-desc">Centralized view of all detections with evidence comparison, status tracking, and bulk actions.</p>
            </div>
          </div>
        </div>
      </section>

      {/* =============== TECH STRIP =============== */}
      <section className="tech-section">
        <div className="tech-strip">
          <span className="tech-label">Built With</span>
          <div className="tech-marquee">
            <div className="tech-track">
              <span className="tech-pill"><span className="glyph">▸</span>FastAPI</span>
              <span className="tech-pill"><span className="glyph">▸</span>Supabase</span>
              <span className="tech-pill"><span className="glyph">▸</span>CLIP ViT-B/32</span>
              <span className="tech-pill"><span className="glyph">▸</span>Gemini 1.5 Flash</span>
              <span className="tech-pill"><span className="glyph">▸</span>Google Vision API</span>
              <span className="tech-pill"><span className="glyph">▸</span>Vertex AI</span>
              <span className="tech-pill"><span className="glyph">▸</span>pgvector</span>
              <span className="tech-pill"><span className="glyph">▸</span>Railway</span>
              <span className="tech-pill"><span className="glyph">▸</span>Vercel</span>
              <span className="tech-pill" aria-hidden="true"><span className="glyph">▸</span>FastAPI</span>
              <span className="tech-pill" aria-hidden="true"><span className="glyph">▸</span>Supabase</span>
              <span className="tech-pill" aria-hidden="true"><span className="glyph">▸</span>CLIP ViT-B/32</span>
              <span className="tech-pill" aria-hidden="true"><span className="glyph">▸</span>Gemini 1.5 Flash</span>
              <span className="tech-pill" aria-hidden="true"><span className="glyph">▸</span>Google Vision API</span>
              <span className="tech-pill" aria-hidden="true"><span className="glyph">▸</span>Vertex AI</span>
              <span className="tech-pill" aria-hidden="true"><span className="glyph">▸</span>pgvector</span>
              <span className="tech-pill" aria-hidden="true"><span className="glyph">▸</span>Railway</span>
              <span className="tech-pill" aria-hidden="true"><span className="glyph">▸</span>Vercel</span>
            </div>
          </div>
        </div>
      </section>

      {/* =============== CTA =============== */}
      <section className="cta-section section-pad">
        <div className="cta-glow"></div>
        <div className="cta-panel">
          <div style={{fontFamily:'var(--font-mono)',fontSize:'10.5px',letterSpacing:'0.18em',color:'var(--accent)',textTransform:'uppercase',marginBottom:'18px'}}>
            ◉ READY TO DEPLOY
          </div>
          <h2 className="cta-headline">Start protecting your assets today<span className="period">.</span></h2>
          <p className="cta-sub">Upload your first asset and get results in under 3 seconds.</p>
          <div className="cta-btn-wrap">
            <button className="btn btn-primary btn-lg" onClick={() => navigate('/dashboard')}>
              Launch SENTRY →
            </button>
          </div>
        </div>
      </section>

      {/* =============== FOOTER =============== */}
      <footer style={{borderTop:'1px solid var(--hairline)'}}>
        <div className="footer">
          <div className="footer-left">
            <span className="footer-logo">SENTRY</span>
            <span>© 2026 Digital Asset Protection System</span>
          </div>
          <div className="footer-right">
            <a href="https://github.com/sahid-alam/digital-asset-protection" target="_blank" rel="noopener noreferrer">GitHub ↗</a>
            <span>Made with ❤️</span>
          </div>
        </div>
      </footer>
    </>
  )
}
