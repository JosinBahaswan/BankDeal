import { useEffect, useState } from "react";

const T = {
  font: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  bg: "#ffffff",
  surface: "#f6f8f6",
  border: "#e5eae5",
  borderLight: "#eef2ee",
  text: "#0f1a0f",
  textSecondary: "#5a6b5a",
  textMuted: "#8a978a",
  brand: "#0c7a3d",
  brandHover: "#0a6833",
  brandLight: "#e6f4ec",
  shadow: "0 1px 2px rgba(0,0,0,0.03)",
  shadowHover: "0 4px 16px rgba(0,0,0,0.06)",
  shadowLg: "0 12px 40px rgba(0,0,0,0.10)",
};

const PERSONAS = {
  dealmaker: { label: "Deal Maker", desc: "Source, analyze, flip, or wholesale." },
  contractor: { label: "Contractor", desc: "Get job leads from real flippers." },
  realtor: { label: "Realtor", desc: "Get listing referrals from flippers." },
};

function GlobalStyles() {
  return (
    <style>{`
      * { box-sizing: border-box; margin: 0; padding: 0; }
      html { scroll-behavior: smooth; }
      body { letter-spacing: -0.01em; }
      button { font-family: inherit; letter-spacing: inherit; }
      input, textarea, select { font-family: inherit; }
      ::-webkit-scrollbar { width: 8px; height: 8px; }
      ::-webkit-scrollbar-thumb { background: #c9d0c9; border-radius: 4px; }

      @keyframes db-fade-up { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes db-fade { from { opacity: 0; } to { opacity: 1; } }
      @keyframes db-pulse { 0%, 100% { opacity: 1; } 50% { opacity: .4; } }

      .db-fu-1 { animation: db-fade-up .45s .04s ease both; }
      .db-fu-2 { animation: db-fade-up .45s .12s ease both; }
      .db-fu-3 { animation: db-fade-up .45s .20s ease both; }

      .db-btn-primary:hover { background: ${T.brandHover} !important; }
      .db-btn-ghost:hover { background: ${T.surface} !important; }
      .db-card-hover { transition: all .18s; }
      .db-card-hover:hover { box-shadow: ${T.shadowHover}; transform: translateY(-2px); }
      .db-input-focus:focus { border-color: ${T.brand} !important; background: #ffffff !important; }

      @media (max-width: 767px) {
        .db-nav-menu { display: none !important; }
        .db-hamburger { display: flex !important; }
        .db-hero-grid { grid-template-columns: 1fr !important; gap: 32px !important; }
        .db-roles-grid { grid-template-columns: 1fr !important; }
        .db-section-pad { padding: 48px 20px !important; }
        .db-hero-pad { padding: 88px 20px 40px !important; }
        .db-h1 { font-size: 38px !important; }
        .db-h2 { font-size: 26px !important; }
      }
    `}</style>
  );
}

function DealScoreBadge({ score, size = "md" }) {
  const color = score >= 85 ? T.brand : score >= 70 ? "#ca8a04" : T.textMuted;
  const bg = score >= 85 ? T.brandLight : score >= 70 ? "#fef6e0" : T.surface;
  const label = score >= 85 ? "Excellent" : score >= 70 ? "Good" : "OK";
  const sizes = {
    sm: { font: 10, pad: "3px 8px" },
    md: { font: 11, pad: "4px 10px" },
  };
  const s = sizes[size] || sizes.md;

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        background: bg,
        border: `1px solid ${color}44`,
        borderRadius: 100,
        padding: s.pad,
        color,
        fontWeight: 700,
        fontSize: s.font,
        letterSpacing: "0.01em",
        whiteSpace: "nowrap",
      }}
    >
      <span>●</span>
      <span style={{ fontWeight: 800 }}>{score}</span>
      <span style={{ opacity: 0.9 }}>{label}</span>
    </div>
  );
}

function VerifiedBadge({ size = 11 }) {
  return (
    <span
      title="Verified Pro"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size + 4,
        height: size + 4,
        borderRadius: "50%",
        background: "#2563eb",
        color: "#fff",
        fontSize: Math.round(size * 0.7),
        fontWeight: 800,
        lineHeight: 1,
        flexShrink: 0,
      }}
    >
      ✓
    </span>
  );
}

