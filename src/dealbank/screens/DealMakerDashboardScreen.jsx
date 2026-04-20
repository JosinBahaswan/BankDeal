import TopBar from "../components/TopBar";
import DashboardWorkspace from "../components/DashboardWorkspace";
import { dashboardContainerStyle, pageShellStyle } from "../core/layout";
import useViewport from "../core/useViewport";
import AnalyzeTab from "./dealmaker/AnalyzeTab";
import PipelineTab from "./dealmaker/PipelineTab";
import ContractorsTab from "./dealmaker/ContractorsTab";
import ContractsTab from "./dealmaker/ContractsTab";
import PartnersTab from "./dealmaker/PartnersTab";
import ResourcesTab from "./dealmaker/ResourcesTab";
import LawsTab from "./dealmaker/LawsTab";
import MarketplaceTab from "./dealmaker/MarketplaceTab";
import ToolsTab from "./dealmaker/tools/ToolsTab";

const TAB_SUMMARY = {
  analyze: "Underwrite the deal first, then push only validated numbers into pipeline and contracts.",
  pipeline: "Move deals through stages daily so your next offer and next disposition are always visible.",
  contracts: "Keep signature flow and delivery status healthy so cashflow timing does not slip.",
  contractors: "Source execution partners before closing to reduce renovation downtime.",
  tools: "Use dialer, lead lists, and sequences to keep acquisition momentum consistent.",
  partners: "Coordinate lender, title, and referral partners before bottlenecks appear.",
  resources: "Maintain current playbooks and scripts so the team executes with the same standard.",
  laws: "Review state-specific constraints before final terms and disclosures.",
  marketplace: "Position your inventory early with clear spread and timeline expectations.",
};

export default function DealMakerDashboardScreen({ ctx }) {
  const viewport = useViewport();
  const { isMobile, isTablet, mode } = viewport;

  const { G, flipTab, setFlipTab, user, onSignOut, btnO, toast } = ctx;
  const mergedCtx = { ...ctx, isMobile, isTablet, viewportMode: mode };

  const FTABS = [
    { id: "analyze", icon: "AN", label: "Analyze" },
    { id: "pipeline", icon: "PL", label: "Pipeline" },
    { id: "contracts", icon: "CT", label: "Contracts" },
    { id: "contractors", icon: "CR", label: "Contractors" },
    { id: "tools", icon: "TL", label: "Tools" },
    { id: "partners", icon: "PT", label: "Partners" },
    { id: "resources", icon: "RS", label: "Resources" },
    { id: "laws", icon: "LW", label: "State Laws" },
    { id: "marketplace", icon: "MP", label: "Marketplace" },
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
