import {
  asNumber,
  asText,
  buildTransferGroup,
  createStripeClient,
  createSupabaseAdminClient,
  jsonBody,
  normalizeCurrency,
  setCors,
  toMajorUnits,
  toMinorUnits,
  verifyStripeActor,
} from "../lib/server/stripeConnectShared.js";
import { enforceRateLimit } from "../lib/server/httpSecurity.js";

function sanitizeMetadata(input) {
  if (!input || typeof input !== "object") return {};

  const next = {};
  Object.entries(input).forEach(([key, value]) => {
    const normalizedKey = asText(key);
    if (!normalizedKey) return;
    next[normalizedKey] = typeof value === "string" ? value.trim() : value;
  });

  return next;
}

async function resolveBeneficiaryFromContract(supabaseAdmin, contractId, payerUserId) {
  const normalizedContractId = asText(contractId);
  if (!normalizedContractId) return "";

  const { data: partyRows, error: partyError } = await supabaseAdmin
    .from("contract_parties")
    .select("email")
    .eq("contract_id", normalizedContractId);

  if (partyError) {
    throw new Error(`Unable to resolve contract parties: ${partyError.message}`);
  }

  const partyEmails = Array.from(new Set((partyRows || [])
    .map((row) => asText(row.email).toLowerCase())
    .filter(Boolean)));

  if (partyEmails.length === 0) return "";

  const { data: userRows, error: userError } = await supabaseAdmin
    .from("users")
    .select("id, email")
    .in("email", partyEmails);

  if (userError) {
    throw new Error(`Unable to resolve contract beneficiary users: ${userError.message}`);
  }

  const matchingIds = Array.from(new Set((userRows || [])
    .map((row) => asText(row.id))
    .filter((userId) => userId && userId !== payerUserId)));

  if (matchingIds.length === 1) {
    return matchingIds[0];
  }

  return "";
}

