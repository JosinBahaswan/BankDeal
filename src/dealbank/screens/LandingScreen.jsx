import { useEffect, useState } from "react";

const USER_TYPE_BY_TAB = {
  wholesaler: "dealmaker",
  flipper: "dealmaker",
  contractor: "contractor",
  realtor: "realtor",
};

export default function LandingScreen({
  setAuthMode,
  setScreen,
  setUserType,
  setAuthForm,
  onOpenLegal,
}) {
  const [activeTab, setActiveTab] = useState("wholesaler");
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [dealCount, setDealCount] = useState(0);
  const [memberCount, setMemberCount] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    let deals = 0;
    let members = 0;
    const iv = setInterval(() => {
      if (deals < 2847) {
        deals = Math.min(deals + 43, 2847);
        setDealCount(deals);
      }
      if (members < 14200) {
        members = Math.min(members + 214, 14200);
        setMemberCount(members);
      }
      if (deals >= 2847 && members >= 14200) clearInterval(iv);
    }, 16);
    return () => clearInterval(iv);
  }, []);

  function goAuth(mode, tabOrType = "", options = {}) {
    const type = USER_TYPE_BY_TAB[tabOrType] || tabOrType || "";
    if (type) setUserType(type);
    setAuthMode(mode);

    if (options.prefill && setAuthForm) {
      setAuthForm((prev) => ({ ...prev, ...options.prefill }));
    }

    setMenuOpen(false);
    setScreen("auth");
  }

  const personas = {
    wholesaler: {
      label: "Wholesaler",
      color: "#22c55e",
      headline: "List your deals.\nGet paid fast.",
      body: "You found the deal. DealBank puts it in front of hundreds of active flippers in your market. No cold calls, no chasing. Post your contract, set your fee, and let the network work.",
      features: [
        "Post deals to verified flippers instantly",
        "Set your assignment fee upfront",
        "eSign contracts in-platform",
        "1.5% fee only when you close",
        "Built-in buyer network of active investors",
      ],
      cta: "List Your First Deal Free",
      stat: "Avg. 8 buyer inquiries within 24hrs",
    },
    flipper: {
      label: "Flipper",
      color: "#eab308",
      headline: "Find deals.\nBuild your crew.\nSell fast.",
      body: "DealBank is your full operating system. Browse off-market wholesale deals, analyze with AI, hire vetted contractors, and connect with realtors who specialize in flips.",
      features: [
        "AI deal analyzer with full P&L",
        "Off-market wholesale deal feed",
        "Vetted contractor network",
        "Realtor matching at sell time",
        "Power dialer + CRM for your own leads",
        "eSign purchase contracts in-platform",
      ],
      cta: "Start Flipping Smarter",
      stat: "Avg. flipper saves 11hrs/deal on admin",
    },
    contractor: {
      label: "Contractor",
      color: "#f97316",
      headline: "Stop chasing work.\nLet flips come to you.",
      body: "Verified contractors on DealBank get job leads from active flippers in their market. No bidding wars on generic platforms. Real investors with real budgets, ready to move.",
      features: [
        "Job leads from vetted flippers only",
        "Quote directly in-platform",
        "Get paid on completion",
        "Build your ratings and reputation",
        "Priority placement with Pro subscription",
      ],
      cta: "Join the Contractor Network",
      stat: "Avg. Pro contractor wins 4 jobs/month",
    },
    realtor: {
      label: "Realtor",
      color: "#3b82f6",
      headline: "Get listing referrals.\nClose more deals.",
      body: "When a flipper is done rehabbing, DealBank matches them with local realtors who know how to sell investment properties fast. Free account — 25% split only when the deal closes.",
      features: [
        "Referrals from active flippers in your market",
        "Free account — no monthly fee ever",
        "75% of your commission, always",
        "Manage listings inside DealBank",
        "Direct Deal Maker messaging",
      ],
      cta: "Get Referrals Free",
      stat: "Avg. realtor closes 3 extra deals/month",
    },
  };

  const deals = [
    { addr: "3421 Poplar Ave", city: "Sacramento, CA", arv: "$385K", ask: "$195K", reno: "$62K", roi: "28%", type: "Wholesale", badge: "#eab308", days: 2 },
    { addr: "789 Oak Grove Blvd", city: "Sacramento, CA", arv: "$420K", ask: "$228K", reno: "$38K", roi: "31%", type: "Fix & Flip", badge: "#22c55e", days: 0 },
    { addr: "1145 Desert Rose Ln", city: "Fresno, CA", arv: "$275K", ask: "$138K", reno: "$44K", roi: "21%", type: "Wholesale", badge: "#eab308", days: 1 },
    { addr: "4402 Elmwood Ct", city: "Modesto, CA", arv: "$340K", ask: "$172K", reno: "$58K", roi: "26%", type: "Fix & Flip", badge: "#22c55e", days: 3 },
  ];

  const active = personas[activeTab];
  const px = isMobile ? "20px" : "60px";

  return (
    <div style={{ fontFamily: "'Courier New', monospace", background: "#050a05", color: "#e8f0e8", minHeight: "100vh", overflowX: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        html { scroll-behavior:smooth; }
        ::-webkit-scrollbar { width:3px; }
        ::-webkit-scrollbar-thumb { background:#22c55e44; border-radius:2px; }

        @keyframes fadeUp  { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:.4} }
        @keyframes ticker  { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        @keyframes glow    { 0%,100%{box-shadow:0 0 20px #22c55e22} 50%{box-shadow:0 0 40px #22c55e55} }
        @keyframes slideDown { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }

        .fu  { animation:fadeUp .6s ease both; }
        .fu1 { animation:fadeUp .6s .1s ease both; }
        .fu2 { animation:fadeUp .6s .2s ease both; }
        .fu3 { animation:fadeUp .6s .3s ease both; }
        .fu4 { animation:fadeUp .6s .4s ease both; }

        .btn-g  { transition:all .15s; }
        .btn-g:hover  { background:#16a34a!important; transform:translateY(-1px); }
        .btn-o  { transition:all .15s; }
        .btn-o:hover  { background:#22c55e22!important; border-color:#22c55e!important; color:#22c55e!important; }
        .ptab   { transition:all .15s; cursor:pointer; }
        .ptab:hover { opacity:.85; }
        .dcard  { transition:all .2s; cursor:pointer; }
        .dcard:hover { transform:translateY(-3px); border-color:#22c55e66!important; }
        .frow   { transition:background .15s; }
        .frow:hover { background:#0d1a0d!important; }
        .nlink  { transition:color .15s; cursor:pointer; }
        .nlink:hover { color:#22c55e!important; }

        .mob-menu { animation:slideDown .2s ease; }

        .grid-4 { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; }
        .grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:40px; }
        .grid-stats { display:flex; gap:40px; flex-wrap:wrap; }
        .steps { display:grid; grid-template-columns:repeat(4,1fr); gap:0; position:relative; }
        .pricing-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; }

        @media (max-width:900px) {
          .grid-4      { grid-template-columns:1fr 1fr!important; }
          .pricing-grid{ grid-template-columns:1fr 1fr!important; }
          .steps       { grid-template-columns:1fr 1fr!important; gap:32px!important; }
          .step-line   { display:none!important; }
        }
        @media (max-width:767px) {
          .nav-links   { display:none!important; }
          .nav-btns    { display:none!important; }
          .hamburger   { display:flex!important; }
          .grid-4      { grid-template-columns:1fr!important; }
          .grid-2      { grid-template-columns:1fr!important; gap:24px!important; }
          .pricing-grid{ grid-template-columns:1fr!important; }
          .steps       { grid-template-columns:1fr!important; gap:28px!important; }
          .step-line   { display:none!important; }
          .grid-stats  { gap:24px!important; }
          .footer-inner{ flex-direction:column!important; align-items:flex-start!important; gap:20px!important; }
          .hero-btns   { flex-direction:column!important; }
          .hero-btns button { width:100%!important; }
        }
      `}</style>

      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 200,
          background: scrolled ? "#050a05f0" : "transparent",
          borderBottom: scrolled ? "1px solid #1a2e1a" : "1px solid transparent",
          backdropFilter: scrolled ? "blur(16px)" : "none",
          transition: "all .3s",
          padding: `0 ${px}`,
          height: isMobile ? 74 : 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <div style={{ position: "relative", width: 30, height: 30 }}>
            <div style={{ position: "absolute", inset: 0, background: "#22c55e", borderRadius: 5, transform: "rotate(45deg) scale(0.7)" }} />
            <div style={{ position: "absolute", inset: 4, background: "#050a05", borderRadius: 3, transform: "rotate(45deg) scale(0.7)" }} />
            <div style={{ position: "absolute", inset: 9, background: "#22c55e", borderRadius: 2, transform: "rotate(45deg) scale(0.7)" }} />
          </div>
          <span style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: 20, fontWeight: 900, letterSpacing: -0.5 }}>
            Deal<span style={{ color: "#22c55e" }}>Bank</span>
          </span>
        </div>

        <div className="nav-links" style={{ display: "flex", gap: 28, fontSize: 11, letterSpacing: 2, color: "#6b8f6b" }}>
          {["HOW IT WORKS", "MARKETPLACE", "PRICING", "ABOUT"].map((label) => (
            <span key={label} className="nlink">{label}</span>
          ))}
        </div>

        <div className="nav-btns" style={{ display: "flex", gap: 8 }}>
          <button
            className="btn-o"
            onClick={() => goAuth("login")}
            style={{ background: "transparent", border: "1px solid #1a2e1a", color: "#6b8f6b", borderRadius: 6, padding: "8px 16px", fontSize: 10, letterSpacing: 2, cursor: "pointer", fontFamily: "'Courier New',monospace" }}
          >
            SIGN IN
          </button>
          <button
            className="btn-g"
            onClick={() => goAuth("signup", "dealmaker")}
            style={{ background: "#22c55e", border: "none", color: "#000", borderRadius: 6, padding: "8px 18px", fontSize: 10, letterSpacing: 2, fontWeight: "bold", cursor: "pointer", fontFamily: "'Courier New',monospace" }}
          >
            JOIN FREE →
          </button>
        </div>

        <button
          className="hamburger"
          onClick={() => setMenuOpen((prev) => !prev)}
          style={{ display: "none", flexDirection: "column", gap: 5, background: "transparent", border: "none", cursor: "pointer", padding: 8 }}
        >
          <span style={{ display: "block", width: 24, height: 2, background: menuOpen ? "#22c55e" : "#6b8f6b", transition: "all .2s", transform: menuOpen ? "rotate(45deg) translate(5px,5px)" : "none" }} />
          <span style={{ display: "block", width: 24, height: 2, background: menuOpen ? "transparent" : "#6b8f6b", transition: "all .2s" }} />
          <span style={{ display: "block", width: 24, height: 2, background: menuOpen ? "#22c55e" : "#6b8f6b", transition: "all .2s", transform: menuOpen ? "rotate(-45deg) translate(5px,-5px)" : "none" }} />
        </button>
      </nav>

      {menuOpen && (
        <div className="mob-menu" style={{ position: "fixed", top: isMobile ? 74 : 64, left: 0, right: 0, zIndex: 190, background: "#0a1a0a", borderBottom: "1px solid #1a2e1a", padding: "20px" }}>
          {["HOW IT WORKS", "MARKETPLACE", "PRICING", "ABOUT"].map((label) => (
            <div key={label} onClick={() => setMenuOpen(false)} style={{ padding: "14px 0", fontSize: 12, letterSpacing: 3, color: "#6b8f6b", borderBottom: "1px solid #1a2e1a", cursor: "pointer" }}>
              {label}
            </div>
          ))}
          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <button onClick={() => goAuth("login")} style={{ flex: 1, background: "transparent", border: "1px solid #1a2e1a", color: "#6b8f6b", borderRadius: 6, padding: "12px", fontSize: 10, letterSpacing: 2, cursor: "pointer", fontFamily: "'Courier New',monospace" }}>SIGN IN</button>
            <button onClick={() => goAuth("signup", "dealmaker")} style={{ flex: 2, background: "#22c55e", border: "none", color: "#000", borderRadius: 6, padding: "12px", fontSize: 10, letterSpacing: 2, fontWeight: "bold", cursor: "pointer", fontFamily: "'Courier New',monospace" }}>JOIN FREE →</button>
          </div>
        </div>
      )}

      <section style={{ paddingTop: isMobile ? 110 : 140, paddingBottom: isMobile ? 60 : 100, paddingLeft: px, paddingRight: px, maxWidth: 1200, margin: "0 auto", position: "relative" }}>
        <div style={{ position: "absolute", inset: 0, opacity: 0.03, backgroundImage: "linear-gradient(#22c55e 1px,transparent 1px),linear-gradient(90deg,#22c55e 1px,transparent 1px)", backgroundSize: "60px 60px", pointerEvents: "none" }} />

        <div className="fu" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#0d1a0d", border: "1px solid #1a3a1a", borderRadius: 100, padding: "6px 14px 6px 10px", marginBottom: 24 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", animation: "pulse 2s infinite", flexShrink: 0 }} />
          <span style={{ fontSize: isMobile ? 9 : 10, color: "#22c55e", letterSpacing: isMobile ? 1 : 3, whiteSpace: "nowrap" }}>LIVE — {dealCount.toLocaleString()} ACTIVE DEALS</span>
        </div>

        <h1 className="fu1" style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: "clamp(44px,8vw,88px)", fontWeight: 900, lineHeight: 1.0, letterSpacing: -2, marginBottom: 24, maxWidth: 760 }}>
          Where Deals
          <br />
          <span style={{ color: "#22c55e", position: "relative" }}>
            Get Done.
            <div style={{ position: "absolute", bottom: -4, left: 0, right: 0, height: 4, background: "#22c55e", borderRadius: 2, opacity: 0.35 }} />
          </span>
        </h1>

        <p className="fu2" style={{ fontSize: isMobile ? 14 : 16, color: "#6b8f6b", lineHeight: 1.8, maxWidth: 500, marginBottom: 36 }}>
          DealBank is the network connecting wholesalers, flippers, contractors, and realtors — all around one deal. List it. Analyze it. Build it. Sell it.
        </p>

        <div className="fu3 hero-btns" style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: isMobile ? 40 : 56 }}>
          <button className="btn-g" onClick={() => goAuth("signup", activeTab)} style={{ background: "#22c55e", border: "none", color: "#000", borderRadius: 8, padding: "14px 28px", fontSize: 11, letterSpacing: 3, fontWeight: "bold", cursor: "pointer", fontFamily: "'Courier New',monospace", animation: "glow 3s infinite" }}>
            JOIN THE NETWORK →
          </button>
          <button className="btn-o" onClick={() => goAuth("signup", "dealmaker")} style={{ background: "transparent", border: "1px solid #1a2e1a", color: "#6b8f6b", borderRadius: 8, padding: "14px 22px", fontSize: 11, letterSpacing: 3, cursor: "pointer", fontFamily: "'Courier New',monospace" }}>
            VIEW LIVE DEALS
          </button>
        </div>

        <div className="fu4 grid-stats" style={{ display: "flex", gap: 40, flexWrap: "wrap" }}>
          {[
            { n: `${memberCount.toLocaleString()}+`, l: "Members" },
            { n: "2,847", l: "Deals Closed" },
            { n: "$1.2B+", l: "Deal Volume" },
            { n: "48hrs", l: "Avg Time to Buyer" },
          ].map(({ n, l }) => (
            <div key={l}>
              <div style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: isMobile ? 26 : 32, fontWeight: 900, color: "#e8f0e8", lineHeight: 1 }}>{n}</div>
              <div style={{ fontSize: 9, color: "#6b8f6b", letterSpacing: 3, marginTop: 4 }}>{l.toUpperCase()}</div>
            </div>
          ))}
        </div>
      </section>

      <div style={{ borderTop: "1px solid #1a2e1a", borderBottom: "1px solid #1a2e1a", background: "#080d08", overflow: "hidden", padding: "11px 0" }}>
        <div style={{ display: "flex", animation: "ticker 22s linear infinite", whiteSpace: "nowrap" }}>
          {[...deals, ...deals, ...deals].map((d, i) => (
            <div key={`${d.addr}-${i}`} style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "0 28px", borderRight: "1px solid #1a2e1a" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: d.days === 0 ? "#ef4444" : "#22c55e", flexShrink: 0 }} />
              <span style={{ fontSize: 10, color: "#e8f0e8", letterSpacing: 1 }}>{d.addr}, {d.city}</span>
              <span style={{ fontSize: 10, color: "#22c55e", fontWeight: "bold" }}>ARV {d.arv}</span>
              <span style={{ fontSize: 9, color: d.badge, background: `${d.badge}22`, border: `1px solid ${d.badge}44`, borderRadius: 3, padding: "1px 6px", letterSpacing: 1 }}>{d.type.toUpperCase()}</span>
              {d.days === 0 && <span style={{ fontSize: 9, color: "#ef4444", letterSpacing: 1 }}>NEW TODAY</span>}
            </div>
          ))}
        </div>
      </div>

      <section style={{ padding: `${isMobile ? "60px" : "100px"} ${px}`, maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ fontSize: 10, color: "#22c55e", letterSpacing: 5, marginBottom: 14 }}>WHO IT'S FOR</div>
        <h2 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: "clamp(32px,5vw,48px)", fontWeight: 900, letterSpacing: -1, marginBottom: 36, lineHeight: 1.1 }}>
          One platform.
          <br />
          Every player in the deal.
        </h2>

        <div style={{ display: "flex", gap: 8, marginBottom: 36, flexWrap: "wrap" }}>
          {Object.entries(personas).map(([key, p]) => (
            <div
              key={key}
              className="ptab"
              onClick={() => setActiveTab(key)}
              style={{
                padding: isMobile ? "10px 16px" : "10px 22px",
                borderRadius: 6,
                fontSize: 10,
                letterSpacing: 2,
                border: activeTab === key ? `1px solid ${p.color}` : "1px solid #1a2e1a",
                background: activeTab === key ? `${p.color}18` : "transparent",
                color: activeTab === key ? p.color : "#6b8f6b",
                fontFamily: "'Courier New',monospace",
              }}
            >
              {p.label.toUpperCase()}
            </div>
          ))}
        </div>

        <div key={activeTab} className="grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, alignItems: "start", animation: "fadeUp .4s ease both" }}>
          <div>
            <h3 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: "clamp(26px,4vw,40px)", fontWeight: 900, letterSpacing: -1, marginBottom: 18, lineHeight: 1.15, color: active.color, whiteSpace: "pre-line" }}>
              {active.headline}
            </h3>
            <p style={{ fontSize: isMobile ? 13 : 14, color: "#6b8f6b", lineHeight: 1.9, marginBottom: 24 }}>{active.body}</p>
            <div style={{ fontSize: 9, color: active.color, letterSpacing: 2, marginBottom: 16 }}>{active.stat.toUpperCase()}</div>
            <button className="btn-g" onClick={() => goAuth("signup", activeTab)} style={{ background: active.color, border: "none", color: "#000", borderRadius: 7, padding: "13px 26px", fontSize: 10, letterSpacing: 3, fontWeight: "bold", cursor: "pointer", fontFamily: "'Courier New',monospace", width: isMobile ? "100%" : "auto" }}>
              {active.cta.toUpperCase()} →
            </button>
          </div>
          <div style={{ background: "#0a1a0a", border: `1px solid ${active.color}22`, borderRadius: 12, overflow: "hidden" }}>
            {active.features.map((f, i) => (
              <div key={f} className="frow" style={{ display: "flex", alignItems: "center", gap: 14, padding: "15px 18px", borderBottom: i < active.features.length - 1 ? "1px solid #1a2e1a" : "none" }}>
                <div style={{ width: 20, height: 20, borderRadius: "50%", background: `${active.color}22`, border: `1px solid ${active.color}44`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: active.color }} />
                </div>
                <span style={{ fontSize: isMobile ? 12 : 13, color: "#e8f0e8", lineHeight: 1.5 }}>{f}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ padding: `${isMobile ? "60px" : "80px"} ${px}`, borderTop: "1px solid #1a2e1a", background: "#080d08" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32, flexWrap: "wrap", gap: 16 }}>
            <div>
              <div style={{ fontSize: 10, color: "#22c55e", letterSpacing: 5, marginBottom: 10 }}>LIVE DEAL FEED</div>
              <h2 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: "clamp(28px,4vw,40px)", fontWeight: 900, letterSpacing: -1, lineHeight: 1.1 }}>
                Off-market deals.
                <br />
                Updated daily.
              </h2>
            </div>
            <button className="btn-o" onClick={() => goAuth("signup", "dealmaker")} style={{ background: "transparent", border: "1px solid #1a2e1a", color: "#6b8f6b", borderRadius: 7, padding: "11px 20px", fontSize: 10, letterSpacing: 2, cursor: "pointer", fontFamily: "'Courier New',monospace", whiteSpace: "nowrap" }}>
              VIEW ALL DEALS →
            </button>
          </div>

          <div className="grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
            {deals.map((d) => (
              <div key={d.addr} className="dcard" style={{ background: "#0d1a0d", border: "1px solid #1a2e1a", borderRadius: 10, overflow: "hidden" }}>
                <div style={{ background: "#0a1408", padding: "14px 16px", borderBottom: "1px solid #1a2e1a" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <span style={{ fontSize: 8, color: d.badge, background: `${d.badge}22`, border: `1px solid ${d.badge}44`, borderRadius: 3, padding: "2px 7px", letterSpacing: 2 }}>{d.type.toUpperCase()}</span>
                    {d.days === 0
                      ? <span style={{ fontSize: 8, color: "#ef4444", letterSpacing: 1 }}>NEW</span>
                      : <span style={{ fontSize: 9, color: "#6b8f6b" }}>{d.days}d ago</span>}
                  </div>
                  <div style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: 15, fontWeight: 700, color: "#e8f0e8", marginBottom: 3, lineHeight: 1.2 }}>{d.addr}</div>
                  <div style={{ fontSize: 10, color: "#6b8f6b" }}>{d.city}</div>
                </div>
                <div style={{ padding: "14px 16px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7, marginBottom: 12 }}>
                    {[["ARV", d.arv, "#22c55e"], ["ASK", d.ask, "#e8f0e8"], ["RENO", d.reno, "#eab308"], ["ROI", d.roi, "#22c55e"]].map(([l, v, c]) => (
                      <div key={l} style={{ background: "#080d08", borderRadius: 5, padding: "7px 9px" }}>
                        <div style={{ fontSize: 7, color: "#6b8f6b", letterSpacing: 2, marginBottom: 2 }}>{l}</div>
                        <div style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: 14, color: c, fontWeight: 700 }}>{v}</div>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => goAuth("signup", "dealmaker")} style={{ width: "100%", background: "#22c55e", border: "none", color: "#000", borderRadius: 5, padding: "10px", fontSize: 9, letterSpacing: 2, fontWeight: "bold", cursor: "pointer", fontFamily: "'Courier New',monospace" }}>VIEW DEAL →</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ padding: `${isMobile ? "60px" : "100px"} ${px}`, maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ fontSize: 10, color: "#22c55e", letterSpacing: 5, marginBottom: 14 }}>HOW IT WORKS</div>
        <h2 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: "clamp(28px,4vw,48px)", fontWeight: 900, letterSpacing: -1, marginBottom: 56, lineHeight: 1.1 }}>
          A deal moves through
          <br />
          the whole network.
        </h2>
        <div className="steps" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 0, position: "relative" }}>
          <div className="step-line" style={{ position: "absolute", top: 28, left: "12.5%", right: "12.5%", height: 1, background: "linear-gradient(90deg,#22c55e44,#eab30844,#22c55e44,#3b82f644)", zIndex: 0 }} />
          {[
            { n: "01", role: "Wholesaler", color: "#22c55e", desc: "Finds an off-market deal and lists it on DealBank with the assignment fee." },
            { n: "02", role: "Flipper", color: "#eab308", desc: "Discovers the deal, analyzes it with AI, and closes the contract." },
            { n: "03", role: "Contractor", color: "#f97316", desc: "Gets hired directly through DealBank to rehab the property." },
            { n: "04", role: "Realtor", color: "#3b82f6", desc: "Gets matched when the flip is ready to sell. Closes it fast." },
          ].map((s) => (
            <div key={s.n} style={{ padding: isMobile ? "0" : "0 24px", position: "relative", zIndex: 1 }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: s.color, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18, flexShrink: 0 }}>
                <span style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: 18, fontWeight: 900, color: "#050a05" }}>{s.n}</span>
              </div>
              <div style={{ fontSize: 10, color: s.color, letterSpacing: 3, marginBottom: 8 }}>{s.role.toUpperCase()}</div>
              <p style={{ fontSize: 12, color: "#6b8f6b", lineHeight: 1.8, maxWidth: 220 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ padding: `${isMobile ? "60px" : "80px"} ${px}`, background: "#080d08", borderTop: "1px solid #1a2e1a" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <div style={{ fontSize: 10, color: "#22c55e", letterSpacing: 5, marginBottom: 14 }}>PRICING</div>
            <h2 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: "clamp(28px,5vw,48px)", fontWeight: 900, letterSpacing: -1, lineHeight: 1.1 }}>Simple. One price.</h2>
          </div>
          <div className="pricing-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
            {[
              { role: "Wholesaler", price: "Free to list", sub: "1.5% fee at close only", color: "#22c55e", note: "No upfront cost, ever", featured: false, tab: "wholesaler" },
              { role: "Flipper", price: "$149/mo", sub: "All tools included", color: "#eab308", note: "AI, dialer, CRM, contracts", featured: true, tab: "flipper" },
              { role: "Contractor", price: "$79/mo", sub: "Pro — verified + leads", color: "#f97316", note: "$39/mo basic available", featured: false, tab: "contractor" },
              { role: "Realtor", price: "Free", sub: "25% split at close", color: "#3b82f6", note: "Free forever, no monthly fee", featured: false, tab: "realtor" },
            ].map((p) => (
              <div key={p.role} style={{ background: p.featured ? "#0f2e0f" : "#0a1a0a", border: `1px solid ${p.featured ? `${p.color}66` : "#1a2e1a"}`, borderRadius: 12, padding: "24px 20px", position: "relative" }}>
                {p.featured && <div style={{ position: "absolute", top: -1, left: "50%", transform: "translateX(-50%)", background: "#22c55e", color: "#000", fontSize: 8, letterSpacing: 2, padding: "3px 10px", borderRadius: "0 0 6px 6px", fontWeight: "bold", fontFamily: "'Courier New',monospace", whiteSpace: "nowrap" }}>MOST POPULAR</div>}
                <div style={{ fontSize: 9, color: p.color, letterSpacing: 3, marginBottom: 10, marginTop: p.featured ? 8 : 0 }}>{p.role.toUpperCase()}</div>
                <div style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: isMobile ? 22 : 28, fontWeight: 900, color: "#e8f0e8", marginBottom: 6, lineHeight: 1 }}>{p.price}</div>
                <div style={{ fontSize: 10, color: "#6b8f6b", marginBottom: 8 }}>{p.sub}</div>
                <div style={{ fontSize: 9, color: p.color, opacity: 0.8, lineHeight: 1.5 }}>{p.note}</div>
                <button className={p.featured ? "btn-g" : "btn-o"} onClick={() => goAuth("signup", p.tab)} style={{ marginTop: 20, width: "100%", background: p.featured ? "#22c55e" : "transparent", border: `1px solid ${p.featured ? "transparent" : "#1a2e1a"}`, color: p.featured ? "#000" : "#6b8f6b", borderRadius: 6, padding: "11px", fontSize: 9, letterSpacing: 2, cursor: "pointer", fontFamily: "'Courier New',monospace", fontWeight: p.featured ? "bold" : "normal" }}>
                  GET STARTED →
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ padding: `${isMobile ? "80px" : "120px"} ${px}`, textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, #0f2e0f 0%, #050a05 70%)", pointerEvents: "none" }} />
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ fontSize: 10, color: "#22c55e", letterSpacing: 5, marginBottom: 18 }}>JOIN THE NETWORK</div>
          <h2 style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: "clamp(32px,6vw,72px)", fontWeight: 900, letterSpacing: -2, lineHeight: 1.05, marginBottom: 24 }}>
            Your next deal is
            <br />
            already on DealBank.
          </h2>
          <p style={{ fontSize: isMobile ? 13 : 14, color: "#6b8f6b", marginBottom: 36, lineHeight: 1.8 }}>14,200+ wholesalers, flippers, contractors, and realtors — and growing every day.</p>
          <button className="btn-g" onClick={() => goAuth("signup", activeTab)} style={{ background: "#22c55e", border: "none", color: "#000", borderRadius: 8, padding: `${isMobile ? "14px 24px" : "16px 40px"}`, fontSize: isMobile ? 11 : 12, letterSpacing: 3, fontWeight: "bold", cursor: "pointer", fontFamily: "'Courier New',monospace", width: isMobile ? "100%" : "auto", maxWidth: 400 }}>
            CREATE YOUR FREE ACCOUNT →
          </button>
          <div style={{ marginTop: 16, fontSize: 10, color: "#4a7a4a", letterSpacing: 2 }}>NO CREDIT CARD REQUIRED</div>
        </div>
      </section>

      <footer style={{ borderTop: "1px solid #1a2e1a", padding: `28px ${px}` }}>
        <div className="footer-inner" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ position: "relative", width: 22, height: 22 }}>
              <div style={{ position: "absolute", inset: 0, background: "#22c55e", borderRadius: 3, transform: "rotate(45deg) scale(0.68)" }} />
              <div style={{ position: "absolute", inset: 4, background: "#050a05", borderRadius: 2, transform: "rotate(45deg) scale(0.68)" }} />
              <div style={{ position: "absolute", inset: 7, background: "#22c55e", borderRadius: 1, transform: "rotate(45deg) scale(0.68)" }} />
            </div>
            <span style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: 14, fontWeight: 900 }}>Deal<span style={{ color: "#22c55e" }}>Bank</span></span>
            <span style={{ fontSize: 8, color: "#4a7a4a", letterSpacing: 3, marginLeft: 6 }}>THE DEAL NETWORK</span>
          </div>
          <div style={{ fontSize: 9, color: "#4a7a4a", letterSpacing: 2 }}>© 2026 DEALBANK · DEALBANK.IO</div>
          <div style={{ display: "flex", gap: 20, fontSize: 9, color: "#4a7a4a", letterSpacing: 2 }}>
            <button
              type="button"
              className="nlink"
              onClick={() => onOpenLegal?.("terms")}
              style={{ background: "transparent", border: "none", color: "inherit", letterSpacing: "inherit", fontFamily: "inherit", fontSize: "inherit", padding: 0, cursor: "pointer" }}
            >
              TERMS
            </button>
            <button
              type="button"
              className="nlink"
              onClick={() => onOpenLegal?.("privacy")}
              style={{ background: "transparent", border: "none", color: "inherit", letterSpacing: "inherit", fontFamily: "inherit", fontSize: "inherit", padding: 0, cursor: "pointer" }}
            >
              PRIVACY
            </button>
            <a
              className="nlink"
              href="mailto:support@dealbank.io"
              style={{ color: "inherit", textDecoration: "none" }}
            >
              CONTACT
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
