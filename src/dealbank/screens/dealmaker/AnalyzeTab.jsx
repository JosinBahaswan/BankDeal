import { useMemo, useState } from "react";
import DataSearchBar from "../../components/DataSearchBar";

const OFFER_PRESETS = [55, 60, 65, 70];

function sanitizeDecimalInput(value) {
  return String(value || "").replace(/[^0-9.]/g, "");
}

function sanitizeIntInput(value) {
  return String(value || "").replace(/[^0-9]/g, "");
}

export default function AnalyzeTab({ ctx }) {
  const {
    G,
    card,
    lbl,
    smIn,
    btnG,
    btnO,
    address,
    setAddress,
    lookupProperty,
    lookLoad,
    lookErr,
    arvNum,
    offerRef,
    fmt,
    offer,
    offerPct,
    setOfferPct,
    sixtyT,
    totalReno,
    softNum,
    totalHM,
    holdMonths,
    setHoldMonths,
    holdMonthly,
    setHoldMonthly,
    insuranceAnnual,
    setInsuranceAnnual,
    agentFeePct,
    setAgentFeePct,
    closingCostPct,
    setClosingCostPct,
    holdN,
    insN,
    agentN,
    closingN,
    totalHolding,
    totalSelling,
    arvOvr,
    setArvOvr,
    allIn,
    projProfit,
    roi,
    anlTab,
    setAnlTab,
    estimateReno,
    renoLoad,
    renoNote,
    RENO_KEYS,
    reno,
    setReno,
    hardRate,
    setHardRate,
    loanMo,
    setLoanMo,
    loanPts,
    setLoanPts,
    compsData,
    propertyIntel,
    mktNotes,
    saveDeal,
    runAnalysis,
    anlLoad,
    generatePitch,
    pitchLoad,
    savedMsg,
    anlErr,
    pitch,
    setPitch,
    analysis,
    isMobile,
  } = ctx;

  const [showHolding, setShowHolding] = useState(true);
  const [showSelling, setShowSelling] = useState(true);
  const [compsSearch, setCompsSearch] = useState("");

  const offerPctNum = Math.min(100, Math.max(0, parseFloat(offerPct) || 60));
  const subTabs = [
    { id: "offer-costs", label: "Offer & Costs" },
    { id: "full-pnl", label: "Full P&L" },
    { id: "seller-pitch", label: "Seller Pitch" },
  ];

  const costSegments = useMemo(
    () => [
      { id: "offer", label: "Purchase", value: Math.max(0, Math.round(offer)), color: G.green },
      { id: "reno", label: "Rehab", value: Math.max(0, Math.round(totalReno)), color: G.gold },
      { id: "holding", label: "Holding", value: Math.max(0, Math.round(totalHolding)), color: G.blue },
      { id: "selling", label: "Selling", value: Math.max(0, Math.round(totalSelling)), color: "#fb923c" },
      { id: "hm", label: "Hard Money", value: Math.max(0, Math.round(totalHM)), color: G.red },
    ],
    [G.blue, G.gold, G.green, G.red, offer, totalHolding, totalReno, totalSelling, totalHM],
  );

  const totalBarValue = costSegments.reduce((sum, item) => sum + item.value, 0);
  const filteredComps = useMemo(() => {
    const query = compsSearch.trim().toLowerCase();
    if (!query) return compsData || [];

    return (compsData || []).filter((comp) => {
      const searchable = [
        comp.address,
        String(comp.price || ""),
        String(comp.squareFootage || ""),
        String(comp.bedrooms || ""),
        String(comp.bathrooms || ""),
        String(comp.daysOld || ""),
      ].join(" ").toLowerCase();

      return searchable.includes(query);
    });
  }, [compsData, compsSearch]);

  const renderMd = (text) =>
    text
      .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#e8f0e8;font-size:13px">$1</strong>')
      .replace(/\n\n/g, '</p><p style="margin:8px 0">')
      .replace(/\n/g, "<br/>");

  async function copyPitchToClipboard() {
    if (!pitch) return;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(pitch);
        return;
      }
    } catch {
      // fall through to legacy copy
    }

    const element = document.createElement("textarea");
    element.value = pitch;
    document.body.appendChild(element);
    element.select();
    document.execCommand("copy");
    document.body.removeChild(element);
  }

  const pnlRows = [
    { section: "Revenue", rows: [{ label: "After Repair Value (ARV)", value: arvNum, color: G.green }] },
    {
      section: "Acquisition + Rehab",
      rows: [
        { label: "Purchase Price (Offer)", value: offer, color: G.text },
        { label: "Total Renovation", value: totalReno, color: G.gold },
      ],
    },
    {
      section: "Holding Costs",
      rows: [
        { label: `Carry Cost (${holdMonths || 0} mo x ${fmt(holdMonthly || 0)})`, value: holdN, color: G.text },
        { label: `Insurance (prorated from ${fmt(insuranceAnnual || 0)}/yr)`, value: insN, color: G.text },
      ],
    },
    {
      section: "Selling Costs",
      rows: [
        { label: `Agent Commission (${agentFeePct || 0}%)`, value: agentN, color: G.text },
        { label: `Closing Costs (${closingCostPct || 0}%)`, value: closingN, color: G.text },
      ],
    },
    {
      section: "Financing",
      rows: [
        { label: `Hard Money (${hardRate || 0}% / ${loanMo || 0} mo / ${loanPts || 0} pts)`, value: totalHM, color: G.gold },
      ],
    },
  ];

  return (
    <div>
      <div style={{ ...card, marginBottom: 12 }}>
        <div style={lbl}>Property Address</div>
        <input
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && lookupProperty()}
          placeholder="Enter full address (e.g. 123 Main St, Sacramento, CA 95814)"
          style={{ ...smIn, fontSize: 14, background: G.surface, border: `1px solid ${G.border}`, borderRadius: 4, padding: "10px 12px", marginBottom: 8 }}
        />
        <button onClick={lookupProperty} disabled={lookLoad} style={{ ...btnG, width: "100%", background: lookLoad ? "#1a2e1a" : G.green, color: lookLoad ? G.muted : "#000" }}>
          {lookLoad ? "Analyzing property..." : "Analyze Property - Get Comps, ARV + Offer Price"}
        </button>
      </div>
      {lookErr && <div style={{ color: G.red, fontSize: 10, marginBottom: 10 }}>Warning: {lookErr}</div>}
      {propertyIntel?.provider && (
        <div style={{ fontSize: 10, color: G.muted, marginBottom: 10 }}>
          Data source: {propertyIntel.provider}{propertyIntel?.endpoint ? ` · ${propertyIntel.endpoint}` : ""}
        </div>
      )}

      {arvNum > 0 && (
        <div
          style={isMobile
            ? { display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 6, marginBottom: 8 }
            : { display: "flex", gap: 4, marginBottom: 8, flexWrap: "wrap" }}
        >
          {subTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setAnlTab(tab.id)}
              style={{
                ...btnO,
                padding: isMobile ? "8px 10px" : "6px 12px",
                fontSize: isMobile ? 9 : 8,
                borderColor: anlTab === tab.id ? G.green : G.border,
                color: anlTab === tab.id ? G.green : G.muted,
                background: anlTab === tab.id ? G.greenGlow : "transparent",
                gridColumn: isMobile && tab.id === "seller-pitch" ? "1 / -1" : "auto",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {arvNum > 0 && anlTab === "offer-costs" && (
        <div ref={offerRef} style={{ background: "#051208", border: `2px solid ${G.green}`, borderRadius: 10, padding: isMobile ? "14px" : "20px 24px", marginBottom: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 20 }}>
            <div>
              <div style={{ fontSize: 9, color: G.green, letterSpacing: 4, marginBottom: 4 }}>SUGGESTED OFFER PRICE</div>
              <div style={{ fontFamily: G.serif, fontSize: isMobile ? 34 : 46, color: "#4ade80", fontWeight: "bold", lineHeight: 1, marginBottom: 6 }}>{fmt(offer)}</div>
              <div style={{ fontSize: 10, color: G.muted, marginBottom: 12 }}>
                {offerPctNum}% of ARV ({fmt(arvNum)}) minus all costs
              </div>

              <div style={{ marginBottom: 10 }}>
                <div style={{ ...lbl, marginBottom: 4 }}>Offer Percentage</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
                  {OFFER_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setOfferPct(String(preset))}
                      style={{
                        ...btnO,
                        padding: "5px 10px",
                        fontSize: 8,
                        borderColor: offerPctNum === preset ? G.green : G.border,
                        color: offerPctNum === preset ? G.green : G.muted,
                        background: offerPctNum === preset ? G.greenGlow : "transparent",
                      }}
                    >
                      {preset}%
                    </button>
                  ))}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 9, color: G.muted }}>CUSTOM %</span>
                  <input
                    value={offerPct}
                    onChange={(event) => setOfferPct(sanitizeDecimalInput(event.target.value))}
                    style={{ ...smIn, width: 80, borderBottom: `1px solid ${G.border}`, fontSize: 13, textAlign: "right" }}
                  />
                </div>
              </div>

              <div style={{ background: "#071a0e", border: `1px solid ${G.greenDim}`, borderRadius: 6, padding: "12px" }}>
                {[
                  ["ARV", fmt(arvNum), G.green],
                  [`x ${offerPctNum}%`, fmt(sixtyT), G.green],
                  ["- Rehab", fmt(Math.round(totalReno)), G.gold],
                  ["- Soft Total", fmt(Math.round(softNum)), G.gold],
                  ["- Hard Money", fmt(Math.round(totalHM)), G.gold],
                ].map(([label, value, color]) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 11 }}>
                    <span style={{ color: G.muted }}>{label}</span>
                    <span style={{ color, fontFamily: G.serif, fontWeight: "bold" }}>{value}</span>
                  </div>
                ))}
                <div style={{ height: 1, background: G.border, margin: "8px 0" }} />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                  <span style={{ color: G.green, fontWeight: "bold" }}>= Offer Price</span>
                  <span style={{ color: "#4ade80", fontFamily: G.serif, fontWeight: "bold" }}>{fmt(offer)}</span>
                </div>
              </div>

              <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 9, color: G.muted }}>OVERRIDE ARV $</span>
                <input
                  value={arvOvr ? Number(arvOvr).toLocaleString() : ""}
                  onChange={(event) => setArvOvr(event.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="adjust"
                  style={{ ...smIn, width: isMobile ? 110 : 120, borderBottom: `1px solid ${G.border}`, fontSize: 12 }}
                />
              </div>
            </div>

            <div>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,minmax(0,1fr))" : "repeat(auto-fit,minmax(120px,1fr))", gap: 8, marginBottom: 10 }}>
                {[
                  { l: "All-In", v: fmt(Math.round(allIn)), c: G.text },
                  { l: "Profit", v: fmt(Math.round(projProfit)), c: projProfit > 0 ? G.green : G.red },
                  { l: "ROI", v: `${roi.toFixed(1)}%`, c: roi >= 20 ? G.green : roi >= 10 ? G.gold : G.red },
                  { l: "Hard Money", v: fmt(Math.round(totalHM)), c: G.gold },
                ].map(({ l, v, c }) => (
                  <div key={l} style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 5, padding: "9px 11px" }}>
                    <div style={{ ...lbl, marginBottom: 2 }}>{l}</div>
                    <div style={{ fontFamily: G.serif, fontSize: 14, color: c, fontWeight: "bold" }}>{v}</div>
                  </div>
                ))}
              </div>

              <div style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 6, padding: "10px 12px", marginBottom: 10 }}>
                <div style={{ ...lbl, color: G.green, marginBottom: 6 }}>Stacked Cost Breakdown</div>
                <div style={{ height: 16, background: "#0a0f0a", borderRadius: 999, overflow: "hidden", border: `1px solid ${G.border}`, display: "flex", marginBottom: 8 }}>
                  {totalBarValue > 0
                    ? costSegments.map((segment) => (
                      <div
                        key={segment.id}
                        title={`${segment.label}: ${fmt(segment.value)}`}
                        style={{
                          width: `${Math.max((segment.value / totalBarValue) * 100, 1)}%`,
                          background: segment.color,
                          minWidth: 2,
                        }}
                      />
                    ))
                    : <div style={{ width: "100%", background: G.faint }} />}
                </div>

                {costSegments.map((segment) => (
                  <div key={segment.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 10, marginBottom: 4 }}>
                    <span style={{ color: G.muted }}>
                      <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: segment.color, marginRight: 6 }} />
                      {segment.label}
                    </span>
                    <span style={{ color: G.text }}>{fmt(segment.value)}</span>
                  </div>
                ))}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3,minmax(0,1fr))", gap: 7 }}>
                {[
                  { l: "Rate %", v: hardRate, s: setHardRate },
                  { l: "Months", v: loanMo, s: setLoanMo },
                  { l: "Points", v: loanPts, s: setLoanPts },
                ].map(({ l, v, s }) => (
                  <div key={l} style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 4, padding: "8px 10px" }}>
                    <div style={{ fontSize: 7, color: G.muted, letterSpacing: 2, marginBottom: 2 }}>{l.toUpperCase()}</div>
                    <input value={v} onChange={(event) => s(sanitizeDecimalInput(event.target.value))} style={{ ...smIn, fontSize: 15, fontFamily: G.serif, fontWeight: "bold" }} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3,minmax(0,1fr))", gap: 7, marginBottom: 10 }}>
              <button
                onClick={estimateReno}
                disabled={renoLoad}
                style={{ ...btnG, width: "100%", fontSize: 9, padding: "8px", background: renoLoad ? "#1a2e1a" : "#166534", color: renoLoad ? G.muted : G.green, border: `1px solid ${G.green}33`, gridColumn: isMobile ? "auto" : "1 / span 3" }}
              >
                {renoLoad ? "Estimating..." : "AI Estimate Reno Costs"}
              </button>
            </div>

            {renoNote && <div style={{ fontSize: 9, color: "#7070aa", marginBottom: 8, lineHeight: 1.6 }}>{renoNote}</div>}

            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3,minmax(0,1fr))", gap: 6, marginBottom: 10 }}>
              {RENO_KEYS.map(({ key, label: itemLabel }) => (
                <div key={key} style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 4, padding: "7px 9px" }}>
                  <div style={{ fontSize: 7, color: G.muted, letterSpacing: 2, marginBottom: 2 }}>{itemLabel.toUpperCase()}</div>
                  <div style={{ display: "flex", gap: 2 }}>
                    <span style={{ color: G.muted, fontSize: 11 }}>$</span>
                    <input value={reno[key] ? Number(reno[key]).toLocaleString() : ""} onChange={(event) => setReno((prev) => ({ ...prev, [key]: sanitizeIntInput(event.target.value) }))} placeholder="0" style={{ ...smIn, fontSize: 12 }} />
                  </div>
                </div>
              ))}
            </div>

            <div style={{ ...card, background: G.surface, marginBottom: 8, borderColor: `${G.blue}44` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: showHolding ? 8 : 0 }}>
                <div style={{ ...lbl, color: G.blue, marginBottom: 0 }}>Holding Costs</div>
                <button onClick={() => setShowHolding((prev) => !prev)} style={{ ...btnO, padding: "4px 8px", fontSize: 8 }}>
                  {showHolding ? "Collapse" : "Expand"}
                </button>
              </div>
              {showHolding && (
                <div>
                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3,minmax(0,1fr))", gap: 7, marginBottom: 8 }}>
                    {[
                      { l: "Hold Months", v: holdMonths, s: setHoldMonths, intOnly: true },
                      { l: "Monthly Carry $", v: holdMonthly, s: setHoldMonthly, intOnly: true },
                      { l: "Insurance / Yr $", v: insuranceAnnual, s: setInsuranceAnnual, intOnly: true },
                    ].map(({ l, v, s, intOnly }) => (
                      <div key={l} style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 4, padding: "8px 10px" }}>
                        <div style={{ fontSize: 7, color: G.muted, letterSpacing: 2, marginBottom: 2 }}>{l.toUpperCase()}</div>
                        <input value={v} onChange={(event) => s(intOnly ? sanitizeIntInput(event.target.value) : sanitizeDecimalInput(event.target.value))} style={{ ...smIn, fontSize: 14, fontFamily: G.serif, fontWeight: "bold" }} />
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: 10, color: G.muted }}>
                    holdN = {fmt(Math.round(holdN))} | insN = {fmt(Math.round(insN))} | holding total = <strong style={{ color: G.text }}>{fmt(Math.round(totalHolding))}</strong>
                  </div>
                </div>
              )}
            </div>

            <div style={{ ...card, background: G.surface, borderColor: "#fb923c55" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: showSelling ? 8 : 0 }}>
                <div style={{ ...lbl, color: "#fb923c", marginBottom: 0 }}>Selling Costs</div>
                <button onClick={() => setShowSelling((prev) => !prev)} style={{ ...btnO, padding: "4px 8px", fontSize: 8 }}>
                  {showSelling ? "Collapse" : "Expand"}
                </button>
              </div>
              {showSelling && (
                <div>
                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2,minmax(0,1fr))", gap: 7, marginBottom: 8 }}>
                    {[
                      { l: "Agent %", v: agentFeePct, s: setAgentFeePct },
                      { l: "Closing %", v: closingCostPct, s: setClosingCostPct },
                    ].map(({ l, v, s }) => (
                      <div key={l} style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 4, padding: "8px 10px" }}>
                        <div style={{ fontSize: 7, color: G.muted, letterSpacing: 2, marginBottom: 2 }}>{l.toUpperCase()}</div>
                        <input value={v} onChange={(event) => s(sanitizeDecimalInput(event.target.value))} style={{ ...smIn, fontSize: 14, fontFamily: G.serif, fontWeight: "bold" }} />
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: 10, color: G.muted }}>
                    agentN = {fmt(Math.round(agentN))} | closingN = {fmt(Math.round(closingN))} | selling total = <strong style={{ color: G.text }}>{fmt(Math.round(totalSelling))}</strong>
                  </div>
                </div>
              )}
            </div>

            <div style={{ marginTop: 8, fontSize: 10, color: G.muted }}>
              softTotal = holdN + insN + agentN + closingN = <strong style={{ color: G.green }}>{fmt(Math.round(softNum))}</strong>
            </div>
          </div>
        </div>
      )}

      {arvNum > 0 && anlTab === "full-pnl" && (
        <div style={{ ...card, marginBottom: 12, borderColor: `${G.green}44` }}>
          <div style={{ ...lbl, color: G.green, marginBottom: 8 }}>Full P&L Statement</div>
          <div style={{ fontFamily: G.serif, fontSize: 16, color: G.text, marginBottom: 12 }}>{address || "Current Deal"}</div>

          {pnlRows.map((section) => (
            <div key={section.section} style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 9, color: G.muted, letterSpacing: 2, marginBottom: 4 }}>{section.section.toUpperCase()}</div>
              {section.rows.map((row) => (
                <div key={row.label} style={{ display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${G.faint}`, padding: "6px 0", fontSize: 11 }}>
                  <span style={{ color: G.text }}>{row.label}</span>
                  <span style={{ color: row.color || G.text, fontFamily: G.serif, fontWeight: "bold" }}>{fmt(Math.round(row.value || 0))}</span>
                </div>
              ))}
            </div>
          ))}

          <div style={{ height: 1, background: G.border, margin: "10px 0" }} />
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3,minmax(0,1fr))", gap: 8 }}>
            {[
              { l: "Total Revenue", v: fmt(Math.round(arvNum)), c: G.green },
              { l: "Total Costs", v: fmt(Math.round(allIn)), c: G.gold },
              { l: "Net Profit", v: fmt(Math.round(projProfit)), c: projProfit >= 0 ? G.green : G.red },
              { l: "ROI", v: `${roi.toFixed(1)}%`, c: roi >= 20 ? G.green : roi >= 10 ? G.gold : G.red },
              { l: "Gross Margin", v: `${arvNum > 0 ? ((projProfit / arvNum) * 100).toFixed(1) : "0.0"}%`, c: G.text },
              { l: "Offer % of ARV", v: `${offerPctNum.toFixed(1)}%`, c: G.text },
            ].map(({ l, v, c }) => (
              <div key={l} style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 5, padding: "10px" }}>
                <div style={{ ...lbl, marginBottom: 3 }}>{l}</div>
                <div style={{ fontFamily: G.serif, fontSize: 15, color: c, fontWeight: "bold" }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {arvNum > 0 && anlTab === "seller-pitch" && (
        <div style={{ ...card, borderColor: `${G.gold}44`, marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 8, flexWrap: "wrap" }}>
            <div style={{ ...lbl, color: G.gold, marginBottom: 0 }}>Seller Pitch Letter</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button onClick={generatePitch} disabled={pitchLoad} style={{ ...btnO, padding: "4px 10px", fontSize: 8, borderColor: G.gold, color: G.gold }}>
                {pitchLoad ? "Writing..." : "Generate"}
              </button>
              {pitch && (
                <button onClick={copyPitchToClipboard} style={{ ...btnO, padding: "4px 10px", fontSize: 8, borderColor: G.gold, color: G.gold }}>
                  Copy
                </button>
              )}
              {pitch && (
                <button onClick={() => setPitch("")} style={{ ...btnO, padding: "4px 10px", fontSize: 8 }}>
                  Clear
                </button>
              )}
            </div>
          </div>

          <div style={{ fontSize: 10, color: G.muted, lineHeight: 1.7, marginBottom: 10 }}>
            Generate a 4-paragraph seller pitch tied to the live deal math from Offer & Costs and Full P&L.
          </div>

          {pitchLoad && <div style={{ fontSize: 11, color: G.muted, padding: "10px 0" }}>Writing your pitch letter...</div>}
          {!pitchLoad && !pitch && <div style={{ fontSize: 11, color: G.muted, padding: "10px 0" }}>No pitch yet. Click Generate.</div>}
          {pitch && <div style={{ fontSize: 12, lineHeight: 1.9, color: "#c0b888", whiteSpace: "pre-wrap", fontFamily: G.serif }}>{pitch}</div>}
        </div>
      )}

      {compsData?.length > 0 && (
        <div style={{ ...card, marginBottom: 12 }}>
          <div style={{ ...lbl, color: G.green, marginBottom: 8 }}>Comparable Sales - 2-Mile Radius</div>
          <DataSearchBar
            G={G}
            value={compsSearch}
            onChange={setCompsSearch}
            placeholder="Search comps by address, price, sqft, beds/baths, or recency"
            resultCount={filteredComps.length}
            totalCount={(compsData || []).length}
          />
          <div style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 5, overflow: "hidden" }}>
            {isMobile ? (
              <div style={{ display: "grid", gap: 7, padding: "8px" }}>
                {filteredComps.map((comp, index) => (
                  <div key={`${comp.address}-${index}`} style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 6, padding: "8px 9px" }}>
                    <div style={{ fontSize: 10, color: G.text, fontWeight: 600, marginBottom: 4 }}>{comp.address}</div>
                    <div style={{ fontFamily: G.serif, fontSize: 14, color: G.green, fontWeight: "bold", marginBottom: 6 }}>{fmt(comp.price)}</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 6 }}>
                      <div style={{ fontSize: 9, color: G.muted }}>Sqft: <span style={{ color: G.text }}>{(comp.squareFootage || 0).toLocaleString()}</span></div>
                      <div style={{ fontSize: 9, color: G.muted }}>Beds/Baths: <span style={{ color: G.text }}>{comp.bedrooms}/{comp.bathrooms}</span></div>
                      <div style={{ fontSize: 9, color: G.muted }}>Sold: <span style={{ color: G.text }}>{comp.daysOld}d</span></div>
                    </div>
                  </div>
                ))}
                {filteredComps.length === 0 && (
                  <div style={{ padding: "4px 2px", fontSize: 10, color: G.muted }}>
                    No comparable sales match your search.
                  </div>
                )}
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <div style={{ display: "grid", gridTemplateColumns: "2.5fr 1fr 0.8fr 0.8fr 0.6fr", minWidth: 560, padding: "6px 12px", background: G.card, borderBottom: `1px solid ${G.border}` }}>
                  {["ADDRESS", "PRICE", "SQFT", "BED/BATH", "SOLD"].map((head) => (
                    <div key={head} style={{ fontSize: 8, color: G.muted, letterSpacing: 2 }}>{head}</div>
                  ))}
                </div>
                {filteredComps.map((comp, index) => (
                  <div key={index} style={{ display: "grid", gridTemplateColumns: "2.5fr 1fr 0.8fr 0.8fr 0.6fr", minWidth: 560, padding: "8px 12px", borderBottom: index < filteredComps.length - 1 ? `1px solid ${G.faint}` : "none", background: index % 2 === 0 ? "transparent" : G.surface }}>
                    <div style={{ fontSize: 10, color: G.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{comp.address}</div>
                    <div style={{ fontSize: 11, color: G.green, fontFamily: G.serif, fontWeight: "bold" }}>{fmt(comp.price)}</div>
                    <div style={{ fontSize: 10, color: G.text }}>{(comp.squareFootage || 0).toLocaleString()}</div>
                    <div style={{ fontSize: 10, color: G.text }}>{comp.bedrooms}bd/{comp.bathrooms}ba</div>
                    <div style={{ fontSize: 10, color: G.muted }}>{comp.daysOld}d</div>
                  </div>
                ))}
                {filteredComps.length === 0 && (
                  <div style={{ padding: "10px 12px", fontSize: 10, color: G.muted }}>
                    No comparable sales match your search.
                  </div>
                )}
              </div>
            )}
          </div>
          {mktNotes && <div style={{ marginTop: 8, fontSize: 10, color: G.muted, lineHeight: 1.7 }}>{mktNotes}</div>}
        </div>
      )}

      {arvNum > 0 && (
        <div style={{ display: "flex", gap: 8, marginBottom: 10, flexDirection: isMobile ? "column" : "row" }}>
          <button onClick={saveDeal} style={{ ...btnG, flex: 1, fontSize: 10 }}>Save to Pipeline</button>
          <button onClick={runAnalysis} disabled={anlLoad} style={{ ...btnO, flex: 1, fontSize: 10, borderColor: G.green, color: G.green }}>
            {anlLoad ? "Analyzing..." : "Run Analysis"}
          </button>
          <button onClick={() => setAnlTab("seller-pitch")} style={{ ...btnO, flex: 1, fontSize: 10, borderColor: G.gold, color: G.gold }}>
            Seller Pitch
          </button>
        </div>
      )}

      {savedMsg && <div style={{ color: G.green, fontSize: 10, marginBottom: 8, textAlign: "center" }}>{savedMsg}</div>}
      {anlErr && <div style={{ color: G.red, fontSize: 10, marginBottom: 8 }}>{anlErr}</div>}

      {analysis && (
        <div style={{ ...card }}>
          <div style={{ ...lbl, color: G.green, marginBottom: 10 }}>AI Analysis - {address}</div>
          <div style={{ fontSize: 12, lineHeight: 1.9, color: "#a0b8a0" }} dangerouslySetInnerHTML={{ __html: `<p style="margin:0">${renderMd(analysis)}</p>` }} />
        </div>
      )}
    </div>
  );
}
