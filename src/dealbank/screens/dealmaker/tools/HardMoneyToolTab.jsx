import { useMemo, useState } from "react";
import { HARD_MONEY_LENDERS } from "./toolData";

function numValue(raw) {
  return Number(String(raw || "").replace(/[^0-9.]/g, "")) || 0;
}

function parseMidRate(rateText) {
  const vals = String(rateText || "")
    .match(/[0-9]+(?:\.[0-9]+)?/g)
    ?.map(Number);

  if (!vals || vals.length === 0) return 10;
  if (vals.length === 1) return vals[0];
  return (vals[0] + vals[1]) / 2;
}

function parseMaxLtv(ltvText) {
  const match = String(ltvText || "").match(/([0-9]+(?:\.[0-9]+)?)%/);
  return match ? Number(match[1]) / 100 : 0.8;
}

function fmtCurrency(value) {
  return `$${Math.round(value || 0).toLocaleString()}`;
}

function makeBadge(text, color) {
  return {
    fontSize: 8,
    color,
    border: `1px solid ${color}66`,
    background: `${color}22`,
    borderRadius: 3,
    padding: "2px 7px",
    letterSpacing: 1,
    display: "inline-block",
  };
}

export default function HardMoneyToolTab({ ctx }) {
  const { G, card, btnG, btnO } = ctx;

  const [qualify, setQualify] = useState({
    purchase: "195000",
    rehab: "62000",
    arv: "385000",
    creditScore: "705",
    experience: "3",
    closeDays: "12",
  });
  const [showOptions, setShowOptions] = useState(false);

  const metrics = useMemo(() => {
    const purchase = numValue(qualify.purchase);
    const rehab = numValue(qualify.rehab);
    const arv = numValue(qualify.arv);
    const creditScore = numValue(qualify.creditScore);
    const experience = numValue(qualify.experience);

    const requested = purchase + (rehab * 0.9);
    const maxByArv = arv * 0.72;
    const likelyApproved = Math.max(0, Math.min(requested, maxByArv));
    const borrowerTier = creditScore >= 720 ? "Prime" : creditScore >= 680 ? "Standard" : "High Risk";
    const experienceBoost = experience >= 5 ? 0.25 : experience >= 2 ? 0.1 : -0.15;

    return {
      purchase,
      rehab,
      arv,
      requested,
      maxByArv,
      likelyApproved,
      borrowerTier,
      experienceBoost,
    };
  }, [qualify]);

  const lenderOptions = useMemo(() => {
    return HARD_MONEY_LENDERS.map((lender) => {
      const baseRate = parseMidRate(lender.rates);
      const ltvCap = parseMaxLtv(lender.maxLtv);
      const capByLtv = metrics.arv * ltvCap;
      const approved = Math.min(metrics.requested, capByLtv);
      const scoreAdjustment = metrics.borrowerTier === "Prime" ? -0.55 : metrics.borrowerTier === "Standard" ? 0 : 1.15;
      const finalRate = Math.max(8.5, baseRate + scoreAdjustment - metrics.experienceBoost);
      const monthlyInterest = (approved * (finalRate / 100)) / 12;
      const dscrHint = metrics.arv > 0 ? (approved / metrics.arv) * 100 : 0;

      return {
        ...lender,
        approved,
        finalRate,
        monthlyInterest,
        dscrHint,
      };
    }).sort((a, b) => b.approved - a.approved);
  }, [metrics]);

  const updateField = (field, value) => {
    const cleaned = String(value).replace(/[^0-9.]/g, "");
    setQualify((prev) => ({ ...prev, [field]: cleaned }));
  };

  return (
    <div>
      <div style={{ fontFamily: G.serif, fontSize: 18, marginBottom: 4 }}>Hard Money</div>
      <div style={{ fontSize: 10, color: G.muted, marginBottom: 14 }}>Pre-qualify deals against lender criteria before sending a borrower package.</div>

      <div style={{ ...card, marginBottom: 12 }}>
        <div style={{ fontFamily: G.serif, fontSize: 15, marginBottom: 8 }}>Borrower + Deal Qualifier</div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 8, marginBottom: 8 }}>
          <input value={qualify.purchase} onChange={(e) => updateField("purchase", e.target.value)} placeholder="Purchase" style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 6, color: G.text, padding: "8px 10px", fontFamily: G.mono }} />
          <input value={qualify.rehab} onChange={(e) => updateField("rehab", e.target.value)} placeholder="Rehab" style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 6, color: G.text, padding: "8px 10px", fontFamily: G.mono }} />
          <input value={qualify.arv} onChange={(e) => updateField("arv", e.target.value)} placeholder="ARV" style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 6, color: G.text, padding: "8px 10px", fontFamily: G.mono }} />
          <input value={qualify.creditScore} onChange={(e) => updateField("creditScore", e.target.value)} placeholder="Credit score" style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 6, color: G.text, padding: "8px 10px", fontFamily: G.mono }} />
          <input value={qualify.experience} onChange={(e) => updateField("experience", e.target.value)} placeholder="Flips completed" style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 6, color: G.text, padding: "8px 10px", fontFamily: G.mono }} />
          <input value={qualify.closeDays} onChange={(e) => updateField("closeDays", e.target.value)} placeholder="Close in days" style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 6, color: G.text, padding: "8px 10px", fontFamily: G.mono }} />
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
          <button onClick={() => setShowOptions((prev) => !prev)} style={{ ...btnG, fontSize: 9, padding: "8px 11px" }}>
            {showOptions ? "Hide Options" : "Show Financing Options"}
          </button>
          <button onClick={() => setQualify({ purchase: "", rehab: "", arv: "", creditScore: "", experience: "", closeDays: "" })} style={{ ...btnO, fontSize: 9, padding: "8px 11px" }}>
            Clear Inputs
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 8 }}>
          <div style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 7, padding: "9px 10px" }}>
            <div style={{ fontSize: 8, color: G.muted, marginBottom: 3 }}>Loan Requested</div>
            <div style={{ fontFamily: G.serif, fontSize: 17, color: G.text }}>{fmtCurrency(metrics.requested)}</div>
          </div>
          <div style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 7, padding: "9px 10px" }}>
            <div style={{ fontSize: 8, color: G.muted, marginBottom: 3 }}>Likely Approval</div>
            <div style={{ fontFamily: G.serif, fontSize: 17, color: G.green }}>{fmtCurrency(metrics.likelyApproved)}</div>
          </div>
          <div style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 7, padding: "9px 10px" }}>
            <div style={{ fontSize: 8, color: G.muted, marginBottom: 3 }}>ARV Cap (72%)</div>
            <div style={{ fontFamily: G.serif, fontSize: 17, color: G.gold }}>{fmtCurrency(metrics.maxByArv)}</div>
          </div>
          <div style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 7, padding: "9px 10px" }}>
            <div style={{ fontSize: 8, color: G.muted, marginBottom: 3 }}>Borrower Tier</div>
            <div style={{ fontFamily: G.serif, fontSize: 17, color: metrics.borrowerTier === "Prime" ? G.green : metrics.borrowerTier === "Standard" ? G.gold : G.red }}>{metrics.borrowerTier}</div>
          </div>
        </div>
      </div>

      {showOptions && (
        <div style={{ display: "grid", gap: 8 }}>
          {lenderOptions.map((lender) => (
            <div key={lender.id} style={{ ...card, borderColor: `${G.green}33` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontFamily: G.serif, fontSize: 16, color: G.text, marginBottom: 2 }}>{lender.name}</div>
                  <div style={{ fontSize: 9, color: G.muted }}>{lender.closeTime} close · {lender.points} pts</div>
                </div>
                <div style={makeBadge(lender.badge, G.green)}>{lender.badge}</div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 7, marginBottom: 8 }}>
                <div style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 6, padding: "8px 9px" }}>
                  <div style={{ fontSize: 8, color: G.muted, marginBottom: 3 }}>Approved Loan</div>
                  <div style={{ fontFamily: G.serif, fontSize: 15, color: G.green }}>{fmtCurrency(lender.approved)}</div>
                </div>
                <div style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 6, padding: "8px 9px" }}>
                  <div style={{ fontSize: 8, color: G.muted, marginBottom: 3 }}>Estimated Rate</div>
                  <div style={{ fontFamily: G.serif, fontSize: 15, color: G.gold }}>{lender.finalRate.toFixed(2)}%</div>
                </div>
                <div style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 6, padding: "8px 9px" }}>
                  <div style={{ fontSize: 8, color: G.muted, marginBottom: 3 }}>Monthly Interest</div>
                  <div style={{ fontFamily: G.serif, fontSize: 15, color: G.text }}>{fmtCurrency(lender.monthlyInterest)}</div>
                </div>
                <div style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 6, padding: "8px 9px" }}>
                  <div style={{ fontSize: 8, color: G.muted, marginBottom: 3 }}>LTV on ARV</div>
                  <div style={{ fontFamily: G.serif, fontSize: 15, color: G.text }}>{lender.dscrHint.toFixed(1)}%</div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 8 }}>
                {lender.features.map((feature) => (
                  <div key={feature} style={{ fontSize: 9, color: G.text, display: "flex", gap: 5 }}>
                    <span style={{ color: G.green }}>✓</span>
                    {feature}
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                <button style={{ ...btnG, fontSize: 8, padding: "6px 9px" }}>Send Scenario</button>
                <button style={{ ...btnO, fontSize: 8, padding: "6px 9px" }}>Request Term Sheet</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
