import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import ContractsCreateView from "./contracts/ContractsCreateView";
import ContractsSignView from "./contracts/ContractsSignView";
import ContractsDashboardView from "./contracts/ContractsDashboardView";
import {
  TEMPLATE_CONFIG,
  TEMPLATE_ORDER,
  UI_TO_DB_STATUS,
  toDbTemplate,
  toUiTemplate,
  toUiStatus,
  partyNameFromForm,
  buildContractName,
  sha256Hex,
  makeId,
  toNum,
  makeBlankForm,
  nowLabel,
  templateParties,
  contractBody,
  safeFilename,
  wrapText,
} from "./contracts/contractConfig";

const CONTRACTS_BUCKET = String(import.meta.env.VITE_CONTRACTS_BUCKET || "contracts").trim();
const EXECUTED_CONTRACT_WEBHOOK_URL = String(import.meta.env.VITE_EXECUTED_CONTRACT_WEBHOOK_URL || "/api/notify-contract").trim();

function isHttpUrl(value) {
  return /^https?:\/\//i.test(String(value || ""));
}

async function resolveStorageUrl(pathOrUrl, expiresInSeconds = 60 * 60) {
  if (!pathOrUrl) return "";
  if (isHttpUrl(pathOrUrl)) return pathOrUrl;
  if (!CONTRACTS_BUCKET) return "";

  try {
    const { data, error } = await supabase.storage.from(CONTRACTS_BUCKET).createSignedUrl(pathOrUrl, expiresInSeconds);
    if (error) return "";
    return data?.signedUrl || "";
  } catch {
    return "";
  }
}

