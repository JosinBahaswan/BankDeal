import { useMemo, useState } from "react";
import { ACTIVE_SEQUENCES_SEED, CRM_PIPELINE } from "./toolData";

const VARIABLE_TOKENS = ["{{first_name}}", "{{property_address}}", "{{equity_estimate}}", "{{city}}", "{{callback_time}}"];

function shortBadge(status, G) {
  const color = status === "Active" ? G.green : status === "Paused" ? G.gold : G.muted;
  return {
    fontSize: 8,
    color,
    border: `1px solid ${color}55`,
    background: `${color}22`,
    borderRadius: 3,
    padding: "2px 7px",
    letterSpacing: 1,
  };
}

function newStepTemplate(index) {
  return {
    id: `step-${Date.now()}-${index}`,
    delay: index === 0 ? "0" : "2",
    channel: index % 2 ? "SMS" : "Email",
    message: index === 0
      ? "Hi {{first_name}}, wanted to ask if you would consider an as-is cash offer for {{property_address}}."
      : "Following up on {{property_address}}. We can close on your timeline and handle repairs.",
  };
}

export default function CrmSequencesToolTab({ ctx }) {
  const { G, card, btnG, btnO } = ctx;

  const [sequences, setSequences] = useState(ACTIVE_SEQUENCES_SEED);
  const [pipeline, setPipeline] = useState(CRM_PIPELINE);
  const [builderName, setBuilderName] = useState("Motivated Seller Follow-up");
  const [selectedStepId, setSelectedStepId] = useState(null);
  const [builderSteps, setBuilderSteps] = useState([
    {
      id: "s-1",
      delay: "0",
      channel: "SMS",
      message: "Hi {{first_name}}, are you open to discussing an as-is offer on {{property_address}}?",
    },
    {
      id: "s-2",
      delay: "1",
      channel: "SMS",
      message: "Quick follow up from yesterday. I can share a number with no obligation.",
    },
    {
      id: "s-3",
      delay: "3",
      channel: "Email",
      message: "If now is not ideal, we can reconnect at {{callback_time}}.",
    },
  ]);

  const pipelineStages = useMemo(() => Object.keys(pipeline), [pipeline]);

  const updateStep = (stepId, key, value) => {
    setBuilderSteps((prev) => prev.map((step) => (step.id === stepId ? { ...step, [key]: value } : step)));
  };

  const removeStep = (stepId) => {
    setBuilderSteps((prev) => prev.filter((step) => step.id !== stepId));
    if (selectedStepId === stepId) setSelectedStepId(null);
  };

  const addStep = () => {
    setBuilderSteps((prev) => [...prev, newStepTemplate(prev.length)]);
  };

  const injectToken = (token) => {
    if (!selectedStepId) return;
    setBuilderSteps((prev) => prev.map((step) => (step.id === selectedStepId ? { ...step, message: `${step.message} ${token}`.trim() } : step)));
  };

  const createSequence = () => {
    if (!builderName.trim() || builderSteps.length === 0) return;

    const totalTouches = builderSteps.length * 42;
    const replies = Math.max(5, Math.round(totalTouches * 0.09));

    const record = {
      id: `seq-${Date.now()}`,
      name: builderName.trim(),
      leadCount: 42,
      sent: totalTouches,
      replies,
      conversion: `${((replies / totalTouches) * 100).toFixed(1)}%`,
      status: "Active",
    };

    setSequences((prev) => [record, ...prev]);
    setBuilderName("New Sequence");
    setBuilderSteps([newStepTemplate(0), newStepTemplate(1)]);
    setSelectedStepId(null);
  };

  const toggleSequenceStatus = (id) => {
    setSequences((prev) => prev.map((row) => {
      if (row.id !== id) return row;
      return { ...row, status: row.status === "Active" ? "Paused" : "Active" };
    }));
  };

  const movePipelineCard = (fromStage, toStage, cardId) => {
    if (fromStage === toStage) return;

    setPipeline((prev) => {
      const cardList = prev[fromStage] || [];
      const selectedCard = cardList.find((cardItem) => cardItem.id === cardId);
      if (!selectedCard) return prev;

      return {
        ...prev,
        [fromStage]: cardList.filter((cardItem) => cardItem.id !== cardId),
        [toStage]: [{ ...selectedCard, movedAt: Date.now() }, ...(prev[toStage] || [])],
      };
    });
  };

  return (
    <div>
      <div style={{ fontFamily: G.serif, fontSize: 18, marginBottom: 4 }}>CRM & Sequences</div>
      <div style={{ fontSize: 10, color: G.muted, marginBottom: 14 }}>Track your pipeline and automate personalized follow-up with variable-based templates.</div>

      <div style={{ ...card, marginBottom: 12 }}>
        <div style={{ fontFamily: G.serif, fontSize: 15, marginBottom: 8 }}>Active Sequences</div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: `1px solid ${G.border}` }}>
                <th style={{ fontSize: 9, color: G.muted, fontWeight: "normal", padding: "8px 6px" }}>Sequence</th>
                <th style={{ fontSize: 9, color: G.muted, fontWeight: "normal", padding: "8px 6px" }}>Leads</th>
                <th style={{ fontSize: 9, color: G.muted, fontWeight: "normal", padding: "8px 6px" }}>Sent</th>
                <th style={{ fontSize: 9, color: G.muted, fontWeight: "normal", padding: "8px 6px" }}>Replies</th>
                <th style={{ fontSize: 9, color: G.muted, fontWeight: "normal", padding: "8px 6px" }}>Conversion</th>
                <th style={{ fontSize: 9, color: G.muted, fontWeight: "normal", padding: "8px 6px" }}>Status</th>
                <th style={{ fontSize: 9, color: G.muted, fontWeight: "normal", padding: "8px 6px" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {sequences.map((row) => (
                <tr key={row.id} style={{ borderBottom: `1px solid ${G.faint}` }}>
                  <td style={{ fontSize: 10, color: G.text, padding: "8px 6px" }}>{row.name}</td>
                  <td style={{ fontSize: 10, color: G.muted, padding: "8px 6px" }}>{row.leadCount}</td>
                  <td style={{ fontSize: 10, color: G.muted, padding: "8px 6px" }}>{row.sent}</td>
                  <td style={{ fontSize: 10, color: G.muted, padding: "8px 6px" }}>{row.replies}</td>
                  <td style={{ fontSize: 10, color: G.green, padding: "8px 6px" }}>{row.conversion}</td>
                  <td style={{ padding: "8px 6px" }}><span style={shortBadge(row.status, G)}>{row.status}</span></td>
                  <td style={{ padding: "8px 6px" }}>
                    <button onClick={() => toggleSequenceStatus(row.id)} style={{ ...btnO, fontSize: 8, padding: "3px 8px" }}>
                      {row.status === "Active" ? "Pause" : "Resume"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ ...card, marginBottom: 12 }}>
        <div style={{ fontFamily: G.serif, fontSize: 15, marginBottom: 8 }}>Inline Sequence Builder</div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, marginBottom: 8 }}>
          <input
            value={builderName}
            onChange={(e) => setBuilderName(e.target.value)}
            placeholder="Sequence name"
            style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 6, color: G.text, padding: "8px 10px", fontFamily: G.mono }}
          />
          <button onClick={createSequence} style={{ ...btnG, fontSize: 9, padding: "8px 11px" }}>Launch Sequence</button>
        </div>

        <div style={{ fontSize: 8, color: G.muted, marginBottom: 5 }}>Variables</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
          {VARIABLE_TOKENS.map((token) => (
            <button key={token} onClick={() => injectToken(token)} style={{ ...btnO, fontSize: 8, padding: "4px 8px", color: G.green, borderColor: `${G.green}66` }}>
              {token}
            </button>
          ))}
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          {builderSteps.map((step, idx) => (
            <div key={step.id} style={{ background: G.surface, border: `1px solid ${selectedStepId === step.id ? G.green : G.border}`, borderRadius: 7, padding: 10 }} onClick={() => setSelectedStepId(step.id)}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                <div style={{ fontSize: 8, color: G.green }}>STEP {idx + 1}</div>
                <input value={step.delay} onChange={(e) => updateStep(step.id, "delay", e.target.value.replace(/[^0-9]/g, ""))} style={{ width: 62, background: "#111", border: `1px solid ${G.border}`, borderRadius: 4, color: G.text, padding: "3px 6px", fontSize: 9, fontFamily: G.mono }} />
                <div style={{ fontSize: 8, color: G.muted, display: "flex", alignItems: "center" }}>days later</div>
                <select value={step.channel} onChange={(e) => updateStep(step.id, "channel", e.target.value)} style={{ background: "#111", border: `1px solid ${G.border}`, borderRadius: 4, color: G.text, padding: "3px 6px", fontSize: 9, fontFamily: G.mono }}>
                  {["SMS", "Email", "Call Task"].map((channel) => <option key={channel} value={channel}>{channel}</option>)}
                </select>
                {builderSteps.length > 1 && (
                  <button onClick={() => removeStep(step.id)} style={{ ...btnO, fontSize: 8, padding: "3px 7px", color: G.red }}>
                    Remove
                  </button>
                )}
              </div>
              <textarea value={step.message} onChange={(e) => updateStep(step.id, "message", e.target.value)} rows={2} style={{ width: "100%", boxSizing: "border-box", resize: "vertical", background: "#111", border: `1px solid ${G.border}`, borderRadius: 4, color: G.text, fontFamily: G.mono, fontSize: 10, padding: "7px 8px" }} />
            </div>
          ))}
        </div>

        <button onClick={addStep} style={{ ...btnO, fontSize: 8, padding: "5px 9px", marginTop: 8 }}>+ Add Step</button>
      </div>

      <div style={{ ...card }}>
        <div style={{ fontFamily: G.serif, fontSize: 15, marginBottom: 8 }}>Pipeline Board</div>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${pipelineStages.length},minmax(170px,1fr))`, gap: 8, overflowX: "auto", paddingBottom: 2 }}>
          {pipelineStages.map((stage) => (
            <div key={stage} style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 7, padding: 8, minHeight: 160 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
                <div style={{ fontSize: 9, color: G.text, letterSpacing: 1 }}>{stage}</div>
                <div style={{ fontSize: 8, color: G.muted }}>{pipeline[stage].length}</div>
              </div>

              <div style={{ display: "grid", gap: 6 }}>
                {pipeline[stage].map((cardItem) => (
                  <div key={cardItem.id} style={{ background: "#0d0d0d", border: `1px solid ${G.border}`, borderRadius: 6, padding: "7px 8px" }}>
                    <div style={{ fontSize: 10, color: G.text, marginBottom: 3 }}>{cardItem.name}</div>
                    <div style={{ fontSize: 8, color: G.muted, marginBottom: 5 }}>{cardItem.address}</div>
                    <select onChange={(e) => movePipelineCard(stage, e.target.value, cardItem.id)} value={stage} style={{ width: "100%", background: "#111", border: `1px solid ${G.border}`, borderRadius: 4, color: G.text, padding: "3px 5px", fontSize: 8, fontFamily: G.mono }}>
                      {pipelineStages.map((target) => <option key={target} value={target}>{target}</option>)}
                    </select>
                  </div>
                ))}
                {pipeline[stage].length === 0 && <div style={{ fontSize: 8, color: G.muted }}>No records</div>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
