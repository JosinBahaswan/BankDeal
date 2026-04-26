function asText(value, fallback = "") {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized || fallback;
}

function isRpcUnavailable(err) {
  if (!err) return false;
  const code = String(err?.code || "").toLowerCase();
  const msg = String(err?.message || err?.error || "").toLowerCase();
  if (code === "42883") return true;
  if (msg.includes("does not exist") || msg.includes("undefined_function") || msg.includes("permission denied")) return true;
  return false;
}

export function reviewStatusLabel(status) {
  const normalized = asText(status).toLowerCase();
  if (normalized === "approved") return "Approved";
  if (normalized === "needs_revision") return "Needs Revision";
  if (normalized === "rejected") return "Rejected";
  return "Pending Review";
}

export function reviewStatusColor(status, G) {
  const normalized = asText(status).toLowerCase();
  if (normalized === "approved") return G.green;
  if (normalized === "needs_revision") return G.gold;
  if (normalized === "rejected") return G.red;
  return G.blue;
}

export async function loadRealtorCommissionReviews(supabase, userId, listingIds) {
  const ids = Array.isArray(listingIds) ? listingIds.filter(Boolean) : [];
  if (!userId || ids.length === 0) return [];

  const { data, error } = await supabase
    .from("realtor_commission_reviews")
    .select("id, listing_id, status, compliance_note, requested_at, reviewed_at, realtor_net, dealbank_net")
    .eq("realtor_user_id", userId)
    .in("listing_id", ids)
    .order("requested_at", { ascending: false });

  if (error) {
    throw new Error(error.message || "Failed to load commission review records");
  }

  return data || [];
}

export async function submitRealtorCommissionReview(supabase, listingId) {
  const id = asText(listingId);
  if (!id) {
    throw new Error("listingId is required");
  }

  const { data, error } = await supabase
    .rpc("submit_realtor_commission_review", {
      p_listing_id: id,
    });

  if (error) {
    if (isRpcUnavailable(error)) {
      const rpcErr = new Error("Required RPC 'submit_realtor_commission_review' is not available on the database.");
      rpcErr.code = "rpc_unavailable";
      throw rpcErr;
    }
    throw new Error(error.message || "Failed to submit commission review");
  }

  const firstRow = Array.isArray(data) ? data[0] : null;
  return firstRow || null;
}
