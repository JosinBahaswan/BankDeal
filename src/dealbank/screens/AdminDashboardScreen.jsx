import { useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import TopBar from "../components/TopBar";
import DataSearchBar from "../components/DataSearchBar";
import DashboardWorkspace from "../components/DashboardWorkspace";
import ErrorBoundary from "../components/ErrorBoundary";
import { formatMoney } from "../core/adminDashboardFormat";
import { dashboardContainerStyle, pageShellStyle } from "../core/layout";
import { getLaunchIntegrationStatus, integrationStatusColor } from "../core/integrations";
import useViewport from "../core/useViewport";
import AlertModal from "../components/AlertModal";
import useAdminLiveData from "../hooks/useAdminLiveData";
import useAdminMetrics from "../hooks/useAdminMetrics";
import AdminDealsPanel from "./admin/AdminDealsPanel";
import AdminRecentActivityCard from "./admin/AdminRecentActivityCard";
import AdminTitlePortalPanel from "./admin/AdminTitlePortalPanel";
import AdminUsersPanel from "./admin/AdminUsersPanel";

export default function AdminDashboardScreen({ G, card, lbl, btnO, MOCK_CONTRACTORS, adminTab, setAdminTab, userName, user, onSignOut }) {
  const { isMobile, mode } = useViewport();
  const [contractorSearch, setContractorSearch] = useState("");
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
  const [showStripeConfigModal, setShowStripeConfigModal] = useState(false);
  const [showStorageConfigModal, setShowStorageConfigModal] = useState(false);
  const filteredMockContractors = useMemo(() => {
    const query = contractorSearch.trim().toLowerCase();
    if (!query) return MOCK_CONTRACTORS;

    return MOCK_CONTRACTORS.filter((contractor) => {
      const searchable = [
        contractor.name,
        contractor.trade,
        contractor.location,
        contractor.rate,
        String(contractor.rating || ""),
      ].join(" ").toLowerCase();

      return searchable.includes(query);
    });
  }, [MOCK_CONTRACTORS, contractorSearch]);

  const ATABS = [
    { id: "overview", icon: "OV", label: "Overview" },
    { id: "users", icon: "US", label: "Users" },
    { id: "revenue", icon: "RV", label: "Revenue" },
    { id: "deals", icon: "DL", label: "Deals" },
    { id: "titlePortal", icon: "TP", label: "Title Portal" },
    { id: "contractors", icon: "CT", label: "Contractors" },
  ];

  const adminDisplayName = userName || user?.name || "Admin";
  const adminFirstName = adminDisplayName.split(" ").filter(Boolean)[0] || "Admin";
  const activeTab = ATABS.find((tab) => tab.id === adminTab);
  const activeTabLabel = activeTab?.label || "Overview";
  const launchReadyCount = launchIntegrations.filter((item) => String(item.status || "").toLowerCase() === "ready").length;
  const launchActionCount = Math.max(0, launchIntegrations.length - launchReadyCount);
  const activeTabSummaryMap = {
    overview: "Monitor platform health, growth, and launch readiness from one command view.",
    users: "Track user distribution and resolve onboarding friction quickly.",
    revenue: "Watch subscription and transactional streams to protect monthly targets.",
    deals: "Audit deal flow and close bottlenecks before they affect payouts.",
    titlePortal: "Issue and monitor title tokens for secure external collaboration.",
    contractors: "Maintain trusted contractor network coverage by trade and market.",
  };
  const workspaceMetrics = [
    { label: "Focus", value: activeTabLabel, color: G.green },
    { label: "Users", value: totalUsers, color: G.text },
    { label: "MRR", value: formatMoney(totalMrr), color: G.green },
  ];
  const adminRailSections = [
    {
      title: "Control",
      tone: "green",
      items: [
        `Operator: ${adminFirstName}`,
        `${metrics.dealsClosed} deals closed / ${metrics.dealsTotal} tracked.`,
        `${adminDeals.length} live deal records synced.`,
      ],
    },
    {
      title: "Health",
      tone: "blue",
      items: [
        `${launchReadyCount}/${launchIntegrations.length} launch checks ready.`,
        launchActionCount > 0 ? `${launchActionCount} launch checks need action.` : "No launch blockers detected.",
        metricsError || liveDataError ? "One or more feeds returned errors." : "Metrics and live data feed healthy.",
      ],
    },
    {
      title: "Operator Checklist",
      tone: "gold",
      items: [
        "Review compliance and payout traces daily.",
        "Refresh user-growth and conversion snapshots.",
        "Confirm title portal token hygiene weekly.",
      ],
    },
  ];
  
  async function handleUpdateUser(userId, updates) {
    const { error } = await supabase
      .from("users")
      .update(updates)
      .eq("id", userId);
    
    if (error) throw error;
    reloadLiveData();
  }

  async function handleDeleteUser(userId) {
    const { error } = await supabase
      .from("users")
      .delete()
      .eq("id", userId);
    
    if (error) throw error;
    reloadLiveData();
  }

  async function handleUpdateDeal(dealId, updates) {
    const { error } = await supabase
      .from("deals")
      .update(updates)
      .eq("id", dealId);
    
    if (error) throw error;
    reloadLiveData();
  }

  async function handleDeleteDeal(dealId) {
    const { error } = await supabase
      .from("deals")
      .delete()
      .eq("id", dealId);
    
    if (error) throw error;
    reloadLiveData();
  }

  async function handleCreateUser(userData) {
    // Note: In production, you would use supabase.auth.admin.createUser via an Edge Function
    // Here we insert directly to public.users to reflect in the dashboard
    const { error } = await supabase
      .from("users")
      .insert([{
        name: userData.name,
        email: userData.email,
        type: userData.type,
        is_active: true,
        joined_at: new Date().toISOString()
      }]);
    
    if (error) throw error;
    reloadLiveData();
  }

  async function handleCreateDeal(dealData) {
    const { error } = await supabase
      .from("deals")
      .insert([{
        address: dealData.address,
        stage: dealData.stage,
        arv: dealData.arv,
        offer_price: dealData.offerPrice,
        user_id: user?.id, // Assign to current admin for tracking
        saved_at: new Date().toISOString()
      }]);
    
    if (error) throw error;
    reloadLiveData();
  }

  return (
    <div className="db-dashboard-root" style={pageShellStyle(G)}>
      <TopBar title="ADMIN" tabs={ATABS} active={adminTab} onTab={setAdminTab} userName={userName} onSignOut={onSignOut} G={G} btnO={btnO} />
      <div style={dashboardContainerStyle(mode)}>
        <DashboardWorkspace
          G={G}
          mode={mode}
          headline={`Command Center for ${adminFirstName}`}
          subhead={activeTabSummaryMap[adminTab] || activeTabSummaryMap.overview}
          metrics={workspaceMetrics}
          railSections={adminRailSections}
        >

        <ErrorBoundary fallback={<div style={{ padding: 16 }}>An unexpected error occurred. Please refresh.</div>}>
        {metricsLoading && (
          <div style={{ ...card, marginBottom: 10, borderColor: `${G.green}44` }}>
            <div style={{ fontSize: 10, color: G.green }}>Syncing live metrics from Supabase...</div>
          </div>
        )}
        <AlertModal
          show={showStripeConfigModal}
          onClose={() => setShowStripeConfigModal(false)}
          title="Stripe Configuration"
          type="warning"
          G={G}
          closeLabel="OK"
          message={"Stripe integration requires publishable key and server endpoints for Checkout and escrow flows."}
        >
          <div style={{ textAlign: "left", fontSize: 13, color: G.muted }}>
            <div style={{ marginBottom: 8 }}>Set these environment variables locally (<strong>.env</strong>) and in your deployment (Vercel):</div>
            <pre style={{ background: G.surface, padding: 12, borderRadius: 8, fontSize: 12, overflowX: "auto" }}>
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
VITE_STRIPE_CHECKOUT_ENDPOINT=/api/create-checkout
VITE_STRIPE_CONNECT_ACCOUNT_ENDPOINT=/api/stripe-connect
VITE_STRIPE_ESCROW_CREATE_ENDPOINT=/api/stripe-escrow-create
VITE_STRIPE_ESCROW_RELEASE_ENDPOINT=/api/stripe-escrow-release
            </pre>
            <div style={{ marginTop: 8 }}>After setting, redeploy and verify the Admin "Launch Readiness" shows `wired` for Stripe.</div>
          </div>
        </AlertModal>

        <AlertModal
          show={showStorageConfigModal}
          onClose={() => setShowStorageConfigModal(false)}
          title="Storage Buckets"
          type="warning"
          G={G}
          closeLabel="OK"
          message={"Signed file storage requires configured buckets and appropriate access policies."}
        >
          <div style={{ textAlign: "left", fontSize: 13, color: G.muted }}>
            <div style={{ marginBottom: 8 }}>Set these environment variables and ensure your storage service has public/private policies for signed URLs:</div>
            <pre style={{ background: G.surface, padding: 12, borderRadius: 8, fontSize: 12, overflowX: "auto" }}>
VITE_CONTRACTS_BUCKET=contracts
VITE_CONTRACTOR_PHOTOS_BUCKET=contractor-photos
VITE_PROPERTY_IMAGES_BUCKET=property-images
            </pre>
            <div style={{ marginTop: 8 }}>After configuration, verify file uploads and signed URL generation in the Contracts UI.</div>
          </div>
        </AlertModal>

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
                      {item.id === "stripe" && (
                        <div style={{ marginTop: 8 }}>
                          <button onClick={() => setShowStripeConfigModal(true)} style={{ ...btnO, fontSize: 9, padding: "6px 10px" }}>How to configure</button>
                        </div>
                      )}
                      {item.id === "storage" && (
                        <div style={{ marginTop: 8 }}>
                          <button onClick={() => setShowStorageConfigModal(true)} style={{ ...btnO, fontSize: 9, padding: "6px 10px" }}>How to configure</button>
                        </div>
                      )}
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
            onUpdateUser={handleUpdateUser}
            onDeleteUser={handleDeleteUser}
            onCreateUser={handleCreateUser}
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
            onUpdateDeal={handleUpdateDeal}
            onDeleteDeal={handleDeleteDeal}
            onCreateDeal={handleCreateDeal}
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

            <DataSearchBar
              G={G}
              value={contractorSearch}
              onChange={setContractorSearch}
              placeholder="Search by contractor, trade, location, rate, or rating"
              resultCount={filteredMockContractors.length}
              totalCount={MOCK_CONTRACTORS.length}
            />

            {MOCK_CONTRACTORS.length > 0 && filteredMockContractors.length === 0 && (
              <div style={{ ...card, marginBottom: 10, fontSize: 9, color: G.muted }}>
                No contractors match your search.
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 10 }}>
              {filteredMockContractors.map((contractor) => (
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
        </ErrorBoundary>
        </DashboardWorkspace>
      </div>
    </div>
  );
}
