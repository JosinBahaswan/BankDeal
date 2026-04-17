export default function PartnersTab({ ctx }) {
  const {
    G,
    card,
    btnG,
    btnO,
    AD_SLOTS,
    partnerTab,
    setPartnerTab,
    activeSoftware,
    setActiveSoftware,
    SOFTWARE_REVIEWS,
    softwareFilter,
    setSoftwareFilter,
    INSURANCE_PARTNERS,
    MORTGAGE_PARTNERS,
  } = ctx;

  return (
    <div>
      {AD_SLOTS.slice(0, 1).map((ad) => (
        <a key={ad.id} href={ad.url} target="_blank" rel="noopener noreferrer" style={{ display: "block", background: `linear-gradient(135deg, ${ad.color}18, ${ad.color}08)`, border: `1px solid ${ad.color}44`, borderRadius: 8, padding: "14px 18px", marginBottom: 14, textDecoration: "none", cursor: "pointer" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 7, color: ad.color, letterSpacing: 3, marginBottom: 4 }}>SPONSORED · {ad.company.toUpperCase()}</div>
              <div style={{ fontFamily: G.serif, fontSize: 14, color: G.text, fontWeight: "bold", marginBottom: 2 }}>{ad.headline}</div>
              <div style={{ fontSize: 10, color: G.muted }}>{ad.sub}</div>
            </div>
            <div style={{ background: ad.color, color: "#000", borderRadius: 5, padding: "8px 14px", fontSize: 9, fontFamily: G.mono, fontWeight: "bold", letterSpacing: 2, whiteSpace: "nowrap", marginLeft: 16 }}>{ad.cta} →</div>
          </div>
        </a>
      ))}

      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {[["software", "💻 Software Reviews"], ["insurance", "🛡 Insurance"], ["mortgage", "🏦 Hard Money & Loans"]].map(([id, label]) => (
          <div
            key={id}
            onClick={() => setPartnerTab(id)}
            style={{
              padding: "6px 14px",
              borderRadius: 5,
              cursor: "pointer",
              fontSize: 9,
              letterSpacing: 2,
              fontFamily: G.mono,
              textTransform: "uppercase",
              border: `1px solid ${partnerTab === id ? G.green : G.border}`,
              background: partnerTab === id ? G.greenGlow : "transparent",
              color: partnerTab === id ? G.green : G.muted,
            }}
          >
            {label}
          </div>
        ))}
      </div>

      {partnerTab === "software" && (
        <div>
          {activeSoftware ? (
            <div>
              <button onClick={() => setActiveSoftware(null)} style={{ ...btnO, marginBottom: 14, padding: "5px 12px", fontSize: 9 }}>← Back to Reviews</button>
              <div style={{ ...card, borderColor: `${activeSoftware.logoColor}44`, marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <div style={{ width: 48, height: 48, borderRadius: 10, background: `${activeSoftware.logoColor}22`, border: `2px solid ${activeSoftware.logoColor}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: activeSoftware.logoColor, fontWeight: "bold" }}>{activeSoftware.logo}</div>
                    <div>
                      <div style={{ fontFamily: G.serif, fontSize: 18, color: G.text, fontWeight: "bold" }}>{activeSoftware.name}</div>
                      <div style={{ fontSize: 10, color: activeSoftware.logoColor }}>{activeSoftware.category} · {activeSoftware.price}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 8, color: activeSoftware.verdictColor, background: `${activeSoftware.verdictColor}22`, border: `1px solid ${activeSoftware.verdictColor}44`, borderRadius: 4, padding: "3px 10px", marginBottom: 4, letterSpacing: 2 }}>
                      {activeSoftware.verdict}
                    </div>
                    <div style={{ fontFamily: G.serif, fontSize: 16, color: G.gold }}>{"★".repeat(Math.floor(activeSoftware.rating))} {activeSoftware.rating}</div>
                    <div style={{ fontSize: 9, color: G.muted }}>{activeSoftware.reviews.toLocaleString()} reviews</div>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: G.muted, lineHeight: 1.7, marginBottom: 14, fontStyle: "italic" }}>
                  "{activeSoftware.tagline}"
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                  <div style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 6, padding: "12px" }}>
                    <div style={{ fontSize: 9, color: G.green, letterSpacing: 3, marginBottom: 8 }}>PROS</div>
                    {activeSoftware.pros.map((pro, index) => <div key={index} style={{ fontSize: 10, color: G.text, marginBottom: 5, display: "flex", gap: 6 }}><span style={{ color: G.green }}>+</span>{pro}</div>)}
                  </div>
                  <div style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 6, padding: "12px" }}>
                    <div style={{ fontSize: 9, color: G.red, letterSpacing: 3, marginBottom: 8 }}>CONS</div>
                    {activeSoftware.cons.map((con, index) => <div key={index} style={{ fontSize: 10, color: G.text, marginBottom: 5, display: "flex", gap: 6 }}><span style={{ color: G.red }}>−</span>{con}</div>)}
                  </div>
                </div>
                <div style={{ background: "#0a0f0a", border: `1px solid ${G.border}`, borderRadius: 6, padding: "12px", marginBottom: 14 }}>
                  <div style={{ fontSize: 9, color: G.gold, letterSpacing: 3, marginBottom: 8 }}>DEAL MAKER REVIEWS</div>
                  {activeSoftware.flipperQuotes.map((quote, index) => (
                    <div key={index} style={{ marginBottom: index < activeSoftware.flipperQuotes.length - 1 ? 12 : 0, paddingBottom: index < activeSoftware.flipperQuotes.length - 1 ? 12 : 0, borderBottom: index < activeSoftware.flipperQuotes.length - 1 ? `1px solid ${G.faint}` : "none" }}>
                      <div style={{ fontSize: 11, color: G.text, lineHeight: 1.7, marginBottom: 4, fontStyle: "italic" }}>
                        "{quote.quote}"
                      </div>
                      <div style={{ fontSize: 9, color: G.muted }}>{quote.user} · {quote.deals} deals closed</div>
                    </div>
                  ))}
                </div>
                <div style={{ background: G.greenGlow, border: `1px solid ${G.green}44`, borderRadius: 6, padding: "10px 12px", marginBottom: 14 }}>
                  <div style={{ fontSize: 9, color: G.green, letterSpacing: 3, marginBottom: 4 }}>BEST FOR</div>
                  <div style={{ fontSize: 11, color: G.text }}>{activeSoftware.bestFor}</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <a href={activeSoftware.url} target="_blank" rel="noopener noreferrer" style={{ ...btnG, flex: 1, textAlign: "center", textDecoration: "none", display: "block" }}>
                    Visit {activeSoftware.name} →
                  </a>
                </div>
                <div style={{ marginTop: 8, fontSize: 8, color: G.muted, textAlign: "center" }}>* DealBank may earn a referral commission if you sign up through this link.</div>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ fontFamily: G.serif, fontSize: 16, color: G.text, marginBottom: 4 }}>Software Reviews</div>
              <div style={{ fontSize: 10, color: G.muted, marginBottom: 14, lineHeight: 1.6 }}>Ranked by real deal maker feedback and verified reviews. DealBank earns affiliate commissions - it never affects our ratings.</div>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 14 }}>
                {["All", "Comps & Leads", "CRM", "Lead Generation", "Project Management"].map((filter) => (
                  <div key={filter} onClick={() => setSoftwareFilter(filter)} style={{ padding: "4px 10px", borderRadius: 4, cursor: "pointer", fontSize: 8, letterSpacing: 2, fontFamily: G.mono, border: `1px solid ${softwareFilter === filter ? G.green : G.border}`, background: softwareFilter === filter ? G.greenGlow : "transparent", color: softwareFilter === filter ? G.green : G.muted }}>
                    {filter}
                  </div>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {SOFTWARE_REVIEWS.filter((review) => softwareFilter === "All" || review.category.includes(softwareFilter.split(" ")[0])).map((review) => (
                  <div key={review.id} onClick={() => setActiveSoftware(review)} style={{ ...card, cursor: "pointer", borderColor: G.border, transition: "all .15s" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <div style={{ width: 36, height: 36, borderRadius: 7, background: `${review.logoColor}22`, border: `1px solid ${review.logoColor}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: review.logoColor, fontWeight: "bold" }}>{review.logo}</div>
                        <div>
                          <div style={{ fontFamily: G.serif, fontSize: 13, color: G.text, fontWeight: "bold" }}>{review.name}</div>
                          <div style={{ fontSize: 9, color: G.muted }}>{review.category}</div>
                        </div>
                      </div>
                      <div style={{ fontSize: 7, color: review.verdictColor, background: `${review.verdictColor}22`, border: `1px solid ${review.verdictColor}44`, borderRadius: 3, padding: "2px 6px", letterSpacing: 1, whiteSpace: "nowrap" }}>{review.verdict}</div>
                    </div>
                    <div style={{ fontSize: 10, color: G.muted, lineHeight: 1.6, marginBottom: 8 }}>{review.tagline}</div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ fontFamily: G.serif, fontSize: 12, color: G.gold }}>{"★".repeat(Math.floor(review.rating))} {review.rating} <span style={{ fontSize: 9, color: G.muted }}>({review.reviews.toLocaleString()})</span></div>
                      <div style={{ fontSize: 10, color: G.green, fontWeight: "bold" }}>{review.price}</div>
                    </div>
                    <div style={{ marginTop: 8, fontSize: 9, color: review.logoColor, letterSpacing: 1 }}>Read Full Review →</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {partnerTab === "insurance" && (
        <div>
          <div style={{ fontFamily: G.serif, fontSize: 16, color: G.text, marginBottom: 4 }}>Insurance for Deal Makers</div>
          <div style={{ fontSize: 10, color: G.muted, marginBottom: 6, lineHeight: 1.6 }}>Standard homeowner's insurance won't cover a flip. You need investor-specific policies. DealBank earns a referral fee on policies - it doesn't affect our recommendations.</div>
          <div style={{ background: "#1a0800", border: "1px solid #f9731644", borderRadius: 6, padding: "10px 14px", marginBottom: 14, fontSize: 10, color: "#fdba74", lineHeight: 1.6 }}>
            ⚠ <strong>Don't close without the right coverage.</strong> Vacant properties and active rehabs are excluded from most standard policies. Get a quote before you buy.
          </div>
          {INSURANCE_PARTNERS.map((ins) => (
            <div key={ins.id} style={{ ...card, marginBottom: 10, borderColor: `${ins.logoColor}33` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <div style={{ width: 40, height: 40, borderRadius: 8, background: `${ins.logoColor}22`, border: `1px solid ${ins.logoColor}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: ins.logoColor, fontWeight: "bold" }}>{ins.logo}</div>
                  <div>
                    <div style={{ fontFamily: G.serif, fontSize: 14, color: G.text, fontWeight: "bold" }}>{ins.name}</div>
                    <div style={{ fontSize: 9, color: ins.logoColor }}>{ins.type}</div>
                    <div style={{ fontFamily: G.serif, fontSize: 12, color: G.gold }}>{"★".repeat(Math.floor(ins.rating))} {ins.rating}</div>
                  </div>
                </div>
                <div style={{ fontSize: 7, color: ins.logoColor, background: `${ins.logoColor}22`, border: `1px solid ${ins.logoColor}44`, borderRadius: 3, padding: "3px 8px", letterSpacing: 2 }}>{ins.badge}</div>
              </div>
              <div style={{ fontSize: 11, color: G.muted, lineHeight: 1.7, marginBottom: 10 }}>{ins.tagline}</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, marginBottom: 10 }}>
                {ins.coverage.map((coverage, index) => (
                  <div key={index} style={{ fontSize: 9, color: G.text, display: "flex", gap: 5 }}><span style={{ color: G.green }}>✓</span>{coverage}</div>
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontSize: 9, color: G.muted }}>Avg Premium: <span style={{ color: G.text }}>{ins.avgPremium}</span></div>
              </div>
              <a href={ins.url} target="_blank" rel="noopener noreferrer" style={{ ...btnG, width: "100%", display: "block", textAlign: "center", textDecoration: "none", background: ins.logoColor, fontSize: 10 }}>
                Get a Quote →
              </a>
              <div style={{ marginTop: 6, fontSize: 8, color: G.muted, textAlign: "center" }}>* DealBank earns a referral fee per policy</div>
            </div>
          ))}
        </div>
      )}

      {partnerTab === "mortgage" && (
        <div>
          <div style={{ fontFamily: G.serif, fontSize: 16, color: G.text, marginBottom: 4 }}>Hard Money & Flip Financing</div>
          <div style={{ fontSize: 10, color: G.muted, marginBottom: 14, lineHeight: 1.6 }}>Ranked by DealBank deal maker feedback and funded loan volume. We earn a referral fee per funded loan - it never affects our rankings.</div>
          {AD_SLOTS.slice(1, 2).map((ad) => (
            <a key={ad.id} href={ad.url} target="_blank" rel="noopener noreferrer" style={{ display: "block", background: `linear-gradient(135deg, ${ad.color}18, transparent)`, border: `1px solid ${ad.color}44`, borderRadius: 8, padding: "12px 16px", marginBottom: 14, textDecoration: "none" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 7, color: ad.color, letterSpacing: 3, marginBottom: 3 }}>SPONSORED · {ad.company.toUpperCase()}</div>
                  <div style={{ fontFamily: G.serif, fontSize: 13, color: G.text, fontWeight: "bold", marginBottom: 1 }}>{ad.headline}</div>
                  <div style={{ fontSize: 9, color: G.muted }}>{ad.sub}</div>
                </div>
                <div style={{ background: ad.color, color: "#000", borderRadius: 4, padding: "7px 12px", fontSize: 9, fontFamily: G.mono, fontWeight: "bold", letterSpacing: 1, whiteSpace: "nowrap", marginLeft: 12 }}>{ad.cta}</div>
              </div>
            </a>
          ))}
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
            {MORTGAGE_PARTNERS.map((lender) => (
              <div key={lender.id} style={{ ...card, borderColor: `${lender.logoColor}33` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <div style={{ width: 42, height: 42, borderRadius: 8, background: `${lender.logoColor}22`, border: `1px solid ${lender.logoColor}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: lender.logoColor, fontWeight: "bold" }}>{lender.logo}</div>
                    <div>
                      <div style={{ fontFamily: G.serif, fontSize: 15, color: G.text, fontWeight: "bold" }}>{lender.name}</div>
                      <div style={{ fontSize: 9, color: lender.logoColor }}>{lender.type}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 7, color: lender.logoColor, background: `${lender.logoColor}22`, border: `1px solid ${lender.logoColor}44`, borderRadius: 3, padding: "3px 8px", letterSpacing: 2 }}>{lender.badge}</div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 10 }}>
                  {[{ l: "RATES", v: lender.rates }, { l: "POINTS", v: lender.points }, { l: "MAX LTV", v: lender.ltv }, { l: "CLOSE TIME", v: lender.closingTime }].map(({ l, v }) => (
                    <div key={l} style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 4, padding: "7px 9px", textAlign: "center" }}>
                      <div style={{ fontSize: 7, color: G.muted, letterSpacing: 2, marginBottom: 3 }}>{l}</div>
                      <div style={{ fontSize: 11, color: G.text, fontWeight: "bold", fontFamily: G.serif }}>{v}</div>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 11, color: G.muted, lineHeight: 1.7, marginBottom: 8 }}>{lender.tagline}</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, marginBottom: 10 }}>
                  {lender.features.map((feature, index) => (
                    <div key={index} style={{ fontSize: 9, color: G.text, display: "flex", gap: 5 }}><span style={{ color: G.green }}>✓</span>{feature}</div>
                  ))}
                </div>
                <div style={{ background: G.greenGlow, border: `1px solid ${G.green}33`, borderRadius: 5, padding: "8px 10px", marginBottom: 10, fontSize: 10, color: G.text, lineHeight: 1.6 }}>
                  💬 {lender.flipperNote}
                </div>
                <a href={lender.url} target="_blank" rel="noopener noreferrer" style={{ ...btnG, width: "100%", display: "block", textAlign: "center", textDecoration: "none", background: lender.logoColor, fontSize: 10 }}>
                  Apply with {lender.name} →
                </a>
                <div style={{ marginTop: 6, fontSize: 8, color: G.muted, textAlign: "center" }}>* DealBank earns a referral fee per funded loan</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
