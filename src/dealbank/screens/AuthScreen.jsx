import useIsMobile from "../core/useIsMobile";

const ROLE_COPY = {
  dealmaker: {
    eyebrow: "DEAL MAKER",
    headline: "Acquire, analyze, and close faster.",
    body: "Run end-to-end flip operations from one workspace with deal analysis, tools, contracts, and marketplace execution.",
    highlights: ["AI analysis + pipeline", "Lead tools + dialer", "Marketplace + contracts"],
  },
  contractor: {
    eyebrow: "CONTRACTOR",
    headline: "Get qualified jobs from active investors.",
    body: "Complete your profile, receive trade-aligned leads, and win repeat work with transparent quote history.",
    highlights: ["Trade-matched leads", "Quote workflow", "Paid profile tiers"],
  },
  realtor: {
    eyebrow: "REALTOR",
    headline: "Convert referrals into closed listings.",
    body: "Partner with dealmakers exiting flips, manage listing velocity, and track split economics in one dashboard.",
    highlights: ["Referral pipeline", "Listing execution", "Split reporting"],
  },
};

function resolveRole(userType) {
  if (userType === "contractor") return "contractor";
  if (userType === "realtor") return "realtor";
  return "dealmaker";
}

export default function AuthScreen({
  G,
  card,
  lbl,
  smIn,
  btnG,
  btnO,
  TRADES,
  authMode,
  userType,
  authForm,
  authError,
  authNeedsVerification,
  setAuthMode,
  setUserType,
  setAuthForm,
  setAuthError,
  setScreen,
  handleAuth,
  resendVerificationEmail,
}) {
  const isMobile = useIsMobile(960);
  const role = resolveRole(userType);
  const roleCopy = ROLE_COPY[role];
  const authFields = [
    ...(authMode === "signup" ? [{ label: "Full Name", field: "name", type: "text" }] : []),
    ...(authMode === "signup" && role === "dealmaker"
      ? [
        { label: "Company", field: "company", type: "text" },
        { label: "Phone", field: "phone", type: "tel" },
      ]
      : []),
    { label: "Email", field: "email", type: "email" },
    { label: "Password", field: "password", type: "password" },
    ...(authMode === "signup" && role === "contractor" ? [{ label: "Trade", field: "trade", type: "select" }] : []),
    ...(authMode === "signup" ? [{ label: "City, State", field: "location", type: "text" }] : []),
  ];

  return (
    <div style={{ minHeight: "100vh", background: G.bg, color: G.text, fontFamily: G.mono, display: "flex", alignItems: isMobile ? "flex-start" : "center", justifyContent: "center", padding: isMobile ? "24px 0" : "24px 0" }}>
      <div style={{ width: "100%", maxWidth: 980, padding: "0 16px" }}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <div style={{ position: "relative", width: 30, height: 30 }}>
              <div style={{ position: "absolute", inset: 0, background: "#22c55e", borderRadius: 5, transform: "rotate(45deg) scale(0.7)" }} />
              <div style={{ position: "absolute", inset: 4, background: "#050a05", borderRadius: 3, transform: "rotate(45deg) scale(0.7)" }} />
              <div style={{ position: "absolute", inset: 9, background: "#22c55e", borderRadius: 2, transform: "rotate(45deg) scale(0.7)" }} />
            </div>
            <span style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: isMobile ? 24 : 28, fontWeight: 900, letterSpacing: -0.5 }}>
              Deal<span style={{ color: "#22c55e" }}>Bank</span>
            </span>
          </div>
          <div style={{ fontSize: 9, color: G.muted, letterSpacing: 3 }}>{authMode === "signup" ? "CREATE ACCOUNT" : "WELCOME BACK"}</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "minmax(0,0.92fr) minmax(0,1.08fr)", gap: 12, alignItems: "stretch" }}>
          <div style={{ ...card, padding: isMobile ? "14px" : "16px", background: "linear-gradient(145deg,#08140b,#0d1f11)", borderColor: `${G.green}44` }}>
            <div style={{ fontSize: 8, color: G.green, letterSpacing: 2, marginBottom: 6 }}>{roleCopy.eyebrow}</div>
            <div style={{ fontFamily: G.serif, fontSize: 22, color: G.text, lineHeight: 1.2, marginBottom: 8 }}>{roleCopy.headline}</div>
            <div style={{ fontSize: 10, color: G.muted, lineHeight: 1.7, marginBottom: 10 }}>{roleCopy.body}</div>
            <div style={{ display: "grid", gap: 5 }}>
              {roleCopy.highlights.map((item) => (
                <div key={item} style={{ fontSize: 10, color: G.text, lineHeight: 1.6 }}>
                  • {item}
                </div>
              ))}
            </div>
          </div>

          <div style={{ ...card, padding: isMobile ? "14px" : card.padding }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 6, marginBottom: 14 }}>
              {["dealmaker", "contractor", "realtor"].map((type) => (
                <div
                  key={type}
                  onClick={() => setUserType(type)}
                  style={{
                    padding: "7px 12px",
                    borderRadius: 4,
                    cursor: "pointer",
                    fontSize: 8,
                    letterSpacing: 2,
                    textTransform: "uppercase",
                    fontFamily: G.mono,
                    textAlign: "center",
                    border: `1px solid ${role === type ? G.green : G.border}`,
                    background: role === type ? G.greenGlow : "transparent",
                    color: role === type ? G.green : G.muted,
                  }}
                >
                  {type}
                </div>
              ))}
            </div>

            {authFields.map(({ label: fieldLabel, field, type }) => (
            <div key={field} style={{ marginBottom: 12 }}>
              <div style={lbl}>{fieldLabel}</div>
              {type === "select" ? (
                <select
                  value={authForm[field]}
                  onChange={(event) => setAuthForm((prev) => ({ ...prev, [field]: event.target.value }))}
                  style={{ ...smIn, background: G.surface, border: `1px solid ${G.border}`, borderRadius: 4, padding: "8px 10px" }}
                >
                  {TRADES.map((trade) => (
                    <option key={trade} value={trade} style={{ background: G.card }}>
                      {trade}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={type}
                  value={authForm[field]}
                  onChange={(event) => setAuthForm((prev) => ({ ...prev, [field]: event.target.value }))}
                  onKeyDown={(event) => event.key === "Enter" && handleAuth()}
                  style={{ ...smIn, background: G.surface, border: `1px solid ${G.border}`, borderRadius: 4, padding: "8px 10px" }}
                />
              )}
            </div>
            ))}

            {authError && <div style={{ color: G.red, fontSize: 10, marginBottom: 10 }}>{authError}</div>}

            {authNeedsVerification && authMode === "login" && (
              <button
                onClick={resendVerificationEmail}
                style={{ ...btnO, width: "100%", marginBottom: 10, padding: isMobile ? "10px 14px" : btnO.padding, fontSize: 10 }}
              >
                Resend Verification Email
              </button>
            )}

            <button onClick={handleAuth} style={{ ...btnG, width: "100%", marginBottom: 10, padding: isMobile ? "11px 14px" : btnG.padding }}>
              {authMode === "signup" ? "Create Account" : "Log In"}
            </button>
            <div style={{ textAlign: "center", fontSize: 10, color: G.muted }}>
              {authMode === "signup" ? "Have an account? " : "No account? "}
              <span
                style={{ color: G.green, cursor: "pointer" }}
                onClick={() => {
                  setAuthMode(authMode === "signup" ? "login" : "signup");
                  setAuthError("");
                }}
              >
                {authMode === "signup" ? "Log in" : "Sign up"}
              </span>
            </div>
          </div>
        </div>
        <div style={{ textAlign: "center", marginTop: 14 }}>
          <span style={{ fontSize: 9, color: G.muted, cursor: "pointer" }} onClick={() => setScreen("landing")}>
            ← Back
          </span>
        </div>
      </div>
    </div>
  );
}
