import { enforceCors, enforceRateLimit } from "../lib/server/httpSecurity.js";
import {
  asText,
  createSupabaseAdminClient,
  jsonBody,
  verifyContractActor,
} from "../lib/server/contractsShared.js";
import {
  loadContractBundle,
  CONTRACTS_BUCKET,
  actorCanAccessBundle,
} from "../lib/server/contractsDocumentService.js";

export default async function handler(req, res) {
  const cors = enforceCors(req, res, { methods: "POST, OPTIONS", headers: "Content-Type, Authorization" });
  if (cors.handled) return;

  const rateLimit = enforceRateLimit(req, res, { keyPrefix: "contract-delete", max: Number(process.env.RATE_LIMIT_CONTRACT_DELETE_MAX || 30), windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000) });
  if (!rateLimit.allowed) return res.status(429).json({ error: "Too many requests. Please retry later." });

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body = jsonBody(req);
  if (!body) return res.status(400).json({ error: "Invalid JSON body" });

  const contractId = asText(body.contractId || body.contract_id || "");
  if (!contractId) return res.status(400).json({ error: "Missing contractId" });

  let supabaseAdmin;
  try {
    supabaseAdmin = createSupabaseAdminClient();
  } catch (err) {
    return res.status(500).json({ error: err?.message || "Unable to initialize Supabase admin client" });
  }

  let actor;
  try {
    actor = await verifyContractActor(req, supabaseAdmin);
  } catch (err) {
    return res.status(401).json({ error: err?.message || "Unauthorized request" });
  }

  let bundle;
  try {
    bundle = await loadContractBundle(supabaseAdmin, contractId);
  } catch (err) {
    return res.status(404).json({ error: err?.message || "Contract not found" });
  }

  if (!actorCanAccessBundle(actor, bundle) && !actor?.isAdmin) {
    return res.status(403).json({ error: "Actor is not permitted to delete this contract" });
  }

  try {
    // Delete child rows first
    await supabaseAdmin.from("contract_signatures").delete().eq("contract_id", contractId);
    await supabaseAdmin.from("contract_delivery_attempts").delete().eq("contract_id", contractId);
    await supabaseAdmin.from("contract_form_values").delete().eq("contract_id", contractId);
    await supabaseAdmin.from("contract_parties").delete().eq("contract_id", contractId);

    // Remove persisted PDF in storage if present
    const pdfPath = asText(bundle?.contract?.pdf_url || "");
    if (pdfPath) {
      try {
        await supabaseAdmin.storage.from(CONTRACTS_BUCKET).remove([pdfPath]);
      } catch (e) {
        console.error("contract-delete: failed to remove storage file", e && e.message ? e.message : e);
      }
    }

    // Finally delete contract row
    const { error: delErr } = await supabaseAdmin.from("contracts").delete().eq("id", contractId);
    if (delErr) throw delErr;

    return res.status(200).json({ ok: true, deleted: true, contractId });
  } catch (err) {
    console.error("contract-delete error", err && err.message ? err.message : err);
    return res.status(500).json({ error: err?.message || "Failed to delete contract" });
  }
}
