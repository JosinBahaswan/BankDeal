import useIsMobile from "../core/useIsMobile";

export default function AuthScreen({
  G,
  card,
  lbl,
  smIn,
  btnG,
  TRADES,
  authMode,
  userType,
  authForm,
  authError,
  setAuthMode,
  setUserType,
  setAuthForm,
  setAuthError,
  setScreen,
  handleAuth,
}) {
  const isMobile = useIsMobile(820);

  return (
    <div style={{ minHeight: "100vh", background: G.bg, color: G.text, fontFamily: G.mono, display: "flex", alignItems: isMobile ? "flex-start" : "center", justifyContent: "center", padding: isMobile ? "24px 0" : 0 }}>
      <div style={{ width: "100%", maxWidth: 420, padding: "0 16px" }}>
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
        {authMode === "signup" && (
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3,minmax(0,1fr))", gap: 6, marginBottom: 16 }}>
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
                  border: `1px solid ${userType === type ? G.green : G.border}`,
                  background: userType === type ? G.greenGlow : "transparent",
                  color: userType === type ? G.green : G.muted,
                }}
              >
                {type}
              </div>
            ))}
          </div>
        )}
        <div style={{ ...card, padding: isMobile ? "14px" : card.padding }}>
          {[
            ...(authMode === "signup" ? [{ label: "Full Name", field: "name", type: "text" }] : []),
            { label: "Email", field: "email", type: "email" },
            { label: "Password", field: "password", type: "password" },
            ...(authMode === "signup" && userType === "contractor" ? [{ label: "Trade", field: "trade", type: "select" }] : []),
            ...(authMode === "signup" ? [{ label: "City, State", field: "location", type: "text" }] : []),
          ].map(({ label: fieldLabel, field, type }) => (
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
        <div style={{ textAlign: "center", marginTop: 14 }}>
          <span style={{ fontSize: 9, color: G.muted, cursor: "pointer" }} onClick={() => setScreen("landing")}>
            ← Back
          </span>
        </div>
      </div>
    </div>
  );
}
