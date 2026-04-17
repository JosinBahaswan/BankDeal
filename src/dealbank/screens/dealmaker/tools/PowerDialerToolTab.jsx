import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../../../lib/supabaseClient";
import { DIALER_OUTCOMES, DIALER_QUEUE_SEED } from "./toolData";

function fmtClock(totalSec) {
  const sec = Math.max(0, totalSec || 0);
  const mm = String(Math.floor(sec / 60)).padStart(2, "0");
  const ss = String(sec % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function parseCsvRows(text) {
  const rawLines = String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (rawLines.length === 0) return [];

  const hasHeader = /name|phone|address/i.test(rawLines[0]);
  const lines = hasHeader ? rawLines.slice(1) : rawLines;

  return lines
    .map((line, i) => {
      const cols = line.split(",").map((item) => item.trim());
      if (cols.length < 2) return null;
      return {
        id: `imp-${Date.now()}-${i}`,
        name: cols[0],
        phone: cols[1],
        address: cols[2] || "Address not provided",
        tags: ["Imported"],
      };
    })
    .filter(Boolean);
}

export default function PowerDialerToolTab({ ctx }) {
  const { G, card, btnG, btnO, user } = ctx;
  const dialerDemoMode = true;

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
    if (callState !== "ringing") return undefined;
    const t = setTimeout(() => {
      setCallState("live");
      setWaveSeed(Math.random() * 8);
    }, 1800);
    return () => clearTimeout(t);
  }, [callState]);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(""), 1800);
    return () => clearTimeout(t);
  }, [toast]);

  const startCall = () => {
    if (!currentLead) return;
    if (!sessionActive) setSessionActive(true);
    setCallState("ringing");
    setElapsedSec(0);
    setNotes("");
  };

  const skipLead = () => {
    if (!currentLead) return;
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

    if (user?.id) {
      const { error } = await supabase.from("call_logs").insert({
        caller_id: user.id,
        lead_name: currentLead.name,
        phone: currentLead.phone,
        address: currentLead.address,
        outcome: mapOutcomeToDb(outcomeId),
        notes: notes || null,
        duration_sec: elapsedSec,
        called_at: new Date().toISOString(),
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
    const file = event.target.files?.[0];
    if (!file) return;

    const rows = parseCsvRows(await file.text());
    if (rows.length === 0) {
      setToast("CSV import failed. Use name,phone,address format.");
      return;
    }

    setQueue(rows);
    setActiveIndex(0);
    setCallState("idle");
    setElapsedSec(0);
    setNotes("");
    setCsvName(file.name);
    setToast(`Imported ${rows.length} leads`);
  };

  return (
    <div>
      <div style={{ fontFamily: G.serif, fontSize: 18, marginBottom: 4 }}>Power Dialer</div>
      <div style={{ fontSize: 10, color: G.muted, marginBottom: 14 }}>Run focused call waves, log outcomes, and keep momentum high.</div>

      {dialerDemoMode && (
        <div style={{ ...card, borderColor: `${G.gold}66`, background: `${G.gold}12`, marginBottom: 12, padding: "10px 12px" }}>
          <div style={{ display: "inline-block", fontSize: 8, letterSpacing: 1.5, color: G.gold, border: `1px solid ${G.gold}88`, borderRadius: 999, padding: "2px 8px", marginBottom: 6 }}>
            DEMO MODE
          </div>
          <div style={{ fontSize: 10, color: G.text }}>
            Calls are simulated in-app (no live Twilio voice session yet). Use this for workflow rehearsal and outcome tracking only.
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
            <button onClick={startCall} style={{ ...btnG, fontSize: 9, padding: "7px 11px" }} disabled={!currentLead || callState !== "idle"}>Start Simulated Call</button>
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
