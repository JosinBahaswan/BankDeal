import TopBar from "../components/TopBar";
import AnalyzeTab from "./dealmaker/AnalyzeTab";
import PipelineTab from "./dealmaker/PipelineTab";
import ContractorsTab from "./dealmaker/ContractorsTab";
import PartnersTab from "./dealmaker/PartnersTab";
import ResourcesTab from "./dealmaker/ResourcesTab";
import LawsTab from "./dealmaker/LawsTab";
import MarketplaceTab from "./dealmaker/MarketplaceTab";
import ToolsTab from "./dealmaker/tools/ToolsTab";

export default function DealMakerDashboardScreen({ ctx }) {
  const { G, flipTab, setFlipTab, user, onSignOut, btnO } = ctx;

  const FTABS = [
    { id: "analyze", icon: "🔍", label: "Analyze" },
    { id: "pipeline", icon: "📋", label: "Pipeline" },
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
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "20px 16px" }}>
        {flipTab === "analyze" && <AnalyzeTab ctx={ctx} />}
        {flipTab === "pipeline" && <PipelineTab ctx={ctx} />}
        {flipTab === "contractors" && <ContractorsTab ctx={ctx} />}
        {flipTab === "tools" && <ToolsTab ctx={ctx} />}
        {flipTab === "partners" && <PartnersTab ctx={ctx} />}
        {flipTab === "resources" && <ResourcesTab ctx={ctx} />}
        {flipTab === "laws" && <LawsTab ctx={ctx} />}
        {flipTab === "marketplace" && <MarketplaceTab ctx={ctx} />}
      </div>
    </div>
  );
}
