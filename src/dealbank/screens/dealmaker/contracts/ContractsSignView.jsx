export default function ContractsSignView({
  G,
  card,
  lbl,
  btnG,
  btnO,
  isMobile,
  contractsError,
  deliveryNote,
  activeContract,
  template,
  contractText,
  nextSigner,
  sigMode,
  typedName,
  canApplySignature,
  signBusy,
  canvasRef,
  onBack,
  onSigModeChange,
  onTypedNameChange,
  onStartDraw,
  onDrawLine,
  onEndDraw,
  onClearDrawnSignature,
  onApplySignature,
  onDownloadContract,
  escrowPaymentPanel,
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

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.3fr 1fr", gap: 12 }}>
        <div style={{ ...card }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8, gap: 8, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontFamily: G.serif, fontSize: 16 }}>{activeContract.name}</div>
              <div style={{ fontSize: 10, color: G.muted }}>{template.label} · {activeContract.status}</div>
            </div>
            <div style={{ fontSize: 8, color: G.gold, border: `1px solid ${G.gold}55`, background: `${G.gold}22`, borderRadius: 3, padding: "2px 7px", letterSpacing: 1 }}>
              PLATFORM FEE 1.5%
            </div>
          </div>
          <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontFamily: G.mono, fontSize: 10, color: G.text, lineHeight: 1.7 }}>{contractText}</pre>

          <div style={{ marginTop: 12, borderTop: `1px solid ${G.faint}`, paddingTop: 10 }}>
            <div style={{ ...lbl, marginBottom: 6 }}>Execution Tracker</div>
            {activeContract.parties.map((party) => (
              <div key={party.role} style={{ display: "flex", justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "center", padding: "6px 0", borderBottom: `1px solid ${G.faint}`, gap: 8, flexDirection: isMobile ? "column" : "row" }}>
                <div>
                  <div style={{ fontSize: 10, color: G.text }}>{party.role}</div>
                  <div style={{ fontSize: 8, color: G.muted }}>{party.signerName || "Pending signer"}</div>
                </div>
                <div style={{ fontSize: 8, color: party.status === "Signed" ? G.green : nextSigner?.role === party.role ? G.gold : G.muted }}>
                  {party.status === "Signed" ? `Signed ${party.signedAt}` : nextSigner?.role === party.role ? (party.isExternal ? "Awaiting External Signature" : "Your Turn") : "Waiting"}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ ...card }}>
          {activeContract.status === "Fully Executed" ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 30, marginBottom: 8 }}>OK</div>
              <div style={{ fontFamily: G.serif, fontSize: 18, color: G.green, marginBottom: 6 }}>Fully Executed</div>
              <div style={{ fontSize: 10, color: G.muted, lineHeight: 1.7, marginBottom: 12 }}>
                All parties have signed. Title instructions can now be sent with platform fee authorization.
              </div>
              <div style={{ ...lbl, marginBottom: 6 }}>Audit Trail</div>
              {activeContract.auditTrail.map((item) => (
                <div key={item.id} style={{ textAlign: "left", background: G.surface, border: `1px solid ${G.border}`, borderRadius: 5, padding: "7px 8px", fontSize: 9, color: G.text, marginBottom: 6 }}>
                  {item.role}: {item.signerName} · {item.method} · {item.signatureAlgorithm || "RS256"} · {item.signedAt}{item.signerIp ? ` · IP ${item.signerIp}` : ""}
                </div>
              ))}
              {activeContract.pdfUrl && (
                <a
                  href={activeContract.pdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{ ...btnO, display: "block", textAlign: "center", width: "100%", fontSize: 9, marginTop: 6, boxSizing: "border-box", textDecoration: "none" }}
                >
                  Open Stored PDF
                </a>
              )}
              <button onClick={onDownloadContract} style={{ ...btnG, width: "100%", fontSize: 9, marginTop: 6 }}>Download PDF Contract</button>
            </div>
          ) : (
            <div>
              <div style={{ ...lbl, marginBottom: 6 }}>Sign Contract</div>
              <div style={{ fontSize: 10, color: G.text, marginBottom: 8 }}>
                Next signer: <strong>{nextSigner?.role || "None"}</strong> {nextSigner?.isExternal && <span style={{ color: G.gold }}>(External: {nextSigner.email})</span>}
              </div>

              {nextSigner?.isExternal ? (
                <div style={{ background: `${G.gold}11`, border: `1px solid ${G.gold}44`, borderRadius: 6, padding: "12px", textAlign: "center", marginBottom: 8 }}>
                  <div style={{ fontSize: 12, marginBottom: 4 }}>⏳ Awaiting Signature</div>
                  <div style={{ fontSize: 9, color: G.muted }}>
                    This party must sign via the email link sent to <strong>{nextSigner.email}</strong>. 
                    You will be notified once they complete the signature.
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                    {[
                      ["type", "Type"],
                      ["draw", "Draw"],
                    ].map(([id, label]) => (
                      <button
                        key={id}
                        onClick={() => onSigModeChange(id)}
                        style={{ ...btnO, flex: 1, fontSize: 8, padding: "6px 8px", borderColor: sigMode === id ? G.green : G.border, color: sigMode === id ? G.green : G.muted, background: sigMode === id ? G.greenGlow : "transparent" }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  {sigMode === "type" ? (
                    <div style={{ marginBottom: 8 }}>
                      <input
                        value={typedName}
                        onChange={(event) => onTypedNameChange(event.target.value)}
                        placeholder="Type full legal name"
                        style={{ width: "100%", background: G.surface, border: `1px solid ${G.border}`, borderRadius: 6, color: G.text, fontFamily: G.mono, fontSize: 11, padding: "8px 10px", boxSizing: "border-box", outline: "none" }}
                      />
                      <div style={{ fontFamily: G.serif, fontStyle: "italic", color: G.green, marginTop: 6, minHeight: 20 }}>{typedName}</div>
                    </div>
                  ) : (
                    <div style={{ marginBottom: 8 }}>
                      <canvas
                        ref={canvasRef}
                        width={isMobile ? 320 : 400}
                        height={120}
                        onMouseDown={onStartDraw}
                        onMouseMove={onDrawLine}
                        onMouseUp={onEndDraw}
                        onMouseLeave={onEndDraw}
                        onTouchStart={onStartDraw}
                        onTouchMove={onDrawLine}
                        onTouchEnd={onEndDraw}
                        style={{ width: "100%", height: 120, borderRadius: 6, border: `1px solid ${G.border}`, background: G.surface, touchAction: "none" }}
                      />
                      <button onClick={onClearDrawnSignature} style={{ ...btnO, marginTop: 6, fontSize: 8, padding: "4px 8px" }}>Clear</button>
                    </div>
                  )}

                  <div style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 6, padding: "8px 9px", fontSize: 9, color: G.muted, lineHeight: 1.7, marginBottom: 8 }}>
                    By applying this signature you agree to contract terms and authorize title/escrow disbursement of the 1.5% DealBank platform fee at close.
                  </div>

                  <button
                    onClick={onApplySignature}
                    disabled={!canApplySignature || signBusy}
                    style={{ ...btnG, width: "100%", fontSize: 9, background: canApplySignature && !signBusy ? G.green : G.faint, color: canApplySignature && !signBusy ? "#000" : G.muted }}
                  >
                    {signBusy ? "Applying Signature..." : "Apply Signature"}
                  </button>
                </>
              )}
            </div>
          )}

          {escrowPaymentPanel}
        </div>
      </div>
    </div>
  );
}
