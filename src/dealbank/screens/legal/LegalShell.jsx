import useIsMobile from "../../core/useIsMobile";

export default function LegalShell({
  G,
  btnO,
  title,
  subtitle,
  effectiveDate,
  sections,
  onBack,
  secondaryActionLabel,
  onSecondaryAction,
}) {
  const isMobile = useIsMobile(920);

  return (
    <div style={{ minHeight: "100vh", background: G.bg, color: G.text, fontFamily: G.mono }}>
      <div style={{ background: G.surface, borderBottom: `1px solid ${G.border}`, padding: isMobile ? "12px" : "12px 22px", position: "sticky", top: 0, zIndex: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ position: "relative", width: 28, height: 28 }}>
              <div style={{ position: "absolute", inset: 0, background: "#22c55e", borderRadius: 4, transform: "rotate(45deg) scale(0.7)" }} />
              <div style={{ position: "absolute", inset: 4, background: "#050a05", borderRadius: 2, transform: "rotate(45deg) scale(0.7)" }} />
              <div style={{ position: "absolute", inset: 8, background: "#22c55e", borderRadius: 1, transform: "rotate(45deg) scale(0.7)" }} />
            </div>
            <div>
              <div style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: isMobile ? 18 : 20, fontWeight: 900, lineHeight: 1 }}>
                Deal<span style={{ color: "#22c55e" }}>Bank</span>
              </div>
              <div style={{ fontSize: 9, color: G.muted, letterSpacing: 2, marginTop: 2 }}>LEGAL</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, width: isMobile ? "100%" : "auto" }}>
            {secondaryActionLabel && typeof onSecondaryAction === "function" && (
              <button onClick={onSecondaryAction} style={{ ...btnO, fontSize: 9, padding: "6px 12px", flex: isMobile ? 1 : "none" }}>
                {secondaryActionLabel}
              </button>
            )}
            <button onClick={onBack} style={{ ...btnO, fontSize: 9, padding: "6px 12px", flex: isMobile ? 1 : "none" }}>
              Back to Landing
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 980, margin: "0 auto", padding: isMobile ? "16px 12px 24px" : "24px 18px 36px" }}>
        <div style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 10, padding: isMobile ? "16px 14px" : "22px 20px", marginBottom: 12 }}>
          <div style={{ fontSize: 9, color: G.green, letterSpacing: 3, marginBottom: 6 }}>COMPLIANCE DOCUMENT</div>
          <h1 style={{ margin: 0, fontFamily: G.serif, fontSize: isMobile ? 28 : 34, lineHeight: 1.15, color: G.text }}>{title}</h1>
          <p style={{ margin: "10px 0 8px", fontSize: 11, color: G.muted, lineHeight: 1.8 }}>{subtitle}</p>
          <div style={{ fontSize: 9, color: G.gold, letterSpacing: 1.2 }}>Effective Date: {effectiveDate}</div>
        </div>

        {sections.map((section, index) => (
          <div key={section.id || `${index}`} style={{ background: G.card, border: `1px solid ${G.border}`, borderRadius: 8, padding: isMobile ? "14px 12px" : "16px 14px", marginBottom: 10 }}>
            <h2 style={{ margin: "0 0 8px", fontFamily: G.serif, fontSize: isMobile ? 19 : 21, color: G.text }}>
              {index + 1}. {section.title}
            </h2>

            {(section.paragraphs || []).map((paragraph) => (
              <p key={paragraph.slice(0, 24)} style={{ margin: "0 0 9px", fontSize: 10, color: G.muted, lineHeight: 1.8 }}>
                {paragraph}
              </p>
            ))}

            {(section.bullets || []).map((bullet) => (
              <div key={bullet.slice(0, 24)} style={{ marginBottom: 7, fontSize: 10, color: G.text, lineHeight: 1.7 }}>
                - {bullet}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
