import { useEffect, useMemo, useState } from "react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { createEarnestMoneyEscrow } from "../../../core/stripeEscrow";

const STRIPE_PUBLISHABLE_KEY = String(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "").trim();

function asCurrencyValue(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return Number(parsed.toFixed(2));
}

function EscrowPaymentElementForm({ G, btnG, clientSecret, onSucceeded }) {
  const stripe = useStripe();
  const elements = useElements();
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [confirmError, setConfirmError] = useState("");
  const [confirmState, setConfirmState] = useState("");

  async function onConfirmPayment(event) {
    event.preventDefault();
    if (!stripe || !elements || confirmBusy) return;

    setConfirmBusy(true);
    setConfirmError("");
    setConfirmState("");

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: "if_required",
        confirmParams: {
          return_url: typeof window !== "undefined" ? window.location.href : undefined,
        },
      });

      if (error) {
        setConfirmError(error.message || "Escrow payment confirmation failed.");
        return;
      }

      const normalizedStatus = String(paymentIntent?.status || "").toLowerCase();
      if (normalizedStatus === "succeeded") {
        setConfirmState("Escrow payment succeeded. Funding status will sync from Stripe webhook.");
        if (typeof onSucceeded === "function") onSucceeded(paymentIntent);
        return;
      }

      if (normalizedStatus === "processing") {
        setConfirmState("Payment is processing. Escrow status will update shortly.");
        return;
      }

      setConfirmState(`Payment status: ${paymentIntent?.status || "unknown"}`);
    } finally {
      setConfirmBusy(false);
    }
  }

  return (
    <form onSubmit={onConfirmPayment}>
      <div style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 6, padding: "10px", marginBottom: 8 }}>
        <PaymentElement id={`escrow-payment-${clientSecret.slice(-8)}`} options={{ layout: "tabs" }} />
      </div>

      {confirmError && <div style={{ fontSize: 10, color: G.red, marginBottom: 8 }}>{confirmError}</div>}
      {confirmState && <div style={{ fontSize: 10, color: G.green, marginBottom: 8 }}>{confirmState}</div>}

      <button
        type="submit"
        disabled={!stripe || !elements || confirmBusy}
        style={{
          ...btnG,
          width: "100%",
          fontSize: 9,
          opacity: !stripe || !elements || confirmBusy ? 0.72 : 1,
          cursor: !stripe || !elements || confirmBusy ? "not-allowed" : "pointer",
        }}
      >
        {confirmBusy ? "Confirming Payment..." : "Pay Escrow"}
      </button>
    </form>
  );
}

