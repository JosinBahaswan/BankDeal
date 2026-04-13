import { useMemo, useState } from "react";
import LeadsToolTab from "./LeadsToolTab";
import PowerDialerToolTab from "./PowerDialerToolTab";
import CrmSequencesToolTab from "./CrmSequencesToolTab";
import InsuranceToolTab from "./InsuranceToolTab";
import HardMoneyToolTab from "./HardMoneyToolTab";

export default function ToolsTab({ ctx }) {
  const { G, btnO } = ctx;
  const [activeTool, setActiveTool] = useState("leads");

  const tabs = useMemo(
    () => [
      { id: "leads", label: "Lead Lists", icon: "A" },
      { id: "dialer", label: "Power Dialer", icon: "B" },
      { id: "crm", label: "CRM & Sequences", icon: "C" },
      { id: "insurance", label: "Insurance", icon: "D" },
      { id: "lending", label: "Hard Money", icon: "E" },
    ],
    [],
  );

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontFamily: G.serif, fontSize: 21, marginBottom: 5 }}>Deal Maker Tools</div>
        <div style={{ fontSize: 10, color: G.muted, lineHeight: 1.6 }}>
          One command center for outbound lists, dialing, CRM automation, insurance coverage, and hard money underwriting.
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 12, overflowX: "auto", WebkitOverflowScrolling: "touch", paddingBottom: 2 }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTool(tab.id)}
            style={{
              ...btnO,
              padding: "6px 10px",
              fontSize: 8,
              borderColor: activeTool === tab.id ? G.green : G.border,
              color: activeTool === tab.id ? G.green : G.muted,
              background: activeTool === tab.id ? G.greenGlow : "transparent",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            {tab.icon}. {tab.label}
          </button>
        ))}
      </div>

      <div style={{ background: "linear-gradient(145deg,#061109,#09140c)", border: `1px solid ${G.border}`, borderRadius: 10, padding: 12 }}>
        {activeTool === "leads" && <LeadsToolTab ctx={ctx} />}
        {activeTool === "dialer" && <PowerDialerToolTab ctx={ctx} />}
        {activeTool === "crm" && <CrmSequencesToolTab ctx={ctx} />}
        {activeTool === "insurance" && <InsuranceToolTab ctx={ctx} />}
        {activeTool === "lending" && <HardMoneyToolTab ctx={ctx} />}
      </div>
    </div>
  );
}
