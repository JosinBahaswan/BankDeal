export default async function handler(req, res) {
  // Mock SendGrid email proxy. Replace with real SendGrid server-side call.
  try {
    const body = req.method === "POST" ? (req.body || {}) : {};
    console.log("Mock send-email request", body);
    return res.status(200).json({ ok: true, id: "MOCK_EMAIL_123" });
  } catch (err) {
    console.error("send-email mock error", err);
    return res.status(500).json({ error: "send-email mock error" });
  }
}
