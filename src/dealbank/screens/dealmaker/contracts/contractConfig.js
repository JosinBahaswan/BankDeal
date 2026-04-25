export const TEMPLATE_CONFIG = {
  assignment: {
    id: "assignment",
    label: "Assignment Agreement",
    summary: "Assign an existing purchase contract to another buyer.",
    parties: ["Assignor", "Assignee"],
    fields: [
      { key: "assignor", label: "Assignor Name", placeholder: "Ray Torres" },
      { key: "assignorEmail", label: "Assignor Email", placeholder: "ray@example.com" },
      { key: "assignee", label: "Assignee Name", placeholder: "Pacific Equity Group" },
      { key: "assigneeEmail", label: "Assignee Email", placeholder: "pacific@example.com" },
      { key: "propertyAddress", label: "Property Address", placeholder: "1842 Maple St, Sacramento, CA" },
      { key: "purchasePrice", label: "Purchase Price", placeholder: "195000", prefix: "$" },
      { key: "assignmentFee", label: "Assignment Fee", placeholder: "12000", prefix: "$" },
      { key: "earnestMoney", label: "Earnest Money", placeholder: "2500", prefix: "$" },
      { key: "closeDate", label: "Close Date", placeholder: "May 30, 2026" },
      { key: "titleCompany", label: "Title Company", placeholder: "Capital Valley Title" },
      { key: "titleCompanyEmail", label: "Title Company Email", placeholder: "closings@capitalvalleytitle.com" },
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
      { key: "buyerEmail", label: "Buyer Email", placeholder: "buyer@example.com" },
      { key: "seller", label: "Seller Name", placeholder: "Maria Ortega" },
      { key: "sellerEmail", label: "Seller Email", placeholder: "seller@example.com" },
      { key: "propertyAddress", label: "Property Address", placeholder: "4402 Elmwood Ct, Modesto, CA" },
      { key: "purchasePrice", label: "Purchase Price", placeholder: "172000", prefix: "$" },
      { key: "earnestMoney", label: "Earnest Money", placeholder: "3000", prefix: "$" },
      { key: "closeDate", label: "Close Date", placeholder: "June 15, 2026" },
      { key: "titleCompany", label: "Title Company", placeholder: "North State Escrow" },
      { key: "titleCompanyEmail", label: "Title Company Email", placeholder: "closings@northstateescrow.com" },
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
      { key: "partnerA", label: "Partner A Name", placeholder: "Cash Offers LLC" },
      { key: "partnerAEmail", label: "Partner A Email", placeholder: "partner-a@example.com" },
      { key: "partnerB", label: "Partner B Name", placeholder: "Central Valley Investments" },
      { key: "partnerBEmail", label: "Partner B Email", placeholder: "partner-b@example.com" },
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

export const TEMPLATE_ORDER = ["assignment", "purchase", "jointventure"];

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

export const UI_TO_DB_STATUS = {
  Draft: "draft",
  "Awaiting Signature": "sent",
  "Fully Executed": "fully_executed",
  Voided: "voided",
};

export function toDbTemplate(templateId) {
  return UI_TO_DB_TEMPLATE[templateId] || "assignment";
}

export function toUiTemplate(templateId) {
  return DB_TO_UI_TEMPLATE[templateId] || "assignment";
}

export function toUiStatus(status) {
  if (status === "draft") return "Draft";
  if (status === "fully_executed") return "Fully Executed";
  if (status === "voided") return "Voided";
  return "Awaiting Signature";
}

function roleFieldKey(templateId, role) {
  if (templateId === "assignment") {
    if (role === "Assignor") return { name: "assignor", email: "assignorEmail" };
    if (role === "Assignee") return { name: "assignee", email: "assigneeEmail" };
  }
  if (templateId === "purchase") {
    if (role === "Buyer") return { name: "buyer", email: "buyerEmail" };
    if (role === "Seller") return { name: "seller", email: "sellerEmail" };
  }
  if (templateId === "jointventure") {
    if (role === "Partner A") return { name: "partnerA", email: "partnerAEmail" };
    if (role === "Partner B") return { name: "partnerB", email: "partnerBEmail" };
  }
  return { name: "", email: "" };
}

export function partyNameFromForm(templateId, role, formVals, fallbackName = "") {
  const keys = roleFieldKey(templateId, role);
  if (keys.name && formVals[keys.name]) return String(formVals[keys.name]);
  return fallbackName;
}

export function partyEmailFromForm(templateId, role, formVals, fallbackEmail = "") {
  const keys = roleFieldKey(templateId, role);
  if (keys.email && formVals[keys.email]) return String(formVals[keys.email]);
  return fallbackEmail;
}

export function buildContractName(template, formVals) {
  const fallbackAddress = formVals.propertyAddress || "Untitled Property";
  return `${template.label.split(" ")[0]} - ${fallbackAddress.split(",")[0]}`;
}

export async function sha256Hex(input) {
  if (!globalThis.crypto?.subtle) {
    throw new Error("Secure crypto engine is not available. Open DealBank over HTTPS to sign contracts.");
  }

  try {
    const bytes = new TextEncoder().encode(input);
    const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    throw new Error("Failed to compute SHA-256 document hash.");
  }
}

export function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

export function toNum(value) {
  return Number(String(value || "").replace(/[^0-9.]/g, "")) || 0;
}

export function makeBlankForm(template) {
  const next = {};
  template.fields.forEach((field) => {
    next[field.key] = "";
  });
  return next;
}

export function nowLabel() {
  return new Date().toLocaleDateString();
}

export function templateParties(template, userName) {
  return template.parties.map((role, index) => ({
    partyId: "",
    role,
    signerName: index === 0 ? userName || role : "",
    email: "",
    status: "Waiting",
    signedAt: "",
    method: "",
    signatureImageUrl: "",
    docHash: "",
  }));
}

export function contractBody(template, formVals) {
  const lines = template.clauses.map((clause, index) => `${index + 1}. ${clause}`);
  const fieldLines = template.fields.map((field) => `${field.label}: ${formVals[field.key] || "[pending]"}`);
  return [...fieldLines, "", ...lines].join("\n");
}

export function safeFilename(value) {
  return String(value || "contract").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export function wrapText(text, maxChars = 88) {
  if (!text) return [""];
  const words = String(text).split(/\s+/);
  const lines = [];
  let current = "";

  words.forEach((word) => {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxChars) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  });

  if (current) lines.push(current);
  return lines.length ? lines : [""];
}
