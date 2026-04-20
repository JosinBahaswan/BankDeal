import TopBar from "../components/TopBar";
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

  return (
    <div className="db-dashboard-root" style={pageShellStyle(G)}>
      <TopBar title="DEAL MAKER" tabs={FTABS} active={flipTab} onTab={setFlipTab} userName={user?.name} onSignOut={onSignOut} G={G} btnO={btnO} />
      <div style={dashboardContainerStyle(mode)}>
        {flipTab === "analyze" && <AnalyzeTab ctx={mergedCtx} />}
        {flipTab === "pipeline" && <PipelineTab ctx={mergedCtx} />}
        {flipTab === "contracts" && <ContractsTab ctx={mergedCtx} />}
        {flipTab === "contractors" && <ContractorsTab ctx={mergedCtx} />}
        {flipTab === "tools" && <ToolsTab ctx={mergedCtx} />}
        {flipTab === "partners" && <PartnersTab ctx={mergedCtx} />}
        {flipTab === "resources" && <ResourcesTab ctx={mergedCtx} />}
        {flipTab === "laws" && <LawsTab ctx={mergedCtx} />}
        {flipTab === "marketplace" && <MarketplaceTab ctx={mergedCtx} />}
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
