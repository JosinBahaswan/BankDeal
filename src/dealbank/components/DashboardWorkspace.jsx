function tonePalette(tone, G) {
  if (tone === "green") {
    return {
      border: `${G.green}44`,
      background: G.greenGlow,
      text: G.green,
    };
  }

  if (tone === "blue") {
    return {
      border: `${G.blue}44`,
      background: `${G.blue}14`,
      text: G.blue,
    };
  }

  if (tone === "gold") {
    return {
      border: `${G.gold}44`,
      background: `${G.gold}18`,
      text: G.gold,
    };
  }

  return {
    border: G.border,
    background: G.surface,
    text: G.text,
  };
}

export default function DashboardWorkspace({
  G,
  mode,
  headline = "",
  subhead = "",
  metrics = [],
  railSections = [],
  children,
}) {
  const isMobile = mode === "mobile";
  const isTablet = mode === "tablet";
  const showRail = !isMobile && railSections.length > 0;
  const showMobileRail = isMobile && railSections.length > 0;
  const metricGridColumns = isMobile
    ? (metrics.length <= 1 ? "1fr" : "repeat(2,minmax(0,1fr))")
    : "repeat(auto-fit,minmax(140px,1fr))";

  return (
    <div>
      {headline && (
        <div
          style={{
            background: `linear-gradient(140deg, ${G.greenGlow} 0%, ${G.faint} 65%, #ffffff 100%)`,
            border: `1px solid ${G.border}`,
            borderRadius: G.radiusLg,
            padding: isMobile ? "14px" : "16px 18px",
            marginBottom: 12,
          }}
        >
          <div style={{ fontFamily: G.serif, fontSize: isMobile ? 26 : 30, color: G.text, fontWeight: "bold", marginBottom: 3, letterSpacing: "-0.03em" }}>
            {headline}
          </div>
          {subhead && (
            <div style={{ fontSize: 12, color: G.muted, marginBottom: metrics.length > 0 ? 10 : 0, lineHeight: 1.55 }}>
              {subhead}
            </div>
          )}

          {metrics.length > 0 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: metricGridColumns,
                gap: 8,
              }}
            >
              {metrics.map((metric) => (
                <div
                  key={metric.label}
                  style={{
                    border: `1px solid ${G.border}`,
                    borderRadius: 10,
                    background: G.surface,
                    padding: isMobile ? "9px 10px" : "10px 12px",
                  }}
                >
                  <div style={{ fontSize: 10, color: G.muted, marginBottom: 2 }}>{metric.label}</div>
                  <div style={{ fontFamily: G.serif, fontSize: isMobile ? 20 : 24, color: metric.color || G.green, fontWeight: "bold", lineHeight: 1.06 }}>
                    {metric.value}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: showRail
            ? (isTablet ? "minmax(0,1fr) minmax(240px,0.32fr)" : "minmax(0,1fr) minmax(260px,0.3fr)")
            : "1fr",
          gap: 12,
          alignItems: "start",
        }}
      >
        <div>{children}</div>

        {showRail && (
          <aside
            style={{
              display: "grid",
              gap: 10,
              position: isTablet ? "static" : "sticky",
              top: 88,
            }}
          >
            {railSections.map((section) => {
              const palette = tonePalette(section.tone, G);

              return (
                <div
                  key={section.title}
                  style={{
                    border: `1px solid ${palette.border}`,
                    borderRadius: 10,
                    background: section.tone ? palette.background : G.card,
                    padding: "11px 12px",
                  }}
                >
                  <div style={{ fontSize: 10, color: section.tone ? palette.text : G.muted, letterSpacing: 1, marginBottom: 6, fontWeight: 600 }}>
                    {section.title}
                  </div>

                  {(section.items || []).map((item) => (
                    <div key={item} style={{ fontSize: 11, color: G.text, lineHeight: 1.6, marginBottom: 4 }}>
                      {item}
                    </div>
                  ))}

                  {section.note && (
                    <div style={{ marginTop: 6, fontSize: 10, color: G.muted, lineHeight: 1.6 }}>
                      {section.note}
                    </div>
                  )}
                </div>
              );
            })}
          </aside>
        )}
      </div>

      {showMobileRail && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 10, color: G.muted, letterSpacing: 1, marginBottom: 6, fontWeight: 700 }}>
            QUICK BRIEF
          </div>

          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2 }}>
            {railSections.map((section) => {
              const palette = tonePalette(section.tone, G);

              return (
                <div
                  key={section.title}
                  style={{
                    minWidth: "min(82vw,260px)",
                    flexShrink: 0,
                    border: `1px solid ${palette.border}`,
                    borderRadius: 10,
                    background: section.tone ? palette.background : G.card,
                    padding: "10px 11px",
                  }}
                >
                  <div style={{ fontSize: 10, color: section.tone ? palette.text : G.muted, letterSpacing: 1, marginBottom: 6, fontWeight: 600 }}>
                    {section.title}
                  </div>

                  {(section.items || []).map((item) => (
                    <div key={item} style={{ fontSize: 11, color: G.text, lineHeight: 1.55, marginBottom: 3 }}>
                      {item}
                    </div>
                  ))}

                  {section.note && (
                    <div style={{ marginTop: 6, fontSize: 10, color: G.muted, lineHeight: 1.55 }}>
                      {section.note}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
