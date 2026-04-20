export const G = {
  bg: "#f6f8f6",
  surface: "#ffffff",
  card: "#ffffff",
  border: "#e5eae5",
  green: "#0c7a3d",
  greenDim: "#0a6833",
  greenGlow: "rgba(12, 122, 61, 0.12)",
  gold: "#ca8a04",
  text: "#0f1a0f",
  muted: "#5a6b5a",
  faint: "#eef2ee",
  red: "#dc2626",
  blue: "#2563eb",
  ui: "'Poppins', 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif",
  serif: "'Poppins', 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif",
  mono: "'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif",
  shadowSm: "0 1px 2px rgba(0, 0, 0, 0.03)",
  shadowMd: "0 12px 30px rgba(0, 0, 0, 0.08)",
  radiusSm: 10,
  radiusMd: 12,
  radiusLg: 16,
};

export const card = {
  background: G.card,
  border: `1px solid ${G.border}`,
  borderRadius: G.radiusMd,
  padding: "20px",
  boxShadow: G.shadowSm,
  backdropFilter: "blur(8px)",
};

export const lbl = {
  fontSize: 11,
  color: G.muted,
  letterSpacing: 1.1,
  textTransform: "uppercase",
  marginBottom: 6,
  fontFamily: G.ui,
  fontWeight: 600,
};

export const smIn = {
  background: G.surface,
  border: `1px solid ${G.border}`,
  color: G.text,
  fontSize: 15,
  fontFamily: G.mono,
  width: "100%",
  outline: "none",
  borderRadius: G.radiusSm,
  padding: "11px 12px",
};

export const btnG = {
  border: `1px solid ${G.green}`,
  borderRadius: G.radiusSm,
  padding: "12px 18px",
  fontSize: 14,
  letterSpacing: 0.2,
  fontFamily: G.ui,
  cursor: "pointer",
  textTransform: "none",
  background: G.green,
  color: "#ffffff",
  fontWeight: 700,
  boxShadow: "none",
};

export const btnO = {
  border: `1px solid ${G.border}`,
  borderRadius: G.radiusSm,
  padding: "12px 18px",
  fontSize: 14,
  letterSpacing: 0.2,
  fontFamily: G.ui,
  cursor: "pointer",
  textTransform: "none",
  background: "#ffffff",
  color: G.text,
  fontWeight: 600,
};
