export default function PipelineTab({ ctx }) {
  const {
    G,
    card,
    lbl,
    btnG,
    btnO,
    fmt,
    activeDeal,
    setActiveDeal,
    setShowRealtor,
    PIPELINE_STAGES,
    updateDealStage,
    showRealtor,
    MOCK_REALTORS,
    wLive,
    setWLive,
    wDeal,
    setWDeal,
    toNum,
    pipeline,
    setFlipTab,
  } = ctx;

  if (activeDeal) {
    return (
      <div>
        <button onClick={() => { setActiveDeal(null); setShowRealtor(false); }} style={{ ...btnO, marginBottom: 14, padding: "5px 12px", fontSize: 9 }}>← Back</button>
        <div style={{ ...card, marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
            <div>
              <div style={{ fontFamily: G.serif, fontSize: 15, color: G.text, fontWeight: "bold", marginBottom: 3 }}>{activeDeal.address}</div>
              <div style={{ fontSize: 9, color: G.muted }}>Saved {activeDeal.savedAt}</div>
            </div>
            <div style={{ background: G.greenGlow, border: `1px solid ${G.green}44`, borderRadius: 4, padding: "3px 10px", fontSize: 8, color: G.green, letterSpacing: 2 }}>{activeDeal.stage}</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 14 }}>
            {[
              { l: "Offer", v: fmt(activeDeal.offer), c: G.green },
              { l: "ARV", v: fmt(activeDeal.arvNum), c: G.text },
              { l: "All-In", v: fmt(activeDeal.allIn), c: G.text },
              { l: "Profit", v: fmt(activeDeal.projProfit), c: G.green },
            ].map(({ l, v, c }) => (
              <div key={l} style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 5, padding: "9px 11px", textAlign: "center" }}>
                <div style={{ fontSize: 8, color: G.muted, letterSpacing: 2, marginBottom: 3 }}>{l.toUpperCase()}</div>
                <div style={{ fontFamily: G.serif, fontSize: 14, color: c, fontWeight: "bold" }}>{v}</div>
              </div>
            ))}
          </div>
          <div style={lbl}>Move to Stage</div>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 6 }}>
            {PIPELINE_STAGES.map((stage) => (
              <div
                key={stage}
                onClick={() => updateDealStage(activeDeal, stage)}
                style={{
                  padding: "5px 12px",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontSize: 8,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  fontFamily: G.mono,
                  border: `1px solid ${activeDeal.stage === stage ? G.green : G.border}`,
                  background: activeDeal.stage === stage ? G.greenGlow : "transparent",
                  color: activeDeal.stage === stage ? G.green : G.muted,
                }}
              >
                {stage}
              </div>
            ))}
          </div>
        </div>

        {showRealtor && (
          <div style={{ ...card, borderColor: `${G.blue}44`, marginBottom: 12 }}>
            <div style={{ ...lbl, color: "#60a5fa", marginBottom: 4 }}>Ready to List - Realtor Matching</div>
            <div style={{ fontSize: 10, color: G.muted, marginBottom: 12, lineHeight: 1.6 }}>DealBank earns 25% referral split on commission - zero cost to you.</div>
            {MOCK_REALTORS.map((realtor) => (
              <div key={realtor.id} style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 6, padding: "12px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#1e3a5f", border: `1px solid ${G.blue}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#60a5fa", fontWeight: "bold" }}>{realtor.avatar}</div>
                  <div>
                    <div style={{ fontFamily: G.serif, fontSize: 13, color: G.text, fontWeight: "bold" }}>{realtor.name}</div>
                    <div style={{ fontSize: 9, color: G.muted }}>{realtor.brokerage} · {realtor.location} · {realtor.deals} deals</div>
                    <div style={{ fontSize: 9, color: "#60a5fa", marginTop: 1 }}>★ {realtor.rating} · {realtor.specialty}</div>
                  </div>
                </div>
                <button style={{ ...btnG, fontSize: 9, padding: "6px 12px", background: "#1e3a5f", color: "#60a5fa", border: `1px solid ${G.blue}44` }}>Connect</button>
              </div>
            ))}
          </div>
        )}

        {activeDeal.stage === "Under Contract" && (
          <div style={{ background: "linear-gradient(135deg,#1a1200,#0f0a00)", border: `2px solid ${G.gold}`, borderRadius: 10, padding: "18px 20px" }}>
            {!wLive ? (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: 10, color: G.gold, letterSpacing: 4, marginBottom: 4 }}>WHOLESALE THIS CONTRACT</div>
                    <div style={{ fontFamily: G.serif, fontSize: 16, color: G.text, fontWeight: "bold", marginBottom: 2 }}>{activeDeal.address}</div>
                    <div style={{ fontSize: 10, color: G.muted }}>You have this under contract. Set your assignment fee and push to 30 buyers instantly.</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 8, color: G.muted, letterSpacing: 2, marginBottom: 1 }}>CONTRACT PRICE</div>
                    <div style={{ fontFamily: G.serif, fontSize: 20, color: G.text, fontWeight: "bold" }}>{fmt(activeDeal.offer)}</div>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                  {[
                    { l: "Your Assignment Fee", f: "assignFee", ph: "12,000", prefix: "$", note: "What you earn at close" },
                    { l: "Contract Close Date", f: "closeDate", ph: "May 30, 2026", prefix: "", note: "Date on your purchase contract" },
                    { l: "Days Remaining", f: "daysLeft", ph: "21", prefix: "", note: "Days until contract expires" },
                    { l: "Earnest Money", f: "earnest", ph: "2,500", prefix: "$", note: "Your earnest on the contract" },
                  ].map(({ l, f, ph, prefix, note }) => (
                    <div key={f} style={{ background: "#111", border: `1px solid ${G.border}`, borderRadius: 5, padding: "10px 12px" }}>
                      <div style={{ fontSize: 8, color: G.muted, letterSpacing: 2, marginBottom: 5 }}>{l.toUpperCase()}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        {prefix && <span style={{ color: G.muted, fontSize: 14 }}>{prefix}</span>}
                        <input value={wDeal[f]} onChange={(event) => setWDeal((prev) => ({ ...prev, [f]: event.target.value }))} placeholder={ph} style={{ background: "transparent", border: "none", color: G.gold, fontSize: 16, fontFamily: G.serif, fontWeight: "bold", width: "100%", outline: "none" }} />
                      </div>
                      <div style={{ fontSize: 8, color: G.muted, marginTop: 3 }}>{note}</div>
                    </div>
                  ))}
                </div>

                {wDeal.assignFee && (
                  <div style={{ background: "#0d0d0d", border: `1px solid ${G.gold}33`, borderRadius: 6, padding: "12px 14px", marginBottom: 12 }}>
                    <div style={{ fontSize: 9, color: G.gold, letterSpacing: 3, marginBottom: 8 }}>WHAT THE BUYER SEES</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
                      {[
                        { l: "Contract Price", v: fmt(activeDeal.offer), c: G.text },
                        { l: "Assignment Fee", v: fmt(toNum(wDeal.assignFee)), c: G.gold },
                        { l: "Total Cost to Buyer", v: fmt(activeDeal.offer + toNum(wDeal.assignFee)), c: G.text },
                        { l: "ARV", v: fmt(activeDeal.arvNum), c: G.green },
                        { l: "Equity", v: fmt(activeDeal.arvNum - activeDeal.offer - toNum(wDeal.assignFee)), c: G.green },
                        { l: "Your Net (after 1.5%)", v: fmt(Math.round(toNum(wDeal.assignFee) * 0.985)), c: G.gold },
                        { l: "DealBank Fee (1.5%)", v: fmt(Math.round(toNum(wDeal.assignFee) * 0.015)), c: G.muted },
                        { l: "Days to Close", v: wDeal.daysLeft ? `${wDeal.daysLeft} days` : "-", c: toNum(wDeal.daysLeft) < 14 ? G.red : G.green },
                      ].map(({ l, v, c }) => (
                        <div key={l} style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 4, padding: "8px 10px", textAlign: "center" }}>
                          <div style={{ fontSize: 7, color: G.muted, letterSpacing: 2, marginBottom: 3 }}>{l.toUpperCase()}</div>
                          <div style={{ fontFamily: G.serif, fontSize: 12, color: c, fontWeight: "bold" }}>{v}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ marginBottom: 12 }}>
                  <div style={{ ...lbl, marginBottom: 6 }}>Additional Notes for Buyers (optional)</div>
                  <textarea value={wDeal.notes} onChange={(event) => setWDeal((prev) => ({ ...prev, notes: event.target.value }))} placeholder="Seller motivation, access situation, title status, inspection period remaining, what you know about the property..." rows={3} style={{ width: "100%", background: G.surface, border: `1px solid ${G.border}`, borderRadius: 5, color: G.text, fontSize: 12, fontFamily: G.mono, padding: "9px 11px", outline: "none", resize: "vertical", lineHeight: 1.6, boxSizing: "border-box" }} />
                </div>

                <button onClick={() => setWLive(true)} disabled={!wDeal.assignFee || !wDeal.daysLeft} style={{ ...btnG, width: "100%", fontSize: 11, padding: "14px", background: !wDeal.assignFee || !wDeal.daysLeft ? G.faint : G.gold, color: !wDeal.assignFee || !wDeal.daysLeft ? G.muted : "#000", letterSpacing: 4 }}>
                  🚀 Push to Buyer Network Now
                </button>
                <div style={{ marginTop: 6, fontSize: 9, color: G.muted, textAlign: "center" }}>DealBank charges 1.5% of assignment fee at close. No upfront cost.</div>
              </div>
            ) : (
              <div>
                <div style={{ textAlign: "center", marginBottom: 18 }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>🚀</div>
                  <div style={{ fontFamily: G.serif, fontSize: 18, color: G.gold, fontWeight: "bold", marginBottom: 4 }}>Live on Buyer Network</div>
                  <div style={{ fontSize: 10, color: G.muted }}>Your deal is live. 30 buyers have been notified. You'll hear back fast.</div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 14 }}>
                  {[
                    { l: "Assignment Fee", v: fmt(toNum(wDeal.assignFee)), c: G.gold },
                    { l: "Days Remaining", v: `${wDeal.daysLeft} days`, c: toNum(wDeal.daysLeft) < 14 ? G.red : G.green },
                    { l: "Buyers Notified", v: "30", c: G.green },
                    { l: "Views", v: "14", c: G.text },
                    { l: "Interested", v: "3", c: G.green },
                    { l: "Your Net", v: fmt(Math.round(toNum(wDeal.assignFee) * 0.985)), c: G.gold },
                  ].map(({ l, v, c }) => (
                    <div key={l} style={{ background: "#111", border: `1px solid ${G.border}`, borderRadius: 5, padding: "10px", textAlign: "center" }}>
                      <div style={{ fontSize: 7, color: G.muted, letterSpacing: 2, marginBottom: 3 }}>{l.toUpperCase()}</div>
                      <div style={{ fontFamily: G.serif, fontSize: 15, color: c, fontWeight: "bold" }}>{v}</div>
                    </div>
                  ))}
                </div>

                <div style={{ ...card, marginBottom: 12 }}>
                  <div style={{ ...lbl, color: G.green, marginBottom: 10 }}>Buyer Interest (3)</div>
                  {[
                    { name: "Pacific Equity Group", time: "12 min ago", msg: "Very interested. Can close in 10 days. Sending proof of funds now.", status: "Hot" },
                    { name: "T. Williams", time: "34 min ago", msg: "Numbers work for us. What's the inspection period situation?", status: "Warm" },
                    { name: "Central Valley Investments", time: "1hr ago", msg: "Reviewing. Will have answer by EOD.", status: "Reviewing" },
                  ].map((buyer, index) => (
                    <div key={index} style={{ borderBottom: index < 2 ? `1px solid ${G.faint}` : "none", paddingBottom: index < 2 ? 12 : 0, marginBottom: index < 2 ? 12 : 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <div style={{ fontFamily: G.serif, fontSize: 12, color: G.text, fontWeight: "bold" }}>{buyer.name}</div>
                          <div style={{ fontSize: 7, color: buyer.status === "Hot" ? "#ff6b6b" : buyer.status === "Warm" ? G.gold : G.muted, background: buyer.status === "Hot" ? "#ff6b6b22" : buyer.status === "Warm" ? `${G.gold}22` : G.surface, border: `1px solid ${buyer.status === "Hot" ? "#ff6b6b" : buyer.status === "Warm" ? G.gold : G.border}44`, borderRadius: 3, padding: "1px 6px", letterSpacing: 1 }}>
                            {buyer.status.toUpperCase()}
                          </div>
                        </div>
                        <div style={{ fontSize: 9, color: G.muted }}>{buyer.time}</div>
                      </div>
                      <div style={{ fontSize: 10, color: G.muted, lineHeight: 1.6, marginBottom: 8 }}>{buyer.msg}</div>
                      <button style={{ ...btnG, fontSize: 8, padding: "5px 12px", background: buyer.status === "Hot" ? G.green : G.surface, color: buyer.status === "Hot" ? "#000" : G.muted, border: buyer.status === "Hot" ? "none" : `1px solid ${G.border}` }}>Reply</button>
                    </div>
                  ))}
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => { setWLive(false); setWDeal({ assignFee: "", closeDate: "", contractPrice: "", daysLeft: "", earnest: "", notes: "", buyers: [] }); }} style={{ ...btnO, flex: 1, fontSize: 9 }}>Edit & Repost</button>
                  <button style={{ ...btnG, flex: 2, fontSize: 9, background: "#ff6b6b22", color: "#ff6b6b", border: "1px solid #ff6b6b44" }}>Mark as Assigned ✓</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ fontFamily: G.serif, fontSize: 18, color: G.text }}>My Pipeline</div>
        <button onClick={() => setFlipTab("analyze")} style={{ ...btnG, fontSize: 9, padding: "7px 12px" }}>+ Analyze Deal</button>
      </div>
      {pipeline.length === 0 ? (
        <div style={{ ...card, textAlign: "center", padding: "40px" }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>📋</div>
          <div style={{ fontFamily: G.serif, fontSize: 15, color: G.text, marginBottom: 6 }}>No deals yet</div>
          <div style={{ fontSize: 10, color: G.muted, marginBottom: 14 }}>Analyze a property and save it to start your pipeline</div>
          <button onClick={() => setFlipTab("analyze")} style={{ ...btnG, fontSize: 10 }}>Analyze a Property</button>
        </div>
      ) : (
        PIPELINE_STAGES.map((stage) => {
          const stageDeals = pipeline.filter((deal) => deal.stage === stage);
          if (!stageDeals.length) return null;
          return (
            <div key={stage} style={{ marginBottom: 14 }}>
              <div style={{ ...lbl, color: G.green, marginBottom: 8 }}>{stage} ({stageDeals.length})</div>
              {stageDeals.map((deal) => (
                <div key={deal.id} style={{ ...card, marginBottom: 7, borderColor: deal.stage === "Under Contract" ? `${G.gold}44` : G.border }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }} onClick={() => setActiveDeal(deal)}>
                    <div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 2 }}>
                        <div style={{ fontFamily: G.serif, fontSize: 12, color: G.text, fontWeight: "bold" }}>{deal.address}</div>
                        {deal.stage === "Under Contract" && <div style={{ fontSize: 7, color: G.gold, background: `${G.gold}22`, border: `1px solid ${G.gold}44`, borderRadius: 3, padding: "1px 6px", letterSpacing: 1 }}>UNDER CONTRACT</div>}
                      </div>
                      <div style={{ fontSize: 9, color: G.muted }}>Offer: <span style={{ color: G.green }}>{fmt(deal.offer)}</span> · ARV: {fmt(deal.arvNum)} · Profit: <span style={{ color: G.green }}>{fmt(deal.projProfit)}</span></div>
                    </div>
                    <div style={{ fontSize: 9, color: G.muted }}>→</div>
                  </div>
                  {deal.stage === "Under Contract" && (
                    <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${G.faint}`, display: "flex", gap: 6 }}>
                      <button onClick={() => { setActiveDeal(deal); setWLive(false); }} style={{ ...btnG, flex: 1, fontSize: 8, padding: "6px", background: G.gold, color: "#000", letterSpacing: 2 }}>
                        🚀 Wholesale This Deal
                      </button>
                      <div style={{ fontSize: 9, color: G.gold, display: "flex", alignItems: "center", paddingLeft: 4 }}>Push to 30 buyers instantly</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          );
        })
      )}
    </div>
  );
}