export default async function handler(req, res) {
  const cors = setCors(req, res, "POST, OPTIONS");

  if (req.method === "OPTIONS") {
    if (!cors.originAllowed) return res.status(403).json({ error: "CORS origin is not allowed" });
    return res.status(204).end();
  }

  if (!cors.originAllowed) {
    return res.status(403).json({ error: "CORS origin is not allowed" });
  }

  const rateLimit = enforceRateLimit(req, res, {
    keyPrefix: "stripe-escrow-create",
    max: Number(process.env.RATE_LIMIT_STRIPE_ESCROW_MAX || 30),
    windowMs: Number(process.env.RATE_LIMIT_STRIPE_ESCROW_WINDOW_MS || process.env.RATE_LIMIT_WINDOW_MS || 60_000),
  });
  if (!rateLimit.allowed) {
    return res.status(429).json({ error: "Too many requests. Please retry later." });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body = jsonBody(req);
  if (!body) {
    return res.status(400).json({ error: "Invalid JSON body" });
  }

  let stripe;
  let supabaseAdmin;
  try {
    stripe = createStripeClient();
    supabaseAdmin = createSupabaseAdminClient();
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Unable to initialize Stripe escrow service" });
  }

  let actor;
  try {
    actor = await verifyStripeActor(req, supabaseAdmin, {
      allowedTypes: ["dealmaker"],
    });
  } catch (error) {
    return res.status(401).json({ error: error?.message || "Unauthorized" });
  }

  const contractId = asText(body.contractId);
  const requestedBeneficiaryUserId = asText(body.beneficiaryUserId);
  const currency = normalizeCurrency(body.currency, "usd");
  const amount = asNumber(body.amount, 0);
  const feeRate = asNumber(body.platformFeeRate, asNumber(process.env.STRIPE_ESCROW_PLATFORM_FEE_RATE, 1.5));
  const title = asText(body.title, "DealBank Earnest Money Escrow");
  const memo = asText(body.memo);
  const idempotencyKey = asText(body.idempotencyKey);
  const metadata = sanitizeMetadata(body.metadata);

  let beneficiaryUserId = requestedBeneficiaryUserId;
  if (contractId) {
    const { data: contractRow, error: contractError } = await supabaseAdmin
      .from("contracts")
      .select("id, creator_id")
      .eq("id", contractId)
      .maybeSingle();

    if (contractError) {
      return res.status(500).json({ error: `Unable to validate contract: ${contractError.message}` });
    }

    if (!contractRow?.id) {
      return res.status(404).json({ error: "Contract was not found" });
    }

    if (!actor.isAdmin && asText(contractRow.creator_id) !== actor.userId) {
      return res.status(403).json({ error: "Only the contract owner can create escrow from this contract" });
    }
  }

  if (!beneficiaryUserId) {
    try {
      beneficiaryUserId = await resolveBeneficiaryFromContract(supabaseAdmin, contractId, actor.userId);
    } catch (error) {
      return res.status(500).json({ error: error?.message || "Unable to auto-resolve escrow beneficiary" });
    }
  }

  if (!beneficiaryUserId) {
    return res.status(400).json({
      error: "Unable to auto-resolve beneficiaryUserId from contract parties. Provide beneficiaryUserId explicitly.",
    });
  }

  if (amount <= 0) {
    return res.status(400).json({ error: "amount must be greater than zero" });
  }

  if (feeRate < 0 || feeRate > 100) {
    return res.status(400).json({ error: "platformFeeRate must be between 0 and 100" });
  }

  if (beneficiaryUserId === actor.userId) {
    return res.status(400).json({ error: "beneficiaryUserId must be different from payer user" });
  }

  const { data: beneficiaryUser, error: beneficiaryError } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("id", beneficiaryUserId)
    .maybeSingle();

  if (beneficiaryError) {
    return res.status(500).json({ error: `Unable to validate beneficiary user: ${beneficiaryError.message}` });
  }

  if (!beneficiaryUser?.id) {
    return res.status(404).json({ error: "Beneficiary user was not found" });
  }

  let amountMinor;
  try {
    amountMinor = toMinorUnits(amount);
  } catch (error) {
    return res.status(400).json({ error: error?.message || "Invalid amount" });
  }

  const transferGroup = buildTransferGroup("escrow");
  const paymentIntentPayload = {
    amount: amountMinor,
    currency,
    automatic_payment_methods: {
      enabled: true,
    },
    transfer_group: transferGroup,
    description: memo ? `${title} - ${memo}` : title,
    metadata: {
      dealbank_escrow: "true",
      payer_user_id: actor.userId,
      beneficiary_user_id: beneficiaryUserId,
      contract_id: contractId || "",
      platform_fee_rate: String(feeRate),
      beneficiary_source: requestedBeneficiaryUserId ? "explicit" : "auto_contract_party",
      ...metadata,
    },
  };

  let paymentIntent;
  try {
    paymentIntent = await stripe.paymentIntents.create(
      paymentIntentPayload,
      idempotencyKey ? { idempotencyKey } : undefined,
    );
  } catch (error) {
    return res.status(502).json({
      error: error?.message || "Failed to create Stripe PaymentIntent for escrow",
    });
  }

  const escrowInsert = {
    contract_id: contractId || null,
    payer_user_id: actor.userId,
    beneficiary_user_id: beneficiaryUserId,
    created_by: actor.userId,
    amount: toMajorUnits(paymentIntent.amount),
    currency,
    platform_fee_rate: feeRate,
    status: "pending",
    stripe_payment_intent_id: paymentIntent.id,
    transfer_group: transferGroup,
    metadata: {
      title,
      memo,
      ...metadata,
    },
  };

  const { data: escrowRow, error: escrowInsertError } = await supabaseAdmin
    .from("escrow_transactions")
    .insert(escrowInsert)
    .select("id, status")
    .single();

  if (escrowInsertError) {
    try {
      await stripe.paymentIntents.cancel(paymentIntent.id);
    } catch {
      // no-op: best effort cleanup only.
    }

    return res.status(500).json({
      error: `Failed to persist escrow transaction: ${escrowInsertError.message}`,
    });
  }

  return res.status(200).json({
    escrowId: escrowRow.id,
    status: escrowRow.status,
    paymentIntentId: paymentIntent.id,
    clientSecret: paymentIntent.client_secret,
    beneficiaryUserId,
    amount: toMajorUnits(paymentIntent.amount),
    currency,
    transferGroup,
  });
}
