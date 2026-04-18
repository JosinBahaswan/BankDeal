const SHORT_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

function toNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function toDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export function formatMoney(value) {
  return `$${toNumber(value).toLocaleString()}`;
}

export function formatShortDate(value, fallback = "N/A") {
  const date = toDate(value);
  if (!date) return fallback;
  return SHORT_DATE_FORMATTER.format(date);
}

export function formatRelativeTime(value, now = new Date()) {
  const date = toDate(value);
  if (!date) return "N/A";

  const diffSec = Math.max(1, Math.floor((now.getTime() - date.getTime()) / 1000));
  if (diffSec < 60) return `${diffSec}s ago`;

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return formatShortDate(date);
}

export function userTypeColor(type, G) {
  const normalized = String(type || "").toLowerCase();
  if (normalized === "dealmaker") return G.green;
  if (normalized === "contractor") return G.gold;
  if (normalized === "realtor") return G.blue;
  if (normalized === "admin") return G.text;
  return G.muted;
}

export function userStatusColor(isActive, G) {
  return isActive ? G.green : G.red;
}

export function dealStageColor(stage, G) {
  const normalized = String(stage || "").toLowerCase();
  if (normalized === "closed") return G.green;
  if (normalized === "selling" || normalized === "listing") return G.gold;
  if (normalized === "renovating") return G.blue;
  return G.muted;
}

export function activityColor(category, G) {
  const normalized = String(category || "").toLowerCase();
  if (normalized === "user") return G.green;
  if (normalized === "deal") return G.text;
  if (normalized === "contract") return G.gold;
  if (normalized === "subscription") return G.blue;
  if (normalized === "credits") return G.green;
  if (normalized === "fees") return G.gold;
  return G.muted;
}

export function truncateAddress(value, max = 42) {
  const text = String(value || "").trim();
  if (!text) return "Unknown address";
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}...`;
}
