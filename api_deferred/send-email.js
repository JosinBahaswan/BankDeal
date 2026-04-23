import sgMail from "@sendgrid/mail";

export default async function handler(req, res) {
  const apiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.SENDGRID_FROM_EMAIL || "info@dealbank.app";

  if (!apiKey) {
    return res.status(500).json({ 
      error: "SENDGRID_API_KEY is missing. Please check Vercel environment variables." 
    });
  }

  sgMail.setApiKey(apiKey);

  try {
    const body = req.method === "POST" ? (req.body || {}) : {};
    const { to, subject, body: emailBody, address, offer } = body;

    if (!to) {
      return res.status(400).json({ error: "Recipient email (to) is required" });
    }

    const msg = {
      to,
      from: fromEmail,
      subject: subject || `Purchase Offer for ${address || "your property"}`,
      text: emailBody || `Hello,\n\nI am interested in your property at ${address}. My cash offer is ${offer}.\n\nBest regards.`,
      // html: `<strong>${emailBody}</strong>`, // Optional: Add HTML support
    };

    const [response] = await sgMail.send(msg);

    console.log(`Email sent via SendGrid: ${response.statusCode} to ${to}`);

    return res.status(200).json({ 
      ok: true, 
      id: response.headers["x-message-id"],
      status: response.statusCode 
    });
  } catch (err) {
    console.error("send-email production error", err);
    return res.status(err.code || 502).json({ 
      error: err.message || "SendGrid email failed",
      details: err.response?.body || {}
    });
  }
}
