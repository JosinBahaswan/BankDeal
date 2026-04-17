import { useState } from "react";
import useIsMobile from "../core/useIsMobile";

const MOBILE_BREAKPOINT = 820;

export default function TopBar({ title, tabs, active, onTab, userName, onSignOut, G, btnO }) {
  const isMobile = useIsMobile(MOBILE_BREAKPOINT);
  const [menuOpen, setMenuOpen] = useState(false);
  const isMenuOpen = isMobile && menuOpen;

  function handleTabChange(tabId) {
    onTab(tabId);
    if (isMobile) setMenuOpen(false);
  }

  function handleSignOut() {
    setMenuOpen(false);
    onSignOut();
  }

  return (
    <div style={{ background: G.surface, borderBottom: `1px solid ${G.border}`, padding: isMobile ? "0 14px" : "0 24px", position: "sticky", top: 0, zIndex: 200 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", minHeight: isMobile ? 74 : 64, gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <div style={{ position: "relative", width: isMobile ? 26 : 30, height: isMobile ? 26 : 30 }}>
            <div style={{ position: "absolute", inset: 0, background: "#22c55e", borderRadius: 5, transform: "rotate(45deg) scale(0.7)" }} />
            <div style={{ position: "absolute", inset: 4, background: "#050a05", borderRadius: 3, transform: "rotate(45deg) scale(0.7)" }} />
            <div style={{ position: "absolute", inset: 9, background: "#22c55e", borderRadius: 2, transform: "rotate(45deg) scale(0.7)" }} />
          </div>
          <span style={{ fontFamily: "'Playfair Display',Georgia,serif", fontSize: isMobile ? 18 : 20, fontWeight: 900, letterSpacing: -0.5, lineHeight: 1 }}>
            Deal<span style={{ color: "#22c55e" }}>Bank</span>
          </span>
          <span style={{ fontSize: isMobile ? 9 : 8, color: G.muted, letterSpacing: isMobile ? 1 : 3, marginLeft: isMobile ? 0 : 4 }}>- {title}</span>
        </div>
        {!isMobile && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontSize: 10, color: G.muted }}>{userName}</div>
            <button onClick={handleSignOut} style={{ ...btnO, padding: "5px 12px", fontSize: 9 }}>
              Sign Out
            </button>
          </div>
        )}

        {isMobile && (
          <button
            className="hamburger"
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            style={{ display: "flex", flexDirection: "column", gap: 5, background: "transparent", border: "none", cursor: "pointer", padding: 8 }}
          >
            <span style={{ display: "block", width: 24, height: 2, background: isMenuOpen ? "#22c55e" : G.muted, transition: "all .2s", transform: isMenuOpen ? "rotate(45deg) translate(5px,5px)" : "none" }} />
            <span style={{ display: "block", width: 24, height: 2, background: isMenuOpen ? "transparent" : G.muted, transition: "all .2s" }} />
            <span style={{ display: "block", width: 24, height: 2, background: isMenuOpen ? "#22c55e" : G.muted, transition: "all .2s", transform: isMenuOpen ? "rotate(-45deg) translate(5px,-5px)" : "none" }} />
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

      {isMenuOpen && (
        <div style={{ position: "fixed", top: 74, left: 0, right: 0, zIndex: 190, background: "#0a1a0a", borderBottom: `1px solid ${G.border}`, padding: "16px 14px" }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id)}
              style={{
                width: "100%",
                textAlign: "left",
                background: "transparent",
                border: "none",
                borderBottom: `1px solid ${G.border}`,
                color: active === tab.id ? "#22c55e" : G.muted,
                fontSize: 12,
                letterSpacing: 2,
                padding: "12px 0",
                cursor: "pointer",
                fontFamily: G.mono,
              }}
            >
              {tab.icon} {tab.label.toUpperCase()}
            </button>
          ))}

          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <div style={{ flex: 1, border: `1px solid ${G.border}`, color: G.muted, borderRadius: 6, padding: "12px", fontSize: 10, letterSpacing: 2, fontFamily: G.mono, textAlign: "center" }}>
              {(userName || "User").toUpperCase()}
            </div>
            <button onClick={handleSignOut} style={{ ...btnO, flex: 2, borderRadius: 6, padding: "12px", fontSize: 10, letterSpacing: 2 }}>
              SIGN OUT
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
