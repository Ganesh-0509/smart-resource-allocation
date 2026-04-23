import { useNavigate } from "react-router-dom";

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="landing-page-root">
      <style>{`
        .landing-page-root {
          --border: rgba(26,60,46,0.08);
        }

        /* ─── HERO ─── */
        .hero {
          min-height: calc(100vh - 80px);
          display: grid; grid-template-columns: 1fr 1fr;
          align-items: center;
          padding: 80px 48px;
          gap: 80px;
          max-width: 1280px; margin: 0 auto;
        }

        .hero-eyebrow {
          display: inline-flex; align-items: center; gap: 8px;
          background: var(--saffron-pale);
          border: 1px solid rgba(232,113,42,0.2);
          padding: 8px 16px; border-radius: 100px;
          font-size: 13px; font-weight: 700;
          color: var(--saffron); letter-spacing: 0.05em; text-transform: uppercase;
          margin-bottom: 32px;
        }
        .hero-eyebrow .live-dot {
          width: 8px; height: 8px; border-radius: 50%; background: var(--saffron);
          animation: pulse 1.5s ease-in-out infinite;
        }

        .hero h1 {
          font-family: 'Instrument Serif', serif;
          font-size: clamp(52px, 6vw, 84px);
          line-height: 1.05;
          color: var(--forest);
          margin-bottom: 28px;
          letter-spacing: -0.02em;
        }
        .hero h1 em {
          font-style: italic; color: var(--saffron);
        }

        .hero-sub {
          font-size: 19px; color: var(--slate); line-height: 1.7;
          font-weight: 400; max-width: 480px; margin-bottom: 44px;
        }

        .hero-actions { display: flex; gap: 16px; flex-wrap: wrap; }
        .btn-primary {
          background: var(--forest); color: white;
          padding: 16px 36px; border-radius: 16px;
          font-size: 16px; font-weight: 700;
          border: none; cursor: pointer;
          transition: all .25s;
          display: flex; align-items: center; gap: 10px;
        }
        .btn-primary:hover { background: var(--forest-mid); transform: translateY(-2px); box-shadow: 0 16px 40px rgba(26,60,46,0.2); }
        .btn-secondary {
          background: transparent; color: var(--forest);
          padding: 16px 36px; border-radius: 16px;
          font-size: 16px; font-weight: 700;
          border: 2px solid var(--border);
          cursor: pointer; transition: all .25s;
        }
        .btn-secondary:hover { border-color: var(--forest); background: rgba(26,60,46,0.02); }

        /* Hero visual */
        .hero-visual {
          position: relative;
          display: flex; align-items: center; justify-content: center;
        }

        .dashboard-card {
          background: white;
          border-radius: 32px;
          border: 1px solid var(--border);
          box-shadow: 0 50px 120px rgba(26,60,46,0.1);
          padding: 32px;
          width: 100%;
          animation: float 6s ease-in-out infinite;
        }

        .dash-header {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 24px;
        }
        .dash-title { font-size: 14px; font-weight: 700; color: var(--forest); text-transform: uppercase; letter-spacing: 0.05em; }
        .dash-badge {
          background: var(--forest-pale); color: var(--forest-light);
          font-size: 12px; font-weight: 700; padding: 5px 12px; border-radius: 100px;
        }

        .stat-row {
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px;
          margin-bottom: 24px;
        }
        .stat-box {
          background: var(--cream); border-radius: 18px; padding: 16px;
          text-align: center; border: 1px solid rgba(26,60,46,0.03);
        }
        .stat-num { font-size: 28px; font-weight: 800; color: var(--forest); line-height: 1; margin-bottom: 6px; }
        .stat-label { font-size: 11px; color: var(--slate); font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; }

        .task-list { display: flex; flex-direction: column; gap: 12px; }
        .task-item {
          display: flex; align-items: center; gap: 14px;
          background: var(--cream); border-radius: 16px; padding: 14px 18px;
          border: 1px solid rgba(26,60,46,0.03);
        }
        .urgency-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
        .u-critical { background: #EF4444; box-shadow: 0 0 10px rgba(239,68,68,0.4); }
        .u-high { background: var(--saffron); box-shadow: 0 0 10px rgba(232,113,42,0.4); }
        .u-medium { background: #F59E0B; }
        .task-info { flex: 1; }
        .task-name { font-size: 13px; font-weight: 700; color: var(--charcoal); }
        .task-meta { font-size: 12px; color: var(--slate); margin-top: 3px; font-weight: 500; }
        .task-score {
          font-size: 13px; font-weight: 800; color: var(--forest);
          background: var(--forest-pale); padding: 5px 10px; border-radius: 10px;
        }

        /* floating cards */
        .float-card {
          position: absolute;
          background: white; border-radius: 20px;
          border: 1px solid var(--border);
          box-shadow: 0 25px 70px rgba(0,0,0,0.08);
          padding: 16px 22px;
          font-size: 13px; font-weight: 700;
          display: flex; align-items: center; gap: 12px;
          animation: float-slow 5s ease-in-out infinite;
          z-index: 10;
        }
        .float-card.top-right { top: -30px; right: -40px; animation-delay: 0.5s; }
        .float-card.bottom-left { bottom: -24px; left: -32px; animation-delay: 1s; }
        .float-icon { font-size: 24px; }
        .float-text { color: var(--forest); }
        .float-sub { font-size: 11px; color: var(--slate); font-weight: 500; }

        /* ─── STATS STRIP ─── */
        .stats-strip {
          background: var(--forest);
          padding: 60px 48px;
        }
        .stats-inner {
          max-width: 1280px; margin: 0 auto;
          display: grid; grid-template-columns: repeat(4, 1fr);
          gap: 32px;
        }
        .stat-item { text-align: center; }
        .stat-big {
          font-family: 'Instrument Serif', serif;
          font-size: 56px; color: white; line-height: 1;
          margin-bottom: 10px;
        }
        .stat-big span { color: var(--saffron-light); }
        .stat-desc { font-size: 14px; color: rgba(255,255,255,0.4); font-weight: 500; letter-spacing: 0.02em; }

        /* ─── FEATURES ─── */
        .features {
          padding: 140px 48px;
          max-width: 1280px; margin: 0 auto;
        }
        .section-eyebrow {
          font-size: 13px; font-weight: 800; letter-spacing: 0.12em;
          text-transform: uppercase; color: var(--saffron);
          margin-bottom: 20px;
        }
        .section-title {
          font-family: 'Instrument Serif', serif;
          font-size: clamp(42px, 5vw, 64px);
          color: var(--forest); line-height: 1.1;
          margin-bottom: 80px; max-width: 700px;
          letter-spacing: -0.02em;
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
        }

        .feature-card {
          background: white; border-radius: 32px;
          border: 1px solid var(--border);
          padding: 40px;
          transition: all .4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .feature-card:hover { transform: translateY(-8px); box-shadow: 0 40px 90px rgba(26,60,46,0.12); border-color: var(--forest-pale); }
        .feature-card.accent {
          background: var(--forest); color: white;
          border-color: transparent;
        }
        .feature-card.wide { grid-column: span 2; }

        .feature-icon {
          width: 60px; height: 60px; border-radius: 18px;
          display: flex; align-items: center; justify-content: center;
          font-size: 28px; margin-bottom: 28px;
          background: var(--forest-pale);
        }
        .feature-card.accent .feature-icon { background: rgba(255,255,255,0.12); }

        .feature-title {
          font-size: 20px; font-weight: 800;
          color: var(--forest); margin-bottom: 12px;
          letter-spacing: -0.01em;
        }
        .feature-card.accent .feature-title { color: white; }

        .feature-desc {
          font-size: 15px; color: var(--slate); line-height: 1.7; font-weight: 500;
        }
        .feature-card.accent .feature-desc { color: rgba(255,255,255,0.6); }

        .feature-tag {
          display: inline-block; margin-top: 20px;
          font-size: 12px; font-weight: 700; letter-spacing: 0.05em;
          color: var(--forest-light); text-transform: uppercase;
          background: var(--forest-pale); padding: 5px 12px; border-radius: 100px;
        }
        .feature-card.accent .feature-tag {
          background: rgba(255,255,255,0.1); color: var(--saffron-light);
        }

        /* ─── HOW IT WORKS ─── */
        .how { background: white; padding: 140px 48px; }
        .how-inner { max-width: 1280px; margin: 0 auto; }
        .steps {
          display: grid; grid-template-columns: repeat(4, 1fr);
          gap: 0; margin-top: 80px; position: relative;
        }
        .steps::before {
          content: '';
          position: absolute; top: 36px; left: 10%; right: 10%;
          height: 1px; background: linear-gradient(90deg, transparent, var(--border), var(--border), transparent);
        }
        .step { text-align: center; padding: 0 24px; position: relative; }
        .step-num {
          width: 72px; height: 72px; border-radius: 50%;
          border: 2px solid var(--border);
          display: flex; align-items: center; justify-content: center;
          font-family: 'Instrument Serif', serif; font-size: 30px;
          color: var(--forest); background: white;
          margin: 0 auto 28px;
          position: relative; z-index: 1;
          transition: all .4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .step:hover .step-num {
          background: var(--forest); color: white; border-color: var(--forest);
          transform: scale(1.15) rotate(5deg);
        }
        .step-title { font-size: 18px; font-weight: 800; color: var(--forest); margin-bottom: 12px; }
        .step-desc { font-size: 14px; color: var(--slate); line-height: 1.7; font-weight: 500; }

        /* ─── IMPACT ─── */
        .impact {
          padding: 140px 48px;
          max-width: 1280px; margin: 0 auto;
        }
        .impact-grid {
          display: grid; grid-template-columns: 1fr 1fr; gap: 28px;
          margin-top: 80px;
        }
        .impact-card {
          background: var(--cream); border-radius: 32px;
          border: 1px solid var(--border); padding: 48px;
          transition: all .3s;
        }
        .impact-card:hover { border-color: var(--saffron-light); }
        .impact-card.dark {
          background: var(--forest); border-color: transparent;
        }
        .impact-number {
          font-family: 'Instrument Serif', serif;
          font-size: 72px; color: var(--forest); line-height: 1;
          margin-bottom: 12px; letter-spacing: -0.03em;
        }
        .impact-card.dark .impact-number { color: var(--saffron-light); }
        .impact-unit { font-size: 24px; color: var(--saffron); margin-left: 2px; }
        .impact-label { font-size: 18px; font-weight: 800; color: var(--forest); margin-bottom: 12px; }
        .impact-card.dark .impact-label { color: white; }
        .impact-desc { font-size: 15px; color: var(--slate); line-height: 1.7; font-weight: 500; }
        .impact-card.dark .impact-desc { color: rgba(255,255,255,0.5); }

        .impact-quote {
          grid-column: span 2;
          background: var(--saffron-pale);
          border: 1px solid rgba(232,113,42,0.12);
          border-radius: 32px; padding: 48px 56px;
          display: flex; gap: 40px; align-items: flex-start;
          transition: all .3s;
        }
        .quote-mark {
          font-family: 'Instrument Serif', serif;
          font-size: 96px; color: var(--saffron); line-height: 0.5;
          flex-shrink: 0; margin-top: 12px; opacity: 0.6;
        }
        .quote-text {
          font-family: 'Instrument Serif', serif;
          font-size: 26px; color: var(--forest);
          line-height: 1.5; font-style: italic;
        }
        .quote-author { font-size: 14px; color: var(--saffron); font-weight: 700; margin-top: 20px; text-transform: uppercase; letter-spacing: 0.1em; }

        /* ─── CTA ─── */
        .cta-section {
          padding: 80px 48px 140px;
        }
        .cta-inner {
          max-width: 1280px; margin: 0 auto;
          background: var(--forest);
          border-radius: 40px;
          padding: 100px 80px;
          display: grid; grid-template-columns: 1fr auto;
          gap: 80px; align-items: center;
          position: relative; overflow: hidden;
          box-shadow: 0 60px 120px rgba(26,60,46,0.2);
        }
        .cta-inner::before {
          content: '';
          position: absolute; top: -100px; right: -100px;
          width: 500px; height: 500px; border-radius: 50%;
          background: rgba(232,113,42,0.1); blur: 80px;
        }
        .cta-text h2 {
          font-family: 'Instrument Serif', serif;
          font-size: clamp(42px, 5vw, 64px); color: white;
          line-height: 1.1; margin-bottom: 24px;
          letter-spacing: -0.02em;
        }
        .cta-text p { font-size: 18px; color: rgba(255,255,255,0.45); line-height: 1.7; font-weight: 500; max-width: 600px; }
        .cta-actions { display: flex; flex-direction: column; gap: 16px; align-items: flex-end; position: relative; z-index: 1; }
        .btn-cta-primary {
          background: var(--saffron); color: white;
          padding: 18px 44px; border-radius: 16px;
          font-size: 17px; font-weight: 800;
          border: none; cursor: pointer; transition: all .25s;
          white-space: nowrap;
        }
        .btn-cta-primary:hover { background: var(--saffron-light); transform: translateY(-3px); box-shadow: 0 16px 40px rgba(232,113,42,0.35); }
        .btn-cta-secondary {
          background: transparent; color: rgba(255,255,255,0.5);
          padding: 14px 44px; border-radius: 16px;
          font-size: 15px; font-weight: 600;
          border: 1px solid rgba(255,255,255,0.15);
          cursor: pointer; transition: all .25s;
          white-space: nowrap;
        }
        .btn-cta-secondary:hover { color: white; border-color: rgba(255,255,255,0.4); background: rgba(255,255,255,0.03); }

        /* ─── ANIMATIONS ─── */
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(0.85); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-15px); }
        }
        @keyframes float-slow {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(1.5deg); }
        }
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .hero-left > * {
          animation: fade-up 0.7s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .hero-left > *:nth-child(1) { animation-delay: 0.1s; }
        .hero-left > *:nth-child(2) { animation-delay: 0.2s; }
        .hero-left > *:nth-child(3) { animation-delay: 0.3s; }
        .hero-left > *:nth-child(4) { animation-delay: 0.4s; }

        @media (max-width: 1024px) {
          .hero { grid-template-columns: 1fr; padding: 100px 24px 60px; gap: 64px; }
          .features-grid { grid-template-columns: 1fr 1fr; }
          .feature-card.wide { grid-column: span 2; }
          .steps { grid-template-columns: 1fr 1fr; gap: 48px; }
          .steps::before { display: none; }
          .impact-grid { grid-template-columns: 1fr; }
          .impact-quote { grid-column: span 1; padding: 40px; }
          .stats-inner { grid-template-columns: 1fr 1fr; gap: 40px; }
          .cta-inner { grid-template-columns: 1fr; padding: 72px 48px; text-align: center; }
          .cta-text p { margin: 0 auto; }
          .cta-actions { align-items: center; flex-direction: row; flex-wrap: wrap; justify-content: center; }
        }
        @media (max-width: 640px) {
          .hero h1 { font-size: 48px; }
          .features { padding: 80px 24px; }
          .features-grid { grid-template-columns: 1fr; }
          .feature-card.wide { grid-column: span 1; }
          .how { padding: 80px 24px; }
          .impact { padding: 80px 24px; }
          .cta-section { padding: 40px 24px 80px; }
          .cta-inner { padding: 48px 32px; gap: 40px; }
          .stats-strip { padding: 48px 24px; }
          .stat-big { font-size: 48px; }
        }
      `}</style>

      {/* HERO */}
      <section style={{ background: "var(--warm-white)" }}>
        <div className="hero">
          <div className="hero-left">
            <div className="hero-eyebrow">
              <div className="live-dot"></div>
              Bharat's NGO Response Engine
            </div>
            <h1>
              Community care,<br/>
              <em>intelligently</em><br/>
              coordinated.
            </h1>
            <p className="hero-sub">
              AI-powered volunteer matching, OCR survey digitization, and real-time need tracking — built for NGOs operating across India.
            </p>
            <div className="hero-actions">
              <button onClick={() => navigate("/login")} className="btn-primary">
                Enter Dashboard
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
              </button>
              <button onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: 'smooth' })} className="btn-secondary">See how it works</button>
            </div>
          </div>

          <div className="hero-visual">
            <div className="float-card top-right">
              <div className="float-icon">⚡</div>
              <div>
                <div className="float-text">Match found</div>
                <div className="float-sub">Kavya M. — 98% match</div>
              </div>
            </div>

            <div className="dashboard-card">
              <div className="dash-header">
                <div className="dash-title">Coordinator Dashboard · Madurai</div>
                <div className="dash-badge">● 4 active</div>
              </div>
              <div className="stat-row">
                <div className="stat-box">
                  <div className="stat-num">7</div>
                  <div className="stat-label">Open needs</div>
                </div>
                <div className="stat-box">
                  <div className="stat-num">3</div>
                  <div className="stat-label">In progress</div>
                </div>
                <div className="stat-box">
                  <div className="stat-num">5</div>
                  <div className="stat-label">Done today</div>
                </div>
              </div>
              <div className="task-list">
                <div className="task-item">
                  <div className="urgency-dot u-critical"></div>
                  <div className="task-info">
                    <div className="task-name">Child malnutrition — Ward 7</div>
                    <div className="task-meta">Nutrition · Medical · 3 households</div>
                  </div>
                  <div className="task-score">94</div>
                </div>
                <div className="task-item">
                  <div className="urgency-dot u-high"></div>
                  <div className="task-info">
                    <div className="task-name">Water contamination — Usilampatti</div>
                    <div className="task-meta">Water · Medical · 28 households</div>
                  </div>
                  <div className="task-score">91</div>
                </div>
                <div className="task-item">
                  <div className="urgency-dot u-medium"></div>
                  <div className="task-info">
                    <div className="task-name">Medical camp — Thirumangalam</div>
                    <div className="task-meta">Medical · 45 beneficiaries</div>
                  </div>
                  <div className="task-score">76</div>
                </div>
              </div>
            </div>

            <div className="float-card bottom-left">
              <div className="float-icon">📍</div>
              <div>
                <div className="float-text">SMS sent</div>
                <div className="float-sub">Volunteer notified</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS STRIP */}
      <div className="stats-strip">
        <div className="stats-inner">
          <div className="stat-item">
            <div className="stat-big">3<span>M+</span></div>
            <div className="stat-desc">NGOs operating across India</div>
          </div>
          <div className="stat-item">
            <div className="stat-big">8<span>x</span></div>
            <div className="stat-desc">Faster volunteer matching</div>
          </div>
          <div className="stat-item">
            <div className="stat-big">94<span>%</span></div>
            <div className="stat-desc">OCR accuracy on field surveys</div>
          </div>
          <div className="stat-item">
            <div className="stat-big">0<span>₹</span></div>
            <div className="stat-desc">Cost to NGOs — open platform</div>
          </div>
        </div>
      </div>

      {/* FEATURES */}
      <section id="features" className="features">
        <div className="section-eyebrow">What we built</div>
        <div className="section-title">Every tool an NGO coordinator actually needs.</div>
        <div className="features-grid">

          <div className="feature-card wide accent">
            <div className="feature-icon">📷</div>
            <div className="feature-title">Vision AI — Paper to Digital in Seconds</div>
            <div className="feature-desc">Field workers photograph handwritten survey forms. Our OCR pipeline (OpenCV + Tesseract + Gemini) extracts every field, scores confidence per word, and auto-classifies the need type and urgency.</div>
            <div className="feature-tag">Tesseract · OpenCV · Gemini AI</div>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🧠</div>
            <div className="feature-title">AI Matching Algorithm</div>
            <div className="feature-desc">Weighted scoring across 4 dimensions — skill fit, proximity, schedule availability, and past performance — ranks every volunteer for every task in milliseconds.</div>
            <div className="feature-tag">Smart Scoring Engine</div>
          </div>

          <div className="feature-card">
            <div className="feature-icon">📍</div>
            <div className="feature-title">Live Need Heatmap</div>
            <div className="feature-desc">Leaflet.js map showing every open need as a colour-coded marker. Click any marker to see full task details and jump to coordinator view.</div>
            <div className="feature-tag">Leaflet.js · Real-time GIS</div>
          </div>

          <div className="feature-card">
            <div className="feature-icon">⚙️</div>
            <div className="feature-title">Operations Engine</div>
            <div className="feature-desc">Full lifecycle management — decline with reason, reassign, escalate to senior volunteers, SLA deadline tracking, and audit trail.</div>
            <div className="feature-tag">SLA tracking · Audit trail</div>
          </div>

          <div className="feature-card">
            <div className="feature-icon">📅</div>
            <div className="feature-title">Volunteer Scheduling</div>
            <div className="feature-desc">Weekly availability grid where volunteers set recurring time slots. The matching algorithm uses live schedule data to show who is available.</div>
            <div className="feature-tag">Availability Hub</div>
          </div>

          <div className="feature-card accent" style={{ background: "var(--saffron)", borderColor: "transparent" }}>
            <div className="feature-icon" style={{ background: "rgba(255,255,255,0.15)" }}>✅</div>
            <div className="feature-title">Check-in / Check-out</div>
            <div className="feature-desc" style={{ color: "rgba(255,255,255,0.8)" }}>Volunteers check in at task location with GPS verification. Coordinators see live field status. Emoji outcome rating submitted on checkout.</div>
            <div className="feature-tag" style={{ background: "rgba(255,255,255,0.15)", color: "white" }}>GPS · Field execution</div>
          </div>

        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="how">
        <div className="how-inner">
          <div className="section-eyebrow">End-to-end flow</div>
          <div className="section-title">From a paper survey to a volunteer on the ground.</div>
          <div className="steps">
            <div className="step">
              <div className="step-num">1</div>
              <div className="step-title">Capture</div>
              <div className="step-desc">Field worker photographs a handwritten survey or submits a need report via mobile app.</div>
            </div>
            <div className="step">
              <div className="step-num">2</div>
              <div className="step-title">Classify</div>
              <div className="step-desc">Gemini AI reads the report, identifies need type, scores urgency, and extracts required skills.</div>
            </div>
            <div className="step">
              <div className="step-num">3</div>
              <div className="step-title">Match</div>
              <div className="step-desc">Algorithm scores available volunteers. Coordinator sees ranked matches with proximity and skill fit.</div>
            </div>
            <div className="step">
              <div className="step-num">4</div>
              <div className="step-title">Deploy</div>
              <div className="step-desc">Coordinator assigns in one click. Volunteer receives SMS instantly and checks in at the field.</div>
            </div>
          </div>
        </div>
      </section>

      {/* IMPACT */}
      <section id="impact" className="impact">
        <div className="section-eyebrow">Real-world impact</div>
        <div className="section-title">Built for India's scale.</div>
        <div className="impact-grid">
          <div className="impact-card">
            <div className="impact-number">8<span className="impact-unit">x</span></div>
            <div className="impact-label">Faster volunteer dispatch</div>
            <div className="impact-desc">Manual coordination takes 2–4 hours. Namma Connect reduces this to under 20 minutes from need report to volunteer assigned.</div>
          </div>
          <div className="impact-card dark">
            <div className="impact-number">200+</div>
            <div className="impact-label">Monthly needs handled</div>
            <div className="impact-desc">A district with 50 active volunteers can process 200+ monthly community needs with full audit trail.</div>
          </div>
          <div className="impact-quote">
            <div className="quote-mark">"</div>
            <div>
              <div className="quote-text">In a district with 50 active volunteers, Namma Connect could reduce missed needs by 60% and cut response time from 4 hours to under 30 minutes.</div>
              <div className="quote-author">— Impact projection, Madurai district pilot</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <div className="cta-section">
        <div className="cta-inner">
          <div className="cta-text">
            <h2>Ready to coordinate care at scale?</h2>
            <p>Join NGOs across India using Namma Connect to turn community needs into coordinated action — faster and smarter than ever before.</p>
          </div>
          <div className="cta-actions">
            <button onClick={() => navigate("/login")} className="btn-cta-primary">Enter Dashboard →</button>
            <button onClick={() => navigate("/login")} className="btn-cta-secondary">Request a Demo</button>
          </div>
        </div>
      </div>
    </div>
  );
}
