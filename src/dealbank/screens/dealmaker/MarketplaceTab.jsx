export default function MarketplaceTab({ ctx }) {
  const {
    G,
    card,
    lbl,
    btnG,
    btnO,
    fmt,
    toNum,
    mktFilter,
    setMktFilter,
    mktSort,
    setMktSort,
    mktView,
    setMktView,
    activeListing,
    setActiveListing,
    savedDeals,
    setSavedDeals,
    submitStep,
    setSubmitStep,
    wSubmitted,
    setWSubmitted,
    wForm,
    setWForm,
  } = ctx;

  const DEMO_LISTINGS = [
    { id: "l1", addr: "3421 Poplar Ave", city: "Sacramento", state: "CA", zip: "95821", beds: 3, baths: 2, sqft: 1420, yr: 1978, arv: 385000, ask: 195000, reno: 62000, fee: 12000, equity: 190000, roi: 28, type: "Wholesale", days: 2, condition: "Full rehab needed", desc: "Absentee owner, motivated to close fast. Full cosmetic flip plus roof and HVAC. Comp support is strong - 4 sales over $370K in 90 days within 1 mile. Title is clear.", highlights: ["Clear title", "Absentee owner", "Comps at $378K-$405K", "Immediate access"], contact: { name: "J. Williams", phone: "(916) 555-0182", email: "jwilliams@invest.com" }, views: 47, saved: 12, status: "Active" },
    { id: "l2", addr: "908 Birchwood Dr", city: "Stockton", state: "CA", zip: "95207", beds: 4, baths: 2, sqft: 1680, yr: 1965, arv: 310000, ask: 148000, reno: 55000, fee: 8000, equity: 162000, roi: 24, type: "Wholesale", days: 5, condition: "Major rehab", desc: "Bank-owned REO, sold as-is. Needs full interior gut plus foundation work. ARV conservative - comps range $295K-$328K. Great for experienced rehabber.", highlights: ["Bank-owned REO", "4 bed opportunity", "Below-market ask", "Strong rental market"], contact: { name: "M. Johnson", phone: "(209) 555-0341", email: "mj@cashbuyer.com" }, views: 31, saved: 8, status: "Active" },
    { id: "l3", addr: "1145 Desert Rose Ln", city: "Fresno", state: "CA", zip: "93720", beds: 3, baths: 2, sqft: 1290, yr: 1991, arv: 275000, ask: 138000, reno: 44000, fee: 9500, equity: 137000, roi: 21, type: "Wholesale", days: 1, condition: "Cosmetic flip", desc: "Probate sale, heirs want quick close. Mostly cosmetic - kitchen, baths, flooring, paint. HVAC new in 2022. One of the cleanest wholesale opportunities in this zip code.", highlights: ["Probate - fast close", "New HVAC 2022", "Light cosmetic only", "Quiet cul-de-sac"], contact: { name: "S. Park", phone: "(559) 555-0227", email: "spark@flip.com" }, views: 89, saved: 24, status: "Active" },
    { id: "l4", addr: "2891 Vista Canyon Rd", city: "Bakersfield", state: "CA", zip: "93306", beds: 3, baths: 1, sqft: 1180, yr: 1958, arv: 245000, ask: 112000, reno: 48000, fee: 7500, equity: 133000, roi: 22, type: "Wholesale", days: 8, condition: "Full rehab needed", desc: "Long-term tenant just vacated. Owner relocated out of state, price reduced twice. Solid ARV support in the neighborhood. Cash or hard money only.", highlights: ["Price reduced twice", "Owner relocated", "Vacant and accessible", "Solid neighborhood"], contact: { name: "T. Garcia", phone: "(661) 555-0118", email: "tgarcia@deals.com" }, views: 22, saved: 5, status: "Active" },
    { id: "l5", addr: "4402 Elmwood Ct", city: "Modesto", state: "CA", zip: "95350", beds: 4, baths: 2, sqft: 1820, yr: 1985, arv: 340000, ask: 172000, reno: 58000, fee: 11000, equity: 168000, roi: 26, type: "Fix & Flip", days: 3, condition: "Full cosmetic", desc: "Seller inherited property, never lived in it. Original condition throughout - dated but structurally sound. Great bones, large lot, 2-car garage. One of the bigger flips available in this market.", highlights: ["Inherited property", "Original condition", "Large lot + garage", "Structurally sound"], contact: { name: "K. Adams", phone: "(209) 555-0493", email: "kadams@wholesale.com" }, views: 61, saved: 18, status: "Active" },
    { id: "l6", addr: "789 Oak Grove Blvd", city: "Sacramento", state: "CA", zip: "95831", beds: 3, baths: 2, sqft: 1350, yr: 2001, arv: 420000, ask: 228000, reno: 38000, fee: 14000, equity: 192000, roi: 31, type: "Fix & Flip", days: 0, condition: "Light cosmetic", desc: "NEW TODAY. Divorce sale, both parties motivated. Built 2001 - great bones, just needs cosmetic update. Kitchen and baths dated, flooring throughout, exterior paint. Easiest flip on the market right now.", highlights: ["NEW TODAY", "Divorce sale - motivated", "2001 build - great bones", "Light cosmetic only"], contact: { name: "R. Torres", phone: "(916) 555-0662", email: "rtorres@investor.com" }, views: 14, saved: 6, status: "Active" },
  ];

  const STATES = ["All", "Sacramento", "Stockton", "Fresno", "Modesto", "Bakersfield"];

  const filtered = DEMO_LISTINGS.filter((deal) => {
    if (mktFilter !== "All" && deal.city !== mktFilter && deal.type !== mktFilter) return false;
    return true;
  }).sort((a, b) => {
    if (mktSort === "newest") return a.days - b.days;
    if (mktSort === "roi") return b.roi - a.roi;
    if (mktSort === "equity") return b.equity - a.equity;
    if (mktSort === "price") return a.ask - b.ask;
    return 0;
  });

  const wUpdate = (field, value) => setWForm((prev) => ({ ...prev, [field]: value }));
  const roiColor = (r) => (r >= 25 ? G.green : r >= 18 ? G.gold : G.orange);
  const contactWholesaler = (listing) => {
    const subject = encodeURIComponent(`Deal inquiry: ${listing.addr}`);
    const body = encodeURIComponent(`Hi ${listing.contact.name},\n\nI'm interested in ${listing.addr}. Please share next steps and access details.\n\nThanks.`);
    const mailto = `mailto:${listing.contact.email}?subject=${subject}&body=${body}`;
    window.location.href = mailto;
  };

  if (activeListing) {
    return (
      <div>
        <button onClick={() => setActiveListing(null)} style={{ ...btnO, marginBottom: 14, padding: "5px 12px", fontSize: 9 }}>← Back to Deals</button>

        <div style={{ background: "linear-gradient(135deg,#051208,#0a1f10)", border: `1px solid ${G.green}44`, borderRadius: 10, padding: "20px 22px", marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
            <div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                <div style={{ fontSize: 8, color: activeListing.type === "Wholesale" ? G.gold : G.green, background: activeListing.type === "Wholesale" ? `${G.gold}22` : G.greenGlow, border: `1px solid ${activeListing.type === "Wholesale" ? G.gold : G.green}44`, borderRadius: 3, padding: "2px 8px", letterSpacing: 2 }}>{activeListing.type.toUpperCase()}</div>
                {activeListing.days === 0 && <div style={{ fontSize: 8, color: "#ff6b6b", background: "#ff6b6b22", border: "1px solid #ff6b6b44", borderRadius: 3, padding: "2px 8px", letterSpacing: 2 }}>🔥 NEW TODAY</div>}
                <div style={{ fontSize: 9, color: G.muted }}>{activeListing.days === 0 ? "Posted today" : `Posted ${activeListing.days}d ago`} · {activeListing.views} views · {activeListing.saved} saved</div>
              </div>
              <div style={{ fontFamily: G.serif, fontSize: 20, color: G.text, fontWeight: "bold", marginBottom: 2 }}>{activeListing.addr}</div>
              <div style={{ fontSize: 11, color: G.muted }}>{activeListing.city}, {activeListing.state} {activeListing.zip} · {activeListing.beds}bd/{activeListing.baths}ba · {activeListing.sqft?.toLocaleString()} sqft · Built {activeListing.yr}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 8, color: G.muted, letterSpacing: 3, marginBottom: 2 }}>ASKING PRICE</div>
              <div style={{ fontFamily: G.serif, fontSize: 32, color: G.text, fontWeight: "bold" }}>{fmt(activeListing.ask)}</div>
              <div style={{ fontSize: 9, color: G.muted, marginTop: 2 }}>+ {fmt(activeListing.fee)} assignment fee</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
            {[
              { l: "ARV", v: fmt(activeListing.arv), c: G.green },
              { l: "Est. Reno", v: fmt(activeListing.reno), c: G.gold },
              { l: "Equity", v: fmt(activeListing.equity), c: G.text },
              { l: "Projected ROI", v: `${activeListing.roi}%`, c: roiColor(activeListing.roi) },
            ].map(({ l, v, c }) => (
              <div key={l} style={{ background: "#0a0a0a", border: `1px solid ${G.border}`, borderRadius: 5, padding: "10px 12px", textAlign: "center" }}>
                <div style={{ fontSize: 8, color: G.muted, letterSpacing: 2, marginBottom: 4 }}>{l.toUpperCase()}</div>
                <div style={{ fontFamily: G.serif, fontSize: 17, color: c, fontWeight: "bold" }}>{v}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div style={{ ...card }}>
            <div style={{ ...lbl, color: G.green, marginBottom: 8 }}>Deal Overview</div>
            <div style={{ fontSize: 11, color: G.text, lineHeight: 1.8, marginBottom: 12 }}>{activeListing.desc}</div>
            <div style={{ ...lbl, marginBottom: 8 }}>Deal Highlights</div>
            {activeListing.highlights.map((h, i) => (
              <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6, fontSize: 10, color: G.text }}><span style={{ color: G.green }}>✓</span>{h}</div>
            ))}
          </div>

          <div>
            <div style={{ ...card, marginBottom: 10 }}>
              <div style={{ ...lbl, color: G.gold, marginBottom: 10 }}>Deal Math</div>
              {[["ARV", fmt(activeListing.arv), G.green], ["Purchase (ask)", fmt(activeListing.ask), G.text], ["Est. Renovation", fmt(activeListing.reno), G.gold], ["Assignment Fee", fmt(activeListing.fee), G.gold], ["Total All-In", fmt(activeListing.ask + activeListing.reno + activeListing.fee), G.text], ["Equity at Close", fmt(activeListing.equity), G.green]].map(([k, v, c]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid ${G.faint}`, fontSize: 11 }}>
                  <span style={{ color: G.muted }}>{k}</span>
                  <span style={{ color: c, fontFamily: G.serif, fontWeight: "bold" }}>{v}</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: 13 }}>
                <span style={{ color: G.green, fontWeight: "bold" }}>Projected ROI</span>
                <span style={{ color: roiColor(activeListing.roi), fontFamily: G.serif, fontWeight: "bold" }}>{activeListing.roi}%</span>
              </div>
            </div>

            <div style={{ ...card, marginBottom: 10 }}>
              <div style={{ ...lbl, marginBottom: 6 }}>Property Condition</div>
              <div style={{ fontSize: 11, color: G.gold, marginBottom: 4 }}>{activeListing.condition}</div>
            </div>

            <div style={{ background: "#0a1a0a", border: `1px solid ${G.green}44`, borderRadius: 8, padding: "14px" }}>
              <div style={{ ...lbl, color: G.green, marginBottom: 10 }}>Wholesaler Contact</div>
              <div style={{ fontFamily: G.serif, fontSize: 14, color: G.text, fontWeight: "bold", marginBottom: 4 }}>{activeListing.contact.name}</div>
              <div style={{ fontSize: 10, color: G.muted, marginBottom: 2 }}>{activeListing.contact.phone}</div>
              <div style={{ fontSize: 10, color: G.muted, marginBottom: 12 }}>{activeListing.contact.email}</div>
              <button onClick={() => contactWholesaler(activeListing)} style={{ ...btnG, width: "100%", fontSize: 10, marginBottom: 8 }}>📞 Contact Wholesaler</button>
              <button onClick={() => setSavedDeals((prev) => (prev.includes(activeListing.id) ? prev : [...prev, activeListing.id]))} style={{ ...btnO, width: "100%", fontSize: 10, borderColor: savedDeals.includes(activeListing.id) ? G.green : G.border, color: savedDeals.includes(activeListing.id) ? G.green : G.muted }}>
                {savedDeals.includes(activeListing.id) ? "✓ Saved to Watchlist" : "Save to Watchlist"}
              </button>
              <div style={{ marginTop: 8, fontSize: 8, color: G.muted, textAlign: "center", lineHeight: 1.6 }}>DealBank charges a 1.5% platform fee on closed transactions. No upfront cost.</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (mktView === "submit") {
    return (
      <div>
        <button onClick={() => { setMktView("feed"); setSubmitStep(1); setWSubmitted(false); }} style={{ ...btnO, marginBottom: 14, padding: "5px 12px", fontSize: 9 }}>← Back to Feed</button>

        {wSubmitted ? (
          <div style={{ ...card, textAlign: "center", padding: "40px 20px", borderColor: `${G.green}44` }}>
            <div style={{ fontSize: 36, marginBottom: 14 }}>✅</div>
            <div style={{ fontFamily: G.serif, fontSize: 20, color: G.green, fontWeight: "bold", marginBottom: 8 }}>Deal Submitted!</div>
            <div style={{ fontSize: 11, color: G.muted, lineHeight: 1.8, marginBottom: 20, maxWidth: 400, margin: "0 auto 20px" }}>Your deal is under review. DealBank will verify the numbers and push it to our buyer network within 24 hours. You'll be notified when buyers express interest.</div>
            <div style={{ ...card, borderColor: G.border, textAlign: "left", marginBottom: 16, maxWidth: 400, margin: "0 auto 16px" }}>
              <div style={{ ...lbl, marginBottom: 8 }}>What happens next</div>
              {["DealBank reviews and verifies your deal (24hrs)", "We push it to 30+ active buyers in your market", "Interested buyers contact you directly", "Deal closes, you pay 1.5% platform fee at assignment", "Get paid and post your next deal"].map((s, i) => (
                <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8, fontSize: 10, color: G.text }}><span style={{ color: G.green, fontWeight: "bold", minWidth: 16 }}>{i + 1}.</span>{s}</div>
              ))}
            </div>
            <button onClick={() => { setWSubmitted(false); setSubmitStep(1); setWForm({ address: "", city: "", state: "CA", zip: "", beds: "", baths: "", sqft: "", yearBuilt: "", arv: "", askPrice: "", renoEst: "", assignFee: "", earnest: "", closeDate: "", type: "Wholesale", description: "", highlights: "", condition: "Light Cosmetic", contactName: "", contactPhone: "", contactEmail: "" }); }} style={{ ...btnG, fontSize: 10 }}>
              Submit Another Deal
            </button>
          </div>
        ) : (
          <div>
            <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
              {[["1", "Property"], ["2", "Numbers"], ["3", "Description"], ["4", "Contact"]].map(([n, label], i) => (
                <div key={n} style={{ flex: 1, textAlign: "center" }}>
                  <div style={{ height: 3, borderRadius: 2, background: submitStep > i ? G.green : G.faint, marginBottom: 4 }} />
                  <div style={{ fontSize: 8, color: submitStep === i + 1 ? G.green : G.muted, letterSpacing: 1 }}>{n}. {label}</div>
                </div>
              ))}
            </div>

            {submitStep === 1 && (
              <div style={{ ...card }}>
                <div style={{ fontFamily: G.serif, fontSize: 15, color: G.text, fontWeight: "bold", marginBottom: 14 }}>Property Details</div>
                <div style={{ marginBottom: 10 }}>
                  <div style={{ ...lbl }}>Full Address</div>
                  <input value={wForm.address} onChange={(e) => wUpdate("address", e.target.value)} placeholder="123 Main St" style={{ width: "100%", background: G.surface, border: `1px solid ${G.border}`, borderRadius: 5, color: G.text, fontSize: 13, fontFamily: G.mono, padding: "9px 11px", outline: "none", boxSizing: "border-box" }} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 10 }}>
                  {[["City", "city", "Sacramento"], ["State", "state", "CA"], ["ZIP", "zip", "95814"]].map(([l, f, ph]) => (
                    <div key={f}>
                      <div style={{ ...lbl }}>{l}</div>
                      <input value={wForm[f]} onChange={(e) => wUpdate(f, e.target.value)} placeholder={ph} style={{ width: "100%", background: G.surface, border: `1px solid ${G.border}`, borderRadius: 5, color: G.text, fontSize: 13, fontFamily: G.mono, padding: "8px 10px", outline: "none", boxSizing: "border-box" }} />
                    </div>
                  ))}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
                  {[["Beds", "beds", "3"], ["Baths", "baths", "2"], ["Sq Ft", "sqft", "1,400"], ["Year Built", "yearBuilt", "1975"]].map(([l, f, ph]) => (
                    <div key={f}>
                      <div style={{ ...lbl }}>{l}</div>
                      <input value={wForm[f]} onChange={(e) => wUpdate(f, e.target.value.replace(/[^0-9]/g, ""))} placeholder={ph} style={{ width: "100%", background: G.surface, border: `1px solid ${G.border}`, borderRadius: 5, color: G.text, fontSize: 13, fontFamily: G.mono, padding: "8px 10px", outline: "none", boxSizing: "border-box" }} />
                    </div>
                  ))}
                </div>
                <div style={{ marginBottom: 14 }}>
                  <div style={{ ...lbl }}>Deal Type</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {["Wholesale", "Fix & Flip", "BRRRR", "Land"].map((t) => (
                      <div key={t} onClick={() => wUpdate("type", t)} style={{ padding: "6px 14px", borderRadius: 4, cursor: "pointer", fontSize: 9, fontFamily: G.mono, border: `1px solid ${wForm.type === t ? G.green : G.border}`, background: wForm.type === t ? G.greenGlow : "transparent", color: wForm.type === t ? G.green : G.muted }}>
                        {t}
                      </div>
                    ))}
                  </div>
                </div>
                <button onClick={() => setSubmitStep(2)} style={{ ...btnG, width: "100%", fontSize: 10 }}>Next: Enter Numbers →</button>
              </div>
            )}

            {submitStep === 2 && (
              <div style={{ ...card }}>
                <div style={{ fontFamily: G.serif, fontSize: 15, color: G.text, fontWeight: "bold", marginBottom: 14 }}>Deal Numbers</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                  {[["ARV (After Repair Value)", "arv", "385,000"], ["Your Asking Price", "askPrice", "195,000"], ["Estimated Renovation", "renoEst", "62,000"], ["Assignment Fee", "assignFee", "12,000"], ["Earnest Money", "earnest", "2,500"], ["Close-By Date", "closeDate", "May 15, 2026"]].map(([l, f, ph]) => (
                    <div key={f}>
                      <div style={{ ...lbl }}>{l}</div>
                      <div style={{ position: "relative" }}>
                        {f !== "closeDate" && <span style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: G.muted, fontSize: 12 }}>$</span>}
                        <input value={wForm[f]} onChange={(e) => wUpdate(f, f === "closeDate" ? e.target.value : e.target.value.replace(/[^0-9]/g, ""))} placeholder={ph} style={{ width: "100%", background: G.surface, border: `1px solid ${G.border}`, borderRadius: 5, color: G.text, fontSize: 13, fontFamily: G.mono, padding: f !== "closeDate" ? "8px 10px 8px 20px" : "8px 10px", outline: "none", boxSizing: "border-box" }} />
                      </div>
                    </div>
                  ))}
                </div>
                {wForm.arv && wForm.askPrice && (
                  <div style={{ background: G.greenGlow, border: `1px solid ${G.green}33`, borderRadius: 6, padding: "10px 14px", marginBottom: 12 }}>
                    <div style={{ display: "flex", gap: 20, fontSize: 10 }}>
                      <span style={{ color: G.muted }}>Equity: <strong style={{ color: G.green }}>{fmt(toNum(wForm.arv) - toNum(wForm.askPrice) - toNum(wForm.renoEst))}</strong></span>
                      <span style={{ color: G.muted }}>ROI est.: <strong style={{ color: G.green }}>{wForm.arv ? Math.round(((toNum(wForm.arv) - toNum(wForm.askPrice) - toNum(wForm.renoEst) - toNum(wForm.assignFee)) / (toNum(wForm.askPrice) + toNum(wForm.renoEst) + toNum(wForm.assignFee))) * 100) : 0}%</strong></span>
                      <span style={{ color: G.muted }}>Pct of ARV: <strong style={{ color: G.gold }}>{wForm.arv ? Math.round((toNum(wForm.askPrice) / toNum(wForm.arv)) * 100) : 0}%</strong></span>
                    </div>
                  </div>
                )}
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => setSubmitStep(1)} style={{ ...btnO, flex: 1, fontSize: 10 }}>← Back</button>
                  <button onClick={() => setSubmitStep(3)} style={{ ...btnG, flex: 2, fontSize: 10 }}>Next: Description →</button>
                </div>
              </div>
            )}

            {submitStep === 3 && (
              <div style={{ ...card }}>
                <div style={{ fontFamily: G.serif, fontSize: 15, color: G.text, fontWeight: "bold", marginBottom: 14 }}>Deal Description</div>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ ...lbl }}>Property Condition <span style={{ color: G.muted, fontWeight: "normal" }}>(tell buyers what makes this deal)</span></div>
                  <select value={wForm.condition} onChange={(e) => wUpdate("condition", e.target.value)} style={{ width: "100%", background: G.surface, border: `1px solid ${G.border}`, borderRadius: 5, color: G.text, fontSize: 13, fontFamily: G.mono, padding: "9px 11px", outline: "none" }}>
                    {["Light Cosmetic", "Cosmetic Flip", "Full Rehab", "Major Rehab"].map((o) => <option key={o} value={o} style={{ background: G.card }}>{o}</option>)}
                  </select>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ ...lbl }}>Deal Description <span style={{ color: G.muted, fontWeight: "normal" }}>(tell buyers what makes this deal)</span></div>
                  <textarea value={wForm.description} onChange={(e) => wUpdate("description", e.target.value)} placeholder="Describe the opportunity - seller motivation, property condition, why this is a good deal, access situation, title status..." rows={4} style={{ width: "100%", background: G.surface, border: `1px solid ${G.border}`, borderRadius: 5, color: G.text, fontSize: 12, fontFamily: G.mono, padding: "9px 11px", outline: "none", resize: "vertical", lineHeight: 1.6, boxSizing: "border-box" }} />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <div style={{ ...lbl }}>Deal Highlights (comma separated)</div>
                  <input value={wForm.highlights} onChange={(e) => wUpdate("highlights", e.target.value)} placeholder="Clear title, Motivated seller, Comps at $380K, Vacant and accessible" style={{ width: "100%", background: G.surface, border: `1px solid ${G.border}`, borderRadius: 5, color: G.text, fontSize: 13, fontFamily: G.mono, padding: "9px 11px", outline: "none", boxSizing: "border-box" }} />
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => setSubmitStep(2)} style={{ ...btnO, flex: 1, fontSize: 10 }}>← Back</button>
                  <button onClick={() => setSubmitStep(4)} style={{ ...btnG, flex: 2, fontSize: 10 }}>Next: Contact Info →</button>
                </div>
              </div>
            )}

            {submitStep === 4 && (
              <div style={{ ...card }}>
                <div style={{ fontFamily: G.serif, fontSize: 15, color: G.text, fontWeight: "bold", marginBottom: 14 }}>Your Contact Info</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                  {[["Your Name", "contactName", "Ray Torres"], ["Company (optional)", "contactPhone", "(916) 555-0100"], ["Phone", "contactPhone", "(916) 555-0100"], ["Email", "contactEmail", "ray@deals.com"]].map(([l, f, ph]) => (
                    <div key={l}>
                      <div style={{ ...lbl }}>{l}</div>
                      <input value={wForm[f]} onChange={(e) => wUpdate(f, e.target.value)} placeholder={ph} style={{ width: "100%", background: G.surface, border: `1px solid ${G.border}`, borderRadius: 5, color: G.text, fontSize: 13, fontFamily: G.mono, padding: "8px 10px", outline: "none", boxSizing: "border-box" }} />
                    </div>
                  ))}
                </div>
                <div style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 6, padding: "12px", marginBottom: 14 }}>
                  <div style={{ ...lbl, color: G.gold, marginBottom: 6 }}>Platform Fee</div>
                  <div style={{ fontSize: 11, color: G.text, lineHeight: 1.8 }}>DealBank charges <strong style={{ color: G.gold }}>1.5% of the assignment fee</strong> when your deal closes. No upfront cost, no listing fee, no monthly charge.</div>
                  {wForm.assignFee && <div style={{ marginTop: 6, fontSize: 10, color: G.muted }}>On your {fmt(wForm.assignFee)} fee: <strong style={{ color: G.gold }}>{fmt(Math.round(toNum(wForm.assignFee) * 0.015))} to DealBank</strong>, <strong style={{ color: G.green }}>{fmt(Math.round(toNum(wForm.assignFee) * 0.985))} to you</strong></div>}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => setSubmitStep(3)} style={{ ...btnO, flex: 1, fontSize: 10 }}>← Back</button>
                  <button onClick={() => setWSubmitted(true)} style={{ ...btnG, flex: 2, fontSize: 10 }}>🚀 Submit Deal to Buyer Network</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  if (mktView === "buyers") {
    return (
      <div>
        <button onClick={() => setMktView("feed")} style={{ ...btnO, marginBottom: 14, padding: "5px 12px", fontSize: 9 }}>← Back to Deals</button>
        <div style={{ fontFamily: G.serif, fontSize: 18, color: G.text, marginBottom: 4 }}>Active Buyer Network</div>
        <div style={{ fontSize: 10, color: G.muted, marginBottom: 14 }}>30 verified cash buyers actively looking for deals. Below are 8 active profile samples.</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 14 }}>
          {[{ l: "Active Buyers", v: "30", c: G.green }, { l: "Avg Buy Box", v: "$150K-$350K", c: G.text }, { l: "Deals/Mo Capacity", v: "45+", c: G.gold }, { l: "Avg Close Time", v: "12 days", c: G.green }].map(({ l, v, c }) => (
            <div key={l} style={{ ...card, textAlign: "center" }}>
              <div style={{ ...lbl, marginBottom: 4 }}>{l}</div>
              <div style={{ fontFamily: G.serif, fontSize: 15, color: c, fontWeight: "bold" }}>{v}</div>
            </div>
          ))}
        </div>
        {[
          { name: "Pacific Equity Group", markets: "Sacramento, Stockton, Modesto", buyBox: "$120K-$380K", type: "Fix & Flip", closes: "8-10/mo", cash: true, hm: false, verified: true },
          { name: "Central Valley Investments", markets: "Fresno, Bakersfield, Visalia", buyBox: "$90K-$280K", type: "Wholesale/Flip", closes: "5-7/mo", cash: true, hm: true, verified: true },
          { name: "Bay Area Cash Buyers", markets: "Sacramento, Bay Area", buyBox: "$250K-$600K", type: "Fix & Flip / BRRRR", closes: "4-6/mo", cash: true, hm: false, verified: true },
          { name: "Independent Buyer - T. Williams", markets: "Sacramento metro", buyBox: "$150K-$320K", type: "Fix & Flip", closes: "2-3/mo", cash: true, hm: true, verified: true },
          { name: "Golden State Deal Makers", markets: "Statewide CA", buyBox: "$100K-$500K", type: "All types", closes: "15+/mo", cash: true, hm: false, verified: false },
          { name: "Redwood Capital Partners", markets: "Sacramento, Roseville, Elk Grove", buyBox: "$180K-$450K", type: "Fix & Flip", closes: "6-8/mo", cash: true, hm: false, verified: true },
          { name: "Delta Turnkey Holdings", markets: "Stockton, Lodi, Tracy", buyBox: "$110K-$300K", type: "BRRRR / Rental", closes: "4-5/mo", cash: false, hm: true, verified: true },
          { name: "Sierra Equity Buyers", markets: "Fresno, Clovis, Madera", buyBox: "$130K-$340K", type: "Wholesale / Wholetail", closes: "3-4/mo", cash: true, hm: true, verified: true },
        ].map((b, i) => (
          <div key={i} style={{ ...card, marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                  <div style={{ fontFamily: G.serif, fontSize: 14, color: G.text, fontWeight: "bold" }}>{b.name}</div>
                  {b.verified && <div style={{ fontSize: 7, color: G.green, background: G.greenGlow, border: `1px solid ${G.green}44`, borderRadius: 3, padding: "1px 5px", letterSpacing: 1 }}>✓ VERIFIED</div>}
                </div>
                <div style={{ fontSize: 9, color: G.muted }}>{b.markets}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 10, color: G.green, fontFamily: G.serif, fontWeight: "bold" }}>{b.closes}</div>
                <div style={{ fontSize: 8, color: G.muted }}>deals/mo</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 14, fontSize: 9, color: G.muted }}>
              <span>Buy box: <strong style={{ color: G.text }}>{b.buyBox}</strong></span>
              <span>Type: <strong style={{ color: G.text }}>{b.type}</strong></span>
              {b.cash && <span style={{ color: G.green }}>✓ Cash</span>}
              {b.hm && <span style={{ color: G.blue }}>✓ Hard Money</span>}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
        <div>
          <div style={{ fontFamily: G.serif, fontSize: 20, color: G.text, fontWeight: "bold" }}>Wholesale Deal Feed</div>
          <div style={{ fontSize: 10, color: G.muted, marginTop: 2 }}>{filtered.length} deals available · Updated daily · California</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setMktView("buyers")} style={{ ...btnO, fontSize: 9, padding: "7px 12px", borderColor: G.blue, color: G.blue }}>👥 Buyer Network (30)</button>
          <button onClick={() => setMktView("submit")} style={{ ...btnG, fontSize: 9, padding: "7px 12px" }}>+ Submit a Deal</button>
        </div>
      </div>

      <div style={{ background: "linear-gradient(135deg,#1e3a5f,#0d1f35)", border: "1px solid #3b82f644", borderRadius: 8, padding: "12px 16px", marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 7, color: G.blue, letterSpacing: 3, marginBottom: 2 }}>SPONSORED · KIAVI HARD MONEY</div>
          <div style={{ fontFamily: G.serif, fontSize: 13, color: G.text, fontWeight: "bold" }}>Fund any deal in this feed in 5 days</div>
          <div style={{ fontSize: 9, color: G.muted }}>Pre-approval in 24 hours. Up to 90% of purchase. No income docs.</div>
        </div>
        <div style={{ background: G.blue, color: "#fff", borderRadius: 5, padding: "8px 14px", fontSize: 9, fontFamily: G.mono, fontWeight: "bold", letterSpacing: 2, whiteSpace: "nowrap", marginLeft: 12 }}>GET FUNDED →</div>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ fontSize: 9, color: G.muted, letterSpacing: 2, marginRight: 4 }}>MARKET</div>
        {STATES.map((state) => (
          <div key={state} onClick={() => setMktFilter(state)} style={{ padding: "4px 10px", borderRadius: 4, cursor: "pointer", fontSize: 9, fontFamily: G.mono, border: `1px solid ${mktFilter === state ? G.green : G.border}`, background: mktFilter === state ? G.greenGlow : "transparent", color: mktFilter === state ? G.green : G.muted }}>
            {state}
          </div>
        ))}
        <div style={{ marginLeft: "auto", display: "flex", gap: 6, alignItems: "center" }}>
          <div style={{ fontSize: 9, color: G.muted }}>SORT</div>
          {[ ["newest", "Newest"], ["roi", "Best ROI"], ["equity", "Most Equity"], ["price", "Lowest Price"] ].map(([v, l]) => (
            <div key={v} onClick={() => setMktSort(v)} style={{ padding: "4px 10px", borderRadius: 4, cursor: "pointer", fontSize: 9, fontFamily: G.mono, border: `1px solid ${mktSort === v ? G.gold : G.border}`, background: mktSort === v ? "#1a1200" : "transparent", color: mktSort === v ? G.gold : G.muted }}>
              {l}
            </div>
          ))}
        </div>
      </div>

      {filtered.map((d) => (
        <div key={d.id} style={{ ...card, marginBottom: 10, borderColor: d.days === 0 ? `${G.green}44` : G.border, cursor: "pointer" }} onClick={() => setActiveListing(d)}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                <div style={{ fontSize: 8, color: d.type === "Wholesale" ? G.gold : G.green, background: d.type === "Wholesale" ? `${G.gold}22` : G.greenGlow, border: `1px solid ${d.type === "Wholesale" ? G.gold : G.green}44`, borderRadius: 3, padding: "2px 7px", letterSpacing: 1 }}>
                  {d.type.toUpperCase()}
                </div>
                {d.days === 0 && <div style={{ fontSize: 8, color: "#ff6b6b", background: "#ff6b6b22", border: "1px solid #ff6b6b44", borderRadius: 3, padding: "2px 7px", letterSpacing: 1 }}>🔥 NEW TODAY</div>}
                <div style={{ fontSize: 9, color: G.muted }}>{d.days === 0 ? "Just posted" : `${d.days}d ago`} · {d.views} views</div>
              </div>
              <div style={{ fontFamily: G.serif, fontSize: 14, color: G.text, fontWeight: "bold", marginBottom: 2 }}>{d.addr}, {d.city}, {d.state}</div>
              <div style={{ fontSize: 9, color: G.muted }}>{d.beds}bd/{d.baths}ba · {d.sqft?.toLocaleString()} sqft · Built {d.yr} · {d.condition}</div>
            </div>
            <div style={{ textAlign: "right", minWidth: 100 }}>
              <div style={{ fontSize: 8, color: G.muted, letterSpacing: 2, marginBottom: 1 }}>ASKING</div>
              <div style={{ fontFamily: G.serif, fontSize: 18, color: G.text, fontWeight: "bold" }}>{fmt(d.ask)}</div>
              <div style={{ fontSize: 9, color: G.muted }}>+ {fmt(d.fee)} fee</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6, marginBottom: 10 }}>
            {[{ l: "ARV", v: fmt(d.arv), c: G.green }, { l: "Est. Reno", v: fmt(d.reno), c: G.gold }, { l: "Equity", v: fmt(d.equity), c: G.text }, { l: "ROI", v: `${d.roi}%`, c: roiColor(d.roi) }].map(({ l, v, c }) => (
              <div key={l} style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 4, padding: "7px 9px", textAlign: "center" }}>
                <div style={{ fontSize: 7, color: G.muted, letterSpacing: 2, marginBottom: 2 }}>{l}</div>
                <div style={{ fontFamily: G.serif, fontSize: 13, color: c, fontWeight: "bold" }}>{v}</div>
              </div>
            ))}
          </div>

          <div style={{ fontSize: 10, color: G.muted, lineHeight: 1.6, marginBottom: 10 }}>{d.desc.slice(0, 120)}...</div>

          <div style={{ display: "flex", gap: 7 }}>
            <button onClick={(e) => { e.stopPropagation(); setActiveListing(d); }} style={{ ...btnG, flex: 2, fontSize: 9, padding: "8px" }}>View Full Deal →</button>
            <button onClick={(e) => { e.stopPropagation(); setSavedDeals((prev) => (prev.includes(d.id) ? prev : [...prev, d.id])); }} style={{ ...btnO, flex: 1, fontSize: 9, padding: "8px", borderColor: savedDeals.includes(d.id) ? G.green : G.border, color: savedDeals.includes(d.id) ? G.green : G.muted }}>
              {savedDeals.includes(d.id) ? "✓ Saved" : "Save"}
            </button>
          </div>
        </div>
      ))}

      <div style={{ textAlign: "center", padding: "20px", fontSize: 10, color: G.muted }}>
        New deals posted daily. <span style={{ color: G.green, cursor: "pointer" }} onClick={() => setMktView("submit")}>Submit your own deal →</span>
      </div>
    </div>
  );
}
