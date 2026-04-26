import { createHash } from "crypto";
import { enforceCors, enforceRateLimit } from "../lib/server/httpSecurity.js";
import { asText, createSupabaseAdminClient } from "../lib/server/contractsShared.js";
import { loadContractBundle, renderBundlePdfBuffer, resolveStorageSignedUrl, persistGeneratedPdf } from "../lib/server/contractsDocumentService.js";

function htmlEscape(value) {
  return String(value || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function portalErrorHtml(message) {
  return `<!doctype html><html><head><meta charset="utf-8" /><title>Contract Sign</title></head><body style="font-family:Arial,Helvetica,sans-serif;background:#f3f4f6;padding:24px"><div style="max-width:680px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:16px"><h2>Contract Sign Link</h2><div style="color:#374151">${htmlEscape(message)}</div></div></body></html>`;
}

export default async function handler(req, res) {
  const cors = enforceCors(req, res, { methods: "GET, OPTIONS", headers: "Content-Type" });
  if (cors.handled) return;

  const rateLimit = await enforceRateLimit(req, res, { keyPrefix: "contract-sign", max: Number(process.env.RATE_LIMIT_CONTRACT_SIGN_MAX || 300), windowMs: Number(process.env.RATE_LIMIT_CONTRACT_SIGN_WINDOW_MS || 60_000) });
  if (!rateLimit.allowed) return res.status(429).send(portalErrorHtml("Too many requests. Please retry later."));

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET, OPTIONS");
    return res.status(405).send(portalErrorHtml("Method not allowed"));
  }

  const rawToken = asText(req.query?.token);
  if (!rawToken) return res.status(400).send(portalErrorHtml("Missing signing token"));

  const tokenHash = createHash("sha256").update(rawToken).digest("hex");

  let supabaseAdmin;
  try {
    supabaseAdmin = createSupabaseAdminClient();
  } catch (err) {
    return res.status(500).send(portalErrorHtml(err?.message || "Unable to initialize service"));
  }

  // Find delivery attempt row that contains this signing token
  const { data: attemptRow, error: attemptError } = await supabaseAdmin
    .from("contract_delivery_attempts")
    .select("id, contract_id, recipient_email, recipient_name, recipient_role, payload, status")
    .eq("payload->>signing_token_hash", tokenHash)
    .maybeSingle();

  if (attemptError) {
    return res.status(500).send(portalErrorHtml(`Failed to validate signing token: ${attemptError.message}`));
  }

  if (!attemptRow?.id) {
    return res.status(401).send(portalErrorHtml("Signing token is invalid or not found"));
  }

  const expiresAt = asText(attemptRow?.payload?.signing_token_expires_at || "");
  if (expiresAt && new Date(expiresAt).getTime() <= Date.now()) {
    return res.status(410).send(portalErrorHtml("Signing token has expired"));
  }

  let bundle;
  try {
    bundle = await loadContractBundle(supabaseAdmin, attemptRow.contract_id);
  } catch (err) {
    return res.status(500).send(portalErrorHtml(err?.message || "Failed to load contract"));
  }

  let pdfUrl = "";
  const existingPdfPath = String(bundle.contract.pdf_url || "");
  if (existingPdfPath) {
    pdfUrl = await resolveStorageSignedUrl(supabaseAdmin, existingPdfPath, 60 * 60 * 2);
  }

  if (!pdfUrl) {
    try {
      const pdfBuffer = await renderBundlePdfBuffer(bundle);
      const persisted = await persistGeneratedPdf(supabaseAdmin, String(bundle.contract.id), pdfBuffer);
      pdfUrl = String(persisted.signedUrl || "");
    } catch {
      // ignore pdf generation failure for signing page, show message below
      pdfUrl = "";
    }
  }

  const recipientName = asText(attemptRow.recipient_name || attemptRow.recipient_email || "Signer");
  const recipientEmail = asText(attemptRow.recipient_email || "");
  const contractTitle = String(bundle.contract.title || "DealBank Contract");

  const html = `<!doctype html>
  <html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Sign Contract</title>
    <style>body{font-family:Arial,Helvetica,sans-serif;background:#f3f4f6;color:#111827} .wrap{max-width:720px;margin:20px auto;padding:16px} .card{background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:16px} .btn{display:inline-block;padding:10px 14px;border-radius:6px;background:#111827;color:#fff;text-decoration:none}</style>
  </head>
  <body>
    <div class="wrap">
      <div class="card">
        <h2>Sign Contract: ${htmlEscape(contractTitle)}</h2>
        <p>Authorized signer: <strong>${htmlEscape(recipientName)}</strong> (${htmlEscape(recipientEmail)})</p>
        ${pdfUrl ? `<p><a href="${htmlEscape(pdfUrl)}" target="_blank" class="btn">Open Contract PDF</a></p>` : `<p style="color:#6b7280">PDF is not available yet.</p>`}

        <hr />
        <div>
          <label style="display:block;margin-bottom:6px">Type your full legal name to sign</label>
          <input id="signerName" style="width:100%;padding:10px;border:1px solid #e5e7eb;border-radius:6px;margin-bottom:8px" placeholder="Full legal name" />
          <div style="display:flex;gap:8px;">
            <button id="signBtn" class="btn">Apply Typed Signature</button>
            <a href="/" style="margin-left:8px;align-self:center;color:#6b7280;text-decoration:none">Cancel</a>
          </div>
          <div id="status" style="margin-top:12px;color:#6b7280"></div>
        </div>
      </div>
    </div>
    <script>
      async function postJson(url, payload){
        const res = await fetch(url, { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(payload) });
        return res;
      }
      document.getElementById('signBtn').addEventListener('click', async ()=>{
        const signerName = document.getElementById('signerName').value.trim();
        if(!signerName){ document.getElementById('status').textContent = 'Please enter your full legal name.'; return; }
        document.getElementById('status').textContent = 'Submitting signature...';
        try{
          const resp = await postJson('/api/contract-sign-apply', { token: ${JSON.stringify(rawToken)}, signerName, sigMethod: 'typed' });
          const payload = await resp.json();
          if(!resp.ok){ document.getElementById('status').textContent = payload.error || 'Signing failed'; return; }
          document.getElementById('status').textContent = 'Signature applied. Thank you.';
        }catch(err){ document.getElementById('status').textContent = err.message || 'Network error'; }
      });
    </script>
  </body>
  </html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  return res.status(200).send(html);
}
