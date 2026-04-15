import TopBar from "../components/TopBar";
import useIsMobile from "../core/useIsMobile";
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
  const isMobile = useIsMobile(820);

  const { G, flipTab, setFlipTab, user, onSignOut, btnO } = ctx;
  const mergedCtx = { ...ctx, isMobile };

  const FTABS = [
    { id: "analyze", icon: "🔍", label: "Analyze" },
    { id: "pipeline", icon: "📋", label: "Pipeline" },
    { id: "contracts", icon: "📝", label: "Contracts" },
    { id: "contractors", icon: "🔨", label: "Contractors" },
    { id: "tools", icon: "🛠", label: "Tools" },
    { id: "partners", icon: "💡", label: "Partners" },
    { id: "resources", icon: "📚", label: "Resources" },
    { id: "laws", icon: "⚖️", label: "State Laws" },
    { id: "marketplace", icon: "🏷", label: "Marketplace" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: G.bg, color: G.text, fontFamily: G.mono }}>
      <TopBar title="DEAL MAKER" tabs={FTABS} active={flipTab} onTab={setFlipTab} userName={user?.name} onSignOut={onSignOut} G={G} btnO={btnO} />
      <div style={{ maxWidth: 980, margin: "0 auto", padding: isMobile ? "14px 12px 20px" : "20px 16px" }}>
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
    </div>
  );
}