export default function ContractsTab({ ctx }) {
  const { G, card, lbl, btnG, btnO, fmt, user, isMobile } = ctx;

  const [view, setView] = useState("dashboard");
  const [templateId, setTemplateId] = useState("assignment");
  const [editingId, setEditingId] = useState(null);
  const [activeId, setActiveId] = useState("");
  const [sigMode, setSigMode] = useState("type");
  const [typedName, setTypedName] = useState("");
  const [drawnReady, setDrawnReady] = useState(false);

  const defaultTemplate = TEMPLATE_CONFIG.assignment;
  const [formVals, setFormVals] = useState(() => makeBlankForm(defaultTemplate));
  const [contracts, setContracts] = useState([]);
  const [contractsLoading, setContractsLoading] = useState(true);
  const [contractsError, setContractsError] = useState("");
  const [saveBusy, setSaveBusy] = useState(false);
  const [signBusy, setSignBusy] = useState(false);
  const [deliveryNote, setDeliveryNote] = useState("");

  const canvasRef = useRef(null);
  const drawingRef = useRef(false);

  const activeTemplate = TEMPLATE_CONFIG[templateId] || defaultTemplate;
  const activeContract = contracts.find((contract) => contract.id === activeId) || null;

  const previewFee = useMemo(() => {
    if (templateId !== "assignment") return 0;
    return Math.round(toNum(formVals.assignmentFee) * 0.015);
  }, [formVals.assignmentFee, templateId]);

  const previewBody = useMemo(() => contractBody(activeTemplate, formVals), [activeTemplate, formVals]);

  const nextSigner = useMemo(() => {
    if (!activeContract) return null;
    return activeContract.parties.find((party) => party.status !== "Signed") || null;
  }, [activeContract]);

  const canApplySignature = sigMode === "type" ? typedName.trim().length > 2 : drawnReady;

  async function uploadDataUrlToStorage(path, dataUrl) {
    if (!CONTRACTS_BUCKET) {
      throw new Error("VITE_CONTRACTS_BUCKET is not configured for signature uploads.");
    }

    if (!dataUrl) {
      throw new Error("Missing signature image data.");
    }

    try {
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const { error } = await supabase.storage.from(CONTRACTS_BUCKET).upload(path, blob, { upsert: true, contentType: blob.type || "image/png" });
      if (error) {
        throw new Error(error.message || "Supabase signature upload failed");
      }
      return path;
    } catch (error) {
      throw new Error(error?.message || "Signature upload failed");
    }
  }

  async function uploadPdfToStorage(contractId, pdfBytes) {
    if (!CONTRACTS_BUCKET) {
      throw new Error("VITE_CONTRACTS_BUCKET is not configured for contract PDF uploads.");
    }

    if (!pdfBytes?.length) {
      throw new Error("No PDF bytes available for upload.");
    }

    if (!user?.id) {
      throw new Error("You must be logged in to upload contract PDFs.");
    }

    try {
      const path = `contracts/${contractId}/executed-${Date.now()}.pdf`;
      const { error } = await supabase.storage.from(CONTRACTS_BUCKET).upload(path, pdfBytes, { upsert: true, contentType: "application/pdf" });
      if (error) {
        throw new Error(error.message || "Supabase PDF upload failed");
      }

      const { error: updateError } = await supabase
        .from("contracts")
        .update({ pdf_url: path })
        .eq("id", contractId)
        .eq("creator_id", user.id);

      if (updateError) {
        throw new Error(updateError.message || "Failed to persist uploaded PDF path");
      }

      const signedUrl = await resolveStorageUrl(path, 60 * 60 * 24 * 7);
      if (!signedUrl) {
        throw new Error("PDF uploaded but failed to create signed URL");
      }

      return signedUrl;
    } catch (error) {
      throw new Error(error?.message || "PDF upload failed");
    }
  }

  async function buildContractPdfBytes(contract) {
    const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");

    const template = TEMPLATE_CONFIG[contract.templateId] || defaultTemplate;
    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage([612, 792]);
    const titleFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const bodyFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const signFont = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);

    let y = 760;
    const marginLeft = 42;

    const writeLine = (text, options = {}) => {
      const size = options.size || 10;
      const lineGap = options.gap || 14;
      page.drawText(String(text || ""), {
        x: options.x || marginLeft,
        y,
        size,
        font: options.font || bodyFont,
        color: options.color || rgb(0.12, 0.12, 0.12),
      });
      y -= lineGap;
    };

    writeLine("DEALBANK", { font: titleFont, size: 24, gap: 30 });
    writeLine("REAL ESTATE INVESTMENT PLATFORM", { font: bodyFont, size: 10, gap: 18 });
    writeLine(`Document: ${contract.name}`, { font: titleFont, size: 14, gap: 18 });
    writeLine(`Template: ${template.label}`, { font: bodyFont, size: 10 });
    writeLine(`Status: ${contract.status}`, { font: bodyFont, size: 10 });
    writeLine(`Generated: ${new Date().toLocaleString()}`, { font: bodyFont, size: 10 });
    writeLine(`Document Hash: ${contract.docHash || "pending"}`, { font: bodyFont, size: 9, gap: 18 });
    writeLine("This file includes immutable signature records from DealBank.", { font: bodyFont, size: 9, gap: 12 });

    page = pdfDoc.addPage([612, 792]);
    y = 760;

    writeLine("DealBank Contract", { font: titleFont, size: 16, gap: 20 });
    writeLine(`Contract: ${contract.name}`, { font: bodyFont, size: 11 });
    writeLine(`Template: ${template.label}`, { font: bodyFont, size: 10 });
    writeLine(`Status: ${contract.status}`, { font: bodyFont, size: 10 });
    writeLine(`Created: ${contract.created}`, { font: bodyFont, size: 10 });
    writeLine(`Doc Hash (SHA-256): ${contract.docHash || "pending"}`, { font: bodyFont, size: 9, gap: 18 });

    writeLine("Contract Terms", { font: titleFont, size: 12, gap: 16 });
    const bodyLines = contractBody(template, contract.formVals).split("\n");

    bodyLines.forEach((line) => {
      wrapText(line, 96).forEach((wrapped) => {
        if (y < 110) {
          y = 760;
          page = pdfDoc.addPage([612, 792]);
        }
        writeLine(wrapped, { font: bodyFont, size: 9, gap: 12 });
      });
    });

    y -= 8;
    writeLine("Signatures", { font: titleFont, size: 12, gap: 16 });

    for (const party of contract.parties) {
      if (y < 90) {
        y = 760;
        page = pdfDoc.addPage([612, 792]);
      }

      const lineTop = y;
      writeLine(`${party.role}: ${party.signerName || "Pending"}`, { font: bodyFont, size: 10, gap: 12 });
      writeLine(`Status: ${party.status}${party.signedAt ? ` at ${party.signedAt}` : ""}`, { font: bodyFont, size: 9, gap: 12 });

      if (party.status === "Signed") {
        if (party.signatureImageUrl) {
          try {
            const signatureUrl = await resolveStorageUrl(party.signatureImageUrl, 60 * 60 * 24);
            const response = await fetch(signatureUrl || party.signatureImageUrl);
            const bytes = await response.arrayBuffer();
            const contentType = String(response.headers.get("content-type") || "").toLowerCase();
            const lowerSource = String(signatureUrl || party.signatureImageUrl).toLowerCase();
            const image = contentType.includes("jpeg") || lowerSource.includes(".jpg") || lowerSource.includes("jpeg")
              ? await pdfDoc.embedJpg(bytes)
              : await pdfDoc.embedPng(bytes);
            page.drawImage(image, { x: 380, y: lineTop - 16, width: 150, height: 44 });
          } catch {
            page.drawText(party.signerName || "Signed", { x: 380, y: lineTop - 8, size: 16, font: signFont, color: rgb(0.14, 0.35, 0.18) });
          }
        } else {
          page.drawText(party.signerName || "Signed", { x: 380, y: lineTop - 8, size: 16, font: signFont, color: rgb(0.14, 0.35, 0.18) });
        }
      }

      y -= 10;
    }

    return pdfDoc.save();
  }

  async function notifyExecutedContractDelivery(contract, payload) {
    if (!EXECUTED_CONTRACT_WEBHOOK_URL) {
      return { delivered: false, reason: "delivery_webhook_not_configured" };
    }

    try {
      const response = await fetch(EXECUTED_CONTRACT_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractId: contract.id,
          contractName: contract.name,
          templateId: contract.templateId,
          status: contract.status,
          docHash: contract.docHash,
          pdfUrl: payload?.pdfUrl || contract.pdfUrl || "",
          parties: contract.parties.map((party) => ({
            role: party.role,
            signerName: party.signerName,
            email: party.email || "",
            status: party.status,
            signedAt: party.signedAt,
          })),
        }),
      });

      if (!response.ok) {
        const responseText = await response.text();
        const details = String(responseText || "").trim();
        return {
          delivered: false,
          reason: details ? `delivery_http_${response.status}: ${details.slice(0, 160)}` : `delivery_http_${response.status}`,
        };
      }

      return { delivered: true };
    } catch (error) {
      return { delivered: false, reason: error?.message || "delivery_request_failed" };
    }
  }

  const loadContracts = useCallback(async (options = {}) => {
    const { focusId = "", nextView = "", silent = false } = options;

    if (!user?.id) {
      setContracts([]);
      setContractsLoading(false);
      setContractsError("");
      setActiveId("");
      return [];
    }

    if (!silent) setContractsLoading(true);
    setContractsError("");

    try {
      const { data: contractRows, error: contractsQueryError } = await supabase
        .from("contracts")
        .select("id, template, status, title, fee_amount, fee_pct, created_at, pdf_url")
        .eq("creator_id", user.id)
        .order("created_at", { ascending: false });

      if (contractsQueryError) throw contractsQueryError;

      const contractIds = (contractRows || []).map((row) => row.id);
      let partyRows = [];
      let formRows = [];
      let signatureRows = [];

      if (contractIds.length > 0) {
        const [partyResult, formResult, signatureResult] = await Promise.all([
          supabase
            .from("contract_parties")
            .select("id, contract_id, role, name, email, party_order")
            .in("contract_id", contractIds)
            .order("party_order", { ascending: true }),
          supabase
            .from("contract_form_values")
            .select("contract_id, field_key, field_value")
            .in("contract_id", contractIds),
          supabase
            .from("contract_signatures")
            .select("id, contract_id, party_id, party_role, signer_name, signer_email, sig_method, signed_at, sig_image_url, doc_hash")
            .in("contract_id", contractIds)
            .order("signed_at", { ascending: false }),
        ]);

        if (partyResult.error) throw partyResult.error;
        if (formResult.error) throw formResult.error;
        if (signatureResult.error) throw signatureResult.error;

        partyRows = partyResult.data || [];
        formRows = formResult.data || [];
        signatureRows = signatureResult.data || [];
      }

      const partiesByContract = partyRows.reduce((acc, row) => {
        if (!acc[row.contract_id]) acc[row.contract_id] = [];
        acc[row.contract_id].push(row);
        return acc;
      }, {});

      const formsByContract = formRows.reduce((acc, row) => {
        if (!acc[row.contract_id]) acc[row.contract_id] = [];
        acc[row.contract_id].push(row);
        return acc;
      }, {});

      const signaturesByContract = signatureRows.reduce((acc, row) => {
        if (!acc[row.contract_id]) acc[row.contract_id] = [];
        acc[row.contract_id].push(row);
        return acc;
      }, {});

      const partyById = partyRows.reduce((acc, row) => {
        acc[row.id] = row;
        return acc;
      }, {});

      const parsedContracts = await Promise.all((contractRows || []).map(async (row) => {
        const uiTemplateId = toUiTemplate(row.template);
        const template = TEMPLATE_CONFIG[uiTemplateId] || defaultTemplate;

        const loadedFormVals = makeBlankForm(template);
        (formsByContract[row.id] || []).forEach((item) => {
          loadedFormVals[item.field_key] = item.field_value || "";
        });

        if (uiTemplateId === "assignment" && !loadedFormVals.assignmentFee && row.fee_amount != null) {
          loadedFormVals.assignmentFee = String(row.fee_amount);
        }

        const mappedParties = templateParties(template, user?.name).map((party, index) => {
          const partyRow = (partiesByContract[row.id] || []).find((item) => String(item.role || "").toLowerCase() === party.role.toLowerCase())
            || (partiesByContract[row.id] || []).find((item) => Number(item.party_order || 0) === index + 1);

          return {
            ...party,
            partyId: partyRow?.id || "",
            email: partyRow?.email || "",
            signerName: partyRow?.name || partyNameFromForm(uiTemplateId, party.role, loadedFormVals, index === 0 ? user?.name || party.role : ""),
          };
        });

        const auditTrail = [];
        (signaturesByContract[row.id] || []).forEach((signature) => {
          const role = signature.party_role || partyById[signature.party_id]?.role || "Signer";
          const signedAtLabel = signature.signed_at ? new Date(signature.signed_at).toLocaleString() : "";
          const matchedParty = mappedParties.find((party) => party.role.toLowerCase() === String(role).toLowerCase());

          if (matchedParty) {
            matchedParty.status = "Signed";
            matchedParty.signedAt = signedAtLabel;
            matchedParty.method = signature.sig_method || "";
            matchedParty.signerName = signature.signer_name || matchedParty.signerName;
            matchedParty.email = signature.signer_email || matchedParty.email;
            matchedParty.signatureImageUrl = signature.sig_image_url || "";
            matchedParty.docHash = signature.doc_hash || "";
          }

          auditTrail.push({
            id: signature.id || makeId("audit"),
            role,
            signerName: signature.signer_name || "-",
            signerEmail: signature.signer_email || "",
            method: signature.sig_method || "-",
            signedAt: signedAtLabel,
            signatureImageUrl: signature.sig_image_url || "",
            docHash: signature.doc_hash || "",
          });
        });

        const assignmentFee = uiTemplateId === "assignment"
          ? toNum(loadedFormVals.assignmentFee || row.fee_amount || 0)
          : 0;
        const feePctNum = Number(row.fee_pct || 1.5);
        const statusLabel = toUiStatus(row.status);
        const pdfPath = row.pdf_url || "";
        const resolvedPdfUrl = await resolveStorageUrl(pdfPath);

        return {
          id: row.id,
          name: row.title || buildContractName(template, loadedFormVals),
          templateId: uiTemplateId,
          status: statusLabel,
          created: row.created_at ? new Date(row.created_at).toLocaleDateString() : nowLabel(),
          feeAmount: Math.round(assignmentFee * (feePctNum / 100)),
          feePct: `${feePctNum}%`,
          pdfPath,
          pdfUrl: resolvedPdfUrl || (isHttpUrl(pdfPath) ? pdfPath : ""),
          docHash: auditTrail[0]?.docHash || "",
          formVals: loadedFormVals,
          parties: mappedParties,
          auditTrail,
        };
      }));

      setContracts(parsedContracts);
      setActiveId((prev) => {
        if (focusId) return focusId;
        if (prev && parsedContracts.some((item) => item.id === prev)) return prev;
        return parsedContracts[0]?.id || "";
      });
      if (nextView) setView(nextView);

      return parsedContracts;
    } catch (error) {
      setContractsError(error?.message || "Failed to load contracts.");
      return [];
    } finally {
      if (!silent) setContractsLoading(false);
    }
  }, [defaultTemplate, user?.id, user?.name]);

  useEffect(() => {
    if (!user?.id) {
      setContracts([]);
      setContractsLoading(false);
      setContractsError("");
      return;
    }

    loadContracts();
  }, [loadContracts, user?.id]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || view !== "sign" || sigMode !== "draw") return;
    const ctx2d = canvas.getContext("2d");
    if (!ctx2d) return;
    ctx2d.lineWidth = 2;
    ctx2d.lineCap = "round";
    ctx2d.lineJoin = "round";
    ctx2d.strokeStyle = G.green;
  }, [G.green, sigMode, view, activeId]);

  function resetToTemplate(nextTemplateId) {
    const template = TEMPLATE_CONFIG[nextTemplateId] || defaultTemplate;
    setTemplateId(nextTemplateId);
    setFormVals(makeBlankForm(template));
    setEditingId(null);
  }

  function openCreate(nextTemplateId, contract = null) {
    if (contract?.status === "Fully Executed" || (contract?.auditTrail || []).length > 0) return;

    if (contract) {
      setTemplateId(contract.templateId);
      setFormVals({ ...contract.formVals });
      setEditingId(contract.id);
    } else {
      resetToTemplate(nextTemplateId);
    }

    setContractsError("");
    setView("new");
  }

  async function saveContract(status) {
    if (!user?.id) {
      setContractsError("You must be logged in to save contracts.");
      return;
    }

    const template = TEMPLATE_CONFIG[templateId] || defaultTemplate;
    const assignmentFee = templateId === "assignment" ? toNum(formVals.assignmentFee) : 0;
    const dbTemplate = toDbTemplate(templateId);
    const dbStatus = UI_TO_DB_STATUS[status] || "draft";
    const title = buildContractName(template, formVals);
    const contractPayload = {
      template: dbTemplate,
      status: dbStatus,
      title,
      fee_amount: templateId === "assignment" ? assignmentFee : null,
      fee_pct: 1.5,
      executed_at: dbStatus === "fully_executed" ? new Date().toISOString() : null,
    };

    setSaveBusy(true);
    setContractsError("");

    try {
      let contractId = editingId;

      if (editingId) {
        const { error: updateError } = await supabase
          .from("contracts")
          .update(contractPayload)
          .eq("id", editingId)
          .eq("creator_id", user.id);

        if (updateError) throw updateError;
      } else {
        const { data: inserted, error: insertError } = await supabase
          .from("contracts")
          .insert({
            ...contractPayload,
            creator_id: user.id,
          })
          .select("id")
          .single();

        if (insertError) throw insertError;
        contractId = inserted.id;
      }

      const partyRows = template.parties.map((role, index) => ({
        contract_id: contractId,
        role,
        name: partyNameFromForm(templateId, role, formVals, index === 0 ? user?.name || role : ""),
        email: index === 0 ? user?.email || "" : "",
        phone: "",
        party_order: index + 1,
      }));

      const formRows = template.fields.map((field) => ({
        contract_id: contractId,
        field_key: field.key,
        field_value: String(formVals[field.key] || ""),
      }));

      const { error: clearPartyError } = await supabase
        .from("contract_parties")
        .delete()
        .eq("contract_id", contractId);
      if (clearPartyError) throw clearPartyError;

      if (partyRows.length > 0) {
        const { error: insertPartyError } = await supabase
          .from("contract_parties")
          .insert(partyRows);
        if (insertPartyError) throw insertPartyError;
      }

      const { error: clearFormError } = await supabase
        .from("contract_form_values")
        .delete()
        .eq("contract_id", contractId);
      if (clearFormError) throw clearFormError;

      if (formRows.length > 0) {
        const { error: insertFormError } = await supabase
          .from("contract_form_values")
          .insert(formRows);
        if (insertFormError) throw insertFormError;
      }

      const nextView = status === "Awaiting Signature" ? "sign" : "dashboard";
      await loadContracts({ focusId: status === "Awaiting Signature" ? contractId : "", nextView });

      if (status === "Awaiting Signature") {
        setSigMode("type");
        setTypedName("");
        setDrawnReady(false);
      }

      setEditingId(null);
    } catch (error) {
      setContractsError(error?.message || "Failed to save contract.");
    } finally {
      setSaveBusy(false);
    }
  }

  function openSign(contractId) {
    setContractsError("");
    setDeliveryNote("");
    setActiveId(contractId);
    setSigMode("type");
    setTypedName("");
    setDrawnReady(false);
    setView("sign");
  }

  function getPoint(event) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const source = event.touches ? event.touches[0] : event;
    return {
      x: source.clientX - rect.left,
      y: source.clientY - rect.top,
    };
  }

  function startDraw(event) {
    event.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx2d = canvas.getContext("2d");
    if (!ctx2d) return;
    const point = getPoint(event);
    drawingRef.current = true;
    ctx2d.beginPath();
    ctx2d.moveTo(point.x, point.y);
  }

  function drawLine(event) {
    event.preventDefault();
    if (!drawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx2d = canvas.getContext("2d");
    if (!ctx2d) return;
    const point = getPoint(event);
    ctx2d.lineTo(point.x, point.y);
    ctx2d.stroke();
    setDrawnReady(true);
  }

  function endDraw(event) {
    if (event) event.preventDefault();
    drawingRef.current = false;
  }

  function clearDrawnSignature() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx2d = canvas.getContext("2d");
    if (!ctx2d) return;
    ctx2d.clearRect(0, 0, canvas.width, canvas.height);
    setDrawnReady(false);
  }

  async function resolveSignerIp() {
    try {
      const response = await fetch("/api/get-client-ip", {
        method: "GET",
      });

      if (!response.ok) return "";

      const payload = await response.json().catch(() => null);
      const ip = String(payload?.ip || "").trim();
      return ip;
    } catch {
      return "";
    }
  }

  async function applySignature() {
    if (!user?.id) {
      setContractsError("You must be logged in to sign contracts.");
      return;
    }
    if (!activeContract || !nextSigner || !canApplySignature || signBusy) return;

    const signedAtIso = new Date().toISOString();
    const appliedName = sigMode === "type" ? typedName.trim() : `${nextSigner.role} (drawn)`;
    const method = sigMode === "type" ? "typed" : "drawn";
    const template = TEMPLATE_CONFIG[activeContract.templateId] || defaultTemplate;

    setSignBusy(true);
    setContractsError("");
    setDeliveryNote("");

    try {
      const fallbackEmailLocal = appliedName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ".")
        .replace(/^\.+|\.+$/g, "") || "signer";
      const signerEmail = user?.email || `${fallbackEmailLocal}@dealbank.local`;

      const docHash = await sha256Hex(JSON.stringify({
        contractId: activeContract.id,
        templateId: activeContract.templateId,
        contractBody: contractBody(template, activeContract.formVals),
        signerEmail,
        timestamp: signedAtIso,
      }));

      let signatureImageUrl = "";
      if (method === "drawn" && canvasRef.current) {
        const roleSlug = String(nextSigner.role || "signer").toLowerCase().replace(/[^a-z0-9]+/g, "-");
        const dataUrl = canvasRef.current.toDataURL("image/png");
        signatureImageUrl = await uploadDataUrlToStorage(`signatures/${activeContract.id}/${roleSlug}-${Date.now()}.png`, dataUrl);
      }

      const signerIp = await resolveSignerIp();

      const { error: signatureError } = await supabase
        .from("contract_signatures")
        .insert({
          contract_id: activeContract.id,
          party_id: nextSigner.partyId || null,
          signer_name: appliedName,
          signer_email: signerEmail,
          signer_ip: signerIp || null,
          signed_at: signedAtIso,
          sig_method: method,
          sig_image_url: signatureImageUrl || null,
          doc_hash: docHash,
          party_role: nextSigner.role,
        });

      if (signatureError) throw signatureError;

      const signedCount = activeContract.parties.filter((party) => party.status === "Signed").length + 1;
      const fullyExecuted = signedCount >= activeContract.parties.length;

      const { error: statusError } = await supabase
        .from("contracts")
        .update({
          status: fullyExecuted ? "fully_executed" : "partially_signed",
          executed_at: fullyExecuted ? signedAtIso : null,
        })
        .eq("id", activeContract.id)
        .eq("creator_id", user.id);

      if (statusError) throw statusError;

      const refreshedContracts = await loadContracts({ focusId: activeContract.id, nextView: "sign", silent: true });
      const refreshedContract = refreshedContracts.find((item) => item.id === activeContract.id);

      if (fullyExecuted && refreshedContract) {
        try {
          const pdfBytes = await buildContractPdfBytes({ ...refreshedContract, docHash });
          const uploadedPdfUrl = await uploadPdfToStorage(refreshedContract.id, pdfBytes);
          const deliveryResult = await notifyExecutedContractDelivery(
            { ...refreshedContract, docHash, pdfUrl: uploadedPdfUrl || refreshedContract.pdfUrl },
            { pdfUrl: uploadedPdfUrl || refreshedContract.pdfUrl },
          );

          if (deliveryResult.delivered) {
            setDeliveryNote("Contract fully executed. PDF generated and delivery webhook triggered.");
          } else {
            setDeliveryNote(`Contract fully executed. Delivery pending (${deliveryResult.reason}).`);
          }
        } catch (error) {
          setDeliveryNote(`Contract fully executed. Signature recorded, but PDF/email failed (${error?.message || "unknown error"}).`);
        }
      }

      setTypedName("");
      clearDrawnSignature();
    } catch (error) {
      setContractsError(error?.message || "Failed to apply signature.");
    } finally {
      setSignBusy(false);
    }
  }

  async function downloadContract(contract) {
    try {
      const pdfBytes = await buildContractPdfBytes(contract);

      if (contract.status === "Fully Executed") {
        try {
          const uploadedPdfUrl = await uploadPdfToStorage(contract.id, pdfBytes);
          if (uploadedPdfUrl) {
            setContracts((prev) => prev.map((item) => (item.id === contract.id ? { ...item, pdfUrl: uploadedPdfUrl } : item)));
          }
        } catch (error) {
          setContractsError(error?.message || "Failed to upload executed PDF to storage.");
        }
      }

      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const href = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = href;
      anchor.download = `${safeFilename(contract.name)}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(href);
    } catch {
      setContractsError("Failed to generate PDF contract.");
    }
  }

  if (view === "new") {
    return (
      <ContractsCreateView
        G={G}
        card={card}
        lbl={lbl}
        btnG={btnG}
        btnO={btnO}
        fmt={fmt}
        isMobile={isMobile}
        contractsError={contractsError}
        deliveryNote={deliveryNote}
        templateOrder={TEMPLATE_ORDER}
        templateConfig={TEMPLATE_CONFIG}
        templateId={templateId}
        editingId={editingId}
        saveBusy={saveBusy}
        activeTemplate={activeTemplate}
        formVals={formVals}
        previewFee={previewFee}
        previewBody={previewBody}
        onBack={() => { setView("dashboard"); setEditingId(null); }}
        onSelectTemplate={resetToTemplate}
        onFieldChange={(key, value) => setFormVals((prev) => ({ ...prev, [key]: value }))}
        onSaveDraft={() => saveContract("Draft")}
        onSaveAndSend={() => saveContract("Awaiting Signature")}
      />
    );
  }

  if (view === "sign" && activeContract) {
    const template = TEMPLATE_CONFIG[activeContract.templateId] || defaultTemplate;

    return (
      <ContractsSignView
        G={G}
        card={card}
        lbl={lbl}
        btnG={btnG}
        btnO={btnO}
        isMobile={isMobile}
        contractsError={contractsError}
        deliveryNote={deliveryNote}
        activeContract={activeContract}
        template={template}
        contractText={contractBody(template, activeContract.formVals)}
        nextSigner={nextSigner}
        sigMode={sigMode}
        typedName={typedName}
        canApplySignature={canApplySignature}
        signBusy={signBusy}
        canvasRef={canvasRef}
        onBack={() => setView("dashboard")}
        onSigModeChange={setSigMode}
        onTypedNameChange={setTypedName}
        onStartDraw={startDraw}
        onDrawLine={drawLine}
        onEndDraw={endDraw}
        onClearDrawnSignature={clearDrawnSignature}
        onApplySignature={applySignature}
        onDownloadContract={() => downloadContract(activeContract)}
      />
    );
  }

  return (
    <ContractsDashboardView
      G={G}
      card={card}
      lbl={lbl}
      btnG={btnG}
      btnO={btnO}
      fmt={fmt}
      isMobile={isMobile}
      contractsError={contractsError}
      deliveryNote={deliveryNote}
      contractsLoading={contractsLoading}
      contracts={contracts}
      templateOrder={TEMPLATE_ORDER}
      templateConfig={TEMPLATE_CONFIG}
      defaultTemplate={defaultTemplate}
      onCreateNew={(nextTemplateId) => openCreate(nextTemplateId)}
      onEditAndSend={(contract) => openCreate(contract.templateId, contract)}
      onOpenSign={openSign}
      onDownloadPdf={downloadContract}
    />
  );
}
