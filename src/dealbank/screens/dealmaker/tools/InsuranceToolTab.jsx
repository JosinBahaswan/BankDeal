import { useMemo, useState } from "react";
import { ACTIVE_POLICIES, INSURANCE_PRODUCTS } from "./toolData";

function policyBadge(status, G) {
  const color = status === "Active" ? G.green : status === "Review" ? G.gold : G.muted;
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

export default function InsuranceToolTab({ ctx }) {
  const { G, card, btnG, btnO } = ctx;

  const [selectedProduct, setSelectedProduct] = useState(INSURANCE_PRODUCTS[0]?.id || "");
  const [policyFilter, setPolicyFilter] = useState("All");
  const [quoteForm, setQuoteForm] = useState({ address: "", purchasePrice: "", rehabBudget: "", closeDate: "" });
  const [quoteToast, setQuoteToast] = useState("");

  const visiblePolicies = useMemo(() => {
    if (policyFilter === "All") return ACTIVE_POLICIES;
    return ACTIVE_POLICIES.filter((item) => item.status === policyFilter);
  }, [policyFilter]);

  const submitQuote = () => {
    if (!quoteForm.address || !quoteForm.purchasePrice) return;
    setQuoteToast("Quote request sent. Partner response within 1 business day.");
    setQuoteForm({ address: "", purchasePrice: "", rehabBudget: "", closeDate: "" });
    setTimeout(() => setQuoteToast(""), 2200);
  };

  return (
    <div>
      <div style={{ fontFamily: G.serif, fontSize: 18, marginBottom: 4 }}>Insurance</div>
      <div style={{ fontSize: 10, color: G.muted, marginBottom: 12 }}>Protect every acquisition with the right coverage before funding and rehab starts.</div>

      <div style={{ background: "#1a0800", border: "1px solid #f9731644", borderRadius: 8, padding: "10px 12px", marginBottom: 12, fontSize: 10, color: "#fdba74", lineHeight: 1.6 }}>
        ⚠ Most traditional homeowner policies exclude vacant properties and active rehab work. Lock your investor policy before close.
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 8, marginBottom: 12 }}>
        {INSURANCE_PRODUCTS.map((product) => (
          <div key={product.id} style={{ ...card, borderColor: selectedProduct === product.id ? `${G.green}66` : G.border }}>
            <div style={{ fontSize: 8, color: G.muted, letterSpacing: 2, marginBottom: 4 }}>{product.bestFor}</div>
            <div style={{ fontFamily: G.serif, fontSize: 15, marginBottom: 4 }}>{product.name}</div>
            <div style={{ fontFamily: G.serif, fontSize: 18, color: G.green, marginBottom: 6 }}>{product.price}</div>
            <div style={{ fontSize: 10, color: G.muted, lineHeight: 1.6, minHeight: 56 }}>{product.description}</div>
            <button
              onClick={() => setSelectedProduct(product.id)}
              style={{
                ...(selectedProduct === product.id ? btnG : btnO),
                marginTop: 8,
                width: "100%",
                fontSize: 9,
                padding: "7px 9px",
              }}
            >
              {selectedProduct === product.id ? "Selected" : "Select Product"}
            </button>
          </div>
        ))}
      </div>

      <div style={{ ...card, marginBottom: 12 }}>
        <div style={{ fontFamily: G.serif, fontSize: 15, marginBottom: 8 }}>Quick Quote Intake</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 8, marginBottom: 8 }}>
          <input value={quoteForm.address} onChange={(e) => setQuoteForm((prev) => ({ ...prev, address: e.target.value }))} placeholder="Property address" style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 6, color: G.text, padding: "8px 10px", fontFamily: G.mono }} />
          <input value={quoteForm.purchasePrice} onChange={(e) => setQuoteForm((prev) => ({ ...prev, purchasePrice: e.target.value.replace(/[^0-9]/g, "") }))} placeholder="Purchase price" style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 6, color: G.text, padding: "8px 10px", fontFamily: G.mono }} />
          <input value={quoteForm.rehabBudget} onChange={(e) => setQuoteForm((prev) => ({ ...prev, rehabBudget: e.target.value.replace(/[^0-9]/g, "") }))} placeholder="Rehab budget" style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 6, color: G.text, padding: "8px 10px", fontFamily: G.mono }} />
          <input value={quoteForm.closeDate} onChange={(e) => setQuoteForm((prev) => ({ ...prev, closeDate: e.target.value }))} placeholder="Target close date" style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 6, color: G.text, padding: "8px 10px", fontFamily: G.mono }} />
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <button onClick={submitQuote} style={{ ...btnG, fontSize: 9, padding: "8px 11px" }}>Submit Quote Request</button>
          <div style={{ fontSize: 9, color: G.muted }}>Selected product: <span style={{ color: G.green }}>{INSURANCE_PRODUCTS.find((item) => item.id === selectedProduct)?.name || "-"}</span></div>
        </div>
      </div>

      <div style={{ ...card }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, gap: 8, flexWrap: "wrap" }}>
          <div style={{ fontFamily: G.serif, fontSize: 15 }}>Active Policies</div>
          <div style={{ display: "flex", gap: 6 }}>
            {["All", "Active", "Review"].map((f) => (
              <button key={f} onClick={() => setPolicyFilter(f)} style={{ ...btnO, fontSize: 8, padding: "4px 8px", borderColor: policyFilter === f ? G.green : G.border, color: policyFilter === f ? G.green : G.muted }}>
                {f}
              </button>
            ))}
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", minWidth: 540, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: `1px solid ${G.border}` }}>
                <th style={{ fontSize: 9, color: G.muted, fontWeight: "normal", padding: "8px 6px" }}>Address</th>
                <th style={{ fontSize: 9, color: G.muted, fontWeight: "normal", padding: "8px 6px" }}>Type</th>
                <th style={{ fontSize: 9, color: G.muted, fontWeight: "normal", padding: "8px 6px" }}>Premium</th>
                <th style={{ fontSize: 9, color: G.muted, fontWeight: "normal", padding: "8px 6px" }}>Expiration</th>
                <th style={{ fontSize: 9, color: G.muted, fontWeight: "normal", padding: "8px 6px" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {visiblePolicies.map((row) => (
                <tr key={row.id} style={{ borderBottom: `1px solid ${G.faint}` }}>
                  <td style={{ fontSize: 10, color: G.text, padding: "8px 6px" }}>{row.address}</td>
                  <td style={{ fontSize: 10, color: G.muted, padding: "8px 6px" }}>{row.type}</td>
                  <td style={{ fontSize: 10, color: G.gold, padding: "8px 6px" }}>{row.premium}</td>
                  <td style={{ fontSize: 10, color: G.muted, padding: "8px 6px" }}>{row.expiration}</td>
                  <td style={{ padding: "8px 6px" }}><span style={policyBadge(row.status, G)}>{row.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {quoteToast && <div style={{ position: "fixed", right: 14, bottom: 14, background: G.surface, border: `1px solid ${G.green}44`, borderRadius: 8, padding: "8px 12px", color: G.green, fontSize: 10 }}>{quoteToast}</div>}
    </div>
  );
}
