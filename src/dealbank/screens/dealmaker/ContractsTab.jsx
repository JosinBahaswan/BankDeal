import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import ContractsCreateView from "./contracts/ContractsCreateView";
import ContractsSignView from "./contracts/ContractsSignView";
import ContractsDashboardView from "./contracts/ContractsDashboardView";
import ContractsEscrowPaymentPanel from "./contracts/ContractsEscrowPaymentPanel";
import {
  createSignatureAttestation,
  downloadContractPdfBlob,
  generateAndPersistContractPdf,
  triggerExecutedContractDelivery,
} from "./contracts/contractsDeliveryApi";
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
} from "./contracts/contractConfig";

const CONTRACTS_BUCKET = String(import.meta.env.VITE_CONTRACTS_BUCKET || "contracts").trim();

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
            .select("id, contract_id, party_id, party_role, signer_name, signer_email, signer_ip, sig_method, signed_at, sig_image_url, doc_hash, signature_algorithm, signing_cert_fingerprint")
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
            signerIp: signature.signer_ip || "",
            method: signature.sig_method || "-",
            signedAt: signedAtLabel,
            signatureImageUrl: signature.sig_image_url || "",
            docHash: signature.doc_hash || "",
            signatureAlgorithm: signature.signature_algorithm || "",
            signingCertFingerprint: signature.signing_cert_fingerprint || "",
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

  useEffect(() => {
    try {
      const prefill = ctx?.contractsPrefill;
      if (prefill) {
        const nextTemplate = prefill.templateId || (prefill.contract && prefill.contract.templateId) || "assignment";
        const contractObj = prefill.contract || { templateId: nextTemplate, formVals: prefill.formVals || {} };
        openCreate(nextTemplate, contractObj);
        if (ctx.setContractsPrefill) ctx.setContractsPrefill(null);
      }
    } catch {
      // no-op
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx?.contractsPrefill]);

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

      const attestation = await createSignatureAttestation({
        contractId: activeContract.id,
        partyRole: nextSigner.role,
        signerName: appliedName,
        signerEmail,
        sigMethod: method,
        signedAt: signedAtIso,
        docHash,
      });

      const { error: signatureError } = await supabase
        .from("contract_signatures")
        .insert({
          contract_id: activeContract.id,
          party_id: nextSigner.partyId || null,
          signer_user_id: user.id,
          signer_name: appliedName,
          signer_email: signerEmail,
          signer_ip: attestation?.signerIp || null,
          signed_at: signedAtIso,
          server_signed_at: attestation?.serverSignedAt || signedAtIso,
          sig_method: method,
          sig_image_url: signatureImageUrl || null,
          doc_hash: docHash,
          party_role: nextSigner.role,
          signature_algorithm: attestation?.algorithm || "RS256",
          signature_payload: attestation?.signaturePayload || "",
          signature_value: attestation?.signatureValue || "",
          signing_cert_fingerprint: attestation?.certFingerprint || null,
          signing_cert_pem: attestation?.certPem || null,
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
          const pdfResult = await generateAndPersistContractPdf(refreshedContract.id);
          const uploadedPdfUrl = String(pdfResult?.pdfUrl || refreshedContract.pdfUrl || "").trim();

          if (uploadedPdfUrl) {
            setContracts((prev) => prev.map((item) => (
              item.id === refreshedContract.id
                ? {
                    ...item,
                    pdfPath: String(pdfResult?.pdfPath || item.pdfPath || ""),
                    pdfUrl: uploadedPdfUrl,
                  }
                : item
            )));
          }

          const deliveryResult = await triggerExecutedContractDelivery({
            contractId: refreshedContract.id,
            pdfUrl: uploadedPdfUrl,
          });

          if (deliveryResult.delivered) {
            setDeliveryNote("Contract fully executed. Server PDF generated and delivery emails sent.");
          } else {
            setDeliveryNote(`Contract fully executed. Delivery retry is queued for pending recipients (${deliveryResult.pendingCount || 0}).`);
          }
        } catch (error) {
          setDeliveryNote(`Contract fully executed. Signature recorded, but PDF/email pipeline failed (${error?.message || "unknown error"}).`);
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
      if (contract.status === "Fully Executed") {
        try {
          const persisted = await generateAndPersistContractPdf(contract.id);
          const uploadedPdfUrl = String(persisted?.pdfUrl || "").trim();
          if (uploadedPdfUrl || persisted?.pdfPath) {
            setContracts((prev) => prev.map((item) => (
              item.id === contract.id
                ? {
                    ...item,
                    pdfPath: String(persisted?.pdfPath || item.pdfPath || ""),
                    pdfUrl: uploadedPdfUrl || item.pdfUrl,
                  }
                : item
            )));
          }
        } catch (error) {
          setContractsError(error?.message || "Failed to persist executed PDF to storage.");
        }
      }

      const blob = await downloadContractPdfBlob(contract.id);
      const href = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = href;
      anchor.download = `${safeFilename(contract.name)}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(href);
    } catch (error) {
      setContractsError(error?.message || "Failed to generate PDF contract.");
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
        escrowPaymentPanel={(
          <ContractsEscrowPaymentPanel
            G={G}
            card={card}
            lbl={lbl}
            btnG={btnG}
            btnO={btnO}
            activeContract={activeContract}
          />
        )}
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
