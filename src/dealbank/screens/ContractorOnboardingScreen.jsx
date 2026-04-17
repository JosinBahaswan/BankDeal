import { useState } from "react";
import useIsMobile from "../core/useIsMobile";

const CSLB_VERIFY_ENDPOINT = String(import.meta.env.VITE_CSLB_VERIFY_ENDPOINT || "").trim();
const CSLB_VERIFICATION_REQUIRED = String(import.meta.env.VITE_REQUIRE_CSLB_VERIFICATION || "false").toLowerCase() === "true";

const CONTRACTOR_TRADE_OPTIONS = [
  "GC",
  "Roofing",
  "HVAC",
  "Plumbing",
  "Electrical",
  "Kitchen & Bath",
  "Flooring",
  "Painting",
  "Landscaping",
  "Windows",
  "Foundation",
  "Handyman",
];

const SUBSCRIPTION_PLANS = [
  {
    id: "basic",
    name: "Basic",
    price: "$39/mo",
    subtitle: "5 quotes per month",
    features: ["5 quotes/mo", "Standard placement", "Core profile listing"],
  },
  {
    id: "pro",
    name: "Pro",
    price: "$79/mo",
    subtitle: "Unlimited + verified + priority",
    features: ["Unlimited quotes", "Verified badge", "Priority placement"],
    highlight: true,
  },
];

function badgeStyle(color) {
  return {
    fontSize: 7,
    color,
    background: `${color}22`,
    border: `1px solid ${color}44`,
    borderRadius: 3,
    padding: "2px 7px",
    letterSpacing: 1,
    fontFamily: "'Courier New',monospace",
    textTransform: "uppercase",
  };
}

