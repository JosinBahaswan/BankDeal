/* Improved pure-JS PDF generator using pdf-lib (serverless-friendly)
 * Refined layout:
 * - Minimal header with title left and contract id right
 * - Two-column content: left for Form Values & Parties, right for Signature Audit Trail
 * - Tighter spacing and improved wrapping
 */
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { Buffer } from "buffer";
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
  });
}

async function fetchImageBytes(url) {
  if (!url) return null;
  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const buf = await resp.arrayBuffer();
    return { buffer: new Uint8Array(buf), contentType: String(resp.headers.get("content-type") || "") };
  } catch {
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
  } catch {
    try { return await pdfDoc.embedPng(img.buffer); } catch { return null; }
  }
}

export async function renderBundlePdfWithPdfLib(bundle) {
  const pdfDoc = await PDFDocument.create();

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  let boldFont;
  try { boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold); } catch { boldFont = font; }

  const pageWidth = 612; // Letter
  const pageHeight = 792;
  const margin = 44;

  const accent = rgb(0.09, 0.45, 0.82);
  const muted = rgb(0.48, 0.52, 0.56);
  const dark = rgb(0.06, 0.09, 0.14);

  let page = pdfDoc.addPage([pageWidth, pageHeight]);

  const contract = bundle?.contract || {};
  const parties = Array.isArray(bundle?.parties) ? bundle.parties : [];
  const signatures = Array.isArray(bundle?.signatures) ? bundle.signatures : [];
  const formValues = bundle?.formValues || {};
  const signatureImageUrls = bundle?.signatureImageUrls instanceof Map ? bundle.signatureImageUrls : new Map();

  // Header: title left, contract id right
  const title = asText(contract.title || `DealBank ${asText(bundle?.templateName || contract.template || '')}`);
  const contractId = asText(contract.id || '');
  page.drawText(title, { x: margin, y: pageHeight - margin - 2, size: 20, font: boldFont, color: dark });
  if (contractId) {
    const idW = font.widthOfTextAtSize(contractId, 9);
    page.drawText(contractId, { x: pageWidth - margin - idW, y: pageHeight - margin + 6, size: 9, font, color: muted });
  }
  // thin accent rule under title
  page.drawRectangle({ x: margin, y: pageHeight - margin - 8, width: 84, height: 4, color: accent });

  // show status + created/executed under title
  const status = asText(contract.status || 'Draft');
  page.drawText(status, { x: margin, y: pageHeight - margin - 18, size: 10, font: font, color: muted });
  const created = formatTimestamp(contract.created_at);
  page.drawText(`Created: ${created}`, { x: margin + 100, y: pageHeight - margin - 18, size: 9, font, color: muted });
  const executed = formatTimestamp(contract.executed_at);
  page.drawText(`Executed: ${executed}`, { x: margin + 220, y: pageHeight - margin - 18, size: 9, font, color: muted });

  // Set up two-column layout
  const leftColX = margin;
  const leftColWidth = 360;
  const rightColX = leftColX + leftColWidth + 18;
  const rightColWidth = pageWidth - margin - rightColX;

  let leftY = pageHeight - margin - 36;
  let rightY = leftY;

  // Form values (left column)
  page.drawText('Form Values', { x: leftColX, y: leftY, size: 14, font: boldFont, color: dark });
  leftY -= 18;

  const entries = Object.entries(formValues || {});
  if (entries.length === 0) {
    page.drawText('No form values saved.', { x: leftColX, y: leftY - 6, size: 9, font, color: muted });
    leftY -= 18;
  } else {
    const labelW = 120;
    for (const [k, v] of entries) {
      if (leftY < margin + 80) { page = pdfDoc.addPage([pageWidth, pageHeight]); leftY = pageHeight - margin; rightY = leftY; }
      page.drawText(`${k}:`, { x: leftColX, y: leftY - 6, size: 10, font: boldFont, color: muted });
      const lines = wrapTextLines(String(v || ''), font, 10, leftColWidth - labelW - 8);
      for (let i = 0; i < lines.length; i++) {
        page.drawText(lines[i], { x: leftColX + labelW, y: leftY - 6 - i * 12, size: 10, font, color: dark });
      }
      leftY -= Math.max(16, lines.length * 12 + 6);
    }
  }

  // Parties (left column)
  leftY -= 6;
  page.drawText('Parties', { x: leftColX, y: leftY, size: 14, font: boldFont, color: dark });
  leftY -= 18;
  if (!parties || parties.length === 0) {
    page.drawText('No party records found.', { x: leftColX, y: leftY, size: 9, font, color: muted });
    leftY -= 18;
  } else {
    const roleW = 80;
    const nameW = 160;
    for (const p of parties) {
      if (leftY < margin + 60) { page = pdfDoc.addPage([pageWidth, pageHeight]); leftY = pageHeight - margin; rightY = leftY; }
      page.drawText(asText(p.role || 'Signer'), { x: leftColX, y: leftY - 6, size: 11, font: boldFont, color: dark });
      page.drawText(asText(p.name || 'Pending'), { x: leftColX + roleW + 6, y: leftY - 6, size: 10, font, color: dark });
      page.drawText(asText(p.email || '-'), { x: leftColX + roleW + nameW + 12, y: leftY - 6, size: 10, font, color: muted });
      leftY -= 16;
    }
  }

  // Signature Audit Trail (right column)
  rightY -= 6;
  page.drawText('Signature Audit Trail', { x: rightColX, y: rightY, size: 14, font: boldFont, color: dark });
  rightY -= 18;

  for (const sig of signatures) {
    if (rightY < margin + 120) { page = pdfDoc.addPage([pageWidth, pageHeight]); rightY = pageHeight - margin; leftY = Math.min(leftY, rightY); }
    const cardH = 110;
    page.drawRectangle({ x: rightColX, y: rightY - cardH, width: rightColWidth, height: cardH, color: rgb(0.995, 0.995, 0.997) });

    const role = asText(sig.party_role || 'Signer');
    const signer = asText(sig.signer_name || '-');
    const signedAt = sig?.signed_at ? formatTimestamp(sig.signed_at) : 'Pending';
    const signerIp = asText(sig.signer_ip || '-');
    const docHash = asText(sig.doc_hash || '-');
    const signatureAlgorithm = asText(sig.signature_algorithm || '-');

    const innerX = rightColX + 8;
    page.drawText(role, { x: innerX, y: rightY - 18, size: 11, font: boldFont, color: accent });
    page.drawText(`Signer: ${signer}`, { x: innerX, y: rightY - 34, size: 10, font, color: dark });
    page.drawText(`Signed: ${signedAt}`, { x: innerX, y: rightY - 50, size: 9, font, color: muted });
    page.drawText(`IP: ${signerIp}`, { x: innerX, y: rightY - 66, size: 9, font, color: muted });
    page.drawText(`Alg: ${signatureAlgorithm}`, { x: innerX, y: rightY - 82, size: 8.5, font, color: muted });
    page.drawText(`Doc: ${docHash}`, { x: innerX, y: rightY - 96, size: 8, font, color: muted });

    // signature image (right side of card)
    const sigImageUrl = signatureImageUrls.get(asText(sig.id));
    if (sigImageUrl) {
      try {
        const embedded = await embedImageIfPossible(pdfDoc, sigImageUrl);
        if (embedded) {
          const maxW = Math.min(140, rightColWidth * 0.45);
          const imgW = Math.min(maxW, embedded.width || maxW);
          const scale = imgW / (embedded.width || imgW);
          const imgH = (embedded.height || imgW) * scale;
          page.drawImage(embedded, { x: rightColX + rightColWidth - imgW - 8, y: rightY - 16 - imgH, width: imgW, height: imgH });
        }
      } catch { /* ignore image errors */ }
    }

    rightY -= cardH + 10;
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
