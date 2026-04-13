import { useMemo, useState } from "react";
import { LEAD_FILTERS, LEAD_LIST_TYPES, LEAD_SEED } from "./toolData";

function statusBadge(status, G) {
  const map = {
    New: G.green,
    Contacted: "#60a5fa",
    "Follow Up": G.gold,
    "Offer Sent": "#10b981",
  };
  const color = map[status] || G.muted;
  return {
    fontSize: 7,
    color,
    background: `${color}22`,
    border: `1px solid ${color}44`,
    borderRadius: 3,
    padding: "2px 7px",
    letterSpacing: 1,
  };
}

export default function LeadsToolTab({ ctx }) {
  const { G, card, lbl, btnG, btnO, fmt } = ctx;

  const [credits, setCredits] = useState({ dataCredits: 2500, skipTracesUsed: 132, leadsPulled: 487 });
  const [buildForm, setBuildForm] = useState({ city: "Sacramento", propertyType: "Single Family", listType: "Absentee Owner", minEquity: "50000" });
  const [pullEstimate, setPullEstimate] = useState(null);
  const [filterType, setFilterType] = useState("All");
  const [leadRows, setLeadRows] = useState(LEAD_SEED);
  const [savedIds, setSavedIds] = useState([]);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [dialLead, setDialLead] = useState(null);
  const [smsToast, setSmsToast] = useState("");

  const filteredLeads = useMemo(() => {
    if (filterType === "All") return leadRows;
    return leadRows.filter((lead) => lead.listType === filterType);
  }, [leadRows, filterType]);

  const onPullList = () => {
    const equityBoost = Math.max(1, Math.floor(Number(buildForm.minEquity || 0) / 50000));
    const randomBase = Math.floor(Math.random() * 120) + 60;
    const estimatedCount = Math.max(15, Math.floor(randomBase / equityBoost));
    const creditCost = Math.ceil(estimatedCount * 1.2);
    setPullEstimate({ estimatedCount, creditCost });
    setCredits((prev) => ({ ...prev, leadsPulled: prev.leadsPulled + estimatedCount }));
  };

  const toggleSave = (id) => {
    setSavedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const sendSms = (name) => {
    setSmsToast(`SMS queued for ${name}`);
    setTimeout(() => setSmsToast(""), 1800);
  };

  return (
    <div>
      <div style={{ fontFamily: G.serif, fontSize: 18, marginBottom: 4 }}>Lead Lists</div>
      <div style={{ fontSize: 10, color: G.muted, marginBottom: 14 }}>Build targeted lists, manage credits, and action leads fast.</div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 8, marginBottom: 12 }}>
        <div style={{ ...card, textAlign: "center" }}><div style={{ ...lbl, marginBottom: 3 }}>Data Credits</div><div style={{ fontFamily: G.serif, fontSize: 18, color: G.green }}>{credits.dataCredits.toLocaleString()}</div></div>
        <div style={{ ...card, textAlign: "center" }}><div style={{ ...lbl, marginBottom: 3 }}>Skip Traces</div><div style={{ fontFamily: G.serif, fontSize: 18, color: G.text }}>{credits.skipTracesUsed}</div></div>
        <div style={{ ...card, textAlign: "center" }}><div style={{ ...lbl, marginBottom: 3 }}>Leads Pulled</div><div style={{ fontFamily: G.serif, fontSize: 18, color: G.text }}>{credits.leadsPulled}</div></div>
        <div style={{ ...card, textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <button onClick={() => setShowCreditModal(true)} style={{ ...btnG, fontSize: 9, padding: "8px 12px" }}>Buy Credits</button>
        </div>
      </div>

      <div style={{ ...card, marginBottom: 12 }}>
        <div style={{ fontFamily: G.serif, fontSize: 15, marginBottom: 8 }}>Build a List</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 8, marginBottom: 8 }}>
          <input value={buildForm.city} onChange={(e) => setBuildForm((p) => ({ ...p, city: e.target.value }))} placeholder="Market/City" style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 6, color: G.text, padding: "8px 10px", fontFamily: G.mono }} />
          <select value={buildForm.propertyType} onChange={(e) => setBuildForm((p) => ({ ...p, propertyType: e.target.value }))} style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 6, color: G.text, padding: "8px 10px", fontFamily: G.mono }}>
            {["Single Family", "Multi Family", "Condo", "Townhome"].map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select value={buildForm.listType} onChange={(e) => setBuildForm((p) => ({ ...p, listType: e.target.value }))} style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 6, color: G.text, padding: "8px 10px", fontFamily: G.mono }}>
            {LEAD_LIST_TYPES.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <input value={buildForm.minEquity} onChange={(e) => setBuildForm((p) => ({ ...p, minEquity: e.target.value.replace(/[^0-9]/g, "") }))} placeholder="Min Equity" style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 6, color: G.text, padding: "8px 10px", fontFamily: G.mono }} />
        </div>
        <button onClick={onPullList} style={{ ...btnG, fontSize: 9, padding: "8px 12px" }}>Pull List</button>
        {pullEstimate && (
          <div style={{ marginTop: 8, fontSize: 10, color: G.text }}>
            Estimated leads: <span style={{ color: G.green, fontWeight: "bold" }}>{pullEstimate.estimatedCount}</span> · Credit cost: <span style={{ color: G.gold, fontWeight: "bold" }}>{pullEstimate.creditCost}</span>
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
        {LEAD_FILTERS.map((item) => (
          <button
            key={item}
            onClick={() => setFilterType(item)}
            style={{
              ...btnO,
              padding: "5px 10px",
              fontSize: 8,
              borderColor: filterType === item ? G.green : G.border,
              color: filterType === item ? G.green : G.muted,
              background: filterType === item ? G.greenGlow : "transparent",
            }}
          >
            {item}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        {filteredLeads.map((lead) => (
          <div key={lead.id} style={{ ...card }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontFamily: G.serif, fontSize: 14, fontWeight: "bold" }}>{lead.name}</div>
                <div style={{ fontSize: 10, color: G.muted }}>{lead.address}</div>
                <div style={{ fontSize: 10, color: G.muted }}>{lead.phone}</div>
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "flex-start", flexWrap: "wrap" }}>
                <div style={statusBadge(lead.status, G)}>{lead.status}</div>
                <div style={statusBadge(lead.listType, G)}>{lead.listType}</div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 6, marginBottom: 8 }}>
              <div style={{ fontSize: 10, color: G.muted }}>Est. Equity: <span style={{ color: G.green, fontFamily: G.serif }}>{fmt(lead.equity)}</span></div>
              <div style={{ fontSize: 10, color: G.muted }}>AVM: <span style={{ color: G.text, fontFamily: G.serif }}>{fmt(lead.avm)}</span></div>
            </div>

            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
              {lead.tags.map((tag) => <div key={tag} style={statusBadge(tag, G)}>{tag}</div>)}
            </div>

            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button onClick={() => setDialLead(lead)} style={{ ...btnG, fontSize: 8, padding: "6px 10px" }}>Call</button>
              <button onClick={() => sendSms(lead.name)} style={{ ...btnO, fontSize: 8, padding: "6px 10px" }}>SMS</button>
              <button onClick={() => toggleSave(lead.id)} style={{ ...btnO, fontSize: 8, padding: "6px 10px", borderColor: savedIds.includes(lead.id) ? G.green : G.border, color: savedIds.includes(lead.id) ? G.green : G.muted }}>
                {savedIds.includes(lead.id) ? "Saved" : "Save"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {smsToast && <div style={{ position: "fixed", bottom: 14, right: 14, background: G.surface, border: `1px solid ${G.green}44`, borderRadius: 8, padding: "8px 12px", color: G.green, fontSize: 10 }}>{smsToast}</div>}

      {dialLead && (
        <div style={{ position: "fixed", right: 14, bottom: 14, width: 290, background: G.card, border: `1px solid ${G.green}44`, borderRadius: 8, padding: 12, zIndex: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <div style={{ fontFamily: G.serif, fontSize: 14, color: G.green }}>Dialer</div>
            <button onClick={() => setDialLead(null)} style={{ ...btnO, padding: "2px 8px", fontSize: 8 }}>Close</button>
          </div>
          <div style={{ fontSize: 10, color: G.text }}>{dialLead.name}</div>
          <div style={{ fontSize: 10, color: G.muted, marginBottom: 10 }}>{dialLead.phone}</div>
          <button style={{ ...btnG, width: "100%", fontSize: 9 }}>Call {dialLead.phone}</button>
        </div>
      )}

      {showCreditModal && (
        <div style={{ position: "fixed", inset: 0, background: "#000000aa", display: "flex", alignItems: "center", justifyContent: "center", padding: 12, zIndex: 30 }}>
          <div style={{ ...card, width: "100%", maxWidth: 560 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ fontFamily: G.serif, fontSize: 16 }}>Buy Data Credits</div>
              <button onClick={() => setShowCreditModal(false)} style={{ ...btnO, padding: "4px 9px", fontSize: 8 }}>Close</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 8 }}>
              {[{ name: "Starter", credits: "500", price: "$49" }, { name: "Growth", credits: "2K", price: "$149", popular: true }, { name: "Pro", credits: "10K", price: "$499" }].map((pack) => (
                <div key={pack.name} style={{ background: G.surface, border: `1px solid ${pack.popular ? G.gold : G.border}`, borderRadius: 8, padding: 12 }}>
                  {pack.popular && <div style={statusBadge("Most Popular", { ...G, green: G.gold })}>Most Popular</div>}
                  <div style={{ fontFamily: G.serif, fontSize: 15, marginTop: pack.popular ? 8 : 0 }}>{pack.name}</div>
                  <div style={{ fontFamily: G.serif, fontSize: 22, color: G.green }}>{pack.credits}</div>
                  <div style={{ fontSize: 10, color: G.muted, marginBottom: 8 }}>credits</div>
                  <div style={{ fontFamily: G.serif, fontSize: 17, color: G.gold, marginBottom: 8 }}>{pack.price}</div>
                  <button style={{ ...btnG, width: "100%", fontSize: 8, padding: "6px 8px" }}>Purchase</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
