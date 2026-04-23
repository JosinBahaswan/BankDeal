export const BREAKPOINTS = Object.freeze({
  mobileMax: 767,
  tabletMin: 768,
  tabletMax: 1024,
  desktopMin: 1025,
});

export function resolveViewport(width) {
  const safeWidth = Number.isFinite(Number(width)) ? Number(width) : BREAKPOINTS.desktopMin;

  if (safeWidth <= BREAKPOINTS.mobileMax) {
    return {
      width: safeWidth,
      isMobile: true,
      isTablet: false,
      isDesktop: false,
      mode: "mobile",
    };
  }

  if (safeWidth <= BREAKPOINTS.tabletMax) {
    return {
      width: safeWidth,
      isMobile: false,
      isTablet: true,
      isDesktop: false,
      mode: "tablet",
    };
  }

  return {
    width: safeWidth,
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    mode: "desktop",
  };
}
