import { useEffect, useMemo, useRef, useState } from "react";
import useViewport from "../core/useViewport";

export default function TopBar({ title, tabs, active, onTab, userName, onSignOut, G, btnO }) {
  const { isMobile, isTablet } = useViewport();
  const [menuOpen, setMenuOpen] = useState(false);
  const headerRef = useRef(null);
  const [overlayTop, setOverlayTop] = useState(null);
  const [overlayMaxHeight, setOverlayMaxHeight] = useState(null);

  const currentTab = useMemo(() => tabs.find((tab) => tab.id === active), [tabs, active]);
  const initials = useMemo(
    () => String(userName || "User")
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U",
    [userName],
  );

  function handleTab(nextTab) {
    onTab(nextTab);
    if (isMobile) setMenuOpen(false);
  }

  function handleSignOut() {
    setMenuOpen(false);
    onSignOut();
  }

  useEffect(() => {
    if (!isMobile || !menuOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobile, menuOpen]);

  useEffect(() => {
    function updateTop() {
      if (!headerRef.current) return;
      const rect = headerRef.current.getBoundingClientRect();
      const headerBottom = Math.ceil(rect.bottom);
      // Reserve some bottom spacing so the overlay doesn't touch the safe-area bottom
      const bottomSpacing = 24;
      // Compute a sensible max height for the overlay (viewport minus header and bottom spacing)
      const computedMax = Math.max(120, Math.floor(window.innerHeight - headerBottom - bottomSpacing));

      setOverlayTop(`${headerBottom}px`);
      setOverlayMaxHeight(computedMax);
    }

    if (!menuOpen) return undefined;

    updateTop();
    window.addEventListener("resize", updateTop);
    return () => window.removeEventListener("resize", updateTop);
  }, [menuOpen]);

  return (
    <div
      ref={headerRef}
      style={{
        position: "sticky",
        top: 0,
        zIndex: 240,
        background: "rgba(255,255,255,0.92)",
        backdropFilter: "saturate(180%) blur(16px)",
        WebkitBackdropFilter: "saturate(180%) blur(16px)",
        borderBottom: `1px solid ${G.border}`,
        boxShadow: "none",
        padding: isMobile
          ? "calc(8px + env(safe-area-inset-top, 0px)) 12px 8px"
          : isTablet
            ? "10px 16px"
            : "12px 20px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", minHeight: isMobile ? 52 : 58, gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <img
            src="/image.png"
            alt="DealBank"
            style={{
              display: "block",
              width: "auto",
              height: isMobile ? 28 : 34,
              flexShrink: 0,
            }}
          />
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              borderRadius: 6,
              background: `${G.green}16`,
              color: G.green,
              fontSize: isMobile ? 9 : 10,
              fontWeight: 700,
              padding: isMobile ? "3px 7px" : "3px 8px",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              whiteSpace: "nowrap",
            }}
          >
            {title}
          </div>
        </div>

        {!isMobile && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: G.green,
                color: "#fff",
                display: "grid",
                placeItems: "center",
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {initials}
            </div>
            <div style={{ maxWidth: 170, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: G.muted, fontSize: 13, fontWeight: 600 }}>
              {userName || "User"}
            </div>
            <button onClick={handleSignOut} style={{ ...btnO, padding: "8px 12px", fontSize: 13, borderRadius: 8 }}>
              Log out
            </button>
          </div>
        )}

        {isMobile && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ maxWidth: 130, fontSize: 12, color: G.muted, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {currentTab?.label || "Menu"}
            </div>
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              aria-label="Open dashboard menu"
              aria-expanded={menuOpen}
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                border: `1px solid ${G.border}`,
                background: G.surface,
                display: "grid",
                placeItems: "center",
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 4, width: 20 }}>
                <span style={{ width: "100%", height: 2, borderRadius: 2, background: G.text, transform: menuOpen ? "translateY(6px) rotate(45deg)" : "none", transition: "all .2s" }} />
                <span style={{ width: "100%", height: 2, borderRadius: 2, background: G.text, opacity: menuOpen ? 0 : 1, transition: "all .2s" }} />
                <span style={{ width: "100%", height: 2, borderRadius: 2, background: G.text, transform: menuOpen ? "translateY(-6px) rotate(-45deg)" : "none", transition: "all .2s" }} />
              </div>
            </button>
          </div>
        )}
      </div>

      {!isMobile && (
        <div style={{ display: "flex", gap: 2, overflowX: "auto", paddingTop: isTablet ? 6 : 7, paddingBottom: 1 }}>
          {tabs.map((tab) => {
            const isActive = active === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTab(tab.id)}
                style={{
                  border: "none",
                  borderBottom: `2px solid ${isActive ? G.green : "transparent"}`,
                  borderRadius: 0,
                  background: "transparent",
                  color: isActive ? G.green : G.muted,
                  padding: isTablet ? "10px 12px" : "11px 14px",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  transition: "all .15s",
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      )}

      {isMobile && menuOpen && (
        <>
          <button
            type="button"
            aria-label="Close dashboard menu"
            onClick={() => setMenuOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 243,
              border: "none",
              background: "rgba(4, 10, 6, 0.32)",
            }}
          />

          <div
            style={{
              position: "fixed",
              top: overlayTop || "calc(64px + env(safe-area-inset-top, 0px))",
              left: 12,
              right: 12,
              zIndex: 245,
              border: `1px solid ${G.border}`,
              borderRadius: 12,
              background: G.card,
              boxShadow: G.shadowMd,
              padding: 10,
              display: "flex",
              flexDirection: "column",
              gap: 10,
              overflow: "hidden",
              maxHeight: overlayMaxHeight ? `${overlayMaxHeight}px` : undefined,
            }}
          >
            <div style={{ fontSize: 10, color: G.muted, letterSpacing: 1, fontWeight: 700 }}>
              Quick Switch
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 6, overflowY: "auto", minHeight: 120 }}>
              {tabs.map((tab) => {
                const isActive = active === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleTab(tab.id)}
                    style={{
                      textAlign: "left",
                      border: `1px solid ${isActive ? `${G.green}44` : G.border}`,
                      borderRadius: 8,
                      background: isActive ? `${G.green}12` : G.surface,
                      color: isActive ? G.green : G.text,
                      padding: "11px 10px",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <div
                style={{
                  flex: 1,
                  borderRadius: 8,
                  border: `1px solid ${G.border}`,
                  background: G.surface,
                  color: G.muted,
                  padding: "10px 12px",
                  fontSize: 12,
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {userName || "User"}
              </div>
              <button onClick={handleSignOut} style={{ ...btnO, flex: 1, borderRadius: 8, padding: "10px 12px", fontSize: 13 }}>
                Log out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
