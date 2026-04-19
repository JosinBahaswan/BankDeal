import { enforceCors, enforceRateLimit } from "../lib/server/httpSecurity.js";
import {
  asText,
  createSupabaseAdminClient,
  jsonBody,
  verifyContractActor,
} from "../lib/server/contractsShared.js";

function normalizeStatus(value) {
  const normalized = asText(value).toLowerCase();
  if (["approved", "needs_revision", "rejected"].includes(normalized)) {
    return normalized;
  }

  return "";
}

export default async function handler(req, res) {
  const cors = enforceCors(req, res, {
    methods: "GET, POST, OPTIONS",
    headers: "Content-Type, Authorization",
  });
  if (cors.handled) return;

  const rateLimit = enforceRateLimit(req, res, {
    keyPrefix: "realtor-commission-review",
    max: Number(process.env.RATE_LIMIT_REALTOR_COMMISSION_REVIEW_MAX || 40),
    windowMs: Number(process.env.RATE_LIMIT_REALTOR_COMMISSION_REVIEW_WINDOW_MS || process.env.RATE_LIMIT_WINDOW_MS || 60_000),
  });
  if (!rateLimit.allowed) {
    return res.status(429).json({ error: "Too many requests. Please retry later." });
  }

  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST, OPTIONS");
    return res.status(405).json({ error: "Method not allowed" });
  }

  let supabaseAdmin;
  try {
    supabaseAdmin = createSupabaseAdminClient();
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Unable to initialize Supabase admin client" });
  }

  try {
    await verifyContractActor(req, supabaseAdmin, {
      allowedTypes: ["admin"],
    });
  } catch (error) {
    return res.status(401).json({ error: error?.message || "Unauthorized request" });
  }

  if (req.method === "GET") {
    const statusFilter = asText(req.query?.status).toLowerCase();

    let query = supabaseAdmin
      .from("realtor_commission_reviews")
      .select("id, listing_id, realtor_user_id, dealmaker_user_id, sale_price, gross_commission, realtor_split_pct, dealbank_split_pct, realtor_net, dealbank_net, status, compliance_note, reviewer_user_id, requested_at, reviewed_at")
      .order("requested_at", { ascending: false })
      .limit(200);

    if (statusFilter) {
      query = query.eq("status", statusFilter);
    }

    const { data, error } = await query;
    if (error) {
      return res.status(500).json({ error: error.message || "Failed to load commission reviews" });
    }

    return res.status(200).json({ reviews: data || [] });
  }

  const body = jsonBody(req);
  if (!body) {
    return res.status(400).json({ error: "Invalid JSON body" });
  }

  const reviewId = asText(body.reviewId);
  const status = normalizeStatus(body.status);
  const note = asText(body.note);

  if (!reviewId || !status) {
    return res.status(400).json({ error: "reviewId and valid status are required" });
  }

  const { data, error } = await supabaseAdmin
    .rpc("review_realtor_commission_review", {
      p_review_id: reviewId,
      p_status: status,
      p_note: note,
    });

  if (error) {
    return res.status(500).json({ error: error.message || "Failed to update commission review" });
  }

  return res.status(200).json({ ok: true, review: Array.isArray(data) ? data[0] : null });
}