export default function LandingScreen({
  setAuthMode,
  setScreen,
  setUserType,
  setAuthForm,
  onOpenLegal,
}) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function routeToAuth(mode, role, prefill = {}) {
    const safeRole = role || "dealmaker";
    const nextMode = mode === "signin" ? "login" : mode;

    setUserType?.(safeRole);
    setAuthMode?.(nextMode);
    setAuthForm?.((prev) => ({
      ...prev,
      name: prefill.name || "",
      email: prefill.email || "",
      password: prefill.password || "",
    }));

    setScreen?.("auth");
  }

  function openAuth(mode, role) {
    routeToAuth(mode, role);
    setMenuOpen(false);
  }

  function scrollToSection(sectionId) {
    if (typeof document !== "undefined") {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    setMenuOpen(false);
  }

  return (
    <div
      style={{
        fontFamily: T.font,
        background: T.bg,
        color: T.text,
        minHeight: "100vh",
        WebkitFontSmoothing: "antialiased",
      }}
    >
      <GlobalStyles />

      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          background: scrolled ? "rgba(255,255,255,0.88)" : T.bg,
          backdropFilter: scrolled ? "saturate(180%) blur(18px)" : "none",
          WebkitBackdropFilter: scrolled ? "saturate(180%) blur(18px)" : "none",
          borderBottom: `1px solid ${scrolled ? T.border : "transparent"}`,
          transition: "all .2s",
          padding: "0 24px",
          height: 60,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <img
            src="/image.png"
            alt="DealBank"
            style={{
              height: 34,
              width: "auto",
              display: "block",
            }}
          />
        </div>

        <div className="db-nav-menu" style={{ display: "flex", gap: 28, fontSize: 14, fontWeight: 500, color: T.textSecondary }}>
          <span style={{ cursor: "pointer" }} onClick={() => scrollToSection("how-it-works")}>How it works</span>
          <span style={{ cursor: "pointer" }} onClick={() => scrollToSection("pricing")}>Pricing</span>
          <span style={{ cursor: "pointer" }} onClick={() => scrollToSection("platform-modules")}>Modules</span>
        </div>

        <div className="db-nav-menu" style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => openAuth("signin")}
            className="db-btn-ghost"
            style={{
              background: "transparent",
              border: "none",
              color: T.text,
              padding: "8px 14px",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Log in
          </button>
          <button
            onClick={() => openAuth("signup", "dealmaker")}
            className="db-btn-primary"
            style={{
              background: T.brand,
              border: "none",
              color: "#fff",
              padding: "8px 18px",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Sign up free
          </button>
        </div>

        <button
          className="db-hamburger"
          onClick={() => setMenuOpen((prev) => !prev)}
          style={{
            display: "none",
            flexDirection: "column",
            gap: 5,
            background: "transparent",
            border: "none",
            padding: 8,
            cursor: "pointer",
          }}
        >
          <span
            style={{
              width: 22,
              height: 2,
              background: T.text,
              borderRadius: 2,
              transition: "all .2s",
              transform: menuOpen ? "rotate(45deg) translate(5px,5px)" : "none",
            }}
          />
          <span
            style={{
              width: 22,
              height: 2,
              background: T.text,
              borderRadius: 2,
              transition: "all .2s",
              opacity: menuOpen ? 0 : 1,
            }}
          />
          <span
            style={{
              width: 22,
              height: 2,
              background: T.text,
              borderRadius: 2,
              transition: "all .2s",
              transform: menuOpen ? "rotate(-45deg) translate(5px,-5px)" : "none",
            }}
          />
        </button>
      </nav>

      {menuOpen && (
        <div
          style={{
            position: "fixed",
            top: 60,
            left: 0,
            right: 0,
            zIndex: 90,
            background: T.bg,
            borderBottom: `1px solid ${T.border}`,
            padding: "16px 20px",
            animation: "db-fade .15s ease",
          }}
        >
          <div onClick={() => scrollToSection("how-it-works")} style={{ padding: "13px 0", fontSize: 15, fontWeight: 500, borderBottom: `1px solid ${T.borderLight}`, cursor: "pointer" }}>How it works</div>
          <div onClick={() => scrollToSection("pricing")} style={{ padding: "13px 0", fontSize: 15, fontWeight: 500, borderBottom: `1px solid ${T.borderLight}`, cursor: "pointer" }}>Pricing</div>
          <div onClick={() => scrollToSection("platform-modules")} style={{ padding: "13px 0", fontSize: 15, fontWeight: 500, borderBottom: `1px solid ${T.borderLight}`, cursor: "pointer" }}>Modules</div>
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button
              onClick={() => openAuth("signin")}
              style={{ flex: 1, background: T.surface, border: `1px solid ${T.border}`, color: T.text, padding: "11px", borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: "pointer" }}
            >
              Log in
            </button>
            <button
              onClick={() => openAuth("signup", "dealmaker")}
              style={{ flex: 2, background: T.brand, border: "none", color: "#fff", padding: "11px", borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: "pointer" }}
            >
              Sign up free
            </button>
          </div>
        </div>
      )}

      <section className="db-hero-pad" style={{ padding: "120px 24px 64px", maxWidth: 1100, margin: "0 auto" }}>
        <div className="db-hero-grid" style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 60, alignItems: "center" }}>
          <div>
            <div className="db-fu-1" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: T.brandLight, borderRadius: 100, padding: "6px 14px", marginBottom: 22 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: T.brand, animation: "db-pulse 2s infinite" }} />
              <span style={{ fontSize: 13, color: T.brand, fontWeight: 600 }}>14,284 members · 3 closed today</span>
            </div>

            <h1 className="db-h1 db-fu-2" style={{ fontSize: 52, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.05, marginBottom: 16 }}>
              Your next deal
              <br />
              is on DealBank.
            </h1>

            <p className="db-fu-3" style={{ fontSize: 17, color: T.textSecondary, lineHeight: 1.5, marginBottom: 28, maxWidth: 440 }}>
              The network where wholesalers, flippers, contractors, and realtors meet around one deal. <strong style={{ color: T.text }}>Free to join · $125/mo unlocks the Dialer.</strong>
            </p>

            <div className="db-fu-3" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                onClick={() => openAuth("signup", "dealmaker")}
                className="db-btn-primary"
                style={{ background: T.brand, border: "none", color: "#fff", padding: "14px 24px", borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: "pointer" }}
              >
                Get started free →
              </button>
              <button
                onClick={() => openAuth("signin")}
                className="db-btn-ghost"
                style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.text, padding: "14px 24px", borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: "pointer" }}
              >
                Log in
              </button>
            </div>

            <div style={{ marginTop: 14, fontSize: 13, color: T.textMuted }}>No credit card · Free to browse · Pro = $125/mo</div>
          </div>

          <div className="db-fu-2" style={{ position: "relative" }}>
            <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 16, padding: 20, boxShadow: T.shadowLg }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: T.brand, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14 }}>TW</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                      T. Williams <VerifiedBadge size={10} />
                    </div>
                    <div style={{ fontSize: 12, color: T.textMuted }}>Just posted · Wholesale</div>
                  </div>
                </div>
                <DealScoreBadge score={91} size="sm" />
              </div>

              <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 3 }}>789 Oak Grove Blvd</div>
              <div style={{ fontSize: 13, color: T.textSecondary, marginBottom: 14 }}>Sacramento, CA · 3bd/2ba</div>

              <div style={{ background: T.surface, borderRadius: 12, padding: 14, marginBottom: 14 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
                  {[["ARV", "$420K"], ["Asking", "$228K"], ["ROI", "31%"]].map(([k, v]) => (
                    <div key={k}>
                      <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 3, fontWeight: 500 }}>{k}</div>
                      <div style={{ fontSize: 17, fontWeight: 800, color: T.brand, letterSpacing: "-0.02em" }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => openAuth("signup", "dealmaker")}
                className="db-btn-primary"
                style={{ width: "100%", background: T.brand, border: "none", color: "#fff", padding: "12px", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer" }}
              >
                View deal
              </button>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="db-section-pad" style={{ padding: "68px 24px", borderTop: `1px solid ${T.border}` }}>
        <div style={{ maxWidth: 1120, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 30 }}>
            <h2 className="db-h2" style={{ fontSize: 34, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 10 }}>How Deals Move on DealBank</h2>
            <p style={{ fontSize: 16, color: T.textSecondary, maxWidth: 760, margin: "0 auto" }}>
              The workflow is built to keep dealmakers, contractors, and realtors in one operating lane from analysis to close.
            </p>
          </div>

          <div className="db-roles-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 14, marginBottom: 16 }}>
            {[
              { step: "01", title: "Analyze & qualify", body: "Run offer math, hold/sell cost modeling, and save high-quality opportunities into pipeline." },
              { step: "02", title: "Execute the project", body: "Coordinate contractors, progress jobs, and keep deal notes and contract milestones aligned." },
              { step: "03", title: "Exit with speed", body: "Push referral-ready listings to realtors and track commission splits with full visibility." },
            ].map((item) => (
              <div key={item.step} style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 14, padding: "18px 18px 16px" }}>
                <div style={{ fontSize: 11, color: T.brand, letterSpacing: 2, marginBottom: 8 }}>{item.step}</div>
                <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 8 }}>{item.title}</div>
                <div style={{ fontSize: 14, color: T.textSecondary, lineHeight: 1.65 }}>{item.body}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
            {[
              ["Avg time to first quote", "22h"],
              ["Referral conversion", "31%"],
              ["Deals tracked monthly", "5,400+"],
              ["Multi-role active members", "14,284"],
            ].map(([label, value]) => (
              <div key={label} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "14px 12px", textAlign: "center" }}>
                <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 24, color: T.brand, fontWeight: 800, letterSpacing: "-0.03em" }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="db-section-pad" style={{ padding: "72px 24px", background: T.surface, borderTop: `1px solid ${T.border}` }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", textAlign: "center" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: T.brandLight, borderRadius: 100, padding: "6px 14px", marginBottom: 18 }}>
            <span style={{ fontSize: 13, color: T.brand, fontWeight: 700 }}>ONE CLOSED DEAL CAN PAY FOR YEARS</span>
          </div>
          <h2 className="db-h2" style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 12 }}>Start free. Go Pro when ready.</h2>
          <p style={{ fontSize: 16, color: T.textSecondary, maxWidth: 560, margin: "0 auto 36px" }}>
            Browse the marketplace and analyze up to 25 deals per month for free. Pro unlocks the Dialer + unlimited analyses.
          </p>

          <div className="db-roles-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, maxWidth: 820, margin: "0 auto" }}>
            <div style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 16, padding: 24, textAlign: "left", position: "relative" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.textSecondary, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Free</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 14 }}>
                <span style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-0.03em" }}>$0</span>
                <span style={{ fontSize: 14, color: T.textSecondary }}>/month</span>
              </div>
              {[
                "Browse marketplace",
                "Post deals to wholesale",
                "25 free Analyzer runs/mo",
                "CRM + Pipeline",
                "Deal alerts (first-to-claim)",
              ].map((item) => (
                <div key={item} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0" }}>
                  <div style={{ width: 16, height: 16, borderRadius: "50%", background: T.surface, color: T.textSecondary, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800 }}>✓</div>
                  <span style={{ fontSize: 14 }}>{item}</span>
                </div>
              ))}
            </div>

            <div style={{ background: `linear-gradient(135deg, ${T.brandLight} 0%, ${T.bg} 100%)`, border: `2px solid ${T.brand}`, borderRadius: 16, padding: 24, textAlign: "left", position: "relative", boxShadow: T.shadowHover }}>
              <div style={{ position: "absolute", top: -11, left: "50%", transform: "translateX(-50%)", background: T.brand, color: "#fff", fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 100, letterSpacing: "0.05em" }}>FOR CLOSERS</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.brand, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>Pro</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 14 }}>
                <span style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-0.03em" }}>$125</span>
                <span style={{ fontSize: 14, color: T.textSecondary }}>/month</span>
              </div>
              {[
                "Everything in Free",
                "Unlimited Power Dialer",
                "Unlimited Analyzer",
                "Targeted list builder",
                "Full deal flow + eSign",
                "Priority marketplace placement",
              ].map((item) => (
                <div key={item} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0" }}>
                  <div style={{ width: 16, height: 16, borderRadius: "50%", background: T.brand, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800 }}>✓</div>
                  <span style={{ fontSize: 14 }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="platform-modules" className="db-section-pad" style={{ padding: "70px 24px", borderTop: `1px solid ${T.border}` }}>
        <div style={{ maxWidth: 1120, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 26 }}>
            <h2 className="db-h2" style={{ fontSize: 34, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 10 }}>Everything in One Deal Operating System</h2>
            <p style={{ fontSize: 16, color: T.textSecondary, maxWidth: 760, margin: "0 auto" }}>
              We added back the detailed capabilities so visitors understand the full platform, not just pricing.
            </p>
          </div>

          <div className="db-roles-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 14 }}>
            {[
              { title: "Analyzer", points: ["Offer and ROI calculation", "Holding and selling costs", "Scenario-safe underwriting"] },
              { title: "Pipeline", points: ["Stage-based deal tracking", "Contract workflow visibility", "Action history and updates"] },
              { title: "Marketplace", points: ["Wholesale deal distribution", "Buyer-ready listing data", "Faster offer circulation"] },
              { title: "Contractor Hub", points: ["Trade-specific lead matching", "Quote and progress controls", "Performance and reviews"] },
              { title: "Realtor Hub", points: ["Referral-ready listing queue", "Active listing execution", "Split and compliance tracking"] },
              { title: "Tools Suite", points: ["Lead tools and dialer", "CRM sequence support", "Partner resources"] },
            ].map((module) => (
              <div key={module.title} style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 14, padding: "18px 18px 16px" }}>
                <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 8 }}>{module.title}</div>
                {module.points.map((point) => (
                  <div key={point} style={{ fontSize: 14, color: T.textSecondary, lineHeight: 1.65, marginBottom: 4 }}>
                    • {point}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="db-section-pad" style={{ padding: "72px 24px", maxWidth: 1000, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <h2 className="db-h2" style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 10 }}>Which one are you?</h2>
        </div>
        <div className="db-roles-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
          {Object.entries(PERSONAS).map(([key, p]) => (
            <div key={key} onClick={() => openAuth("signup", key)} className="db-card-hover" style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 16, padding: 24, cursor: "pointer" }}>
              <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-0.01em", marginBottom: 6 }}>{p.label}</div>
              <div style={{ fontSize: 14, color: T.textSecondary, marginBottom: 18 }}>{p.desc}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.brand }}>Join as {p.label} →</div>
            </div>
          ))}
        </div>
      </section>

      <section className="db-section-pad" style={{ padding: "80px 24px", textAlign: "center", background: `linear-gradient(135deg, ${T.brandLight}, ${T.bg})` }}>
        <h2 className="db-h2" style={{ fontSize: 40, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: 14 }}>Ready to close more deals?</h2>
        <p style={{ fontSize: 16, color: T.textSecondary, marginBottom: 28 }}>25 free credits every month. No card required.</p>
        <button
          onClick={() => openAuth("signup", "dealmaker")}
          className="db-btn-primary"
          style={{ background: T.brand, border: "none", color: "#fff", padding: "15px 30px", borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: "pointer" }}
        >
          Create your free account
        </button>
      </section>

      <footer style={{ padding: "28px 24px", borderTop: `1px solid ${T.border}`, background: T.bg }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 24, height: 24, borderRadius: 7, background: T.brand, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13 }}>D</div>
            <span style={{ fontSize: 15, fontWeight: 700 }}>DealBank</span>
            <span style={{ fontSize: 13, color: T.textMuted, marginLeft: 6 }}>© 2026</span>
          </div>
          <div style={{ display: "flex", gap: 22, fontSize: 13, color: T.textSecondary, fontWeight: 500 }}>
            <span style={{ cursor: "pointer" }} onClick={() => onOpenLegal?.("terms")}>Terms</span>
            <span style={{ cursor: "pointer" }} onClick={() => onOpenLegal?.("privacy")}>Privacy</span>
            <span style={{ cursor: "pointer" }} onClick={() => openAuth("signin")}>Help</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
