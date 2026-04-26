import React from "react";

/**
 * AlertModal
 *
 * types:
 *  "error"   — red, ❌
 *  "warning" — amber/gold, ⚠️
 *  "info"    — blue, ℹ️
 *  "success" — green, ✅
 */
export default function AlertModal({ show, title, message, type = "error", onClose, G, children, closeLabel }) {
  if (!show) return null;

  const CONFIG = {
    error:   { icon: "❌", color: G.red   || "#ef4444" },
    warning: { icon: "⚠️", color: G.gold  || "#f59e0b" },
    info:    { icon: "ℹ️", color: G.blue  || "#3b82f6" },
    success: { icon: "✅", color: G.green || "#22c55e" },
  };

  const { icon, color } = CONFIG[type] || CONFIG.error;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title || "Alert"}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.85)",
        display: "grid",
        placeItems: "center",
        backdropFilter: "blur(8px)",
        animation: "alertFadeIn 0.2s ease-out",
        padding: "16px",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 460,
          background: G.card || "#1a1a2e",
          border: `1px solid ${color}44`,
          borderRadius: 20,
          padding: 32,
          textAlign: "center",
          boxShadow: `0 20px 50px rgba(0,0,0,0.5), 0 0 20px ${color}11`,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Top accent bar */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            background: `linear-gradient(90deg, ${color}, ${color}44)`,
          }}
        />

        {/* Icon */}
        <div
          style={{
            fontSize: 48,
            marginBottom: 20,
            filter: `drop-shadow(0 0 10px ${color}44)`,
            lineHeight: 1,
          }}
        >
          {icon}
        </div>

        {/* Title */}
        <div
          style={{
            fontFamily: G.serif || "Georgia, serif",
            fontSize: 22,
            color: G.text || "#fff",
            marginBottom: 12,
            fontWeight: "800",
          }}
        >
          {title || (type === "warning" ? "Warning" : type === "info" ? "Info" : type === "success" ? "Success" : "An Error Occurred")}
        </div>

        {/* Message */}
        <div
          style={{
            fontSize: 15,
            color: G.muted || "#9ca3af",
            lineHeight: 1.6,
            marginBottom: children ? 16 : 28,
            padding: "0 10px",
          }}
        >
          {message}
        </div>

        {/* Optional extra content (e.g. a phone number display) */}
        {children && (
          <div style={{ marginBottom: 24 }}>
            {children}
          </div>
        )}

        {/* Close button */}
        <button
          id="alert-modal-close-btn"
          onClick={onClose}
          style={{
            background: color,
            color: "#fff",
            border: "none",
            borderRadius: 12,
            padding: "14px 28px",
            fontSize: 14,
            fontWeight: "bold",
            cursor: "pointer",
            width: "100%",
            transition: "all 0.2s ease",
            boxShadow: `0 4px 12px ${color}44`,
          }}
          onMouseOver={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
          onMouseOut={(e) => (e.currentTarget.style.transform = "translateY(0)")}
        >
          {closeLabel || "OK"}
        </button>
      </div>

      <style>{`
        @keyframes alertFadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
