export default function ResourcesTab({ ctx }) {
  const { G, card, DEALMAKER_CONTENT } = ctx;

  return (
    <div>
      <div style={{ fontFamily: G.serif, fontSize: 18, color: G.text, marginBottom: 4 }}>Deal Maker Resource Hub</div>
      <div style={{ fontSize: 10, color: G.muted, marginBottom: 16, lineHeight: 1.6 }}>Top-ranked content, tools, and education curated for fix-and-flip investors.</div>
      {DEALMAKER_CONTENT.map((section) => (
        <div key={section.cat} style={{ marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 16 }}>{section.icon}</span>
            <div style={{ fontFamily: G.serif, fontSize: 15, color: section.color, fontWeight: "bold" }}>{section.cat}</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {section.items.map((item) => (
              <a key={item.title} href={item.url} target="_blank" rel="noopener noreferrer" style={{ ...card, textDecoration: "none", display: "block", borderColor: G.border, cursor: "pointer", transition: "all .15s" }}>
                <div style={{ fontFamily: G.serif, fontSize: 12, color: G.text, fontWeight: "bold", marginBottom: 3 }}>{item.title}</div>
                <div style={{ fontSize: 9, color: G.muted, lineHeight: 1.5, marginBottom: 6 }}>{item.sub}</div>
                <div style={{ fontSize: 8, color: section.color, letterSpacing: 1 }}>OPEN →</div>
              </a>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
