export function pagePaddingByMode(mode) {
  if (mode === "mobile") return "14px 14px 24px";
  if (mode === "tablet") return "20px 22px 30px";
  return "24px 32px 36px";
}

export function dashboardPaddingByMode(mode) {
  if (mode === "mobile") return "14px 12px 24px";
  if (mode === "tablet") return "16px 20px 26px";
  return "16px 20px 30px";
}

export function pageShellStyle(G) {
  return {
    minHeight: "100vh",
    background: G.bg,
    color: G.text,
    fontFamily: G.mono,
  };
}

export function pageContainerStyle(mode, maxWidth = 1320) {
  const style = {
    width: "100%",
    margin: "0 auto",
    padding: pagePaddingByMode(mode),
    boxSizing: "border-box",
  };

  if (maxWidth !== null && maxWidth !== undefined) {
    style.maxWidth = maxWidth;
  }

  return style;
}

export function dashboardContainerStyle(mode) {
  const style = {
    width: "100%",
    margin: "0 auto",
    padding: dashboardPaddingByMode(mode),
    boxSizing: "border-box",
  };

  if (mode === "mobile") {
    style.maxWidth = "100%";
    return style;
  }

  style.maxWidth = 1000;

  return {
    ...style,
  };
}
