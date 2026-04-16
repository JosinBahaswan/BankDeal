export default function ContractsCreateView({
  G,
  card,
  lbl,
  btnG,
  btnO,
  fmt,
  isMobile,
  contractsError,
  deliveryNote,
  templateOrder,
  templateConfig,
  templateId,
  editingId,
  saveBusy,
  activeTemplate,
  formVals,
  previewFee,
  previewBody,
  onBack,
  onSelectTemplate,
  onFieldChange,
  onSaveDraft,
  onSaveAndSend,
}) {
  return (
    <div>
      <button onClick={onBack} style={{ ...btnO, marginBottom: 12, padding: "5px 12px", fontSize: 9 }}>← Back to Contracts</button>

      {contractsError && (
        <div style={{ ...card, borderColor: `${G.red}55`, color: G.red, fontSize: 10, marginBottom: 12 }}>
          {contractsError}
        </div>
      )}

      {deliveryNote && (
        <div style={{ ...card, borderColor: `${G.blue}55`, color: G.blue, fontSize: 10, marginBottom: 12 }}>
          {deliveryNote}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 6, marginBottom: 12 }}>
        {templateOrder.map((id) => {
          const template = templateConfig[id];
          return (
            <button
              key={id}
              onClick={() => {
                if (editingId || saveBusy) return;
                onSelectTemplate(id);
              }}
              style={{
                ...btnO,
                fontSize: 8,
                padding: "8px 10px",
                borderColor: templateId === id ? G.green : G.border,
                color: templateId === id ? G.green : G.muted,
                background: templateId === id ? G.greenGlow : "transparent",
              }}
            >
              {template.label}
            </button>
          );
        })}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.2fr 1fr", gap: 12 }}>
        <div style={{ ...card }}>
          <div style={{ fontFamily: G.serif, fontSize: 17, marginBottom: 6 }}>{activeTemplate.label}</div>
          <div style={{ fontSize: 10, color: G.muted, marginBottom: 10 }}>{activeTemplate.summary}</div>

          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 8, marginBottom: 12 }}>
            {activeTemplate.fields.map((field) => (
              <div key={field.key}>
                <div style={lbl}>{field.label}</div>
                <div style={{ position: "relative" }}>
                  {field.prefix && <span style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: G.muted, fontSize: 12 }}>{field.prefix}</span>}
                  <input
                    value={formVals[field.key] || ""}
                    onChange={(event) => onFieldChange(field.key, event.target.value)}
                    placeholder={field.placeholder}
                    style={{ width: "100%", background: G.surface, border: `1px solid ${G.border}`, borderRadius: 6, color: G.text, fontFamily: G.mono, fontSize: 11, padding: field.prefix ? "8px 10px 8px 20px" : "8px 10px", boxSizing: "border-box", outline: "none" }}
                  />
                </div>
              </div>
            ))}
          </div>

          {templateId === "assignment" && (
            <div style={{ background: "#1a1200", border: `1px solid ${G.gold}44`, borderRadius: 7, padding: "10px 12px", marginBottom: 12 }}>
              <div style={{ ...lbl, color: G.gold, marginBottom: 4 }}>Platform Fee Section A3 (Auto-Inserted)</div>
              <div style={{ fontSize: 10, color: G.text, lineHeight: 1.7 }}>
                Both parties authorize the closing agent to disburse 1.5% of the assignment fee to DealBank LLC at closing. This clause is mandatory and cannot be removed.
              </div>
              <div style={{ marginTop: 6, fontSize: 10, color: G.gold }}>
                Estimated DealBank fee: <strong>{fmt(previewFee)}</strong>
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: 8, flexDirection: isMobile ? "column" : "row" }}>
            <button
              onClick={onSaveDraft}
              disabled={saveBusy}
              style={{ ...btnO, flex: 1, fontSize: 9, opacity: saveBusy ? 0.6 : 1 }}
            >
              {saveBusy ? "Saving..." : "Save as Draft"}
            </button>
            <button
              onClick={onSaveAndSend}
              disabled={saveBusy}
              style={{ ...btnG, flex: 2, fontSize: 9, opacity: saveBusy ? 0.75 : 1 }}
            >
              {saveBusy ? "Saving..." : "Send for Signature"}
            </button>
          </div>
        </div>

        <div style={{ ...card }}>
          <div style={{ ...lbl, marginBottom: 8 }}>Live Preview</div>
          <div style={{ fontFamily: G.serif, fontSize: 14, marginBottom: 8 }}>{activeTemplate.label}</div>
          <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontFamily: G.mono, fontSize: 10, color: G.text, lineHeight: 1.7 }}>{previewBody}</pre>
          <div style={{ marginTop: 12, borderTop: `1px solid ${G.faint}`, paddingTop: 10 }}>
            <div style={{ fontSize: 10, color: G.muted, marginBottom: 6 }}>Signature Blocks</div>
            {activeTemplate.parties.map((party) => (
              <div key={party} style={{ marginBottom: 10, fontSize: 10, color: G.text }}>
                {party}: _______________________   Date: ___________
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
