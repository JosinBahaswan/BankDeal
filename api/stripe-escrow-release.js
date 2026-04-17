import {
  asNumber,
  asText,
  createStripeClient,
  createSupabaseAdminClient,
  jsonBody,
  normalizeCurrency,
  roundMoney,
  setCors,
  toMinorUnits,
  verifyStripeActor,
} from "../lib/server/stripeConnectShared.js";

function feeBreakdown(amount, feeRatePct) {
  const grossAmount = asNumber(amount, 0);
  const rate = asNumber(feeRatePct, 1.5);

  const platformFee = roundMoney((grossAmount * rate) / 100);
  const beneficiaryAmount = roundMoney(Math.max(0, grossAmount - platformFee));

  return {
    grossAmount,
    platformFee,
    beneficiaryAmount,
    rate,
  };
}

export default async function handler(req, res) {
  setCors(res, "POST, OPTIONS");

  if (req.method === "OPTIONS") return res.status(204).end();

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
    return res.status(500).json({ error: error?.message || "Unable to initialize escrow release service" });
  }

  let actor;
  try {
    actor = await verifyStripeActor(req, supabaseAdmin, {
      allowedTypes: ["dealmaker"],
    });
  } catch (error) {
    return res.status(401).json({ error: error?.message || "Unauthorized" });
  }

  const escrowId = asText(body.escrowId);
  const releaseNotes = asText(body.releaseNotes);
  const closeReference = asText(body.closeReference);
  const idempotencyKey = asText(body.idempotencyKey, `escrow_release_${escrowId}`);

  if (!escrowId) {
    return res.status(400).json({ error: "escrowId is required" });
  }

  const { data: escrowRow, error: escrowLookupError } = await supabaseAdmin
    .from("escrow_transactions")
    .select("id, payer_user_id, beneficiary_user_id, created_by, amount, currency, platform_fee_rate, status, transfer_group, stripe_payment_intent_id")
    .eq("id", escrowId)
    .maybeSingle();

  if (escrowLookupError) {
    return res.status(500).json({ error: `Unable to read escrow transaction: ${escrowLookupError.message}` });
  }

  if (!escrowRow?.id) {
    return res.status(404).json({ error: "Escrow transaction not found" });
  }

  const actorCanRelease = actor.isAdmin
    || escrowRow.created_by === actor.userId
    || escrowRow.payer_user_id === actor.userId;

  if (!actorCanRelease) {
    return res.status(403).json({ error: "Only the payer, creator, or admin can release this escrow" });
  }

  if (escrowRow.status === "released") {
    return res.status(409).json({ error: "Escrow transaction has already been released" });
  }

  if (escrowRow.status !== "funded") {
    return res.status(409).json({ error: `Escrow must be funded before release (current status: ${escrowRow.status})` });
  }

  const { data: beneficiaryConnect, error: beneficiaryConnectError } = await supabaseAdmin
    .from("connect_accounts")
    .select("stripe_account_id, payouts_enabled, details_submitted")
    .eq("user_id", escrowRow.beneficiary_user_id)
    .maybeSingle();

  if (beneficiaryConnectError) {
    return res.status(500).json({ error: `Unable to resolve beneficiary Connect account: ${beneficiaryConnectError.message}` });
  }

  if (!beneficiaryConnect?.stripe_account_id) {
    return res.status(409).json({ error: "Beneficiary does not have an active Stripe Connect account" });
  }

  const stripeAccount = await stripe.accounts.retrieve(beneficiaryConnect.stripe_account_id);
  if (!stripeAccount?.payouts_enabled || !stripeAccount?.details_submitted) {
    return res.status(409).json({
      error: "Beneficiary Stripe Connect account is not payout-ready",
    });
  }

  const breakdown = feeBreakdown(escrowRow.amount, escrowRow.platform_fee_rate || 1.5);
  if (breakdown.beneficiaryAmount <= 0) {
    return res.status(409).json({ error: "Beneficiary disbursement amount is zero after fee calculation" });
  }

  let transfer;
  try {
    transfer = await stripe.transfers.create(
      {
        amount: toMinorUnits(breakdown.beneficiaryAmount),
        currency: normalizeCurrency(escrowRow.currency, "usd"),
        destination: beneficiaryConnect.stripe_account_id,
        transfer_group: asText(escrowRow.transfer_group, `escrow_${escrowRow.id}`),
        metadata: {
          escrow_id: escrowRow.id,
          close_reference: closeReference,
          payer_user_id: asText(escrowRow.payer_user_id),
          beneficiary_user_id: asText(escrowRow.beneficiary_user_id),
          platform_fee_amount: String(breakdown.platformFee),
          platform_fee_rate: String(breakdown.rate),
        },
      },
      { idempotencyKey },
    );
  } catch (error) {
    return res.status(502).json({
      error: error?.message || "Failed to transfer escrow funds to connected account",
    });
  }

  const nowIso = new Date().toISOString();

  const { error: escrowUpdateError } = await supabaseAdmin
    .from("escrow_transactions")
    .update({
      status: "released",
      platform_fee_amount: breakdown.platformFee,
      beneficiary_amount: breakdown.beneficiaryAmount,
      released_at: nowIso,
      release_notes: releaseNotes || null,
    })
    .eq("id", escrowRow.id);

  if (escrowUpdateError) {
    return res.status(500).json({
      error: `Transfer succeeded (${transfer.id}) but escrow update failed: ${escrowUpdateError.message}`,
    });
  }

  const { error: disbursementError } = await supabaseAdmin
    .from("escrow_disbursements")
    .insert({
      escrow_id: escrowRow.id,
      beneficiary_user_id: escrowRow.beneficiary_user_id,
      released_by: actor.userId,
      connected_account_id: beneficiaryConnect.stripe_account_id,
      transfer_amount: breakdown.beneficiaryAmount,
      platform_fee_amount: breakdown.platformFee,
      currency: normalizeCurrency(escrowRow.currency, "usd"),
      stripe_transfer_id: transfer.id,
      status: "succeeded",
      metadata: {
        close_reference: closeReference,
        stripe_payment_intent_id: asText(escrowRow.stripe_payment_intent_id),
      },
    });

  if (disbursementError) {
    return res.status(500).json({
      error: `Escrow released but disbursement log failed: ${disbursementError.message}`,
    });
  }

  return res.status(200).json({
    escrowId: escrowRow.id,
    transferId: transfer.id,
    grossAmount: breakdown.grossAmount,
    platformFeeAmount: breakdown.platformFee,
    beneficiaryAmount: breakdown.beneficiaryAmount,
    currency: normalizeCurrency(escrowRow.currency, "usd"),
    status: "released",
  });
}
