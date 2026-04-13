import TopBar from "../components/TopBar";

export default function RealtorDashboardScreen({ G, card, btnG, btnO, onSignOut, userName }) {
  return (
    <div style={{ minHeight: "100vh", background: G.bg, color: G.text, fontFamily: G.mono }}>
      <TopBar title="REALTOR" tabs={[{ id: "r", icon: "🤝", label: "Referrals" }]} active="r" onTab={() => {}} userName={userName} onSignOut={onSignOut} G={G} btnO={btnO} />
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "20px 16px" }}>
        <div style={{ ...card, borderColor: `${G.blue}44`, marginBottom: 14 }}>
          <div style={{ fontSize: 9, color: "#60a5fa", letterSpacing: 3, marginBottom: 4 }}>ACTIVE REFERRALS</div>
          <div style={{ fontFamily: G.serif, fontSize: 14, color: G.text, marginBottom: 3 }}>
            <span style={{ color: G.green }}>3 active referrals</span> from DealBank deal makers
          </div>
          <div style={{ fontSize: 10, color: G.muted }}>DealBank earns 25% of your commission on each closed deal.</div>
        </div>
        {[
          { flipper: "Daniel P.", addr: "4605 Old Mill Ct, Salida, CA", listPrice: "$420,000", status: "Ready to List" },
          { flipper: "T. Williams", addr: "1842 Maple St, Sacramento, CA", listPrice: "$385,000", status: "Renovating" },
          { flipper: "M. Johnson", addr: "534 Oak Blvd, Stockton, CA", listPrice: "$310,000", status: "Under Contract" },
        ].map((referral, index) => (
          <div key={index} style={{ ...card, marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <div>
                <div style={{ fontFamily: G.serif, fontSize: 13, color: G.text, fontWeight: "bold", marginBottom: 2 }}>{referral.addr}</div>
                <div style={{ fontSize: 9, color: G.muted }}>
                  Deal Maker: {referral.flipper} · List Price: <span style={{ color: G.green }}>{referral.listPrice}</span>
                </div>
              </div>
              <div
                style={{
                  fontSize: 8,
                  color: referral.status === "Ready to List" ? G.green : G.gold,
                  background: referral.status === "Ready to List" ? G.greenGlow : "#1a1200",
                  border: `1px solid ${referral.status === "Ready to List" ? G.green : G.gold}44`,
                  borderRadius: 3,
                  padding: "3px 8px",
                  letterSpacing: 1,
                  height: "fit-content",
                }}
              >
                {referral.status}
              </div>
            </div>
            <button style={{ ...btnG, width: "100%", fontSize: 9, padding: "7px", background: referral.status === "Ready to List" ? G.green : "#1a2e1a", color: referral.status === "Ready to List" ? "#000" : G.muted }}>
              {referral.status === "Ready to List" ? "Contact Deal Maker" : "View Details"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
