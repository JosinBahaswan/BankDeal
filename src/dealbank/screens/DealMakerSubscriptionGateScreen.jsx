import useIsMobile from "../core/useIsMobile";

const DEALMAKER_PLAN_FEATURES = [
  "AI Deal Analyzer + Offer Calculator",
  "Pipeline + Contract Management",
  "Marketplace access + Buyer tools",
  "Lead lists, power dialer, and CRM sequences",
  "Priority product updates",
];

export default function DealMakerSubscriptionGateScreen({
  G,
  card,
  btnG,
  btnO,
  userName,
  checking,
  launching,
  message,
  onSubscribe,
  onSignOut,
}) {
  const isMobile = useIsMobile(820);
  const actionDisabled = checking || launching;

  return (
    <div style={{ minHeight: "100vh", background: G.bg, color: G.text, fontFamily: G.mono }}>
      <div style={{ background: G.surface, borderBottom: `1px solid ${G.border}`, padding: isMobile ? "12px" : "12px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "center", flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 10 : 12 }}>
            <div style={{ position: "relative", width: 30, height: 30 }}>
              <div style={{ position: "absolute", inset: 0, background: "#22c55e", borderRadius: 5, transform: "rotate(45deg) scale(0.7)" }} />
              <div style={{ position: "absolute", inset: 4, background: "#050a05", borderRadius: 3, transform: "rotate(45deg) scale(0.7)" }} />
              <div style={{ position: "absolute", inset: 9, background: "#22c55e", borderRadius: 2, transform: "rotate(45deg) scale(0.7)" }} />
            </div>
            <div>
              <div style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: isMobile ? 18 : 20, fontWeight: 900, letterSpacing: -0.5, lineHeight: 1 }}>
                Deal<span style={{ color: "#22c55e" }}>Bank</span>
              </div>
              <div style={{ fontFamily: G.serif, fontSize: isMobile ? 16 : 18, fontWeight: "bold" }}>DealMaker Subscription</div>
              <div style={{ fontSize: 9, color: G.muted, letterSpacing: isMobile ? 1 : 2, marginTop: 2 }}>UNLOCK THE FULL DEALMAKER DASHBOARD</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {!isMobile && <div style={{ fontSize: 10, color: G.muted }}>{userName || "DealMaker"}</div>}
            <button onClick={onSignOut} style={{ ...btnO, padding: "6px 12px", fontSize: 9 }}>
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: isMobile ? "14px 12px 20px" : "24px 16px 30px" }}>
        <div style={{ ...card, borderColor: `${G.gold}55`, marginBottom: 12 }}>
          <div style={{ fontSize: 9, color: G.gold, letterSpacing: 3, marginBottom: 6 }}>PLAN REQUIRED</div>
          <div style={{ fontFamily: G.serif, fontSize: 26, color: G.text, fontWeight: "bold", marginBottom: 3 }}>$149<span style={{ fontSize: 15, color: G.muted }}>/month</span></div>
          <div style={{ fontSize: 10, color: G.muted, lineHeight: 1.7, marginBottom: 12 }}>
            Billing activates full DealMaker features for analysis, outbound, contracts, and marketplace workflow.
          </div>

          <div style={{ display: "grid", gap: 6, marginBottom: 14 }}>
            {DEALMAKER_PLAN_FEATURES.map((feature) => (
              <div key={feature} style={{ fontSize: 10, color: G.text, lineHeight: 1.7 }}>
                • {feature}
              </div>
            ))}
          </div>

          <button
            onClick={onSubscribe}
            disabled={actionDisabled}
            style={{
              ...btnG,
              width: "100%",
              fontSize: 10,
              padding: "10px 14px",
              opacity: actionDisabled ? 0.75 : 1,
              cursor: actionDisabled ? "not-allowed" : "pointer",
            }}
          >
            {checking ? "Checking subscription..." : launching ? "Redirecting to Stripe..." : "Subscribe & Launch Dashboard"}
          </button>
        </div>

        {message && (
          <div
            style={{
              ...card,
              borderColor: message.toLowerCase().includes("unable") || message.toLowerCase().includes("missing") ? `${G.red}66` : `${G.gold}66`,
              color: message.toLowerCase().includes("unable") || message.toLowerCase().includes("missing") ? G.red : G.gold,
              fontSize: 10,
              lineHeight: 1.7,
            }}
          >
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
