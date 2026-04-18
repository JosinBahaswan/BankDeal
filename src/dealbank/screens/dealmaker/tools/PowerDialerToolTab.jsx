import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Papa from "papaparse";
import { supabase } from "../../../../lib/supabaseClient";
import { DIALER_OUTCOMES, DIALER_QUEUE_SEED } from "./toolData";

const TWILIO_TOKEN_ENDPOINT = String(import.meta.env.VITE_TWILIO_ACCESS_TOKEN_ENDPOINT || "/api/twilio-access-token").trim();
const DIALER_SIMULATION_ALLOWED = String(import.meta.env.VITE_ALLOW_DIALER_SIMULATION || "").toLowerCase() === "true";
const CSV_MAX_ROWS = Math.max(1, Number(import.meta.env.VITE_DIALER_CSV_MAX_ROWS || 2000));
const CSV_MAX_FILE_BYTES = Math.max(10_000, Number(import.meta.env.VITE_DIALER_CSV_MAX_FILE_BYTES || 1_500_000));
const CSV_NAME_HEADERS = ["name", "fullname", "ownername", "contactname"];
const CSV_PHONE_HEADERS = ["phone", "phonenumber", "mobile", "telephone"];
const CSV_ADDRESS_HEADERS = ["address", "propertyaddress", "streetaddress"];

