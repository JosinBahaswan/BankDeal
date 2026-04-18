import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { truncateAddress } from "../core/adminDashboardFormat";

const USERS_LIMIT = 1000;
const DEALS_LIMIT = 1000;
const ACTIVITY_PER_SOURCE_LIMIT = 12;
const ACTIVITY_LIMIT = 10;

function emptyState() {
  return {
    users: [],
    deals: [],
    activity: [],
  };
}

function toNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function toTimestamp(value) {
  const stamp = new Date(value || "").getTime();
  return Number.isFinite(stamp) ? stamp : 0;
}

function normalizeLabel(value, fallback) {
  const text = String(value || "").trim();
  return text || fallback;
}

function formatSubscriptionLabel(plan) {
  const text = String(plan || "").trim();
  if (!text) return "Plan";
  return text
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((word) => `${word[0].toUpperCase()}${word.slice(1).toLowerCase()}`)
    .join(" ");
}

function mapUsers(rows) {
  return (rows || []).map((row) => ({
    id: row.id,
    name: normalizeLabel(row.name, "Unnamed"),
    email: normalizeLabel(row.email, "N/A"),
    type: normalizeLabel(row.type, "unknown").toLowerCase(),
    isActive: Boolean(row.is_active),
    joinedAt: row.joined_at || null,
    lastLogin: row.last_login || null,
  }));
}

function mapDeals(rows, usersById) {
  return (rows || []).map((row) => {
    const owner = usersById.get(row.user_id);
    return {
      id: row.id,
      address: normalizeLabel(row.address, "Unknown address"),
      userName: normalizeLabel(owner?.name, "Unknown user"),
      stage: normalizeLabel(row.stage, "Unknown"),
      arv: toNumber(row.arv),
      offerPrice: toNumber(row.offer_price),
      netProfit: toNumber(row.net_profit),
      savedAt: row.saved_at || null,
      updatedAt: row.updated_at || row.saved_at || null,
    };
  });
}

function createActivityEvent(id, category, title, occurredAt) {
  return {
    id,
    category,
    title,
    occurredAt,
    timestamp: toTimestamp(occurredAt),
  };
}

function buildRecentActivity({ users, deals, contracts, subscriptions, credits, fees }) {
  const items = [];

  (users || []).slice(0, ACTIVITY_PER_SOURCE_LIMIT).forEach((row) => {
    const joinedAt = row.joined_at;
    if (!joinedAt) return;
    const userType = normalizeLabel(row.type, "user");
    const userName = normalizeLabel(row.name, "New user");
    items.push(createActivityEvent(`user-${row.id}-${joinedAt}`, "user", `New ${userType} signup: ${userName}`, joinedAt));
  });

  (deals || []).slice(0, ACTIVITY_PER_SOURCE_LIMIT).forEach((row) => {
    const at = row.updated_at || row.saved_at;
    if (!at) return;
    const stage = normalizeLabel(row.stage, "updated");
    const address = truncateAddress(row.address, 44);
    const isClosed = String(stage).toLowerCase() === "closed";
    const title = isClosed
      ? `Deal closed: ${address}`
      : `Deal moved to ${stage}: ${address}`;
    items.push(createActivityEvent(`deal-${row.id}-${at}`, "deal", title, at));
  });

  (contracts || []).slice(0, ACTIVITY_PER_SOURCE_LIMIT).forEach((row) => {
    const at = row.executed_at || row.created_at;
    if (!at) return;
    const normalizedStatus = String(row.status || "").toLowerCase();
    let title = "Contract activity recorded";
    if (normalizedStatus === "fully_executed") {
      title = "Contract fully executed";
    } else if (normalizedStatus) {
      title = `Contract status updated: ${normalizedStatus}`;
    }
    items.push(createActivityEvent(`contract-${row.id}-${at}`, "contract", title, at));
  });

  (subscriptions || []).slice(0, ACTIVITY_PER_SOURCE_LIMIT).forEach((row) => {
    const at = row.canceled_at || row.started_at;
    if (!at) return;
    const status = String(row.status || "").toLowerCase();
    const plan = formatSubscriptionLabel(row.plan);
    const title = status === "canceled"
      ? `Subscription canceled: ${plan}`
      : `Subscription ${status || "updated"}: ${plan}`;
    items.push(createActivityEvent(`subscription-${row.id}-${at}`, "subscription", title, at));
  });

  (credits || []).slice(0, ACTIVITY_PER_SOURCE_LIMIT).forEach((row) => {
    const at = row.purchased_at;
    if (!at) return;
    const amount = toNumber(row.amount_paid).toLocaleString();
    items.push(createActivityEvent(`credits-${row.id}-${at}`, "credits", `Credit pack purchased ($${amount})`, at));
  });

  (fees || []).slice(0, ACTIVITY_PER_SOURCE_LIMIT).forEach((row) => {
    const at = row.closed_at;
    if (!at) return;
    const amount = toNumber(row.fee_amount).toLocaleString();
    const status = String(row.status || "").toLowerCase();
    const prefix = status === "disbursed" ? "Platform fee disbursed" : "Platform fee updated";
    items.push(createActivityEvent(`fees-${row.id}-${at}`, "fees", `${prefix} ($${amount})`, at));
  });

  return items
    .filter((item) => item.timestamp > 0)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, ACTIVITY_LIMIT);
}

