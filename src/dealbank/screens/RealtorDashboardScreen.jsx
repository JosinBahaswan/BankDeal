import TopBar from "../components/TopBar";
import useIsMobile from "../core/useIsMobile";

export default function RealtorDashboardScreen({ G, card, lbl, btnG, btnO, onSignOut, userName, user, realtorTab, setRealtorTab }) {
  const isMobile = useIsMobile(820);

  const RTABS = [
    { id: "referrals", icon: "🤝", label: "Referrals" },
    { id: "listings", icon: "🏠", label: "Active Listings" },
    { id: "closed", icon: "✅", label: "Closed Deals" },
    { id: "profile", icon: "👤", label: "My Profile" },
    { id: "splits", icon: "💵", label: "Earnings & Splits" },
  ];

  const referrals = [
    { flipper: "Daniel P.", addr: "4605 Old Mill Ct, Salida, CA", beds: 4, baths: 2, sqft: 1780, listPrice: 420000, status: "Ready to List", days: 2, note: "Final punch list wraps Friday.", urgency: "high" },
    { flipper: "T. Williams", addr: "1842 Maple St, Sacramento, CA", beds: 3, baths: 2, sqft: 1420, listPrice: 385000, status: "Renovating", days: 12, note: "Staging scheduled for next week.", urgency: "medium" },
    { flipper: "M. Johnson", addr: "534 Oak Blvd, Stockton, CA", beds: 3, baths: 2, sqft: 1350, listPrice: 310000, status: "Under Contract", days: 18, note: "Waiting on final inspection report.", urgency: "low" },
  ];

  const activeListings = [
    { address: "4605 Old Mill Ct, Salida", listPrice: 420000, dom: 9, showings: 16, offers: 3, status: "Hot" },
    { address: "1842 Maple St, Sacramento", listPrice: 385000, dom: 14, showings: 11, offers: 1, status: "Active" },
    { address: "534 Oak Blvd, Stockton", listPrice: 310000, dom: 6, showings: 7, offers: 2, status: "Hot" },
  ];

  const closedDeals = [
    { address: "3421 Poplar Ave, Sacramento", salePrice: 402000, grossCommission: 10050, yourNet: 7538, date: "Mar 29", dealMaker: "S. Park" },
    { address: "2891 Vista Canyon Rd, Bakersfield", salePrice: 278000, grossCommission: 6950, yourNet: 5213, date: "Feb 18", dealMaker: "D. Patel" },
    { address: "908 Birchwood Dr, Stockton", salePrice: 325000, grossCommission: 8125, yourNet: 6094, date: "Jan 31", dealMaker: "R. Torres" },
  ];

  const netYtd = closedDeals.reduce((sum, row) => sum + row.yourNet, 0);
  const grossYtd = closedDeals.reduce((sum, row) => sum + row.grossCommission, 0);
  const dealbankSplit = grossYtd - netYtd;
  const activeReferralCount = referrals.length;
  const readyToListCount = referrals.filter((row) => row.status === "Ready to List").length;
  const projectedCommission = referrals.reduce((sum, row) => sum + (row.listPrice * 0.025 * 0.75), 0);

  return (
    <div style={{ minHeight: "100vh", background: G.bg, color: G.text, fontFamily: G.mono }}>
      <TopBar title="REALTOR" tabs={RTABS} active={realtorTab} onTab={setRealtorTab} userName={userName} onSignOut={onSignOut} G={G} btnO={btnO} />
      <div style={{ maxWidth: 860, margin: "0 auto", padding: isMobile ? "14px 12px 20px" : "20px 16px" }}>
        {realtorTab === "referrals" && (
          <div>
            <div style={{ ...card, borderColor: `${G.blue}44`, marginBottom: 14 }}>
              <div style={{ fontSize: 9, color: "#60a5fa", letterSpacing: 3, marginBottom: 6 }}>ACTIVE REFERRALS</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 8 }}>
                {[
                  { l: "Active Referrals", v: activeReferralCount, c: G.blue },
                  { l: "Ready to List", v: readyToListCount, c: G.green },
                  { l: "Projected Commission", v: `$${Math.round(projectedCommission).toLocaleString()}`, c: G.green },
                  { l: "DealBank Split", v: "25%", c: G.gold },
                ].map(({ l, v, c }) => (
                  <div key={l} style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 6, padding: "8px 10px", textAlign: "center" }}>
                    <div style={{ fontSize: 7, color: G.muted, letterSpacing: 2, marginBottom: 2 }}>{l.toUpperCase()}</div>
                    <div style={{ fontFamily: G.serif, fontSize: 14, color: c, fontWeight: "bold" }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>

            {referrals.map((referral, index) => {
              const urgencyColor = referral.urgency === "high" ? G.green : referral.urgency === "medium" ? G.gold : G.muted;
              const gross = referral.listPrice * 0.025;
              const net = gross * 0.75;

              return (
                <div key={index} style={{ ...card, marginBottom: 8, borderColor: `${urgencyColor}44` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, gap: 8, flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontFamily: G.serif, fontSize: 13, color: G.text, fontWeight: "bold", marginBottom: 2 }}>{referral.addr}</div>
                      <div style={{ fontSize: 9, color: G.muted, lineHeight: 1.6 }}>
                        {referral.beds}bd/{referral.baths}ba · {referral.sqft.toLocaleString()} sqft · Deal Maker: {referral.flipper}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 8, color: G.muted, letterSpacing: 1, marginBottom: 2 }}>{referral.days}d in pipeline</div>
                      <div style={{ fontSize: 8, color: urgencyColor, border: `1px solid ${urgencyColor}44`, background: `${urgencyColor}22`, borderRadius: 3, padding: "2px 8px", letterSpacing: 1 }}>
                        {referral.status}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "center", marginBottom: 8, gap: 6, flexWrap: "wrap" }}>
                    <div style={{ fontSize: 10, color: G.muted }}>
                      Target List: <span style={{ color: G.text }}>${referral.listPrice.toLocaleString()}</span>
                    </div>
                    <div style={{ fontSize: 10, color: G.muted }}>
                      Est. Commission: <span style={{ color: G.green, fontFamily: G.serif }}>${Math.round(net).toLocaleString()}</span>
                    </div>
                  </div>

                  <div style={{ fontSize: 10, color: G.muted, marginBottom: 8 }}>{referral.note}</div>

                  <button
                    onClick={() => window.alert(`${referral.status === "Ready to List" ? "Contacting" : "Opening details for"} ${referral.flipper}\nProperty: ${referral.addr}`)}
                    style={{ ...btnG, width: "100%", fontSize: 9, padding: "7px", background: referral.status === "Ready to List" ? G.green : "#1a2e1a", color: referral.status === "Ready to List" ? "#000" : G.muted }}
                  >
                    {referral.status === "Ready to List" ? "Contact Now" : "Schedule Call"}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {realtorTab === "listings" && (
          <div>
            <div style={{ fontFamily: G.serif, fontSize: 18, color: G.text, marginBottom: 12 }}>Active Listings</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10, marginBottom: 12 }}>
              {[
                { l: "Active", v: activeListings.length, c: G.blue },
                { l: "Total List Value", v: `$${activeListings.reduce((sum, row) => sum + row.listPrice, 0).toLocaleString()}`, c: G.green },
                { l: "Avg DOM", v: `${Math.round(activeListings.reduce((sum, row) => sum + row.dom, 0) / activeListings.length)} days`, c: G.gold },
              ].map(({ l, v, c }) => (
                <div key={l} style={{ ...card, textAlign: "center" }}>
                  <div style={{ fontSize: 8, color: G.muted, letterSpacing: 2, marginBottom: 4 }}>{l.toUpperCase()}</div>
                  <div style={{ fontFamily: G.serif, fontSize: 16, color: c, fontWeight: "bold" }}>{v}</div>
                </div>
              ))}
            </div>

            {activeListings.map((listing) => (
              <div key={listing.address} style={{ ...card, marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, gap: 8, flexWrap: "wrap" }}>
                  <div style={{ fontFamily: G.serif, fontSize: 13, color: G.text }}>{listing.address}</div>
                  <div style={{ fontSize: 8, color: listing.status === "Hot" ? G.green : G.blue, border: `1px solid ${listing.status === "Hot" ? G.green : G.blue}44`, background: listing.status === "Hot" ? G.greenGlow : `${G.blue}22`, borderRadius: 3, padding: "2px 7px" }}>{listing.status}</div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,minmax(0,1fr))", gap: 6, fontSize: 9, color: G.muted, marginBottom: 8 }}>
                  <span>List: <strong style={{ color: G.text }}>${listing.listPrice.toLocaleString()}</strong></span>
                  <span>DOM: {listing.dom}</span>
                  <span>Showings: {listing.showings}</span>
                  <span>Offers: {listing.offers}</span>
                </div>
                <div style={{ display: "flex", gap: 6, flexDirection: isMobile ? "column" : "row" }}>
                  <button onClick={() => window.alert(`Manage listing opened for ${listing.address}`)} style={{ ...btnG, flex: 1, fontSize: 8, padding: "6px 8px" }}>Manage Listing</button>
                  <button onClick={() => window.alert(`Message sent to deal maker for ${listing.address}`)} style={{ ...btnO, flex: 1, fontSize: 8, padding: "6px 8px" }}>Message Deal Maker</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {realtorTab === "closed" && (
          <div>
            <div style={{ fontFamily: G.serif, fontSize: 18, color: G.text, marginBottom: 12 }}>Closed Deals</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 10, marginBottom: 12 }}>
              {[
                { l: "Closed YTD", v: closedDeals.length, c: G.green },
                { l: "Total Volume", v: `$${closedDeals.reduce((sum, row) => sum + row.salePrice, 0).toLocaleString()}`, c: G.text },
                { l: "Gross Commission", v: `$${Math.round(grossYtd).toLocaleString()}`, c: G.gold },
                { l: "Your Net (75%)", v: `$${Math.round(netYtd).toLocaleString()}`, c: G.green },
              ].map(({ l, v, c }) => (
                <div key={l} style={{ ...card, textAlign: "center" }}>
                  <div style={{ fontSize: 8, color: G.muted, letterSpacing: 2, marginBottom: 4 }}>{l.toUpperCase()}</div>
                  <div style={{ fontFamily: G.serif, fontSize: 16, color: c, fontWeight: "bold" }}>{v}</div>
                </div>
              ))}
            </div>

            <div style={{ ...card }}>
              <div style={{ ...lbl, marginBottom: 8 }}>Transaction History</div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", minWidth: 720, borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ textAlign: "left", borderBottom: `1px solid ${G.border}` }}>
                      {["Address", "Sale Price", "Gross Comm", "Your Net", "Date", "Deal Maker"].map((head) => (
                        <th key={head} style={{ fontSize: 8, color: G.muted, letterSpacing: 1, fontWeight: "normal", padding: "8px 6px" }}>{head}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {closedDeals.map((row) => (
                      <tr key={`${row.address}-${row.date}`} style={{ borderBottom: `1px solid ${G.faint}` }}>
                        <td style={{ fontSize: 10, color: G.text, padding: "8px 6px" }}>{row.address}</td>
                        <td style={{ fontSize: 10, color: G.text, padding: "8px 6px" }}>${row.salePrice.toLocaleString()}</td>
                        <td style={{ fontSize: 10, color: G.gold, padding: "8px 6px" }}>${row.grossCommission.toLocaleString()}</td>
                        <td style={{ fontSize: 10, color: G.green, padding: "8px 6px" }}>${row.yourNet.toLocaleString()}</td>
                        <td style={{ fontSize: 9, color: G.muted, padding: "8px 6px" }}>{row.date}</td>
                        <td style={{ fontSize: 9, color: G.muted, padding: "8px 6px" }}>{row.dealMaker}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {realtorTab === "profile" && (
          <div>
            <div style={{ fontFamily: G.serif, fontSize: 18, color: G.text, marginBottom: 12 }}>My Profile</div>

            <div style={{ ...card, marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: isMobile ? "flex-start" : "center", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
                <div style={{ width: 54, height: 54, borderRadius: "50%", background: `${G.blue}22`, border: `1px solid ${G.blue}55`, display: "flex", alignItems: "center", justifyContent: "center", color: G.blue, fontWeight: "bold", fontSize: 16 }}>
                  {(userName || "R").split(" ").map((part) => part[0]).join("")}
                </div>
                <div>
                  <div style={{ fontFamily: G.serif, fontSize: 15, color: G.text }}>{userName}</div>
                  <div style={{ fontSize: 9, color: G.blue }}>{user?.company || "Brokerage Partner"}</div>
                  <div style={{ fontSize: 9, color: G.muted }}>{user?.location || "California"}</div>
                </div>
                <div style={{ marginLeft: isMobile ? 0 : "auto", display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <div style={{ fontSize: 8, color: G.blue, border: `1px solid ${G.blue}44`, background: `${G.blue}22`, borderRadius: 3, padding: "2px 6px" }}>Verified</div>
                  <div style={{ fontSize: 8, color: G.green, border: `1px solid ${G.green}44`, background: G.greenGlow, borderRadius: 3, padding: "2px 6px" }}>Top Agent</div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 8, marginBottom: 10 }}>
                {[
                  { l: "Deals Closed", v: "12" },
                  { l: "Avg DOM", v: "17" },
                  { l: "Response", v: "98%" },
                  { l: "Repeat Clients", v: "7" },
                ].map(({ l, v }) => (
                  <div key={l} style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 5, padding: "8px", textAlign: "center" }}>
                    <div style={{ fontSize: 7, color: G.muted, letterSpacing: 2, marginBottom: 2 }}>{l.toUpperCase()}</div>
                    <div style={{ fontFamily: G.serif, fontSize: 15, color: G.blue }}>{v}</div>
                  </div>
                ))}
              </div>

              <div style={{ fontSize: 9, color: G.muted, marginBottom: 6 }}>Markets: Sacramento, Stockton, Modesto, Fresno</div>
              <div style={{ fontSize: 9, color: G.muted, marginBottom: 10 }}>Specialties: Fix & Flip Exits, Investor Properties, Fast Closings</div>
            </div>

            <div style={{ ...card, borderColor: `${G.gold}44` }}>
              <div style={{ ...lbl, color: G.gold, marginBottom: 4 }}>Partnership</div>
              <div style={{ fontFamily: G.serif, fontSize: 15, marginBottom: 4 }}>Free Account · 75/25 Split</div>
              <div style={{ fontSize: 10, color: G.muted, lineHeight: 1.7 }}>
                You keep 75% of commission on DealBank referrals. DealBank receives 25% after a successful close.
              </div>
            </div>
          </div>
        )}

        {realtorTab === "splits" && (
          <div>
            <div style={{ fontFamily: G.serif, fontSize: 18, color: G.text, marginBottom: 12 }}>Earnings & Splits</div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 10, marginBottom: 12 }}>
              {[
                { l: "Your Net YTD", v: `$${Math.round(netYtd).toLocaleString()}`, c: G.green },
                { l: "DealBank Splits", v: `$${Math.round(dealbankSplit).toLocaleString()}`, c: G.gold },
                { l: "Gross Commission", v: `$${Math.round(grossYtd).toLocaleString()}`, c: G.blue },
              ].map(({ l, v, c }) => (
                <div key={l} style={{ ...card, textAlign: "center" }}>
                  <div style={{ fontSize: 8, color: G.muted, letterSpacing: 2, marginBottom: 4 }}>{l.toUpperCase()}</div>
                  <div style={{ fontFamily: G.serif, fontSize: 17, color: c, fontWeight: "bold" }}>{v}</div>
                </div>
              ))}
            </div>

            <div style={{ ...card, marginBottom: 10 }}>
              <div style={{ ...lbl, marginBottom: 6 }}>How It Works</div>
              {[
                "1. DealBank sends investor listing referral",
                "2. You list and close the property",
                "3. Commission split is auto-calculated at 75/25",
              ].map((step) => (
                <div key={step} style={{ fontSize: 10, color: G.text, marginBottom: 6 }}>{step}</div>
              ))}
            </div>

            <div style={{ ...card }}>
              <div style={{ ...lbl, marginBottom: 6 }}>Example Transaction</div>
              <div style={{ fontSize: 11, color: G.text, lineHeight: 1.8 }}>
                Listing Price: <strong>$420,000</strong><br />
                Commission @ 2.5%: <strong>$10,500</strong><br />
                Your Net (75%): <strong style={{ color: G.green }}>$7,875</strong><br />
                DealBank Split (25%): <strong style={{ color: G.gold }}>$2,625</strong>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
