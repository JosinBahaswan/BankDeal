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
    sixtyT,
    totalReno,
    softNum,
    totalHM,
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
    softCosts,
    setSoftCosts,
    compsData,
    mktNotes,
    saveDeal,
    runAnalysis,
    anlLoad,
    generatePitch,
    pitchLoad,
    savedMsg,
    anlErr,
    showPitch,
    pitch,
    setPitch,
    setShowPitch,
    analysis,
  } = ctx;

  const renderMd = (text) =>
    text
      .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#e8f0e8;font-size:13px">$1</strong>')
      .replace(/\n\n/g, '</p><p style="margin:8px 0">')
      .replace(/\n/g, "<br/>");

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
          {lookLoad ? "Analyzing property..." : "🔍  Analyze This Property - Get Comps, ARV + Offer Price"}
        </button>
      </div>
      {lookErr && <div style={{ color: G.red, fontSize: 10, marginBottom: 10 }}>⚠ {lookErr}</div>}

      {arvNum > 0 && (
        <div ref={offerRef} style={{ background: "#051208", border: `2px solid ${G.green}`, borderRadius: 10, padding: "20px 24px", marginBottom: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div>
              <div style={{ fontSize: 9, color: G.green, letterSpacing: 4, marginBottom: 4 }}>SUGGESTED OFFER PRICE</div>
              <div style={{ fontFamily: G.serif, fontSize: 46, color: "#4ade80", fontWeight: "bold", lineHeight: 1, marginBottom: 6 }}>{fmt(offer)}</div>
              <div style={{ fontSize: 10, color: G.muted, marginBottom: 12 }}>60% of ARV ({fmt(arvNum)}) minus all costs</div>
              <div style={{ background: "#071a0e", border: `1px solid ${G.greenDim}`, borderRadius: 6, padding: "12px" }}>
                {[["ARV", fmt(arvNum), G.green], ["× 60%", fmt(sixtyT), G.green], ["− Rehab", fmt(Math.round(totalReno)), G.gold], ["− Soft", fmt(softNum), G.gold], ["− Hard Money", fmt(Math.round(totalHM)), G.gold]].map(([k, v, c]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 11 }}>
                    <span style={{ color: G.muted }}>{k}</span>
                    <span style={{ color: c, fontFamily: G.serif, fontWeight: "bold" }}>{v}</span>
                  </div>
                ))}
                <div style={{ height: 1, background: G.border, margin: "8px 0" }} />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                  <span style={{ color: G.green, fontWeight: "bold" }}>= Your Offer</span>
                  <span style={{ color: "#4ade80", fontFamily: G.serif, fontWeight: "bold" }}>{fmt(offer)}</span>
                </div>
              </div>
              <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 9, color: G.muted }}>OVERRIDE ARV $</span>
                <input
                  value={arvOvr ? Number(arvOvr).toLocaleString() : ""}
                  onChange={(event) => setArvOvr(event.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="adjust"
                  style={{ ...smIn, width: 120, borderBottom: `1px solid ${G.border}`, fontSize: 12 }}
                />
              </div>
            </div>
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
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
              <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
                {["reno", "financing"].map((tab) => (
                  <div
                    key={tab}
                    onClick={() => setAnlTab(tab)}
                    style={{
                      padding: "4px 10px",
                      borderRadius: 4,
                      cursor: "pointer",
                      fontSize: 8,
                      letterSpacing: 2,
                      textTransform: "uppercase",
                      border: `1px solid ${anlTab === tab ? G.green : G.border}`,
                      background: anlTab === tab ? G.greenGlow : "transparent",
                      color: anlTab === tab ? G.green : G.muted,
                      fontFamily: G.mono,
                    }}
                  >
                    {tab}
                  </div>
                ))}
              </div>
              {anlTab === "reno" && (
                <div>
                  <button
                    onClick={estimateReno}
                    disabled={renoLoad}
                    style={{ ...btnG, width: "100%", fontSize: 9, padding: "8px", background: renoLoad ? "#1a2e1a" : "#166534", color: renoLoad ? G.muted : G.green, border: `1px solid ${G.green}33`, marginBottom: 6 }}
                  >
                    {renoLoad ? "Estimating..." : "⚡ AI Estimate Reno Costs"}
                  </button>
                  {renoNote && <div style={{ fontSize: 9, color: "#7070aa", marginBottom: 6, lineHeight: 1.6 }}>{renoNote}</div>}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
                    {RENO_KEYS.slice(0, 6).map(({ key, label: lb }) => (
                      <div key={key} style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 4, padding: "7px 9px" }}>
                        <div style={{ fontSize: 7, color: G.muted, letterSpacing: 2, marginBottom: 2 }}>{lb.toUpperCase()}</div>
                        <div style={{ display: "flex", gap: 2 }}>
                          <span style={{ color: G.muted, fontSize: 11 }}>$</span>
                          <input value={reno[key] ? Number(reno[key]).toLocaleString() : ""} onChange={(event) => setReno((prev) => ({ ...prev, [key]: event.target.value.replace(/[^0-9]/g, "") }))} placeholder="0" style={{ ...smIn, fontSize: 12 }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {anlTab === "financing" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
                  {[
                    { l: "Rate %", v: hardRate, s: setHardRate },
                    { l: "Months", v: loanMo, s: setLoanMo },
                    { l: "Points", v: loanPts, s: setLoanPts },
                    { l: "Soft $", v: softCosts, s: setSoftCosts },
                  ].map(({ l, v, s }) => (
                    <div key={l} style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 4, padding: "8px 10px" }}>
                      <div style={{ fontSize: 7, color: G.muted, letterSpacing: 2, marginBottom: 2 }}>{l.toUpperCase()}</div>
                      <input value={v} onChange={(event) => s(event.target.value.replace(/[^0-9.]/g, ""))} style={{ ...smIn, fontSize: 16, fontFamily: G.serif, fontWeight: "bold" }} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {compsData?.length > 0 && (
        <div style={{ ...card, marginBottom: 12 }}>
          <div style={{ ...lbl, color: G.green, marginBottom: 8 }}>Comparable Sales - 2-Mile Radius</div>
          <div style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 5, overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "2.5fr 1fr 0.8fr 0.8fr 0.6fr", padding: "6px 12px", background: G.card, borderBottom: `1px solid ${G.border}` }}>
              {["ADDRESS", "PRICE", "SQFT", "BED/BATH", "SOLD"].map((h) => (
                <div key={h} style={{ fontSize: 8, color: G.muted, letterSpacing: 2 }}>{h}</div>
              ))}
            </div>
            {compsData.map((comp, index) => (
              <div key={index} style={{ display: "grid", gridTemplateColumns: "2.5fr 1fr 0.8fr 0.8fr 0.6fr", padding: "8px 12px", borderBottom: index < compsData.length - 1 ? `1px solid ${G.faint}` : "none", background: index % 2 === 0 ? "transparent" : G.surface }}>
                <div style={{ fontSize: 10, color: G.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{comp.address}</div>
                <div style={{ fontSize: 11, color: G.green, fontFamily: G.serif, fontWeight: "bold" }}>{fmt(comp.price)}</div>
                <div style={{ fontSize: 10, color: G.text }}>{(comp.squareFootage || 0).toLocaleString()}</div>
                <div style={{ fontSize: 10, color: G.text }}>{comp.bedrooms}bd/{comp.bathrooms}ba</div>
                <div style={{ fontSize: 10, color: G.muted }}>{comp.daysOld}d</div>
              </div>
            ))}
          </div>
          {mktNotes && <div style={{ marginTop: 8, fontSize: 10, color: G.muted, lineHeight: 1.7 }}>{mktNotes}</div>}
        </div>
      )}

      {arvNum > 0 && (
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <button onClick={saveDeal} style={{ ...btnG, flex: 1, fontSize: 10 }}>💾 Save</button>
          <button onClick={runAnalysis} disabled={anlLoad} style={{ ...btnO, flex: 1, fontSize: 10, borderColor: G.green, color: G.green }}>{anlLoad ? "Analyzing..." : "🧠 Analysis"}</button>
          <button onClick={generatePitch} disabled={pitchLoad} style={{ ...btnO, flex: 1, fontSize: 10, borderColor: G.gold, color: G.gold }}>{pitchLoad ? "Writing..." : "✍ Seller Pitch"}</button>
        </div>
      )}
      {savedMsg && <div style={{ color: G.green, fontSize: 10, marginBottom: 8, textAlign: "center" }}>{savedMsg}</div>}
      {anlErr && <div style={{ color: G.red, fontSize: 10, marginBottom: 8 }}>{anlErr}</div>}

      {showPitch && (
        <div style={{ ...card, borderColor: `${G.gold}44`, marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ ...lbl, color: G.gold, marginBottom: 0 }}>Seller Pitch Letter</div>
            <div style={{ display: "flex", gap: 6 }}>
              {pitch && (
                <button
                  onClick={() => {
                    const el = document.createElement("textarea");
                    el.value = pitch;
                    document.body.appendChild(el);
                    el.select();
                    document.execCommand("copy");
                    document.body.removeChild(el);
                  }}
                  style={{ ...btnO, padding: "4px 10px", fontSize: 8, borderColor: G.gold, color: G.gold }}
                >
                  Copy
                </button>
              )}
              <button onClick={() => { setPitch(""); setShowPitch(false); }} style={{ ...btnO, padding: "4px 10px", fontSize: 8 }}>✕</button>
            </div>
          </div>
          {pitchLoad && <div style={{ fontSize: 11, color: G.muted, padding: "10px 0" }}>✍ Writing your pitch letter...</div>}
          {pitch && <div style={{ fontSize: 12, lineHeight: 1.9, color: "#c0b888", whiteSpace: "pre-wrap", fontFamily: G.serif }}>{pitch}</div>}
        </div>
      )}

      {analysis && (
        <div style={{ ...card }}>
          <div style={{ ...lbl, color: G.green, marginBottom: 10 }}>AI Analysis - {address}</div>
          <div style={{ fontSize: 12, lineHeight: 1.9, color: "#a0b8a0" }} dangerouslySetInnerHTML={{ __html: `<p style="margin:0">${renderMd(analysis)}</p>` }} />
        </div>
      )}
    </div>
  );
}
