import { useEffect, useState } from "react";
import useIsMobile from "../core/useIsMobile";

const MOBILE_BREAKPOINT = 820;

export default function TopBar({ title, tabs, active, onTab, userName, onSignOut, G, btnO }) {
  const isMobile = useIsMobile(MOBILE_BREAKPOINT);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!isMobile) setMenuOpen(false);
  }, [isMobile]);

  function handleTabChange(tabId) {
    onTab(tabId);
    if (isMobile) setMenuOpen(false);
  }

  return (
    <div style={{ background: G.surface, borderBottom: `1px solid ${G.border}`, padding: isMobile ? "0 12px" : "0 24px", position: "sticky", top: 0, zIndex: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: isMobile ? 10 : 12, gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: isMobile ? 22 : 24, height: isMobile ? 22 : 24, background: G.green, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: "bold", color: "#000" }}>
            G
          </div>
          <span style={{ fontFamily: G.serif, fontSize: isMobile ? 14 : 16, color: G.text, fontWeight: "bold" }}>DealBank</span>
          <span style={{ fontSize: 8, color: G.muted, letterSpacing: isMobile ? 1 : 3, marginLeft: isMobile ? 0 : 4 }}>- {title}</span>
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
              padding: "5px 9px",
              fontSize: 9,
              letterSpacing: 1,
              color: menuOpen ? G.green : G.muted,
              borderColor: menuOpen ? G.green : G.border,
              background: menuOpen ? G.greenGlow : "transparent",
            }}
          >
            ☰
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
          <div style={{ fontSize: 9, color: G.muted, padding: "2px 6px" }}>{userName || "User"}</div>
          <button onClick={onSignOut} style={{ ...btnO, width: "100%", padding: "8px 10px", fontSize: 9 }}>
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
