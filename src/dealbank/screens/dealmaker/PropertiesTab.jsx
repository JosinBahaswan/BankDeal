import { useEffect, useState } from "react";
import { fetchOffMarketProperties } from "../../core/mockApis";

const FILTER_OPTIONS = [
  "All",
  "Vacant",
  "Foreclosure",
  "Tax Delinquent",
  "Absentee Owner",
  "Pre-Foreclosure",
  "High Equity",
  "Probate",
];

/** Inline info modal for agent phone — avoids coupling to global AlertModal */
function AgentPhoneModal({ show, property, G, onClose }) {
  if (!show || !property) return null;

  const hasPhone = property.agentPhone || property.ownerPhone;
  const displayPhone = property.agentPhone || property.ownerPhone || "";
  const displayName = property.agentName || property.ownerName || "Agent";
  const displayEmail = property.agentEmail || property.ownerEmail || "";
  const phoneType = property.agentPhoneType || "Phone";

  const accentColor = hasPhone ? (G.green || "#22c55e") : (G.gold || "#f59e0b");
  const icon = hasPhone ? "📞" : "📵";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Agent Contact"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.85)",
        display: "grid",
        placeItems: "center",
        backdropFilter: "blur(8px)",
        animation: "agentModalIn 0.22s ease-out",
        padding: 16,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 440,
          background: G.card || "#1a1a2e",
          border: `1px solid ${accentColor}44`,
          borderRadius: 20,
          padding: 32,
          textAlign: "center",
          boxShadow: `0 20px 50px rgba(0,0,0,0.5), 0 0 20px ${accentColor}11`,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Top accent bar */}
        <div style={{
          position: "absolute",
          top: 0, left: 0, right: 0,
          height: 4,
          background: `linear-gradient(90deg, ${accentColor}, ${accentColor}44)`,
        }} />

        {/* Icon */}
        <div style={{ fontSize: 48, marginBottom: 16, lineHeight: 1 }}>{icon}</div>

        {/* Property address */}
        <div style={{
          fontSize: 11,
          color: G.muted || "#9ca3af",
          marginBottom: 6,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
        }}>
          {property.address}
        </div>

        {hasPhone ? (
          <>
            <div style={{
              fontFamily: G.serif || "Georgia, serif",
              fontSize: 22,
              color: G.text || "#fff",
              fontWeight: "800",
              marginBottom: 20,
            }}>
              Contact Agent
            </div>

            {/* Agent name */}
            {displayName && (
              <div style={{
                fontSize: 14,
                color: G.muted || "#9ca3af",
                marginBottom: 8,
              }}>
                👤 <strong style={{ color: G.text }}>{displayName}</strong>
              </div>
            )}

            {/* Phone — tap to call */}
            <a
              id="agent-phone-link"
              href={`tel:${displayPhone.replace(/\D/g, "")}`}
              style={{
                display: "block",
                background: `${accentColor}18`,
                border: `1px solid ${accentColor}55`,
                borderRadius: 12,
                padding: "16px 20px",
                marginBottom: 12,
                textDecoration: "none",
                color: accentColor,
                fontSize: 22,
                fontWeight: "bold",
                letterSpacing: "0.04em",
                transition: "all 0.2s",
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = `${accentColor}30`)}
              onMouseOut={(e) => (e.currentTarget.style.background = `${accentColor}18`)}
            >
              {displayPhone}
              <span style={{ display: "block", fontSize: 10, color: G.muted, fontWeight: "normal", marginTop: 2 }}>
                {phoneType} · Tap to call
              </span>
            </a>

            {/* Email if available */}
            {displayEmail && (
              <a
                href={`mailto:${displayEmail}`}
                style={{
                  display: "block",
                  color: G.muted || "#9ca3af",
                  fontSize: 12,
                  textDecoration: "none",
                  marginBottom: 20,
                }}
              >
                ✉️ {displayEmail}
              </a>
            )}
          </>
        ) : (
          <>
            <div style={{
              fontFamily: G.serif || "Georgia, serif",
              fontSize: 22,
              color: G.text || "#fff",
              fontWeight: "800",
              marginBottom: 12,
            }}>
              Nomor Tidak Tersedia
            </div>
            <div style={{
              fontSize: 14,
              color: G.muted || "#9ca3af",
              lineHeight: 1.6,
              marginBottom: 24,
              padding: "0 8px",
            }}>
              Nomor handphone agen untuk properti ini tidak tersedia melalui Realty Base US.
              Silakan kunjungi listing langsung atau hubungi agen melalui platform realtor.
            </div>
          </>
        )}

        <button
          id="agent-modal-close-btn"
          onClick={onClose}
          style={{
            background: accentColor,
            color: "#fff",
            border: "none",
            borderRadius: 12,
            padding: "14px 28px",
            fontSize: 14,
            fontWeight: "bold",
            cursor: "pointer",
            width: "100%",
            transition: "all 0.2s ease",
            boxShadow: `0 4px 12px ${accentColor}44`,
          }}
          onMouseOver={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
          onMouseOut={(e) => (e.currentTarget.style.transform = "translateY(0)")}
        >
          Tutup
        </button>
      </div>

      <style>{`
        @keyframes agentModalIn {
          from { opacity: 0; transform: scale(0.95); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

/** Provider badge shown in the header */
function ProviderBadge({ provider, G }) {
  if (!provider || provider === "none") return null;

  const labels = {
    batchdata:  { label: "BatchData", color: G.green || "#22c55e" },
    batchleads: { label: "BatchLeads", color: G.green || "#22c55e" },
    "realty-us":  { label: "Realty Base US (fallback)", color: G.gold || "#f59e0b" },
  };

  const { label, color } = labels[provider] || { label: provider, color: G.muted };

  return (
    <span style={{
      fontSize: 10,
      color,
      background: `${color}18`,
      border: `1px solid ${color}44`,
      borderRadius: 4,
      padding: "2px 8px",
      marginLeft: 8,
      letterSpacing: "0.04em",
      textTransform: "uppercase",
    }}>
      {label}
    </span>
  );
}

/** Single property card */
function PropertyCard({ p, G, card, fmt, isMobile, btnG, btnO, onAnalyze, onContact }) {
  const hasPhone = !!(p.agentPhone || p.ownerPhone);
  const isRealtyUs = p.provider === "realty-us";

  return (
    <div
      style={{
        ...card,
        padding: 0,
        border: `1px solid ${G.border}`,
        borderRadius: 12,
        overflow: "hidden",
        transition: "transform 0.2s, box-shadow 0.2s",
        display: "flex",
        flexDirection: "column",
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = `0 8px 24px rgba(0,0,0,0.25)`;
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "";
      }}
    >
      {/* Photo / placeholder */}
      {p.photoUrl ? (
        <img
          src={p.photoUrl}
          alt={p.address}
          style={{ width: "100%", height: 160, objectFit: "cover" }}
          onError={(e) => { e.currentTarget.style.display = "none"; }}
        />
      ) : (
        <div style={{
          height: 120,
          background: `linear-gradient(135deg, ${G.surface} 0%, ${G.border}66 100%)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 40,
        }}>
          🏠
        </div>
      )}

      <div style={{ padding: 16, flex: 1, display: "flex", flexDirection: "column", gap: 0 }}>
        {/* Address + list type badge */}
        <div style={{ fontFamily: G.serif, fontSize: 15, color: G.text, fontWeight: "bold", marginBottom: 4 }}>
          {p.address}
        </div>
        <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
          <span style={{
            fontSize: 10,
            color: G.green,
            background: G.greenGlow || `${G.green}18`,
            padding: "2px 8px",
            borderRadius: 4,
          }}>
            {p.listType}
          </span>
          <span style={{
            fontSize: 10,
            color: G.muted,
            background: `${G.border}55`,
            padding: "2px 8px",
            borderRadius: 4,
          }}>
            {p.propertyType}
          </span>
        </div>

        {/* Key metrics grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 12 }}>
          {isRealtyUs && p.listPrice > 0 && (
            <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${G.faint || G.border}`, paddingBottom: 6 }}>
              <span style={{ color: G.muted, fontSize: 12 }}>List Price</span>
              <span style={{ color: G.green, fontSize: 15, fontWeight: "bold", fontFamily: G.serif }}>
                {fmt(p.listPrice)}
              </span>
            </div>
          )}

          {!isRealtyUs && (
            <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${G.faint || G.border}`, paddingBottom: 6 }}>
              <span style={{ color: G.muted, fontSize: 12 }}>Est. Equity</span>
              <span style={{ color: G.green, fontSize: 15, fontWeight: "bold", fontFamily: G.serif }}>
                {fmt(p.estimatedEquity)}
              </span>
            </div>
          )}

          {isRealtyUs && (p.beds > 0 || p.baths > 0) && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${G.faint || G.border}`, paddingBottom: 6 }}>
                <span style={{ color: G.muted, fontSize: 12 }}>Beds</span>
                <span style={{ color: G.text, fontSize: 13 }}>{p.beds || "—"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${G.faint || G.border}`, paddingBottom: 6 }}>
                <span style={{ color: G.muted, fontSize: 12 }}>Baths</span>
                <span style={{ color: G.text, fontSize: 13 }}>{p.baths || "—"}</span>
              </div>
            </>
          )}

          {isRealtyUs && p.sqft > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${G.faint || G.border}`, paddingBottom: 6 }}>
              <span style={{ color: G.muted, fontSize: 12 }}>Sqft</span>
              <span style={{ color: G.text, fontSize: 13 }}>{p.sqft.toLocaleString()}</span>
            </div>
          )}

          {/* Owner / Agent name */}
          {(p.ownerName || p.agentName) && (
            <div style={{
              gridColumn: "1 / -1",
              display: "flex",
              justifyContent: "space-between",
              borderBottom: `1px solid ${G.faint || G.border}`,
              paddingBottom: 6,
            }}>
              <span style={{ color: G.muted, fontSize: 12 }}>{isRealtyUs ? "Agent" : "Owner"}</span>
              <span style={{ color: G.text, fontSize: 13, fontWeight: "600" }}>
                {p.agentName || p.ownerName}
              </span>
            </div>
          )}

          {/* Phone status row */}
          <div style={{
            gridColumn: "1 / -1",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: 2,
          }}>
            <span style={{ color: G.muted, fontSize: 12 }}>
              {isRealtyUs ? "Agent Phone" : "Phone"}
            </span>
            {hasPhone ? (
              <span style={{ color: G.green, fontSize: 13, fontWeight: "600" }}>
                {p.agentPhone || p.ownerPhone}
              </span>
            ) : (
              <span style={{
                fontSize: 11,
                color: G.gold || "#f59e0b",
                background: `${G.gold || "#f59e0b"}18`,
                border: `1px solid ${G.gold || "#f59e0b"}44`,
                borderRadius: 4,
                padding: "2px 8px",
              }}>
                Tidak Tersedia
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 8, marginTop: "auto", paddingTop: 8 }}>
          <button
            id={`btn-analyze-${p.id}`}
            onClick={() => onAnalyze(p)}
            style={{
              ...btnG,
              flex: 1,
              padding: "10px",
              fontSize: 12,
              fontWeight: "bold",
              borderRadius: 8,
            }}
          >
            Analyze
          </button>
          <button
            id={`btn-contact-${p.id}`}
            onClick={() => onContact(p)}
            style={{
              ...(hasPhone ? btnO : {}),
              flex: 1,
              padding: "10px",
              fontSize: 12,
              fontWeight: "bold",
              borderRadius: 8,
              border: hasPhone
                ? undefined
                : `1px solid ${G.gold || "#f59e0b"}55`,
              background: hasPhone
                ? undefined
                : `${G.gold || "#f59e0b"}14`,
              color: hasPhone
                ? undefined
                : G.gold || "#f59e0b",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            {hasPhone ? "📞 Contact" : "📵 Info"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function PropertiesTab({ ctx }) {
  const { G, card, lbl, btnG, btnO, fmt, isMobile, setAddress, setFlipTab, showAlert } = ctx;

  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [properties, setProperties] = useState([]);
  const [provider, setProvider] = useState("");
  const [serverMessage, setServerMessage] = useState("");

  // Agent phone modal
  const [agentModal, setAgentModal] = useState({ show: false, property: null });

  useEffect(() => {
    loadProperties();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function loadProperties() {
    setLoading(true);
    setServerMessage("");
    try {
      const result = await fetchOffMarketProperties({ listType: filter, search: search.trim() });
      setProperties(result.properties || []);
      setProvider(result.provider || "");
      if (result.message) setServerMessage(result.message);
    } catch (err) {
      console.error("fetch offmarket error", err);
      setProperties([]);
      setProvider("");
      if (showAlert) showAlert(err.message || "Gagal memuat data properti.", "Gagal Memuat Data", "error");
    } finally {
      setLoading(false);
    }
  }

  function handleAnalyze(p) {
    setAddress(p.address);
    setFlipTab("analyze");
  }

  function handleContact(p) {
    setAgentModal({ show: true, property: p });
  }

  const visible = properties.filter((p) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      (p.address || "").toLowerCase().includes(q) ||
      (p.ownerName || "").toLowerCase().includes(q) ||
      (p.agentName || "").toLowerCase().includes(q)
    );
  });

  return (
    <div>
      {/* ── Header ── */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 4 }}>
          <div style={{ fontFamily: G.serif, fontSize: 20, color: G.text }}>
            Step 1: Browse Properties
          </div>
          {!loading && provider && <ProviderBadge provider={provider} G={G} />}
        </div>
        <div style={{ fontSize: 12, color: G.muted, marginBottom: 12 }}>
          {provider === "realty-us"
            ? "Fallback: data dari Realty Base US · nomor agen ditampilkan jika tersedia"
            : "Powered by BatchData API integration"}
        </div>

        {/* Server message (e.g. no listings found) */}
        {serverMessage && (
          <div style={{
            fontSize: 12,
            color: G.gold || "#f59e0b",
            background: `${G.gold || "#f59e0b"}12`,
            border: `1px solid ${G.gold || "#f59e0b"}33`,
            borderRadius: 8,
            padding: "8px 12px",
            marginBottom: 12,
          }}>
            ⚠️ {serverMessage}
          </div>
        )}

        {/* Search + Refresh */}
        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexDirection: isMobile ? "column" : "row" }}>
          <input
            id="properties-search-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && loadProperties()}
            placeholder="Search address, owner, or city..."
            style={{
              flex: 1,
              padding: "12px",
              borderRadius: 8,
              border: `1px solid ${G.border}`,
              background: G.surface,
              color: G.text,
              fontSize: 14,
              outline: "none",
            }}
          />
          <button
            id="properties-refresh-btn"
            onClick={loadProperties}
            disabled={loading}
            style={{
              ...btnG,
              padding: "12px 20px",
              opacity: loading ? 0.7 : 1,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Loading…" : "🔄 Refresh"}
          </button>
        </div>

        {/* Filter chips */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
          {FILTER_OPTIONS.map((f) => (
            <button
              key={f}
              id={`filter-chip-${f.toLowerCase().replace(/\s+/g, "-")}`}
              onClick={() => setFilter(f)}
              style={{
                padding: "8px 14px",
                borderRadius: 20,
                border: `1px solid ${filter === f ? G.green : G.border}`,
                background: filter === f ? (G.greenGlow || `${G.green}18`) : G.surface,
                color: filter === f ? G.green : G.muted,
                fontSize: 12,
                cursor: "pointer",
                transition: "all 0.2s",
                fontWeight: filter === f ? "600" : "normal",
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* ── Loading skeleton ── */}
      {loading && (
        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(300px, 1fr))",
          gap: 16,
        }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{
              ...card,
              height: 280,
              borderRadius: 12,
              background: `linear-gradient(90deg, ${G.surface} 25%, ${G.border}44 50%, ${G.surface} 75%)`,
              backgroundSize: "200% 100%",
              animation: "shimmer 1.5s infinite",
            }} />
          ))}
          <style>{`
            @keyframes shimmer {
              0%   { background-position: 200% 0; }
              100% { background-position: -200% 0; }
            }
          `}</style>
        </div>
      )}

      {/* ── Property grid ── */}
      {!loading && (
        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit, minmax(300px, 1fr))",
          gap: 16,
        }}>
          {visible.map((p) => (
            <PropertyCard
              key={p.id}
              p={p}
              G={G}
              card={card}
              fmt={fmt}
              isMobile={isMobile}
              btnG={btnG}
              btnO={btnO}
              onAnalyze={handleAnalyze}
              onContact={handleContact}
            />
          ))}
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && visible.length === 0 && (
        <div style={{
          ...card,
          padding: 48,
          textAlign: "center",
          color: G.muted,
          borderRadius: 12,
        }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🏘️</div>
          <div style={{ fontSize: 16, marginBottom: 8, color: G.text }}>
            Tidak ada properti ditemukan
          </div>
          <div style={{ fontSize: 13 }}>
            Coba filter berbeda atau masukkan lokasi di kolom pencarian.
          </div>
        </div>
      )}

      {/* ── Agent Phone Modal ── */}
      <AgentPhoneModal
        show={agentModal.show}
        property={agentModal.property}
        G={G}
        onClose={() => setAgentModal({ show: false, property: null })}
      />
    </div>
  );
}
