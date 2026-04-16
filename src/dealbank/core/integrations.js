function hasValue(value) {
  return String(value || "").trim().length > 0;
}

export function getLaunchIntegrationStatus() {
  const twilioConfigured = hasValue(import.meta.env.VITE_TWILIO_ACCESS_TOKEN_ENDPOINT) || hasValue(import.meta.env.VITE_TWILIO_ACCOUNT_SID);
  const stripeConfigured = hasValue(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY) && hasValue(import.meta.env.VITE_STRIPE_CHECKOUT_ENDPOINT);
  const emailConfigured = hasValue(import.meta.env.VITE_EXECUTED_CONTRACT_WEBHOOK_URL);
  const storageConfigured = hasValue(import.meta.env.VITE_CONTRACTS_BUCKET);
  const capacitorConfigured = String(import.meta.env.VITE_CAPACITOR_ENABLED || "").toLowerCase() === "true";

  return [
    {
      id: "twilio",
      label: "Twilio Programmable Voice",
      status: twilioConfigured ? "wired" : "required",
      details: twilioConfigured ? "Dialer endpoint configured." : "Set VITE_TWILIO_ACCESS_TOKEN_ENDPOINT for live calling.",
    },
    {
      id: "stripe",
      label: "Stripe Billing + Escrow Split",
      status: stripeConfigured ? "wired" : "required",
      details: stripeConfigured ? "Checkout + billing endpoints configured." : "Set Stripe publishable key and checkout endpoint.",
    },
    {
      id: "pdf",
      label: "Contract PDF Generation",
      status: "wired",
      details: "Client-side PDF generation via pdf-lib is enabled.",
    },
    {
      id: "email",
      label: "Executed Contract Email Delivery",
      status: emailConfigured ? "wired" : "required",
      details: emailConfigured ? "Execution webhook configured for SendGrid/Postmark." : "Set VITE_EXECUTED_CONTRACT_WEBHOOK_URL.",
    },
    {
      id: "storage",
      label: "Signed File Storage",
      status: storageConfigured ? "wired" : "required",
      details: storageConfigured ? "Supabase Storage bucket is configured for contract assets." : "Set VITE_CONTRACTS_BUCKET (or map to S3 bridge).",
    },
    {
      id: "capacitor",
      label: "Mobile Wrapper (Capacitor)",
      status: capacitorConfigured ? "planned" : "required",
      details: capacitorConfigured ? "Capacitor mode flag enabled for mobile rollout tasks." : "Wrap web app with Capacitor before production mobile launch.",
    },
  ];
}

export function integrationStatusColor(status, G) {
  if (status === "wired") return G.green;
  if (status === "planned") return G.blue;
  return G.gold;
}
