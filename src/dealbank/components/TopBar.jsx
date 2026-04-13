import { useEffect, useState } from "react";

const MOBILE_BREAKPOINT = 820;

export default function TopBar({ title, tabs, active, onTab, userName, onSignOut, G, btnO }) {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= MOBILE_BREAKPOINT;
  });
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    function onResize() {
      setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);
    }

    window.addEventListener("resize", onResize);
    onResize();

    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!isMobile) setMenuOpen(false);
  }, [isMobile]);

  function handleTabChange(tabId) {
    onTab(tabId);
    if (isMobile) setMenuOpen(false);
  }

  return (
    <div style={{ background: G.surface, borderBottom: `1px solid ${G.border}`, padding: "0 24px", position: "sticky", top: 0, zIndex: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 24, height: 24, background: G.green, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: "bold", color: "#000" }}>
            G
          </div>
          <span style={{ fontFamily: G.serif, fontSize: 16, color: G.text, fontWeight: "bold" }}>DealBank</span>
          <span style={{ fontSize: 8, color: G.muted, letterSpacing: 3, marginLeft: 4 }}>- {title}</span>
        </div>
        {!isMobile && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontSize: 10, color: G.muted }}>{userName}</div>
            <button onClick={onSignOut} style={{ ...btnO, padding: "5px 12px", fontSize: 9 }}>
              Sign Out
            </button>
          </div>
        )}

        {isMobile && (
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            style={{
              ...btnO,
              padding: "5px 10px",
              fontSize: 9,
              letterSpacing: 2,
              color: menuOpen ? G.green : G.muted,
              borderColor: menuOpen ? G.green : G.border,
              background: menuOpen ? G.greenGlow : "transparent",
            }}
          >
            ☰ Menu
          </button>
        )}
      </div>

      {!isMobile && (
        <div style={{ display: "flex", gap: 0, marginTop: 10, paddingBottom: 2, flexWrap: "wrap" }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              type="button"
              style={{
                padding: "8px 14px",
                fontSize: 9,
                letterSpacing: 2,
                cursor: "pointer",
                textTransform: "uppercase",
                fontFamily: G.mono,
                color: active === tab.id ? G.green : G.muted,
                borderBottom: `2px solid ${active === tab.id ? G.green : "transparent"}`,
                borderTop: "none",
                borderLeft: "none",
                borderRight: "none",
                background: "transparent",
                whiteSpace: "nowrap",
                transition: "all .15s",
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      )}

      {isMobile && menuOpen && (
        <div style={{ marginTop: 10, borderTop: `1px solid ${G.border}`, padding: "10px 0 12px", display: "grid", gap: 6 }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id)}
              style={{
                ...btnO,
                textAlign: "left",
                width: "100%",
                fontSize: 9,
                padding: "8px 10px",
                borderColor: active === tab.id ? G.green : G.border,
                color: active === tab.id ? G.green : G.muted,
                background: active === tab.id ? G.greenGlow : "transparent",
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}

          <div style={{ height: 1, background: G.border, margin: "4px 0" }} />
          <div style={{ fontSize: 9, color: G.muted, padding: "2px 6px" }}>{userName}</div>
          <button onClick={onSignOut} style={{ ...btnO, width: "100%", padding: "8px 10px", fontSize: 9 }}>
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
