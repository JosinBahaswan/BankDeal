import { useEffect, useState } from "react";
import { initiateCall, sendEmail } from "../../core/mockApis";

export default function AnalyzeTabSimple({ ctx }) {
  const {
    G,
    card,
    lbl,
    smIn,
    btnG,
    btnO,
    address,
    setAddress,
    lookupProperty,
    arvNum,
    offer,
    compsData,
    totalReno,
    fmt,
    estimateReno,
    saveDeal,
    runAnalysis,
    analysis,
    isMobile,
    user,
  } = ctx;

  const [msg, setMsg] = useState("");
  const [callModalOpen, setCallModalOpen] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [callStatus, setCallStatus] = useState("");
  const [emailBody, setEmailBody] = useState("");

  useEffect(() => {
    if (address && address.length > 5 && !arvNum && !lookLoad) {
      lookupProperty && lookupProperty();
    }
  }, [address, arvNum, lookupProperty, lookLoad]);

  useEffect(() => {
    if (address && offer) {
      setEmailBody(`Hi Homeowner,\n\nI'm ${user?.name || "an investor"} and I'm interested in your property at ${address}. Based on my analysis, I can offer ${fmt(offer)} cash for a quick close.\n\nPlease let me know if you'd like to discuss further.`);
    }
  }, [address, offer, user?.name, fmt]);

  async function handleCall() {
    setSending(true);
    setCallStatus("Dialing...");
    try {
      const res = await initiateCall({ phone: "(555) 012-3456", address });
      if (res.success) {
        setCallStatus(`Connected! Call Sid: ${res.callSid}`);
        setMsg(`Call log saved for ${address}`);
      }
    } catch (err) {
      setCallStatus("Call failed");
      setMsg(err.message || "Twilio request failed");
    }
    setSending(false);
  }

  async function handleEmail() {
    setSending(true);
    try {
      const res = await sendEmail({ 
        to: "homeowner@example.com", 
        body: emailBody,
        address,
        offer
      });
      if (res.success) {
        setMsg(`Email sent to homeowner regarding ${address}`);
        setEmailModalOpen(false);
      }
    } catch (err) {
      setMsg(err.message || "Email request failed");
    }
    setSending(false);
  }

  return (
    <div style={{ animation: "fadeIn 0.3s ease-out" }}>
      <div style={{ ...card, marginBottom: 16, borderLeft: `4px solid ${G.green}` }}>
        <div style={{ fontFamily: G.serif, fontSize: 18, color: G.text, marginBottom: 12 }}>Step 2: Property Analysis</div>
        <div style={lbl}>Target Address</div>
        <input
          value={address || ""}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Enter property address..."
          style={{ ...smIn, width: "100%", padding: "12px", borderRadius: 8, border: `1px solid ${G.border}`, background: G.surface, color: G.text, marginBottom: 12 }}
        />
        <div style={{ display: "flex", gap: 10, flexDirection: isMobile ? "column" : "row" }}>
          <button onClick={() => lookupProperty && lookupProperty()} style={{ ...btnG, flex: 2 }}>Fetch Market Data (Realty Base)</button>
          <button onClick={() => estimateReno && estimateReno()} style={{ ...btnO, flex: 1 }}>Estimate Renovation</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
        {[
          { l: "ARV", v: arvNum ? fmt(arvNum) : "-", c: G.green },
          { l: "Suggested Offer", v: offer ? fmt(offer) : "-", c: G.green },
          { l: "Reno Estimate", v: totalReno ? fmt(totalReno) : "-", c: G.gold },
          { l: "Market Trend", v: "Stable", c: G.text },
        ].map((item, i) => (
          <div key={i} style={{ ...card, textAlign: "center", padding: "16px 8px" }}>
            <div style={{ ...lbl, fontSize: 10, marginBottom: 4 }}>{item.l}</div>
            <div style={{ fontFamily: G.serif, fontSize: 18, color: item.c, fontWeight: "bold" }}>{item.v}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 16 }}>
        <div style={{ ...card }}>
          <div style={{ ...lbl, color: G.green, marginBottom: 12, display: "flex", justifyContent: "space-between" }}>
            <span>Comparable Sales</span>
            <span style={{ fontSize: 10, color: G.muted }}>2-Mile Radius</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
            {compsData && compsData.length > 0 ? (
              compsData.slice(0, 6).map((c, i) => (
                <div key={i} style={{ padding: "12px", background: G.bg, borderRadius: 8, border: `1px solid ${G.faint}` }}>
                  <div style={{ fontSize: 13, color: G.text, fontWeight: "600" }}>{c.address}</div>
                  <div style={{ fontSize: 12, color: G.muted, marginTop: 4 }}>
                    <span style={{ color: G.green, fontWeight: "bold" }}>{fmt(c.price)}</span> · {c.bedrooms}bd/{c.bathrooms}ba · {c.squareFootage} sqft
                  </div>
                </div>
              ))
            ) : (
              <div style={{ color: G.muted, fontSize: 12, textAlign: "center", padding: 20, gridColumn: "1 / -1" }}>No comparable sales data found.</div>
            )}
          </div>
        </div>

        <div style={{ ...card }}>
          <div style={{ ...lbl, color: G.green, marginBottom: 12 }}>Claude AI Recommendation</div>
          <button onClick={() => runAnalysis && runAnalysis()} style={{ ...btnO, width: "100%", marginBottom: 16, fontSize: 13, padding: "12px" }}>Run AI Analysis</button>
          <div style={{
            fontSize: 15,
            lineHeight: 1.7,
            color: "#e0eee0",
            maxHeight: 600,
            overflowY: "auto",
            padding: "24px",
            background: "#0a140a",
            borderRadius: 12,
            border: `1px solid ${G.green}44`,
            boxShadow: "inset 0 2px 10px rgba(0,0,0,0.5)",
            whiteSpace: "pre-wrap",
          }}>
            {analysis || "AI analysis will appear here after clicking the button above."}
          </div>
        </div>
      </div>

      <div style={{ ...card, borderTop: `1px solid ${G.border}` }}>
        <div style={{ ...lbl, marginBottom: 12 }}>Step 3: Contact Homeowner</div>
        <div style={{ display: "flex", gap: 10, flexDirection: isMobile ? "column" : "row" }}>
          <button onClick={() => setCallModalOpen(true)} style={{ ...btnG, flex: 1, padding: "14px" }}>Call Homeowner (Twilio)</button>
          <button onClick={() => setEmailModalOpen(true)} style={{ ...btnO, flex: 1, padding: "14px" }}>Email Homeowner (SendGrid)</button>
          <button onClick={() => saveDeal && saveDeal()} style={{ ...btnG, flex: 1, padding: "14px", background: G.surface, border: `1px solid ${G.green}`, color: G.green }}>Save to Pipeline</button>
        </div>
      </div>

      {msg && (
        <div style={{
          position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)",
          background: G.green, color: "#000", padding: "10px 20px", borderRadius: 30,
          fontSize: 12, fontWeight: "bold", zIndex: 1000, boxShadow: "0 4px 12px rgba(0,0,0,0.3)"
        }}>
          {msg}
        </div>
      )}

      {callModalOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.8)", display: "grid", placeItems: "center", backdropFilter: "blur(4px)" }}>
          <div style={{ width: isMobile ? "90%" : 400, background: G.card, border: `1px solid ${G.border}`, borderRadius: 16, padding: 24, textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>📞</div>
            <div style={{ fontFamily: G.serif, fontSize: 20, color: G.text, marginBottom: 8 }}>Twilio Dialer</div>
            <div style={{ fontSize: 13, color: G.muted, marginBottom: 24 }}>Calling Homeowner at {address}</div>

            {callStatus && <div style={{ marginBottom: 20, color: G.green, fontWeight: "bold" }}>{callStatus}</div>}

            <div style={{ display: "grid", gap: 10 }}>
              {!callStatus.includes("Connected") ? (
                <button onClick={handleCall} disabled={sending} style={{ ...btnG, padding: 14 }}>{sending ? "Initiating..." : "Start Call"}</button>
              ) : (
                <button onClick={() => { setCallModalOpen(false); setCallStatus(""); }} style={{ ...btnG, background: G.red, color: "#fff", border: "none" }}>End Call</button>
              )}
              <button onClick={() => { setCallModalOpen(false); setCallStatus(""); }} style={{ ...btnO }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {emailModalOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.8)", display: "grid", placeItems: "center", backdropFilter: "blur(4px)" }}>
          <div style={{ width: isMobile ? "90%" : 550, background: G.card, border: `1px solid ${G.border}`, borderRadius: 16, padding: 24 }}>
            <div style={{ fontFamily: G.serif, fontSize: 20, color: G.text, marginBottom: 4 }}>Email Composer</div>
            <div style={{ fontSize: 12, color: G.muted, marginBottom: 16 }}>Powered by SendGrid API</div>

            <div style={{ marginBottom: 16 }}>
              <div style={lbl}>To</div>
              <div style={{ padding: "10px", background: G.surface, borderRadius: 6, fontSize: 13 }}>homeowner@example.com</div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={lbl}>Message Template</div>
              <textarea
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                style={{ ...smIn, width: "100%", height: 180, padding: 12, fontSize: 13, background: G.bg, borderRadius: 8 }}
              />
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={handleEmail} disabled={sending} style={{ ...btnG, flex: 2 }}>{sending ? "Sending..." : "Send Email Now"}</button>
              <button onClick={() => setEmailModalOpen(false)} style={{ ...btnO, flex: 1 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
