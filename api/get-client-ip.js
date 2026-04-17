function asText(value, fallback = "") {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized || fallback;
}

function firstForwardedIp(value) {
  const raw = asText(value);
  if (!raw) return "";
  return raw.split(",")[0].trim();
}

function resolveClientIp(req) {
  const headerCandidates = [
    req.headers?.["x-forwarded-for"],
    req.headers?.["x-vercel-forwarded-for"],
    req.headers?.["x-real-ip"],
    req.headers?.["cf-connecting-ip"],
  ];

  for (const candidate of headerCandidates) {
    const ip = firstForwardedIp(candidate);
    if (ip) return ip;
  }

  return asText(req.socket?.remoteAddress || req.connection?.remoteAddress);
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET, OPTIONS");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const ip = resolveClientIp(req);
  return res.status(200).json({ ip: ip || null });
}
