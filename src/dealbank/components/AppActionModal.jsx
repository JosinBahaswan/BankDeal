export default function AppActionModal({
  G,
  open,
  title,
  message,
  tone = "info",
  confirmLabel = "OK",
  cancelLabel = "",
  onConfirm,
  onClose,
}) {
  if (!open) return null;

  const toneStyles = {
    info: {
      accent: G.blue,
      background: `${G.blue}12`,
      border: `${G.blue}44`,
    },
    success: {
      accent: G.green,
      background: G.greenGlow,
      border: `${G.green}44`,
    },
    warning: {
      accent: G.gold,
      background: `${G.gold}18`,
      border: `${G.gold}44`,
    },
    danger: {
      accent: G.red,
      background: `${G.red}12`,
      border: `${G.red}44`,
    },
  };

  const selectedTone = toneStyles[tone] || toneStyles.info;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 26, 15, 0.45)",
        zIndex: 420,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 14,
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 420,
          background: G.card,
          border: `1px solid ${G.border}`,
          borderRadius: G.radiusMd,
          boxShadow: G.shadowMd,
          padding: "16px 16px 14px",
        }}
      >
        <div
          style={{
            fontFamily: G.serif,
            fontSize: 16,
            color: G.text,
            fontWeight: "bold",
            marginBottom: 8,
          }}
        >
          {title || "Action"}
        </div>

        <div
          style={{
            borderRadius: G.radiusSm,
            border: `1px solid ${selectedTone.border}`,
            background: selectedTone.background,
            color: selectedTone.accent,
            fontSize: 10,
            padding: "8px 10px",
            lineHeight: 1.6,
            marginBottom: 12,
            whiteSpace: "pre-wrap",
          }}
        >
          {message || "Action complete."}
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          {cancelLabel ? (
            <button
              onClick={onClose}
              style={{
                border: `1px solid ${G.border}`,
                borderRadius: G.radiusSm,
                padding: "8px 12px",
                fontSize: 10,
                fontFamily: G.ui,
                fontWeight: 600,
                background: G.surface,
                color: G.text,
                cursor: "pointer",
              }}
            >
              {cancelLabel}
            </button>
          ) : null}

          <button
            onClick={onConfirm || onClose}
            style={{
              border: `1px solid ${selectedTone.accent}`,
              borderRadius: G.radiusSm,
              padding: "8px 12px",
              fontSize: 10,
              fontFamily: G.ui,
              fontWeight: 700,
              background: selectedTone.accent,
              color: "#ffffff",
              cursor: "pointer",
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
