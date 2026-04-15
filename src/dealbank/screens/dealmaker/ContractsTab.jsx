import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";

const TEMPLATE_CONFIG = {
  assignment: {
    id: "assignment",
    label: "Assignment Agreement",
    summary: "Assign an existing purchase contract to another buyer.",
    parties: ["Assignor", "Assignee"],
    fields: [
      { key: "assignor", label: "Assignor Name", placeholder: "Ray Torres" },
      { key: "assignee", label: "Assignee Name", placeholder: "Pacific Equity Group" },
      { key: "propertyAddress", label: "Property Address", placeholder: "1842 Maple St, Sacramento, CA" },
      { key: "purchasePrice", label: "Purchase Price", placeholder: "195000", prefix: "$" },
      { key: "assignmentFee", label: "Assignment Fee", placeholder: "12000", prefix: "$" },
      { key: "earnestMoney", label: "Earnest Money", placeholder: "2500", prefix: "$" },
      { key: "closeDate", label: "Close Date", placeholder: "May 30, 2026" },
      { key: "titleCompany", label: "Title Company", placeholder: "Capital Valley Title" },
    ],
    clauses: [
      "Assignor represents equitable interest in the purchase contract and right to assign.",
      "Assignee agrees to perform all obligations required under the original contract.",
      "Inspection period, access terms, and seller communication follow the source contract.",
      "Section A3: Both parties authorize the closing agent to disburse 1.5% of the assignment fee to DealBank LLC at closing.",
      "Any default by either party follows state contract law and venue in the county of property location.",
    ],
  },
  purchase: {
    id: "purchase",
    label: "Cash Purchase & Sale",
    summary: "Straight cash purchase agreement between buyer and seller.",
    parties: ["Buyer", "Seller"],
    fields: [
      { key: "buyer", label: "Buyer Name", placeholder: "Cash Offers LLC" },
      { key: "seller", label: "Seller Name", placeholder: "Maria Ortega" },
      { key: "propertyAddress", label: "Property Address", placeholder: "4402 Elmwood Ct, Modesto, CA" },
      { key: "purchasePrice", label: "Purchase Price", placeholder: "172000", prefix: "$" },
      { key: "earnestMoney", label: "Earnest Money", placeholder: "3000", prefix: "$" },
      { key: "closeDate", label: "Close Date", placeholder: "June 15, 2026" },
      { key: "titleCompany", label: "Title Company", placeholder: "North State Escrow" },
      { key: "condition", label: "Property Condition", placeholder: "As-Is" },
    ],
    clauses: [
      "Buyer purchases property as-is with right to reasonable access during due diligence.",
      "Seller agrees to provide marketable title at closing.",
      "Earnest money is credited to buyer at close and refundable only per contract contingencies.",
      "Close date may be extended by mutual written agreement.",
    ],
  },
  jointventure: {
    id: "jointventure",
    label: "Joint Venture Agreement",
    summary: "Partnership agreement for acquisition, rehab, and disposition.",
    parties: ["Partner A", "Partner B"],
    fields: [
      { key: "partnerA", label: "Partner A", placeholder: "Cash Offers LLC" },
      { key: "partnerB", label: "Partner B", placeholder: "Central Valley Investments" },
      { key: "propertyAddress", label: "Target Property", placeholder: "2891 Vista Canyon Rd, Bakersfield, CA" },
      { key: "capitalCommitment", label: "Capital Commitment", placeholder: "85000", prefix: "$" },
      { key: "profitSplit", label: "Profit Split", placeholder: "60/40" },
      { key: "projectTimeline", label: "Timeline", placeholder: "120 days" },
      { key: "managementRole", label: "Management Role", placeholder: "Partner A manages rehab" },
      { key: "exitPlan", label: "Exit Plan", placeholder: "Retail resale" },
    ],
    clauses: [
      "Each partner funds and performs responsibilities as listed in schedule A.",
      "Major decisions require mutual consent in writing.",
      "Profit and loss allocation follows agreed split after costs and debt service.",
      "Disputes require mediation before arbitration.",
    ],
  },
};

const TEMPLATE_ORDER = ["assignment", "purchase", "jointventure"];

const UI_TO_DB_TEMPLATE = {
  assignment: "assignment",
  purchase: "cash_purchase",
  jointventure: "joint_venture",
};

const DB_TO_UI_TEMPLATE = {
  assignment: "assignment",
  cash_purchase: "purchase",
  joint_venture: "jointventure",
};

