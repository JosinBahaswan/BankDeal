import { enforceCors, enforceRateLimit } from "../lib/server/httpSecurity.js";
import {
  asText,
  createSupabaseAdminClient,
  jsonBody,
  verifyContractActor,
} from "../lib/server/contractsShared.js";
import {
  actorCanAccessBundle,
  loadContractBundle,
  persistGeneratedPdf,
  renderBundlePdfBuffer,
  resolveStorageSignedUrl,
  safeContractFilename,
} from "../lib/server/contractsDocumentService.js";

export default async function handler(req, res) {
  const cors = enforceCors(req, res, {
    methods: "GET, POST, OPTIONS",
    headers: "Content-Type, Authorization",
  });
  if (cors.handled) return;

  const rateLimit = enforceRateLimit(req, res, {
    keyPrefix: "contracts-generate-pdf",
    max: Number(process.env.RATE_LIMIT_CONTRACT_PDF_MAX || 30),
    windowMs: Number(process.env.RATE_LIMIT_CONTRACT_PDF_WINDOW_MS || process.env.RATE_LIMIT_WINDOW_MS || 60_000),
  });
  if (!rateLimit.allowed) {
    return res.status(429).json({ error: "Too many requests. Please retry later." });
  }

  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST, OPTIONS");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body = req.method === "POST" ? jsonBody(req) : null;
  if (req.method === "POST" && !body) {
    return res.status(400).json({ error: "Invalid JSON body" });
  }

  const contractId = asText(req.query?.contractId || body?.contractId);
  if (!contractId) {
    return res.status(400).json({ error: "contractId is required" });
  }

  let supabaseAdmin;
  try {
    supabaseAdmin = createSupabaseAdminClient();
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Unable to initialize Supabase admin client" });
  }

  let actor;
  try {
    actor = await verifyContractActor(req, supabaseAdmin);
  } catch (error) {
    return res.status(401).json({ error: error?.message || "Unauthorized request" });
  }

  let bundle;
  try {
    bundle = await loadContractBundle(supabaseAdmin, contractId);
  } catch (error) {
    const message = error?.message || "Unable to load contract payload";
    const status = message.toLowerCase().includes("not found") ? 404 : 500;
    return res.status(status).json({ error: message });
  }

  if (!actorCanAccessBundle(actor, bundle)) {
    return res.status(403).json({ error: "Authenticated user is not allowed to access this contract PDF" });
  }

  const shouldPersist = req.method === "POST" && body?.persist !== false;
  const wantsBinary = req.method === "GET" || body?.download === true;

  let pdfBuffer;
  try {
    pdfBuffer = await renderBundlePdfBuffer(bundle);
  } catch (error) {
    return res.status(500).json({
      error: error?.message || "Server-side PDF generation failed",
    });
  }

  let pdfPath = asText(bundle.contract.pdf_url);
  let pdfUrl = pdfPath ? await resolveStorageSignedUrl(supabaseAdmin, pdfPath) : "";

  if (shouldPersist) {
    try {
      const persisted = await persistGeneratedPdf(supabaseAdmin, contractId, pdfBuffer);
      pdfPath = persisted.path;
      pdfUrl = persisted.signedUrl;
    } catch (error) {
      return res.status(500).json({ error: error?.message || "Failed to persist generated PDF" });
    }
  }

  if (wantsBinary) {
    const fileName = `${safeContractFilename(asText(bundle.contract.title, `contract-${contractId}`))}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    if (pdfPath) {
      res.setHeader("X-Contract-Pdf-Path", pdfPath);
    }
    if (pdfUrl) {
      res.setHeader("X-Contract-Pdf-Url", pdfUrl);
    }
    return res.status(200).send(pdfBuffer);
  }

  return res.status(200).json({
    ok: true,
    contractId,
    sizeBytes: pdfBuffer.length,
    docHash: bundle.docHash,
    pdfPath,
    pdfUrl,
  });
}
