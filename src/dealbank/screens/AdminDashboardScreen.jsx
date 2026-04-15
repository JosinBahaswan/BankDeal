import TopBar from "../components/TopBar";
import useIsMobile from "../core/useIsMobile";

export default function AdminDashboardScreen({ G, card, lbl, btnO, MOCK_CONTRACTORS, adminTab, setAdminTab, userName, onSignOut }) {
  const isMobile = useIsMobile(820);

  const ATABS = [
    { id: "overview", icon: "📊", label: "Overview" },
    { id: "users", icon: "👥", label: "Users" },
    { id: "revenue", icon: "💰", label: "Revenue" },
    { id: "deals", icon: "🏠", label: "Deals" },
    { id: "contractors", icon: "🔨", label: "Contractors" },
  ];

  const userRows = [
    { name: "Daniel P.", email: "daniel@cashoffers.com", type: "dealmaker", status: "Active", joined: "Apr 1" },
    { name: "Ray Dominguez", email: "ray@contractor.com", type: "contractor", status: "Active", joined: "Mar 28" },
    { name: "Sandra Okafor", email: "sandra@kw.com", type: "realtor", status: "Active", joined: "Mar 15" },
    { name: "Mike Torres", email: "mike@hvac.com", type: "contractor", status: "Active", joined: "Apr 3" },
    { name: "T. Williams", email: "twilliams@flip.com", type: "dealmaker", status: "Trial", joined: "Apr 8" },
    { name: "M. Johnson", email: "mj@invest.com", type: "dealmaker", status: "Active", joined: "Feb 20" },
  ];

  const dealRows = [
    { addr: "4605 Old Mill Ct, Salida CA", user: "Daniel P.", stage: "Analyzing", arv: "$385,000", offer: "$198,000", profit: "$72,000", date: "Apr 10" },
    { addr: "1842 Maple St, Sacramento CA", user: "T. Williams", stage: "Renovating", arv: "$420,000", offer: "$215,000", profit: "$84,000", date: "Mar 28" },
    { addr: "534 Oak Blvd, Stockton CA", user: "M. Johnson", stage: "Selling", arv: "$310,000", offer: "$161,000", profit: "$61,000", date: "Feb 14" },
    { addr: "3421 Poplar Ave, Sacramento CA", user: "S. Park", stage: "Closed", arv: "$385,000", offer: "$195,000", profit: "$78,000", date: "Jan 30" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: G.bg, color: G.text, fontFamily: G.mono }}>
      <TopBar title="ADMIN" tabs={ATABS} active={adminTab} onTab={setAdminTab} userName={userName} onSignOut={onSignOut} G={G} btnO={btnO} />
      <div style={{ maxWidth: 980, margin: "0 auto", padding: isMobile ? "14px 12px 20px" : "20px 16px" }}>
        {adminTab === "overview" && (
          <div>
            <div style={{ fontFamily: G.serif, fontSize: isMobile ? 18 : 20, color: G.text, marginBottom: 14 }}>Platform Overview</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 10, marginBottom: 12 }}>
              {[
                { l: "Total Users", v: "1,284", c: G.green, sub: "+47 this week" },
                { l: "Active Deal Makers", v: "832", c: G.text, sub: "65% of users" },
                { l: "Contractors", v: "318", c: G.gold, sub: "$79/mo subs" },
                { l: "Realtors", v: "134", c: G.blue, sub: "Rev share only" },
              ].map(({ l, v, c, sub }) => (
                <div key={l} style={{ ...card }}>
                  <div style={lbl}>{l}</div>
                    <div style={{ fontFamily: G.serif, fontSize: isMobile ? 22 : 26, color: c, fontWeight: "bold", marginBottom: 2 }}>{v}</div>
                  <div style={{ fontSize: 9, color: G.muted }}>{sub}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 10, marginBottom: 12 }}>
              {[
                { l: "MRR", v: "$66,840", c: G.green, sub: "Deal Maker + Contractor subs" },
                { l: "Deals Analyzed", v: "4,231", c: G.text, sub: "This month" },
                { l: "Realtor Splits Earned", v: "$18,400", c: G.gold, sub: "Commission referrals YTD" },
              ].map(({ l, v, c, sub }) => (
                <div key={l} style={{ ...card }}>
                  <div style={lbl}>{l}</div>
                  <div style={{ fontFamily: G.serif, fontSize: 22, color: c, fontWeight: "bold", marginBottom: 2 }}>{v}</div>
                  <div style={{ fontSize: 9, color: G.muted }}>{sub}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
              <div style={{ ...card }}>
                <div style={{ ...lbl, marginBottom: 10 }}>Top States by Activity</div>
                {[["California", "38%", 380], ["Texas", "22%", 220], ["Florida", "16%", 160], ["Arizona", "12%", 120], ["Georgia", "8%", 80]].map(([state, pct, width]) => (
                  <div key={state} style={{ marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, marginBottom: 3 }}>
                      <span style={{ color: G.text }}>{state}</span>
                      <span style={{ color: G.green }}>{pct}</span>
                    </div>
                    <div style={{ height: 4, background: G.faint, borderRadius: 2 }}>
                      <div style={{ height: "100%", width: `${width / 4}%`, background: G.green, borderRadius: 2 }} />
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ ...card }}>
                <div style={{ ...lbl, marginBottom: 10 }}>Recent Platform Activity</div>
                {[
                  { e: "New deal maker signup", t: "2 min ago", c: G.green },
                  { e: "Deal saved to pipeline", t: "5 min ago", c: G.text },
                  { e: "Contractor quote sent", t: "12 min ago", c: G.gold },
                  { e: "Realtor match accepted", t: "28 min ago", c: G.blue },
                  { e: "Deal closed - split earned", t: "1h ago", c: G.green },
                  { e: "New contractor sub", t: "2h ago", c: G.gold },
                ].map(({ e, t, c }, index) => (
                  <div key={index} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: index < 5 ? `1px solid ${G.faint}` : "none" }}>
                    <span style={{ fontSize: 10, color: c }}>● {e}</span>
                    <span style={{ fontSize: 9, color: G.muted }}>{t}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {adminTab === "users" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "center", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
              <div style={{ fontFamily: G.serif, fontSize: isMobile ? 18 : 20, color: G.text }}>User Management</div>
              <div style={{ fontSize: 10, color: G.muted }}>1,284 total users</div>
            </div>
            <div style={{ ...card }}>
              {!isMobile && (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", padding: "8px 12px", background: G.surface, borderRadius: "4px 4px 0 0", borderBottom: `1px solid ${G.border}`, marginBottom: 0 }}>
                    {["NAME / EMAIL", "TYPE", "STATUS", "JOINED", "ACTION"].map((header) => (
                      <div key={header} style={{ fontSize: 8, color: G.muted, letterSpacing: 2 }}>{header}</div>
                    ))}
                  </div>
                  {userRows.map((userRow, index) => (
                    <div key={index} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", padding: "10px 12px", borderBottom: `1px solid ${G.faint}`, alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: 11, color: G.text }}>{userRow.name}</div>
                        <div style={{ fontSize: 9, color: G.muted }}>{userRow.email}</div>
                      </div>
                      <div style={{ fontSize: 9, color: userRow.type === "dealmaker" ? G.green : userRow.type === "contractor" ? G.gold : G.blue, textTransform: "capitalize" }}>{userRow.type}</div>
                      <div style={{ fontSize: 9, color: userRow.status === "Active" ? G.green : G.gold }}>{userRow.status}</div>
                      <div style={{ fontSize: 9, color: G.muted }}>{userRow.joined}</div>
                      <button
                        onClick={() => window.alert(`User: ${userRow.name}\nType: ${userRow.type}\nEmail: ${userRow.email}\nStatus: ${userRow.status}`)}
                        style={{ ...btnO, padding: "4px 10px", fontSize: 8 }}
                      >
                        View
                      </button>
                    </div>
                  ))}
                </>
              )}

              {isMobile && (
                <div>
                  {userRows.map((userRow) => (
                    <div key={`${userRow.email}-${userRow.joined}`} style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 6, padding: "10px", marginBottom: 8 }}>
                      <div style={{ fontFamily: G.serif, fontSize: 13, color: G.text, marginBottom: 2 }}>{userRow.name}</div>
                      <div style={{ fontSize: 9, color: G.muted, marginBottom: 8 }}>{userRow.email}</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 8 }}>
                        <div style={{ fontSize: 9, color: G.muted }}>Type: <span style={{ color: userRow.type === "dealmaker" ? G.green : userRow.type === "contractor" ? G.gold : G.blue, textTransform: "capitalize" }}>{userRow.type}</span></div>
                        <div style={{ fontSize: 9, color: G.muted }}>Status: <span style={{ color: userRow.status === "Active" ? G.green : G.gold }}>{userRow.status}</span></div>
                        <div style={{ fontSize: 9, color: G.muted }}>Joined: {userRow.joined}</div>
                      </div>
                      <button
                        onClick={() => window.alert(`User: ${userRow.name}\nType: ${userRow.type}\nEmail: ${userRow.email}\nStatus: ${userRow.status}`)}
                        style={{ ...btnO, padding: "6px 10px", fontSize: 8, width: "100%" }}
                      >
                        View
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {adminTab === "revenue" && (
          <div>
            <div style={{ fontFamily: G.serif, fontSize: isMobile ? 18 : 20, color: G.text, marginBottom: 12 }}>Revenue Dashboard</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 10, marginBottom: 12 }}>
              {[
                { l: "Deal Maker Subs", v: "$41,168", sub: "832 x $49/mo", c: G.green },
                { l: "Contractor Subs", v: "$25,122", sub: "318 x $79/mo", c: G.gold },
                { l: "Realtor Splits", v: "$18,400", sub: "YTD commission splits", c: G.blue },
                { l: "Deal Marketplace", v: "$3,200", sub: "Listing fees", c: G.text },
                { l: "Total MRR", v: "$66,840", sub: "Monthly recurring", c: G.green },
                { l: "ARR Projection", v: "$802,080", sub: "Annualized", c: G.green },
              ].map(({ l, v, sub, c }) => (
                <div key={l} style={{ ...card }}>
                  <div style={lbl}>{l}</div>
                  <div style={{ fontFamily: G.serif, fontSize: 20, color: c, fontWeight: "bold", marginBottom: 2 }}>{v}</div>
                  <div style={{ fontSize: 9, color: G.muted }}>{sub}</div>
                </div>
              ))}
            </div>
            <div style={{ ...card }}>
              <div style={{ ...lbl, marginBottom: 12 }}>Revenue Streams Breakdown</div>
              {[
                ["Deal Maker Subscriptions", "$49/mo per deal maker", "62%", G.green],
                ["Contractor Subscriptions", "$79/mo per contractor", "38%", G.gold],
                ["Realtor Commission Splits", "25% of agent commission", "pending", G.blue],
                ["Deal Marketplace Fees", "$99 per listing", "5%", G.text],
                ["Premium Lead Packages", "Future - $299/mo", "-", G.muted],
              ].map(([stream, model, pct, color]) => (
                <div key={stream} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${G.faint}`, alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 11, color: G.text }}>{stream}</div>
                    <div style={{ fontSize: 9, color: G.muted, marginTop: 2 }}>{model}</div>
                  </div>
                  <div style={{ fontFamily: G.serif, fontSize: 13, color, fontWeight: "bold" }}>{pct}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {adminTab === "deals" && (
          <div>
            <div style={{ fontFamily: G.serif, fontSize: isMobile ? 18 : 20, color: G.text, marginBottom: 12 }}>All Deals - Platform Wide</div>
            {dealRows.map((deal, index) => (
              <div key={index} style={{ ...card, marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
                  <div style={{ fontFamily: G.serif, fontSize: 13, color: G.text, fontWeight: "bold" }}>{deal.addr}</div>
                  <div style={{ fontSize: 8, color: deal.stage === "Closed" ? G.green : deal.stage === "Selling" ? G.gold : G.muted, background: G.greenGlow, borderRadius: 3, padding: "2px 8px", letterSpacing: 1 }}>{deal.stage}</div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(5,minmax(0,1fr))", gap: 6, fontSize: 9, color: G.muted }}>
                  <span>User: <strong style={{ color: G.text }}>{deal.user}</strong></span>
                  <span>ARV: <strong style={{ color: G.green }}>{deal.arv}</strong></span>
                  <span>Offer: <strong style={{ color: G.text }}>{deal.offer}</strong></span>
                  <span>Profit: <strong style={{ color: G.green }}>{deal.profit}</strong></span>
                  <span>Date: {deal.date}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {adminTab === "contractors" && (
          <div>
            <div style={{ fontFamily: G.serif, fontSize: isMobile ? 18 : 20, color: G.text, marginBottom: 12 }}>Contractor Network</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 10 }}>
              {MOCK_CONTRACTORS.map((contractor) => (
                <div key={contractor.id} style={{ ...card }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: G.greenGlow, border: `1px solid ${G.green}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: G.green, fontWeight: "bold" }}>{contractor.avatar}</div>
                    <div>
                      <div style={{ fontFamily: G.serif, fontSize: 13, color: G.text, fontWeight: "bold" }}>{contractor.name}</div>
                      <div style={{ fontSize: 9, color: G.gold }}>{contractor.trade} · {contractor.location}</div>
                    </div>
                    {contractor.verified && <div style={{ marginLeft: "auto", fontSize: 7, color: G.green, background: G.greenGlow, border: `1px solid ${G.green}44`, borderRadius: 3, padding: "2px 5px" }}>VERIFIED</div>}
                  </div>
                  <div style={{ display: "flex", gap: 12, fontSize: 9, color: G.muted }}>
                    <span>★ {contractor.rating}</span>
                    <span>{contractor.jobs} jobs</span>
                    <span>{contractor.rate}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