const UI_TO_DB_STATUS = {
  Draft: "draft",
  "Awaiting Signature": "sent",
  "Fully Executed": "fully_executed",
  Voided: "voided",
};

function toDbTemplate(templateId) {
  return UI_TO_DB_TEMPLATE[templateId] || "assignment";
}

function toUiTemplate(templateId) {
  return DB_TO_UI_TEMPLATE[templateId] || "assignment";
}

function toUiStatus(status) {
  if (status === "draft") return "Draft";
  if (status === "fully_executed") return "Fully Executed";
  if (status === "voided") return "Voided";
  return "Awaiting Signature";
}

function roleFieldKey(templateId, role) {
  if (templateId === "assignment") {
    if (role === "Assignor") return "assignor";
    if (role === "Assignee") return "assignee";
  }
  if (templateId === "purchase") {
    if (role === "Buyer") return "buyer";
    if (role === "Seller") return "seller";
  }
  if (templateId === "jointventure") {
    if (role === "Partner A") return "partnerA";
    if (role === "Partner B") return "partnerB";
  }
  return "";
}

function partyNameFromForm(templateId, role, formVals, fallbackName = "") {
  const fieldKey = roleFieldKey(templateId, role);
  if (fieldKey && formVals[fieldKey]) return String(formVals[fieldKey]);
  return fallbackName;
}

function buildContractName(template, formVals) {
  const fallbackAddress = formVals.propertyAddress || "Untitled Property";
  return `${template.label.split(" ")[0]} - ${fallbackAddress.split(",")[0]}`;
}

async function sha256Hex(input) {
  try {
    if (globalThis.crypto?.subtle) {
      const bytes = new TextEncoder().encode(input);
      const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
      return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    }
  } catch {
    // no-op
  }

  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = ((hash << 5) - hash + input.charCodeAt(index)) | 0;
  }
  return `fallback-${Math.abs(hash)}`;
}

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

function toNum(value) {
  return Number(String(value || "").replace(/[^0-9.]/g, "")) || 0;
}

function makeBlankForm(template) {
  const next = {};
  template.fields.forEach((field) => {
    next[field.key] = "";
  });
  return next;
}

function nowLabel() {
  return new Date().toLocaleDateString();
}

function templateParties(template, userName) {
  return template.parties.map((role, index) => ({
    partyId: "",
    role,
    signerName: index === 0 ? userName || role : "",
    status: "Waiting",
    signedAt: "",
    method: "",
  }));
}

