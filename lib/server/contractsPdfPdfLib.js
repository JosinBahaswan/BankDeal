/* Improved pure-JS PDF generator using pdf-lib (serverless-friendly)
 * Refined layout for Production-Ready "End-to-End" usage:
 * - Premium single-column layout with professional typography
 * - Formal header and document metadata block
 * - Proper pagination and footer (Document ID, Page Number)
 * - Structured Contract Details (Form Values) and Parties
 * - "Certificate of Completion" Audit Trail section for signatures
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
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
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

  const pageWidth = 612; // Letter width
  const pageHeight = 792; // Letter height
  const margin = 50;
  const contentWidth = pageWidth - margin * 2;

  // Premium Color Palette
  const brandPrimary = rgb(0.04, 0.20, 0.40); // Deep Navy
  const accent = rgb(0.09, 0.45, 0.82); // DealBank Blue
  const darkText = rgb(0.12, 0.12, 0.15); // Almost Black
  const mutedText = rgb(0.45, 0.48, 0.52); // Gray
  const borderGray = rgb(0.88, 0.90, 0.92); // Light Gray
  const bgGray = rgb(0.97, 0.97, 0.98); // Off-White

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let pageNumber = 1;
  const contractId = asText(bundle?.contract?.id || '');

  // Footer helper
  function drawFooter(p, pNum) {
    p.drawLine({ start: { x: margin, y: margin - 10 }, end: { x: pageWidth - margin, y: margin - 10 }, thickness: 0.5, color: borderGray });
    p.drawText(`DealBank Document ID: ${contractId}`, { x: margin, y: margin - 25, size: 8, font, color: mutedText });
    p.drawText(`Page ${pNum}`, { x: pageWidth - margin - 30, y: margin - 25, size: 8, font, color: mutedText });
  }
  
  drawFooter(page, pageNumber);

  let currentY = pageHeight - margin;

  function checkPageBreak(requiredSpace) {
    if (currentY - requiredSpace < margin + 20) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      pageNumber++;
      drawFooter(page, pageNumber);
      currentY = pageHeight - margin - 20; // Extra padding at top of new page
      return true;
    }
    return false;
  }

  function drawSectionHeader(title) {
    checkPageBreak(40);
    currentY -= 10;
    page.drawText(title.toUpperCase(), { x: margin, y: currentY, size: 11, font: boldFont, color: brandPrimary });
    currentY -= 8;
    page.drawLine({ start: { x: margin, y: currentY }, end: { x: pageWidth - margin, y: currentY }, thickness: 1.5, color: brandPrimary });
    currentY -= 15;
  }

  const contract = bundle?.contract || {};
  const parties = Array.isArray(bundle?.parties) ? bundle.parties : [];
  const signatures = Array.isArray(bundle?.signatures) ? bundle.signatures : [];
  const formValues = bundle?.formValues || {};
  const signatureImageUrls = bundle?.signatureImageUrls instanceof Map ? bundle.signatureImageUrls : new Map();

  // --- HEADER / COVER BLOCK ---
  page.drawText("DEALBANK", { x: margin, y: currentY, size: 14, font: boldFont, color: accent });
  currentY -= 25;
  
  const titleText = asText(contract.title || `DealBank ${asText(bundle?.templateName || contract.template || 'Contract')}`);
  const titleLines = wrapTextLines(titleText, boldFont, 22, contentWidth);
  for (const line of titleLines) {
    page.drawText(line, { x: margin, y: currentY, size: 22, font: boldFont, color: darkText });
    currentY -= 28;
  }
  currentY -= 10;

  // Metadata Box
  const status = asText(contract.status || 'Draft').toUpperCase();
  const created = formatTimestamp(contract.created_at);
  const executed = formatTimestamp(contract.executed_at);
  const docHash = asText(bundle.docHash || 'Pending Signature');

  page.drawRectangle({ x: margin, y: currentY - 60, width: contentWidth, height: 70, color: bgGray, borderColor: borderGray, borderWidth: 1 });
  
  page.drawText("STATUS", { x: margin + 15, y: currentY - 10, size: 8, font: boldFont, color: mutedText });
  page.drawText(status, { x: margin + 15, y: currentY - 24, size: 10, font: boldFont, color: status === 'EXECUTED' ? rgb(0.1, 0.6, 0.3) : darkText });

  page.drawText("CREATED ON", { x: margin + 120, y: currentY - 10, size: 8, font: boldFont, color: mutedText });
  page.drawText(created, { x: margin + 120, y: currentY - 24, size: 10, font, color: darkText });

  page.drawText("EXECUTED ON", { x: margin + 300, y: currentY - 10, size: 8, font: boldFont, color: mutedText });
  page.drawText(executed, { x: margin + 300, y: currentY - 24, size: 10, font, color: darkText });

  page.drawText("DOCUMENT HASH", { x: margin + 15, y: currentY - 40, size: 8, font: boldFont, color: mutedText });
  page.drawText(docHash, { x: margin + 15, y: currentY - 52, size: 9, font, color: mutedText });

  currentY -= 90;

  // --- CONTRACT DETAILS (FORM VALUES) ---
  drawSectionHeader("Contract Details");
  const entries = Object.entries(formValues || {});
  if (entries.length === 0) {
    page.drawText('No specific terms recorded.', { x: margin, y: currentY, size: 10, font, color: mutedText });
    currentY -= 20;
  } else {
    const labelW = 160;
    for (const [k, v] of entries) {
      const valText = String(v || '-');
      const lines = wrapTextLines(valText, font, 10, contentWidth - labelW - 10);
      const rowHeight = Math.max(20, lines.length * 14 + 10);
      
      checkPageBreak(rowHeight);
      
      // Zebra striping or subtle divider could go here
      page.drawText(k, { x: margin, y: currentY - 12, size: 10, font: boldFont, color: darkText });
      for (let i = 0; i < lines.length; i++) {
        page.drawText(lines[i], { x: margin + labelW, y: currentY - 12 - i * 14, size: 10, font, color: darkText });
      }
      
      currentY -= rowHeight;
      page.drawLine({ start: { x: margin, y: currentY + 4 }, end: { x: pageWidth - margin, y: currentY + 4 }, thickness: 0.5, color: bgGray });
    }
    currentY -= 10;
  }

  // --- PARTIES ---
  drawSectionHeader("Participating Parties");
  if (!parties || parties.length === 0) {
    page.drawText('No party records found.', { x: margin, y: currentY, size: 10, font, color: mutedText });
    currentY -= 20;
  } else {
    const colRole = margin;
    const colName = margin + 140;
    const colEmail = margin + 300;

    // Header row
    page.drawText("ROLE", { x: colRole, y: currentY, size: 9, font: boldFont, color: mutedText });
    page.drawText("NAME", { x: colName, y: currentY, size: 9, font: boldFont, color: mutedText });
    page.drawText("EMAIL", { x: colEmail, y: currentY, size: 9, font: boldFont, color: mutedText });
    currentY -= 15;

    for (const p of parties) {
      checkPageBreak(25);
      page.drawText(asText(p.role || 'Signer'), { x: colRole, y: currentY, size: 10, font: boldFont, color: darkText });
      page.drawText(asText(p.name || 'Pending'), { x: colName, y: currentY, size: 10, font, color: darkText });
      page.drawText(asText(p.email || '-'), { x: colEmail, y: currentY, size: 10, font, color: mutedText });
      currentY -= 20;
    }
    currentY -= 10;
  }

  // --- CERTIFICATE OF COMPLETION (AUDIT TRAIL) ---
  // Ensure Audit Trail starts nicely
  checkPageBreak(100);
  currentY -= 20;
  
  page.drawText("CERTIFICATE OF COMPLETION", { x: margin, y: currentY, size: 14, font: boldFont, color: darkText });
  currentY -= 15;
  page.drawText("Signature Audit Trail", { x: margin, y: currentY, size: 10, font, color: mutedText });
  currentY -= 20;

  if (signatures.length === 0) {
    page.drawText("No signatures have been recorded yet.", { x: margin, y: currentY, size: 10, font, color: mutedText });
  } else {
    for (const sig of signatures) {
      const cardH = 120;
      checkPageBreak(cardH + 20);

      // Card Background
      page.drawRectangle({ 
        x: margin, 
        y: currentY - cardH, 
        width: contentWidth, 
        height: cardH, 
        color: rgb(1, 1, 1), 
        borderColor: borderGray, 
        borderWidth: 1 
      });

      const role = asText(sig.party_role || 'Signer');
      const signer = asText(sig.signer_name || '-');
      const signerEmail = asText(sig.signer_email || '-');
      const signedAt = sig?.signed_at ? formatTimestamp(sig.signed_at) : 'Pending';
      const signerIp = asText(sig.signer_ip || '-');
      const docHashSig = asText(sig.doc_hash || '-');

      const innerX = margin + 15;
      let textY = currentY - 20;

      page.drawText(role.toUpperCase(), { x: innerX, y: textY, size: 10, font: boldFont, color: accent });
      textY -= 18;
      
      page.drawText(signer, { x: innerX, y: textY, size: 12, font: boldFont, color: darkText });
      page.drawText(`<${signerEmail}>`, { x: innerX + font.widthOfTextAtSize(signer, 12) + 5, y: textY, size: 10, font, color: mutedText });
      textY -= 16;

      page.drawText("Signed At:", { x: innerX, y: textY, size: 9, font: boldFont, color: mutedText });
      page.drawText(signedAt, { x: innerX + 60, y: textY, size: 9, font, color: darkText });
      textY -= 14;

      page.drawText("IP Address:", { x: innerX, y: textY, size: 9, font: boldFont, color: mutedText });
      page.drawText(signerIp, { x: innerX + 60, y: textY, size: 9, font, color: darkText });
      textY -= 14;

      page.drawText("Doc Hash:", { x: innerX, y: textY, size: 9, font: boldFont, color: mutedText });
      page.drawText(docHashSig, { x: innerX + 60, y: textY, size: 8, font, color: mutedText });

      // Signature Image
      const sigImageUrl = signatureImageUrls.get(asText(sig.id));
      if (sigImageUrl) {
        try {
          const embedded = await embedImageIfPossible(pdfDoc, sigImageUrl);
          if (embedded) {
            const maxW = 160;
            const maxH = 80;
            const imgRatio = embedded.width / embedded.height;
            let imgW = maxW;
            let imgH = imgW / imgRatio;
            if (imgH > maxH) {
              imgH = maxH;
              imgW = imgH * imgRatio;
            }
            page.drawImage(embedded, { 
              x: margin + contentWidth - imgW - 15, 
              y: currentY - cardH + (cardH - imgH) / 2, 
              width: imgW, 
              height: imgH 
            });
            // "eSigned" watermark or tag
            page.drawText("eSigned", { 
              x: margin + contentWidth - imgW - 15, 
              y: currentY - cardH + (cardH - imgH) / 2 - 10, 
              size: 8, font: boldFont, color: accent 
            });
          }
        } catch { /* ignore image errors */ }
      }

      currentY -= (cardH + 15);
    }
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

