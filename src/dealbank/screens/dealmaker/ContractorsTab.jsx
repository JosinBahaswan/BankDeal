export default function ContractorsTab({ ctx }) {
  const { G, card, btnG, MOCK_CONTRACTORS } = ctx;

  return (
    <div>
      <div style={{ fontFamily: G.serif, fontSize: 18, color: G.text, marginBottom: 14 }}>Local Contractor Network</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {MOCK_CONTRACTORS.map((contractor) => (
          <div key={contractor.id} style={{ ...card }}>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 8 }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: G.greenGlow, border: `1px solid ${G.green}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: G.green, fontWeight: "bold", flexShrink: 0 }}>
                {contractor.avatar}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 2 }}>
                  <div style={{ fontFamily: G.serif, fontSize: 13, color: G.text, fontWeight: "bold" }}>{contractor.name}</div>
                  {contractor.verified && <div style={{ fontSize: 7, color: G.green, background: G.greenGlow, border: `1px solid ${G.green}44`, borderRadius: 3, padding: "1px 4px", letterSpacing: 1 }}>✓ VERIFIED</div>}
                </div>
                <div style={{ fontSize: 9, color: G.gold }}>{contractor.trade}</div>
                <div style={{ fontSize: 9, color: G.muted }}>{contractor.location} · ★ {contractor.rating} · {contractor.jobs} jobs · {contractor.rate}</div>
              </div>
            </div>
            <div style={{ fontSize: 10, color: G.muted, lineHeight: 1.6, marginBottom: 8 }}>{contractor.bio}</div>
            <button
              onClick={() => window.alert(`Quote request sent to ${contractor.name}\nTrade: ${contractor.trade}\nRate: ${contractor.rate}`)}
              style={{ ...btnG, width: "100%", fontSize: 9, padding: "8px" }}
            >
              Request Quote
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
