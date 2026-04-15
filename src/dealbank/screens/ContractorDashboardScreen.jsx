import { useMemo, useState } from "react";
import TopBar from "../components/TopBar";
import useIsMobile from "../core/useIsMobile";

const TRADE_OPTIONS = [
  "General Contractor",
  "Roofing",
  "HVAC",
  "Plumbing",
  "Electrical",
  "Kitchen & Bath",
  "Flooring",
  "Painting",
  "Landscaping",
  "Windows",
  "Foundation",
  "Handyman",
];

const JOB_HISTORY = [
  { address: "1842 Maple St, Sacramento", trade: "Kitchen & Bath", amount: "$7,400", status: "Paid", date: "Apr 08", flipper: "T. Williams" },
  { address: "534 Oak Blvd, Stockton", trade: "HVAC", amount: "$6,850", status: "Paid", date: "Apr 04", flipper: "M. Johnson" },
  { address: "2201 Pine Ave, Modesto", trade: "General Contractor", amount: "$18,200", status: "Pending", date: "Mar 27", flipper: "S. Park" },
  { address: "4701 Delta View Dr, Elk Grove", trade: "Electrical", amount: "$3,900", status: "Paid", date: "Mar 20", flipper: "D. Patel" },
];

export default function ContractorDashboardScreen({ G, card, lbl, btnG, contractorTab, setContractorTab, user, onSignOut, btnO }) {
  const isMobile = useIsMobile(820);

  const CTABS = [
    { id: "leads", icon: "🔔", label: "Job Leads" },
    { id: "jobs", icon: "🏗", label: "Active Jobs" },
    { id: "profile", icon: "👤", label: "My Profile" },
    { id: "earnings", icon: "💰", label: "Earnings" },
    { id: "reviews", icon: "⭐", label: "Reviews" },
  ];

  const [bio, setBio] = useState("Licensed contractor focused on fast turn rehab scopes and clean punch-list execution.");
  const [rate, setRate] = useState("95");
  const [showTradeEditor, setShowTradeEditor] = useState(false);
  const [selectedTrades, setSelectedTrades] = useState(() => {
    if (!user?.trade) return ["General Contractor"];
    const normalized = String(user.trade)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    return normalized.length ? normalized : ["General Contractor"];
  });

  const [activeJobs, setActiveJobs] = useState([
    { id: "j1", address: "1842 Maple St, Sacramento", flipper: "T. Williams", value: 24000, statusNote: "Drywall and cabinet install in progress", progress: 68 },
    { id: "j2", address: "534 Oak Blvd, Stockton", flipper: "M. Johnson", value: 9200, statusNote: "Permit final for condenser relocation", progress: 84 },
    { id: "j3", address: "2201 Pine Ave, Modesto", flipper: "S. Park", value: 67000, statusNote: "Rough-ins completed, inspections next", progress: 53 },
  ]);

  const leadRows = [
    { addr: "1842 Maple St, Sacramento", trade: "Kitchen & Bath", budget: "$18,000-$24,000", flipper: "T. Williams", posted: "2h ago", urgent: true },
    { addr: "534 Oak Blvd, Stockton", trade: "HVAC", budget: "$6,000-$9,000", flipper: "M. Johnson", posted: "5h ago", urgent: false },
    { addr: "2201 Pine Ave, Modesto", trade: "General Contractor", budget: "$55,000-$70,000", flipper: "S. Park", posted: "1d ago", urgent: false },
  ];

  const reviewRows = [
    { id: "r1", flipper: "T. Williams", title: "Kitchen + bath remodel", date: "Apr 2026", stars: 5, text: "Communicated every day, hit timeline, and gave us clear change-order options." },
    { id: "r2", flipper: "M. Johnson", title: "HVAC replacement", date: "Mar 2026", stars: 5, text: "Fast response and clean workmanship. Great for investor projects." },
    { id: "r3", flipper: "D. Patel", title: "Electrical rewire", date: "Feb 2026", stars: 4, text: "Solid execution and passed city inspection first try." },
  ];

  const stats = useMemo(() => {
    const totalValue = activeJobs.reduce((sum, job) => sum + job.value, 0);
    const avgProgress = activeJobs.length ? Math.round(activeJobs.reduce((sum, job) => sum + job.progress, 0) / activeJobs.length) : 0;
    return {
      activeCount: activeJobs.length,
      totalValue,
      avgProgress,
    };
  }, [activeJobs]);

  function bumpProgress(jobId) {
    setActiveJobs((prev) => prev.map((job) => (job.id === jobId ? { ...job, progress: Math.min(100, job.progress + 10) } : job)));
  }

  function toggleTrade(trade) {
    setSelectedTrades((prev) => (prev.includes(trade) ? prev.filter((item) => item !== trade) : [...prev, trade]));
  }

  return (
    <div style={{ minHeight: "100vh", background: G.bg, color: G.text, fontFamily: G.mono }}>
      <TopBar title="CONTRACTOR" tabs={CTABS} active={contractorTab} onTab={setContractorTab} userName={user?.name} onSignOut={onSignOut} G={G} btnO={btnO} />
      <div style={{ maxWidth: 860, margin: "0 auto", padding: isMobile ? "14px 12px 20px" : "20px 16px" }}>
        {contractorTab === "leads" && (
          <div>
            <div style={{ fontFamily: G.serif, fontSize: 18, color: G.text, marginBottom: 4 }}>Job Leads</div>
            <div style={{ fontSize: 10, color: G.muted, marginBottom: 14 }}>Deal makers nearby are requesting bids in your selected trades.</div>
            {leadRows.map((lead, index) => (
              <div key={index} style={{ ...card, marginBottom: 10, borderColor: lead.urgent ? `${G.gold}66` : G.border }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, gap: 8, flexWrap: "wrap" }}>
                  <div style={{ fontFamily: G.serif, fontSize: 13, color: G.text, fontWeight: "bold" }}>{lead.addr}</div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    {lead.urgent && <div style={{ fontSize: 7, color: G.gold, background: "#1a1200", border: `1px solid ${G.gold}44`, borderRadius: 3, padding: "2px 6px", letterSpacing: 1 }}>URGENT</div>}
                    <div style={{ fontSize: 9, color: G.muted }}>{lead.posted}</div>
                  </div>
                </div>
                <div style={{ fontSize: 10, color: G.muted, marginBottom: 8, lineHeight: 1.6 }}>
                  Trade: <span style={{ color: G.green }}>{lead.trade}</span> · Budget: <span style={{ color: G.text }}>{lead.budget}</span> · Deal Maker: <span style={{ color: G.text }}>{lead.flipper}</span>
                </div>
                <button
                  onClick={() => window.alert(`Quote draft opened for ${lead.addr}\nTrade: ${lead.trade}\nBudget: ${lead.budget}`)}
                  style={{ ...btnG, width: "100%", fontSize: 9, padding: "8px" }}
                >
                  Send Quote
                </button>
              </div>
            ))}
          </div>
        )}

        {contractorTab === "jobs" && (
          <div>
            <div style={{ fontFamily: G.serif, fontSize: 18, color: G.text, marginBottom: 12 }}>Active Jobs</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10, marginBottom: 12 }}>
              {[
                { l: "Active Jobs", v: stats.activeCount, c: G.green },
                { l: "In-Progress Value", v: `$${stats.totalValue.toLocaleString()}`, c: G.text },
                { l: "Avg Completion", v: `${stats.avgProgress}%`, c: stats.avgProgress >= 80 ? G.green : G.gold },
              ].map(({ l, v, c }) => (
                <div key={l} style={{ ...card, textAlign: "center" }}>
                  <div style={{ fontSize: 8, color: G.muted, letterSpacing: 2, marginBottom: 4 }}>{l.toUpperCase()}</div>
                  <div style={{ fontFamily: G.serif, fontSize: 18, color: c, fontWeight: "bold" }}>{v}</div>
                </div>
              ))}
            </div>

            {activeJobs.map((job) => (
              <div key={job.id} style={{ ...card, marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, gap: 8, flexWrap: "wrap" }}>
                  <div style={{ fontFamily: G.serif, fontSize: 13, color: G.text, fontWeight: "bold" }}>{job.address}</div>
                  <div style={{ fontSize: 10, color: G.green }}>${job.value.toLocaleString()}</div>
                </div>
                <div style={{ fontSize: 9, color: G.muted, marginBottom: 5 }}>Deal Maker: {job.flipper}</div>
                <div style={{ fontSize: 10, color: G.muted, marginBottom: 7 }}>{job.statusNote}</div>

                <div style={{ height: 7, borderRadius: 999, background: G.faint, marginBottom: 8 }}>
                  <div style={{ height: "100%", width: `${job.progress}%`, borderRadius: 999, background: job.progress >= 80 ? G.green : G.gold }} />
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: isMobile ? "stretch" : "center", flexDirection: isMobile ? "column" : "row", gap: isMobile ? 8 : 0 }}>
                  <div style={{ fontSize: 9, color: G.muted }}>Progress: {job.progress}%</div>
                  <div style={{ display: "flex", gap: 6, width: isMobile ? "100%" : "auto", flexWrap: "wrap" }}>
                    <button onClick={() => bumpProgress(job.id)} style={{ ...btnG, fontSize: 8, padding: "6px 10px", flex: isMobile ? "1 1 120px" : "initial" }}>Update Progress</button>
                    <button onClick={() => window.alert(`Messaging ${job.flipper} about ${job.address}`)} style={{ ...btnO, fontSize: 8, padding: "6px 10px", flex: isMobile ? "1 1 100px" : "initial" }}>Message</button>
                    <button onClick={() => window.alert(`Photo upload opened for ${job.address}`)} style={{ ...btnO, fontSize: 8, padding: "6px 10px", flex: isMobile ? "1 1 100px" : "initial" }}>Photos</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {contractorTab === "profile" && (
          <div>
            <div style={{ fontFamily: G.serif, fontSize: 18, color: G.text, marginBottom: 12 }}>My Profile</div>

            <div style={{ ...card, marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: isMobile ? "flex-start" : "center", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
                <div style={{ width: 52, height: 52, borderRadius: "50%", background: G.greenGlow, border: `2px solid ${G.green}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: G.green, fontWeight: "bold" }}>
                  {(user?.name || "U").split(" ").map((name) => name[0]).join("")}
                </div>
                <div>
                  <div style={{ fontFamily: G.serif, fontSize: 15, color: G.text, fontWeight: "bold" }}>{user?.name}</div>
                  <div style={{ fontSize: 9, color: G.green }}>{selectedTrades.join(", ")}</div>
                  <div style={{ fontSize: 9, color: G.muted }}>{user?.location || "California"}</div>
                </div>
                <div style={{ marginLeft: isMobile ? 0 : "auto", display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <div style={{ fontSize: 8, color: G.green, border: `1px solid ${G.green}44`, background: G.greenGlow, borderRadius: 3, padding: "2px 6px" }}>Verified</div>
                  <div style={{ fontSize: 8, color: G.gold, border: `1px solid ${G.gold}44`, background: `${G.gold}22`, borderRadius: 3, padding: "2px 6px" }}>Top Rated</div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 8, marginBottom: 12 }}>
                {[
                  { l: "Jobs Won", v: "24" },
                  { l: "Avg Rating", v: "4.8★" },
                  { l: "Response Rate", v: "96%" },
                  { l: "On-Time", v: "91%" },
                ].map(({ l, v }) => (
                  <div key={l} style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 5, padding: "8px", textAlign: "center" }}>
                    <div style={{ fontSize: 7, color: G.muted, letterSpacing: 2, marginBottom: 2 }}>{l.toUpperCase()}</div>
                    <div style={{ fontFamily: G.serif, fontSize: 15, color: G.green, fontWeight: "bold" }}>{v}</div>
                  </div>
                ))}
              </div>

              <div style={{ marginBottom: 8 }}>
                <div style={lbl}>Bio</div>
                <textarea value={bio} onChange={(event) => setBio(event.target.value)} rows={3} style={{ width: "100%", boxSizing: "border-box", background: G.surface, border: `1px solid ${G.border}`, borderRadius: 6, color: G.text, fontFamily: G.mono, fontSize: 10, padding: "8px 10px", resize: "vertical", outline: "none" }} />
              </div>

              <div style={{ marginBottom: 10 }}>
                <div style={lbl}>Base Rate</div>
                <div style={{ position: "relative", maxWidth: isMobile ? "100%" : 180 }}>
                  <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: G.muted, fontSize: 10 }}>$</span>
                  <input value={rate} onChange={(event) => setRate(event.target.value.replace(/[^0-9]/g, ""))} style={{ width: "100%", background: G.surface, border: `1px solid ${G.border}`, borderRadius: 6, color: G.text, fontFamily: G.mono, fontSize: 11, padding: "8px 10px 8px 20px", boxSizing: "border-box", outline: "none" }} />
                </div>
              </div>

              <button onClick={() => setShowTradeEditor((prev) => !prev)} style={{ ...btnO, fontSize: 8, padding: "6px 10px", marginBottom: 8 }}>
                {showTradeEditor ? "Hide Trades" : "Edit Trades"}
              </button>

              {showTradeEditor && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 6 }}>
                  {TRADE_OPTIONS.map((trade) => (
                    <button
                      key={trade}
                      onClick={() => toggleTrade(trade)}
                      style={{ ...btnO, fontSize: 8, padding: "6px 7px", borderColor: selectedTrades.includes(trade) ? G.green : G.border, color: selectedTrades.includes(trade) ? G.green : G.muted, background: selectedTrades.includes(trade) ? G.greenGlow : "transparent" }}
                    >
                      {trade}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div style={{ ...card, borderColor: `${G.gold}44` }}>
              <div style={{ ...lbl, color: G.gold, marginBottom: 4 }}>Subscription</div>
              <div style={{ fontFamily: G.serif, fontSize: 15, marginBottom: 3 }}>Pro Plan · $79/mo</div>
              <div style={{ fontSize: 10, color: G.muted }}>Unlimited quotes, verified badge, and priority placement in contractor search.</div>
            </div>
          </div>
        )}

        {contractorTab === "earnings" && (
          <div>
            <div style={{ fontFamily: G.serif, fontSize: 18, color: G.text, marginBottom: 12 }}>Earnings</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 10, marginBottom: 12 }}>
              {[
                { l: "This Month", v: "$8,400", c: G.green },
                { l: "Last Month", v: "$11,200", c: G.text },
                { l: "This Year", v: "$96,500", c: G.green },
                { l: "Pending", v: "$18,200", c: G.gold },
              ].map(({ l, v, c }) => (
                <div key={l} style={{ ...card, textAlign: "center" }}>
                  <div style={{ fontSize: 8, color: G.muted, letterSpacing: 2, marginBottom: 5 }}>{l.toUpperCase()}</div>
                  <div style={{ fontFamily: G.serif, fontSize: 20, color: c, fontWeight: "bold" }}>{v}</div>
                </div>
              ))}
            </div>

            <div style={{ ...card }}>
              <div style={{ ...lbl, marginBottom: 8 }}>Job History</div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 680 }}>
                  <thead>
                    <tr style={{ textAlign: "left", borderBottom: `1px solid ${G.border}` }}>
                      {["Address", "Trade", "Amount", "Status", "Date", "Deal Maker"].map((head) => (
                        <th key={head} style={{ fontSize: 8, color: G.muted, letterSpacing: 1, fontWeight: "normal", padding: "8px 6px" }}>{head}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {JOB_HISTORY.map((row) => (
                      <tr key={`${row.address}-${row.date}`} style={{ borderBottom: `1px solid ${G.faint}` }}>
                        <td style={{ fontSize: 10, color: G.text, padding: "8px 6px" }}>{row.address}</td>
                        <td style={{ fontSize: 9, color: G.muted, padding: "8px 6px" }}>{row.trade}</td>
                        <td style={{ fontSize: 10, color: G.green, padding: "8px 6px" }}>{row.amount}</td>
                        <td style={{ padding: "8px 6px" }}>
                          <span style={{ fontSize: 8, color: row.status === "Paid" ? G.green : G.gold, border: `1px solid ${row.status === "Paid" ? G.green : G.gold}55`, background: row.status === "Paid" ? G.greenGlow : `${G.gold}22`, borderRadius: 3, padding: "2px 7px" }}>{row.status}</span>
                        </td>
                        <td style={{ fontSize: 9, color: G.muted, padding: "8px 6px" }}>{row.date}</td>
                        <td style={{ fontSize: 9, color: G.muted, padding: "8px 6px" }}>{row.flipper}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {contractorTab === "reviews" && (
          <div>
            <div style={{ fontFamily: G.serif, fontSize: 18, color: G.text, marginBottom: 12 }}>Reviews</div>

            <div style={{ ...card, marginBottom: 10 }}>
              <div style={{ display: "flex", gap: 20, alignItems: isMobile ? "flex-start" : "center", flexDirection: isMobile ? "column" : "row" }}>
                <div>
                  <div style={{ fontFamily: G.serif, fontSize: 30, color: G.green, lineHeight: 1 }}>4.8</div>
                  <div style={{ fontSize: 9, color: G.muted }}>Based on 42 reviews</div>
                </div>
                <div style={{ flex: 1 }}>
                  {[
                    ["5★", 30],
                    ["4★", 9],
                    ["3★", 2],
                    ["1-2★", 1],
                  ].map(([label, count]) => (
                    <div key={label} style={{ display: "grid", gridTemplateColumns: isMobile ? "38px 1fr 24px" : "44px 1fr 30px", gap: 8, alignItems: "center", marginBottom: 5 }}>
                      <div style={{ fontSize: 8, color: G.muted }}>{label}</div>
                      <div style={{ height: 6, borderRadius: 999, background: G.faint }}>
                        <div style={{ height: "100%", width: `${(count / 30) * 100}%`, borderRadius: 999, background: G.green }} />
                      </div>
                      <div style={{ fontSize: 8, color: G.muted, textAlign: "right" }}>{count}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {reviewRows.map((review) => (
              <div key={review.id} style={{ ...card, marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <div style={{ fontFamily: G.serif, fontSize: 13, color: G.text }}>{review.title}</div>
                  <div style={{ fontSize: 8, color: G.muted }}>{review.date}</div>
                </div>
                <div style={{ fontSize: 9, color: G.gold, marginBottom: 5 }}>{"★".repeat(review.stars)} <span style={{ color: G.muted }}>({review.flipper})</span></div>
                <div style={{ fontSize: 10, color: G.muted, lineHeight: 1.7 }}>{review.text}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
