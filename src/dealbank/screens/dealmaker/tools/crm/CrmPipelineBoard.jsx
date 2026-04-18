import { useMemo, useState } from "react";

function readDropPayload(event) {
  try {
    const text = event.dataTransfer?.getData("text/plain") || "";
    if (!text) return null;
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== "object") return null;
    if (!parsed.cardId || !parsed.fromStage) return null;
    return {
      cardId: String(parsed.cardId),
      fromStage: String(parsed.fromStage),
    };
  } catch {
    return null;
  }
}

export default function CrmPipelineBoard({
  G,
  card,
  pipeline,
  pipelineStages,
  onMove,
}) {
  const [dragPayload, setDragPayload] = useState(null);
  const [hoverStage, setHoverStage] = useState("");

  const totalCards = useMemo(() => {
    return pipelineStages.reduce((sum, stage) => sum + (pipeline[stage] || []).length, 0);
  }, [pipeline, pipelineStages]);

  const startDrag = (fromStage, cardId, event) => {
    const payload = {
      fromStage: String(fromStage || ""),
      cardId: String(cardId || ""),
    };

    setDragPayload(payload);

    try {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", JSON.stringify(payload));
    } catch {
      // no-op
    }
  };

  const handleDrop = (toStage, event) => {
    event.preventDefault();
    const fromTransfer = readDropPayload(event);
    const payload = fromTransfer || dragPayload;

    setHoverStage("");
    setDragPayload(null);

    if (!payload?.cardId || !payload?.fromStage) return;
    if (payload.fromStage === toStage) return;

    onMove(payload.fromStage, toStage, payload.cardId);
  };

  return (
    <div style={{ ...card }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ fontFamily: G.serif, fontSize: 15 }}>Pipeline Board</div>
        <div style={{ fontSize: 9, color: G.muted }}>{totalCards} leads</div>
      </div>

      <div style={{ fontSize: 9, color: G.muted, marginBottom: 10 }}>
        Drag cards between columns to update lead stage. Dropdown move is still available for keyboard fallback.
      </div>

      <div style={{ display: "grid", gridTemplateColumns: `repeat(${pipelineStages.length},minmax(170px,1fr))`, gap: 8, overflowX: "auto", paddingBottom: 2 }}>
        {pipelineStages.map((stage) => {
          const rows = pipeline[stage] || [];
          const isHovering = hoverStage === stage;

          return (
            <div
              key={stage}
              onDragOver={(event) => {
                event.preventDefault();
                setHoverStage(stage);
              }}
              onDragEnter={() => setHoverStage(stage)}
              onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) {
                  setHoverStage((prev) => (prev === stage ? "" : prev));
                }
              }}
              onDrop={(event) => handleDrop(stage, event)}
              style={{
                background: isHovering ? `${G.green}14` : G.surface,
                border: `1px solid ${isHovering ? `${G.green}88` : G.border}`,
                borderRadius: 7,
                padding: 8,
                minHeight: 170,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
                <div style={{ fontSize: 9, color: G.text, letterSpacing: 1 }}>{stage}</div>
                <div style={{ fontSize: 8, color: G.muted }}>{rows.length}</div>
              </div>

              <div style={{ display: "grid", gap: 6 }}>
                {rows.map((cardItem) => (
                  <div
                    key={cardItem.id}
                    draggable
                    onDragStart={(event) => startDrag(stage, cardItem.id, event)}
                    onDragEnd={() => {
                      setDragPayload(null);
                      setHoverStage("");
                    }}
                    style={{
                      background: "#0d0d0d",
                      border: `1px solid ${G.border}`,
                      borderRadius: 6,
                      padding: "7px 8px",
                      cursor: "grab",
                    }}
                  >
                    <div style={{ fontSize: 10, color: G.text, marginBottom: 3 }}>{cardItem.name}</div>
                    <div style={{ fontSize: 8, color: G.muted, marginBottom: 5 }}>{cardItem.address}</div>
                    <select
                      onChange={(event) => onMove(stage, event.target.value, cardItem.id)}
                      value={stage}
                      style={{ width: "100%", background: "#111", border: `1px solid ${G.border}`, borderRadius: 4, color: G.text, padding: "3px 5px", fontSize: 8, fontFamily: G.mono }}
                    >
                      {pipelineStages.map((target) => <option key={target} value={target}>{target}</option>)}
                    </select>
                  </div>
                ))}

                {rows.length === 0 && (
                  <div style={{ fontSize: 8, color: G.muted }}>
                    Drop lead here
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
