import { pageContainerStyle, pageShellStyle } from "../core/layout";
import useViewport from "../core/useViewport";

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
  const { isMobile, isTablet, mode } = useViewport();
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
    <div style={{ ...pageShellStyle(G), display: "flex", alignItems: "flex-start", justifyContent: "center", padding: isMobile ? "18px 0 24px" : "30px 0 36px", background: "linear-gradient(180deg,#f8fbf8 0%, #f1f6f1 100%)" }}>
      <div style={pageContainerStyle(mode, 1260)}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 9,
                background: G.green,
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                fontSize: 17,
              }}
            >
              D
            </div>
            <span style={{ fontSize: isMobile ? 24 : 28, fontWeight: 800, letterSpacing: "-0.03em", color: G.text }}>
              DealBank
            </span>
          </div>
          <div style={{ fontSize: 11, color: G.muted, letterSpacing: 1.5 }}>{authMode === "signup" ? "Create account" : "Welcome back"}</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : isTablet ? "1fr" : "minmax(0,0.95fr) minmax(0,1.05fr)", gap: 14, alignItems: "stretch" }}>
          <div style={{ ...card, padding: isMobile ? "16px" : "18px", background: G.surface, borderColor: `${G.green}33` }}>
            <div style={{ fontSize: 10, color: G.green, letterSpacing: 2, marginBottom: 6 }}>{roleCopy.eyebrow}</div>
            <div style={{ fontFamily: G.serif, fontSize: 28, color: G.text, lineHeight: 1.15, marginBottom: 10 }}>{roleCopy.headline}</div>
            <div style={{ fontSize: 14, color: G.muted, lineHeight: 1.7, marginBottom: 14 }}>{roleCopy.body}</div>
            <div style={{ display: "grid", gap: 5 }}>
              {roleCopy.highlights.map((item) => (
                <div key={item} style={{ fontSize: 13, color: G.text, lineHeight: 1.6 }}>
                  • {item}
                </div>
              ))}
            </div>

            <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8 }}>
              {[
                ["Network", "14k+"],
                ["Live Deals", "5.4k"],
                ["Avg Quote", "22h"],
              ].map(([label, value]) => (
                <div key={label} style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 8, padding: "10px 8px", textAlign: "center" }}>
                  <div style={{ fontSize: 10, color: G.muted, marginBottom: 2 }}>{label}</div>
                  <div style={{ fontFamily: G.serif, fontSize: 18, color: G.green }}>{value}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ ...card, padding: isMobile ? "16px" : card.padding }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 6, marginBottom: 14 }}>
              {["dealmaker", "contractor", "realtor"].map((type) => (
                <div
                  key={type}
                  onClick={() => setUserType(type)}
                  style={{
                    padding: "9px 12px",
                    borderRadius: 8,
                    cursor: "pointer",
                    fontSize: 11,
                    letterSpacing: 0.8,
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
            <div key={field} style={{ marginBottom: 13 }}>
              <div style={lbl}>{fieldLabel}</div>
              {type === "select" ? (
                <select
                  value={authForm[field]}
                  onChange={(event) => setAuthForm((prev) => ({ ...prev, [field]: event.target.value }))}
                  style={{ ...smIn, background: G.surface, border: `1px solid ${G.border}`, borderRadius: 8, padding: "10px 12px" }}
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
                  style={{ ...smIn, background: G.surface, border: `1px solid ${G.border}`, borderRadius: 8, padding: "10px 12px" }}
                />
              )}
            </div>
            ))}

            {authError && <div style={{ color: G.red, fontSize: 12, marginBottom: 10, lineHeight: 1.6 }}>{authError}</div>}

            {authNeedsVerification && authMode === "login" && (
              <button
                onClick={resendVerificationEmail}
                style={{ ...btnO, width: "100%", marginBottom: 10, padding: isMobile ? "10px 14px" : btnO.padding, fontSize: 12 }}
              >
                Resend Verification Email
              </button>
            )}

            <button onClick={handleAuth} style={{ ...btnG, width: "100%", marginBottom: 10, padding: isMobile ? "11px 14px" : btnG.padding, fontSize: 14 }}>
              {authMode === "signup" ? "Create Account" : "Log In"}
            </button>
            <div style={{ textAlign: "center", fontSize: 12, color: G.muted }}>
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
          <span style={{ fontSize: 12, color: G.muted, cursor: "pointer" }} onClick={() => setScreen("landing")}>
            ← Back
          </span>
        </div>
      </div>
    </div>
  );
}
