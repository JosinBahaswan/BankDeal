function hasValue(value) {
  return String(value || "").trim().length > 0;
}

export function getLaunchIntegrationStatus() {
  const twilioConfigured = hasValue(import.meta.env.VITE_TWILIO_ACCESS_TOKEN_ENDPOINT) || hasValue(import.meta.env.VITE_TWILIO_ACCOUNT_SID);
  const stripeCheckoutConfigured = hasValue(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY) && hasValue(import.meta.env.VITE_STRIPE_CHECKOUT_ENDPOINT);
  const stripeConnectConfigured = hasValue(import.meta.env.VITE_STRIPE_CONNECT_ACCOUNT_ENDPOINT)
    && hasValue(import.meta.env.VITE_STRIPE_ESCROW_CREATE_ENDPOINT)
    && hasValue(import.meta.env.VITE_STRIPE_ESCROW_RELEASE_ENDPOINT);
  const emailConfigured = hasValue(import.meta.env.VITE_EXECUTED_CONTRACT_WEBHOOK_URL);
  const contractsBucketConfigured = hasValue(import.meta.env.VITE_CONTRACTS_BUCKET);
  const contractorPhotosBucketConfigured = hasValue(import.meta.env.VITE_CONTRACTOR_PHOTOS_BUCKET);
  const storageConfigured = contractsBucketConfigured && contractorPhotosBucketConfigured;
  const capacitorConfigured = String(import.meta.env.VITE_CAPACITOR_ENABLED || "").toLowerCase() === "true";
  const capacitorPushConfigured = String(import.meta.env.VITE_CAPACITOR_PUSH_ENABLED || "").toLowerCase() === "true";
  const capacitorCameraConfigured = String(import.meta.env.VITE_CAPACITOR_CAMERA_ENABLED || "true").toLowerCase() !== "false";

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
      status: stripeCheckoutConfigured && stripeConnectConfigured ? "wired" : stripeCheckoutConfigured ? "planned" : "required",
      details: stripeCheckoutConfigured && stripeConnectConfigured
        ? "Checkout, Connect onboarding, and escrow release endpoints configured."
        : stripeCheckoutConfigured
          ? "Checkout is configured. Add Connect + escrow endpoints for production marketplace payouts."
          : "Set Stripe publishable key and checkout endpoint.",
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
      details: storageConfigured
        ? "Contracts and contractor photo buckets are configured."
        : "Set both VITE_CONTRACTS_BUCKET and VITE_CONTRACTOR_PHOTOS_BUCKET and apply storage policies.",
    },
    {
      id: "capacitor",
      label: "Mobile Wrapper (Capacitor)",
      status: capacitorConfigured && capacitorPushConfigured && capacitorCameraConfigured
        ? "wired"
        : capacitorConfigured
          ? "planned"
          : "required",
      details: capacitorConfigured && capacitorPushConfigured && capacitorCameraConfigured
        ? "Capacitor, push notifications, and camera hooks are enabled."
        : capacitorConfigured
          ? "Capacitor enabled. Set push/camera flags and native credentials before launch."
          : "Wrap web app with Capacitor before production mobile launch.",
    },
  ];
}

export function integrationStatusColor(status, G) {
  if (status === "wired") return G.green;
  if (status === "planned") return G.blue;
  return G.gold;
}
