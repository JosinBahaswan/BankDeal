import { supabase } from "../../lib/supabaseClient";

async function getAccessToken() {
  const { data: sessionData } = await supabase.auth.getSession();
  return sessionData?.session?.access_token || "";
}

async function callDeferred(route, payload = {}) {
  const token = await getAccessToken();
  const resp = await fetch(`/api/deferred?route=${route}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(data.error || `API Error: ${resp.status}`);
  }
  return data;
}

export async function fetchOffMarketProperties({ listType = "All", search = "" } = {}) {
  const payload = {
    listType: listType === "All" ? "" : listType,
    search: search.trim(),
  };
  const data = await callDeferred("offmarket-properties", payload);
  return {
    properties: data.properties || [],
    provider: data.provider || "",
    message: data.message || "",
  };
}

export async function initiateCall(params) {
  const data = await callDeferred("twilio-call", params);
  return { success: true, callSid: data.sid };
}

export async function sendEmail(params) {
  const data = await callDeferred("send-email", params);
  return { success: true, messageId: data.id };
}

export async function sendContractForESign(params) {
  const data = await callDeferred("contracts-send", params);
  return { success: true, envelopeId: data.envelopeId };
}

export async function saveActivityLog(params) {
  console.log("Activity Log:", params.type, "for", params.address);
  return { success: true };
}

export async function generateContractPdf(params) {
  console.log("Generating PDF for", params.address);
  await new Promise((resolve) => setTimeout(resolve, 1500));
  return { success: true, pdfUrl: "#mock-pdf-url" };
}