export default function useAdminLiveData(user) {
  const [state, setState] = useState(() => emptyState());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const reloadDebounceRef = useRef(null);

  const loadLiveData = useCallback(async () => {
    if (!user?.id || user?.type !== "admin") {
      setState(emptyState());
      setError("Sign in with a Supabase admin account to view live admin tables.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    const [usersRes, dealsRes, contractsRes, subscriptionsRes, creditsRes, feesRes] = await Promise.all([
      supabase
        .from("users")
        .select("id, name, email, type, is_active, joined_at, last_login")
        .order("joined_at", { ascending: false })
        .limit(USERS_LIMIT),
      supabase
        .from("deals")
        .select("id, user_id, address, stage, arv, offer_price, net_profit, saved_at, updated_at")
        .order("updated_at", { ascending: false })
        .limit(DEALS_LIMIT),
      supabase
        .from("contracts")
        .select("id, status, title, created_at, executed_at")
        .order("created_at", { ascending: false })
        .limit(ACTIVITY_PER_SOURCE_LIMIT),
      supabase
        .from("subscriptions")
        .select("id, plan, status, started_at, canceled_at")
        .order("started_at", { ascending: false })
        .limit(ACTIVITY_PER_SOURCE_LIMIT),
      supabase
        .from("credit_purchases")
        .select("id, pack_tier, amount_paid, purchased_at")
        .order("purchased_at", { ascending: false })
        .limit(ACTIVITY_PER_SOURCE_LIMIT),
      supabase
        .from("platform_fees")
        .select("id, status, fee_amount, closed_at")
        .order("closed_at", { ascending: false })
        .limit(ACTIVITY_PER_SOURCE_LIMIT),
    ]);

    const firstError =
      usersRes.error ||
      dealsRes.error ||
      contractsRes.error ||
      subscriptionsRes.error ||
      creditsRes.error ||
      feesRes.error;

    if (firstError) {
      setError(firstError.message || "Failed to load live admin data.");
      setLoading(false);
      return;
    }

    const usersRows = usersRes.data || [];
    const users = mapUsers(usersRows);
    const usersById = new Map(users.map((row) => [row.id, row]));
    const deals = mapDeals(dealsRes.data || [], usersById);

    const activity = buildRecentActivity({
      users: usersRows,
      deals: dealsRes.data || [],
      contracts: contractsRes.data || [],
      subscriptions: subscriptionsRes.data || [],
      credits: creditsRes.data || [],
      fees: feesRes.data || [],
    });

    setState({
      users,
      deals,
      activity,
    });

    setLoading(false);
  }, [user?.id, user?.type]);

  useEffect(() => {
    const timerId = setTimeout(() => {
      loadLiveData();
    }, 0);

    return () => clearTimeout(timerId);
  }, [loadLiveData]);

  const scheduleReload = useCallback(() => {
    if (reloadDebounceRef.current) return;

    reloadDebounceRef.current = setTimeout(() => {
      reloadDebounceRef.current = null;
      loadLiveData();
    }, 350);
  }, [loadLiveData]);

  useEffect(() => {
    if (!user?.id || user?.type !== "admin") return undefined;

    const channel = supabase
      .channel(`admin-live-data-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "users" }, scheduleReload)
      .on("postgres_changes", { event: "*", schema: "public", table: "deals" }, scheduleReload)
      .on("postgres_changes", { event: "*", schema: "public", table: "contracts" }, scheduleReload)
      .on("postgres_changes", { event: "*", schema: "public", table: "subscriptions" }, scheduleReload)
      .on("postgres_changes", { event: "*", schema: "public", table: "credit_purchases" }, scheduleReload)
      .on("postgres_changes", { event: "*", schema: "public", table: "platform_fees" }, scheduleReload)
      .subscribe();

    const intervalId = setInterval(loadLiveData, 45000);

    return () => {
      clearInterval(intervalId);
      if (reloadDebounceRef.current) {
        clearTimeout(reloadDebounceRef.current);
        reloadDebounceRef.current = null;
      }
      supabase.removeChannel(channel);
    };
  }, [user?.id, user?.type, loadLiveData, scheduleReload]);

  return {
    users: state.users,
    deals: state.deals,
    activity: state.activity,
    loading,
    error,
    reload: loadLiveData,
  };
}
