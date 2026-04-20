import { pageContainerStyle, pageShellStyle } from "../../core/layout";
import useViewport from "../../core/useViewport";

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
  const { isMobile, mode } = useViewport();

  return (
    <div style={pageShellStyle(G)}>
      <div style={{ background: G.surface, borderBottom: `1px solid ${G.border}`, padding: isMobile ? "12px" : "12px 22px", position: "sticky", top: 0, zIndex: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                background: G.green,
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                fontSize: 16,
              }}
            >
              D
            </div>
            <div>
              <div style={{ fontSize: isMobile ? 20 : 21, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1 }}>
                DealBank
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

      <div style={pageContainerStyle(mode, 1200)}>
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