export default function ContractsEscrowPaymentPanel({
  G,
  card,
  lbl,
  btnG,
  btnO,
  activeContract,
}) {
  const [stripePromise, setStripePromise] = useState(null);
  const [beneficiaryUserId, setBeneficiaryUserId] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [platformFeeRate, setPlatformFeeRate] = useState("1.5");
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createNote, setCreateNote] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [escrowSummary, setEscrowSummary] = useState(null);

  const contractId = String(activeContract?.id || "").trim();
  const defaultEarnest = useMemo(() => String(activeContract?.formVals?.earnestMoney || "").trim(), [activeContract?.formVals?.earnestMoney]);

  useEffect(() => {
    setAmount(defaultEarnest);
    setMemo("");
    setClientSecret("");
    setCreateError("");
    setCreateNote("");
    setEscrowSummary(null);
  }, [contractId, defaultEarnest]);

  async function onCreateEscrowIntent() {
    if (createBusy) return;
    setCreateBusy(true);
    setCreateError("");
    setCreateNote("");

    try {
      if (!contractId) {
        throw new Error("Contract context is missing.");
      }

      if (!STRIPE_PUBLISHABLE_KEY) {
        throw new Error("Missing VITE_STRIPE_PUBLISHABLE_KEY for PaymentElement.");
      }

      // Ensure Stripe.js is loaded lazily to avoid network requests during unrelated app usage
      if (!stripePromise) {
        setStripePromise(loadStripe(STRIPE_PUBLISHABLE_KEY));
      }

      const normalizedAmount = asCurrencyValue(amount);
      if (normalizedAmount <= 0) {
        throw new Error("Escrow amount must be greater than zero.");
      }

      const normalizedBeneficiary = String(beneficiaryUserId || "").trim();

      const result = await createEarnestMoneyEscrow({
        contractId,
        beneficiaryUserId: normalizedBeneficiary || undefined,
        amount: normalizedAmount,
        currency: "usd",
        platformFeeRate: asCurrencyValue(platformFeeRate) || 1.5,
        title: "DealBank Earnest Money Escrow",
        memo: String(memo || "").trim() || undefined,
        metadata: {
          source: "contracts_tab_payment_element",
          contract_name: String(activeContract?.name || ""),
        },
      });

      if (!String(result?.clientSecret || "").trim()) {
        throw new Error("Escrow client secret was not returned by API.");
      }

      setClientSecret(result.clientSecret);
      setEscrowSummary({
        escrowId: result.escrowId,
        paymentIntentId: result.paymentIntentId,
        beneficiaryUserId: result.beneficiaryUserId,
        amount: result.amount,
        currency: result.currency,
        status: result.status,
      });
      setCreateNote("Escrow payment intent created. Complete payment below.");
    } catch (error) {
      setCreateError(error?.message || "Failed to create escrow payment intent.");
      setClientSecret("");
      setEscrowSummary(null);
    } finally {
      setCreateBusy(false);
    }
  }

  return (
    <div style={{ ...card, marginTop: 10, borderColor: `${G.blue}44` }}>
      <div style={{ ...lbl, color: G.blue, marginBottom: 6 }}>Stripe Escrow Payment (PaymentElement)</div>
      <div style={{ fontSize: 10, color: G.muted, lineHeight: 1.7, marginBottom: 8 }}>
        Create escrow PaymentIntent, then pay it directly from this contract view. Beneficiary is auto-resolved from contract parties unless you override it below.
      </div>

      {!STRIPE_PUBLISHABLE_KEY && (
        <div style={{ fontSize: 10, color: G.red, marginBottom: 8 }}>
          Missing VITE_STRIPE_PUBLISHABLE_KEY. Add it to frontend env to enable PaymentElement.
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8, marginBottom: 8 }}>
        <div>
          <div style={lbl}>Beneficiary User ID (optional override)</div>
          <input
            value={beneficiaryUserId}
            onChange={(event) => setBeneficiaryUserId(event.target.value)}
            placeholder="Leave empty to auto-resolve from contract parties"
            style={{ width: "100%", background: G.surface, border: `1px solid ${G.border}`, borderRadius: 6, color: G.text, fontFamily: G.mono, fontSize: 11, padding: "8px 10px", boxSizing: "border-box", outline: "none" }}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div>
            <div style={lbl}>Escrow Amount (USD)</div>
            <input
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="2500"
              style={{ width: "100%", background: G.surface, border: `1px solid ${G.border}`, borderRadius: 6, color: G.text, fontFamily: G.mono, fontSize: 11, padding: "8px 10px", boxSizing: "border-box", outline: "none" }}
            />
          </div>
          <div>
            <div style={lbl}>Platform Fee Rate %</div>
            <input
              value={platformFeeRate}
              onChange={(event) => setPlatformFeeRate(event.target.value)}
              placeholder="1.5"
              style={{ width: "100%", background: G.surface, border: `1px solid ${G.border}`, borderRadius: 6, color: G.text, fontFamily: G.mono, fontSize: 11, padding: "8px 10px", boxSizing: "border-box", outline: "none" }}
            />
          </div>
        </div>

        <div>
          <div style={lbl}>Memo (optional)</div>
          <input
            value={memo}
            onChange={(event) => setMemo(event.target.value)}
            placeholder="Escrow for earnest money"
            style={{ width: "100%", background: G.surface, border: `1px solid ${G.border}`, borderRadius: 6, color: G.text, fontFamily: G.mono, fontSize: 11, padding: "8px 10px", boxSizing: "border-box", outline: "none" }}
          />
        </div>
      </div>

      {createError && <div style={{ fontSize: 10, color: G.red, marginBottom: 8 }}>{createError}</div>}
      {createNote && <div style={{ fontSize: 10, color: G.green, marginBottom: 8 }}>{createNote}</div>}

      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <button
          onClick={onCreateEscrowIntent}
          disabled={createBusy || !STRIPE_PUBLISHABLE_KEY}
          style={{
            ...btnO,
            fontSize: 9,
            padding: "6px 10px",
            borderColor: G.blue,
            color: G.blue,
            opacity: createBusy || !STRIPE_PUBLISHABLE_KEY ? 0.7 : 1,
            cursor: createBusy || !STRIPE_PUBLISHABLE_KEY ? "not-allowed" : "pointer",
          }}
        >
          {createBusy ? "Creating Escrow..." : "Create Escrow Intent"}
        </button>

        {clientSecret && (
          <button
            onClick={() => {
              setClientSecret("");
              setCreateNote("");
            }}
            style={{ ...btnO, fontSize: 9, padding: "6px 10px" }}
          >
            Reset Payment Form
          </button>
        )}
      </div>

      {escrowSummary && (
        <div style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 6, padding: "8px 10px", fontSize: 9, color: G.muted, marginBottom: 8, lineHeight: 1.7 }}>
          Escrow ID: {escrowSummary.escrowId}<br />
          PaymentIntent: {escrowSummary.paymentIntentId}<br />
          Beneficiary User: {escrowSummary.beneficiaryUserId || "auto-resolved"}<br />
          Status: {escrowSummary.status}<br />
          Amount: {escrowSummary.amount} {String(escrowSummary.currency || "usd").toUpperCase()}
        </div>
      )}

      {clientSecret && stripePromise && (
        <Elements
          stripe={stripePromise}
          key={escrowSummary?.paymentIntentId || clientSecret}
          options={{
            clientSecret,
            appearance: {
              theme: "night",
            },
          }}
        >
          <EscrowPaymentElementForm
            G={G}
            btnG={btnG}
            clientSecret={clientSecret}
            onSucceeded={() => {
              setCreateNote("Escrow payment submitted successfully.");
            }}
          />
        </Elements>
      )}
    </div>
  );
}
