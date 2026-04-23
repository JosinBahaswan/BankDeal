import { useEffect, useState } from "react";
import { fetchOffMarketProperties } from "../../core/mockApis";

const FILTER_OPTIONS = ["All", "Vacant", "Foreclosure", "Tax Delinquent", "Absentee Owner", "Pre-Foreclosure", "High Equity", "Probate"];

export default function PropertiesTab({ ctx }) {
  const { G, card, lbl, btnG, btnO, fmt, isMobile, setAddress, setFlipTab } = ctx;
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(false);
  const [properties, setProperties] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadProperties();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function loadProperties() {
    setLoading(true);
    try {
      const data = await fetchOffMarketProperties({ listType: filter });
      setProperties(data || []);
    } catch (err) {
      console.error("fetch offmarket error", err);
      setProperties([]);
      // Propagate error to UI if ctx.toast exists, or just log
      if (ctx.toast) ctx.toast({ text: err.message, tone: "error" });
    }
    setLoading(false);
  }

  const visible = properties.filter((p) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      (p.address || "").toLowerCase().includes(q) ||
      (p.ownerName || "").toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontFamily: G.serif, fontSize: 20, color: G.text, marginBottom: 4 }}>Step 1: Browse Off-Market Properties</div>
        <div style={{ fontSize: 12, color: G.muted, marginBottom: 12 }}>Powered by BatchData API integration</div>

        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexDirection: isMobile ? "column" : "row" }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search address or owner..."
            style={{ flex: 1, padding: "12px", borderRadius: 8, border: `1px solid ${G.border}`, background: G.surface, color: G.text, fontSize: 14 }}
          />
          <button onClick={loadProperties} style={{ ...btnG, padding: "12px 20px" }}>{loading ? "Loading..." : "Refresh Listings"}</button>
        </div>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
          {FILTER_OPTIONS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: "8px 14px",
                borderRadius: 20,
                border: `1px solid ${filter === f ? G.green : G.border}`,
                background: filter === f ? G.greenGlow : G.surface,
                color: filter === f ? G.green : G.muted,
                fontSize: 12,
                transition: "all 0.2s"
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
        {visible.map((p) => (
          <div key={p.id} style={{ ...card, padding: 16, border: `1px solid ${G.border}`, transition: "transform 0.2s" }}>
            <div style={{ fontFamily: G.serif, fontSize: 16, color: G.text, fontWeight: "bold", marginBottom: 4 }}>{p.address}</div>
            <div style={{ fontSize: 11, color: G.green, background: G.greenGlow, display: "inline-block", padding: "2px 8px", borderRadius: 4, marginBottom: 12 }}>
              {p.listType}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8, marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${G.faint}`, paddingBottom: 6 }}>
                <span style={{ color: G.muted, fontSize: 12 }}>Owner</span>
                <span style={{ color: G.text, fontSize: 13, fontWeight: "600" }}>{p.ownerName}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${G.faint}`, paddingBottom: 6 }}>
                <span style={{ color: G.muted, fontSize: 12 }}>Phone</span>
                <span style={{ color: G.text, fontSize: 13 }}>{p.ownerPhone}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${G.faint}`, paddingBottom: 6 }}>
                <span style={{ color: G.muted, fontSize: 12 }}>Email</span>
                <span style={{ color: G.text, fontSize: 13 }}>{p.ownerEmail}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${G.faint}`, paddingBottom: 6 }}>
                <span style={{ color: G.muted, fontSize: 12 }}>Type</span>
                <span style={{ color: G.text, fontSize: 13 }}>{p.propertyType}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 4 }}>
                <span style={{ color: G.muted, fontSize: 12 }}>Est. Equity</span>
                <span style={{ color: G.green, fontSize: 15, fontWeight: "bold", fontFamily: G.serif }}>{fmt(p.estimatedEquity)}</span>
              </div>
            </div>

            <button
              onClick={() => {
                setAddress(p.address);
                setFlipTab("analyze");
              }}
              style={{ ...btnG, width: "100%", padding: "12px", fontSize: 13, fontWeight: "bold" }}
            >
              Analyze Property
            </button>
          </div>
        ))}
      </div>

      {visible.length === 0 && !loading && (
        <div style={{ ...card, padding: 40, textAlign: "center", color: G.muted }}>
          No off-market properties found for this filter.
        </div>
      )}
    </div>
  );
}
