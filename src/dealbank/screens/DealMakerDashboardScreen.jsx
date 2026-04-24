import TopBar from "../components/TopBar";
import DashboardWorkspace from "../components/DashboardWorkspace";
import { dashboardContainerStyle, pageShellStyle } from "../core/layout";
import useViewport from "../core/useViewport";
import AnalyzeTab from "./dealmaker/AnalyzeTabSimple";
import PipelineTab from "./dealmaker/PipelineSimple";
import PropertiesTab from "./dealmaker/PropertiesTab";
import ContractorsTab from "./dealmaker/ContractorsTab";
import ContractsTab from "./dealmaker/ContractsTab";
import PartnersTab from "./dealmaker/PartnersTab";
import ResourcesTab from "./dealmaker/ResourcesTab";
import LawsTab from "./dealmaker/LawsTab";
import MarketplaceTab from "./dealmaker/MarketplaceTab";
import ToolsTab from "./dealmaker/tools/ToolsTab";

const TAB_SUMMARY = {
  properties: "Step 1: Browse off-market leads or input a specific address to start a new deal.",
  analyze: "Step 2: Underwrite the deal, calculate offer price, and run AI analysis on comps.",
  pipeline: "Step 3: Track homeowner contact and move deals through the acquisition funnel.",
  contracts: "Step 4: Manage eSign flows, signature audit trails, and final executed documents.",
  marketplace: "Path A (Wholesale): List your inventory early to start sourcing investors.",
  contractors: "Path B (Flip): Source execution partners and coordinate renovation timelines.",
};

export default function DealMakerDashboardScreen({ ctx }) {
  const viewport = useViewport();
  const { isMobile, isTablet, mode } = viewport;

  const { G, flipTab, setFlipTab, user, onSignOut, btnO, toast } = ctx;
  const mergedCtx = { ...ctx, isMobile, isTablet, viewportMode: mode };

  const FTABS = [
    { id: "properties", icon: "🏠", label: "1. Properties" },
    { id: "analyze", icon: "🔍", label: "2. Analyze" },
    { id: "pipeline", icon: "📋", label: "3. Pipeline" },
    { id: "contracts", icon: "✍️", label: "4. Contracts" },
    { id: "marketplace", icon: "MK", label: "Marketplace" },
    { id: "contractors", icon: "👷", label: "Contractors" },
  ];

  const activeTab = FTABS.find((tab) => tab.id === flipTab);
  const activeTabLabel = activeTab?.label || "Analyze";
  const tabSummary = TAB_SUMMARY[flipTab] || TAB_SUMMARY.analyze;

  const workspaceMetrics = [
    { label: "Focus", value: activeTabLabel, color: G.green },
    { label: "Workspace", value: mode === "mobile" ? "Mobile" : mode === "tablet" ? "Tablet" : "Desktop", color: G.text },
    { label: "Sync", value: "Live", color: G.green },
  ];

  const dealMakerRailSections = [
    {
      title: "Focus Path",
      tone: "green",
      items: [
        `Now: ${activeTabLabel}`,
        "Next: Validate numbers, then move stage.",
        "Rule: Never skip analysis before offer.",
      ],
    },
    {
      title: "Daily Cadence",
      tone: "blue",
      items: [
        "1. Open Analyze and refresh assumptions.",
        "2. Push priority deals in Pipeline.",
        "3. Close blockers in Contracts and Partners.",
      ],
    },
    {
      title: "Execution Guardrails",
      tone: "gold",
      items: [
        "Use conservative ARV and contingency buffers.",
        "Confirm contractor + title readiness early.",
        "Publish marketplace details only after QA.",
      ],
    },
  ];

  return (
    <div className="db-dashboard-root" style={pageShellStyle(G)}>
      <TopBar title="DEAL MAKER" tabs={FTABS} active={flipTab} onTab={setFlipTab} userName={user?.name} onSignOut={onSignOut} G={G} btnO={btnO} />
      <div style={dashboardContainerStyle(mode)}>
        <DashboardWorkspace
          G={G}
          mode={mode}
          headline="Deal Maker Workboard"
          subhead={tabSummary}
          metrics={workspaceMetrics}
          railSections={dealMakerRailSections}
        >
          {flipTab === "properties" && <PropertiesTab ctx={mergedCtx} />}
          {flipTab === "analyze" && <AnalyzeTab ctx={mergedCtx} />}
          {flipTab === "pipeline" && <PipelineTab ctx={mergedCtx} />}
          {flipTab === "contracts" && <ContractsTab ctx={mergedCtx} />}
          {flipTab === "contractors" && <ContractorsTab ctx={mergedCtx} />}
          {flipTab === "tools" && <ToolsTab ctx={mergedCtx} />}
          {flipTab === "partners" && <PartnersTab ctx={mergedCtx} />}
          {flipTab === "resources" && <ResourcesTab ctx={mergedCtx} />}
          {flipTab === "laws" && <LawsTab ctx={mergedCtx} />}
          {flipTab === "marketplace" && <MarketplaceTab ctx={mergedCtx} />}
        </DashboardWorkspace>
      </div>

      {toast?.text && (
        <div
          style={{
            position: "fixed",
            right: 14,
            bottom: 14,
            zIndex: 260,
            background: G.surface,
            border: `1px solid ${toast.tone === "error" ? `${G.red}66` : `${G.green}55`}`,
            borderRadius: G.radiusSm,
            boxShadow: G.shadowSm,
            padding: "9px 13px",
            color: toast.tone === "error" ? G.red : G.green,
            fontSize: 10,
            maxWidth: 420,
            lineHeight: 1.5,
          }}
        >
          {toast.text}
        </div>
      )}
    </div>
  );
}