function contractBody(template, formVals) {
  const lines = template.clauses.map((clause, index) => `${index + 1}. ${clause}`);
  const fieldLines = template.fields.map((field) => `${field.label}: ${formVals[field.key] || "[pending]"}`);
  return [...fieldLines, "", ...lines].join("\n");
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
        .select("id, template, status, title, fee_amount, fee_pct, created_at")
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
            .select("id, contract_id, role, name, party_order")
            .in("contract_id", contractIds)
            .order("party_order", { ascending: true }),
          supabase
            .from("contract_form_values")
            .select("contract_id, field_key, field_value")
            .in("contract_id", contractIds),
          supabase
            .from("contract_signatures")
            .select("id, contract_id, party_id, party_role, signer_name, sig_method, signed_at")
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

      const parsedContracts = (contractRows || []).map((row) => {
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
          }

          auditTrail.push({
            id: signature.id || makeId("audit"),
            role,
            signerName: signature.signer_name || "-",
            method: signature.sig_method || "-",
            signedAt: signedAtLabel,
          });
        });

        const assignmentFee = uiTemplateId === "assignment"
          ? toNum(loadedFormVals.assignmentFee || row.fee_amount || 0)
          : 0;
        const feePctNum = Number(row.fee_pct || 1.5);
        const statusLabel = toUiStatus(row.status);

        return {
          id: row.id,
          name: row.title || buildContractName(template, loadedFormVals),
          templateId: uiTemplateId,
          status: statusLabel,
          created: row.created_at ? new Date(row.created_at).toLocaleDateString() : nowLabel(),
          feeAmount: Math.round(assignmentFee * (feePctNum / 100)),
          feePct: `${feePctNum}%`,
          formVals: loadedFormVals,
          parties: mappedParties,
          auditTrail,
        };
      });

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
  }, [user?.id, user?.name]);

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
        email: "",
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

    setSignBusy(true);
    setContractsError("");

    try {
      const docHash = await sha256Hex(JSON.stringify({
        contractId: activeContract.id,
        templateId: activeContract.templateId,
        formVals: activeContract.formVals,
        role: nextSigner.role,
        signerName: appliedName,
        signedAt: signedAtIso,
      }));

      const fallbackEmailLocal = appliedName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ".")
        .replace(/^\.+|\.+$/g, "") || "signer";

      const { error: signatureError } = await supabase
        .from("contract_signatures")
        .insert({
          contract_id: activeContract.id,
          party_id: nextSigner.partyId || null,
          signer_name: appliedName,
          signer_email: user?.email || `${fallbackEmailLocal}@dealbank.local`,
          signer_ip: "127.0.0.1",
          signed_at: signedAtIso,
          sig_method: method,
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

      await loadContracts({ focusId: activeContract.id, nextView: "sign", silent: true });
      setTypedName("");
      clearDrawnSignature();
    } catch (error) {
      setContractsError(error?.message || "Failed to apply signature.");
    } finally {
      setSignBusy(false);
    }
  }

  function downloadContract(contract) {
    const template = TEMPLATE_CONFIG[contract.templateId] || defaultTemplate;
    const lines = [
      `Contract: ${contract.name}`,
      `Template: ${template.label}`,
      `Status: ${contract.status}`,
      `Created: ${contract.created}`,
      "",
      contractBody(template, contract.formVals),
      "",
      "Signatures:",
      ...contract.parties.map((party) => `${party.role}: ${party.signerName || "Pending"} (${party.status})`),
    ];

    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = `${contract.name.replace(/\s+/g, "-").toLowerCase()}.txt`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(href);
  }

  if (view === "new") {
    return (
      <div>
        <button onClick={() => { setView("dashboard"); setEditingId(null); }} style={{ ...btnO, marginBottom: 12, padding: "5px 12px", fontSize: 9 }}>← Back to Contracts</button>

        {contractsError && (
          <div style={{ ...card, borderColor: `${G.red}55`, color: G.red, fontSize: 10, marginBottom: 12 }}>
            {contractsError}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 6, marginBottom: 12 }}>
          {TEMPLATE_ORDER.map((id) => {
            const template = TEMPLATE_CONFIG[id];
            return (
              <button
                key={id}
                onClick={() => {
                  if (editingId || saveBusy) return;
                  resetToTemplate(id);
                }}
                style={{
                  ...btnO,
                  fontSize: 8,
                  padding: "8px 10px",
                  borderColor: templateId === id ? G.green : G.border,
                  color: templateId === id ? G.green : G.muted,
                  background: templateId === id ? G.greenGlow : "transparent",
                }}
              >
                {template.label}
              </button>
            );
          })}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.2fr 1fr", gap: 12 }}>
          <div style={{ ...card }}>
            <div style={{ fontFamily: G.serif, fontSize: 17, marginBottom: 6 }}>{activeTemplate.label}</div>
            <div style={{ fontSize: 10, color: G.muted, marginBottom: 10 }}>{activeTemplate.summary}</div>

            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 8, marginBottom: 12 }}>
              {activeTemplate.fields.map((field) => (
                <div key={field.key}>
                  <div style={lbl}>{field.label}</div>
                  <div style={{ position: "relative" }}>
                    {field.prefix && <span style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: G.muted, fontSize: 12 }}>{field.prefix}</span>}
                    <input
                      value={formVals[field.key] || ""}
                      onChange={(event) => setFormVals((prev) => ({ ...prev, [field.key]: event.target.value }))}
                      placeholder={field.placeholder}
                      style={{ width: "100%", background: G.surface, border: `1px solid ${G.border}`, borderRadius: 6, color: G.text, fontFamily: G.mono, fontSize: 11, padding: field.prefix ? "8px 10px 8px 20px" : "8px 10px", boxSizing: "border-box", outline: "none" }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {templateId === "assignment" && (
              <div style={{ background: "#1a1200", border: `1px solid ${G.gold}44`, borderRadius: 7, padding: "10px 12px", marginBottom: 12 }}>
                <div style={{ ...lbl, color: G.gold, marginBottom: 4 }}>Platform Fee Section A3 (Auto-Inserted)</div>
                <div style={{ fontSize: 10, color: G.text, lineHeight: 1.7 }}>
                  Both parties authorize the closing agent to disburse 1.5% of the assignment fee to DealBank LLC at closing. This clause is mandatory and cannot be removed.
                </div>
                <div style={{ marginTop: 6, fontSize: 10, color: G.gold }}>
                  Estimated DealBank fee: <strong>{fmt(previewFee)}</strong>
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: 8, flexDirection: isMobile ? "column" : "row" }}>
              <button
                onClick={() => saveContract("Draft")}
                disabled={saveBusy}
                style={{ ...btnO, flex: 1, fontSize: 9, opacity: saveBusy ? 0.6 : 1 }}
              >
                {saveBusy ? "Saving..." : "Save as Draft"}
              </button>
              <button
                onClick={() => saveContract("Awaiting Signature")}
                disabled={saveBusy}
                style={{ ...btnG, flex: 2, fontSize: 9, opacity: saveBusy ? 0.75 : 1 }}
              >
                {saveBusy ? "Saving..." : "Send for Signature"}
              </button>
            </div>
          </div>

          <div style={{ ...card }}>
            <div style={{ ...lbl, marginBottom: 8 }}>Live Preview</div>
            <div style={{ fontFamily: G.serif, fontSize: 14, marginBottom: 8 }}>{activeTemplate.label}</div>
            <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontFamily: G.mono, fontSize: 10, color: G.text, lineHeight: 1.7 }}>{previewBody}</pre>
            <div style={{ marginTop: 12, borderTop: `1px solid ${G.faint}`, paddingTop: 10 }}>
              <div style={{ fontSize: 10, color: G.muted, marginBottom: 6 }}>Signature Blocks</div>
              {activeTemplate.parties.map((party) => (
                <div key={party} style={{ marginBottom: 10, fontSize: 10, color: G.text }}>
                  {party}: _______________________   Date: ___________
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (view === "sign" && activeContract) {
    const template = TEMPLATE_CONFIG[activeContract.templateId] || defaultTemplate;

    return (
      <div>
        <button onClick={() => setView("dashboard")} style={{ ...btnO, marginBottom: 12, padding: "5px 12px", fontSize: 9 }}>← Back to Contracts</button>

        {contractsError && (
          <div style={{ ...card, borderColor: `${G.red}55`, color: G.red, fontSize: 10, marginBottom: 12 }}>
            {contractsError}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.3fr 1fr", gap: 12 }}>
          <div style={{ ...card }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8, gap: 8, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontFamily: G.serif, fontSize: 16 }}>{activeContract.name}</div>
                <div style={{ fontSize: 10, color: G.muted }}>{template.label} · {activeContract.status}</div>
              </div>
              <div style={{ fontSize: 8, color: G.gold, border: `1px solid ${G.gold}55`, background: `${G.gold}22`, borderRadius: 3, padding: "2px 7px", letterSpacing: 1 }}>
                PLATFORM FEE 1.5%
              </div>
            </div>
            <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontFamily: G.mono, fontSize: 10, color: G.text, lineHeight: 1.7 }}>{contractBody(template, activeContract.formVals)}</pre>

            <div style={{ marginTop: 12, borderTop: `1px solid ${G.faint}`, paddingTop: 10 }}>
              <div style={{ ...lbl, marginBottom: 6 }}>Execution Tracker</div>
              {activeContract.parties.map((party) => (
                <div key={party.role} style={{ display: "flex", justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "center", padding: "6px 0", borderBottom: `1px solid ${G.faint}`, gap: 8, flexDirection: isMobile ? "column" : "row" }}>
                  <div>
                    <div style={{ fontSize: 10, color: G.text }}>{party.role}</div>
                    <div style={{ fontSize: 8, color: G.muted }}>{party.signerName || "Pending signer"}</div>
                  </div>
                  <div style={{ fontSize: 8, color: party.status === "Signed" ? G.green : nextSigner?.role === party.role ? G.gold : G.muted }}>
                    {party.status === "Signed" ? `Signed ${party.signedAt}` : nextSigner?.role === party.role ? "Your Turn" : "Waiting"}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ ...card }}>
            {activeContract.status === "Fully Executed" ? (
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 30, marginBottom: 8 }}>OK</div>
                <div style={{ fontFamily: G.serif, fontSize: 18, color: G.green, marginBottom: 6 }}>Fully Executed</div>
                <div style={{ fontSize: 10, color: G.muted, lineHeight: 1.7, marginBottom: 12 }}>
                  All parties have signed. Title instructions can now be sent with platform fee authorization.
                </div>
                <div style={{ ...lbl, marginBottom: 6 }}>Audit Trail</div>
                {activeContract.auditTrail.map((item) => (
                  <div key={item.id} style={{ textAlign: "left", background: G.surface, border: `1px solid ${G.border}`, borderRadius: 5, padding: "7px 8px", fontSize: 9, color: G.text, marginBottom: 6 }}>
                    {item.role}: {item.signerName} · {item.method} · {item.signedAt}
                  </div>
                ))}
                <button onClick={() => downloadContract(activeContract)} style={{ ...btnG, width: "100%", fontSize: 9, marginTop: 6 }}>Download Contract</button>
              </div>
            ) : (
              <div>
                <div style={{ ...lbl, marginBottom: 6 }}>Sign Contract</div>
                <div style={{ fontSize: 10, color: G.text, marginBottom: 8 }}>
                  Next signer: <strong>{nextSigner?.role || "None"}</strong>
                </div>

                <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                  {[
                    ["type", "Type"],
                    ["draw", "Draw"],
                  ].map(([id, label]) => (
                    <button
                      key={id}
                      onClick={() => setSigMode(id)}
                      style={{ ...btnO, flex: 1, fontSize: 8, padding: "6px 8px", borderColor: sigMode === id ? G.green : G.border, color: sigMode === id ? G.green : G.muted, background: sigMode === id ? G.greenGlow : "transparent" }}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {sigMode === "type" ? (
                  <div style={{ marginBottom: 8 }}>
                    <input
                      value={typedName}
                      onChange={(event) => setTypedName(event.target.value)}
                      placeholder="Type full legal name"
                      style={{ width: "100%", background: G.surface, border: `1px solid ${G.border}`, borderRadius: 6, color: G.text, fontFamily: G.mono, fontSize: 11, padding: "8px 10px", boxSizing: "border-box", outline: "none" }}
                    />
                    <div style={{ fontFamily: G.serif, fontStyle: "italic", color: G.green, marginTop: 6, minHeight: 20 }}>{typedName}</div>
                  </div>
                ) : (
                  <div style={{ marginBottom: 8 }}>
                    <canvas
                      ref={canvasRef}
                      width={isMobile ? 320 : 400}
                      height={120}
                      onMouseDown={startDraw}
                      onMouseMove={drawLine}
                      onMouseUp={endDraw}
                      onMouseLeave={endDraw}
                      onTouchStart={startDraw}
                      onTouchMove={drawLine}
                      onTouchEnd={endDraw}
                      style={{ width: "100%", height: 120, borderRadius: 6, border: `1px solid ${G.border}`, background: G.surface, touchAction: "none" }}
                    />
                    <button onClick={clearDrawnSignature} style={{ ...btnO, marginTop: 6, fontSize: 8, padding: "4px 8px" }}>Clear</button>
                  </div>
                )}

                <div style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 6, padding: "8px 9px", fontSize: 9, color: G.muted, lineHeight: 1.7, marginBottom: 8 }}>
                  By applying this signature you agree to contract terms and authorize title/escrow disbursement of the 1.5% DealBank platform fee at close.
                </div>

                <button
                  onClick={applySignature}
                  disabled={!canApplySignature || signBusy}
                  style={{ ...btnG, width: "100%", fontSize: 9, background: canApplySignature && !signBusy ? G.green : G.faint, color: canApplySignature && !signBusy ? "#000" : G.muted }}
                >
                  {signBusy ? "Applying Signature..." : "Apply Signature"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ ...card, marginBottom: 12 }}>
        <div style={{ fontFamily: G.serif, fontSize: 18, marginBottom: 8 }}>Platform Fee Enforcement</div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(4,1fr)", gap: 8 }}>
          {[
            "Contract created with Section A3 fee clause",
            "Both parties sign electronically",
            "Title receives disbursement instructions",
            "Close disburses 98.5% to wholesaler and 1.5% to DealBank",
          ].map((step, index) => (
            <div key={step} style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 7, padding: "10px 11px" }}>
              <div style={{ fontSize: 8, color: G.green, letterSpacing: 2, marginBottom: 4 }}>STEP {index + 1}</div>
              <div style={{ fontSize: 10, color: G.text, lineHeight: 1.6 }}>{step}</div>
            </div>
          ))}
        </div>
      </div>

      {contractsError && (
        <div style={{ ...card, borderColor: `${G.red}55`, color: G.red, fontSize: 10, marginBottom: 12 }}>
          {contractsError}
        </div>
      )}

      <div style={{ ...card, marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: isMobile ? "stretch" : "center", marginBottom: 8, gap: 8, flexDirection: isMobile ? "column" : "row" }}>
          <div style={{ fontFamily: G.serif, fontSize: 16 }}>Contracts Dashboard</div>
          <button onClick={() => openCreate("assignment")} disabled={contractsLoading} style={{ ...btnG, fontSize: 9, padding: "7px 12px", width: isMobile ? "100%" : "auto", opacity: contractsLoading ? 0.75 : 1 }}>+ New Contract</button>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: `1px solid ${G.border}` }}>
                {[
                  "Contract",
                  "Status",
                  "Parties",
                  "Created",
                  "Assignment Fee",
                  "DealBank Fee",
                  "Actions",
                ].map((head) => (
                  <th key={head} style={{ fontSize: 8, color: G.muted, fontWeight: "normal", letterSpacing: 1, padding: "8px 6px" }}>{head}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {contractsLoading ? (
                <tr>
                  <td colSpan={7} style={{ fontSize: 10, color: G.muted, textAlign: "center", padding: "16px 8px" }}>
                    Loading contracts...
                  </td>
                </tr>
              ) : contracts.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ fontSize: 10, color: G.muted, textAlign: "center", padding: "16px 8px" }}>
                    No contracts yet. Create your first contract to start tracking signatures.
                  </td>
                </tr>
              ) : contracts.map((contract) => {
                const template = TEMPLATE_CONFIG[contract.templateId] || defaultTemplate;
                const assignmentFee = template.id === "assignment" ? fmt(contract.formVals.assignmentFee || 0) : "-";
                const statusColor = contract.status === "Fully Executed" ? G.green : contract.status === "Awaiting Signature" ? G.gold : G.muted;

                return (
                  <tr key={contract.id} style={{ borderBottom: `1px solid ${G.faint}` }}>
                    <td style={{ padding: "9px 6px" }}>
                      <div style={{ fontSize: 10, color: G.text }}>{contract.name}</div>
                      <div style={{ fontSize: 8, color: G.muted }}>{template.label}</div>
                    </td>
                    <td style={{ padding: "9px 6px" }}>
                      <span style={{ fontSize: 8, color: statusColor, border: `1px solid ${statusColor}55`, background: `${statusColor}22`, borderRadius: 3, padding: "2px 7px", letterSpacing: 1 }}>{contract.status}</span>
                    </td>
                    <td style={{ fontSize: 9, color: G.muted, padding: "9px 6px" }}>{contract.parties.length}</td>
                    <td style={{ fontSize: 9, color: G.muted, padding: "9px 6px" }}>{contract.created}</td>
                    <td style={{ fontSize: 9, color: G.text, padding: "9px 6px" }}>{assignmentFee}</td>
                    <td style={{ fontSize: 9, color: G.gold, padding: "9px 6px" }}>{contract.feeAmount ? fmt(contract.feeAmount) : "-"}</td>
                    <td style={{ padding: "9px 6px" }}>
                      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                        {contract.status !== "Fully Executed" && contract.auditTrail.length === 0 && (
                          <button onClick={() => openCreate(contract.templateId, contract)} style={{ ...btnO, fontSize: 8, padding: "4px 8px" }}>Edit & Send</button>
                        )}
                        <button onClick={() => openSign(contract.id)} style={{ ...btnO, fontSize: 8, padding: "4px 8px", borderColor: G.gold, color: G.gold }}>
                          {contract.status === "Fully Executed" ? "View Audit" : "Sign"}
                        </button>
                        <button onClick={() => downloadContract(contract)} style={{ ...btnO, fontSize: 8, padding: "4px 8px" }}>View + Download</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3,1fr)", gap: 8 }}>
        {TEMPLATE_ORDER.map((id) => {
          const template = TEMPLATE_CONFIG[id];
          return (
            <div key={template.id} style={{ ...card }}>
              <div style={{ ...lbl, marginBottom: 4 }}>Template</div>
              <div style={{ fontFamily: G.serif, fontSize: 15, marginBottom: 4 }}>{template.label}</div>
              <div style={{ fontSize: 10, color: G.muted, lineHeight: 1.6, marginBottom: 10 }}>{template.summary}</div>
              <button onClick={() => openCreate(template.id)} disabled={contractsLoading} style={{ ...btnG, width: "100%", fontSize: 9, opacity: contractsLoading ? 0.75 : 1 }}>Use Template</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
