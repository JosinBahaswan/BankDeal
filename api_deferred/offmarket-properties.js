export default async function handler(req, res) {
  // Production-ready proxy supporting BatchData (preferred) and legacy BatchLeads.
  // BatchData docs: https://developer.batchdata.com (v1 property/search, v3 skip-trace)
  const batchDataKey = process.env.BATCHDATA_API_KEY || "";
  const legacyKey = process.env.BATCH_API_KEY || process.env.BATCHLEADS_API_KEY || "";

  const body = req.method === "POST" ? (req.body || {}) : req.query || {};

  // Simple mapping of frontend filter labels to BatchData filter flags
  const listType = String(body.listType || body.filter || body.list || "").trim();
  const filters = {};
  if (/vacant/i.test(listType)) filters.vacant = true;
  if (/foreclos/i.test(listType)) filters.foreclosure = true;
  if (/tax/i.test(listType)) filters.taxDelinquent = true;
  if (/absentee/i.test(listType)) filters.absenteeOwner = true;
  if (/pre-?foreclos/i.test(listType)) filters.preForeclosure = true;
  if (/high equity/i.test(listType)) filters.highEquity = true;
  if (/probate/i.test(listType)) filters.probate = true;

  // Optional: include owner contact information via skip-trace (use carefully — can be costly)
  const includeOwnerContacts = body.includeOwnerContacts === true || String(process.env.BATCHDATA_AUTO_SKIPTRACE || "").toLowerCase() === "true";

  if (!batchDataKey && !legacyKey) {
    // No provider configured — return empty result with guidance for operators
    return res.status(200).json({ properties: [], message: "No BatchData/BATCH_API_KEY configured on server." });
  }

  try {
    // Prefer BatchData (modern API) if available
    if (batchDataKey) {
      const url = "https://api.batchdata.com/api/v1/property/search";
      const requestPayload = {
        requests: [
          {
            // Accept a free-text search if provided, otherwise rely on filters
            query: String(body.search || body.query || "").trim(),
            propertyType: String(body.propertyType || "").trim() || undefined,
            marketValueRange: body.marketValueRange || undefined,
            filters: Object.keys(filters).length ? filters : undefined,
          },
        ].filter(Boolean),
      };

      const resp = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${batchDataKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(requestPayload),
      });

      let data = null;
      try {
        data = await resp.json();
      } catch (e) {
        data = null;
      }

      if (!resp.ok) {
        return res.status(resp.status).json({ error: data?.message || "BatchData search failed", details: data });
      }

      const results = Array.isArray(data?.results) ? data.results : data?.data || [];

      // Normalize to frontend shape
      const normalized = (results || []).map((p) => ({
        id: p.property_id || p.id || Math.random().toString(36).slice(2, 9),
        address: (p.address && (p.address.formatted_address || p.address.street_address)) || p.address || p.formatted_address || "Unknown Address",
        ownerName: (p.owner && (p.owner.name || p.owner_name)) || "",
        ownerPhone: (p.owner && p.owner.phone) || (p.phones && p.phones[0]?.number) || "",
        ownerEmail: (p.owner && p.owner.email) || (p.emails && p.emails[0]?.address) || "",
        estimatedEquity: p.equity_estimate || p.estimated_value || p.estimated_equity || 0,
        propertyType: p.property_type || p.characteristics?.property_type || "Single Family",
        listType: p.list_type || listType || "Off-market",
      }));

      // Optionally run skip-trace for missing contact info (bounded concurrency)
      if (includeOwnerContacts && normalized.length > 0) {
        const toTrace = normalized.filter((r) => (!r.ownerPhone || !r.ownerEmail) && r.ownerName);
        const concurrency = Number(process.env.BATCHDATA_SKIPTRACE_CONCURRENCY || 3);

        for (let i = 0; i < toTrace.length; i += concurrency) {
          const batch = toTrace.slice(i, i + concurrency);
          await Promise.all(batch.map(async (entry) => {
            try {
              const names = String(entry.ownerName || "").split(/\s+/).filter(Boolean);
              const first = names[0] || "";
              const last = names.length > 1 ? names.slice(1).join(" ") : "";
              const traceBody = {
                requests: [
                  {
                    address: { raw: entry.address },
                    owner: { first_name: first, last_name: last },
                  },
                ],
              };

              const traceResp = await fetch("https://api.batchdata.com/api/v3/property/skip-trace", {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${batchDataKey}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(traceBody),
              });

              const traceData = await traceResp.json();
              const match = (traceData?.results || [])[0] || null;
              if (match) {
                entry.ownerPhone = entry.ownerPhone || (match.phones && match.phones[0]?.number) || entry.ownerPhone;
                entry.ownerEmail = entry.ownerEmail || (match.emails && match.emails[0]?.address) || entry.ownerEmail;
              }
            } catch (e) {
              // continue on individual failures
              console.warn("skip-trace failed for", entry.id, e?.message || e);
            }
          }));
        }
      }

      return res.status(200).json({ properties: normalized });
    }

    // Fallback: legacy BatchLeads/Batch API (existing behavior)
    const url = new URL("https://api.batchleads.io/v2/properties");
    // Allow basic query mapping via listType/search
    if (listType) url.searchParams.set("list_type", listType);
    if (body.search) url.searchParams.set("q", String(body.search));

    const respLegacy = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${legacyKey}`,
        Accept: "application/json",
      },
    });

    const legacyData = await respLegacy.json();
    if (!respLegacy.ok) {
      return res.status(respLegacy.status).json({ error: legacyData?.message || "Legacy Batch search failed", details: legacyData });
    }

    const normalizedLegacy = (legacyData.data || []).map((p) => ({
      id: p.id || Math.random().toString(36).substr(2, 9),
      address: p.formatted_address || p.address || "Unknown Address",
      ownerName: p.owner_name || (p.owners && p.owners[0]?.name) || "",
      ownerPhone: p.owner_phone || (p.owners && p.owners[0]?.phone) || "",
      ownerEmail: p.owner_email || (p.owners && p.owners[0]?.email) || "",
      estimatedEquity: p.estimated_equity || p.equity || 0,
      propertyType: p.property_type || "Single Family",
      listType: p.list_type || listType || "Off-market",
    }));

    return res.status(200).json({ properties: normalizedLegacy });
  } catch (err) {
    console.error("offmarket-properties production error", err);
    return res.status(502).json({ error: "Off-market provider request failed. Check provider keys and network." });
  }
}
