/* pure-JS PDF generator using pdf-lib (serverless-friendly)
 * Creates a simple, printable PDF from the contract bundle and embeds signature images.
 */
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { asText } from "./contractsShared.js";

function formatTimestamp(value) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZoneName: "short",
  });
}

async function fetchImageBytes(url) {
  if (!url) return null;
  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const buf = await resp.arrayBuffer();
    return { buffer: new Uint8Array(buf), contentType: String(resp.headers.get("content-type") || "") };
  } catch (e) {
    return null;
  }
}

function wrapTextLines(text, font, size, maxWidth) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const lines = [];
  let cur = "";
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    const width = font.widthOfTextAtSize(test, size);
    if (width <= maxWidth) {
      cur = test;
    } else {
      if (cur) lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

async function embedImageIfPossible(pdfDoc, url) {
  const img = await fetchImageBytes(url);
  if (!img) return null;

  try {
    if (img.contentType.includes("png") || img.contentType.includes("svg+xml")) {
      return await pdfDoc.embedPng(img.buffer);
    }
    return await pdfDoc.embedJpg(img.buffer);
  } catch (e) {
    try {
      return await pdfDoc.embedPng(img.buffer);
    } catch {
      return null;
    }
  }
}

export async function renderBundlePdfWithPdfLib(bundle) {
  const pdfDoc = await PDFDocument.create();

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontSize = 10;
  const titleSize = 16;

  const pageWidth = 612; // Letter
  const pageHeight = 792;
  const margin = 40;

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  const contract = bundle?.contract || {};
  const parties = Array.isArray(bundle?.parties) ? bundle.parties : [];
  const signatures = Array.isArray(bundle?.signatures) ? bundle.signatures : [];
  const formValues = bundle?.formValues || {};
  const signatureImageUrls = bundle?.signatureImageUrls instanceof Map ? bundle.signatureImageUrls : new Map();

  // Title
  const title = asText(contract.title || `DealBank ${asText(bundle?.templateName || contract.template)}`);
  page.drawText(title, { x: margin, y: y - titleSize, size: titleSize, font, color: rgb(0.07, 0.12, 0.17) });
  y -= titleSize + 8;

  // Meta grid (2 columns)
  const metaItems = [
    ["Status", asText(contract.status || "draft")],
    ["Contract ID", asText(contract.id || "")],
    ["Created At", formatTimestamp(contract.created_at)],
    ["Executed At", formatTimestamp(contract.executed_at)],
  ];

  const colWidth = (pageWidth - margin * 2) / 2 - 8;
  for (let i = 0; i < metaItems.length; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = margin + col * (colWidth + 16);
    const label = metaItems[i][0];
    const value = metaItems[i][1];

    const labelSize = 9;
    page.drawText(label + ":", { x, y: y - labelSize, size: labelSize, font, color: rgb(0.35, 0.4, 0.45) });
    const valueLines = wrapTextLines(value, font, 9, colWidth);
    let lineYOffset = 0;
    for (const line of valueLines) {
      page.drawText(line, { x, y: y - labelSize - 4 - lineYOffset, size: 9, font, color: rgb(0, 0, 0) });
      lineYOffset += 11;
    }
    if (row === 1) {
      // after second row subtract max height of row
      // We simply move y down after each physical row of meta grid by fixed amount
    }
    if (col === 1) {
      // after finishing two columns, move y
      y -= Math.max(28, lineYOffset + 8);
    }
  }

  y -= 4;

  // Form values
  page.drawText("Form Values", { x: margin, y: y - 12, size: 12, font, color: rgb(0.07, 0.12, 0.17) });
  y -= 18;

  const formEntries = Object.entries(formValues || {});
  if (formEntries.length === 0) {
    page.drawText("No form values were saved for this contract.", { x: margin, y: y - 10, size: 9, font, color: rgb(0.45, 0.48, 0.5) });
    y -= 18;
  } else {
    for (const [key, val] of formEntries) {
      if (y < margin + 80) {
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        y = pageHeight - margin;
      }
      const k = String(key || "") + ":";
      const v = String(val || "");
      page.drawText(k, { x: margin, y: y - 9, size: 9, font, color: rgb(0.2, 0.2, 0.2) });
      const lines = wrapTextLines(v, font, 9, pageWidth - margin * 2 - 120);
      let li = 0;
      for (const line of lines) {
        page.drawText(line, { x: margin + 110, y: y - 9 - li * 11, size: 9, font, color: rgb(0, 0, 0) });
        li++;
      }
      y -= Math.max(14, li * 11 + 6);
    }
  }

  // Parties table
  y -= 6;
  page.drawText("Parties", { x: margin, y: y - 12, size: 12, font, color: rgb(0.07, 0.12, 0.17) });
  y -= 18;

  if (!parties || parties.length === 0) {
    page.drawText("No party records found.", { x: margin, y: y - 10, size: 9, font, color: rgb(0.45, 0.48, 0.5) });
    y -= 18;
  } else {
    for (const party of parties) {
      if (y < margin + 80) {
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        y = pageHeight - margin;
      }
      const role = asText(party.role, "Signer");
      page.drawText(role, { x: margin, y: y - 9, size: 9, font, color: rgb(0, 0, 0) });
      page.drawText(asText(party.name || "Pending"), { x: margin + 130, y: y - 9, size: 9, font, color: rgb(0, 0, 0) });
      page.drawText(asText(party.email || "-"), { x: margin + 300, y: y - 9, size: 9, font, color: rgb(0, 0, 0) });
      y -= 14;
    }
  }

  // Signature Audit Trail
  y -= 8;
  page.drawText("Signature Audit Trail", { x: margin, y: y - 12, size: 12, font, color: rgb(0.07, 0.12, 0.17) });
  y -= 18;

  for (const signature of signatures) {
    if (y < margin + 120) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }

    const role = asText(signature.party_role || "Signer");
    const signer = asText(signature.signer_name || "-");
    const signedAt = signature?.signed_at ? formatTimestamp(signature.signed_at) : "Pending";
    const signerIp = asText(signature.signer_ip || "-");
    const docHash = asText(signature.doc_hash || "-");
    const signatureAlgorithm = asText(signature.signature_algorithm || "-");
    const certFingerprint = asText(signature.signing_cert_fingerprint || "-");

    page.drawText(role, { x: margin, y: y - 9, size: 11, font, color: rgb(0, 0, 0) });
    page.drawText(`Signer: ${signer}`, { x: margin, y: y - 24, size: 9, font, color: rgb(0.07, 0.12, 0.17) });
    page.drawText(`Signed At: ${signedAt}`, { x: margin + 220, y: y - 24, size: 9, font, color: rgb(0.07, 0.12, 0.17) });
    page.drawText(`Signer IP: ${signerIp}`, { x: margin, y: y - 38, size: 9, font, color: rgb(0.07, 0.12, 0.17) });
    page.drawText(`Doc Hash: ${docHash}`, { x: margin, y: y - 52, size: 8.5, font, color: rgb(0.07, 0.12, 0.17) });
    page.drawText(`Attestation: ${signatureAlgorithm} · Cert ${certFingerprint}`, { x: margin, y: y - 66, size: 8.5, font, color: rgb(0.07, 0.12, 0.17) });

    // Embed signature image if available
    const sigImageUrl = signatureImageUrls.get(asText(signature.id));
    if (sigImageUrl) {
      try {
        const embedded = await embedImageIfPossible(pdfDoc, sigImageUrl);
        if (embedded) {
          const imgDims = embedded.scale(0.5);
          const imgW = Math.min(220, embedded.width);
          const scale = imgW / embedded.width;
          const imgH = embedded.height * scale;
          page.drawImage(embedded, { x: pageWidth - margin - imgW, y: y - imgH + 6, width: imgW, height: imgH });
        }
      } catch (e) {
        // ignore image embed errors
      }
    }

    y -= 90;
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
