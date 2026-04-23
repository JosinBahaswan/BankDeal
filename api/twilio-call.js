export default async function handler(req, res) {
  // Mock Twilio call proxy. Server-side should initiate an actual Twilio call using secure keys.
  try {
    const body = req.method === "POST" ? (req.body || {}) : {};
    console.log("Mock Twilio call request", body);
    return res.status(200).json({ ok: true, sid: "MOCK_CALL_SID_123" });
  } catch (err) {
    console.error("twilio-call mock error", err);
    return res.status(500).json({ error: "twilio mock error" });
  }
}
