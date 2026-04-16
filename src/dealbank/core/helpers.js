const apiBaseUrl = String(import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

export async function dbSet(key, value) {
  try {
    await window.storage.set(key, JSON.stringify(value));
  } catch (err) {
    // no-op in preview/local mode
  }
}

export async function dbGet(key) {
  try {
    const record = await window.storage.get(key);
    return record ? JSON.parse(record.value) : null;
  } catch (err) {
    return null;
  }
}

export async function dbList(prefix) {
  try {
    const result = await window.storage.list(prefix);
    return result ? result.keys : [];
  } catch (err) {
    return [];
  }
}

export const fmt = (value) => {
  const parsed = parseFloat(String(value).replace(/,/g, ""));
  if (Number.isNaN(parsed) || parsed === 0) return "$0";
  return `$${parsed.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
};

export const toNum = (value) => parseFloat(String(value).replace(/[^0-9.]/g, "")) || 0;

export function calcOffer(arv, reno, soft, rate, months, points, offerPct = 60) {
  const pct = Math.min(100, Math.max(0, Number(offerPct) || 60)) / 100;
  const multiplier = 1 + (rate / 100) * (months / 12) + points / 100;
  return Math.max(0, Math.round((arv * pct - reno - soft) / multiplier));
}

export function extractJSON(raw) {
  const matched = raw.match(/\{[\s\S]*\}/);
  if (!matched) throw new Error("No JSON");
  return JSON.parse(matched[0]);
}

export async function askClaude(prompt, maxTokens = 1400) {
  const response = await fetch(`${apiBaseUrl}/api/claude`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      maxTokens,
    }),
  });

  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error(`Claude proxy error (${response.status})`);
  }

  if (!response.ok || data?.error) {
    throw new Error(data?.error || `Claude proxy error (${response.status})`);
  }

  return data?.text || "";
}