function fmtClock(totalSec) {
  const sec = Math.max(0, totalSec || 0);
  const mm = String(Math.floor(sec / 60)).padStart(2, "0");
  const ss = String(sec % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function normalizeCsvHeader(header) {
  return String(header || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function hasCsvHeader(fields, aliases) {
  return aliases.some((entry) => fields.includes(entry));
}

function normalizeDialTarget(rawPhone) {
  const text = String(rawPhone || "").trim();
  if (!text) return "";

  if (text.startsWith("+")) {
    const normalizedE164 = `+${text.slice(1).replace(/[^0-9]/g, "")}`;
    return /^\+[1-9]\d{7,14}$/.test(normalizedE164) ? normalizedE164 : "";
  }

  const digits = text.replace(/[^0-9]/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return "";
}

function readCsvField(row, keys) {
  for (const key of keys) {
    const value = String(row?.[key] || "").trim();
    if (value) return value;
  }
  return "";
}

function parseCsvRows(text) {
  const rawCsv = String(text || "");
  if (!rawCsv.trim()) {
    return { rows: [], error: "CSV file is empty." };
  }

  const importSeed = Date.now();
  const parsed = Papa.parse(rawCsv, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: normalizeCsvHeader,
  });

  const parseErrors = Array.isArray(parsed.errors) ? parsed.errors.filter((entry) => {
    const code = String(entry?.code || "").toLowerCase();
    const type = String(entry?.type || "").toLowerCase();
    return code !== "undetectabledelimiter" && type !== "delimiter";
  }) : [];

  if (parseErrors.length > 0) {
    const firstError = parseErrors[0];
    return {
      rows: [],
      error: `CSV parse error near row ${Number(firstError?.row || 0) + 1}: ${firstError?.message || "invalid format"}`,
    };
  }

  const headerFields = Array.isArray(parsed.meta?.fields) ? parsed.meta.fields : [];
  const hasNameHeader = hasCsvHeader(headerFields, CSV_NAME_HEADERS);
  const hasPhoneHeader = hasCsvHeader(headerFields, CSV_PHONE_HEADERS);

  if (!hasNameHeader || !hasPhoneHeader) {
    return {
      rows: [],
      error: "CSV must include headers for name and phone (aliases allowed: name/fullname and phone/phonenumber).",
    };
  }

  const dataRows = Array.isArray(parsed.data) ? parsed.data : [];
  if (dataRows.length === 0) {
    return { rows: [], error: "CSV has no data rows." };
  }

  if (dataRows.length > CSV_MAX_ROWS) {
    return { rows: [], error: `CSV exceeds ${CSV_MAX_ROWS} rows. Split file into smaller batches.` };
  }

  const seenPhones = new Set();
  const normalizedRows = [];
  const rowErrors = [];

  for (let index = 0; index < dataRows.length; index += 1) {
    const row = dataRows[index] || {};
    const lineNumber = index + 2;

    const name = readCsvField(row, CSV_NAME_HEADERS);
    const rawPhone = readCsvField(row, CSV_PHONE_HEADERS);
    const phone = normalizeDialTarget(rawPhone);
    const address = readCsvField(row, CSV_ADDRESS_HEADERS) || "Address not provided";

    if (!name || !rawPhone) {
      rowErrors.push(`Row ${lineNumber}: name and phone are required.`);
      continue;
    }

    if (!phone) {
      rowErrors.push(`Row ${lineNumber}: phone must be E.164 or a valid US 10/11-digit number.`);
      continue;
    }

    if (seenPhones.has(phone)) {
      rowErrors.push(`Row ${lineNumber}: duplicate phone ${phone}.`);
      continue;
    }

    seenPhones.add(phone);
    normalizedRows.push({
      id: `imp-${importSeed}-${normalizedRows.length}`,
      name,
      phone,
      address,
      tags: ["Imported"],
    });
  }

  if (rowErrors.length > 0) {
    return {
      rows: [],
      error: `CSV validation failed. ${rowErrors.slice(0, 3).join(" ")}`,
    };
  }

  return { rows: normalizedRows, error: "" };
}

export default function PowerDialerToolTab({ ctx }) {
  const { G, card, btnG, btnO, user } = ctx;
  const isLocalHost = typeof window !== "undefined"
    && ["localhost", "127.0.0.1"].includes(String(window.location?.hostname || "").toLowerCase());
  const simulationAllowed = DIALER_SIMULATION_ALLOWED || isLocalHost;

  const [dialerMode, setDialerMode] = useState("checking");
  const [dialerModeDetail, setDialerModeDetail] = useState("");
  const twilioDeviceRef = useRef(null);
  const twilioCallRef = useRef(null);

  const [queue, setQueue] = useState(DIALER_QUEUE_SEED);
  const [activeIndex, setActiveIndex] = useState(0);
  const [callState, setCallState] = useState("idle");
  const [elapsedSec, setElapsedSec] = useState(0);
  const [sessionElapsedSec, setSessionElapsedSec] = useState(0);
  const [sessionActive, setSessionActive] = useState(false);
  const [notes, setNotes] = useState("");
  const [csvName, setCsvName] = useState("");
  const [stats, setStats] = useState({ calls: 0, connects: 0, voicemails: 0, callbacks: 0, interested: 0 });
  const [callLog, setCallLog] = useState([]);
  const [toast, setToast] = useState("");
  const [waveSeed, setWaveSeed] = useState(0);
  const fileRef = useRef(null);
  const callLogSeqRef = useRef(0);
  const dialerDemoMode = dialerMode === "demo";

  const currentLead = queue[activeIndex] || null;

  const waveform = useMemo(() => {
    const bars = [];
    for (let i = 0; i < 26; i += 1) {
      const phase = (elapsedSec * 0.6) + (i * 0.42) + waveSeed;
      bars.push(Math.max(6, Math.round((Math.sin(phase) + 1.1) * 9)));
    }
    return bars;
  }, [elapsedSec, waveSeed]);

  const sessionMins = useMemo(() => fmtClock(sessionElapsedSec), [sessionElapsedSec]);

  useEffect(() => {
    if (!sessionActive) return undefined;
    const timer = setInterval(() => setSessionElapsedSec((prev) => prev + 1), 1000);
    return () => clearInterval(timer);
  }, [sessionActive]);

  useEffect(() => {
    if (callState !== "live") return undefined;
    const timer = setInterval(() => setElapsedSec((prev) => prev + 1), 1000);
    return () => clearInterval(timer);
  }, [callState]);

  useEffect(() => {
    if (callState !== "ringing" || !dialerDemoMode) return undefined;
    const t = setTimeout(() => {
      setCallState("live");
      setWaveSeed(Math.random() * 8);
    }, 1800);
    return () => clearTimeout(t);
  }, [callState, dialerDemoMode]);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(""), 1800);
    return () => clearTimeout(t);
  }, [toast]);

  const fetchTwilioToken = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = String(sessionData?.session?.access_token || "").trim();
    if (!accessToken) {
      throw new Error("Session expired. Please sign in again.");
    }

    const response = await fetch(TWILIO_TOKEN_ENDPOINT, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.token) {
      throw new Error(payload?.error || `Token endpoint failed (${response.status})`);
    }

    return payload.token;
  }, []);

  const ensureTwilioDevice = useCallback(async () => {
    if (twilioDeviceRef.current) return twilioDeviceRef.current;

    const token = await fetchTwilioToken();
    const voiceSdk = await import("@twilio/voice-sdk");
    const Device = voiceSdk?.Device;
    if (!Device) throw new Error("Twilio Voice SDK unavailable");

    const device = new Device(token, {
      closeProtection: true,
      logLevel: 1,
    });

    device.on("error", (error) => {
      setToast(`Twilio error: ${error?.message || "unknown error"}`);
    });

    device.on("tokenWillExpire", async () => {
      try {
        const freshToken = await fetchTwilioToken();
        device.updateToken(freshToken);
      } catch (error) {
        setToast(`Twilio token refresh failed: ${error?.message || "unknown error"}`);
      }
    });

    twilioDeviceRef.current = device;
    return device;
  }, [fetchTwilioToken]);

  useEffect(() => {
    let active = true;
    const applyUnavailableMode = (message) => {
      if (!active) return;
      if (simulationAllowed) {
        setDialerMode("demo");
        setDialerModeDetail(message);
        return;
      }

      setDialerMode("blocked");
      setDialerModeDetail(message);
    };

    async function detectDialerMode() {
      if (!user?.id) {
        applyUnavailableMode("Sign in required for live Twilio calls.");
        return;
      }

      if (!TWILIO_TOKEN_ENDPOINT) {
        applyUnavailableMode("Twilio token endpoint is not configured.");
        return;
      }

      try {
        await ensureTwilioDevice();
        if (!active) return;
        setDialerMode("live");
        setDialerModeDetail("Live Twilio voice enabled.");
      } catch (error) {
        const fallbackMessage = error?.message || "Twilio unavailable.";
        applyUnavailableMode(
          simulationAllowed
            ? `${fallbackMessage} Using simulation mode.`
            : `${fallbackMessage} Simulation mode is disabled for this environment.`,
        );
      }
    }

    detectDialerMode();

    return () => {
      active = false;
    };
  }, [user?.id, ensureTwilioDevice, simulationAllowed]);

  useEffect(() => () => {
    try {
      twilioCallRef.current?.disconnect();
    } catch {
      // no-op
    }

    try {
      twilioDeviceRef.current?.destroy();
    } catch {
      // no-op
    }

    twilioCallRef.current = null;
    twilioDeviceRef.current = null;
  }, []);

  const startCall = async () => {
    if (!currentLead) return;

    if (dialerMode === "blocked") {
      setToast(dialerModeDetail || "Live Twilio calling is required in this environment.");
      return;
    }

    if (!sessionActive) setSessionActive(true);
    setElapsedSec(0);
    setNotes("");

    if (dialerDemoMode) {
      setCallState("ringing");
      return;
    }

    try {
      const toTarget = normalizeDialTarget(currentLead.phone);
      if (!toTarget) {
        throw new Error("Lead phone number is invalid for dialing");
      }

      setCallState("ringing");
      const device = await ensureTwilioDevice();
      const liveCall = await device.connect({
        params: {
          To: toTarget,
          CallerId: String(user?.id || ""),
          LeadName: currentLead.name,
          LeadAddress: currentLead.address,
          LeadPhone: currentLead.phone,
        },
      });

      twilioCallRef.current = liveCall;
      setWaveSeed(Math.random() * 8);

      liveCall.on("accept", () => {
        setCallState("live");
      });

      liveCall.on("disconnect", () => {
        twilioCallRef.current = null;
        setCallState("idle");
      });

      liveCall.on("cancel", () => {
        twilioCallRef.current = null;
        setCallState("idle");
      });

      liveCall.on("reject", () => {
        twilioCallRef.current = null;
        setCallState("idle");
      });

      setCallState("live");
    } catch (error) {
      twilioCallRef.current = null;
      setCallState("idle");
      if (simulationAllowed) {
        setDialerMode("demo");
        setDialerModeDetail(error?.message || "Twilio call failed, using simulation mode.");
      } else {
        setDialerMode("blocked");
        setDialerModeDetail(error?.message || "Twilio call failed and simulation mode is disabled.");
      }
      setToast(`Live call failed: ${error?.message || "Unknown error"}`);
    }
  };

  const skipLead = () => {
    if (!currentLead) return;

    try {
      twilioCallRef.current?.disconnect();
    } catch {
      // no-op
    }

    twilioCallRef.current = null;

    if (activeIndex + 1 >= queue.length) {
      setCallState("idle");
      setToast("Dial queue completed");
      return;
    }
    setActiveIndex((prev) => prev + 1);
    setCallState("idle");
    setElapsedSec(0);
    setNotes("");
  };

  const resetSession = () => {
    try {
      twilioCallRef.current?.disconnect();
    } catch {
      // no-op
    }

    twilioCallRef.current = null;

    setQueue(DIALER_QUEUE_SEED);
    setActiveIndex(0);
    setCallState("idle");
    setElapsedSec(0);
    setSessionElapsedSec(0);
    setSessionActive(false);
    setNotes("");
    setStats({ calls: 0, connects: 0, voicemails: 0, callbacks: 0, interested: 0 });
    setCallLog([]);
    callLogSeqRef.current = 0;
    setCsvName("");
    setToast("Session reset");
  };

  function mapOutcomeToDb(outcomeId) {
    const map = {
      Interested: "Deal Potential",
      Voicemail: "Left Voicemail",
      "Not Interested": "Not Interested",
      "Call Back": "Callback Scheduled",
      "Offer Sent": "Offer Sent",
      "Wrong Number": "Wrong Number",
    };

    return map[outcomeId] || "No Answer";
  }

  const markOutcome = async (outcomeId) => {
    if (!currentLead) return;
    const wasLiveTwilioCall = dialerMode === "live";

    try {
      twilioCallRef.current?.disconnect();
    } catch {
      // no-op
    }

    twilioCallRef.current = null;

    setStats((prev) => ({
      calls: prev.calls + 1,
      connects: prev.connects + (outcomeId === "Voicemail" || outcomeId === "Wrong Number" ? 0 : 1),
      voicemails: prev.voicemails + (outcomeId === "Voicemail" ? 1 : 0),
      callbacks: prev.callbacks + (outcomeId === "Call Back" ? 1 : 0),
      interested: prev.interested + (outcomeId === "Interested" || outcomeId === "Offer Sent" ? 1 : 0),
    }));

    const newEntry = {
      id: `${currentLead.id}-${callLogSeqRef.current}`,
      lead: currentLead.name,
      phone: currentLead.phone,
      outcome: outcomeId,
      duration: fmtClock(elapsedSec),
      notes,
      at: new Date().toLocaleTimeString(),
    };

    callLogSeqRef.current += 1;

    setCallLog((prev) => [newEntry, ...prev].slice(0, 8));

    if (wasLiveTwilioCall) {
      setToast("Outcome saved. Twilio callback is syncing call log details.");
    } else if (user?.id) {
      const { error } = await supabase.from("call_logs").insert({
        caller_id: user.id,
        lead_name: currentLead.name,
        phone: currentLead.phone,
        address: currentLead.address,
        outcome: mapOutcomeToDb(outcomeId),
        notes: notes || null,
        duration_sec: elapsedSec,
        called_at: new Date().toISOString(),
        twilio_call_sid: null,
        twilio_status: null,
        from_number: null,
        to_number: null,
      });

      if (error) {
        setToast(`Call log save failed: ${error.message}`);
      }
    }

    if (activeIndex + 1 < queue.length) {
      setActiveIndex((prev) => prev + 1);
      setCallState("idle");
      setElapsedSec(0);
      setNotes("");
      return;
    }

    setCallState("idle");
    setElapsedSec(0);
    setNotes("");
    setToast("Last lead complete");
  };

  const onUploadCsv = async (event) => {
    const input = event.target;
    const file = input.files?.[0];
    if (!file) return;

    if (file.size > CSV_MAX_FILE_BYTES) {
      setToast(`CSV too large. Max size is ${Math.round(CSV_MAX_FILE_BYTES / 1024)} KB.`);
      input.value = "";
      return;
    }

    const { rows, error } = parseCsvRows(await file.text());
    if (error || rows.length === 0) {
      setToast(error || "CSV import failed.");
      input.value = "";
      return;
    }

    setQueue(rows);
    setActiveIndex(0);
    setCallState("idle");
    setElapsedSec(0);
    setNotes("");
    setCsvName(file.name);
    setToast(`Imported ${rows.length} leads`);
    input.value = "";
  };

  return (
    <div>
      <div style={{ fontFamily: G.serif, fontSize: 18, marginBottom: 4 }}>Power Dialer</div>
      <div style={{ fontSize: 10, color: G.muted, marginBottom: 14 }}>Run focused call waves, log outcomes, and keep momentum high.</div>

      {dialerMode === "blocked" ? (
        <div style={{ ...card, borderColor: `${G.red}66`, background: `${G.red}12`, marginBottom: 12, padding: "10px 12px" }}>
          <div style={{ display: "inline-block", fontSize: 8, letterSpacing: 1.5, color: G.red, border: `1px solid ${G.red}88`, borderRadius: 999, padding: "2px 8px", marginBottom: 6 }}>
            LIVE MODE REQUIRED
          </div>
          <div style={{ fontSize: 10, color: G.text }}>
            {dialerModeDetail || "Twilio must be configured before calls can start in this environment."}
          </div>
        </div>
      ) : dialerDemoMode ? (
        <div style={{ ...card, borderColor: `${G.gold}66`, background: `${G.gold}12`, marginBottom: 12, padding: "10px 12px" }}>
          <div style={{ display: "inline-block", fontSize: 8, letterSpacing: 1.5, color: G.gold, border: `1px solid ${G.gold}88`, borderRadius: 999, padding: "2px 8px", marginBottom: 6 }}>
            DEMO MODE
          </div>
          <div style={{ fontSize: 10, color: G.text }}>
            Calls are simulated in-app. {dialerModeDetail || "Configure Twilio token endpoint and credentials for live voice."}
          </div>
        </div>
      ) : (
        <div style={{ ...card, borderColor: `${G.green}66`, background: `${G.green}12`, marginBottom: 12, padding: "10px 12px" }}>
          <div style={{ display: "inline-block", fontSize: 8, letterSpacing: 1.5, color: G.green, border: `1px solid ${G.green}88`, borderRadius: 999, padding: "2px 8px", marginBottom: 6 }}>
            LIVE MODE
          </div>
          <div style={{ fontSize: 10, color: G.text }}>
            Twilio voice is active. Dialer outcomes are still logged to Supabase for analytics.
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 8, marginBottom: 12 }}>
        {[{ l: "Session Time", v: sessionMins, c: G.green }, { l: "Calls", v: stats.calls, c: G.text }, { l: "Connects", v: stats.connects, c: G.gold }, { l: "Callbacks", v: stats.callbacks, c: "#60a5fa" }, { l: "Interested", v: stats.interested, c: "#22c55e" }, { l: "Queue Left", v: Math.max(0, queue.length - activeIndex), c: G.text }].map((item) => (
          <div key={item.l} style={{ ...card, textAlign: "center", padding: 10 }}>
            <div style={{ fontSize: 8, color: G.muted, letterSpacing: 1, marginBottom: 4 }}>{item.l}</div>
            <div style={{ fontFamily: G.serif, fontSize: 16, color: item.c }}>{item.v}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,2fr) minmax(0,1fr)", gap: 10, alignItems: "start" }}>
        <div style={{ ...card }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 8, color: G.muted, letterSpacing: 2, marginBottom: 3 }}>NOW DIALING</div>
              <div style={{ fontFamily: G.serif, fontSize: 16, color: G.text }}>{currentLead ? currentLead.name : "Queue complete"}</div>
              <div style={{ fontSize: 10, color: G.muted }}>{currentLead ? `${currentLead.phone} · ${currentLead.address}` : "Reset session or upload a new list."}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 8, color: G.muted, letterSpacing: 2, marginBottom: 3 }}>STATE</div>
              <div style={{ fontSize: 9, color: callState === "live" ? G.green : callState === "ringing" ? G.gold : G.muted, border: `1px solid ${callState === "live" ? G.green : callState === "ringing" ? G.gold : G.border}`, borderRadius: 4, padding: "3px 8px", background: callState === "live" ? `${G.green}22` : "transparent", textTransform: "uppercase" }}>{callState}</div>
              <div style={{ fontFamily: G.serif, fontSize: 22, color: G.text, marginTop: 6 }}>{fmtClock(elapsedSec)}</div>
            </div>
          </div>

          <div style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 7, padding: 10, marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "end", gap: 3, height: 34 }}>
              {waveform.map((h, i) => (
                <div key={`bar-${i}`} style={{ flex: 1, height: `${callState === "idle" ? 5 : h}px`, background: callState === "live" ? G.green : G.faint, borderRadius: 2, transition: "height .2s ease" }} />
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
            <button onClick={startCall} style={{ ...btnG, fontSize: 9, padding: "7px 11px" }} disabled={!currentLead || callState !== "idle" || dialerMode === "checking" || dialerMode === "blocked"}>
              {dialerDemoMode ? "Start Simulated Call" : "Start Live Call"}
            </button>
            <button onClick={skipLead} style={{ ...btnO, fontSize: 9, padding: "7px 11px" }} disabled={!currentLead}>Skip Lead</button>
            <button onClick={resetSession} style={{ ...btnO, fontSize: 9, padding: "7px 11px" }}>Reset Queue</button>
            <button onClick={() => fileRef.current?.click()} style={{ ...btnO, fontSize: 9, padding: "7px 11px" }}>Upload CSV Queue</button>
            <input ref={fileRef} type="file" accept=".csv" onChange={onUploadCsv} style={{ display: "none" }} />
          </div>

          {csvName && <div style={{ fontSize: 9, color: G.muted, marginBottom: 10 }}>Active file: {csvName}</div>}

          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 8, color: G.muted, letterSpacing: 2, marginBottom: 4 }}>CALL NOTES</div>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Objections, pain points, and callback context..." style={{ width: "100%", boxSizing: "border-box", resize: "vertical", background: G.surface, border: `1px solid ${G.border}`, borderRadius: 6, color: G.text, fontFamily: G.mono, fontSize: 11, padding: "8px 10px" }} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 6 }}>
            {DIALER_OUTCOMES.map((outcome) => (
              <button
                key={outcome.id}
                onClick={() => markOutcome(outcome.id)}
                disabled={callState !== "live" && callState !== "ringing"}
                style={{
                  ...btnO,
                  borderColor: `${outcome.color}66`,
                  color: outcome.color,
                  background: `${outcome.color}11`,
                  fontSize: 8,
                  padding: "7px 8px",
                }}
              >
                {outcome.id}
              </button>
            ))}
          </div>
        </div>

        <div style={{ ...card }}>
          <div style={{ fontFamily: G.serif, fontSize: 14, marginBottom: 8 }}>Queue Preview</div>
          <div style={{ display: "grid", gap: 7, marginBottom: 12 }}>
            {queue.slice(activeIndex, activeIndex + 5).map((lead, index) => (
              <div key={lead.id} style={{ background: G.surface, border: `1px solid ${index === 0 ? G.green : G.border}`, borderRadius: 6, padding: "8px 9px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3, gap: 8 }}>
                  <div style={{ fontSize: 10, color: G.text }}>{lead.name}</div>
                  <div style={{ fontSize: 8, color: index === 0 ? G.green : G.muted }}>#{activeIndex + index + 1}</div>
                </div>
                <div style={{ fontSize: 9, color: G.muted, marginBottom: 3 }}>{lead.phone}</div>
                <div style={{ fontSize: 8, color: G.muted }}>{lead.address}</div>
              </div>
            ))}
          </div>

          <div style={{ fontFamily: G.serif, fontSize: 14, marginBottom: 8 }}>Recent Call Log</div>
          {callLog.length === 0 && <div style={{ fontSize: 9, color: G.muted }}>No outcomes logged yet.</div>}
          <div style={{ display: "grid", gap: 7 }}>
            {callLog.map((item) => (
              <div key={item.id} style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 6, padding: "8px 9px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <div style={{ fontSize: 10, color: G.text }}>{item.lead}</div>
                  <div style={{ fontSize: 8, color: G.muted }}>{item.at}</div>
                </div>
                <div style={{ fontSize: 8, color: G.gold, marginBottom: 3 }}>{item.outcome} · {item.duration}</div>
                {item.notes && <div style={{ fontSize: 8, color: G.muted }}>{item.notes}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {toast && <div style={{ position: "fixed", right: 14, bottom: 14, background: G.surface, border: `1px solid ${G.green}44`, borderRadius: 8, padding: "8px 12px", color: G.green, fontSize: 10 }}>{toast}</div>}
    </div>
  );
}
