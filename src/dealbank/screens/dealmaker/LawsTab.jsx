export default function LawsTab({ ctx }) {
  const { G, card, lbl, STATE_LAWS, selectedState, setSelectedState, lawSection, setLawSection } = ctx;

  return (
    <div>
      <div style={{ fontFamily: G.serif, fontSize: 18, color: G.text, marginBottom: 4 }}>State Laws & Required Docs</div>
      <div style={{ fontSize: 10, color: G.muted, marginBottom: 14 }}>Essential legal info for deal makers by state. Always consult a local real estate attorney.</div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
        {Object.keys(STATE_LAWS).map((state) => (
          <div key={state} onClick={() => setSelectedState(state)} style={{ padding: "5px 12px", borderRadius: 4, cursor: "pointer", fontSize: 9, letterSpacing: 1, fontFamily: G.mono, border: `1px solid ${selectedState === state ? G.green : G.border}`, background: selectedState === state ? G.greenGlow : G.surface, color: selectedState === state ? G.greenDim : G.text }}>
            {state}
          </div>
        ))}
      </div>

      {STATE_LAWS[selectedState] && (
        <div>
          <div style={{ fontFamily: G.serif, fontSize: 16, color: G.green, fontWeight: "bold", marginBottom: 12 }}>{selectedState} - Flip Laws & Requirements</div>

          <div style={{ display: "flex", gap: 5, marginBottom: 12, flexWrap: "wrap" }}>
            {[["transfer", "Transfer Tax"], ["disclosure", "Disclosure"], ["foreclosure", "Foreclosure"], ["contractor", "Contractors"], ["tax", "Tax"]].map(([key, title]) => (
              <div key={key} onClick={() => setLawSection(key)} style={{ padding: "5px 12px", borderRadius: 4, cursor: "pointer", fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", fontFamily: G.mono, border: `1px solid ${lawSection === key ? G.gold : G.border}`, background: lawSection === key ? "#fef3c7" : G.surface, color: lawSection === key ? "#92400e" : G.muted }}>
                {title}
              </div>
            ))}
          </div>

          <div style={{ ...card, borderColor: `${G.gold}44`, marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: G.text, lineHeight: 1.8 }}>{STATE_LAWS[selectedState][lawSection]}</div>
          </div>

          <div style={{ ...card, marginBottom: 12 }}>
            <div style={{ ...lbl, color: G.gold, marginBottom: 10 }}>Required Documents for {selectedState} Flips</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {STATE_LAWS[selectedState].keyDocs.map((doc, index) => (
                <div key={index} style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 4, padding: "8px 10px", display: "flex", gap: 6, alignItems: "center" }}>
                  <span style={{ color: G.green, fontSize: 10, fontWeight: "bold" }}>+</span>
                  <span style={{ fontSize: 10, color: G.text }}>{doc}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ ...card }}>
            <div style={{ ...lbl, color: G.blue, marginBottom: 10 }}>Official Resources</div>
            {STATE_LAWS[selectedState].resources.map((resource, index) => (
              <a key={index} href={resource.url} target="_blank" rel="noopener noreferrer" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: index < STATE_LAWS[selectedState].resources.length - 1 ? `1px solid ${G.faint}` : "none", textDecoration: "none" }}>
                <span style={{ fontSize: 11, color: G.text }}>{resource.title}</span>
                <span style={{ fontSize: 10, color: G.blue, letterSpacing: 1, fontWeight: 700 }}>OPEN →</span>
              </a>
            ))}
          </div>

          <div style={{ marginTop: 10, fontSize: 10, color: G.muted, lineHeight: 1.7, fontStyle: "italic" }}>
            Important: this information is for general guidance only. Laws change frequently. Always consult a licensed real estate attorney in {selectedState} before executing deals.
          </div>
        </div>
      )}
    </div>
  );
}
