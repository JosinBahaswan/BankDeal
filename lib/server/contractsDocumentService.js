/* global process */

import { asEmail, asText } from "./contractsShared.js";
import { buildContractHtml, renderContractPdfBuffer } from "./contractsPdf.js";

export const CONTRACTS_BUCKET = asText(process.env.CONTRACTS_BUCKET || process.env.VITE_CONTRACTS_BUCKET, "contracts");

export function isHttpUrl(value) {
  return /^https?:\/\//i.test(String(value || ""));
}

export function safeContractFilename(value) {
  const trimmed = asText(value, "dealbank-contract");
  return trimmed
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "") || "dealbank-contract";
}

export async function resolveStorageSignedUrl(supabaseAdmin, pathOrUrl, expiresInSeconds = 60 * 60 * 24 * 7) {
  const input = asText(pathOrUrl);
  if (!input) return "";
  if (isHttpUrl(input)) return input;

  const { data, error } = await supabaseAdmin
    .storage
    .from(CONTRACTS_BUCKET)
    .createSignedUrl(input, expiresInSeconds);

  if (error) return "";
  return asText(data?.signedUrl);
}

export async function loadContractBundle(supabaseAdmin, contractId) {
  const { data: contractRow, error: contractError } = await supabaseAdmin
    .from("contracts")
    .select("id, creator_id, title, template, status, created_at, executed_at, pdf_url")
    .eq("id", contractId)
    .maybeSingle();

  if (contractError) {
    throw new Error(`Failed to load contract: ${contractError.message}`);
  }

  if (!contractRow?.id) {
    throw new Error("Contract not found");
  }

  const [templateResult, partyResult, formResult, signatureResult] = await Promise.all([
    supabaseAdmin
      .from("contract_templates")
      .select("name")
      .eq("template_type", contractRow.template)
      .maybeSingle(),
    supabaseAdmin
      .from("contract_parties")
      .select("id, role, name, email, party_order")
      .eq("contract_id", contractId)
      .order("party_order", { ascending: true }),
    supabaseAdmin
      .from("contract_form_values")
      .select("field_key, field_value")
      .eq("contract_id", contractId),
    supabaseAdmin
      .from("contract_signatures")
      .select("id, party_id, party_role, signer_name, signer_email, signer_ip, signed_at, sig_method, sig_image_url, doc_hash, signature_algorithm, signing_cert_fingerprint")
      .eq("contract_id", contractId)
      .order("signed_at", { ascending: false }),
  ]);

  if (templateResult.error) {
    throw new Error(`Failed to load contract template: ${templateResult.error.message}`);
  }
  if (partyResult.error) {
    throw new Error(`Failed to load contract parties: ${partyResult.error.message}`);
  }
  if (formResult.error) {
    throw new Error(`Failed to load contract form values: ${formResult.error.message}`);
  }
  if (signatureResult.error) {
    throw new Error(`Failed to load contract signatures: ${signatureResult.error.message}`);
  }

  const formValues = (formResult.data || []).reduce((acc, row) => {
    acc[asText(row.field_key)] = asText(row.field_value);
    return acc;
  }, {});

  const signatures = signatureResult.data || [];
  const signatureImageUrls = new Map();

  for (const signature of signatures) {
    const signatureId = asText(signature?.id);
    const sourcePath = asText(signature?.sig_image_url);
    if (!signatureId || !sourcePath) continue;

    const signedUrl = await resolveStorageSignedUrl(supabaseAdmin, sourcePath, 60 * 60 * 24);
    if (signedUrl) {
      signatureImageUrls.set(signatureId, signedUrl);
    }
  }

  return {
    contract: contractRow,
    templateName: asText(templateResult.data?.name, contractRow.template),
    parties: partyResult.data || [],
    formValues,
    signatures,
    signatureImageUrls,
    docHash: asText(signatures[0]?.doc_hash),
  };
}

export function actorCanAccessBundle(actor, bundle) {
  if (actor?.isAdmin) return true;
  if (asText(bundle?.contract?.creator_id) === asText(actor?.userId)) return true;

  const actorEmail = asEmail(actor?.email);
  if (!actorEmail) return false;

  return (bundle?.parties || []).some((party) => asEmail(party.email) === actorEmail);
}

export async function renderBundlePdfBuffer(bundle) {
  const html = buildContractHtml({
    ...bundle,
    renderedAt: new Date().toISOString(),
  });

  return renderContractPdfBuffer(html);
}

export async function persistGeneratedPdf(supabaseAdmin, contractId, pdfBuffer) {
  const path = `contracts/${contractId}/server-generated-${Date.now()}.pdf`;

  const { error: uploadError } = await supabaseAdmin
    .storage
    .from(CONTRACTS_BUCKET)
    .upload(path, pdfBuffer, {
      upsert: true,
      contentType: "application/pdf",
    });

  if (uploadError) {
    throw new Error(`Failed to upload generated PDF: ${uploadError.message}`);
  }

  const { error: updateError } = await supabaseAdmin
    .from("contracts")
    .update({ pdf_url: path })
    .eq("id", contractId);

  if (updateError) {
    throw new Error(`Failed to persist generated PDF path: ${updateError.message}`);
  }

  return {
    path,
    signedUrl: await resolveStorageSignedUrl(supabaseAdmin, path),
  };
}
