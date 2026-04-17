import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

const LIVE_SUBSCRIPTION_STATUSES = ["active", "trialing"];

function toNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function emptyMetrics() {
  return {
    totalUsers: 0,
    dealMakerUsers: 0,
    contractorUsers: 0,
    realtorUsers: 0,
    dealMakerMrr: 0,
    contractorMrr: 0,
    totalMrr: 0,
    arrProjection: 0,
    dealMakerSharePct: 0,
    contractorSharePct: 0,
    creditRevenue: 0,
    platformFeeRevenue: 0,
    platformFeePending: 0,
    platformFeeDisbursed: 0,
    dealsTotal: 0,
    dealsClosed: 0,
  };
}

function classifySubscriptionPlan(plan) {
  const normalized = String(plan || "").toLowerCase();
  if (normalized.includes("dealmaker")) return "dealmaker";
  return "contractor";
}

export default function useAdminMetrics(user) {
  const [metrics, setMetrics] = useState(() => emptyMetrics());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadMetrics = useCallback(async () => {
    if (!user?.id || user?.type !== "admin") {
      setMetrics(emptyMetrics());
      setError("Sign in with a Supabase admin account to view live revenue metrics.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    const [usersRes, subsRes, creditsRes, feesRes, dealsRes] = await Promise.all([
      supabase.from("users").select("id, type"),
      supabase
        .from("subscriptions")
        .select("plan, price_monthly, status")
        .in("status", LIVE_SUBSCRIPTION_STATUSES),
      supabase.from("credit_purchases").select("amount_paid, credits_remaining"),
      supabase.from("platform_fees").select("fee_amount, status"),
      supabase.from("deals").select("id, stage"),
    ]);

    const firstError = usersRes.error || subsRes.error || creditsRes.error || feesRes.error || dealsRes.error;
    if (firstError) {
      setError(firstError.message || "Failed to load admin metrics from Supabase.");
      setLoading(false);
      return;
    }

    const users = usersRes.data || [];
    const subscriptions = subsRes.data || [];
    const creditPurchases = creditsRes.data || [];
    const platformFees = feesRes.data || [];
    const deals = dealsRes.data || [];

    const dealMakerUsers = users.filter((row) => row.type === "dealmaker").length;
    const contractorUsers = users.filter((row) => row.type === "contractor").length;
    const realtorUsers = users.filter((row) => row.type === "realtor").length;

    let dealMakerMrr = 0;
    let contractorMrr = 0;

    subscriptions.forEach((row) => {
      const priceMonthly = toNumber(row.price_monthly);
      if (classifySubscriptionPlan(row.plan) === "dealmaker") {
        dealMakerMrr += priceMonthly;
      } else {
        contractorMrr += priceMonthly;
      }
    });

    const totalMrr = dealMakerMrr + contractorMrr;
    const arrProjection = totalMrr * 12;
    const dealMakerSharePct = totalMrr > 0 ? Math.round((dealMakerMrr / totalMrr) * 100) : 0;
    const contractorSharePct = totalMrr > 0 ? Math.round((contractorMrr / totalMrr) * 100) : 0;

    const creditRevenue = creditPurchases.reduce((sum, row) => sum + toNumber(row.amount_paid), 0);
    const platformFeeRevenue = platformFees.reduce((sum, row) => sum + toNumber(row.fee_amount), 0);
    const platformFeePending = platformFees.filter((row) => String(row.status || "").toLowerCase() === "pending").length;
    const platformFeeDisbursed = platformFees.filter((row) => String(row.status || "").toLowerCase() === "disbursed").length;

    const dealsTotal = deals.length;
    const dealsClosed = deals.filter((row) => String(row.stage || "").toLowerCase() === "closed").length;

    setMetrics({
      totalUsers: users.length,
      dealMakerUsers,
      contractorUsers,
      realtorUsers,
      dealMakerMrr,
      contractorMrr,
      totalMrr,
      arrProjection,
      dealMakerSharePct,
      contractorSharePct,
      creditRevenue,
      platformFeeRevenue,
      platformFeePending,
      platformFeeDisbursed,
      dealsTotal,
      dealsClosed,
    });

    setLoading(false);
  }, [user?.id, user?.type]);

  useEffect(() => {
    const timerId = setTimeout(() => {
      loadMetrics();
    }, 0);

    return () => clearTimeout(timerId);
  }, [loadMetrics]);

  useEffect(() => {
    if (!user?.id || user?.type !== "admin") return undefined;

    const channel = supabase
      .channel(`admin-metrics-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "subscriptions" }, loadMetrics)
      .on("postgres_changes", { event: "*", schema: "public", table: "credit_purchases" }, loadMetrics)
      .on("postgres_changes", { event: "*", schema: "public", table: "platform_fees" }, loadMetrics)
      .subscribe();

    const intervalId = setInterval(loadMetrics, 30000);

    return () => {
      clearInterval(intervalId);
      supabase.removeChannel(channel);
    };
  }, [user?.id, user?.type, loadMetrics]);

  return {
    metrics,
    loading,
    error,
    reload: loadMetrics,
  };
}
