import useIsMobile from "../core/useIsMobile";

const REALTOR_MARKETS = [
  "Sacramento",
  "Stockton",
  "Modesto",
  "Fresno",
  "Bakersfield",
  "Roseville",
  "Elk Grove",
  "Folsom",
  "Davis",
  "Vacaville",
];

const REALTOR_SPECIALTIES = [
  "Fix & Flip Exits",
  "Fast Closings",
  "Investor Properties",
  "Luxury Flips",
  "Multi-Family",
  "REO/Foreclosure",
  "Probate",
  "New Construction",
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

function ChoiceGrid({ items, selectedItems, onToggle, G }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 10 }}>
      {items.map((item) => {
        const selected = selectedItems.includes(item);
        return (
          <button
            type="button"
            key={item}
            onClick={() => onToggle(item)}
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
            <div style={{ fontFamily: G.serif, fontSize: 13, fontWeight: "bold", lineHeight: 1.25 }}>{item}</div>
            <div style={{ fontSize: 8, color: selected ? G.green : G.muted, letterSpacing: 2, marginTop: 4 }}>
              {selected ? "SELECTED" : "TAP TO SELECT"}
            </div>
          </button>
        );
      })}
    </div>
  );
}

export default function RealtorOnboardingScreen({
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

  const setField = (field, value) => {
    setOnboarding((prev) => ({ ...prev, [field]: value, error: "" }));
  };

  const toggleMarket = (market) => {
    setOnboarding((prev) => {
      const selected = prev.markets.includes(market);
      return {
        ...prev,
        markets: selected ? prev.markets.filter((item) => item !== market) : [...prev.markets, market],
        error: "",
      };
    });
  };

  const toggleSpecialty = (specialty) => {
    setOnboarding((prev) => {
      const selected = prev.specialties.includes(specialty);
      return {
        ...prev,
        specialties: selected ? prev.specialties.filter((item) => item !== specialty) : [...prev.specialties, specialty],
        error: "",
      };
    });
  };

  const goNext = () => {
    const required = [
      onboarding.dreLicense,
      onboarding.brokerage,
      onboarding.avgDaysToClose,
      onboarding.dealsPerYear,
      onboarding.bio,
    ];

    if (required.some((value) => String(value || "").trim() === "")) {
      setOnboarding((prev) => ({ ...prev, error: "Complete all profile fields before continuing." }));
      return;
    }

    setOnboarding((prev) => ({ ...prev, step: 2, error: "" }));
  };

  const goBack = () => {
    setOnboarding((prev) => ({ ...prev, step: 1, error: "" }));
  };

  const launch = () => {
    if (onboarding.markets.length === 0 || onboarding.specialties.length === 0) {
      setOnboarding((prev) => ({ ...prev, error: "Select at least one market and one specialty." }));
      return;
    }

    onComplete();
  };

  return (
    <div style={{ minHeight: "100vh", background: G.bg, color: G.text, fontFamily: G.mono }}>
      <div style={{ background: G.surface, borderBottom: `1px solid ${G.border}`, padding: isMobile ? "12px" : "12px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
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
              <div style={{ fontFamily: G.serif, fontSize: isMobile ? 16 : 18, fontWeight: "bold" }}>Realtor Onboarding</div>
              <div style={{ fontSize: 9, color: G.muted, letterSpacing: isMobile ? 1 : 2, marginTop: 2 }}>SET UP PROFILE TO RECEIVE DEAL REFERRALS</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontSize: 10, color: G.muted, display: "none" }}>{userName || "Realtor"}</div>
            <button onClick={onSignOut} style={{ ...btnO, padding: "6px 10px", fontSize: 9 }}>
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 940, margin: "0 auto", padding: isMobile ? "14px 12px 20px" : "20px 16px 28px" }}>
        <div style={{ ...card, marginBottom: 14 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {[1, 2].map((step) => {
              const active = onboarding.step === step;
              const done = onboarding.step > step;
              const color = active || done ? G.green : G.muted;
              return (
                <div key={step} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 999,
                      border: `1px solid ${active || done ? G.green : G.border}`,
                      background: active || done ? G.greenGlow : "transparent",
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
                    {step === 1 ? "Profile" : "Markets"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {onboarding.step === 1 && (
          <div style={card}>
            <div style={{ fontFamily: G.serif, fontSize: 20, fontWeight: "bold", marginBottom: 5 }}>Step 1 - Realtor Profile</div>
            <div style={{ fontSize: 10, color: G.muted, marginBottom: 16 }}>Share your brokerage track record so deal makers can match confidently.</div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
              <div>
                <div style={lbl}>DRE License #</div>
                <input value={onboarding.dreLicense} onChange={(event) => setField("dreLicense", event.target.value)} style={{ ...smIn, background: G.surface, border: `1px solid ${G.border}`, borderRadius: 6, padding: "9px 11px" }} />
              </div>
              <div>
                <div style={lbl}>Brokerage Name</div>
                <input value={onboarding.brokerage} onChange={(event) => setField("brokerage", event.target.value)} style={{ ...smIn, background: G.surface, border: `1px solid ${G.border}`, borderRadius: 6, padding: "9px 11px" }} />
              </div>
              <div>
                <div style={lbl}>Avg Days to Close</div>
                <input type="number" min="0" value={onboarding.avgDaysToClose} onChange={(event) => setField("avgDaysToClose", event.target.value)} style={{ ...smIn, background: G.surface, border: `1px solid ${G.border}`, borderRadius: 6, padding: "9px 11px" }} />
              </div>
              <div>
                <div style={lbl}>Deals Closed / Year</div>
                <input type="number" min="0" value={onboarding.dealsPerYear} onChange={(event) => setField("dealsPerYear", event.target.value)} style={{ ...smIn, background: G.surface, border: `1px solid ${G.border}`, borderRadius: 6, padding: "9px 11px" }} />
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={lbl}>Bio</div>
              <textarea value={onboarding.bio} onChange={(event) => setField("bio", event.target.value)} rows={4} style={{ width: "100%", boxSizing: "border-box", background: G.surface, border: `1px solid ${G.border}`, borderRadius: 6, color: G.text, fontFamily: G.mono, padding: "10px 11px", outline: "none", resize: "vertical", fontSize: 12 }} />
            </div>

            <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end" }}>
              <button onClick={goNext} style={{ ...btnG, padding: "10px 16px", width: isMobile ? "100%" : "auto" }}>
                Continue
              </button>
            </div>
          </div>
        )}

        {onboarding.step === 2 && (
          <div style={card}>
            <div style={{ fontFamily: G.serif, fontSize: 20, fontWeight: "bold", marginBottom: 5 }}>Step 2 - Markets & Specialties</div>
            <div style={{ fontSize: 10, color: G.muted, marginBottom: 16 }}>Pick your coverage cities and expertise focus to optimize referral quality.</div>

            <div style={{ marginBottom: 10, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <div style={badgeStyle(onboarding.markets.length > 0 ? G.green : G.gold)}>{onboarding.markets.length} market(s)</div>
              <div style={badgeStyle(onboarding.specialties.length > 0 ? G.green : G.gold)}>{onboarding.specialties.length} specialty(s)</div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={lbl}>Markets</div>
              <ChoiceGrid items={REALTOR_MARKETS} selectedItems={onboarding.markets} onToggle={toggleMarket} G={G} />
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={lbl}>Specialties</div>
              <ChoiceGrid items={REALTOR_SPECIALTIES} selectedItems={onboarding.specialties} onToggle={toggleSpecialty} G={G} />
            </div>

            <div style={{ ...card, background: "#1a1200", borderColor: `${G.gold}66`, padding: 14, marginBottom: 14 }}>
              <div style={{ fontSize: 9, color: G.gold, letterSpacing: 3, marginBottom: 5 }}>SPLIT DISCLOSURE</div>
              <div style={{ fontSize: 10, color: G.text, lineHeight: 1.7 }}>
                DealBank referral split is <span style={{ color: G.gold, fontWeight: "bold" }}>75/25</span>.
                Realtor receives 75% of commission, DealBank receives 25% referral share at close.
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", flexDirection: isMobile ? "column" : "row" }}>
              <button onClick={goBack} style={{ ...btnO, padding: "10px 16px", width: isMobile ? "100%" : "auto" }}>Back</button>
              <button onClick={launch} disabled={onboarding.submitting} style={{ ...btnG, padding: "10px 16px", width: isMobile ? "100%" : "auto", opacity: onboarding.submitting ? 0.75 : 1, cursor: onboarding.submitting ? "not-allowed" : "pointer" }}>
                {onboarding.submitting ? "Launching..." : "Launch Realtor Dashboard"}
              </button>
            </div>
          </div>
        )}

        {onboarding.error && <div style={{ marginTop: 12, color: G.red, fontSize: 10 }}>{onboarding.error}</div>}
      </div>
    </div>
  );
}
