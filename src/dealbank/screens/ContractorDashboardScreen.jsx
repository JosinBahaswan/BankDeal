import TopBar from "../components/TopBar";

export default function ContractorDashboardScreen({ G, card, btnG, contractorTab, setContractorTab, user, onSignOut, btnO }) {
  const CTABS = [
    { id: "leads", icon: "🔔", label: "Job Leads" },
    { id: "profile", icon: "👤", label: "Profile" },
    { id: "earnings", icon: "💰", label: "Earnings" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: G.bg, color: G.text, fontFamily: G.mono }}>
      <TopBar title="CONTRACTOR" tabs={CTABS} active={contractorTab} onTab={setContractorTab} userName={user?.name} onSignOut={onSignOut} G={G} btnO={btnO} />
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "20px 16px" }}>
        {contractorTab === "leads" && (
          <div>
            <div style={{ fontFamily: G.serif, fontSize: 18, color: G.text, marginBottom: 4 }}>Job Leads</div>
            <div style={{ fontSize: 10, color: G.muted, marginBottom: 14 }}>Deal Makers nearby looking for help</div>
            {[
              { addr: "1842 Maple St, Sacramento", trade: "Kitchen & Bath", budget: "$18,000-$24,000", flipper: "T. Williams", posted: "2h ago", urgent: true },
              { addr: "534 Oak Blvd, Stockton", trade: "HVAC", budget: "$6,000-$9,000", flipper: "M. Johnson", posted: "5h ago", urgent: false },
              { addr: "2201 Pine Ave, Modesto", trade: "General Contractor", budget: "$55,000-$70,000", flipper: "S. Park", posted: "1d ago", urgent: false },
            ].map((lead, index) => (
              <div key={index} style={{ ...card, marginBottom: 10, borderColor: lead.urgent ? `${G.gold}66` : G.border }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <div style={{ fontFamily: G.serif, fontSize: 13, color: G.text, fontWeight: "bold" }}>{lead.addr}</div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    {lead.urgent && <div style={{ fontSize: 7, color: G.gold, background: "#1a1200", border: `1px solid ${G.gold}44`, borderRadius: 3, padding: "2px 6px", letterSpacing: 1 }}>URGENT</div>}
                    <div style={{ fontSize: 9, color: G.muted }}>{lead.posted}</div>
                  </div>
                </div>
                <div style={{ fontSize: 10, color: G.muted, marginBottom: 8 }}>
                  Trade: <span style={{ color: G.green }}>{lead.trade}</span> · Budget: <span style={{ color: G.text }}>{lead.budget}</span>
                </div>
                <button style={{ ...btnG, width: "100%", fontSize: 9, padding: "8px" }}>Send Quote</button>
              </div>
            ))}
          </div>
        )}

        {contractorTab === "profile" && (
          <div>
            <div style={{ fontFamily: G.serif, fontSize: 18, color: G.text, marginBottom: 14 }}>My Profile</div>
            <div style={{ ...card, marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                <div style={{ width: 52, height: 52, borderRadius: "50%", background: G.greenGlow, border: `2px solid ${G.green}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: G.green, fontWeight: "bold" }}>
                  {(user?.name || "U").split(" ").map((name) => name[0]).join("")}
                </div>
                <div>
                  <div style={{ fontFamily: G.serif, fontSize: 15, color: G.text, fontWeight: "bold" }}>{user?.name}</div>
                  <div style={{ fontSize: 10, color: G.green }}>{user?.trade}</div>
                  <div style={{ fontSize: 9, color: G.muted }}>{user?.location}</div>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
                {[{ l: "Quotes Sent", v: "12" }, { l: "Jobs Won", v: "4" }, { l: "Rating", v: "4.9 ★" }].map(({ l, v }) => (
                  <div key={l} style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 5, padding: "10px", textAlign: "center" }}>
                    <div style={{ fontSize: 8, color: G.muted, letterSpacing: 2, marginBottom: 3 }}>{l.toUpperCase()}</div>
                    <div style={{ fontFamily: G.serif, fontSize: 16, color: G.green, fontWeight: "bold" }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {contractorTab === "earnings" && (
          <div>
            <div style={{ fontFamily: G.serif, fontSize: 18, color: G.text, marginBottom: 14 }}>Earnings</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 14 }}>
              {[
                { l: "This Month", v: "$8,400", c: G.green },
                { l: "Last Month", v: "$11,200", c: G.text },
                { l: "All Time", v: "$43,600", c: G.text },
              ].map(({ l, v, c }) => (
                <div key={l} style={{ ...card, textAlign: "center" }}>
                  <div style={{ fontSize: 8, color: G.muted, letterSpacing: 2, marginBottom: 5 }}>{l.toUpperCase()}</div>
                  <div style={{ fontFamily: G.serif, fontSize: 22, color: c, fontWeight: "bold" }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
