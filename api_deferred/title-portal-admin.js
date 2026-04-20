import { createHash, randomBytes } from "crypto";
import { enforceCors, enforceRateLimit } from "../lib/server/httpSecurity.js";
import {
  appBaseUrl,
  asEmail,
  asText,
  createSupabaseAdminClient,
  jsonBody,
  verifyContractActor,
} from "../lib/server/contractsShared.js";

function asBool(value, fallback = false) {
  const normalized = asText(value).toLowerCase();
  if (!normalized) return fallback;
  return ["1", "true", "yes"].includes(normalized);
}

function asInt(value, fallback, min, max) {
  const parsed = Number.parseInt(String(value || ""), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function titlePortalTokenExpiryIso() {
  const ttlHours = Math.max(1, Number(process.env.TITLE_PORTAL_TOKEN_TTL_HOURS || 168));
  return new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString();
}

function buildPortalUrl(req, tokenValue) {
  const rootUrl = appBaseUrl(req);
  return `${rootUrl}/api/title-portal?token=${encodeURIComponent(tokenValue)}`;
}

async function resolveContractMap(supabaseAdmin, contractIds) {
  const ids = Array.from(new Set((contractIds || []).map((value) => asText(value)).filter(Boolean)));
  if (ids.length === 0) return new Map();

  const { data, error } = await supabaseAdmin
    .from("contracts")
    .select("id, title, status, created_at, executed_at")
    .in("id", ids);

  if (error) {
    throw new Error(`Failed to load contracts for title portal tokens: ${error.message}`);
  }

  return new Map((data || []).map((row) => [asText(row.id), row]));
}

async function resolveTitleCompanyEmail(supabaseAdmin, contractId, bodyEmail) {
  const direct = asEmail(bodyEmail);
  if (direct) return direct;

  const { data, error } = await supabaseAdmin
    .from("contract_form_values")
    .select("field_value")
    .eq("contract_id", contractId)
    .eq("field_key", "titleCompanyEmail")
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to resolve title company email: ${error.message}`);
  }

  const fromForm = asEmail(data?.field_value);
  if (fromForm) return fromForm;

  return "";
}

async function listTokens(req, res, supabaseAdmin) {
  const limit = asInt(req.query?.limit, 25, 1, 100);

  const { data: tokenRows, error: tokenError } = await supabaseAdmin
    .from("contract_title_portal_tokens")
    .select("id, contract_id, title_company_email, expires_at, consumed_at, last_accessed_at, created_by, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (tokenError) {
    return res.status(500).json({ error: `Failed to load title portal tokens: ${tokenError.message}` });
  }

  let contractMap;
  try {
    contractMap = await resolveContractMap(
      supabaseAdmin,
      (tokenRows || []).map((row) => row.contract_id),
    );
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Unable to resolve contracts for title portal tokens" });
  }

  const nowMs = Date.now();
  const tokens = (tokenRows || []).map((row) => {
    const contractId = asText(row.contract_id);
    const contract = contractMap.get(contractId) || null;
    const expiresMs = new Date(row.expires_at || 0).getTime();
    const expired = !Number.isFinite(expiresMs) || expiresMs <= nowMs;

    return {
      id: row.id,
      contractId,
      titleCompanyEmail: asText(row.title_company_email),
      expiresAt: row.expires_at,
      consumedAt: row.consumed_at,
      lastAccessedAt: row.last_accessed_at,
      createdBy: row.created_by,
      createdAt: row.created_at,
      expired,
      contract: contract
        ? {
            id: contract.id,
            title: asText(contract.title, "DealBank Contract"),
            status: asText(contract.status),
            createdAt: contract.created_at,
            executedAt: contract.executed_at,
          }
        : null,
    };
  });

  return res.status(200).json({
    count: tokens.length,
    tokens,
  });
}

async function createToken(req, res, supabaseAdmin, actor) {
  const body = jsonBody(req);
  if (!body) {
    return res.status(400).json({ error: "Invalid JSON body" });
  }

  const contractId = asText(body.contractId);
  if (!contractId) {
    return res.status(400).json({ error: "contractId is required" });
  }

  const { data: contractRow, error: contractError } = await supabaseAdmin
    .from("contracts")
    .select("id, title, status, created_at, executed_at")
    .eq("id", contractId)
    .maybeSingle();

  if (contractError) {
    return res.status(500).json({ error: `Failed to load contract: ${contractError.message}` });
  }

  if (!contractRow?.id) {
    return res.status(404).json({ error: "Contract not found" });
  }

  let titleCompanyEmail;
  try {
    titleCompanyEmail = await resolveTitleCompanyEmail(supabaseAdmin, contractId, body.titleCompanyEmail);
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Unable to resolve title company email" });
  }

  if (!titleCompanyEmail) {
    return res.status(400).json({
      error: "titleCompanyEmail is required when contract form values do not include Title Company Email",
    });
  }

  if (asBool(body.invalidateExisting, false)) {
    const nowIso = new Date().toISOString();
    const { error: expireError } = await supabaseAdmin
      .from("contract_title_portal_tokens")
      .update({ expires_at: nowIso })
      .eq("contract_id", contractId)
      .eq("title_company_email", titleCompanyEmail)
      .gt("expires_at", nowIso);

    if (expireError) {
      return res.status(500).json({ error: `Failed to invalidate prior tokens: ${expireError.message}` });
    }
  }

  const tokenValue = randomBytes(24).toString("hex");
  const tokenHash = createHash("sha256").update(tokenValue).digest("hex");
  const expiresAt = titlePortalTokenExpiryIso();

  const { data: insertedRow, error: insertError } = await supabaseAdmin
    .from("contract_title_portal_tokens")
    .insert({
      contract_id: contractId,
      title_company_email: titleCompanyEmail,
      token_hash: tokenHash,
      expires_at: expiresAt,
      created_by: actor.userId,
    })
    .select("id, contract_id, title_company_email, expires_at, created_by, created_at")
    .single();

  if (insertError) {
    return res.status(500).json({ error: `Failed to create title portal token: ${insertError.message}` });
  }

  return res.status(201).json({
    created: true,
    token: {
      id: insertedRow.id,
      contractId: insertedRow.contract_id,
      titleCompanyEmail: insertedRow.title_company_email,
      expiresAt: insertedRow.expires_at,
      createdAt: insertedRow.created_at,
      createdBy: insertedRow.created_by,
      contract: {
        id: contractRow.id,
        title: asText(contractRow.title, "DealBank Contract"),
        status: asText(contractRow.status),
        createdAt: contractRow.created_at,
        executedAt: contractRow.executed_at,
      },
    },
    portalUrl: buildPortalUrl(req, tokenValue),
  });
}

export default async function handler(req, res) {
  const cors = enforceCors(req, res, {
    methods: "GET, POST, OPTIONS",
    headers: "Content-Type, Authorization",
  });
  if (cors.handled) return;

  const rateLimit = enforceRateLimit(req, res, {
    keyPrefix: "title-portal-admin",
    max: Number(process.env.RATE_LIMIT_TITLE_PORTAL_ADMIN_MAX || process.env.RATE_LIMIT_MAX || 60),
    windowMs: Number(process.env.RATE_LIMIT_TITLE_PORTAL_ADMIN_WINDOW_MS || process.env.RATE_LIMIT_WINDOW_MS || 60_000),
  });
  if (!rateLimit.allowed) {
    return res.status(429).json({ error: "Too many requests. Please retry later." });
  }

  if (!["GET", "POST"].includes(req.method)) {
    res.setHeader("Allow", "GET, POST, OPTIONS");
    return res.status(405).json({ error: "Method not allowed" });
  }

  let supabaseAdmin;
  try {
    supabaseAdmin = createSupabaseAdminClient();
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Unable to initialize Supabase admin client" });
  }

  let actor;
  try {
    actor = await verifyContractActor(req, supabaseAdmin, {
      allowedTypes: ["admin"],
    });
  } catch (error) {
    return res.status(401).json({ error: error?.message || "Unauthorized request" });
  }

  if (req.method === "GET") {
    return listTokens(req, res, supabaseAdmin);
  }

  return createToken(req, res, supabaseAdmin, actor);
}
