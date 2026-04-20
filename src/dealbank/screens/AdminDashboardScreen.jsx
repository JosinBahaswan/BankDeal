import TopBar from "../components/TopBar";
import { formatMoney } from "../core/adminDashboardFormat";
import { dashboardContainerStyle, pageShellStyle } from "../core/layout";
import { getLaunchIntegrationStatus, integrationStatusColor } from "../core/integrations";
import useViewport from "../core/useViewport";
import useAdminLiveData from "../hooks/useAdminLiveData";
import useAdminMetrics from "../hooks/useAdminMetrics";
import AdminDealsPanel from "./admin/AdminDealsPanel";
import AdminRecentActivityCard from "./admin/AdminRecentActivityCard";
import AdminTitlePortalPanel from "./admin/AdminTitlePortalPanel";
import AdminUsersPanel from "./admin/AdminUsersPanel";

export default function AdminDashboardScreen({ G, card, lbl, btnO, MOCK_CONTRACTORS, adminTab, setAdminTab, userName, user, onSignOut }) {
  const { isMobile, mode } = useViewport();
  const { metrics, loading: metricsLoading, error: metricsError, reload } = useAdminMetrics(user);
  const {
    users: adminUsers,
    deals: adminDeals,
    activity: adminActivity,
    loading: liveDataLoading,
    error: liveDataError,
    reload: reloadLiveData,
  } = useAdminLiveData(user);
  const dealMakerCount = metrics.dealMakerUsers;
  const contractorCount = metrics.contractorUsers;
  const totalMrr = metrics.totalMrr;
  const arrProjection = metrics.arrProjection;
  const dealMakerMrr = metrics.dealMakerMrr;
  const contractorMrr = metrics.contractorMrr;
  const dealMakerSharePct = metrics.dealMakerSharePct;
  const contractorSharePct = metrics.contractorSharePct;
  const creditsRevenue = metrics.creditRevenue;
  const platformFeesRevenue = metrics.platformFeeRevenue;
  const totalUsers = metrics.totalUsers;
  const dealMakerUserShare = totalUsers > 0 ? Math.round((dealMakerCount / totalUsers) * 100) : 0;
  const contractorUserShare = totalUsers > 0 ? Math.round((contractorCount / totalUsers) * 100) : 0;
  const totalCashRevenue = creditsRevenue + platformFeesRevenue;
  const creditsSharePct = totalCashRevenue > 0 ? Math.round((creditsRevenue / totalCashRevenue) * 100) : 0;
  const platformFeeSharePct = totalCashRevenue > 0 ? Math.round((platformFeesRevenue / totalCashRevenue) * 100) : 0;
  const launchIntegrations = getLaunchIntegrationStatus();

  const ATABS = [
    { id: "overview", icon: "OV", label: "Overview" },
    { id: "users", icon: "US", label: "Users" },
    { id: "revenue", icon: "RV", label: "Revenue" },
    { id: "deals", icon: "DL", label: "Deals" },
    { id: "titlePortal", icon: "TP", label: "Title Portal" },
    { id: "contractors", icon: "CT", label: "Contractors" },
  ];

  return (
    <div className="db-dashboard-root" style={pageShellStyle(G)}>
      <TopBar title="ADMIN" tabs={ATABS} active={adminTab} onTab={setAdminTab} userName={userName} onSignOut={onSignOut} G={G} btnO={btnO} />
      <div style={dashboardContainerStyle(mode)}>
        {metricsLoading && (
          <div style={{ ...card, marginBottom: 10, borderColor: `${G.green}44` }}>
            <div style={{ fontSize: 10, color: G.green }}>Syncing live metrics from Supabase...</div>
          </div>
        )}

        {metricsError && (
          <div style={{ ...card, marginBottom: 10, borderColor: `${G.red}55` }}>
            <div style={{ fontSize: 10, color: G.red, marginBottom: 8 }}>{metricsError}</div>
            <button onClick={reload} style={{ ...btnO, padding: "5px 10px", fontSize: 8 }}>Retry</button>
          </div>
        )}

        {adminTab === "overview" && (
          <div>
            <div style={{ fontFamily: G.serif, fontSize: isMobile ? 18 : 20, color: G.text, marginBottom: 14 }}>Platform Overview</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 10, marginBottom: 12 }}>
              {[
                { l: "Total Users", v: String(totalUsers), c: G.green, sub: "Live from public.users" },
                { l: "Active Deal Makers", v: String(dealMakerCount), c: G.text, sub: `${dealMakerUserShare}% of users` },
                { l: "Contractors", v: String(contractorCount), c: G.gold, sub: `${contractorUserShare}% of users` },
                { l: "Realtors", v: String(metrics.realtorUsers), c: G.blue, sub: "Referral collaborators" },
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
                { l: "MRR", v: formatMoney(totalMrr), c: G.green, sub: "Active + trialing subscriptions" },
                { l: "Deals Tracked", v: String(metrics.dealsTotal), c: G.text, sub: `${metrics.dealsClosed} closed` },
                { l: "Cash Revenue", v: formatMoney(totalCashRevenue), c: G.gold, sub: "Credit packs + platform fees" },
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
                {[
                  ["California", "38%", 380],
                  ["Texas", "22%", 220],
                  ["Florida", "16%", 160],
                  ["Arizona", "12%", 120],
                  ["Georgia", "8%", 80],
                ].map(([state, pct, width]) => (
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
                <AdminRecentActivityCard
                  G={G}
                  card={{ border: "none", padding: 0, background: "transparent" }}
                  lbl={lbl}
                  btnO={btnO}
                  activity={adminActivity}
                  loading={liveDataLoading}
                  error={liveDataError}
                  onReload={reloadLiveData}
                />
              </div>
            </div>

            <div style={{ ...card, marginTop: 10 }}>
              <div style={{ ...lbl, marginBottom: 10 }}>Launch Readiness (Section 9)</div>
              {launchIntegrations.map((item) => {
                const color = integrationStatusColor(item.status, G);
                return (
                  <div key={item.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "9px 0", borderBottom: `1px solid ${G.faint}` }}>
                    <div>
                      <div style={{ fontSize: 11, color: G.text }}>{item.label}</div>
                      <div style={{ fontSize: 9, color: G.muted, marginTop: 2 }}>{item.details}</div>
                    </div>
                    <div
                      style={{
                        fontSize: 8,
                        color,
                        border: `1px solid ${color}55`,
                        background: `${color}22`,
                        borderRadius: 3,
                        padding: "2px 8px",
                        letterSpacing: 1,
                        height: "fit-content",
                        textTransform: "uppercase",
                      }}
                    >
                      {item.status}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {adminTab === "users" && (
          <AdminUsersPanel
            G={G}
            card={card}
            btnO={btnO}
            isMobile={isMobile}
            totalUsers={adminUsers.length || totalUsers}
            users={adminUsers}
            loading={liveDataLoading}
            error={liveDataError}
            onReload={reloadLiveData}
          />
        )}

        {adminTab === "revenue" && (
          <div>
            <div style={{ fontFamily: G.serif, fontSize: isMobile ? 18 : 20, color: G.text, marginBottom: 12 }}>Revenue Dashboard</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 10, marginBottom: 12 }}>
              {[
                { l: "Deal Maker Subs", v: formatMoney(dealMakerMrr), sub: `${dealMakerCount} active users`, c: G.green },
                { l: "Contractor Subs", v: formatMoney(contractorMrr), sub: `${contractorCount} active users`, c: G.gold },
                { l: "Lead Credit Sales", v: formatMoney(creditsRevenue), sub: "One-time credit purchases", c: G.blue },
                { l: "Platform Fees", v: formatMoney(platformFeesRevenue), sub: `${metrics.platformFeeDisbursed} disbursed · ${metrics.platformFeePending} pending`, c: G.text },
                { l: "Total MRR", v: formatMoney(totalMrr), sub: "Monthly recurring", c: G.green },
                { l: "ARR Projection", v: formatMoney(arrProjection), sub: "Annualized", c: G.green },
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
                ["Deal Maker Subscriptions", "Live MRR contribution", `${dealMakerSharePct}%`, G.green],
                ["Contractor Subscriptions", "Live MRR contribution", `${contractorSharePct}%`, G.gold],
                ["Lead Credit Packs", "One-time purchases", `${creditsSharePct}%`, G.blue],
                ["Platform Fees", "From executed contracts", `${platformFeeSharePct}%`, G.text],
                ["Pending Fee Disbursements", `${metrics.platformFeePending} record(s)`, "tracked", G.muted],
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
          <AdminDealsPanel
            G={G}
            card={card}
            btnO={btnO}
            isMobile={isMobile}
            deals={adminDeals}
            loading={liveDataLoading}
            error={liveDataError}
            dealsTotal={metrics.dealsTotal}
            dealsClosed={metrics.dealsClosed}
            onReload={reloadLiveData}
          />
        )}

        {adminTab === "titlePortal" && (
          <AdminTitlePortalPanel
            G={G}
            card={card}
            btnO={btnO}
            isMobile={isMobile}
          />
        )}

        {adminTab === "contractors" && (
          <div>
            <div style={{ fontFamily: G.serif, fontSize: isMobile ? 18 : 20, color: G.text, marginBottom: 12 }}>Contractor Network</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 10 }}>
              {MOCK_CONTRACTORS.map((contractor) => (
                <div key={contractor.id} style={{ ...card }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        background: G.greenGlow,
                        border: `1px solid ${G.green}44`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 11,
                        color: G.green,
                        fontWeight: "bold",
                      }}
                    >
                      {contractor.avatar}
                    </div>
                    <div>
                      <div style={{ fontFamily: G.serif, fontSize: 13, color: G.text, fontWeight: "bold" }}>{contractor.name}</div>
                      <div style={{ fontSize: 9, color: G.gold }}>{contractor.trade} | {contractor.location}</div>
                    </div>
                    {contractor.verified && (
                      <div
                        style={{
                          marginLeft: "auto",
                          fontSize: 7,
                          color: G.green,
                          background: G.greenGlow,
                          border: `1px solid ${G.green}44`,
                          borderRadius: 3,
                          padding: "2px 5px",
                        }}
                      >
                        VERIFIED
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 12, fontSize: 9, color: G.muted }}>
                    <span>Rating {contractor.rating}</span>
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
