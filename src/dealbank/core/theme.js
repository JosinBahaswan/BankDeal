export const G = {
  bg: "#050a05",
  surface: "#0d150d",
  card: "#111d11",
  border: "#1a2e1a",
  green: "#22c55e",
  greenDim: "#166534",
  greenGlow: "#22c55e22",
  gold: "#eab308",
  text: "#e8f0e8",
  muted: "#6b8f6b",
  faint: "#1a2e1a",
  red: "#ef4444",
  blue: "#3b82f6",
  purple: "#a855f7",
  serif: "'Georgia',serif",
  mono: "'Courier New',monospace",
};

export const card = {
  background: G.card,
  border: `1px solid ${G.border}`,
  borderRadius: 8,
  padding: "16px",
};

export const lbl = {
  fontSize: 9,
  color: G.muted,
  letterSpacing: 3,
  textTransform: "uppercase",
  marginBottom: 5,
  fontFamily: G.mono,
};

export const smIn = {
  background: "transparent",
  border: "none",
  color: G.text,
  fontSize: 13,
  fontFamily: G.mono,
  width: "100%",
  outline: "none",
};

export const btnG = {
  border: "none",
  borderRadius: 6,
  padding: "11px 18px",
  fontSize: 10,
  letterSpacing: 3,
  fontFamily: G.mono,
  cursor: "pointer",
  textTransform: "uppercase",
  background: G.green,
  color: "#000",
  fontWeight: "bold",
};

export const btnO = {
  border: `1px solid ${G.border}`,
  borderRadius: 6,
  padding: "11px 18px",
  fontSize: 10,
  letterSpacing: 3,
  fontFamily: G.mono,
  cursor: "pointer",
  textTransform: "uppercase",
  background: "transparent",
  color: G.muted,
};
