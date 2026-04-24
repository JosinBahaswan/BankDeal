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
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });
  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(data.error || `API Error: ${resp.status}`);
  }
  return data;
}

/**
 * Fetch off-market / listed properties.
 *
 * Priority:  BatchData → Legacy BatchLeads → Realty Base US (fallback)
 *
 * @param {object} params
 * @param {string} params.listType  - Filter label e.g. "Vacant", "Foreclosure", "All"
 * @param {string} params.search    - Free-text search (city, address, …)
 * @returns {{ properties: Array, provider: string, message: string }}
 */
export async function fetchOffMarketProperties({ listType = "All", search = "" } = {}) {
  const payload = {
    listType: listType === "All" ? "" : listType,
    search: search.trim(),
  };
  try {
    const data = await callDeferred("offmarket-properties", payload);
    // Return the full response so PropertiesTab can read provider + message
    return {
      properties: data.properties || [],
      provider: data.provider || "",
      message: data.message || "",
    };
  } catch (err) {
    throw err; // Propagate real error to UI
  }
}

/**
 * Initiate Twilio call.
 */
export async function initiateCall(params) {
  try {
    const data = await callDeferred("twilio-call", params);
    return { success: true, callSid: data.sid };
  } catch (err) {
    throw err; // Propagate real error
  }
}

/**
 * Send SendGrid email.
 */
export async function sendEmail(params) {
  try {
    const data = await callDeferred("send-email", params);
    return { success: true, messageId: data.id };
  } catch (err) {
    throw err; // Propagate real error
  }
}

/**
 * Send contract for eSign via deferred proxy.
 */
export async function sendContractForESign(params) {
  try {
    const data = await callDeferred("contracts-send", params);
    return { success: true, envelopeId: data.envelopeId };
  } catch (err) {
    throw err;
  }
}

/**
 * Mock function to save activity logs to Supabase.
 */
export async function saveActivityLog(params) {
  console.log("Activity Log:", params.type, "for", params.address);
  return { success: true };
}

/**
 * Mock function to generate a contract PDF.
 */
export async function generateContractPdf(params) {
  console.log("Generating PDF for", params.address);
  await new Promise((resolve) => setTimeout(resolve, 1500));
  return { success: true, pdfUrl: "#mock-pdf-url" };
}
