import { useState, useEffect, useMemo } from "react";

const INITIAL_MONTH_START_MS = Date.now();

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
  brandMid: "#c7e9d3",
  gold: "#ca8a04",
  red: "#dc2626",
  blue: "#2563eb",
  blueLight: "#dbeafe",
  shadow: "0 1px 2px rgba(0,0,0,0.03)",
  shadowHover: "0 4px 16px rgba(0,0,0,0.06)",
  shadowLg: "0 12px 40px rgba(0,0,0,0.10)",
};

// ═════════════════════════════════════════════════════════════════
// ROOT
// ═════════════════════════════════════════════════════════════════
export default function App() {
  const [screen,  setScreen]  = useState("landing");
  const [user,    setUser]    = useState({ name:"", email:"", phone:"", location:"Sacramento, CA", bio:"", verified:false, pro:false });
  const [role,    setRole]    = useState("dealmaker");
  const [credits, setCredits] = useState({ free:25, paid:0, monthStart: INITIAL_MONTH_START_MS });
  const [alerts,  setAlerts]  = useState([
    { criteria:"Sacramento · ROI > 25%", active:true }
  ]);
  const [marketDeals, setMarketDeals] = useState([
    { id:"m1", addr:"789 Oak Grove Blvd",  city:"Sacramento, CA", arv:"$420K", ask:"$228K", roi:"31%", type:"Wholesale",  hot:true,  beds:3, baths:2, score:91, seller:"T. Williams", verified:true },
    { id:"m2", addr:"3421 Poplar Ave",     city:"Sacramento, CA", arv:"$385K", ask:"$195K", roi:"28%", type:"Wholesale",  hot:false, beds:3, baths:2, score:84, seller:"M. Davis",    verified:true },
    { id:"m3", addr:"1842 Maple St",        city:"Sacramento, CA", arv:"$385K", ask:"$210K", roi:"29%", type:"Fix & Flip", hot:false, beds:3, baths:2, score:88, seller:"J. Chen",     verified:false },
    { id:"m4", addr:"1145 Desert Rose Ln", city:"Fresno, CA",     arv:"$275K", ask:"$138K", roi:"21%", type:"Wholesale",  hot:false, beds:4, baths:2, score:72, seller:"A. Rivera",   verified:false },
  ]);

  function handleAuth(userData, userRole) {
    setUser(u => ({ ...u, ...userData }));
    setRole(userRole);
    setScreen("app");
  }

  if (screen === "app") {
    return <AppView user={user} setUser={setUser} role={role} credits={credits} setCredits={setCredits} alerts={alerts} setAlerts={setAlerts} marketDeals={marketDeals} setMarketDeals={setMarketDeals} onSignOut={()=>setScreen("landing")}/>;
  }
  return <Landing onAuth={handleAuth}/>;
}

// ═════════════════════════════════════════════════════════════════
// GLOBAL STYLES
// ═════════════════════════════════════════════════════════════════
function GlobalStyles() {
  return (
    <style>{`
      *{box-sizing:border-box;margin:0;padding:0;}
      html{scroll-behavior:smooth;}
      body{letter-spacing:-0.01em;}
      button{font-family:inherit;letter-spacing:inherit;}
      input,textarea{font-family:inherit;}
      ::-webkit-scrollbar{width:8px;height:8px;}
      ::-webkit-scrollbar-thumb{background:#c9d0c9;border-radius:4px;}
      @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
      @keyframes fadeIn{from{opacity:0}to{opacity:1}}
      @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
      @keyframes ticker{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
      @keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
      .fu1{animation:fadeUp .45s .04s ease both}
      .fu2{animation:fadeUp .45s .12s ease both}
      .fu3{animation:fadeUp .45s .20s ease both}
      .btn-primary:hover{background:#0a6833!important;}
      .btn-ghost:hover{background:#f6f8f6!important;}
      .card-hover{transition:all .18s;}
      .card-hover:hover{box-shadow:0 4px 16px rgba(0,0,0,0.06);transform:translateY(-2px);}
      .input-focus:focus{border-color:#0c7a3d!important;background:#ffffff!important;}
      .tab-btn{transition:all .12s;}
      @media (max-width:767px){
        .nav-menu{display:none!important;}
        .hamburger{display:flex!important;}
        .hero-grid{grid-template-columns:1fr!important;gap:32px!important;}
        .roles-grid{grid-template-columns:1fr!important;}
        .section-pad{padding:48px 20px!important;}
        .hero-pad{padding:88px 20px 40px!important;}
        h1{font-size:38px!important;}
        h2{font-size:26px!important;}
      }
    `}</style>
  );
}

