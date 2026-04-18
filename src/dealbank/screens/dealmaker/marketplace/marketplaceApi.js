function asNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asText(value, fallback = "") {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized || fallback;
}

function toCurrency(value) {
  return `$${Math.round(asNumber(value, 0)).toLocaleString()}`;
}

function formatBuyBoxLabel(minPrice, maxPrice) {
  const min = asNumber(minPrice, 0);
  const max = asNumber(maxPrice, 0);

  if (min > 0 && max > 0) {
    return `${toCurrency(min)} - ${toCurrency(max)}`;
  }

  if (min > 0) {
    return `From ${toCurrency(min)}`;
  }

  if (max > 0) {
    return `Up to ${toCurrency(max)}`;
  }

  return "Open buy box";
}

function formatMarkets(markets) {
  if (!Array.isArray(markets) || markets.length === 0) {
    return "Statewide";
  }

  return markets
    .map((row) => {
      const city = asText(row?.city);
      const state = asText(row?.state, "CA");
      if (!city) return "";
      return `${city}, ${state}`;
    })
    .filter(Boolean)
    .join(" | ");
}

export function listingDays(publishedAt, closedAt = "") {
  if (!publishedAt) return 0;
  const endTs = closedAt ? new Date(closedAt).getTime() : Date.now();
  const startTs = new Date(publishedAt).getTime();
  const diff = endTs - startTs;

  if (!Number.isFinite(diff) || diff < 0) return 0;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export async function incrementListingView(supabase, listingId) {
  const id = asText(listingId);
  if (!id) {
    throw new Error("listingId is required");
  }

  const { data, error } = await supabase
    .rpc("increment_marketplace_listing_view", {
      p_listing_id: id,
    });

  if (error) {
    throw new Error(error.message || "Failed to increment listing view count");
  }

  const row = Array.isArray(data) ? data[0] : null;
  return {
    viewCount: asNumber(row?.view_count, 0),
    saveCount: asNumber(row?.save_count, 0),
    daysOnMarket: Math.max(0, asNumber(row?.days_on_market, 0)),
  };
}

export async function loadBuyerNetwork(supabase) {
  const { data, error } = await supabase
    .from("marketplace_buyer_profiles")
    .select("id, company_name, contact_name, buy_box_min, buy_box_max, monthly_capacity, close_time_days, financing_types, is_verified, marketplace_buyer_markets(city, state)")
    .eq("is_active", true)
    .order("is_verified", { ascending: false })
    .order("monthly_capacity", { ascending: false, nullsFirst: false })
    .order("company_name", { ascending: true });

  if (error) {
    throw new Error(error.message || "Failed to load buyer network");
  }

  return (data || []).map((row) => {
    const markets = Array.isArray(row.marketplace_buyer_markets) ? row.marketplace_buyer_markets : [];
    const financingTypes = Array.isArray(row.financing_types) ? row.financing_types : [];

    return {
      id: row.id,
      companyName: asText(row.company_name, "Buyer"),
      contactName: asText(row.contact_name, "Acquisitions Team"),
      markets,
      marketsLabel: formatMarkets(markets),
      buyBoxMin: asNumber(row.buy_box_min, 0),
      buyBoxMax: asNumber(row.buy_box_max, 0),
      buyBoxLabel: formatBuyBoxLabel(row.buy_box_min, row.buy_box_max),
      monthlyCapacity: Math.max(0, asNumber(row.monthly_capacity, 0)),
      closeTimeDays: Math.max(0, asNumber(row.close_time_days, 0)),
      financingTypes,
      financingLabel: financingTypes.length > 0
        ? financingTypes.map((item) => asText(item)).filter(Boolean).join(" / ")
        : "Flexible financing",
      isVerified: Boolean(row.is_verified),
    };
  });
}

export function summarizeBuyerNetwork(buyers) {
  const rows = Array.isArray(buyers) ? buyers : [];
  const activeBuyers = rows.length;

  if (activeBuyers === 0) {
    return {
      activeBuyers: 0,
      avgBuyBox: "No data",
      dealsPerMonthCapacity: "0",
      avgCloseTime: "No data",
    };
  }

  const minValues = rows.map((row) => row.buyBoxMin).filter((value) => value > 0);
  const maxValues = rows.map((row) => row.buyBoxMax).filter((value) => value > 0);
  const capacitySum = rows.reduce((sum, row) => sum + Math.max(0, row.monthlyCapacity || 0), 0);
  const closeTimeValues = rows.map((row) => row.closeTimeDays).filter((value) => value > 0);

  const avgMin = minValues.length > 0
    ? Math.round(minValues.reduce((sum, value) => sum + value, 0) / minValues.length)
    : 0;
  const avgMax = maxValues.length > 0
    ? Math.round(maxValues.reduce((sum, value) => sum + value, 0) / maxValues.length)
    : 0;
  const avgCloseTimeDays = closeTimeValues.length > 0
    ? Math.round(closeTimeValues.reduce((sum, value) => sum + value, 0) / closeTimeValues.length)
    : 0;

  return {
    activeBuyers,
    avgBuyBox: avgMin > 0 && avgMax > 0
      ? `${toCurrency(avgMin)} - ${toCurrency(avgMax)}`
      : "Open buy boxes",
    dealsPerMonthCapacity: `${capacitySum}+`,
    avgCloseTime: avgCloseTimeDays > 0 ? `${avgCloseTimeDays} days` : "No data",
  };
}

export async function loadListingBuyerMatches(supabase, listingId, limit = 8) {
  const id = asText(listingId);
  if (!id) return [];

  const normalizedLimit = Math.min(20, Math.max(1, Math.round(asNumber(limit, 8))));

  const refreshResult = await supabase
    .rpc("refresh_marketplace_listing_matches", {
      p_listing_id: id,
      p_limit: Math.max(30, normalizedLimit),
    });

  if (refreshResult.error) {
    throw new Error(refreshResult.error.message || "Failed to refresh buyer matches");
  }

  const { data, error } = await supabase
    .from("marketplace_listing_matches")
    .select("id, match_score, status, buyer:marketplace_buyer_profiles(company_name, contact_name, buy_box_min, buy_box_max, monthly_capacity, close_time_days, financing_types, is_verified, marketplace_buyer_markets(city, state))")
    .eq("listing_id", id)
    .order("match_score", { ascending: false })
    .limit(normalizedLimit);

  if (error) {
    throw new Error(error.message || "Failed to load buyer matches");
  }

  return (data || []).map((row) => {
    const buyer = row.buyer || {};
    const markets = Array.isArray(buyer.marketplace_buyer_markets) ? buyer.marketplace_buyer_markets : [];
    const financingTypes = Array.isArray(buyer.financing_types) ? buyer.financing_types : [];

    return {
      id: row.id,
      score: asNumber(row.match_score, 0),
      status: asText(row.status, "candidate"),
      companyName: asText(buyer.company_name, "Buyer"),
      contactName: asText(buyer.contact_name, "Acquisitions Team"),
      marketsLabel: formatMarkets(markets),
      buyBoxLabel: formatBuyBoxLabel(buyer.buy_box_min, buyer.buy_box_max),
      monthlyCapacity: Math.max(0, asNumber(buyer.monthly_capacity, 0)),
      closeTimeDays: Math.max(0, asNumber(buyer.close_time_days, 0)),
      isVerified: Boolean(buyer.is_verified),
      financingLabel: financingTypes.length > 0
        ? financingTypes.map((item) => asText(item)).filter(Boolean).join(" / ")
        : "Flexible financing",
    };
  });
}
