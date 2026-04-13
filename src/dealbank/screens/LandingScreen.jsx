export default function LandingScreen({
  G,
  card,
  btnG,
  btnO,
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  setAuthMode,
  setScreen,
  setUserType,
  setAuthForm,
}) {
  return (
    <div style={{ minHeight: "100vh", background: G.bg, color: G.text, fontFamily: G.mono }}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        .fu{animation:fadeUp .5s ease forwards}
        .ch{transition:all .18s}.ch:hover{transform:translateY(-2px);border-color:#22c55e88!important}
        .bh{transition:all .12s}.bh:hover{opacity:.82}
      `}</style>
      <nav style={{ padding: "14px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${G.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 26, height: 26, background: G.green, borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: "bold", color: "#000" }}>G</div>
          <span style={{ fontFamily: G.serif, fontSize: 18, fontWeight: "bold" }}>DealBank</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="bh" onClick={() => { setAuthMode("login"); setScreen("auth"); }} style={{ ...btnO, padding: "7px 14px", fontSize: 9 }}>
            Log In
          </button>
          <button className="bh" onClick={() => { setAuthMode("signup"); setScreen("auth"); }} style={{ ...btnG, padding: "7px 14px", fontSize: 9 }}>
            Get Started
          </button>
        </div>
      </nav>
      <div style={{ textAlign: "center", padding: "60px 24px 40px", maxWidth: 700, margin: "0 auto" }} className="fu">
        <div style={{ display: "inline-block", background: G.greenGlow, border: `1px solid ${G.green}44`, borderRadius: 20, padding: "3px 14px", fontSize: 8, color: G.green, letterSpacing: 3, marginBottom: 18 }}>
          THE REAL ESTATE FLIP ECOSYSTEM
        </div>
        <h1 style={{ fontFamily: G.serif, fontSize: 44, fontWeight: "bold", color: G.text, lineHeight: 1.15, margin: "0 0 14px" }}>
          From Deal to Close.
          <br />
          <span style={{ color: G.green }}>All in One Place.</span>
        </h1>
        <p style={{ fontSize: 12, color: G.muted, lineHeight: 1.8, marginBottom: 28, maxWidth: 500, margin: "0 auto 28px" }}>
          AI deal analysis. Contractor marketplace. Pipeline tracking. Realtor matching. State laws. Everything deal makers need.
        </p>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
          {[
            { label: "I'm a Deal Maker", sub: "Analyze deals & manage pipeline", type: "dealmaker", c: G.green },
            { label: "I'm a Contractor", sub: "Get jobs from local deal makers", type: "contractor", c: G.gold },
            { label: "I'm a Realtor", sub: "Get referrals from active deal makers", type: "realtor", c: G.blue },
          ].map(({ label, sub, type, c }) => (
            <div
              key={type}
              className="ch"
              onClick={() => {
                setUserType(type);
                setAuthMode("signup");
                setScreen("auth");
              }}
              style={{ ...card, cursor: "pointer", padding: "16px 20px", minWidth: 190, textAlign: "center" }}
            >
              <div style={{ fontFamily: G.serif, fontSize: 14, color: c, fontWeight: "bold", marginBottom: 3 }}>{label}</div>
              <div style={{ fontSize: 9, color: G.muted }}>{sub}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "10px 24px 50px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 28 }}>
          {[
            { icon: "🏠", t: "AI Deal Analyzer", d: "Address in -> ARV, comps, 60% offer price, reno estimate, full analysis out." },
            { icon: "📋", t: "Flip Pipeline", d: "Track every deal from Analyzing -> Closed. Realtor matching at listing stage." },
            { icon: "🔨", t: "Contractor Marketplace", d: "Find vetted local contractors. Request quotes. Build your trusted crew." },
            { icon: "⚖️", t: "State Laws & Docs", d: "Required disclosures, foreclosure laws, contractor licensing by state." },
            { icon: "📚", t: "Deal Maker Resources", d: "Top YouTube channels, podcasts, tools, and books curated for investors." },
            { icon: "💰", t: "Deal Marketplace", d: "Buy, sell, and wholesale deals with other investors on the platform." },
          ].map(({ icon, t, d }) => (
            <div key={t} className="ch" style={{ ...card }}>
              <div style={{ fontSize: 20, marginBottom: 8 }}>{icon}</div>
              <div style={{ fontFamily: G.serif, fontSize: 13, color: G.text, fontWeight: "bold", marginBottom: 5 }}>{t}</div>
              <div style={{ fontSize: 9, color: G.muted, lineHeight: 1.7 }}>{d}</div>
            </div>
          ))}
        </div>
        <div style={{ ...card, borderColor: G.border, padding: "20px", textAlign: "center" }}>
          <div style={{ fontSize: 9, color: G.muted, letterSpacing: 3, marginBottom: 4 }}>ADMIN ACCESS</div>
          <div style={{ fontFamily: G.serif, fontSize: 13, color: G.text, marginBottom: 2 }}>
            Email: <span style={{ color: G.green }}>{ADMIN_EMAIL}</span>
          </div>
          <div style={{ fontFamily: G.serif, fontSize: 13, color: G.text }}>
            Password: <span style={{ color: G.green }}>{ADMIN_PASSWORD}</span>
          </div>
          <button
            className="bh"
            onClick={() => {
              setAuthMode("login");
              setAuthForm((prev) => ({ ...prev, email: ADMIN_EMAIL, password: ADMIN_PASSWORD }));
              setScreen("auth");
            }}
            style={{ ...btnG, marginTop: 10, fontSize: 9, padding: "7px 16px" }}
          >
            Open Admin Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
