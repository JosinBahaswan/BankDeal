const MODEL = "claude-sonnet-4-20250514";

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

export function calcOffer(arv, reno, soft, rate, months, points) {
  const multiplier = 1 + (rate / 100) * (months / 12) + points / 100;
  return Math.max(0, Math.round((arv * 0.6 - reno - soft) / multiplier));
}

export function extractJSON(raw) {
  const matched = raw.match(/\{[\s\S]*\}/);
  if (!matched) throw new Error("No JSON");
  return JSON.parse(matched[0]);
}

export async function askClaude(prompt, maxTokens = 1400) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) throw new Error(`API ${response.status}`);

  const data = await response.json();
  if (data.error) throw new Error(data.error.message);

  return data.content?.map((block) => block.text || "").join("") || "";
}
