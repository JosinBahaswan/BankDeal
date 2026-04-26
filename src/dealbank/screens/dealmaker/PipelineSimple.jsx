import { useState } from "react";
import { sendContractForESign } from "../../core/apiClient";

export default function PipelineSimple({ ctx }) {
  const { G, card, lbl, smIn, btnG, btnO, fmt, pipeline = [], updateDealStage, isMobile, setFlipTab } = ctx;

  const STAGES = ["Analyzing", "Negotiating", "Under Contract", "Disposition"];
  
  const [contractModal, setContractModal] = useState({ open: false, deal: null });
  const [contractForm, setContractForm] = useState({ sellerName: "", closeDate: "", recipientEmail: "" });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  async function handleSendContract() {
    setLoading(true);
    try {
      const res = await sendContractForESign({
        email: contractForm.recipientEmail,
        address: contractModal.deal.address,
        price: contractModal.deal.offer,
        sellerName: contractForm.sellerName
      });
      if (res.success) {
        updateDealStage(contractModal.deal, "Under Contract");
        setMsg(`Contract sent for ${contractModal.deal.address}! Redirecting to manage signatures...`);
        setTimeout(() => setFlipTab("contracts"), 2000);
        setContractModal({ open: false, deal: null });
      }
    } catch (err) {
      setMsg(err.message || "Failed to send contract");
    }
    setLoading(false);
  }

  return (
    <div style={{ animation: "fadeIn 0.3s ease-out" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <div style={{ fontFamily: G.serif, fontSize: 20, color: G.text }}>📋 Step 3: Deal Pipeline</div>
          <div style={{ fontSize: 12, color: G.muted }}>Manage acquisition and track towards Under Contract status</div>
        </div>
        {msg && <div style={{ background: G.greenGlow, color: G.green, padding: "8px 16px", borderRadius: 20, fontSize: 11, fontWeight: "bold" }}>{msg}</div>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : `repeat(${STAGES.length}, 1fr)`, gap: 12, alignItems: "start" }}>
        {STAGES.map((stage) => {
          const stageDeals = pipeline.filter((d) => {
            const s = d.stage || "Analyzing";
            if (stage === "Disposition" && (s === "Wholesale" || s === "Flip")) return true;
            if (stage === "Negotiating" && s === "Contacted") return true;
            return s === stage;
          });

          return (
            <div key={stage} style={{ background: "rgba(255,255,255,0.02)", borderRadius: 12, padding: 12, minHeight: 400, border: `1px solid ${G.border}` }}>
              <div style={{ ...lbl, color: G.green, marginBottom: 12, fontSize: 11, display: "flex", justifyContent: "space-between" }}>
                <span>{stage.toUpperCase()}</span>
                <span style={{ opacity: 0.5 }}>{stageDeals.length}</span>
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                {stageDeals.map((deal) => (
                  <div key={deal.id} style={{ ...card, padding: 12, border: `1px solid ${G.border}`, background: G.card }}>
                    <div style={{ fontFamily: G.serif, fontSize: 14, color: G.text, fontWeight: "bold", marginBottom: 4 }}>{deal.address}</div>
                    <div style={{ fontSize: 11, color: G.muted, marginBottom: 10 }}>Offer: {fmt(deal.offer)} · ARV: {fmt(deal.arvNum)}</div>
                    
                    <div style={{ display: "grid", gap: 6 }}>
                      {(deal.stage === "Analyzing" || !deal.stage) && (
                        <button onClick={() => updateDealStage(deal, "Contacted")} style={{ ...btnG, fontSize: 10, padding: "6px" }}>Call Homeowner</button>
                      )}

                      {deal.stage === "Contacted" && (
                        <button onClick={() => { setContractModal({ open: true, deal }); setContractForm({ sellerName: '', closeDate: '', recipientEmail: deal.ownerEmail || '' }); }} style={{ ...btnG, fontSize: 10, padding: "6px" }}>Send Purchase Agreement</button>
                      )}

                      {(deal.stage === "Under Contract" || deal.stage === "Wholesale" || deal.stage === "Flip") && (
                        <div style={{ display: "grid", gap: 6 }}>
                          <div style={{ fontSize: 9, color: G.green, textAlign: "center", marginBottom: 4 }}>✍️ UNDER CONTRACT</div>
                          <div style={{ display: "flex", gap: 4 }}>
                            <button onClick={() => updateDealStage(deal, "Wholesale")} style={{ ...btnO, flex: 1, fontSize: 9, padding: "6px", borderColor: deal.stage === "Wholesale" ? G.green : G.border }}>WHOLESALE</button>
                            <button onClick={() => updateDealStage(deal, "Flip")} style={{ ...btnO, flex: 1, fontSize: 9, padding: "6px", borderColor: deal.stage === "Flip" ? G.green : G.border }}>FLIP</button>
                          </div>
                          {deal.stage === "Wholesale" && (
                            <button onClick={() => setFlipTab("marketplace")} style={{ ...btnG, fontSize: 9, padding: "6px" }}>List in Marketplace</button>
                          )}
                          {deal.stage === "Flip" && (
                            <button onClick={() => setFlipTab("contractors")} style={{ ...btnG, fontSize: 9, padding: "6px", background: G.gold, border: "none", color: "#000" }}>Contact Contractors</button>
                          )}
                          <button onClick={() => updateDealStage(deal, "Closed")} style={{ ...btnG, fontSize: 10, padding: "6px", marginTop: 4 }}>Mark as Closed</button>
                        </div>
                      )}

                      {deal.stage === "Closed" && (
                        <div style={{ fontSize: 10, color: G.green, textAlign: "center", padding: 4 }}>Transaction Complete 💰</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {stageDeals.length === 0 && <div style={{ color: G.muted, fontSize: 11, textAlign: "center", marginTop: 20 }}>Pipeline empty</div>}
            </div>
          );
        })}
      </div>

      {contractModal.open && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.8)", display: "grid", placeItems: "center", backdropFilter: "blur(4px)" }}>
          <div style={{ width: isMobile ? "90%" : 450, background: G.card, border: `1px solid ${G.border}`, borderRadius: 16, padding: 24 }}>
            <div style={{ fontFamily: G.serif, fontSize: 20, color: G.text, marginBottom: 4 }}>Step 4: Send Contract</div>
            <div style={{ fontSize: 12, color: G.muted, marginBottom: 20 }}>Generating PDF Contract for {contractModal.deal.address}</div>

            <div style={{ display: "grid", gap: 12, marginBottom: 20 }}>
              <div>
                <div style={lbl}>Seller Name</div>
                <input
                  value={contractForm.sellerName}
                  onChange={(e) => setContractForm({ ...contractForm, sellerName: e.target.value })}
                  placeholder="John Doe"
                  style={{ ...smIn, width: "100%", padding: "10px" }}
                />
              </div>
              <div>
                <div style={lbl}>Offer Price</div>
                <div style={{ padding: "10px", background: G.surface, borderRadius: 6, fontSize: 13, border: `1px solid ${G.border}` }}>{fmt(contractModal.deal.offer)}</div>
              </div>
              <div>
                <div style={lbl}>To (Homeowner Email)</div>
                <input
                  value={contractForm.recipientEmail}
                  onChange={(e) => setContractForm({ ...contractForm, recipientEmail: e.target.value })}
                  placeholder="homeowner@example.com"
                  style={{ ...smIn, width: "100%", padding: "10px" }}
                />
              </div>
              <div>
                <div style={lbl}>Closing Date</div>
                <input
                  type="date"
                  value={contractForm.closeDate}
                  onChange={(e) => setContractForm({ ...contractForm, closeDate: e.target.value })}
                  style={{ ...smIn, width: "100%", padding: "10px" }}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={handleSendContract} disabled={loading || !contractForm.sellerName || !contractForm.recipientEmail} style={{ ...btnG, flex: 2 }}>{loading ? "Generating..." : "Generate & Send for eSign"}</button>
              <button onClick={() => setContractModal({ open: false, deal: null })} style={{ ...btnO, flex: 1 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