// ═════════════════════════════════════════════════════════════════
// DEAL SCORE BADGE
// ═════════════════════════════════════════════════════════════════
function DealScoreBadge({ score, size = "md" }) {
  const color = score >= 85 ? T.brand : score >= 70 ? T.gold : T.textMuted;
  const bg    = score >= 85 ? T.brandLight : score >= 70 ? "#fef6e0" : T.surface;
  const label = score >= 85 ? "Excellent" : score >= 70 ? "Good" : "OK";
  const sizes = { sm: { font:10, pad:"3px 8px" }, md: { font:11, pad:"4px 10px" } };
  const s = sizes[size] || sizes.md;
  return (
    <div style={{ display:"inline-flex", alignItems:"center", gap:5, background:bg, border:`1px solid ${color}44`, borderRadius:100, padding:s.pad, color:color, fontWeight:700, fontSize:s.font, letterSpacing:"0.01em", whiteSpace:"nowrap" }}>
      <span>●</span>
      <span style={{ fontWeight:800 }}>{score}</span>
      <span style={{ opacity:0.9 }}>{label}</span>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════
// VERIFIED BADGE
// ═════════════════════════════════════════════════════════════════
function VerifiedBadge({ size = 11 }) {
  return (
    <span title="Verified Pro" style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", width:size+4, height:size+4, borderRadius:"50%", background:T.blue, color:"#fff", fontSize:Math.round(size*0.7), fontWeight:800, lineHeight:1, flexShrink:0 }}>✓</span>
  );
}

// ═════════════════════════════════════════════════════════════════
// LANDING
// ═════════════════════════════════════════════════════════════════
function Landing({ onAuth }) {
  const [scrolled,    setScrolled]    = useState(false);
  const [menuOpen,    setMenuOpen]    = useState(false);
  const [modal,       setModal]       = useState(null);
  const [modalRole,   setModalRole]   = useState("dealmaker");
  const [authMode,    setAuthMode]    = useState("signup");
  const [formData,    setFormData]    = useState({ name:"", email:"", password:"" });
  const [formError,   setFormError]   = useState("");
  const [submitting,  setSubmitting]  = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  function openModal(mode, role) {
    setAuthMode(mode || "signup");
    if (role) setModalRole(role);
    setFormData({ name:"", email:"", password:"" });
    setFormError("");
    setModal("auth");
    setMenuOpen(false);
  }
  function submit() {
    if (authMode === "signup") {
      if (!formData.name.trim())  { setFormError("Enter your name"); return; }
      if (!formData.email.trim()) { setFormError("Enter your email"); return; }
      if (!formData.password.trim()) { setFormError("Create a password"); return; }
    } else {
      if (!formData.email.trim()) { setFormError("Enter your email"); return; }
      if (!formData.password.trim()) { setFormError("Enter your password"); return; }
    }
    setSubmitting(true);
    setTimeout(()=>{
      setSubmitting(false);
      setModal(null);
      onAuth({ name: formData.name || "Daniel Parks", email: formData.email }, modalRole);
    }, 700);
  }

  const personas = {
    dealmaker:  { label:"Deal Maker", desc:"Source, analyze, flip, or wholesale." },
    contractor: { label:"Contractor", desc:"Get job leads from real flippers." },
    realtor:    { label:"Realtor",    desc:"Get listing referrals from flippers." },
  };

  return (
    <div style={{ fontFamily:T.font, background:T.bg, color:T.text, minHeight:"100vh", WebkitFontSmoothing:"antialiased" }}>
      <GlobalStyles/>

      <nav style={{
        position:"fixed", top:0, left:0, right:0, zIndex:100,
        background: scrolled ? "rgba(255,255,255,0.88)" : T.bg,
        backdropFilter: scrolled ? "saturate(180%) blur(18px)" : "none",
        WebkitBackdropFilter: scrolled ? "saturate(180%) blur(18px)" : "none",
        borderBottom: `1px solid ${scrolled ? T.border : "transparent"}`,
        transition:"all .2s", padding:"0 24px", height:60,
        display:"flex", alignItems:"center", justifyContent:"space-between"
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ width:32, height:32, borderRadius:9, background:T.brand, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:17 }}>D</div>
          <span style={{ fontSize:20, fontWeight:700, letterSpacing:"-0.02em" }}>DealBank</span>
        </div>
        <div className="nav-menu" style={{ display:"flex", gap:28, fontSize:14, fontWeight:500, color:T.textSecondary }}>
          <span style={{ cursor:"pointer" }}>How it works</span>
          <span style={{ cursor:"pointer" }}>Pricing</span>
        </div>
        <div className="nav-menu" style={{ display:"flex", gap:8 }}>
          <button onClick={()=>openModal("signin")} className="btn-ghost" style={{ background:"transparent", border:"none", color:T.text, padding:"8px 14px", borderRadius:8, fontSize:14, fontWeight:600, cursor:"pointer" }}>Log in</button>
          <button onClick={()=>openModal("signup")} className="btn-primary" style={{ background:T.brand, border:"none", color:"#fff", padding:"8px 18px", borderRadius:8, fontSize:14, fontWeight:600, cursor:"pointer" }}>Sign up free</button>
        </div>
        <button className="hamburger" onClick={()=>setMenuOpen(!menuOpen)} style={{ display:"none", flexDirection:"column", gap:5, background:"transparent", border:"none", padding:8, cursor:"pointer" }}>
          <span style={{ width:22, height:2, background:T.text, borderRadius:2, transition:"all .2s", transform:menuOpen?"rotate(45deg) translate(5px,5px)":"none" }}/>
          <span style={{ width:22, height:2, background:T.text, borderRadius:2, transition:"all .2s", opacity:menuOpen?0:1 }}/>
          <span style={{ width:22, height:2, background:T.text, borderRadius:2, transition:"all .2s", transform:menuOpen?"rotate(-45deg) translate(5px,-5px)":"none" }}/>
        </button>
      </nav>

      {menuOpen && (
        <div style={{ position:"fixed", top:60, left:0, right:0, zIndex:90, background:T.bg, borderBottom:`1px solid ${T.border}`, padding:"16px 20px", animation:"fadeIn .15s ease" }}>
          <div onClick={()=>setMenuOpen(false)} style={{ padding:"13px 0", fontSize:15, fontWeight:500, borderBottom:`1px solid ${T.borderLight}`, cursor:"pointer" }}>How it works</div>
          <div onClick={()=>setMenuOpen(false)} style={{ padding:"13px 0", fontSize:15, fontWeight:500, borderBottom:`1px solid ${T.borderLight}`, cursor:"pointer" }}>Pricing</div>
          <div style={{ display:"flex", gap:10, marginTop:16 }}>
            <button onClick={()=>openModal("signin")} style={{ flex:1, background:T.surface, border:`1px solid ${T.border}`, color:T.text, padding:"11px", borderRadius:8, fontSize:15, fontWeight:600, cursor:"pointer" }}>Log in</button>
            <button onClick={()=>openModal("signup")} style={{ flex:2, background:T.brand, border:"none", color:"#fff", padding:"11px", borderRadius:8, fontSize:15, fontWeight:600, cursor:"pointer" }}>Sign up free</button>
          </div>
        </div>
      )}

      <section className="hero-pad" style={{ padding:"120px 24px 64px", maxWidth:1100, margin:"0 auto" }}>
        <div className="hero-grid" style={{ display:"grid", gridTemplateColumns:"1.1fr 1fr", gap:60, alignItems:"center" }}>
          <div>
            <div className="fu1" style={{ display:"inline-flex", alignItems:"center", gap:8, background:T.brandLight, borderRadius:100, padding:"6px 14px", marginBottom:22 }}>
              <div style={{ width:6, height:6, borderRadius:"50%", background:T.brand, animation:"pulse 2s infinite" }}/>
              <span style={{ fontSize:13, color:T.brand, fontWeight:600 }}>14,284 members · 3 closed today</span>
            </div>
            <h1 className="fu2" style={{ fontSize:52, fontWeight:800, letterSpacing:"-0.03em", lineHeight:1.05, marginBottom:16 }}>
              Your next deal<br/>is on DealBank.
            </h1>
            <p className="fu3" style={{ fontSize:17, color:T.textSecondary, lineHeight:1.5, marginBottom:28, maxWidth:440 }}>
              The network where wholesalers, flippers, contractors, and realtors meet around one deal. <strong style={{ color:T.text }}>Free to join · $125/mo unlocks the Dialer.</strong>
            </p>
            <div className="fu3" style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
              <button onClick={()=>openModal("signup")} className="btn-primary" style={{ background:T.brand, border:"none", color:"#fff", padding:"14px 24px", borderRadius:10, fontSize:15, fontWeight:600, cursor:"pointer" }}>
                Get started free →
              </button>
              <button onClick={()=>openModal("signin")} className="btn-ghost" style={{ background:T.surface, border:`1px solid ${T.border}`, color:T.text, padding:"14px 24px", borderRadius:10, fontSize:15, fontWeight:600, cursor:"pointer" }}>
                Log in
              </button>
            </div>
            <div style={{ marginTop:14, fontSize:13, color:T.textMuted }}>No credit card · Free to browse · Pro = $125/mo</div>
          </div>

          <div className="fu2" style={{ position:"relative" }}>
            <div style={{ background:T.bg, border:`1px solid ${T.border}`, borderRadius:16, padding:20, boxShadow:T.shadowLg }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{ width:36, height:36, borderRadius:"50%", background:T.brand, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:14 }}>TW</div>
                  <div>
                    <div style={{ fontSize:14, fontWeight:600, display:"flex", alignItems:"center", gap:4 }}>
                      T. Williams <VerifiedBadge size={10}/>
                    </div>
                    <div style={{ fontSize:12, color:T.textMuted }}>Just posted · Wholesale</div>
                  </div>
                </div>
                <DealScoreBadge score={91} size="sm"/>
              </div>
              <div style={{ fontSize:20, fontWeight:700, letterSpacing:"-0.02em", marginBottom:3 }}>789 Oak Grove Blvd</div>
              <div style={{ fontSize:13, color:T.textSecondary, marginBottom:14 }}>Sacramento, CA · 3bd/2ba</div>
              <div style={{ background:T.surface, borderRadius:12, padding:14, marginBottom:14 }}>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14 }}>
                  {[["ARV","$420K"],["Asking","$228K"],["ROI","31%"]].map(([k,v])=>(
                    <div key={k}>
                      <div style={{ fontSize:11, color:T.textMuted, marginBottom:3, fontWeight:500 }}>{k}</div>
                      <div style={{ fontSize:17, fontWeight:800, color:T.brand, letterSpacing:"-0.02em" }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>
              <button onClick={()=>openModal("signup","dealmaker")} className="btn-primary" style={{ width:"100%", background:T.brand, border:"none", color:"#fff", padding:"12px", borderRadius:10, fontSize:14, fontWeight:600, cursor:"pointer" }}>View deal</button>
            </div>
          </div>
        </div>
      </section>

      <section className="section-pad" style={{ padding:"72px 24px", background:T.surface, borderTop:`1px solid ${T.border}` }}>
        <div style={{ maxWidth:1000, margin:"0 auto", textAlign:"center" }}>
          <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:T.brandLight, borderRadius:100, padding:"6px 14px", marginBottom:18 }}>
            <span style={{ fontSize:13, color:T.brand, fontWeight:700 }}>💰 ONE CLOSED DEAL PAYS FOR 10 YEARS</span>
          </div>
          <h2 style={{ fontSize:36, fontWeight:800, letterSpacing:"-0.03em", marginBottom:12 }}>Start free. Go Pro when ready.</h2>
          <p style={{ fontSize:16, color:T.textSecondary, marginBottom:36, maxWidth:560, margin:"0 auto 36px" }}>
            Browse the marketplace and analyze up to 25 deals per month for free. Pro unlocks the Dialer + unlimited analyses.
          </p>

          <div className="roles-grid" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, maxWidth:820, margin:"0 auto" }}>
            {/* FREE */}
            <div style={{ background:T.bg, border:`1px solid ${T.border}`, borderRadius:16, padding:24, textAlign:"left", position:"relative" }}>
              <div style={{ fontSize:13, fontWeight:700, color:T.textSecondary, marginBottom:4, textTransform:"uppercase", letterSpacing:"0.05em" }}>Free</div>
              <div style={{ display:"flex", alignItems:"baseline", gap:6, marginBottom:14 }}>
                <span style={{ fontSize:36, fontWeight:800, letterSpacing:"-0.03em" }}>$0</span>
                <span style={{ fontSize:14, color:T.textSecondary }}>/month</span>
              </div>
              {[
                "Browse marketplace",
                "Post deals to wholesale",
                "25 free Analyzer runs/mo",
                "CRM + Pipeline",
                "Deal alerts (first-to-claim)",
              ].map((b,i)=>(
                <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"6px 0" }}>
                  <div style={{ width:16, height:16, borderRadius:"50%", background:T.surface, color:T.textSecondary, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:800 }}>✓</div>
                  <span style={{ fontSize:14 }}>{b}</span>
                </div>
              ))}
            </div>

            {/* PRO */}
            <div style={{ background:`linear-gradient(135deg, ${T.brandLight} 0%, ${T.bg} 100%)`, border:`2px solid ${T.brand}`, borderRadius:16, padding:24, textAlign:"left", position:"relative", boxShadow:T.shadowHover }}>
              <div style={{ position:"absolute", top:-11, left:"50%", transform:"translateX(-50%)", background:T.brand, color:"#fff", fontSize:11, fontWeight:700, padding:"4px 12px", borderRadius:100, letterSpacing:"0.05em" }}>FOR CLOSERS</div>
              <div style={{ fontSize:13, fontWeight:700, color:T.brand, marginBottom:4, textTransform:"uppercase", letterSpacing:"0.05em" }}>Pro ⭐</div>
              <div style={{ display:"flex", alignItems:"baseline", gap:6, marginBottom:14 }}>
                <span style={{ fontSize:36, fontWeight:800, letterSpacing:"-0.03em" }}>$125</span>
                <span style={{ fontSize:14, color:T.textSecondary }}>/month</span>
              </div>
              {[
                "Everything in Free",
                "📞 Unlimited Power Dialer",
                "⚡ Unlimited Analyzer",
                "🎯 Targeted list builder",
                "✍️ Full deal flow + eSign",
                "⭐ Priority marketplace placement",
              ].map((b,i)=>(
                <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"6px 0" }}>
                  <div style={{ width:16, height:16, borderRadius:"50%", background:T.brand, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:800 }}>✓</div>
                  <span style={{ fontSize:14 }}>{b}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section-pad" style={{ padding:"72px 24px", maxWidth:1000, margin:"0 auto" }}>
        <div style={{ textAlign:"center", marginBottom:36 }}>
          <h2 style={{ fontSize:36, fontWeight:800, letterSpacing:"-0.03em", marginBottom:10 }}>Which one are you?</h2>
        </div>
        <div className="roles-grid" style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14 }}>
          {Object.entries(personas).map(([key,p])=>(
            <div key={key} onClick={()=>openModal("signup",key)} className="card-hover" style={{ background:T.bg, border:`1px solid ${T.border}`, borderRadius:16, padding:24, cursor:"pointer" }}>
              <div style={{ fontSize:17, fontWeight:800, letterSpacing:"-0.01em", marginBottom:6 }}>{p.label}</div>
              <div style={{ fontSize:14, color:T.textSecondary, marginBottom:18 }}>{p.desc}</div>
              <div style={{ fontSize:13, fontWeight:700, color:T.brand }}>Join as {p.label} →</div>
            </div>
          ))}
        </div>
      </section>

      <section className="section-pad" style={{ padding:"80px 24px", textAlign:"center", background:`linear-gradient(135deg, ${T.brandLight}, ${T.bg})` }}>
        <h2 style={{ fontSize:40, fontWeight:800, letterSpacing:"-0.03em", lineHeight:1.1, marginBottom:14 }}>
          Ready to close more deals?
        </h2>
        <p style={{ fontSize:16, color:T.textSecondary, marginBottom:28 }}>25 free credits every month. No card required.</p>
        <button onClick={()=>openModal("signup")} className="btn-primary" style={{ background:T.brand, border:"none", color:"#fff", padding:"15px 30px", borderRadius:12, fontSize:15, fontWeight:600, cursor:"pointer" }}>
          Create your free account
        </button>
      </section>

      <footer style={{ padding:"28px 24px", borderTop:`1px solid ${T.border}`, background:T.bg }}>
        <div style={{ maxWidth:1100, margin:"0 auto", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:14 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ width:24, height:24, borderRadius:7, background:T.brand, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:13 }}>D</div>
            <span style={{ fontSize:15, fontWeight:700 }}>DealBank</span>
            <span style={{ fontSize:13, color:T.textMuted, marginLeft:6 }}>© 2026</span>
          </div>
          <div style={{ display:"flex", gap:22, fontSize:13, color:T.textSecondary, fontWeight:500 }}>
            <span style={{ cursor:"pointer" }}>Terms</span>
            <span style={{ cursor:"pointer" }}>Privacy</span>
            <span style={{ cursor:"pointer" }}>Help</span>
          </div>
        </div>
      </footer>

      {modal && (
        <div onClick={()=>setModal(null)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:500, display:"flex", alignItems:"center", justifyContent:"center", padding:20, animation:"fadeIn .2s ease" }}>
          <div onClick={e=>e.stopPropagation()} style={{ background:T.bg, borderRadius:16, width:"100%", maxWidth:420, overflow:"hidden", boxShadow:T.shadowLg }}>
            <div style={{ padding:"26px 26px 0", display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
              <div>
                <div style={{ fontSize:22, fontWeight:800, letterSpacing:"-0.02em", marginBottom:4 }}>
                  {authMode==="signup" ? "Create your account" : "Welcome back"}
                </div>
                <div style={{ fontSize:14, color:T.textSecondary }}>
                  {authMode==="signup" ? "Free. Resets monthly." : "Log in to DealBank"}
                </div>
              </div>
              <button onClick={()=>setModal(null)} style={{ background:T.surface, border:"none", width:30, height:30, borderRadius:"50%", cursor:"pointer", color:T.textSecondary, fontSize:17 }}>✕</button>
            </div>
            <div style={{ padding:"18px 26px 26px" }}>
              {authMode==="signup" && (
                <>
                  <div style={{ marginBottom:14 }}>
                    <div style={{ fontSize:13, fontWeight:600, marginBottom:8 }}>I am a</div>
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:6 }}>
                      {Object.entries(personas).map(([key,p])=>(
                        <button key={key} onClick={()=>setModalRole(key)} style={{
                          padding:"10px 6px", borderRadius:8, cursor:"pointer", fontSize:13, fontWeight:600,
                          border: modalRole===key ? `2px solid ${T.brand}` : `1px solid ${T.border}`,
                          background: modalRole===key ? T.brandLight : T.bg,
                          color: modalRole===key ? T.brand : T.text, fontFamily:T.font
                        }}>{p.label}</button>
                      ))}
                    </div>
                  </div>
                  <input value={formData.name} onChange={e=>setFormData(p=>({...p,name:e.target.value}))} placeholder="Full name"
                    className="input-focus"
                    style={{ width:"100%", background:T.surface, border:`1px solid ${T.border}`, borderRadius:10, padding:"12px 14px", fontSize:15, outline:"none", marginBottom:10, boxSizing:"border-box", fontFamily:T.font }}/>
                </>
              )}
              <input value={formData.email} onChange={e=>setFormData(p=>({...p,email:e.target.value}))} placeholder="Email" type="email"
                className="input-focus"
                style={{ width:"100%", background:T.surface, border:`1px solid ${T.border}`, borderRadius:10, padding:"12px 14px", fontSize:15, outline:"none", marginBottom:10, boxSizing:"border-box", fontFamily:T.font }}/>
              <input value={formData.password} onChange={e=>setFormData(p=>({...p,password:e.target.value}))} placeholder="Password" type="password"
                onKeyDown={e=>e.key==="Enter"&&submit()}
                className="input-focus"
                style={{ width:"100%", background:T.surface, border:`1px solid ${T.border}`, borderRadius:10, padding:"12px 14px", fontSize:15, outline:"none", marginBottom:formError?12:16, boxSizing:"border-box", fontFamily:T.font }}/>
              {formError && <div style={{ background:"#ffebee", border:"1px solid #ffcdd2", borderRadius:8, padding:"9px 12px", marginBottom:12, fontSize:13, color:T.red }}>{formError}</div>}
              <button onClick={submit} disabled={submitting} className="btn-primary" style={{ width:"100%", background: submitting?T.brandHover:T.brand, border:"none", color:"#fff", padding:"13px", borderRadius:10, fontSize:15, fontWeight:600, cursor: submitting?"default":"pointer", marginBottom:14 }}>
                {submitting ? "Just a moment…" : authMode==="signup" ? "Create account" : "Log in"}
              </button>
              <div style={{ textAlign:"center", fontSize:13, color:T.textSecondary }}>
                {authMode==="signup"
                  ? <>Already have an account? <span onClick={()=>{setAuthMode("signin");setFormError("");}} style={{ color:T.brand, fontWeight:600, cursor:"pointer" }}>Log in</span></>
                  : <>Don&apos;t have an account? <span onClick={()=>{setAuthMode("signup");setFormError("");}} style={{ color:T.brand, fontWeight:600, cursor:"pointer" }}>Sign up</span></>
                }
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════
// APP SHELL
// ═════════════════════════════════════════════════════════════════
function AppView({ user, setUser, role, credits, setCredits, alerts, setAlerts, marketDeals, setMarketDeals, onSignOut }) {
  const [buyModal,     setBuyModal]     = useState(false);
  const [lowCreds,     setLowCreds]     = useState(false);
  const [verifyModal,  setVerifyModal]  = useState(false);
  const [referralOpen, setReferralOpen] = useState(false);
  const [alertsOpen,   setAlertsOpen]   = useState(false);
  const [upgradeOpen,  setUpgradeOpen]  = useState(false);
  const [nowMs,        setNowMs]        = useState(INITIAL_MONTH_START_MS);

  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 60_000);
    return () => clearInterval(timer);
  }, []);

  const totalCredits = credits.free + credits.paid;
  const daysUntilReset = Math.max(1, 28 - Math.floor((nowMs - credits.monthStart) / 86400000));

  const roleLabel = role === "contractor" ? "Contractor" : role === "realtor" ? "Realtor" : "Deal Maker";
  const initials = (user?.name || "You").split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase() || "Y";

  function spend(amount) {
    if (user.pro) return true; // Pro = unlimited
    if (totalCredits < amount) { setLowCreds(true); return false; }
    if (credits.free >= amount) {
      setCredits(c => ({ ...c, free: c.free - amount }));
    } else {
      const fromFree = credits.free;
      const fromPaid = amount - fromFree;
      setCredits(c => ({ ...c, free: 0, paid: c.paid - fromPaid }));
    }
    return true;
  }

  function verifyPro() {
    setUser(u => ({ ...u, verified:true }));
    setVerifyModal(false);
  }

  function upgrade() {
    setUser(u => ({ ...u, pro:true }));
    setUpgradeOpen(false);
  }

  return (
    <div style={{ fontFamily:T.font, background:T.surface, color:T.text, minHeight:"100vh", WebkitFontSmoothing:"antialiased" }}>
      <GlobalStyles/>

      <nav style={{
        position:"sticky", top:0, zIndex:50,
        background:"rgba(255,255,255,0.92)",
        backdropFilter:"saturate(180%) blur(18px)",
        WebkitBackdropFilter:"saturate(180%) blur(18px)",
        borderBottom:`1px solid ${T.border}`,
        padding:"0 14px", height:60,
        display:"flex", alignItems:"center", justifyContent:"space-between"
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, minWidth:0 }}>
          <div style={{ width:32, height:32, borderRadius:9, background:T.brand, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:17, flexShrink:0 }}>D</div>
          <span style={{ fontSize:19, fontWeight:700, letterSpacing:"-0.02em" }}>DealBank</span>
          <span style={{ fontSize:10, fontWeight:700, color:T.brand, background:T.brandLight, padding:"3px 7px", borderRadius:6, marginLeft:2, letterSpacing:"0.03em", whiteSpace:"nowrap" }}>{roleLabel.toUpperCase()}</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <button onClick={()=>setBuyModal(true)} style={{ background:T.brandLight, border:"none", color:T.brand, padding:"6px 10px", borderRadius:100, fontSize:13, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:5 }}>
            <span>⚡</span>
            <span>{totalCredits}</span>
          </button>
          <button onClick={()=>setAlertsOpen(true)} style={{ background:"transparent", border:"none", fontSize:16, cursor:"pointer", padding:"6px 8px", position:"relative" }}>
            🔔
            <span style={{ position:"absolute", top:3, right:3, width:7, height:7, borderRadius:"50%", background:T.red }}/>
          </button>
          <div style={{ width:32, height:32, borderRadius:"50%", background:T.brand, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:13 }}>{initials}</div>
          <button onClick={onSignOut} className="btn-ghost" style={{ background:"transparent", border:`1px solid ${T.border}`, color:T.text, padding:"6px 10px", borderRadius:8, fontSize:12, fontWeight:600, cursor:"pointer" }}>Log out</button>
        </div>
      </nav>

      <NetworkPulse/>
      <CreditsBanner credits={credits} daysUntilReset={daysUntilReset} onBuy={()=>setBuyModal(true)} onRefer={()=>setReferralOpen(true)}/>

      {role === "contractor" && <ContractorDash user={user} setUser={setUser} onVerify={()=>setVerifyModal(true)} marketDeals={marketDeals}/>}
      {role === "realtor"    && <RealtorDash    user={user} setUser={setUser} onVerify={()=>setVerifyModal(true)}/>}
      {role === "dealmaker"  && <DealMakerDash  user={user} setUser={setUser} spend={spend} alerts={alerts} setAlerts={setAlerts} onUpgrade={()=>setUpgradeOpen(true)} marketDeals={marketDeals} setMarketDeals={setMarketDeals}/>}

      {buyModal     && <CreditsModal  onClose={()=>setBuyModal(false)}     onBuy={(n)=>{setCredits(c=>({...c,paid:c.paid+n}));setBuyModal(false);setLowCreds(false);}}/>}
      {verifyModal  && <VerifyModal   onClose={()=>setVerifyModal(false)}  onVerify={verifyPro} role={role}/>}
      {referralOpen && <ReferralModal onClose={()=>setReferralOpen(false)}/>}
      {alertsOpen   && <AlertsModal   onClose={()=>setAlertsOpen(false)}/>}
      {upgradeOpen  && <UpgradeModal  onClose={()=>setUpgradeOpen(false)}  onUpgrade={upgrade}/>}

      {lowCreds && (
        <div onClick={()=>setLowCreds(false)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:700, display:"flex", alignItems:"center", justifyContent:"center", padding:20, animation:"fadeIn .2s ease" }}>
          <div onClick={e=>e.stopPropagation()} style={{ background:T.bg, borderRadius:16, width:"100%", maxWidth:380, padding:28, textAlign:"center", boxShadow:T.shadowLg }}>
            <div style={{ fontSize:38, marginBottom:10 }}>⚡</div>
            <div style={{ fontSize:20, fontWeight:800, letterSpacing:"-0.02em", marginBottom:6 }}>Not enough credits</div>
            <div style={{ fontSize:14, color:T.textSecondary, marginBottom:20 }}>Top up to keep analyzing and calling.</div>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={()=>setLowCreds(false)} style={{ flex:1, background:T.surface, border:`1px solid ${T.border}`, color:T.text, padding:"11px", borderRadius:10, fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:T.font }}>Cancel</button>
              <button onClick={()=>{setLowCreds(false);setBuyModal(true);}} className="btn-primary" style={{ flex:2, background:T.brand, border:"none", color:"#fff", padding:"11px", borderRadius:10, fontSize:14, fontWeight:600, cursor:"pointer" }}>Buy credits</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════
// NETWORK PULSE
// ═════════════════════════════════════════════════════════════════
function NetworkPulse() {
  const events = [
    "🔥 3 new deals in Sacramento today",
    "💰 Mike R. just closed a $42K assignment",
    "📈 Average ROI up 4% this week",
    "⚡ 284 deals analyzed today",
    "🏆 Top deal of the day: 96/100 in Modesto",
    "🤝 Sarah K. got matched with a flipper",
  ];
  return (
    <div style={{ background:T.text, color:"#fff", overflow:"hidden", padding:"7px 0", position:"sticky", top:60, zIndex:40 }}>
      <div style={{ display:"flex", animation:"ticker 32s linear infinite", whiteSpace:"nowrap" }}>
        {[...events, ...events].map((e,i)=>(
          <span key={i} style={{ padding:"0 24px", fontSize:12, fontWeight:500, opacity:0.9 }}>{e}</span>
        ))}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════
// CREDITS BANNER
// ═════════════════════════════════════════════════════════════════
function CreditsBanner({ credits, daysUntilReset, onBuy, onRefer }) {
  const freeUsed = 25 - credits.free;
  const pct = (freeUsed / 25) * 100;
  return (
    <div style={{ background:T.bg, borderBottom:`1px solid ${T.border}`, padding:"10px 20px" }}>
      <div style={{ maxWidth:1000, margin:"0 auto", display:"flex", alignItems:"center", gap:14, flexWrap:"wrap" }}>
        <div style={{ flex:"1 1 280px", minWidth:220 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
            <div style={{ fontSize:12, fontWeight:600, color:T.textSecondary }}>
              Free credits: <strong style={{ color:T.brand, fontSize:13 }}>{credits.free} / 25</strong> this month
              {credits.paid > 0 && <span style={{ color:T.textMuted, marginLeft:6 }}>+ {credits.paid} paid</span>}
            </div>
            <div style={{ fontSize:11, color:T.textMuted }}>Resets in {daysUntilReset}d</div>
          </div>
          <div style={{ height:5, background:T.surface, borderRadius:3, overflow:"hidden" }}>
            <div style={{ width:`${pct}%`, height:"100%", background:T.brand, borderRadius:3, transition:"width .4s" }}/>
          </div>
        </div>
        <div style={{ display:"flex", gap:6 }}>
          <button onClick={onRefer} style={{ background:T.surface, border:`1px solid ${T.border}`, color:T.text, padding:"7px 12px", borderRadius:8, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:T.font, display:"flex", alignItems:"center", gap:4 }}>
            <span>🎁</span> <span>Invite → +100</span>
          </button>
          <button onClick={onBuy} className="btn-primary" style={{ background:T.brand, border:"none", color:"#fff", padding:"7px 12px", borderRadius:8, fontSize:12, fontWeight:700, cursor:"pointer" }}>
            Buy credits
          </button>
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════
// SHARED SHELLS
// ═════════════════════════════════════════════════════════════════
function DashHeader({ title, subtitle, stats }) {
  return (
    <div style={{ background:`linear-gradient(135deg, ${T.brandLight} 0%, ${T.surface} 100%)`, borderBottom:`1px solid ${T.border}` }}>
      <div style={{ maxWidth:1000, margin:"0 auto", padding:"20px 20px" }}>
        <div style={{ fontSize:20, fontWeight:800, letterSpacing:"-0.02em", marginBottom:4 }}>{title}</div>
        <div style={{ fontSize:13, color:T.textSecondary, marginBottom:14 }}>{subtitle}</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
          {stats.map(([k,v,c],i)=>(
            <div key={i} style={{ background:T.bg, border:`1px solid ${T.border}`, borderRadius:10, padding:"10px 12px" }}>
              <div style={{ fontSize:11, color:T.textMuted, fontWeight:500, marginBottom:2 }}>{k}</div>
              <div style={{ fontSize:17, fontWeight:800, color:c||T.text, letterSpacing:"-0.02em" }}>{v}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TabBar({ tabs, tab, setTab }) {
  return (
    <div style={{ background:T.bg, borderBottom:`1px solid ${T.border}`, position:"sticky", top:101, zIndex:30 }}>
      <div style={{ maxWidth:1000, margin:"0 auto", padding:"0 20px", display:"flex", gap:4, overflowX:"auto" }}>
        {tabs.map(([id,label])=>(
          <button key={id} onClick={()=>setTab(id)} className="tab-btn" style={{
            background:"transparent", border:"none", padding:"13px 14px", fontSize:14, fontWeight:600,
            color: tab===id ? T.brand : T.textSecondary,
            borderBottom: tab===id ? `2px solid ${T.brand}` : "2px solid transparent",
            cursor:"pointer", whiteSpace:"nowrap", fontFamily:T.font, marginBottom:-1
          }}>{label}</button>
        ))}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════
// DEAL MAKER DASH
// ═════════════════════════════════════════════════════════════════
function DealMakerDash({ user, setUser, spend, alerts, setAlerts, onUpgrade, marketDeals, setMarketDeals }) {
  const [tab, setTab] = useState("analyze");
  const [dealFlow, setDealFlow] = useState(null); // { stage, leadName, address }

  function startDealFlow(lead) {
    setDealFlow({
      stage: "appt_set",
      leadName: lead.name,
      phone: lead.phone,
      address: lead.addr,
      askingPrice: "",
      signed: false,
      listed: false,
    });
    setTab("dealflow");
  }

  return (
    <>
      <DashHeader
        title={`Welcome, ${(user?.name||"friend").split(" ")[0]}${user.pro ? " ⭐" : ""}`}
        subtitle={user.pro ? "Pro · Unlimited Dialer + Analyzer" : "4 new deals matching your alerts today"}
        stats={[["Active deals","3",T.brand],["Pipeline value","$725K",T.text],["This month","+$12.4K",T.brand]]}
      />
      <TabBar
        tabs={[["analyze","Analyze"],["dialer",user.pro?"📞 Dialer":"📞 Dialer 🔒"],["pipeline","Pipeline"],["marketplace","Marketplace"],["alerts","Alerts"],["profile","Profile"]]}
        tab={tab} setTab={setTab}
      />
      <main style={{ maxWidth:1000, margin:"0 auto", padding:"20px" }}>
        {tab==="analyze"     && <AnalyzeTab user={user} spend={spend} onJumpPipeline={()=>setTab("pipeline")} onUpgrade={onUpgrade}/>}
        {tab==="dialer"      && (user.pro ? <DialerTab spend={spend} onGotAppt={startDealFlow}/> : <DialerPaywall onUpgrade={onUpgrade}/>)}
        {tab==="dealflow"    && dealFlow && <DealFlowWizard flow={dealFlow} setFlow={setDealFlow} setMarketDeals={setMarketDeals} onDone={()=>{setDealFlow(null); setTab("marketplace");}}/>}
        {tab==="pipeline"    && <PipelineKanban demo="dealmaker" marketDeals={marketDeals} setMarketDeals={setMarketDeals}/>}
        {tab==="marketplace" && <MarketplaceTab marketDeals={marketDeals} setMarketDeals={setMarketDeals}/>}
        {tab==="alerts"      && <AlertsTab alerts={alerts} setAlerts={setAlerts}/>}
        {tab==="profile"     && <ProfileEditor user={user} setUser={setUser} role="dealmaker" onUpgrade={onUpgrade}/>}
      </main>
    </>
  );
}

function ContractorDash({ user, setUser, onVerify }) {
  const [tab, setTab] = useState("leads");
  return (
    <>
      <DashHeader
        title={`Hey ${(user?.name||"friend").split(" ")[0]} 🔨`}
        subtitle={user.verified ? "Verified Pro · ⭐ 4.9 rating" : "Get verified to unlock priority leads"}
        stats={[["New leads","3",T.brand],["Active jobs","2",T.text],["This month","$8.4K",T.brand]]}
      />
      <TabBar
        tabs={[["leads","Job leads"],["pipeline","My jobs"],["profile","Profile"]]}
        tab={tab} setTab={setTab}
      />
      <main style={{ maxWidth:900, margin:"0 auto", padding:"20px" }}>
        {!user.verified && tab==="leads" && <VerifyPromo onVerify={onVerify}/>}
        {tab==="leads"    && <ContractorLeads/>}
        {tab==="pipeline" && <PipelineKanban stages={["New lead","Quoted","In progress","Complete","Paid"]} demo="contractor"/>}
        {tab==="profile"  && <ProfileEditor user={user} setUser={setUser} role="contractor" onVerify={onVerify}/>}
      </main>
    </>
  );
}

function RealtorDash({ user, setUser, onVerify }) {
  const [tab, setTab] = useState("referrals");
  return (
    <>
      <DashHeader
        title={`Welcome, ${(user?.name||"friend").split(" ")[0]} 🤝`}
        subtitle={user.verified ? "Verified Pro · 8 deals closed YTD" : "Verify your DRE to unlock referrals"}
        stats={[["Referrals","5",T.brand],["Proj. commission","$28K",T.text],["Closed YTD","8",T.brand]]}
      />
      <TabBar
        tabs={[["referrals","Referrals"],["pipeline","My deals"],["profile","Profile"]]}
        tab={tab} setTab={setTab}
      />
      <main style={{ maxWidth:900, margin:"0 auto", padding:"20px" }}>
        {!user.verified && tab==="referrals" && <VerifyPromo onVerify={onVerify}/>}
        {tab==="referrals" && <RealtorReferrals/>}
        {tab==="pipeline"  && <PipelineKanban stages={["New","Contacted","Listed","Under contract","Closed"]} demo="realtor"/>}
        {tab==="profile"   && <ProfileEditor user={user} setUser={setUser} role="realtor" onVerify={onVerify}/>}
      </main>
    </>
  );
}

function VerifyPromo({ onVerify }) {
  return (
    <div onClick={onVerify} className="card-hover" style={{ background:`linear-gradient(135deg, ${T.blueLight}, ${T.bg})`, border:`1px solid ${T.blue}33`, borderRadius:14, padding:16, marginBottom:14, cursor:"pointer", display:"flex", alignItems:"center", gap:14 }}>
      <div style={{ width:44, height:44, borderRadius:"50%", background:T.blue, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, fontWeight:800, flexShrink:0 }}>✓</div>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:15, fontWeight:700, marginBottom:2 }}>Get Verified Pro — $99 one-time</div>
        <div style={{ fontSize:13, color:T.textSecondary }}>Priority placement · Verified badge · Higher-quality leads</div>
      </div>
      <span style={{ fontSize:18, color:T.textMuted }}>›</span>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════
// ANALYZE TAB
// ═════════════════════════════════════════════════════════════════
function AnalyzeTab({ user, spend, onJumpPipeline, onUpgrade }) {
  const [address, setAddress]     = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzed, setAnalyzed]   = useState(false);
  const [toast, setToast]         = useState(null);

  function runAnalysis() {
    if (!address.trim()) return;
    if (!spend(1)) return;
    setAnalyzing(true);
    setTimeout(()=>{ setAnalyzing(false); setAnalyzed(true); }, 1200);
  }
  function showToast(msg) { setToast(msg); setTimeout(()=>setToast(null), 2200); }

  return (
    <div>
      {!user?.pro && (
        <div onClick={onUpgrade} className="card-hover" style={{ background:`linear-gradient(135deg, ${T.brandLight}, ${T.bg})`, border:`1px solid ${T.brand}33`, borderRadius:14, padding:14, marginBottom:12, cursor:"pointer", display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ fontSize:24 }}>⭐</div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13, fontWeight:700, color:T.brand }}>Go Pro for unlimited analyses</div>
            <div style={{ fontSize:12, color:T.textSecondary }}>$125/mo · Unlimited Dialer + Analyzer · No credits needed</div>
          </div>
          <span style={{ fontSize:18, color:T.brand }}>›</span>
        </div>
      )}
      <div style={{ background:T.bg, border:`1px solid ${T.border}`, borderRadius:14, padding:18, marginBottom:14 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
          <div style={{ fontSize:16, fontWeight:700 }}>⚡ AI Deal Analyzer</div>
          <span style={{ fontSize:11, fontWeight:700, color:T.brand, background:T.brandLight, padding:"3px 8px", borderRadius:100 }}>{user?.pro ? "Unlimited" : "1 credit"}</span>
        </div>
        <div style={{ fontSize:13, color:T.textSecondary, marginBottom:14 }}>Get comps, rehab costs, and a Deal Score in seconds.</div>
        <div style={{ display:"flex", gap:8 }}>
          <input value={address} onChange={e=>setAddress(e.target.value)} placeholder="789 Oak Grove Blvd, Sacramento CA"
            onKeyDown={e=>e.key==="Enter"&&runAnalysis()}
            className="input-focus"
            style={{ flex:1, background:T.surface, border:`1px solid ${T.border}`, borderRadius:10, padding:"12px 14px", fontSize:15, outline:"none", fontFamily:T.font, minWidth:0 }}/>
          <button onClick={runAnalysis} disabled={analyzing} className="btn-primary" style={{ background:T.brand, border:"none", color:"#fff", padding:"0 18px", borderRadius:10, fontSize:14, fontWeight:600, cursor:analyzing?"default":"pointer", whiteSpace:"nowrap" }}>
            {analyzing?"…":"Analyze"}
          </button>
        </div>
        {!analyzed && !analyzing && (
          <div style={{ marginTop:12, display:"flex", gap:6, flexWrap:"wrap", alignItems:"center" }}>
            <span style={{ fontSize:12, color:T.textMuted, fontWeight:500 }}>Try:</span>
            {["789 Oak Grove Blvd","1842 Maple St"].map(a=>(
              <button key={a} onClick={()=>setAddress(a)} style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:100, padding:"3px 11px", fontSize:12, color:T.text, cursor:"pointer", fontFamily:T.font }}>{a}</button>
            ))}
          </div>
        )}
      </div>

      {analyzing && (
        <div style={{ background:T.bg, border:`1px solid ${T.border}`, borderRadius:14, padding:36, textAlign:"center" }}>
          <div style={{ fontSize:36, marginBottom:10 }}>⚡</div>
          <div style={{ fontSize:15, fontWeight:600 }}>Pulling comps and rehab data…</div>
        </div>
      )}

      {analyzed && !analyzing && (
        <div style={{ animation:"fadeIn .3s ease" }}>
          <div style={{ background:T.bg, border:`1px solid ${T.border}`, borderRadius:14, padding:18, marginBottom:12 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:4 }}>
              <div>
                <div style={{ fontSize:11, fontWeight:700, color:T.brand, letterSpacing:"0.05em", marginBottom:6 }}>PROPERTY FOUND</div>
                <div style={{ fontSize:19, fontWeight:800, letterSpacing:"-0.02em" }}>{address || "789 Oak Grove Blvd"}</div>
                <div style={{ fontSize:13, color:T.textSecondary, marginTop:2 }}>3bd/2ba · 1,350 sqft · Built 1968</div>
              </div>
              <DealScoreBadge score={91}/>
            </div>
          </div>

          <div style={{ background:`linear-gradient(135deg, ${T.brandLight}, ${T.bg})`, border:`2px solid ${T.brand}33`, borderRadius:14, padding:20, marginBottom:12 }}>
            <div style={{ fontSize:11, fontWeight:700, color:T.brand, letterSpacing:"0.05em", marginBottom:10 }}>DEAL ANALYSIS</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
              <div>
                <div style={{ fontSize:12, color:T.textMuted, fontWeight:500 }}>Projected profit</div>
                <div style={{ fontSize:30, fontWeight:800, color:T.brand, letterSpacing:"-0.03em" }}>$78,400</div>
              </div>
              <div>
                <div style={{ fontSize:12, color:T.textMuted, fontWeight:500 }}>ROI</div>
                <div style={{ fontSize:30, fontWeight:800, color:T.brand, letterSpacing:"-0.03em" }}>31.2%</div>
              </div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8 }}>
              {[["ARV","$420K"],["Max offer","$228K"],["Rehab","$38K"],["Holding","$76K"]].map(([k,v])=>(
                <div key={k} style={{ background:T.bg, borderRadius:8, padding:"8px 10px", border:`1px solid ${T.brand}22` }}>
                  <div style={{ fontSize:10, color:T.textMuted, marginBottom:2, fontWeight:500 }}>{k}</div>
                  <div style={{ fontSize:13, fontWeight:800, letterSpacing:"-0.01em" }}>{v}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background:T.bg, border:`1px solid ${T.border}`, borderRadius:14, padding:18, marginBottom:12 }}>
            <div style={{ fontSize:15, fontWeight:700, marginBottom:4 }}>📋 What to do next</div>
            <div style={{ fontSize:13, color:T.textSecondary, marginBottom:14 }}>Suggested moves for this deal.</div>
            {[
              { icon:"📞", title:"Call the owner",        desc:"Pre-foreclosure. Motivated seller." },
              { icon:"✍️", title:"Send purchase contract", desc:"Pre-fill with $228K max offer." },
              { icon:"🔨", title:"Line up contractor",     desc:"3 verified GCs match this rehab." },
              { icon:"🤝", title:"Wholesale to buyers",    desc:"Push to 30+ active flippers." },
            ].map((s,i,arr)=>(
              <div key={i} onClick={()=>showToast(s.title + " — queued")} style={{ display:"flex", alignItems:"center", gap:12, padding:"11px 0", borderBottom:i<arr.length-1?`1px solid ${T.borderLight}`:"none", cursor:"pointer" }}>
                <div style={{ fontSize:20, width:28 }}>{s.icon}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14, fontWeight:600 }}>{s.title}</div>
                  <div style={{ fontSize:12, color:T.textSecondary, marginTop:2 }}>{s.desc}</div>
                </div>
                <span style={{ fontSize:18, color:T.textMuted }}>›</span>
              </div>
            ))}
          </div>

          <button onClick={()=>{showToast("✓ Added to pipeline"); setTimeout(onJumpPipeline,500);}} className="btn-primary" style={{ width:"100%", background:T.brand, border:"none", color:"#fff", padding:"13px", borderRadius:10, fontSize:14, fontWeight:700, cursor:"pointer", marginBottom:8 }}>
            + Add to pipeline
          </button>
          <button onClick={()=>{setAnalyzed(false); setAddress("");}} style={{ width:"100%", background:"transparent", border:`1px solid ${T.border}`, color:T.textSecondary, padding:"11px", borderRadius:10, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:T.font }}>
            Analyze another
          </button>
        </div>
      )}

      {toast && (
        <div style={{ position:"fixed", bottom:24, left:"50%", transform:"translateX(-50%)", background:T.text, color:"#fff", padding:"12px 20px", borderRadius:10, fontSize:14, fontWeight:600, zIndex:900, boxShadow:T.shadowLg, animation:"slideUp .2s ease" }}>
          {toast}
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════
// DIALER TAB — list builder + active call UI
// ═════════════════════════════════════════════════════════════════
function DialerTab({ spend, onGotAppt }) {
  const [view, setView] = useState("setup"); // setup | calling
  const [listType, setListType] = useState("absentee");
  const [radiusType, setRadiusType] = useState("city");
  const [location, setLocation] = useState("Sacramento, CA");
  const [miles, setMiles] = useState("10");
  const [propertyType, setPropertyType] = useState("sfr");
  const [minEquity, setMinEquity] = useState("50");
  const [ownedSince, setOwnedSince] = useState("5");
  const [toast, setToast] = useState(null);
  const [dialing, setDialing] = useState(false);
  const [callIdx, setCallIdx] = useState(0);
  const [callStats, setCallStats] = useState({ calls:0, connects:0, appts:0 });

  const listTypes = [
    { id:"absentee",       label:"Absentee Owner",     icon:"🏚", desc:"Owners living elsewhere" },
    { id:"preforeclosure", label:"Pre-foreclosure",    icon:"⚠️", desc:"NOD filed, motivated" },
    { id:"highequity",     label:"High Equity",        icon:"💰", desc:"70%+ equity, free & clear" },
    { id:"expired",        label:"Expired Listings",   icon:"📋", desc:"Pulled off MLS" },
    { id:"tired",          label:"Tired Landlord",     icon:"🏠", desc:"Multiple properties, owned 10+yr" },
    { id:"probate",        label:"Probate",            icon:"📜", desc:"Estate / inherited property" },
    { id:"vacant",         label:"Vacant",             icon:"🏚", desc:"No current occupant" },
    { id:"divorce",        label:"Divorce",            icon:"⚖️", desc:"Court-filed divorces" },
  ];

  const count = useMemo(() => {
    const base = {absentee:420, preforeclosure:68, highequity:892, expired:156, tired:287, probate:94, vacant:134, divorce:71}[listType] || 200;
    const radiusMult = radiusType==="zip" ? 0.4 : radiusType==="city" ? 1 : radiusType==="county" ? 2.3 : Math.min(3.5, parseFloat(miles||10)/10);
    const equityMult = 1 - (parseFloat(minEquity||0)/200);
    const ownedMult  = 1 - (parseFloat(ownedSince||0)/40);
    const propertyMult = { sfr:1, multi:0.55, condo:0.72, land:0.38 }[propertyType] || 1;
    const locationHash = Array.from((location || "").toLowerCase()).reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
    const locationMult = 0.8 + (locationHash % 9) * 0.03;
    return Math.max(1, Math.round(base * radiusMult * equityMult * ownedMult * propertyMult * locationMult));
  }, [listType, radiusType, location, miles, propertyType, minEquity, ownedSince]);

  const creditCost = Math.ceil(count / 10); // 1 credit = 10 leads

  const currentLead = {
    name:  ["R. Chen", "M. Gutierrez", "J. Williams", "D. Patel", "S. Kim"][callIdx % 5],
    phone: ["(916) 555-0128","(916) 555-0291","(559) 555-0347","(916) 555-0418","(209) 555-0552"][callIdx % 5],
    addr:  ["4205 Sunridge Dr","1892 Oak Park Blvd","334 Desert Rose Ln","772 Maple Grove","1105 Valley Ct"][callIdx % 5],
    equity:["$142K","$89K","$210K","$67K","$178K"][callIdx % 5],
    owned: ["18yrs","7yrs","22yrs","4yrs","11yrs"][callIdx % 5],
  };

  function pullList() {
    if (!spend(creditCost)) return;
    setToast(`✓ ${count} leads pulled`);
    setTimeout(()=>{ setToast(null); setView("calling"); }, 1400);
  }
  function startDialer() { setDialing(true); }
  function hangup(outcome) {
    setDialing(false);
    setCallStats(s => ({
      calls:   s.calls + 1,
      connects: outcome==="connect" ? s.connects+1 : s.connects,
      appts:    outcome==="appt"    ? s.appts+1    : s.appts,
    }));
    if (outcome !== "stay") setCallIdx(i => i+1);
  }

  // ═══ CALLING VIEW ═══
  if (view === "calling") {
    return (
      <div>
        <button onClick={()=>{setView("setup"); setDialing(false);}} style={{ background:"transparent", border:"none", color:T.textSecondary, fontSize:13, fontWeight:600, cursor:"pointer", marginBottom:10, padding:0, fontFamily:T.font }}>← Back to list builder</button>

        {/* Stats bar */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginBottom:14 }}>
          {[["Queue",`${count - callIdx}`],["Calls",callStats.calls],["Connects",callStats.connects],["Appts",callStats.appts]].map(([k,v])=>(
            <div key={k} style={{ background:T.bg, border:`1px solid ${T.border}`, borderRadius:10, padding:"10px 12px" }}>
              <div style={{ fontSize:10, color:T.textMuted, fontWeight:500, marginBottom:2, textTransform:"uppercase", letterSpacing:"0.03em" }}>{k}</div>
              <div style={{ fontSize:18, fontWeight:800, color:T.brand, letterSpacing:"-0.02em" }}>{v}</div>
            </div>
          ))}
        </div>

        {/* Current lead card */}
        <div className="card-hover" style={{ background:T.bg, border:`1px solid ${T.border}`, borderRadius:14, padding:20, marginBottom:12 }}>
          <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:16 }}>
            <div style={{ width:58, height:58, borderRadius:"50%", background: dialing?T.brand:T.surface, color:dialing?"#fff":T.text, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, fontWeight:700, transition:"all .2s" }}>
              {currentLead.name.split(" ").map(w=>w[0]).join("")}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:18, fontWeight:700, letterSpacing:"-0.01em" }}>{currentLead.name}</div>
              <div style={{ fontSize:14, color:T.textSecondary, fontFamily:"monospace" }}>{currentLead.phone}</div>
            </div>
            <span style={{ fontSize:11, fontWeight:700, color:T.brand, background:T.brandLight, padding:"4px 10px", borderRadius:6, whiteSpace:"nowrap" }}>
              {listTypes.find(l=>l.id===listType)?.icon} {listTypes.find(l=>l.id===listType)?.label}
            </span>
          </div>
          <div style={{ background:T.surface, borderRadius:10, padding:12, marginBottom:14 }}>
            <div style={{ fontSize:13, color:T.text, marginBottom:10 }}>📍 {currentLead.addr}</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <div>
                <div style={{ fontSize:10, color:T.textMuted, fontWeight:500, textTransform:"uppercase" }}>Equity</div>
                <div style={{ fontSize:15, fontWeight:700, color:T.brand }}>{currentLead.equity}</div>
              </div>
              <div>
                <div style={{ fontSize:10, color:T.textMuted, fontWeight:500, textTransform:"uppercase" }}>Owned</div>
                <div style={{ fontSize:15, fontWeight:700 }}>{currentLead.owned}</div>
              </div>
            </div>
          </div>

          {!dialing ? (
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={startDialer} className="btn-primary" style={{ flex:2, background:T.brand, border:"none", color:"#fff", padding:"14px", borderRadius:10, fontSize:14, fontWeight:700, cursor:"pointer" }}>📞 Start call · 1 credit</button>
              <button onClick={()=>setCallIdx(i=>i+1)} style={{ flex:1, background:T.surface, border:`1px solid ${T.border}`, color:T.text, padding:"14px", borderRadius:10, fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:T.font }}>Skip</button>
            </div>
          ) : (
            <>
              <div style={{ background:T.brandLight, border:`1px solid ${T.brand}33`, borderRadius:10, padding:"10px 14px", marginBottom:10, textAlign:"center" }}>
                <div style={{ fontSize:11, fontWeight:700, color:T.brand, letterSpacing:"0.05em", marginBottom:2 }}>📞 CALLING…</div>
                <div style={{ fontSize:12, color:T.textSecondary }}>Ringing {currentLead.phone}</div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6 }}>
                <button onClick={()=>{hangup("appt"); if(onGotAppt) onGotAppt(currentLead);}} className="btn-primary" style={{ background:T.brand, border:"none", color:"#fff", padding:"12px 8px", borderRadius:10, fontSize:12, fontWeight:700, cursor:"pointer" }}>✓ Got appt</button>
                <button onClick={()=>hangup("connect")} style={{ background:T.surface, border:`1px solid ${T.border}`, color:T.text, padding:"12px 8px", borderRadius:10, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:T.font }}>Connected</button>
                <button onClick={()=>hangup("noanswer")} style={{ background:"#fff1f1", border:"1px solid #fecaca", color:T.red, padding:"12px 8px", borderRadius:10, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:T.font }}>No answer</button>
              </div>
            </>
          )}
        </div>

        {/* Script prompt */}
        <div style={{ background:T.bg, border:`1px solid ${T.border}`, borderRadius:14, padding:16, marginBottom:12 }}>
          <div style={{ fontSize:12, fontWeight:700, color:T.textMuted, letterSpacing:"0.03em", textTransform:"uppercase", marginBottom:8 }}>Suggested script</div>
          <div style={{ fontSize:14, color:T.text, lineHeight:1.6, background:T.surface, borderRadius:8, padding:12 }}>
            "Hi {currentLead.name.split(" ")[0]}, this is <em>[Your name]</em> with Cash Offers. I noticed you've owned the property at {currentLead.addr} for a while and wanted to see if you'd ever consider a cash offer. Not asking you to sell today — just curious if it's something you'd entertain at the right price?"
          </div>
        </div>

        {toast && (
          <div style={{ position:"fixed", bottom:24, left:"50%", transform:"translateX(-50%)", background:T.text, color:"#fff", padding:"12px 20px", borderRadius:10, fontSize:14, fontWeight:600, zIndex:900, boxShadow:T.shadowLg, animation:"slideUp .2s ease" }}>{toast}</div>
        )}
      </div>
    );
  }

  // ═══ SETUP VIEW ═══
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
        <div>
          <div style={{ fontSize:17, fontWeight:800, letterSpacing:"-0.01em" }}>📞 Power Dialer</div>
          <div style={{ fontSize:13, color:T.textSecondary }}>Build a list, pull it, start calling.</div>
        </div>
      </div>

      {/* STEP 1 — List type */}
      <div style={{ background:T.bg, border:`1px solid ${T.border}`, borderRadius:14, padding:16, marginBottom:12 }}>
        <div style={{ fontSize:11, fontWeight:700, color:T.textMuted, letterSpacing:"0.05em", textTransform:"uppercase", marginBottom:10 }}>① List type</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(150px,1fr))", gap:8 }}>
          {listTypes.map(l=>(
            <button key={l.id} onClick={()=>setListType(l.id)} style={{
              textAlign:"left", padding:"10px 12px", borderRadius:10, cursor:"pointer",
              border: listType===l.id ? `2px solid ${T.brand}` : `1px solid ${T.border}`,
              background: listType===l.id ? T.brandLight : T.bg,
              fontFamily:T.font, transition:"all .15s"
            }}>
              <div style={{ fontSize:18, marginBottom:2 }}>{l.icon}</div>
              <div style={{ fontSize:13, fontWeight:700, color: listType===l.id ? T.brand : T.text, marginBottom:2 }}>{l.label}</div>
              <div style={{ fontSize:11, color:T.textMuted }}>{l.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* STEP 2 — Geography */}
      <div style={{ background:T.bg, border:`1px solid ${T.border}`, borderRadius:14, padding:16, marginBottom:12 }}>
        <div style={{ fontSize:11, fontWeight:700, color:T.textMuted, letterSpacing:"0.05em", textTransform:"uppercase", marginBottom:10 }}>② Radius</div>
        <div style={{ display:"flex", gap:6, marginBottom:12, flexWrap:"wrap" }}>
          {[["zip","Zip code"],["city","City"],["county","County"],["miles","Miles radius"]].map(([id,label])=>(
            <button key={id} onClick={()=>setRadiusType(id)} style={{
              padding:"8px 14px", borderRadius:100, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:T.font,
              border: radiusType===id ? "none" : `1px solid ${T.border}`,
              background: radiusType===id ? T.text : T.bg,
              color: radiusType===id ? "#fff" : T.text,
            }}>{label}</button>
          ))}
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <div style={{ flex:2 }}>
            <label style={{ fontSize:10, color:T.textMuted, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.03em", display:"block", marginBottom:4 }}>
              {radiusType==="zip" ? "Zip code" : radiusType==="city" ? "City, State" : radiusType==="county" ? "County" : "Center location"}
            </label>
            <input value={location} onChange={e=>setLocation(e.target.value)} placeholder="Sacramento, CA"
              className="input-focus"
              style={{ width:"100%", background:T.surface, border:`1px solid ${T.border}`, borderRadius:10, padding:"10px 12px", fontSize:14, outline:"none", fontFamily:T.font, boxSizing:"border-box" }}/>
          </div>
          {radiusType === "miles" && (
            <div style={{ flex:1 }}>
              <label style={{ fontSize:10, color:T.textMuted, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.03em", display:"block", marginBottom:4 }}>Miles</label>
              <input value={miles} onChange={e=>setMiles(e.target.value.replace(/[^0-9]/g,""))} placeholder="10"
                className="input-focus"
                style={{ width:"100%", background:T.surface, border:`1px solid ${T.border}`, borderRadius:10, padding:"10px 12px", fontSize:14, outline:"none", fontFamily:T.font, boxSizing:"border-box" }}/>
            </div>
          )}
        </div>
      </div>

      {/* STEP 3 — Filters */}
      <div style={{ background:T.bg, border:`1px solid ${T.border}`, borderRadius:14, padding:16, marginBottom:12 }}>
        <div style={{ fontSize:11, fontWeight:700, color:T.textMuted, letterSpacing:"0.05em", textTransform:"uppercase", marginBottom:10 }}>③ Filters</div>

        <div style={{ marginBottom:12 }}>
          <label style={{ fontSize:10, color:T.textMuted, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.03em", display:"block", marginBottom:6 }}>Property type</label>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
            {[["sfr","Single family"],["multi","Multi-family"],["condo","Condo/Townhome"],["land","Land"]].map(([id,label])=>(
              <button key={id} onClick={()=>setPropertyType(id)} style={{
                padding:"7px 12px", borderRadius:100, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:T.font,
                border: propertyType===id ? `2px solid ${T.brand}` : `1px solid ${T.border}`,
                background: propertyType===id ? T.brandLight : T.bg,
                color: propertyType===id ? T.brand : T.text,
              }}>{label}</button>
            ))}
          </div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          <div>
            <label style={{ fontSize:10, color:T.textMuted, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.03em", display:"block", marginBottom:4 }}>Min equity %</label>
            <input value={minEquity} onChange={e=>setMinEquity(e.target.value.replace(/[^0-9]/g,""))}
              className="input-focus"
              style={{ width:"100%", background:T.surface, border:`1px solid ${T.border}`, borderRadius:10, padding:"10px 12px", fontSize:14, outline:"none", fontFamily:T.font, boxSizing:"border-box" }}/>
          </div>
          <div>
            <label style={{ fontSize:10, color:T.textMuted, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.03em", display:"block", marginBottom:4 }}>Min years owned</label>
            <input value={ownedSince} onChange={e=>setOwnedSince(e.target.value.replace(/[^0-9]/g,""))}
              className="input-focus"
              style={{ width:"100%", background:T.surface, border:`1px solid ${T.border}`, borderRadius:10, padding:"10px 12px", fontSize:14, outline:"none", fontFamily:T.font, boxSizing:"border-box" }}/>
          </div>
        </div>
      </div>

      {/* STEP 4 — Summary + pull */}
      <div style={{ background:`linear-gradient(135deg, ${T.brandLight}, ${T.bg})`, border:`2px solid ${T.brand}33`, borderRadius:14, padding:18, marginBottom:12 }}>
        <div style={{ fontSize:11, fontWeight:700, color:T.brand, letterSpacing:"0.05em", textTransform:"uppercase", marginBottom:10 }}>④ Estimate</div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
          <div>
            <div style={{ fontSize:12, color:T.textMuted, fontWeight:500 }}>Matching leads</div>
            <div style={{ fontSize:32, fontWeight:800, color:T.brand, letterSpacing:"-0.03em" }}>~{count.toLocaleString()}</div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontSize:12, color:T.textMuted, fontWeight:500 }}>Cost</div>
            <div style={{ fontSize:20, fontWeight:800, letterSpacing:"-0.02em" }}>⚡ {creditCost} credits</div>
            <div style={{ fontSize:11, color:T.textMuted }}>1 credit = 10 leads</div>
          </div>
        </div>
        <button onClick={pullList} className="btn-primary" style={{ width:"100%", background:T.brand, border:"none", color:"#fff", padding:"14px", borderRadius:10, fontSize:15, fontWeight:700, cursor:"pointer" }}>
          Pull list & start dialing →
        </button>
      </div>

      {/* Recent lists */}
      <div style={{ background:T.bg, border:`1px solid ${T.border}`, borderRadius:14, padding:16 }}>
        <div style={{ fontSize:12, fontWeight:700, color:T.textMuted, letterSpacing:"0.03em", textTransform:"uppercase", marginBottom:10 }}>Recent lists</div>
        {[
          ["Sacramento absentee owners","342 · 47% called","Mar 12"],
          ["Fresno pre-foreclosure","189 · 91% called","Feb 28"],
          ["Modesto high-equity","276 · Not started","Feb 14"],
        ].map(([n,c,d],i,arr)=>(
          <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:i<arr.length-1?`1px solid ${T.borderLight}`:"none" }}>
            <div>
              <div style={{ fontSize:14, fontWeight:600 }}>{n}</div>
              <div style={{ fontSize:12, color:T.textMuted, marginTop:1 }}>{c} · {d}</div>
            </div>
            <button onClick={()=>setView("calling")} style={{ background:"transparent", border:`1px solid ${T.border}`, padding:"6px 12px", borderRadius:7, fontSize:12, fontWeight:600, cursor:"pointer", color:T.text, fontFamily:T.font }}>Resume</button>
          </div>
        ))}
      </div>

      {toast && (
        <div style={{ position:"fixed", bottom:24, left:"50%", transform:"translateX(-50%)", background:T.text, color:"#fff", padding:"12px 20px", borderRadius:10, fontSize:14, fontWeight:600, zIndex:900, boxShadow:T.shadowLg, animation:"slideUp .2s ease" }}>{toast}</div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════
// PIPELINE KANBAN
// ═════════════════════════════════════════════════════════════════
function PipelineKanban({ stages, demo }) {
  const defaultStages = stages || ["New","Contacted","Interested","Offer sent","Contract","Closed"];
  const demoData = {
    dealmaker: [
      { id:"d1", stage:"New",         title:"789 Oak Grove Blvd",    sub:"Sacramento · 3bd/2ba",  amount:"$228K",  tag:"Hot",       score:91 },
      { id:"d2", stage:"Contacted",   title:"1842 Maple St",          sub:"Sacramento · 3bd/2ba",  amount:"$210K",  tag:"Call-back", score:84 },
      { id:"d3", stage:"Contacted",   title:"533 Valley Oak Dr",      sub:"Elk Grove · 4bd/2ba",   amount:"$161K",  tag:"",          score:72 },
      { id:"d4", stage:"Interested",  title:"3421 Poplar Ave",        sub:"Sacramento · 3bd/2ba",  amount:"$195K",  tag:"Warm",      score:78 },
      { id:"d5", stage:"Offer sent",  title:"1145 Desert Rose Ln",    sub:"Fresno · 4bd/2ba",       amount:"$138K",  tag:"",          score:68 },
      { id:"d6", stage:"Contract",    title:"908 Birchwood Dr",       sub:"Stockton · 3bd/2ba",    amount:"$148K",  tag:"Close Apr 22", score:89 },
      { id:"d7", stage:"Closed",      title:"534 Oak Blvd",           sub:"Stockton · 3bd/2ba",    amount:"$161K",  tag:"+$61K",     score:95 },
    ],
    contractor: [
      { id:"c1", stage:"New lead",    title:"1842 Maple St — Full rehab", sub:"T. Williams",       amount:"$55–70K", tag:"Urgent" },
      { id:"c2", stage:"Quoted",      title:"4205 Sunridge Dr — Cosmetic",sub:"J. Park",           amount:"$38–48K", tag:"" },
      { id:"c3", stage:"In progress",title:"534 Oak Blvd — Kitchen/bath",sub:"M. Johnson · 30%",   amount:"$14.5K",  tag:"" },
      { id:"c4", stage:"In progress",title:"1842 Maple St — Full rehab", sub:"T. Williams · 65%",  amount:"$21K",    tag:"" },
      { id:"c5", stage:"Complete",    title:"889 Valley Ct — Flooring",   sub:"R. Chen",           amount:"$8K",     tag:"Punch list" },
      { id:"c6", stage:"Paid",        title:"2890 Oak Park — Full rehab", sub:"S. Park",           amount:"$32K",    tag:"Mar 5" },
    ],
    realtor: [
      { id:"r1", stage:"New",         title:"1842 Maple St",          sub:"J. Martinez · Ready to list", amount:"$385K", tag:"Urgent" },
      { id:"r2", stage:"New",         title:"789 Oak Grove",          sub:"S. Park · Ready to list",     amount:"$420K", tag:"Hot" },
      { id:"r3", stage:"Contacted",   title:"3421 Poplar Ave",        sub:"T. Williams · Renovating",    amount:"$420K", tag:"" },
      { id:"r4", stage:"Listed",      title:"882 Sunset Dr",          sub:"4d active · 14 showings",     amount:"$378K", tag:"" },
      { id:"r5", stage:"Under contract", title:"1201 River Rd",       sub:"Accepted · $315K",            amount:"$315K", tag:"Close May 3" },
      { id:"r6", stage:"Closed",      title:"2890 Oak Park Ct",       sub:"Closed Feb 18",               amount:"$425K", tag:"+$8K net" },
    ],
  };

  const [cards, setCards] = useState(demoData[demo || "dealmaker"] || []);
  const [dragId, setDragId] = useState(null);
  const [overStage, setOverStage] = useState(null);
  const [openCard, setOpenCard] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newCard, setNewCard] = useState({ title:"", sub:"", amount:"" });

  function onDragStart(id) { setDragId(id); }
  function onDragOver(e, stage) { e.preventDefault(); setOverStage(stage); }
  function onDrop(stage) {
    if (dragId) setCards(cs => cs.map(c => c.id === dragId ? { ...c, stage } : c));
    setDragId(null);
    setOverStage(null);
  }
  function moveCardStage(id, nextStage) {
    setCards(cs => cs.map(c => c.id===id ? { ...c, stage: nextStage } : c));
    setOpenCard(o => o ? { ...o, stage: nextStage } : o);
  }
  function deleteCard(id) {
    setCards(cs => cs.filter(c => c.id !== id));
    setOpenCard(null);
  }
  function addNewCard() {
    if (!newCard.title.trim()) return;
    const firstStage = defaultStages[0];
    setCards(cs => [...cs, { id:"n"+Date.now(), stage:firstStage, title:newCard.title, sub:newCard.sub, amount:newCard.amount||"—", tag:"New" }]);
    setNewCard({ title:"", sub:"", amount:"" });
    setShowAdd(false);
  }

  const stageColors = { "New":"#94a3b8","New lead":"#94a3b8","Contacted":"#60a5fa","Interested":"#a78bfa","Quoted":"#a78bfa","Offer sent":"#f59e0b","Listed":"#f59e0b","In progress":"#f59e0b","Contract":T.brand,"Complete":T.brand,"Under contract":T.brand,"Closed":"#14532d","Paid":"#14532d" };

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
        <div>
          <div style={{ fontSize:17, fontWeight:800, letterSpacing:"-0.01em" }}>Pipeline</div>
          <div style={{ fontSize:13, color:T.textSecondary }}>{cards.length} cards · Drag to move</div>
        </div>
        <button onClick={()=>setShowAdd(true)} className="btn-primary" style={{ background:T.brand, border:"none", color:"#fff", padding:"9px 16px", borderRadius:8, fontSize:13, fontWeight:600, cursor:"pointer" }}>+ Add</button>
      </div>

      <div style={{ display:"flex", gap:10, overflowX:"auto", paddingBottom:12 }}>
        {defaultStages.map(stage => {
          const col = cards.filter(c => c.stage === stage);
          return (
            <div key={stage}
              onDragOver={e=>onDragOver(e,stage)}
              onDrop={()=>onDrop(stage)}
              style={{
                minWidth:260, width:260, flexShrink:0,
                background: overStage===stage ? T.brandLight : T.bg,
                border:`1px solid ${overStage===stage ? T.brand : T.border}`,
                borderRadius:12, padding:12, transition:"all .15s"
              }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10, paddingLeft:4 }}>
                <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                  <div style={{ width:6, height:6, borderRadius:"50%", background:stageColors[stage]||T.textMuted }}/>
                  <span style={{ fontSize:12, fontWeight:700, letterSpacing:"0.02em" }}>{stage.toUpperCase()}</span>
                </div>
                <span style={{ fontSize:11, fontWeight:700, color:T.textMuted, background:T.surface, padding:"2px 8px", borderRadius:100 }}>{col.length}</span>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:8, minHeight:60 }}>
                {col.map(card => (
                  <div key={card.id}
                    draggable
                    onDragStart={()=>onDragStart(card.id)}
                    onClick={()=>setOpenCard(card)}
                    className="card-hover"
                    style={{
                      background:T.bg, border:`1px solid ${T.border}`, borderRadius:10, padding:12,
                      cursor:"pointer", opacity:dragId===card.id?0.4:1,
                      boxShadow: dragId===card.id ? T.shadowLg : T.shadow
                    }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8, marginBottom:2 }}>
                      <div style={{ fontSize:13, fontWeight:700, letterSpacing:"-0.01em", flex:1 }}>{card.title}</div>
                      {card.score && <DealScoreBadge score={card.score} size="sm"/>}
                    </div>
                    <div style={{ fontSize:12, color:T.textSecondary, marginBottom:8 }}>{card.sub}</div>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <span style={{ fontSize:13, fontWeight:800, color:T.brand, letterSpacing:"-0.01em" }}>{card.amount}</span>
                      {card.tag && <span style={{ fontSize:10, fontWeight:700, background:T.surface, padding:"2px 8px", borderRadius:100 }}>{card.tag}</span>}
                    </div>
                  </div>
                ))}
                {col.length === 0 && (
                  <div style={{ fontSize:12, color:T.textMuted, textAlign:"center", padding:"20px 10px", fontStyle:"italic" }}>Drop here</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ fontSize:12, color:T.textMuted, marginTop:10, textAlign:"center" }}>
        💡 Drag to move · Tap to open
      </div>

      {openCard && <CardDrawer card={openCard} stages={defaultStages} onClose={()=>setOpenCard(null)} onMove={moveCardStage} onDelete={deleteCard}/>}
      {showAdd && <AddCardModal newCard={newCard} setNewCard={setNewCard} onClose={()=>setShowAdd(false)} onAdd={addNewCard}/>}
    </div>
  );
}

function CardDrawer({ card, stages, onClose, onMove, onDelete }) {
  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:600, display:"flex", alignItems:"flex-end", justifyContent:"center", animation:"fadeIn .2s ease" }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:T.bg, borderRadius:"16px 16px 0 0", width:"100%", maxWidth:560, maxHeight:"90vh", overflow:"auto", boxShadow:T.shadowLg, animation:"slideUp .25s ease" }}>
        <div style={{ padding:"22px 22px 0", display:"flex", justifyContent:"space-between", alignItems:"flex-start", position:"sticky", top:0, background:T.bg, zIndex:1 }}>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
              <span style={{ fontSize:11, fontWeight:700, color:T.brand, letterSpacing:"0.05em", textTransform:"uppercase" }}>{card.stage}</span>
              {card.score && <DealScoreBadge score={card.score} size="sm"/>}
            </div>
            <div style={{ fontSize:22, fontWeight:800, letterSpacing:"-0.02em", marginBottom:4 }}>{card.title}</div>
            <div style={{ fontSize:14, color:T.textSecondary }}>{card.sub}</div>
          </div>
          <button onClick={onClose} style={{ background:T.surface, border:"none", width:30, height:30, borderRadius:"50%", cursor:"pointer", color:T.textSecondary, fontSize:17, flexShrink:0, marginLeft:10 }}>✕</button>
        </div>
        <div style={{ padding:"18px 22px 22px" }}>
          <div style={{ background:`linear-gradient(135deg, ${T.brandLight}, ${T.bg})`, border:`1px solid ${T.brand}33`, borderRadius:12, padding:16, marginBottom:14 }}>
            <div style={{ fontSize:11, fontWeight:700, color:T.brand, letterSpacing:"0.05em", textTransform:"uppercase", marginBottom:4 }}>Deal value</div>
            <div style={{ fontSize:28, fontWeight:800, color:T.brand, letterSpacing:"-0.03em" }}>{card.amount}</div>
            {card.tag && <div style={{ fontSize:12, color:T.textSecondary, marginTop:4 }}>{card.tag}</div>}
          </div>
          <div style={{ marginBottom:14 }}>
            <label style={{ fontSize:11, color:T.textMuted, fontWeight:700, letterSpacing:"0.03em", marginBottom:8, display:"block", textTransform:"uppercase" }}>Move to stage</label>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {stages.map(s=>(
                <button key={s} onClick={()=>onMove(card.id, s)} style={{
                  background: s===card.stage ? T.brand : T.surface,
                  color: s===card.stage ? "#fff" : T.text,
                  border: s===card.stage ? "none" : `1px solid ${T.border}`,
                  padding:"7px 12px", borderRadius:100, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:T.font
                }}>{s}</button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom:14 }}>
            <label style={{ fontSize:11, color:T.textMuted, fontWeight:700, letterSpacing:"0.03em", marginBottom:8, display:"block", textTransform:"uppercase" }}>Quick actions</label>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
              {[["📞","Call"],["✉️","Message"],["📝","Note"],["✍️","Contract"]].map(([i,l])=>(
                <button key={l} style={{ background:T.surface, border:`1px solid ${T.border}`, padding:"12px", borderRadius:10, fontSize:13, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", gap:8, color:T.text, fontFamily:T.font }}>
                  <span style={{ fontSize:16 }}>{i}</span><span>{l}</span>
                </button>
              ))}
            </div>
          </div>
          <button onClick={()=>{if(confirm("Delete this card?"))onDelete(card.id);}} style={{ width:"100%", background:"transparent", border:`1px solid ${T.border}`, color:T.red, padding:"11px", borderRadius:10, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:T.font }}>Delete card</button>
        </div>
      </div>
    </div>
  );
}

function AddCardModal({ newCard, setNewCard, onClose, onAdd }) {
  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:600, display:"flex", alignItems:"center", justifyContent:"center", padding:20, animation:"fadeIn .2s ease" }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:T.bg, borderRadius:16, width:"100%", maxWidth:420, overflow:"hidden", boxShadow:T.shadowLg }}>
        <div style={{ padding:"22px 22px 0", display:"flex", justifyContent:"space-between" }}>
          <div style={{ fontSize:20, fontWeight:800, letterSpacing:"-0.02em" }}>Add to pipeline</div>
          <button onClick={onClose} style={{ background:T.surface, border:"none", width:30, height:30, borderRadius:"50%", cursor:"pointer", color:T.textSecondary, fontSize:17 }}>✕</button>
        </div>
        <div style={{ padding:"16px 22px 22px" }}>
          {[
            { key:"title",  label:"Title *",   ph:"1842 Maple St" },
            { key:"sub",    label:"Details",   ph:"Sacramento · 3bd/2ba" },
            { key:"amount", label:"Amount",    ph:"$228K" },
          ].map(f=>(
            <div key={f.key} style={{ marginBottom:12 }}>
              <label style={{ fontSize:11, color:T.textMuted, fontWeight:700, letterSpacing:"0.03em", marginBottom:6, display:"block", textTransform:"uppercase" }}>{f.label}</label>
              <input value={newCard[f.key]} onChange={e=>setNewCard(n=>({...n,[f.key]:e.target.value}))} placeholder={f.ph}
                className="input-focus"
                onKeyDown={e=>e.key==="Enter"&&onAdd()}
                style={{ width:"100%", background:T.surface, border:`1px solid ${T.border}`, borderRadius:10, padding:"11px 13px", fontSize:14, outline:"none", fontFamily:T.font, boxSizing:"border-box" }}/>
            </div>
          ))}
          <button onClick={onAdd} className="btn-primary" style={{ width:"100%", background:T.brand, border:"none", color:"#fff", padding:"12px", borderRadius:10, fontSize:14, fontWeight:700, cursor:"pointer", marginTop:4 }}>Add card</button>
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════
// MARKETPLACE
// ═════════════════════════════════════════════════════════════════
function MarketplaceTab({ marketDeals, setMarketDeals }) {
  const [openDeal, setOpenDeal] = useState(null);
  const [showPost, setShowPost] = useState(false);
  const [minScore, setMinScore] = useState(0);
  const deals = marketDeals || [];
  const setDeals = setMarketDeals || (()=>{});
  const [postData, setPostData] = useState({ addr:"", city:"", arv:"", ask:"", type:"Wholesale" });

  const filtered = deals.filter(d => d.score >= minScore);

  function postDeal() {
    if (!postData.addr.trim() || !postData.arv.trim() || !postData.ask.trim()) return;
    setDeals(d => [{ id:"m"+Date.now(), ...postData, roi:"—", hot:true, beds:3, baths:2, score: Math.floor(Math.random()*20)+75, seller:"You", verified:false }, ...d]);
    setPostData({ addr:"", city:"", arv:"", ask:"", type:"Wholesale" });
    setShowPost(false);
  }

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
        <div>
          <div style={{ fontSize:17, fontWeight:800, letterSpacing:"-0.01em" }}>Marketplace</div>
          <div style={{ fontSize:13, color:T.textSecondary }}>{filtered.length} deals · Sorted by Deal Score</div>
        </div>
        <button onClick={()=>setShowPost(true)} className="btn-primary" style={{ background:T.brand, border:"none", color:"#fff", padding:"9px 16px", borderRadius:8, fontSize:13, fontWeight:600, cursor:"pointer" }}>+ Post deal</button>
      </div>

      <div style={{ display:"flex", gap:6, marginBottom:14, overflowX:"auto" }}>
        {[[0,"All"],[70,"Good+"],[85,"Excellent"]].map(([s,l])=>(
          <button key={s} onClick={()=>setMinScore(s)} style={{
            background: minScore===s ? T.text : T.bg,
            color: minScore===s ? "#fff" : T.text,
            border: minScore===s ? "none" : `1px solid ${T.border}`,
            padding:"7px 14px", borderRadius:100, fontSize:13, fontWeight:600, cursor:"pointer", whiteSpace:"nowrap", fontFamily:T.font
          }}>{l}</button>
        ))}
      </div>

      {filtered.sort((a,b)=>b.score-a.score).map((d,i)=>(
        <div key={i} onClick={()=>setOpenDeal(d)} className="card-hover" style={{ background:T.bg, border:`1px solid ${T.border}`, borderRadius:14, padding:16, marginBottom:10, cursor:"pointer" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:6, flexWrap:"wrap" }}>
                <span style={{ fontSize:11, fontWeight:700, color: d.type==="Wholesale"?T.gold:T.brand, background: d.type==="Wholesale"?"#fef6e0":T.brandLight, padding:"3px 9px", borderRadius:6 }}>{d.type}</span>
                <DealScoreBadge score={d.score} size="sm"/>
                {d.hot && <span style={{ fontSize:11, fontWeight:700, color:T.red }}>● New</span>}
              </div>
              <div style={{ fontSize:16, fontWeight:700, letterSpacing:"-0.01em", marginBottom:2 }}>{d.addr}</div>
              <div style={{ fontSize:13, color:T.textSecondary, display:"flex", alignItems:"center", gap:5, flexWrap:"wrap" }}>
                <span>{d.city} · {d.beds}bd/{d.baths}ba</span>
                <span>· {d.seller}</span>
                {d.verified && <VerifiedBadge size={10}/>}
              </div>
            </div>
          </div>
          <div style={{ background:T.surface, borderRadius:10, padding:12, display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14 }}>
            {[["ARV",d.arv,T.brand],["Asking",d.ask,T.text],["ROI",d.roi,T.brand]].map(([k,v,c])=>(
              <div key={k}>
                <div style={{ fontSize:11, color:T.textMuted, marginBottom:2, fontWeight:500 }}>{k}</div>
                <div style={{ fontSize:16, fontWeight:800, color:c, letterSpacing:"-0.01em" }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {showPost && (
        <div onClick={()=>setShowPost(false)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:600, display:"flex", alignItems:"center", justifyContent:"center", padding:20, animation:"fadeIn .2s ease" }}>
          <div onClick={e=>e.stopPropagation()} style={{ background:T.bg, borderRadius:16, width:"100%", maxWidth:460, boxShadow:T.shadowLg }}>
            <div style={{ padding:"22px 22px 0", display:"flex", justifyContent:"space-between" }}>
              <div>
                <div style={{ fontSize:20, fontWeight:800, letterSpacing:"-0.02em", marginBottom:4 }}>Post a deal</div>
                <div style={{ fontSize:13, color:T.textSecondary }}>Free · 1.5% fee at close</div>
              </div>
              <button onClick={()=>setShowPost(false)} style={{ background:T.surface, border:"none", width:30, height:30, borderRadius:"50%", cursor:"pointer", color:T.textSecondary, fontSize:17 }}>✕</button>
            </div>
            <div style={{ padding:"18px 22px 22px" }}>
              {[
                { key:"addr", label:"Property address", ph:"789 Oak Grove Blvd" },
                { key:"city", label:"City, State",      ph:"Sacramento, CA" },
                { key:"arv",  label:"ARV",              ph:"$420K" },
                { key:"ask",  label:"Asking",           ph:"$228K" },
              ].map(f=>(
                <div key={f.key} style={{ marginBottom:12 }}>
                  <label style={{ fontSize:11, color:T.textMuted, fontWeight:700, letterSpacing:"0.03em", marginBottom:6, display:"block", textTransform:"uppercase" }}>{f.label}</label>
                  <input value={postData[f.key]} onChange={e=>setPostData(p=>({...p,[f.key]:e.target.value}))} placeholder={f.ph}
                    className="input-focus"
                    style={{ width:"100%", background:T.surface, border:`1px solid ${T.border}`, borderRadius:10, padding:"11px 13px", fontSize:14, outline:"none", fontFamily:T.font, boxSizing:"border-box" }}/>
                </div>
              ))}
              <div style={{ marginBottom:16 }}>
                <label style={{ fontSize:11, color:T.textMuted, fontWeight:700, letterSpacing:"0.03em", marginBottom:6, display:"block", textTransform:"uppercase" }}>Type</label>
                <div style={{ display:"flex", gap:6 }}>
                  {["Wholesale","Fix & Flip"].map(t=>(
                    <button key={t} onClick={()=>setPostData(p=>({...p,type:t}))} style={{
                      flex:1, padding:"10px", borderRadius:10, fontSize:13, fontWeight:600, cursor:"pointer",
                      border: postData.type===t ? `2px solid ${T.brand}` : `1px solid ${T.border}`,
                      background: postData.type===t ? T.brandLight : T.bg,
                      color: postData.type===t ? T.brand : T.text, fontFamily:T.font
                    }}>{t}</button>
                  ))}
                </div>
              </div>
              <button onClick={postDeal} className="btn-primary" style={{ width:"100%", background:T.brand, border:"none", color:"#fff", padding:"12px", borderRadius:10, fontSize:14, fontWeight:700, cursor:"pointer" }}>Post deal</button>
            </div>
          </div>
        </div>
      )}

      {openDeal && (
        <div onClick={()=>setOpenDeal(null)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:600, display:"flex", alignItems:"flex-end", justifyContent:"center", animation:"fadeIn .2s ease" }}>
          <div onClick={e=>e.stopPropagation()} style={{ background:T.bg, borderRadius:"16px 16px 0 0", width:"100%", maxWidth:560, maxHeight:"90vh", overflow:"auto", boxShadow:T.shadowLg, animation:"slideUp .25s ease" }}>
            <div style={{ padding:"22px 22px 0", display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:"flex", gap:6, alignItems:"center", marginBottom:8, flexWrap:"wrap" }}>
                  <span style={{ fontSize:11, fontWeight:700, color: openDeal.type==="Wholesale"?T.gold:T.brand, background: openDeal.type==="Wholesale"?"#fef6e0":T.brandLight, padding:"3px 9px", borderRadius:6 }}>{openDeal.type}</span>
                  <DealScoreBadge score={openDeal.score}/>
                </div>
                <div style={{ fontSize:22, fontWeight:800, letterSpacing:"-0.02em" }}>{openDeal.addr}</div>
                <div style={{ fontSize:14, color:T.textSecondary, display:"flex", alignItems:"center", gap:5 }}>
                  {openDeal.city} · {openDeal.beds}bd/{openDeal.baths}ba · {openDeal.seller}
                  {openDeal.verified && <VerifiedBadge size={11}/>}
                </div>
              </div>
              <button onClick={()=>setOpenDeal(null)} style={{ background:T.surface, border:"none", width:30, height:30, borderRadius:"50%", cursor:"pointer", color:T.textSecondary, fontSize:17, flexShrink:0, marginLeft:10 }}>✕</button>
            </div>
            <div style={{ padding:"18px 22px 22px" }}>
              <div style={{ background:`linear-gradient(135deg, ${T.brandLight}, ${T.bg})`, border:`1px solid ${T.brand}33`, borderRadius:12, padding:16, marginBottom:14 }}>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14 }}>
                  {[["ARV",openDeal.arv,T.brand],["Asking",openDeal.ask,T.text],["ROI",openDeal.roi,T.brand]].map(([k,v,c])=>(
                    <div key={k}>
                      <div style={{ fontSize:11, color:T.textMuted, marginBottom:2, fontWeight:500 }}>{k}</div>
                      <div style={{ fontSize:18, fontWeight:800, color:c, letterSpacing:"-0.02em" }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:10 }}>
                <button className="btn-primary" style={{ background:T.brand, border:"none", color:"#fff", padding:"13px", borderRadius:10, fontSize:14, fontWeight:700, cursor:"pointer" }}>Add to pipeline</button>
                <button style={{ background:T.surface, border:`1px solid ${T.border}`, color:T.text, padding:"13px", borderRadius:10, fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:T.font }}>Save</button>
              </div>
              <button style={{ width:"100%", background:T.surface, border:`1px solid ${T.border}`, color:T.text, padding:"13px", borderRadius:10, fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:T.font }}>Message seller</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════
// ALERTS TAB
// ═════════════════════════════════════════════════════════════════
function AlertsTab({ alerts, setAlerts }) {
  const [newAlert, setNewAlert] = useState({ location:"", minROI:"", maxPrice:"" });
  const [showAdd, setShowAdd]   = useState(false);

  function createAlert() {
    const criteria = `${newAlert.location || "Any"} · ROI ${newAlert.minROI ? ">"+newAlert.minROI+"%" : "any"}${newAlert.maxPrice ? " · Under $"+newAlert.maxPrice+"K" : ""}`;
    setAlerts(a => [...a, { criteria, active: true }]);
    setNewAlert({ location:"", minROI:"", maxPrice:"" });
    setShowAdd(false);
  }
  function toggleAlert(i) { setAlerts(a => a.map((x,j) => j===i ? { ...x, active: !x.active } : x)); }
  function deleteAlert(i) { setAlerts(a => a.filter((_,j) => j!==i)); }

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
        <div>
          <div style={{ fontSize:17, fontWeight:800, letterSpacing:"-0.01em" }}>Deal alerts</div>
          <div style={{ fontSize:13, color:T.textSecondary }}>Get notified when matching deals drop. First to claim wins.</div>
        </div>
        <button onClick={()=>setShowAdd(true)} className="btn-primary" style={{ background:T.brand, border:"none", color:"#fff", padding:"9px 16px", borderRadius:8, fontSize:13, fontWeight:600, cursor:"pointer" }}>+ New alert</button>
      </div>

      {alerts.map((a,i)=>(
        <div key={i} className="card-hover" style={{ background:T.bg, border:`1px solid ${T.border}`, borderRadius:12, padding:16, marginBottom:10, display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ fontSize:20 }}>{a.active ? "🔔" : "🔕"}</div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:14, fontWeight:600, marginBottom:2 }}>{a.criteria}</div>
            <div style={{ fontSize:12, color: a.active ? T.brand : T.textMuted }}>{a.active ? "Active · First match wins" : "Paused"}</div>
          </div>
          <button onClick={()=>toggleAlert(i)} style={{ background:T.surface, border:`1px solid ${T.border}`, color:T.text, padding:"6px 12px", borderRadius:7, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:T.font }}>{a.active ? "Pause" : "Resume"}</button>
          <button onClick={()=>deleteAlert(i)} style={{ background:"transparent", border:"none", color:T.red, fontSize:16, cursor:"pointer", padding:4 }}>🗑</button>
        </div>
      ))}

      {alerts.length === 0 && (
        <div style={{ background:T.bg, border:`1px dashed ${T.border}`, borderRadius:14, padding:36, textAlign:"center", color:T.textMuted }}>
          <div style={{ fontSize:32, marginBottom:8 }}>🔔</div>
          <div style={{ fontSize:14 }}>No alerts yet. Create your first one to never miss a deal.</div>
        </div>
      )}

      {showAdd && (
        <div onClick={()=>setShowAdd(false)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:600, display:"flex", alignItems:"center", justifyContent:"center", padding:20, animation:"fadeIn .2s ease" }}>
          <div onClick={e=>e.stopPropagation()} style={{ background:T.bg, borderRadius:16, width:"100%", maxWidth:420, boxShadow:T.shadowLg }}>
            <div style={{ padding:"22px 22px 0", display:"flex", justifyContent:"space-between" }}>
              <div>
                <div style={{ fontSize:20, fontWeight:800, letterSpacing:"-0.02em", marginBottom:4 }}>New deal alert</div>
                <div style={{ fontSize:13, color:T.textSecondary }}>First to claim wins.</div>
              </div>
              <button onClick={()=>setShowAdd(false)} style={{ background:T.surface, border:"none", width:30, height:30, borderRadius:"50%", cursor:"pointer", color:T.textSecondary, fontSize:17 }}>✕</button>
            </div>
            <div style={{ padding:"16px 22px 22px" }}>
              {[
                { key:"location", label:"Location",        ph:"Sacramento" },
                { key:"minROI",   label:"Min ROI %",       ph:"25" },
                { key:"maxPrice", label:"Max price ($K)",  ph:"500" },
              ].map(f=>(
                <div key={f.key} style={{ marginBottom:12 }}>
                  <label style={{ fontSize:11, color:T.textMuted, fontWeight:700, letterSpacing:"0.03em", marginBottom:6, display:"block", textTransform:"uppercase" }}>{f.label}</label>
                  <input value={newAlert[f.key]} onChange={e=>setNewAlert(n=>({...n,[f.key]:e.target.value}))} placeholder={f.ph}
                    className="input-focus"
                    style={{ width:"100%", background:T.surface, border:`1px solid ${T.border}`, borderRadius:10, padding:"11px 13px", fontSize:14, outline:"none", fontFamily:T.font, boxSizing:"border-box" }}/>
                </div>
              ))}
              <button onClick={createAlert} className="btn-primary" style={{ width:"100%", background:T.brand, border:"none", color:"#fff", padding:"12px", borderRadius:10, fontSize:14, fontWeight:700, cursor:"pointer", marginTop:4 }}>Create alert</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════
// CONTRACTOR LEADS
// ═════════════════════════════════════════════════════════════════
function ContractorLeads() {
  const [quoted, setQuoted] = useState({});
  const [quoting, setQuoting] = useState(null);
  const [amt, setAmt] = useState("");

  const leads = [
    { id:"j1", addr:"1842 Maple St",     trade:"Full rehab",    budget:"$55–70K", scope:"Kitchen, 2 baths, flooring, paint. Vacant, immediate.", flipper:"T. Williams", rating:4.8, time:"2h", urgent:true,  verified:true },
    { id:"j2", addr:"4205 Sunridge Dr",  trade:"Cosmetic flip", budget:"$38–48K", scope:"Kitchen, 2 baths, flooring, exterior paint.",           flipper:"J. Park",     rating:5.0, time:"5h", urgent:false, verified:true },
    { id:"j3", addr:"533 Valley Oak Dr", trade:"Flooring",      budget:"$8–12K",  scope:"LVP throughout ~1,400 sqft.",                           flipper:"K. Garcia",   rating:4.9, time:"3h", urgent:true,  verified:false },
  ];

  if (quoting) {
    return (
      <div>
        <button onClick={()=>setQuoting(null)} style={{ background:"transparent", border:"none", color:T.textSecondary, fontSize:13, fontWeight:600, cursor:"pointer", marginBottom:10, padding:0, fontFamily:T.font }}>← Back</button>
        <div style={{ background:T.bg, border:`1px solid ${T.border}`, borderRadius:14, padding:20 }}>
          <div style={{ fontSize:16, fontWeight:800, letterSpacing:"-0.01em", marginBottom:4 }}>Send quote · {quoting.addr}</div>
          <div style={{ fontSize:13, color:T.textSecondary, marginBottom:16 }}>{quoting.scope}</div>
          <div style={{ marginBottom:12 }}>
            <label style={{ fontSize:12, color:T.textMuted, fontWeight:600, marginBottom:6, display:"block" }}>YOUR QUOTE ($)</label>
            <input value={amt} onChange={e=>setAmt(e.target.value.replace(/[^0-9]/g,""))} placeholder="62000"
              className="input-focus"
              style={{ width:"100%", background:T.surface, border:`1px solid ${T.border}`, borderRadius:10, padding:"14px 16px", fontSize:20, fontWeight:700, outline:"none", color:T.brand, fontFamily:T.font, boxSizing:"border-box" }}/>
          </div>
          <div style={{ marginBottom:14 }}>
            <label style={{ fontSize:12, color:T.textMuted, fontWeight:600, marginBottom:6, display:"block" }}>NOTES</label>
            <textarea placeholder="Timeline, what's included…" rows={3}
              className="input-focus"
              style={{ width:"100%", background:T.surface, border:`1px solid ${T.border}`, borderRadius:10, padding:"10px 14px", fontSize:14, outline:"none", resize:"none", fontFamily:T.font, boxSizing:"border-box" }}/>
          </div>
          <button onClick={()=>{setQuoted(q=>({...q,[quoting.id]:true}));setQuoting(null);setAmt("");}} className="btn-primary" style={{ width:"100%", background:T.brand, border:"none", color:"#fff", padding:"13px", borderRadius:10, fontSize:15, fontWeight:700, cursor:"pointer" }}>Send quote</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontSize:17, fontWeight:800, letterSpacing:"-0.01em", marginBottom:4 }}>Job leads near you</div>
      <div style={{ fontSize:13, color:T.textSecondary, marginBottom:16 }}>Matched to your trades</div>
      {leads.map(l=>(
        <div key={l.id} className="card-hover" style={{ background:T.bg, border: l.urgent?`2px solid ${T.brand}`:`1px solid ${T.border}`, borderRadius:14, padding:16, marginBottom:10, position:"relative" }}>
          {l.urgent && <div style={{ position:"absolute", top:-9, left:14, background:T.brand, color:"#fff", fontSize:10, fontWeight:700, padding:"3px 10px", borderRadius:100, letterSpacing:"0.04em" }}>🔥 URGENT</div>}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
            <div>
              <div style={{ fontSize:16, fontWeight:700, letterSpacing:"-0.01em" }}>{l.addr}</div>
              <div style={{ fontSize:12, color:T.textSecondary }}>{l.trade} · {l.time} ago</div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:15, fontWeight:800, color:T.brand, letterSpacing:"-0.01em" }}>{l.budget}</div>
              <div style={{ fontSize:10, color:T.textMuted }}>budget</div>
            </div>
          </div>
          <div style={{ background:T.surface, borderRadius:8, padding:"9px 12px", marginBottom:10, fontSize:12, color:T.text, lineHeight:1.5 }}>{l.scope}</div>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10, fontSize:12, color:T.textSecondary }}>
            <span style={{ display:"flex", alignItems:"center", gap:5 }}>
              Flipper: <strong style={{ color:T.text }}>{l.flipper}</strong>
              {l.verified && <VerifiedBadge size={10}/>}
            </span>
            <span>⭐ {l.rating}</span>
          </div>
          {quoted[l.id]
            ? <div style={{ background:T.brandLight, color:T.brand, padding:"10px", borderRadius:8, textAlign:"center", fontSize:13, fontWeight:700 }}>✓ Quote sent</div>
            : <button onClick={()=>setQuoting(l)} className="btn-primary" style={{ width:"100%", background:T.brand, border:"none", color:"#fff", padding:"11px", borderRadius:8, fontSize:14, fontWeight:700, cursor:"pointer" }}>Send quote</button>
          }
        </div>
      ))}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════
// REALTOR REFERRALS
// ═════════════════════════════════════════════════════════════════
function RealtorReferrals() {
  const [openRef, setOpenRef] = useState(null);
  const refs = [
    { flipper:"J. Martinez", verified:true, addr:"1842 Maple St", price:385, beds:3, baths:2, sqft:1450, status:"Ready to list", days:2, note:"Property completed. Photos done. Wants to go live ASAP.",  urgency:"high" },
    { flipper:"T. Williams", verified:true, addr:"3421 Poplar Ave", price:420, beds:4, baths:2, sqft:1750, status:"Renovating", days:14, note:"Full rehab underway. ETA 3 weeks.", urgency:"medium" },
    { flipper:"S. Park",     verified:false, addr:"789 Oak Grove",   price:420, beds:3, baths:2, sqft:1350, status:"Ready to list", days:1, note:"Just completed. Motivated seller.", urgency:"high" },
  ];

  return (
    <div>
      <div style={{ fontSize:17, fontWeight:800, letterSpacing:"-0.01em", marginBottom:14 }}>Flipper referrals</div>
      {refs.map((r,i)=>{
        const urgColor = r.urgency==="high" ? T.brand : r.urgency==="medium" ? "#ca8a04" : T.textMuted;
        return (
          <div key={i} onClick={()=>setOpenRef(r)} className="card-hover" style={{ background:T.bg, border:`1px solid ${T.border}`, borderLeft:`4px solid ${urgColor}`, borderRadius:12, padding:16, marginBottom:10, cursor:"pointer" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
              <div>
                <div style={{ fontSize:16, fontWeight:700, letterSpacing:"-0.01em" }}>{r.addr}</div>
                <div style={{ fontSize:12, color:T.textSecondary, marginTop:2, display:"flex", alignItems:"center", gap:5 }}>
                  {r.beds}bd/{r.baths}ba · {r.sqft} sqft · {r.flipper}
                  {r.verified && <VerifiedBadge size={10}/>}
                </div>
              </div>
              <span style={{ fontSize:11, fontWeight:700, color:urgColor, background:urgColor+"15", padding:"3px 10px", borderRadius:100, whiteSpace:"nowrap" }}>{r.status}</span>
            </div>
            <div style={{ display:"flex", gap:16 }}>
              <div>
                <div style={{ fontSize:11, color:T.textMuted, fontWeight:500 }}>Target list</div>
                <div style={{ fontSize:16, fontWeight:800, color:T.brand, letterSpacing:"-0.01em" }}>${r.price}K</div>
              </div>
              <div>
                <div style={{ fontSize:11, color:T.textMuted, fontWeight:500 }}>Your net (75%)</div>
                <div style={{ fontSize:16, fontWeight:800, letterSpacing:"-0.01em" }}>${Math.round(r.price*25*0.75).toLocaleString()}</div>
              </div>
            </div>
          </div>
        );
      })}

      {openRef && (
        <div onClick={()=>setOpenRef(null)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:600, display:"flex", alignItems:"flex-end", justifyContent:"center", animation:"fadeIn .2s ease" }}>
          <div onClick={e=>e.stopPropagation()} style={{ background:T.bg, borderRadius:"16px 16px 0 0", width:"100%", maxWidth:520, maxHeight:"90vh", overflow:"auto", boxShadow:T.shadowLg, animation:"slideUp .25s ease" }}>
            <div style={{ padding:"22px 22px 0", display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
              <div>
                <div style={{ fontSize:11, fontWeight:700, color:T.brand, letterSpacing:"0.05em", textTransform:"uppercase", marginBottom:4 }}>{openRef.status}</div>
                <div style={{ fontSize:22, fontWeight:800, letterSpacing:"-0.02em" }}>{openRef.addr}</div>
                <div style={{ fontSize:14, color:T.textSecondary }}>{openRef.beds}bd/{openRef.baths}ba · {openRef.sqft} sqft</div>
              </div>
              <button onClick={()=>setOpenRef(null)} style={{ background:T.surface, border:"none", width:30, height:30, borderRadius:"50%", cursor:"pointer", color:T.textSecondary, fontSize:17 }}>✕</button>
            </div>
            <div style={{ padding:"18px 22px 22px" }}>
              <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:12, padding:14, marginBottom:14 }}>
                <div style={{ fontSize:13, fontWeight:700, marginBottom:8, display:"flex", alignItems:"center", gap:5 }}>
                  Flipper: {openRef.flipper}
                  {openRef.verified && <VerifiedBadge size={11}/>}
                </div>
                <div style={{ fontSize:13, color:T.textSecondary, lineHeight:1.5 }}>{openRef.note}</div>
              </div>
              <div style={{ background:`linear-gradient(135deg, ${T.brandLight}, ${T.bg})`, border:`1px solid ${T.brand}33`, borderRadius:12, padding:16, marginBottom:14 }}>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                  <div>
                    <div style={{ fontSize:11, color:T.textMuted, fontWeight:500 }}>Target list</div>
                    <div style={{ fontSize:22, fontWeight:800, color:T.brand, letterSpacing:"-0.02em" }}>${openRef.price}K</div>
                  </div>
                  <div>
                    <div style={{ fontSize:11, color:T.textMuted, fontWeight:500 }}>Your net (75%)</div>
                    <div style={{ fontSize:22, fontWeight:800, letterSpacing:"-0.02em" }}>${Math.round(openRef.price*25*0.75).toLocaleString()}</div>
                  </div>
                </div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:8 }}>
                <button className="btn-primary" style={{ background:T.brand, border:"none", color:"#fff", padding:"13px", borderRadius:10, fontSize:14, fontWeight:700, cursor:"pointer" }}>📞 Call</button>
                <button style={{ background:T.surface, border:`1px solid ${T.border}`, color:T.text, padding:"13px", borderRadius:10, fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:T.font }}>✉️ Message</button>
              </div>
              <button style={{ width:"100%", background:T.surface, border:`1px solid ${T.border}`, color:T.text, padding:"13px", borderRadius:10, fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:T.font }}>Generate CMA</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════
// PROFILE EDITOR
// ═════════════════════════════════════════════════════════════════
function ProfileEditor({ user, setUser, role, onVerify, onUpgrade }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(user);
  const [saved, setSaved] = useState(false);

  const roleFields = {
    dealmaker: [
      { key:"markets", label:"Markets you work", placeholder:"Sacramento, Stockton" },
      { key:"budget",  label:"Deal range",        placeholder:"$100K–$500K" },
    ],
    contractor: [
      { key:"trades",  label:"Your trades",       placeholder:"General, Kitchen & Bath" },
      { key:"license", label:"License #",          placeholder:"CA #123456" },
      { key:"service", label:"Service area",       placeholder:"Sacramento County" },
    ],
    realtor: [
      { key:"license",  label:"DRE License",       placeholder:"CA DRE #01234567" },
      { key:"brokerage",label:"Brokerage",          placeholder:"Keller Williams" },
      { key:"service",  label:"Service area",       placeholder:"Sacramento, Roseville" },
    ],
  };

  function startEdit() { setDraft({ ...user }); setEditing(true); setSaved(false); }
  function save() { setUser({ ...draft }); setEditing(false); setSaved(true); setTimeout(()=>setSaved(false), 2000); }
  function cancel() { setDraft({ ...user }); setEditing(false); }

  const initials = (user?.name || "You").split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase() || "Y";

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
        <div style={{ fontSize:17, fontWeight:800, letterSpacing:"-0.01em" }}>My profile</div>
        {!editing ? (
          <button onClick={startEdit} className="btn-primary" style={{ background:T.brand, border:"none", color:"#fff", padding:"8px 16px", borderRadius:8, fontSize:13, fontWeight:600, cursor:"pointer" }}>Edit</button>
        ) : (
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={cancel} style={{ background:T.surface, border:`1px solid ${T.border}`, color:T.text, padding:"8px 14px", borderRadius:8, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:T.font }}>Cancel</button>
            <button onClick={save} className="btn-primary" style={{ background:T.brand, border:"none", color:"#fff", padding:"8px 16px", borderRadius:8, fontSize:13, fontWeight:600, cursor:"pointer" }}>Save</button>
          </div>
        )}
      </div>

      {saved && <div style={{ background:T.brandLight, border:`1px solid ${T.brand}`, color:T.brand, padding:"10px 14px", borderRadius:10, fontSize:13, fontWeight:600, marginBottom:12 }}>✓ Profile saved</div>}

      <div style={{ background:T.bg, border:`1px solid ${T.border}`, borderRadius:14, padding:20, marginBottom:12 }}>
        <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:20 }}>
          <div style={{ width:64, height:64, borderRadius:"50%", background:T.brand, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, fontWeight:700 }}>{initials}</div>
          <div style={{ flex:1 }}>
            <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:2 }}>
              <div style={{ fontSize:18, fontWeight:800, letterSpacing:"-0.01em" }}>{user.name || "Your name"}</div>
              {user.verified && <VerifiedBadge size={13}/>}
            </div>
            <div style={{ fontSize:13, color:T.textSecondary }}>{user.email || "your@email.com"}</div>
          </div>
        </div>

        {!user.pro && onUpgrade && (
          <div onClick={onUpgrade} className="card-hover" style={{ background:`linear-gradient(135deg, ${T.brandLight}, ${T.bg})`, border:`1px solid ${T.brand}33`, borderRadius:12, padding:14, marginBottom:10, cursor:"pointer", display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:36, height:36, borderRadius:"50%", background:T.brand, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, fontWeight:800 }}>⭐</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:700 }}>Upgrade to Pro</div>
              <div style={{ fontSize:12, color:T.textSecondary }}>$125/mo · Unlimited Dialer + Analyzer</div>
            </div>
            <span style={{ fontSize:18, color:T.textMuted }}>›</span>
          </div>
        )}

        {user.pro && (
          <div style={{ background:`linear-gradient(135deg, ${T.brandLight}, ${T.bg})`, border:`1px solid ${T.brand}33`, borderRadius:12, padding:14, marginBottom:10, display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:36, height:36, borderRadius:"50%", background:T.brand, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, fontWeight:800 }}>⭐</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:700, color:T.brand }}>Pro · Active</div>
              <div style={{ fontSize:12, color:T.textSecondary }}>Renews monthly · $125/mo</div>
            </div>
            <span style={{ fontSize:11, fontWeight:700, color:T.brand, background:T.bg, padding:"3px 9px", borderRadius:100, border:`1px solid ${T.brand}44` }}>ACTIVE</span>
          </div>
        )}

        {!user.verified && onVerify && (
          <div onClick={onVerify} className="card-hover" style={{ background:T.blueLight, border:`1px solid ${T.blue}33`, borderRadius:12, padding:14, marginBottom:16, cursor:"pointer", display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:36, height:36, borderRadius:"50%", background:T.blue, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, fontWeight:800 }}>✓</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13, fontWeight:700 }}>Get Verified Pro</div>
              <div style={{ fontSize:12, color:T.textSecondary }}>$99 · Priority leads + blue checkmark</div>
            </div>
            <span style={{ fontSize:18, color:T.textMuted }}>›</span>
          </div>
        )}

        {[
          { key:"name",     label:"Full name", placeholder:"Daniel Parks" },
          { key:"email",    label:"Email",      placeholder:"you@email.com" },
          { key:"phone",    label:"Phone",      placeholder:"(555) 000-0000" },
          { key:"location", label:"Location",   placeholder:"Sacramento, CA" },
          { key:"bio",      label:"Bio",        placeholder:"Tell others about yourself…", textarea:true },
          ...(roleFields[role] || []),
        ].map(field => (
          <div key={field.key} style={{ marginBottom:14 }}>
            <label style={{ fontSize:11, color:T.textMuted, fontWeight:700, marginBottom:6, display:"block", textTransform:"uppercase", letterSpacing:"0.03em" }}>{field.label}</label>
            {editing ? (
              field.textarea ? (
                <textarea value={draft[field.key]||""} onChange={e=>setDraft(d=>({...d,[field.key]:e.target.value}))} placeholder={field.placeholder} rows={2}
                  className="input-focus"
                  style={{ width:"100%", background:T.surface, border:`1px solid ${T.border}`, borderRadius:10, padding:"11px 13px", fontSize:14, outline:"none", resize:"vertical", fontFamily:T.font, boxSizing:"border-box" }}/>
              ) : (
                <input value={draft[field.key]||""} onChange={e=>setDraft(d=>({...d,[field.key]:e.target.value}))} placeholder={field.placeholder}
                  className="input-focus"
                  style={{ width:"100%", background:T.surface, border:`1px solid ${T.border}`, borderRadius:10, padding:"11px 13px", fontSize:14, outline:"none", fontFamily:T.font, boxSizing:"border-box" }}/>
              )
            ) : (
              <div style={{ fontSize:14, color: user[field.key] ? T.text : T.textMuted, padding:"6px 0" }}>
                {user[field.key] || <em style={{ color:T.textMuted }}>Not set</em>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════
// MODALS
// ═════════════════════════════════════════════════════════════════
function CreditsModal({ onClose, onBuy }) {
  const packs = [
    { n:50,  p:29,  label:"Starter", each:"$0.58/credit", best:false },
    { n:100, p:49,  label:"Popular", each:"$0.49/credit", best:true  },
    { n:500, p:199, label:"Pro",     each:"$0.40/credit", best:false },
  ];
  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:700, display:"flex", alignItems:"center", justifyContent:"center", padding:20, animation:"fadeIn .2s ease" }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:T.bg, borderRadius:16, width:"100%", maxWidth:460, boxShadow:T.shadowLg }}>
        <div style={{ padding:"22px 22px 0", display:"flex", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontSize:20, fontWeight:800, letterSpacing:"-0.02em", marginBottom:4 }}>Top up credits</div>
            <div style={{ fontSize:13, color:T.textSecondary }}>For analysis, calls, and contracts</div>
          </div>
          <button onClick={onClose} style={{ background:T.surface, border:"none", width:30, height:30, borderRadius:"50%", cursor:"pointer", color:T.textSecondary, fontSize:17 }}>✕</button>
        </div>
        <div style={{ padding:"18px 22px 22px" }}>
          {packs.map(p => (
            <div key={p.n} onClick={()=>onBuy(p.n)} style={{
              background: p.best ? T.brandLight : T.surface,
              border: p.best ? `2px solid ${T.brand}` : `1px solid ${T.border}`,
              borderRadius:12, padding:16, marginBottom:10, cursor:"pointer", position:"relative"
            }}>
              {p.best && <div style={{ position:"absolute", top:-9, left:14, background:T.brand, color:"#fff", fontSize:10, fontWeight:700, padding:"3px 10px", borderRadius:100 }}>BEST VALUE</div>}
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div>
                  <div style={{ fontSize:14, fontWeight:700, color:T.brand, marginBottom:2 }}>{p.label}</div>
                  <div style={{ fontSize:22, fontWeight:800, letterSpacing:"-0.02em" }}>{p.n} credits</div>
                  <div style={{ fontSize:12, color:T.textSecondary, marginTop:2 }}>{p.each}</div>
                </div>
                <div style={{ fontSize:24, fontWeight:800, color:T.brand, letterSpacing:"-0.02em" }}>${p.p}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function VerifyModal({ onClose, onVerify, role }) {
  const requirements = role === "contractor"
    ? ["Contractor license (CA C-10, B, etc)","Insurance proof","Background check","$99 one-time fee"]
    : role === "realtor"
    ? ["Valid DRE license","Active brokerage","Background check","$99 one-time fee"]
    : ["Completed profile","Identity verification","$99 one-time fee"];

  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:700, display:"flex", alignItems:"center", justifyContent:"center", padding:20, animation:"fadeIn .2s ease" }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:T.bg, borderRadius:16, width:"100%", maxWidth:440, overflow:"hidden", boxShadow:T.shadowLg }}>
        <div style={{ background:`linear-gradient(135deg, ${T.blueLight}, ${T.bg})`, padding:"26px 26px 20px", borderBottom:`1px solid ${T.border}` }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
            <div style={{ width:48, height:48, borderRadius:"50%", background:T.blue, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, fontWeight:800 }}>✓</div>
            <button onClick={onClose} style={{ background:"#ffffff88", border:"none", width:30, height:30, borderRadius:"50%", cursor:"pointer", color:T.textSecondary, fontSize:17 }}>✕</button>
          </div>
          <div style={{ fontSize:22, fontWeight:800, letterSpacing:"-0.02em", marginBottom:4 }}>Get Verified Pro</div>
          <div style={{ fontSize:14, color:T.textSecondary }}>Stand out. Priority placement. More deals.</div>
        </div>
        <div style={{ padding:"20px 26px 26px" }}>
          <div style={{ fontSize:13, fontWeight:700, color:T.textMuted, letterSpacing:"0.03em", textTransform:"uppercase", marginBottom:10 }}>What you get</div>
          {["Blue checkmark on your profile","Priority placement in feeds","Higher-quality lead matches","Verified Pro badge on listings"].map((b,i)=>(
            <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"7px 0" }}>
              <div style={{ width:18, height:18, borderRadius:"50%", background:T.brandLight, color:T.brand, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:800 }}>✓</div>
              <span style={{ fontSize:14 }}>{b}</span>
            </div>
          ))}
          <div style={{ background:T.surface, borderRadius:10, padding:14, marginTop:14, marginBottom:16 }}>
            <div style={{ fontSize:12, fontWeight:700, color:T.textMuted, letterSpacing:"0.03em", textTransform:"uppercase", marginBottom:8 }}>Requirements</div>
            {requirements.map((r,i)=>(
              <div key={i} style={{ fontSize:13, color:T.textSecondary, padding:"3px 0" }}>• {r}</div>
            ))}
          </div>
          <button onClick={onVerify} className="btn-primary" style={{ width:"100%", background:T.blue, border:"none", color:"#fff", padding:"13px", borderRadius:10, fontSize:15, fontWeight:700, cursor:"pointer", marginBottom:8 }}>Start verification · $99</button>
          <button onClick={onClose} style={{ width:"100%", background:"transparent", border:`1px solid ${T.border}`, color:T.textSecondary, padding:"11px", borderRadius:10, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:T.font }}>Maybe later</button>
        </div>
      </div>
    </div>
  );
}

function ReferralModal({ onClose }) {
  const [copied, setCopied] = useState(false);
  const link = "dealbank.io/r/d4p2";
  function copy() {
    if (navigator.clipboard) navigator.clipboard.writeText(link).catch(()=>{});
    setCopied(true);
    setTimeout(()=>setCopied(false), 1500);
  }
  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:700, display:"flex", alignItems:"center", justifyContent:"center", padding:20, animation:"fadeIn .2s ease" }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:T.bg, borderRadius:16, width:"100%", maxWidth:440, overflow:"hidden", boxShadow:T.shadowLg }}>
        <div style={{ background:`linear-gradient(135deg, ${T.brandLight}, ${T.bg})`, padding:"26px 26px 20px", borderBottom:`1px solid ${T.border}` }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
            <div style={{ fontSize:36 }}>🎁</div>
            <button onClick={onClose} style={{ background:"#ffffff88", border:"none", width:30, height:30, borderRadius:"50%", cursor:"pointer", color:T.textSecondary, fontSize:17 }}>✕</button>
          </div>
          <div style={{ fontSize:22, fontWeight:800, letterSpacing:"-0.02em", marginBottom:4 }}>Earn 100 credits per friend</div>
          <div style={{ fontSize:14, color:T.textSecondary }}>Invite a dealmaker, contractor, or realtor.</div>
        </div>
        <div style={{ padding:"20px 26px 26px" }}>
          <div style={{ fontSize:12, fontWeight:700, color:T.textMuted, letterSpacing:"0.03em", textTransform:"uppercase", marginBottom:8 }}>Your link</div>
          <div style={{ display:"flex", gap:8, marginBottom:20 }}>
            <div style={{ flex:1, background:T.surface, border:`1px solid ${T.border}`, borderRadius:10, padding:"12px 14px", fontSize:14, color:T.text, fontFamily:"monospace", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{link}</div>
            <button onClick={copy} className="btn-primary" style={{ background:T.brand, border:"none", color:"#fff", padding:"0 18px", borderRadius:10, fontSize:13, fontWeight:700, cursor:"pointer" }}>{copied ? "Copied!" : "Copy"}</button>
          </div>
          <div style={{ background:T.surface, borderRadius:12, padding:14, marginBottom:14 }}>
            <div style={{ fontSize:12, fontWeight:700, color:T.textMuted, letterSpacing:"0.03em", textTransform:"uppercase", marginBottom:10 }}>Your rewards</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
              {[["Invited","3"],["Joined","1"],["Earned","100"]].map(([k,v])=>(
                <div key={k}>
                  <div style={{ fontSize:11, color:T.textMuted, fontWeight:500 }}>{k}</div>
                  <div style={{ fontSize:20, fontWeight:800, color:T.brand, letterSpacing:"-0.02em" }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
          <button onClick={onClose} style={{ width:"100%", background:T.surface, border:`1px solid ${T.border}`, color:T.text, padding:"11px", borderRadius:10, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:T.font }}>Done</button>
        </div>
      </div>
    </div>
  );
}

function AlertsModal({ onClose }) {
  const activity = [
    { icon:"🔥", title:"New deal match!", sub:"789 Oak Grove Blvd · Score 91", time:"2m ago", hot:true },
    { icon:"💰", title:"Deal closed",      sub:"534 Oak Blvd · +$61K profit",   time:"3h ago" },
    { icon:"📞", title:"Call answered",    sub:"R. Chen picked up on 2nd try",   time:"6h ago" },
    { icon:"✍️", title:"Contract signed",  sub:"1842 Maple St by T. Williams",   time:"1d ago" },
    { icon:"⭐", title:"New 5-star rating", sub:"From J. Park",                   time:"2d ago" },
  ];
  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:700, display:"flex", alignItems:"flex-start", justifyContent:"flex-end", animation:"fadeIn .2s ease" }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:T.bg, width:"100%", maxWidth:400, height:"100vh", overflow:"auto", boxShadow:T.shadowLg }}>
        <div style={{ padding:"22px 22px 0", display:"flex", justifyContent:"space-between", alignItems:"center", position:"sticky", top:0, background:T.bg, borderBottom:`1px solid ${T.border}`, paddingBottom:14 }}>
          <div style={{ fontSize:20, fontWeight:800, letterSpacing:"-0.02em" }}>Activity</div>
          <button onClick={onClose} style={{ background:T.surface, border:"none", width:30, height:30, borderRadius:"50%", cursor:"pointer", color:T.textSecondary, fontSize:17 }}>✕</button>
        </div>
        <div style={{ padding:"12px 0" }}>
          {activity.map((a,i)=>(
            <div key={i} style={{ display:"flex", gap:12, padding:"14px 22px", borderBottom:`1px solid ${T.borderLight}`, cursor:"pointer", background: a.hot ? T.brandLight+"66" : "transparent" }}>
              <div style={{ fontSize:22, width:28, flexShrink:0 }}>{a.icon}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:14, fontWeight:700, marginBottom:2 }}>{a.title}</div>
                <div style={{ fontSize:12, color:T.textSecondary }}>{a.sub}</div>
                <div style={{ fontSize:11, color:T.textMuted, marginTop:3 }}>{a.time}</div>
              </div>
              {a.hot && <span style={{ width:8, height:8, borderRadius:"50%", background:T.red, flexShrink:0, marginTop:6 }}/>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════
// DIALER PAYWALL — shown to non-Pro users
// ═════════════════════════════════════════════════════════════════
function DialerPaywall({ onUpgrade }) {
  return (
    <div>
      <div style={{ background:`linear-gradient(135deg, ${T.brandLight} 0%, ${T.bg} 100%)`, border:`2px solid ${T.brand}33`, borderRadius:16, padding:28, textAlign:"center", marginBottom:14 }}>
        <div style={{ fontSize:48, marginBottom:10 }}>📞</div>
        <div style={{ fontSize:24, fontWeight:800, letterSpacing:"-0.02em", marginBottom:6 }}>Unlock the Power Dialer</div>
        <div style={{ fontSize:15, color:T.textSecondary, marginBottom:22, maxWidth:420, margin:"0 auto 22px" }}>
          Build targeted lists, call motivated sellers, and convert leads into signed contracts — all in one place.
        </div>
        <div style={{ background:T.bg, border:`1px solid ${T.border}`, borderRadius:14, padding:20, marginBottom:16, textAlign:"left", maxWidth:380, margin:"0 auto 16px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:14 }}>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:T.brand, marginBottom:2 }}>PRO PLAN</div>
              <div style={{ display:"flex", alignItems:"baseline", gap:4 }}>
                <span style={{ fontSize:36, fontWeight:800, letterSpacing:"-0.03em" }}>$125</span>
                <span style={{ fontSize:14, color:T.textSecondary, fontWeight:500 }}>/month</span>
              </div>
            </div>
            <span style={{ fontSize:10, fontWeight:700, color:T.brand, background:T.brandLight, padding:"3px 8px", borderRadius:100, letterSpacing:"0.05em" }}>BEST VALUE</span>
          </div>
          {[
            "Unlimited Dialer calls",
            "Unlimited Deal Analyzer runs",
            "Targeted list building (any type)",
            "Priority placement in marketplace",
            "Full deal flow + eSign contracts",
          ].map((b,i)=>(
            <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"6px 0" }}>
              <div style={{ width:18, height:18, borderRadius:"50%", background:T.brandLight, color:T.brand, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:800 }}>✓</div>
              <span style={{ fontSize:13 }}>{b}</span>
            </div>
          ))}
        </div>
        <button onClick={onUpgrade} className="btn-primary" style={{ background:T.brand, border:"none", color:"#fff", padding:"14px 28px", borderRadius:10, fontSize:15, fontWeight:700, cursor:"pointer" }}>
          Upgrade to Pro — $125/mo
        </button>
        <div style={{ marginTop:12, fontSize:12, color:T.textMuted }}>Cancel anytime · Starts billing today</div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════
// DEAL FLOW WIZARD — 3 steps: Appt → Contract → Post to marketplace
// ═════════════════════════════════════════════════════════════════
function DealFlowWizard({ flow, setFlow, setMarketDeals, onDone }) {
  const [step, setStep] = useState(flow.signed ? (flow.listed ? 3 : 2) : 1);
  const [contractData, setContractData] = useState({
    price: flow.askingPrice || "",
    earnest: "500",
    closeDate: "",
    inspection: "7",
  });
  const [listingData, setListingData] = useState({
    arv: "",
    ask: "",
    assignmentFee: "15000",
    type: "Wholesale",
  });
  const [toast, setToast] = useState(null);

  function showToast(msg) { setToast(msg); setTimeout(()=>setToast(null), 2000); }

  function signContract() {
    if (!contractData.price.trim() || !contractData.closeDate.trim()) {
      showToast("Fill in price and close date");
      return;
    }
    setFlow(f => ({ ...f, signed:true, askingPrice: contractData.price }));
    setStep(2);
    showToast("✓ Contract signed with seller");
  }

  function postWholesale() {
    if (!listingData.arv.trim() || !listingData.ask.trim()) {
      showToast("Fill in ARV and asking price");
      return;
    }
    const newDeal = {
      id: "m" + Date.now(),
      addr: flow.address,
      city: "Sacramento, CA",
      arv: listingData.arv.startsWith("$") ? listingData.arv : `$${listingData.arv}`,
      ask: listingData.ask.startsWith("$") ? listingData.ask : `$${listingData.ask}`,
      roi: "—",
      type: listingData.type,
      hot: true,
      beds: 3,
      baths: 2,
      score: 82 + Math.floor(Math.random() * 12),
      seller: "You",
      verified: false,
      assignmentFee: `$${listingData.assignmentFee}`,
    };
    setMarketDeals(d => [newDeal, ...d]);
    setFlow(f => ({ ...f, listed: true }));
    setStep(3);
    showToast("✓ Listed on marketplace!");
  }

  const steps = [
    { n:1, label:"Sign contract",    icon:"✍️" },
    { n:2, label:"Post to market",   icon:"🏪" },
    { n:3, label:"Assigned",         icon:"🎉" },
  ];

  return (
    <div>
      {/* Progress bar */}
      <div style={{ background:T.bg, border:`1px solid ${T.border}`, borderRadius:14, padding:16, marginBottom:14 }}>
        <div style={{ fontSize:11, fontWeight:700, color:T.brand, letterSpacing:"0.05em", marginBottom:8, textTransform:"uppercase" }}>Deal Flow · {flow.address}</div>
        <div style={{ display:"flex", alignItems:"center", gap:4 }}>
          {steps.map((s, i) => (
            <div key={s.n} style={{ display:"flex", alignItems:"center", flex:i<steps.length-1 ? 1 : "0 0 auto" }}>
              <div style={{
                width:32, height:32, borderRadius:"50%",
                background: step >= s.n ? T.brand : T.surface,
                border: step === s.n ? `2px solid ${T.brand}` : "none",
                color: step >= s.n ? "#fff" : T.textMuted,
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:14, fontWeight:700, flexShrink:0
              }}>
                {step > s.n ? "✓" : s.n}
              </div>
              <div style={{ marginLeft:8, marginRight:12, minWidth:0 }}>
                <div style={{ fontSize:11, color:T.textMuted, fontWeight:500 }}>{s.icon}</div>
                <div style={{ fontSize:12, fontWeight: step===s.n ? 700 : 500, color: step>=s.n ? T.text : T.textMuted, whiteSpace:"nowrap" }}>{s.label}</div>
              </div>
              {i < steps.length - 1 && (
                <div style={{ flex:1, height:2, background: step > s.n ? T.brand : T.border, borderRadius:2, marginRight:8 }}/>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* STEP 1 — Sign contract */}
      {step === 1 && (
        <div>
          <div style={{ background:`linear-gradient(135deg, ${T.brandLight}, ${T.bg})`, border:`1px solid ${T.brand}33`, borderRadius:14, padding:16, marginBottom:12 }}>
            <div style={{ fontSize:11, fontWeight:700, color:T.brand, letterSpacing:"0.05em", marginBottom:6, textTransform:"uppercase" }}>✓ Appointment set</div>
            <div style={{ fontSize:15, fontWeight:700 }}>{flow.leadName} at {flow.address}</div>
            <div style={{ fontSize:13, color:T.textSecondary, marginTop:2 }}>Next: Lock it in with a signed Purchase &amp; Sale Agreement.</div>
          </div>

          <div style={{ background:T.bg, border:`1px solid ${T.border}`, borderRadius:14, padding:18, marginBottom:12 }}>
            <div style={{ fontSize:16, fontWeight:700, marginBottom:4 }}>✍️ Purchase &amp; Sale Agreement</div>
            <div style={{ fontSize:13, color:T.textSecondary, marginBottom:16 }}>Fill in the terms. We'll generate and send to the seller for eSign.</div>

            <div style={{ background:T.surface, borderRadius:10, padding:12, marginBottom:14 }}>
              <div style={{ fontSize:11, color:T.textMuted, fontWeight:600, marginBottom:4 }}>SELLER</div>
              <div style={{ fontSize:14, fontWeight:700 }}>{flow.leadName}</div>
              <div style={{ fontSize:12, color:T.textSecondary }}>{flow.phone} · {flow.address}</div>
            </div>

            {[
              { key:"price",     label:"Purchase price",    ph:"$195,000" },
              { key:"earnest",   label:"Earnest money",     ph:"500" },
              { key:"closeDate", label:"Close date",        ph:"May 15, 2026" },
              { key:"inspection",label:"Inspection (days)", ph:"7" },
            ].map(f=>(
              <div key={f.key} style={{ marginBottom:10 }}>
                <label style={{ fontSize:11, color:T.textMuted, fontWeight:700, letterSpacing:"0.03em", marginBottom:6, display:"block", textTransform:"uppercase" }}>{f.label}</label>
                <input value={contractData[f.key]} onChange={e=>setContractData(c=>({...c,[f.key]:e.target.value}))} placeholder={f.ph}
                  className="input-focus"
                  style={{ width:"100%", background:T.surface, border:`1px solid ${T.border}`, borderRadius:10, padding:"11px 13px", fontSize:14, outline:"none", fontFamily:T.font, boxSizing:"border-box" }}/>
              </div>
            ))}

            <button onClick={signContract} className="btn-primary" style={{ width:"100%", background:T.brand, border:"none", color:"#fff", padding:"14px", borderRadius:10, fontSize:15, fontWeight:700, cursor:"pointer", marginTop:10 }}>
              Generate &amp; send for signature →
            </button>
            <div style={{ fontSize:11, color:T.textMuted, textAlign:"center", marginTop:8 }}>2 credits · Seller signs via email</div>
          </div>
        </div>
      )}

      {/* STEP 2 — Post to market */}
      {step === 2 && (
        <div>
          <div style={{ background:`linear-gradient(135deg, ${T.brandLight}, ${T.bg})`, border:`1px solid ${T.brand}33`, borderRadius:14, padding:16, marginBottom:12 }}>
            <div style={{ fontSize:11, fontWeight:700, color:T.brand, letterSpacing:"0.05em", marginBottom:6, textTransform:"uppercase" }}>✓ Contract signed</div>
            <div style={{ fontSize:15, fontWeight:700 }}>You're under contract for ${contractData.price || flow.askingPrice}</div>
            <div style={{ fontSize:13, color:T.textSecondary, marginTop:2 }}>Next: Post it to the marketplace and assign to a buyer.</div>
          </div>

          <div style={{ background:T.bg, border:`1px solid ${T.border}`, borderRadius:14, padding:18, marginBottom:12 }}>
            <div style={{ fontSize:16, fontWeight:700, marginBottom:4 }}>🏪 Wholesale to marketplace</div>
            <div style={{ fontSize:13, color:T.textSecondary, marginBottom:16 }}>Set your assignment fee — this is your profit.</div>

            {[
              { key:"arv", label:"ARV (after repair value)",     ph:"$420K" },
              { key:"ask", label:"Your asking price (buyer pays)",ph:"$228K" },
              { key:"assignmentFee", label:"Your assignment fee", ph:"15000" },
            ].map(f=>(
              <div key={f.key} style={{ marginBottom:10 }}>
                <label style={{ fontSize:11, color:T.textMuted, fontWeight:700, letterSpacing:"0.03em", marginBottom:6, display:"block", textTransform:"uppercase" }}>{f.label}</label>
                <input value={listingData[f.key]} onChange={e=>setListingData(l=>({...l,[f.key]:e.target.value}))} placeholder={f.ph}
                  className="input-focus"
                  style={{ width:"100%", background:T.surface, border:`1px solid ${T.border}`, borderRadius:10, padding:"11px 13px", fontSize:14, outline:"none", fontFamily:T.font, boxSizing:"border-box" }}/>
              </div>
            ))}

            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:11, color:T.textMuted, fontWeight:700, letterSpacing:"0.03em", marginBottom:6, display:"block", textTransform:"uppercase" }}>Deal type</label>
              <div style={{ display:"flex", gap:6 }}>
                {["Wholesale","Fix & Flip"].map(t=>(
                  <button key={t} onClick={()=>setListingData(l=>({...l,type:t}))} style={{
                    flex:1, padding:"10px", borderRadius:10, fontSize:13, fontWeight:600, cursor:"pointer",
                    border: listingData.type===t ? `2px solid ${T.brand}` : `1px solid ${T.border}`,
                    background: listingData.type===t ? T.brandLight : T.bg,
                    color: listingData.type===t ? T.brand : T.text, fontFamily:T.font
                  }}>{t}</button>
                ))}
              </div>
              <div style={{ fontSize:11, color:T.textMuted, marginTop:6, lineHeight:1.5 }}>
                💡 <strong>Fix &amp; Flip</strong> listings also notify contractors so they can bid on the rehab.
              </div>
            </div>

            <div style={{ background:T.surface, borderRadius:10, padding:12, marginBottom:14 }}>
              <div style={{ fontSize:11, color:T.textMuted, fontWeight:600, marginBottom:4 }}>DEALBANK FEE</div>
              <div style={{ fontSize:13, color:T.textSecondary }}>1.5% of assignment fee at close · ~${Math.round((parseFloat(listingData.assignmentFee||0))*0.015).toLocaleString()}</div>
            </div>

            <button onClick={postWholesale} className="btn-primary" style={{ width:"100%", background:T.brand, border:"none", color:"#fff", padding:"14px", borderRadius:10, fontSize:15, fontWeight:700, cursor:"pointer" }}>
              Post to marketplace →
            </button>
          </div>
        </div>
      )}

      {/* STEP 3 — Done */}
      {step === 3 && (
        <div>
          <div style={{ background:`linear-gradient(135deg, ${T.brandLight}, ${T.bg})`, border:`2px solid ${T.brand}33`, borderRadius:14, padding:24, marginBottom:12, textAlign:"center" }}>
            <div style={{ fontSize:48, marginBottom:10 }}>🎉</div>
            <div style={{ fontSize:22, fontWeight:800, letterSpacing:"-0.02em", marginBottom:6 }}>Deal is live!</div>
            <div style={{ fontSize:14, color:T.textSecondary, maxWidth:400, margin:"0 auto 16px" }}>
              Your deal at {flow.address} is posted on the marketplace. Expect offers within 24 hours.
            </div>
            <div style={{ background:T.bg, border:`1px solid ${T.border}`, borderRadius:10, padding:14, marginBottom:16, textAlign:"left" }}>
              <div style={{ fontSize:11, color:T.textMuted, fontWeight:700, marginBottom:8, textTransform:"uppercase" }}>What happens next</div>
              {[
                "🔔 Active buyers get alerts for this deal",
                "💰 When it sells, you get your $" + (listingData.assignmentFee||"0") + " assignment fee",
                "🔨 If a flipper wins, contractors auto-notified to bid",
                "📊 Track offers in your Pipeline",
              ].map((s,i)=>(
                <div key={i} style={{ fontSize:13, padding:"4px 0", color:T.text }}>{s}</div>
              ))}
            </div>
            <button onClick={onDone} className="btn-primary" style={{ background:T.brand, border:"none", color:"#fff", padding:"13px 28px", borderRadius:10, fontSize:14, fontWeight:700, cursor:"pointer" }}>
              View on marketplace →
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div style={{ position:"fixed", bottom:24, left:"50%", transform:"translateX(-50%)", background:T.text, color:"#fff", padding:"12px 20px", borderRadius:10, fontSize:14, fontWeight:600, zIndex:900, boxShadow:T.shadowLg, animation:"slideUp .2s ease" }}>{toast}</div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════
// UPGRADE MODAL — $125/mo Pro plan
// ═════════════════════════════════════════════════════════════════
function UpgradeModal({ onClose, onUpgrade }) {
  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:700, display:"flex", alignItems:"center", justifyContent:"center", padding:20, animation:"fadeIn .2s ease" }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:T.bg, borderRadius:16, width:"100%", maxWidth:440, overflow:"hidden", boxShadow:T.shadowLg }}>
        <div style={{ background:`linear-gradient(135deg, ${T.brandLight}, ${T.bg})`, padding:"26px 26px 20px", borderBottom:`1px solid ${T.border}` }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
            <div style={{ fontSize:36 }}>⭐</div>
            <button onClick={onClose} style={{ background:"#ffffff88", border:"none", width:30, height:30, borderRadius:"50%", cursor:"pointer", color:T.textSecondary, fontSize:17 }}>✕</button>
          </div>
          <div style={{ fontSize:24, fontWeight:800, letterSpacing:"-0.02em", marginBottom:4 }}>Go Pro — $125/mo</div>
          <div style={{ fontSize:14, color:T.textSecondary }}>The Dialer is where deals get closed.</div>
        </div>
        <div style={{ padding:"20px 26px 26px" }}>
          <div style={{ display:"flex", alignItems:"baseline", gap:6, marginBottom:16 }}>
            <span style={{ fontSize:42, fontWeight:800, letterSpacing:"-0.03em" }}>$125</span>
            <span style={{ fontSize:15, color:T.textSecondary, fontWeight:500 }}>/month · cancel anytime</span>
          </div>
          <div style={{ fontSize:13, fontWeight:700, color:T.textMuted, letterSpacing:"0.03em", textTransform:"uppercase", marginBottom:10 }}>What you get</div>
          {[
            ["📞","Unlimited Dialer calls"],
            ["⚡","Unlimited Deal Analyzer"],
            ["🎯","Targeted list building"],
            ["⭐","Priority placement in marketplace"],
            ["✍️","Full deal flow + eSign contracts"],
            ["🔔","Real-time deal alerts (first to claim)"],
          ].map(([ic,b],i)=>(
            <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"8px 0" }}>
              <div style={{ fontSize:18, width:24, textAlign:"center" }}>{ic}</div>
              <span style={{ fontSize:14, flex:1 }}>{b}</span>
              <span style={{ fontSize:13, color:T.brand, fontWeight:700 }}>✓</span>
            </div>
          ))}
          <div style={{ background:T.surface, borderRadius:10, padding:14, marginTop:14, marginBottom:16 }}>
            <div style={{ fontSize:12, color:T.textSecondary, lineHeight:1.5 }}>
              💡 <strong style={{ color:T.text }}>Math:</strong> One closed assignment ($15K fee) = <strong style={{ color:T.brand }}>10 years of Pro.</strong>
            </div>
          </div>
          <button onClick={onUpgrade} className="btn-primary" style={{ width:"100%", background:T.brand, border:"none", color:"#fff", padding:"14px", borderRadius:10, fontSize:15, fontWeight:700, cursor:"pointer", marginBottom:8 }}>
            Start Pro — $125/mo
          </button>
          <button onClick={onClose} style={{ width:"100%", background:"transparent", border:`1px solid ${T.border}`, color:T.textSecondary, padding:"11px", borderRadius:10, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:T.font }}>Not now</button>
        </div>
      </div>
    </div>
  );
}