export default function ContractorOnboardingScreen({
  G,
  card,
  lbl,
  smIn,
  btnG,
  btnO,
  onboarding,
  setOnboarding,
  onComplete,
  onSignOut,
  userName,
}) {
  const isMobile = useIsMobile(820);
  const [licenseVerification, setLicenseVerification] = useState({
    state: "idle",
    message: "",
  });

  const setField = (field, value) => {
    if (field === "licenseNumber") {
      setLicenseVerification({
        state: "idle",
        message: "",
      });
    }
    setOnboarding((prev) => ({ ...prev, [field]: value, error: "" }));
  };

  const toggleTrade = (trade) => {
    setOnboarding((prev) => {
      const exists = prev.trades.includes(trade);
      const trades = exists ? prev.trades.filter((item) => item !== trade) : [...prev.trades, trade];
      return { ...prev, trades, error: "" };
    });
  };

  const goNext = () => {
    if (onboarding.step === 1 && onboarding.trades.length === 0) {
      setOnboarding((prev) => ({ ...prev, error: "Select at least one trade to continue." }));
      return;
    }

    if (onboarding.step === 2) {
      const required = [
        onboarding.yearsInBusiness,
        onboarding.licenseNumber,
        onboarding.city,
        onboarding.serviceRadius,
        onboarding.rateType,
        onboarding.rateAmount,
        onboarding.bio,
      ];
      if (required.some((value) => String(value || "").trim() === "")) {
        setOnboarding((prev) => ({ ...prev, error: "Complete all details before continuing." }));
        return;
      }

      if (CSLB_VERIFICATION_REQUIRED && licenseVerification.state !== "verified") {
        setOnboarding((prev) => ({ ...prev, error: "Verify CSLB license before continuing." }));
        return;
      }
    }

    setOnboarding((prev) => ({ ...prev, step: Math.min(prev.step + 1, 3), error: "" }));
  };

  const goBack = () => {
    setOnboarding((prev) => ({ ...prev, step: Math.max(prev.step - 1, 1), error: "" }));
  };

  const verifyCslbLicense = async () => {
    if (!CSLB_VERIFY_ENDPOINT) {
      setLicenseVerification({
        state: "failed",
        message: "CSLB verification endpoint is not configured (Phase 2).",
      });
      return;
    }

    const licenseNumber = String(onboarding.licenseNumber || "").trim();
    if (!licenseNumber) {
      setOnboarding((prev) => ({ ...prev, error: "Enter CSLB license number first." }));
      return;
    }

    setLicenseVerification({
      state: "checking",
      message: "Checking CSLB records...",
    });
    setOnboarding((prev) => ({ ...prev, error: "" }));

    try {
      const response = await fetch(CSLB_VERIFY_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ licenseNumber }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.valid) {
        setLicenseVerification({
          state: "failed",
          message: payload?.message || payload?.error || `CSLB verification failed (${response.status}).`,
        });
        return;
      }

      const status = String(payload?.status || "Active").trim();
      const businessName = String(payload?.legalName || payload?.businessName || "").trim();
      const message = businessName
        ? `Verified ${payload.licenseNumber} - ${status} (${businessName})`
        : `Verified ${payload.licenseNumber} - ${status}`;

      setLicenseVerification({
        state: "verified",
        message,
      });
    } catch (error) {
      setLicenseVerification({
        state: "failed",
        message: error?.message || "Unable to verify CSLB license right now.",
      });
    }
  };

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
              <div style={{ fontFamily: G.serif, fontSize: isMobile ? 16 : 18, fontWeight: "bold" }}>Contractor Onboarding</div>
              <div style={{ fontSize: 9, color: G.muted, letterSpacing: isMobile ? 1 : 2, marginTop: 2 }}>SET UP YOUR PROFILE TO START RECEIVING DEAL LEADS</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {!isMobile && <div style={{ fontSize: 10, color: G.muted }}>{userName || "Contractor"}</div>}
            <button onClick={onSignOut} style={{ ...btnO, padding: "6px 12px", fontSize: 9 }}>
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 940, margin: "0 auto", padding: isMobile ? "14px 12px 20px" : "22px 16px 26px" }}>
        <div style={{ ...card, marginBottom: 14 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {[1, 2, 3].map((step) => {
              const active = onboarding.step === step;
              const done = onboarding.step > step;
              const color = done || active ? G.green : G.muted;
              return (
                <div key={step} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 999,
                      border: `1px solid ${done || active ? G.green : G.border}`,
                      background: done || active ? G.greenGlow : "transparent",
                      color,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 10,
                      fontWeight: "bold",
                    }}
                  >
                    {done ? "✓" : step}
                  </div>
                  <div style={{ fontSize: 9, color, letterSpacing: 2, textTransform: "uppercase" }}>
                    {step === 1 ? "Trades" : step === 2 ? "Details" : "Subscription"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {onboarding.step === 1 && (
          <div style={card}>
            <div style={{ fontFamily: G.serif, fontSize: 20, color: G.text, fontWeight: "bold", marginBottom: 5 }}>Step 1 - Select Your Trades</div>
            <div style={{ fontSize: 10, color: G.muted, marginBottom: 16 }}>Choose one or more specialties. You need at least one to continue.</div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 10 }}>
              {CONTRACTOR_TRADE_OPTIONS.map((trade) => {
                const selected = onboarding.trades.includes(trade);
                return (
                  <button
                    type="button"
                    key={trade}
                    onClick={() => toggleTrade(trade)}
                    style={{
                      textAlign: "left",
                      background: selected ? G.greenGlow : G.surface,
                      border: `1px solid ${selected ? G.green : G.border}`,
                      borderRadius: 8,
                      padding: "12px 12px",
                      color: selected ? G.green : G.text,
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ fontFamily: G.serif, fontSize: 14, fontWeight: "bold" }}>{trade}</div>
                    <div style={{ fontSize: 8, color: selected ? G.green : G.muted, letterSpacing: 2, marginTop: 4 }}>
                      {selected ? "SELECTED" : "TAP TO SELECT"}
                    </div>
                  </button>
                );
              })}
            </div>

            <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between", alignItems: isMobile ? "stretch" : "center", flexWrap: "wrap", gap: 10, flexDirection: isMobile ? "column" : "row" }}>
              <div style={badgeStyle(onboarding.trades.length > 0 ? G.green : G.gold)}>{onboarding.trades.length} trade(s) selected</div>
              <button onClick={goNext} style={{ ...btnG, padding: "10px 16px", width: isMobile ? "100%" : "auto" }}>
                Continue
              </button>
            </div>
          </div>
        )}

        {onboarding.step === 2 && (
          <div style={card}>
            <div style={{ fontFamily: G.serif, fontSize: 20, color: G.text, fontWeight: "bold", marginBottom: 5 }}>Step 2 - Business Details</div>
            <div style={{ fontSize: 10, color: G.muted, marginBottom: 16 }}>
              Fill your profile so deal makers can review and send qualified jobs.
              {CSLB_VERIFICATION_REQUIRED ? " CSLB verification is required." : " CSLB verification is optional (Phase 2)."}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
              <div>
                <div style={lbl}>Years in Business</div>
                <input value={onboarding.yearsInBusiness} onChange={(event) => setField("yearsInBusiness", event.target.value)} type="number" min="0" style={{ ...smIn, background: G.surface, border: `1px solid ${G.border}`, borderRadius: 6, padding: "9px 11px" }} />
              </div>
              <div>
                <div style={lbl}>CSLB License #</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
                  <input value={onboarding.licenseNumber} onChange={(event) => setField("licenseNumber", event.target.value)} style={{ ...smIn, background: G.surface, border: `1px solid ${G.border}`, borderRadius: 6, padding: "9px 11px" }} />
                  <button
                    type="button"
                    onClick={verifyCslbLicense}
                    disabled={licenseVerification.state === "checking" || String(onboarding.licenseNumber || "").trim() === "" || !CSLB_VERIFY_ENDPOINT}
                    style={{
                      ...btnO,
                      padding: "0 12px",
                      fontSize: 9,
                      minWidth: 88,
                      opacity: licenseVerification.state === "checking" || !CSLB_VERIFY_ENDPOINT ? 0.75 : 1,
                      cursor: licenseVerification.state === "checking" ? "wait" : !CSLB_VERIFY_ENDPOINT ? "not-allowed" : "pointer",
                    }}
                  >
                    {licenseVerification.state === "checking" ? "Checking..." : !CSLB_VERIFY_ENDPOINT ? "Phase 2" : "Verify"}
                  </button>
                </div>
                {licenseVerification.message && (
                  <div style={{ marginTop: 5, fontSize: 9, color: licenseVerification.state === "verified" ? G.green : G.red }}>
                    {licenseVerification.message}
                  </div>
                )}
              </div>
              <div>
                <div style={lbl}>City / Location</div>
                <input value={onboarding.city} onChange={(event) => setField("city", event.target.value)} style={{ ...smIn, background: G.surface, border: `1px solid ${G.border}`, borderRadius: 6, padding: "9px 11px" }} />
              </div>
              <div>
                <div style={lbl}>Service Radius (Miles)</div>
                <input value={onboarding.serviceRadius} onChange={(event) => setField("serviceRadius", event.target.value)} type="number" min="1" style={{ ...smIn, background: G.surface, border: `1px solid ${G.border}`, borderRadius: 6, padding: "9px 11px" }} />
              </div>
              <div>
                <div style={lbl}>Rate Type</div>
                <select value={onboarding.rateType} onChange={(event) => setField("rateType", event.target.value)} style={{ ...smIn, background: G.surface, border: `1px solid ${G.border}`, borderRadius: 6, padding: "9px 11px" }}>
                  <option value="hourly">hourly</option>
                  <option value="project">project</option>
                  <option value="both">both</option>
                </select>
              </div>
              <div>
                <div style={lbl}>Rate $</div>
                <input value={onboarding.rateAmount} onChange={(event) => setField("rateAmount", event.target.value)} type="number" min="0" style={{ ...smIn, background: G.surface, border: `1px solid ${G.border}`, borderRadius: 6, padding: "9px 11px" }} />
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={lbl}>Bio</div>
              <textarea value={onboarding.bio} onChange={(event) => setField("bio", event.target.value)} rows={4} style={{ width: "100%", boxSizing: "border-box", background: G.surface, border: `1px solid ${G.border}`, borderRadius: 6, color: G.text, fontFamily: G.mono, padding: "10px 11px", outline: "none", resize: "vertical", fontSize: 12 }} />
            </div>

            <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginTop: 12 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 10, color: G.text }}>
                <input
                  type="checkbox"
                  checked={onboarding.licensedAndInsured}
                  onChange={(event) => setField("licensedAndInsured", event.target.checked)}
                  style={{ accentColor: G.green }}
                />
                Licensed & Insured
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 10, color: G.text }}>
                <input
                  type="checkbox"
                  checked={onboarding.bonded}
                  onChange={(event) => setField("bonded", event.target.checked)}
                  style={{ accentColor: G.green }}
                />
                Bonded
              </label>
            </div>

            <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", flexDirection: isMobile ? "column" : "row" }}>
              <button onClick={goBack} style={{ ...btnO, padding: "10px 16px", width: isMobile ? "100%" : "auto" }}>Back</button>
              <button onClick={goNext} style={{ ...btnG, padding: "10px 16px", width: isMobile ? "100%" : "auto" }}>Continue</button>
            </div>
          </div>
        )}

        {onboarding.step === 3 && (
          <div style={card}>
            <div style={{ fontFamily: G.serif, fontSize: 20, color: G.text, fontWeight: "bold", marginBottom: 5 }}>Step 3 - Pick Subscription</div>
            <div style={{ fontSize: 10, color: G.muted, marginBottom: 16 }}>Choose your contractor plan. You can upgrade any time from dashboard.</div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 12 }}>
              {SUBSCRIPTION_PLANS.map((plan) => {
                const selected = onboarding.plan === plan.id;
                return (
                  <button
                    type="button"
                    key={plan.id}
                    onClick={() => setField("plan", plan.id)}
                    style={{
                      textAlign: "left",
                      background: selected ? G.greenGlow : G.surface,
                      border: `1px solid ${selected ? G.green : plan.highlight ? `${G.gold}88` : G.border}`,
                      borderRadius: 8,
                      padding: "14px",
                      color: G.text,
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <div style={{ fontFamily: G.serif, fontSize: 18, color: selected ? G.green : G.text, fontWeight: "bold" }}>{plan.name}</div>
                      {plan.highlight && <div style={badgeStyle(G.gold)}>Most Popular</div>}
                    </div>
                    <div style={{ fontFamily: G.serif, fontSize: 24, color: plan.id === "pro" ? G.gold : G.green, fontWeight: "bold", marginBottom: 4 }}>{plan.price}</div>
                    <div style={{ fontSize: 10, color: G.muted, marginBottom: 10 }}>{plan.subtitle}</div>
                    <div style={{ display: "grid", gap: 6 }}>
                      {plan.features.map((feature) => (
                        <div key={feature} style={{ fontSize: 10, color: G.text }}>
                          • {feature}
                        </div>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>

            <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", flexDirection: isMobile ? "column" : "row" }}>
              <button onClick={goBack} style={{ ...btnO, padding: "10px 16px", width: isMobile ? "100%" : "auto" }}>Back</button>
              <button
                onClick={onComplete}
                disabled={onboarding.submitting}
                style={{
                  ...btnG,
                  padding: "10px 16px",
                  width: isMobile ? "100%" : "auto",
                  opacity: onboarding.submitting ? 0.75 : 1,
                  cursor: onboarding.submitting ? "not-allowed" : "pointer",
                }}
              >
                {onboarding.submitting ? "Subscribing..." : `Subscribe ${onboarding.plan === "pro" ? "Pro" : "Basic"} & Launch Dashboard`}
              </button>
            </div>
          </div>
        )}

        {onboarding.error && <div style={{ marginTop: 12, color: G.red, fontSize: 10 }}>{onboarding.error}</div>}
      </div>
    </div>
  );
}
