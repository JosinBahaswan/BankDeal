export default function BuyerNetworkView({
  G,
  card,
  btnO,
  buyersLoading,
  buyersError,
  buyers,
  buyerStats,
  onBack,
}) {
  return (
    <div>
      <button onClick={onBack} style={{ ...btnO, marginBottom: 14, padding: "5px 12px", fontSize: 9 }}>Back to Deals</button>
      <div style={{ fontFamily: G.serif, fontSize: 18, color: G.text, marginBottom: 4 }}>Active Buyer Network</div>
      <div style={{ fontSize: 10, color: G.muted, marginBottom: 14 }}>Live buyer profiles are loaded from database and refreshed in real time.</div>

      {buyersError && (
        <div style={{ ...card, marginBottom: 10, borderColor: `${G.red}55`, color: G.red, fontSize: 10 }}>
          {buyersError}
        </div>
      )}

      {buyersLoading && (
        <div style={{ ...card, marginBottom: 10, fontSize: 10, color: G.muted }}>
          Loading buyer network from Supabase...
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 8, marginBottom: 14 }}>
        {[
          { l: "Active Buyers", v: String(buyerStats.activeBuyers || 0), c: G.green },
          { l: "Avg Buy Box", v: buyerStats.avgBuyBox || "No data", c: G.text },
          { l: "Deals/Mo Capacity", v: buyerStats.dealsPerMonthCapacity || "0", c: G.gold },
          { l: "Avg Close Time", v: buyerStats.avgCloseTime || "No data", c: G.green },
        ].map(({ l, v, c }) => (
          <div key={l} style={{ ...card, textAlign: "center" }}>
            <div style={{ fontSize: 9, color: G.muted, marginBottom: 4 }}>{l}</div>
            <div style={{ fontFamily: G.serif, fontSize: 15, color: c, fontWeight: "bold" }}>{v}</div>
          </div>
        ))}
      </div>

      {buyers.map((buyer) => (
        <div key={buyer.id} style={{ ...card, marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                <div style={{ fontFamily: G.serif, fontSize: 14, color: G.text, fontWeight: "bold" }}>{buyer.companyName}</div>
                {buyer.isVerified && (
                  <div style={{ fontSize: 7, color: G.green, background: G.greenGlow, border: `1px solid ${G.green}44`, borderRadius: 3, padding: "1px 5px", letterSpacing: 1 }}>
                    VERIFIED
                  </div>
                )}
              </div>
              <div style={{ fontSize: 9, color: G.muted }}>{buyer.marketsLabel}</div>
              <div style={{ fontSize: 9, color: G.muted }}>Contact: {buyer.contactName}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 10, color: G.green, fontFamily: G.serif, fontWeight: "bold" }}>{buyer.monthlyCapacity || 0}/mo</div>
              <div style={{ fontSize: 8, color: G.muted }}>capacity</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 14, fontSize: 9, color: G.muted, flexWrap: "wrap" }}>
            <span>Buy box: <strong style={{ color: G.text }}>{buyer.buyBoxLabel}</strong></span>
            <span>Financing: <strong style={{ color: G.text }}>{buyer.financingLabel}</strong></span>
            <span>Close time: <strong style={{ color: G.text }}>{buyer.closeTimeDays || "-"} days</strong></span>
          </div>
        </div>
      ))}

      {!buyersLoading && buyers.length === 0 && (
        <div style={{ ...card, textAlign: "center", fontSize: 10, color: G.muted }}>
          No buyer profiles are active yet.
        </div>
      )}
    </div>
  );
}
