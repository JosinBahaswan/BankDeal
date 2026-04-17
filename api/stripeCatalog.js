function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

const PRICE_SPECS = {
  contractor_basic_monthly: {
    envKey: "STRIPE_PRICE_CONTRACTOR_BASIC_MONTHLY",
    fallbackPriceId: "price_contractor_basic_monthly",
    mode: "subscription",
    plan: "basic",
    priceMonthly: 39,
  },
  contractor_pro_monthly: {
    envKey: "STRIPE_PRICE_CONTRACTOR_PRO_MONTHLY",
    fallbackPriceId: "price_contractor_pro_monthly",
    mode: "subscription",
    plan: "pro",
    priceMonthly: 79,
  },
  dealmaker_monthly: {
    envKey: "STRIPE_PRICE_DEALMAKER_MONTHLY",
    fallbackPriceId: "price_dealmaker_monthly",
    mode: "subscription",
    plan: "dealmaker",
    priceMonthly: 149,
  },
  credits_starter: {
    envKey: "STRIPE_PRICE_CREDITS_STARTER",
    fallbackPriceId: "price_credits_starter",
    mode: "payment",
    packTier: "starter",
    credits: 500,
    amountPaid: 49,
  },
  credits_growth: {
    envKey: "STRIPE_PRICE_CREDITS_GROWTH",
    fallbackPriceId: "price_credits_growth",
    mode: "payment",
    packTier: "growth",
    credits: 2000,
    amountPaid: 149,
  },
  credits_pro: {
    envKey: "STRIPE_PRICE_CREDITS_PRO",
    fallbackPriceId: "price_credits_pro",
    mode: "payment",
    packTier: "pro",
    credits: 10000,
    amountPaid: 499,
  },
};

export function resolveStripePriceCatalog() {
  const catalog = {};

  Object.values(PRICE_SPECS).forEach((spec) => {
    const mappedPriceId = text(process.env[spec.envKey]) || spec.fallbackPriceId;
    catalog[mappedPriceId] = {
      ...spec,
      priceId: mappedPriceId,
    };
  });

  return catalog;
}

export function resolveStripePriceConfig(priceId) {
  const catalog = resolveStripePriceCatalog();
  return catalog[text(priceId)] || null;
}

export function mapStripeSubscriptionStatus(status) {
  const normalized = text(status).toLowerCase();
  if (normalized === "active") return "active";
  if (normalized === "trialing") return "trialing";
  if (normalized === "canceled" || normalized === "incomplete_expired") return "canceled";
  return "past_due";
}

export function isSupportedCheckoutMode(mode) {
  return mode === "subscription" || mode === "payment";
}

export function asText(value, fallback = "") {
  const normalized = text(value);
  return normalized || fallback;
}

export function asEmail(value) {
  const email = text(value).toLowerCase();
  if (!email) return "";
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}
