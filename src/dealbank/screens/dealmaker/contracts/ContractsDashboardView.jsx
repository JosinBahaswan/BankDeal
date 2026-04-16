export default function ContractsDashboardView({
  G,
  card,
  lbl,
  btnG,
  btnO,
  fmt,
  isMobile,
  contractsError,
  deliveryNote,
  contractsLoading,
  contracts,
  templateOrder,
  templateConfig,
  defaultTemplate,
  onCreateNew,
  onEditAndSend,
  onOpenSign,
  onDownloadPdf,
}) {
  return (
    <div>
      <div style={{ ...card, marginBottom: 12 }}>
        <div style={{ fontFamily: G.serif, fontSize: 18, marginBottom: 8 }}>Platform Fee Enforcement</div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(4,1fr)", gap: 8 }}>
          {[
            "Contract created with Section A3 fee clause",
            "Both parties sign electronically",
            "Title receives disbursement instructions",
            "Close disburses 98.5% to wholesaler and 1.5% to DealBank",
          ].map((step, index) => (
            <div key={step} style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 7, padding: "10px 11px" }}>
              <div style={{ fontSize: 8, color: G.green, letterSpacing: 2, marginBottom: 4 }}>STEP {index + 1}</div>
              <div style={{ fontSize: 10, color: G.text, lineHeight: 1.6 }}>{step}</div>
            </div>
          ))}
        </div>
      </div>

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

      <div style={{ ...card, marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: isMobile ? "stretch" : "center", marginBottom: 8, gap: 8, flexDirection: isMobile ? "column" : "row" }}>
          <div style={{ fontFamily: G.serif, fontSize: 16 }}>Contracts Dashboard</div>
          <button onClick={() => onCreateNew("assignment")} disabled={contractsLoading} style={{ ...btnG, fontSize: 9, padding: "7px 12px", width: isMobile ? "100%" : "auto", opacity: contractsLoading ? 0.75 : 1 }}>+ New Contract</button>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: `1px solid ${G.border}` }}>
                {[
                  "Contract",
                  "Status",
                  "Parties",
                  "Created",
                  "Assignment Fee",
                  "DealBank Fee",
                  "Actions",
                ].map((head) => (
                  <th key={head} style={{ fontSize: 8, color: G.muted, fontWeight: "normal", letterSpacing: 1, padding: "8px 6px" }}>{head}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {contractsLoading ? (
                <tr>
                  <td colSpan={7} style={{ fontSize: 10, color: G.muted, textAlign: "center", padding: "16px 8px" }}>
                    Loading contracts...
                  </td>
                </tr>
              ) : contracts.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ fontSize: 10, color: G.muted, textAlign: "center", padding: "16px 8px" }}>
                    No contracts yet. Create your first contract to start tracking signatures.
                  </td>
                </tr>
              ) : contracts.map((contract) => {
                const template = templateConfig[contract.templateId] || defaultTemplate;
                const assignmentFee = template.id === "assignment" ? fmt(contract.formVals.assignmentFee || 0) : "-";
                const statusColor = contract.status === "Fully Executed" ? G.green : contract.status === "Awaiting Signature" ? G.gold : G.muted;

                return (
                  <tr key={contract.id} style={{ borderBottom: `1px solid ${G.faint}` }}>
                    <td style={{ padding: "9px 6px" }}>
                      <div style={{ fontSize: 10, color: G.text }}>{contract.name}</div>
                      <div style={{ fontSize: 8, color: G.muted }}>{template.label}</div>
                    </td>
                    <td style={{ padding: "9px 6px" }}>
                      <span style={{ fontSize: 8, color: statusColor, border: `1px solid ${statusColor}55`, background: `${statusColor}22`, borderRadius: 3, padding: "2px 7px", letterSpacing: 1 }}>{contract.status}</span>
                    </td>
                    <td style={{ fontSize: 9, color: G.muted, padding: "9px 6px" }}>{contract.parties.length}</td>
                    <td style={{ fontSize: 9, color: G.muted, padding: "9px 6px" }}>{contract.created}</td>
                    <td style={{ fontSize: 9, color: G.text, padding: "9px 6px" }}>{assignmentFee}</td>
                    <td style={{ fontSize: 9, color: G.gold, padding: "9px 6px" }}>{contract.feeAmount ? fmt(contract.feeAmount) : "-"}</td>
                    <td style={{ padding: "9px 6px" }}>
                      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                        {contract.status !== "Fully Executed" && contract.auditTrail.length === 0 && (
                          <button onClick={() => onEditAndSend(contract)} style={{ ...btnO, fontSize: 8, padding: "4px 8px" }}>Edit & Send</button>
                        )}
                        <button onClick={() => onOpenSign(contract.id)} style={{ ...btnO, fontSize: 8, padding: "4px 8px", borderColor: G.gold, color: G.gold }}>
                          {contract.status === "Fully Executed" ? "View Audit" : "Sign"}
                        </button>
                        <button onClick={() => onDownloadPdf(contract)} style={{ ...btnO, fontSize: 8, padding: "4px 8px" }}>View + Download PDF</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3,1fr)", gap: 8 }}>
        {templateOrder.map((id) => {
          const template = templateConfig[id];
          return (
            <div key={template.id} style={{ ...card }}>
              <div style={{ ...lbl, marginBottom: 4 }}>Template</div>
              <div style={{ fontFamily: G.serif, fontSize: 15, marginBottom: 4 }}>{template.label}</div>
              <div style={{ fontSize: 10, color: G.muted, lineHeight: 1.6, marginBottom: 10 }}>{template.summary}</div>
              <button onClick={() => onCreateNew(template.id)} disabled={contractsLoading} style={{ ...btnG, width: "100%", fontSize: 9, opacity: contractsLoading ? 0.75 : 1 }}>Use Template</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
