import React from "react";

export default function AlertModal({ show, title, message, type = "error", onClose, G }) {
  if (!show) return null;

  const isWarning = type === "warning";
  const icon = isWarning ? "⚠️" : "❌";
  const accentColor = isWarning ? G.gold : G.red;

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      zIndex: 9999,
      background: "rgba(0,0,0,0.85)",
      display: "grid",
      placeItems: "center",
      backdropFilter: "blur(8px)",
      animation: "fadeIn 0.2s ease-out"
    }}>
      <div style={{
        width: "90%",
        maxWidth: 450,
        background: G.card,
        border: `1px solid ${accentColor}44`,
        borderRadius: 20,
        padding: 32,
        textAlign: "center",
        boxShadow: `0 20px 50px rgba(0,0,0,0.5), 0 0 20px ${accentColor}11`,
        position: "relative",
        overflow: "hidden"
      }}>
        {/* Progress bar decoration */}
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          background: `linear-gradient(90deg, ${accentColor}, ${accentColor}44)`
        }} />

        <div style={{ 
          fontSize: 48, 
          marginBottom: 20,
          filter: `drop-shadow(0 0 10px ${accentColor}44)`
        }}>
          {icon}
        </div>

        <div style={{ 
          fontFamily: G.serif, 
          fontSize: 24, 
          color: G.text, 
          marginBottom: 12,
          fontWeight: "800"
        }}>
          {title || (isWarning ? "Perhatian" : "Terjadi Kesalahan")}
        </div>

        <div style={{ 
          fontSize: 15, 
          color: G.muted, 
          lineHeight: 1.6, 
          marginBottom: 28,
          padding: "0 10px"
        }}>
          {message}
        </div>

        <button 
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
            boxShadow: `0 4px 12px ${accentColor}44`
          }}
          onMouseOver={(e) => e.target.style.transform = "translateY(-2px)"}
          onMouseOut={(e) => e.target.style.transform = "translateY(0)"}
        >
          Mengerti
        </button>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
