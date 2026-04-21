import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import DataSearchBar from "../../components/DataSearchBar";
import BuyerNetworkView from "./marketplace/BuyerNetworkView";
import {
  incrementListingView,
  listingDays,
  loadBuyerNetwork,
  loadListingBuyerMatches,
  summarizeBuyerNetwork,
} from "./marketplace/marketplaceApi";

const DEAL_TYPE_TO_DB = {
  Wholesale: "wholesale",
  "Fix & Flip": "fix_and_flip",
  BRRRR: "buy_and_hold",
  Land: "rental",
};

const DB_TO_DEAL_TYPE = {
  wholesale: "Wholesale",
  fix_and_flip: "Fix & Flip",
  buy_and_hold: "BRRRR",
  novations: "Fix & Flip",
  wholetail: "Wholesale",
  rental: "Land",
};

const CONDITION_TO_DB = {
  "Light Cosmetic": "excellent",
  "Cosmetic Flip": "good",
  "Full Rehab": "fair",
  "Major Rehab": "rough",
};

const DB_TO_CONDITION = {
  excellent: "Light cosmetic",
  good: "Cosmetic flip",
  fair: "Full rehab",
  rough: "Major rehab",
};

function statusLabel(status) {
  const value = String(status || "active").toLowerCase();
  if (value === "under_contract") return "Under Contract";
  if (value === "closed") return "Closed";
  if (value === "withdrawn") return "Withdrawn";
  return "Active";
}

function calcRoi(arv, ask, reno, fee) {
  const cost = Number(ask || 0) + Number(reno || 0) + Number(fee || 0);
  if (cost <= 0) return 0;
  return Math.round(((Number(arv || 0) - cost) / cost) * 100);
}

function parseHighlights(textValue) {
  return String(textValue || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function mapListingRow(row, user) {
  const arv = Number(row.arv || 0);
  const ask = Number(row.asking_price || 0);
  const reno = Number(row.reno_estimate || 0);
  const fee = Number(row.assignment_fee || 0);
  const fallbackEquity = arv - ask - reno;
  const roi = Number(row.roi || calcRoi(arv, ask, reno, fee));
  const isOwner = user?.id && row.seller_id === user.id;

  return {
    id: row.id,
    addr: row.address || "Unknown address",
    city: row.city || "",
    state: row.state || "CA",
    zip: row.zip || "",
    beds: Number(row.beds || 0),
    baths: Number(row.baths || 0),
    sqft: Number(row.sqft || 0),
    yr: Number(row.year_built || 0),
    arv,
    ask,
    reno,
    fee,
    equity: Number(row.equity || fallbackEquity || 0),
    roi,
    type: DB_TO_DEAL_TYPE[row.deal_type] || "Wholesale",
    days: listingDays(row.published_at, row.closed_at),
    condition: DB_TO_CONDITION[row.condition] || "Condition not listed",
    desc: row.description || "No description provided.",
    highlights: Array.isArray(row.highlights) ? row.highlights : [],
    views: Number(row.view_count || 0),
    saved: Number(row.save_count || 0),
    status: statusLabel(row.status),
    isOwner,
    contact: isOwner
      ? {
        name: user?.name || "You",
        phone: user?.phone || "Phone not provided",
        email: user?.email || "",
      }
      : {
        name: "DealBank Seller",
        phone: "Contact via DealBank",
        email: "",
      },
  };
}

export default function MarketplaceTab({ ctx }) {
  const {
    G,
    card,
    lbl,
    btnG,
    btnO,
    fmt,
    toNum,
    user,
    mktFilter,
    setMktFilter,
    mktSort,
    setMktSort,
    mktView,
    setMktView,
    activeListing,
    setActiveListing,
    savedDeals,
    setSavedDeals,
    submitStep,
    setSubmitStep,
    wSubmitted,
    setWSubmitted,
    wForm,
    setWForm,
    isMobile,
  } = ctx;

  const [listings, setListings] = useState([]);
  const [listingsLoading, setListingsLoading] = useState(false);
  const [listingsError, setListingsError] = useState("");
  const [saveBusyId, setSaveBusyId] = useState("");
  const [submitBusy, setSubmitBusy] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [refreshTick, setRefreshTick] = useState(0);
  const [buyersLoading, setBuyersLoading] = useState(false);
  const [buyersError, setBuyersError] = useState("");
  const [buyers, setBuyers] = useState([]);
  const [listingMatchesLoading, setListingMatchesLoading] = useState(false);
  const [listingMatchesError, setListingMatchesError] = useState("");
  const [listingMatches, setListingMatches] = useState([]);
  const [marketSearch, setMarketSearch] = useState("");

  useEffect(() => {
    let active = true;

    async function loadMarketplaceData() {
      if (!user?.id) {
        if (!active) return;
        setListings([]);
        setSavedDeals([]);
        setBuyers([]);
        setBuyersError("");
        setListingMatches([]);
        setListingMatchesError("");
        setListingsLoading(false);
        setBuyersLoading(false);
        setListingsError("Please sign in to access marketplace listings.");
        return;
      }

      setListingsLoading(true);
      setBuyersLoading(true);
      setListingsError("");
      setBuyersError("");

      const [listingsResult, savesResult, buyersResult] = await Promise.all([
        supabase
          .from("marketplace_listings")
          .select("*")
          .order("published_at", { ascending: false }),
        supabase
          .from("marketplace_saves")
          .select("listing_id")
          .eq("user_id", user.id),
        loadBuyerNetwork(supabase)
          .then((data) => ({ data, error: null }))
          .catch((error) => ({ data: [], error })),
      ]);

      if (!active) return;

      if (listingsResult.error) {
        setListings([]);
        setListingsLoading(false);
        setListingsError(`Failed to load listings: ${listingsResult.error.message}`);
        return;
      }

      if (savesResult.error) {
        setSavedDeals([]);
      } else {
        setSavedDeals((savesResult.data || []).map((row) => row.listing_id));
      }

      if (buyersResult.error) {
        setBuyers([]);
        setBuyersError(`Failed to load buyer network: ${buyersResult.error?.message || "unknown error"}`);
      } else {
        setBuyers(buyersResult.data || []);
        setBuyersError("");
      }

      const mappedListings = (listingsResult.data || []).map((row) => mapListingRow(row, user));
      setListings(mappedListings);
      setListingsLoading(false);
      setBuyersLoading(false);

      if (activeListing?.id) {
        const refreshedActive = mappedListings.find((row) => row.id === activeListing.id) || null;
        setActiveListing(refreshedActive);
      }
    }

    loadMarketplaceData();

    return () => {
      active = false;
    };
  }, [user, refreshTick, setSavedDeals, activeListing?.id, setActiveListing]);

  useEffect(() => {
    if (!user?.id || !activeListing?.id) return undefined;

    let active = true;

    async function trackListingOpen() {
      try {
        const counters = await incrementListingView(supabase, activeListing.id);
        if (!active) return;

        setListings((prev) => prev.map((item) => (
          item.id === activeListing.id
            ? {
                ...item,
                views: counters.viewCount,
                saved: counters.saveCount,
                days: counters.daysOnMarket,
              }
            : item
        )));

        setActiveListing((prev) => (
          prev && prev.id === activeListing.id
            ? {
                ...prev,
                views: counters.viewCount,
                saved: counters.saveCount,
                days: counters.daysOnMarket,
              }
            : prev
        ));
      } catch {
        // Silent no-op so listing detail still works if view tracking fails.
      }
    }

    trackListingOpen();

    return () => {
      active = false;
    };
  }, [user?.id, activeListing?.id, setActiveListing]);

  useEffect(() => {
    if (!user?.id || !activeListing?.id || !activeListing.isOwner) return undefined;

    let active = true;

    async function loadMatches() {
      setListingMatchesLoading(true);
      setListingMatchesError("");

      try {
        const rows = await loadListingBuyerMatches(supabase, activeListing.id, 8);
        if (!active) return;
        setListingMatches(rows);
        setListingMatchesLoading(false);
      } catch (error) {
        if (!active) return;
        setListingMatches([]);
        setListingMatchesLoading(false);
        setListingMatchesError(error?.message || "Failed to load buyer matches");
      }
    }

    loadMatches();

    return () => {
      active = false;
    };
  }, [user?.id, activeListing?.id, activeListing?.isOwner]);

  useEffect(() => {
    if (!user?.id) return undefined;

    const listingsChannel = supabase
      .channel(`marketplace-listings-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "marketplace_listings",
        },
        () => setRefreshTick((prev) => prev + 1),
      )
      .subscribe();

    const savesChannel = supabase
      .channel(`marketplace-saves-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "marketplace_saves",
          filter: `user_id=eq.${user.id}`,
        },
        () => setRefreshTick((prev) => prev + 1),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(listingsChannel);
      supabase.removeChannel(savesChannel);
    };
  }, [user?.id]);

  const filterOptions = useMemo(() => {
    const unique = new Set(["All"]);
    listings.forEach((listing) => {
      if (listing.city) unique.add(listing.city);
      if (listing.type) unique.add(listing.type);
    });
    return Array.from(unique);
  }, [listings]);

  const filtered = useMemo(() => listings.filter((deal) => {
    const normalizedMarketSearch = marketSearch.trim().toLowerCase();

    if (mktFilter !== "All" && deal.city !== mktFilter && deal.type !== mktFilter) return false;
    if (normalizedMarketSearch) {
      const searchable = [
        deal.addr,
        deal.city,
        deal.state,
        deal.type,
        deal.condition,
        deal.status,
        String(deal.ask || ""),
        String(deal.arv || ""),
      ].join(" ").toLowerCase();

      if (!searchable.includes(normalizedMarketSearch)) return false;
    }

    return true;
  }).sort((a, b) => {
    if (mktSort === "newest") return a.days - b.days;
    if (mktSort === "roi") return b.roi - a.roi;
    if (mktSort === "equity") return b.equity - a.equity;
    if (mktSort === "price") return a.ask - b.ask;
    return 0;
  }), [listings, marketSearch, mktFilter, mktSort]);

  const buyerStats = useMemo(() => summarizeBuyerNetwork(buyers), [buyers]);
  const activeBuyerCount = Math.max(0, Number(buyerStats.activeBuyers || 0));
  const activeBuyerCountLabel = activeBuyerCount > 0
    ? `${activeBuyerCount} active buyers`
    : "active buyers currently in network";

  const wUpdate = (field, value) => setWForm((prev) => ({ ...prev, [field]: value }));
  const roiColor = (r) => (r >= 25 ? G.green : r >= 18 ? G.gold : G.orange);

  const contactWholesaler = (listing) => {
    if (!listing.contact?.email) {
      return;
    }

    const subject = encodeURIComponent(`Deal inquiry: ${listing.addr}`);
    const body = encodeURIComponent(`Hi ${listing.contact.name},\n\nI'm interested in ${listing.addr}. Please share next steps and access details.\n\nThanks.`);
    const mailto = `mailto:${listing.contact.email}?subject=${subject}&body=${body}`;
    window.location.href = mailto;
  };

  async function toggleSave(listingId) {
    if (!user?.id || !listingId || saveBusyId) return;

    const alreadySaved = savedDeals.includes(listingId);
    setSaveBusyId(listingId);

    if (alreadySaved) {
      const { error } = await supabase
        .from("marketplace_saves")
        .delete()
        .eq("user_id", user.id)
        .eq("listing_id", listingId);

      if (!error) {
        setSavedDeals((prev) => prev.filter((item) => item !== listingId));
        setListings((prev) => prev.map((item) => (item.id === listingId ? { ...item, saved: Math.max(0, item.saved - 1) } : item)));
      }
    } else {
      const { error } = await supabase
        .from("marketplace_saves")
        .insert({ user_id: user.id, listing_id: listingId });

      if (!error) {
        setSavedDeals((prev) => (prev.includes(listingId) ? prev : [...prev, listingId]));
        setListings((prev) => prev.map((item) => (item.id === listingId ? { ...item, saved: item.saved + 1 } : item)));
      }
    }

    setSaveBusyId("");
  }

  async function submitListing() {
    if (!user?.id) {
      setSubmitError("Login required before submitting deals.");
      return;
    }

    if (!String(wForm.address || "").trim() || !String(wForm.city || "").trim()) {
      setSubmitError("Address and city are required.");
      return;
    }

    if (!toNum(wForm.askPrice) || !toNum(wForm.arv)) {
      setSubmitError("ARV and asking price are required.");
      return;
    }

    setSubmitBusy(true);
    setSubmitError("");

    const arv = toNum(wForm.arv);
    const askPrice = toNum(wForm.askPrice);
    const renoEstimate = toNum(wForm.renoEst);
    const assignmentFee = toNum(wForm.assignFee);
    const equity = arv - askPrice - renoEstimate;
    const roi = calcRoi(arv, askPrice, renoEstimate, assignmentFee);

    const payload = {
      seller_id: user.id,
      address: String(wForm.address || "").trim(),
      city: String(wForm.city || "").trim(),
      state: String(wForm.state || "CA").trim() || "CA",
      zip: String(wForm.zip || "").trim() || null,
      beds: toNum(wForm.beds) || null,
      baths: toNum(wForm.baths) || null,
      sqft: toNum(wForm.sqft) || null,
      year_built: toNum(wForm.yearBuilt) || null,
      arv,
      asking_price: askPrice,
      assignment_fee: assignmentFee,
      reno_estimate: renoEstimate,
      equity,
      roi,
      deal_type: DEAL_TYPE_TO_DB[wForm.type] || "wholesale",
      condition: CONDITION_TO_DB[wForm.condition] || "good",
      description: String(wForm.description || "").trim() || null,
      highlights: parseHighlights(wForm.highlights),
      status: "active",
      days_on_market: 0,
      view_count: 0,
      save_count: 0,
    };

    const { error } = await supabase
      .from("marketplace_listings")
      .insert(payload);

    if (error) {
      setSubmitBusy(false);
      setSubmitError(`Submit failed: ${error.message}`);
      return;
    }

    setSubmitBusy(false);
    setWSubmitted(true);
    setRefreshTick((prev) => prev + 1);
  }

  if (activeListing) {
    return (
      <div>
        <button onClick={() => setActiveListing(null)} style={{ ...btnO, marginBottom: 12, padding: isMobile ? "7px 11px" : "5px 12px", fontSize: isMobile ? 10 : 9 }}>← Back to Deals</button>

        <div style={{ background: "linear-gradient(135deg,#edf8f1,#f8fcfa)", border: `1px solid ${G.green}44`, borderRadius: 10, padding: isMobile ? "12px 12px" : "20px 22px", marginBottom: 12 }}>
          <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", justifyContent: "space-between", alignItems: "flex-start", gap: isMobile ? 10 : 0, marginBottom: 14 }}>
            <div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                <div style={{ fontSize: 8, color: activeListing.type === "Wholesale" ? G.gold : G.green, background: activeListing.type === "Wholesale" ? `${G.gold}22` : G.greenGlow, border: `1px solid ${activeListing.type === "Wholesale" ? G.gold : G.green}44`, borderRadius: 3, padding: "2px 8px", letterSpacing: 2 }}>{activeListing.type.toUpperCase()}</div>
                {activeListing.days === 0 && <div style={{ fontSize: 8, color: "#ff6b6b", background: "#ff6b6b22", border: "1px solid #ff6b6b44", borderRadius: 3, padding: "2px 8px", letterSpacing: 2 }}>NEW TODAY</div>}
                <div style={{ fontSize: 9, color: G.muted }}>{activeListing.days === 0 ? "Posted today" : `Posted ${activeListing.days}d ago`} · {activeListing.views} views · {activeListing.saved} saved</div>
              </div>
              <div style={{ fontFamily: G.serif, fontSize: isMobile ? 16 : 20, color: G.text, fontWeight: "bold", marginBottom: 2 }}>{activeListing.addr}</div>
              <div style={{ fontSize: 11, color: G.muted }}>{activeListing.city}, {activeListing.state} {activeListing.zip} · {activeListing.beds}bd/{activeListing.baths}ba · {activeListing.sqft?.toLocaleString()} sqft · Built {activeListing.yr}</div>
            </div>
            <div style={{ textAlign: isMobile ? "left" : "right" }}>
              <div style={{ fontSize: 8, color: G.muted, letterSpacing: 3, marginBottom: 2 }}>ASKING PRICE</div>
              <div style={{ fontFamily: G.serif, fontSize: isMobile ? 24 : 32, color: G.text, fontWeight: "bold" }}>{fmt(activeListing.ask)}</div>
              <div style={{ fontSize: 9, color: G.muted, marginTop: 2 }}>+ {fmt(activeListing.fee)} assignment fee</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,minmax(0,1fr))" : "repeat(4,1fr)", gap: 8 }}>
            {[
              { l: "ARV", v: fmt(activeListing.arv), c: G.green },
              { l: "Est. Reno", v: fmt(activeListing.reno), c: G.gold },
              { l: "Equity", v: fmt(activeListing.equity), c: G.text },
              { l: "Projected ROI", v: `${activeListing.roi}%`, c: roiColor(activeListing.roi) },
            ].map(({ l, v, c }) => (
              <div key={l} style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 5, padding: "10px 12px", textAlign: "center" }}>
                <div style={{ fontSize: 8, color: G.muted, letterSpacing: 2, marginBottom: 4 }}>{l.toUpperCase()}</div>
                <div style={{ fontFamily: G.serif, fontSize: 17, color: c, fontWeight: "bold" }}>{v}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div style={{ ...card }}>
            <div style={{ ...lbl, color: G.green, marginBottom: 8 }}>Deal Overview</div>
            <div style={{ fontSize: 11, color: G.text, lineHeight: 1.8, marginBottom: 12 }}>{activeListing.desc}</div>
            <div style={{ ...lbl, marginBottom: 8 }}>Deal Highlights</div>
            {activeListing.highlights.map((h, i) => (
              <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6, fontSize: 10, color: G.text }}><span style={{ color: G.green, fontWeight: "bold" }}>+</span>{h}</div>
            ))}
          </div>

          <div>
            <div style={{ ...card, marginBottom: 10 }}>
              <div style={{ ...lbl, color: G.gold, marginBottom: 10 }}>Deal Math</div>
              {[["ARV", fmt(activeListing.arv), G.green], ["Purchase (ask)", fmt(activeListing.ask), G.text], ["Est. Renovation", fmt(activeListing.reno), G.gold], ["Assignment Fee", fmt(activeListing.fee), G.gold], ["Total All-In", fmt(activeListing.ask + activeListing.reno + activeListing.fee), G.text], ["Equity at Close", fmt(activeListing.equity), G.green]].map(([k, v, c]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid ${G.faint}`, fontSize: 11 }}>
                  <span style={{ color: G.muted }}>{k}</span>
                  <span style={{ color: c, fontFamily: G.serif, fontWeight: "bold" }}>{v}</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: 13 }}>
                <span style={{ color: G.green, fontWeight: "bold" }}>Projected ROI</span>
                <span style={{ color: roiColor(activeListing.roi), fontFamily: G.serif, fontWeight: "bold" }}>{activeListing.roi}%</span>
              </div>
            </div>

            <div style={{ ...card, marginBottom: 10 }}>
              <div style={{ ...lbl, marginBottom: 6 }}>Property Condition</div>
              <div style={{ fontSize: 11, color: G.gold, marginBottom: 4 }}>{activeListing.condition}</div>
            </div>

            <div style={{ background: "#eef8f1", border: `1px solid ${G.green}44`, borderRadius: 8, padding: "14px" }}>
              <div style={{ ...lbl, color: G.green, marginBottom: 10 }}>Wholesaler Contact</div>
              <div style={{ fontFamily: G.serif, fontSize: 14, color: G.text, fontWeight: "bold", marginBottom: 4 }}>{activeListing.contact.name}</div>
              <div style={{ fontSize: 10, color: G.muted, marginBottom: 2 }}>{activeListing.contact.phone}</div>
              <div style={{ fontSize: 10, color: G.muted, marginBottom: 12 }}>{activeListing.contact.email || "Contact details available after connection"}</div>
              <button onClick={() => contactWholesaler(activeListing)} disabled={!activeListing.contact.email} style={{ ...btnG, width: "100%", fontSize: 10, marginBottom: 8, opacity: activeListing.contact.email ? 1 : 0.6 }}>
                Contact Wholesaler
              </button>
              <button onClick={() => toggleSave(activeListing.id)} disabled={saveBusyId === activeListing.id} style={{ ...btnO, width: "100%", fontSize: 10, borderColor: savedDeals.includes(activeListing.id) ? G.green : G.border, color: savedDeals.includes(activeListing.id) ? G.green : G.muted, opacity: saveBusyId === activeListing.id ? 0.65 : 1 }}>
                {savedDeals.includes(activeListing.id) ? "Saved to Watchlist" : "Save to Watchlist"}
              </button>
              <div style={{ marginTop: 8, fontSize: 8, color: G.muted, textAlign: "center", lineHeight: 1.6 }}>DealBank charges a 1.5% platform fee on closed transactions. No upfront cost.</div>
            </div>

            {activeListing.isOwner && (
              <div style={{ ...card, marginTop: 10, borderColor: `${G.blue}44` }}>
                <div style={{ ...lbl, color: G.blue, marginBottom: 8 }}>Buyer Matchmaking</div>
                <div style={{ fontSize: 9, color: G.muted, marginBottom: 8 }}>DealBank ranks live buyers from your market based on buy box, deal type, capacity, and close speed.</div>

                {listingMatchesError && (
                  <div style={{ fontSize: 9, color: G.red, marginBottom: 8 }}>
                    {listingMatchesError}
                  </div>
                )}

                {listingMatchesLoading && (
                  <div style={{ fontSize: 9, color: G.muted, marginBottom: 8 }}>
                    Refreshing buyer matches...
                  </div>
                )}

                {!listingMatchesLoading && listingMatches.length === 0 && !listingMatchesError && (
                  <div style={{ fontSize: 9, color: G.muted, marginBottom: 8 }}>
                    No buyer candidates matched this listing yet.
                  </div>
                )}

                {listingMatches.map((match) => (
                  <div key={match.id} style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 6, padding: "8px 10px", marginBottom: 7 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", marginBottom: 4 }}>
                      <div style={{ fontSize: 10, color: G.text, fontWeight: "bold" }}>
                        {match.companyName} {match.isVerified ? "· Verified" : ""}
                      </div>
                      <div style={{ fontSize: 8, color: G.green, border: `1px solid ${G.green}44`, background: G.greenGlow, borderRadius: 3, padding: "2px 6px" }}>
                        Match {Math.round(match.score)}
                      </div>
                    </div>
                    <div style={{ fontSize: 9, color: G.muted, marginBottom: 2 }}>
                      {match.marketsLabel}
                    </div>
                    <div style={{ fontSize: 9, color: G.muted }}>
                      Buy box {match.buyBoxLabel} · {match.financingLabel} · Capacity {match.monthlyCapacity || 0}/mo · Close {match.closeTimeDays || "-"}d
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (mktView === "submit") {
    return (
      <div>
        <button onClick={() => { setMktView("feed"); setSubmitStep(1); setWSubmitted(false); }} style={{ ...btnO, marginBottom: 12, padding: isMobile ? "7px 11px" : "5px 12px", fontSize: isMobile ? 10 : 9 }}>← Back to Feed</button>

        {wSubmitted ? (
          <div style={{ ...card, textAlign: "center", padding: "40px 20px", borderColor: `${G.green}44` }}>
            <div style={{ fontSize: 13, marginBottom: 14, color: G.green, letterSpacing: 1.5, textTransform: "uppercase" }}>Submission Complete</div>
            <div style={{ fontFamily: G.serif, fontSize: 20, color: G.green, fontWeight: "bold", marginBottom: 8 }}>Deal Submitted!</div>
            <div style={{ fontSize: 11, color: G.muted, lineHeight: 1.8, marginBottom: 20, maxWidth: 400, margin: "0 auto 20px" }}>Your deal is under review. DealBank will verify the numbers and push it to our buyer network within 24 hours. You'll be notified when buyers express interest.</div>
            <div style={{ ...card, borderColor: G.border, textAlign: "left", marginBottom: 16, maxWidth: 400, margin: "0 auto 16px" }}>
              <div style={{ ...lbl, marginBottom: 8 }}>What happens next</div>
              {[
                "DealBank reviews and verifies your deal (24hrs)",
                `We push it to ${activeBuyerCountLabel} in your market`,
                "Interested buyers contact you directly",
                "Deal closes, you pay 1.5% platform fee at assignment",
                "Get paid and post your next deal",
              ].map((s, i) => (
                <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8, fontSize: 10, color: G.text }}><span style={{ color: G.green, fontWeight: "bold", minWidth: 16 }}>{i + 1}.</span>{s}</div>
              ))}
            </div>
            <button onClick={() => { setWSubmitted(false); setSubmitStep(1); setWForm({ address: "", city: "", state: "CA", zip: "", beds: "", baths: "", sqft: "", yearBuilt: "", arv: "", askPrice: "", renoEst: "", assignFee: "", earnest: "", closeDate: "", type: "Wholesale", description: "", highlights: "", condition: "Light Cosmetic", contactName: "", contactCompany: "", contactPhone: "", contactEmail: "" }); }} style={{ ...btnG, fontSize: 10 }}>
              Submit Another Deal
            </button>
          </div>
        ) : (
          <div>
            <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
              {[["1", "Property"], ["2", "Numbers"], ["3", "Description"], ["4", "Contact"]].map(([n, label], i) => (
                <div key={n} style={{ flex: 1, textAlign: "center" }}>
                  <div style={{ height: 3, borderRadius: 2, background: submitStep > i ? G.green : G.faint, marginBottom: 4 }} />
                  <div style={{ fontSize: 8, color: submitStep === i + 1 ? G.green : G.muted, letterSpacing: 1 }}>{n}. {label}</div>
                </div>
              ))}
            </div>

            {submitStep === 1 && (
              <div style={{ ...card }}>
                <div style={{ fontFamily: G.serif, fontSize: 15, color: G.text, fontWeight: "bold", marginBottom: 14 }}>Property Details</div>
                <div style={{ marginBottom: 10 }}>
                  <div style={{ ...lbl }}>Full Address</div>
                  <input value={wForm.address} onChange={(e) => wUpdate("address", e.target.value)} placeholder="123 Main St" style={{ width: "100%", background: G.surface, border: `1px solid ${G.border}`, borderRadius: 5, color: G.text, fontSize: 13, fontFamily: G.mono, padding: "9px 11px", outline: "none", boxSizing: "border-box" }} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,minmax(0,1fr))" : "1fr 1fr 1fr", gap: 8, marginBottom: 10 }}>
                  {[["City", "city", "Sacramento"], ["State", "state", "CA"], ["ZIP", "zip", "95814"]].map(([l, f, ph]) => (
                    <div key={f}>
                      <div style={{ ...lbl }}>{l}</div>
                      <input value={wForm[f]} onChange={(e) => wUpdate(f, e.target.value)} placeholder={ph} style={{ width: "100%", background: G.surface, border: `1px solid ${G.border}`, borderRadius: 5, color: G.text, fontSize: 13, fontFamily: G.mono, padding: "8px 10px", outline: "none", boxSizing: "border-box" }} />
                    </div>
                  ))}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,minmax(0,1fr))" : "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
                  {[["Beds", "beds", "3"], ["Baths", "baths", "2"], ["Sq Ft", "sqft", "1,400"], ["Year Built", "yearBuilt", "1975"]].map(([l, f, ph]) => (
                    <div key={f}>
                      <div style={{ ...lbl }}>{l}</div>
                      <input value={wForm[f]} onChange={(e) => wUpdate(f, e.target.value.replace(/[^0-9]/g, ""))} placeholder={ph} style={{ width: "100%", background: G.surface, border: `1px solid ${G.border}`, borderRadius: 5, color: G.text, fontSize: 13, fontFamily: G.mono, padding: "8px 10px", outline: "none", boxSizing: "border-box" }} />
                    </div>
                  ))}
                </div>
                <div style={{ marginBottom: 14 }}>
                  <div style={{ ...lbl }}>Deal Type</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {["Wholesale", "Fix & Flip", "BRRRR", "Land"].map((t) => (
                      <div key={t} onClick={() => wUpdate("type", t)} style={{ padding: "6px 14px", borderRadius: 4, cursor: "pointer", fontSize: 9, fontFamily: G.mono, border: `1px solid ${wForm.type === t ? G.green : G.border}`, background: wForm.type === t ? G.greenGlow : "transparent", color: wForm.type === t ? G.green : G.muted }}>
                        {t}
                      </div>
                    ))}
                  </div>
                </div>
                <button onClick={() => setSubmitStep(2)} style={{ ...btnG, width: "100%", fontSize: 10 }}>Next: Enter Numbers →</button>
              </div>
            )}

            {submitStep === 2 && (
              <div style={{ ...card }}>
                <div style={{ fontFamily: G.serif, fontSize: 15, color: G.text, fontWeight: "bold", marginBottom: 14 }}>Deal Numbers</div>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10, marginBottom: 10 }}>
                  {[["ARV (After Repair Value)", "arv", "385,000"], ["Your Asking Price", "askPrice", "195,000"], ["Estimated Renovation", "renoEst", "62,000"], ["Assignment Fee", "assignFee", "12,000"], ["Earnest Money", "earnest", "2,500"], ["Close-By Date", "closeDate", "May 15, 2026"]].map(([l, f, ph]) => (
                    <div key={f}>
                      <div style={{ ...lbl }}>{l}</div>
                      <div style={{ position: "relative" }}>
                        {f !== "closeDate" && <span style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: G.muted, fontSize: 12 }}>$</span>}
                        <input value={wForm[f]} onChange={(e) => wUpdate(f, f === "closeDate" ? e.target.value : e.target.value.replace(/[^0-9]/g, ""))} placeholder={ph} style={{ width: "100%", background: G.surface, border: `1px solid ${G.border}`, borderRadius: 5, color: G.text, fontSize: 13, fontFamily: G.mono, padding: f !== "closeDate" ? "8px 10px 8px 20px" : "8px 10px", outline: "none", boxSizing: "border-box" }} />
                      </div>
                    </div>
                  ))}
                </div>
                {wForm.arv && wForm.askPrice && (
                  <div style={{ background: G.greenGlow, border: `1px solid ${G.green}33`, borderRadius: 6, padding: "10px 14px", marginBottom: 12 }}>
                    <div style={{ display: "flex", gap: 20, fontSize: 10 }}>
                      <span style={{ color: G.muted }}>Equity: <strong style={{ color: G.green }}>{fmt(toNum(wForm.arv) - toNum(wForm.askPrice) - toNum(wForm.renoEst))}</strong></span>
                      <span style={{ color: G.muted }}>ROI est.: <strong style={{ color: G.green }}>{wForm.arv ? Math.round(((toNum(wForm.arv) - toNum(wForm.askPrice) - toNum(wForm.renoEst) - toNum(wForm.assignFee)) / (toNum(wForm.askPrice) + toNum(wForm.renoEst) + toNum(wForm.assignFee))) * 100) : 0}%</strong></span>
                      <span style={{ color: G.muted }}>Pct of ARV: <strong style={{ color: G.gold }}>{wForm.arv ? Math.round((toNum(wForm.askPrice) / toNum(wForm.arv)) * 100) : 0}%</strong></span>
                    </div>
                  </div>
                )}
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => setSubmitStep(1)} style={{ ...btnO, flex: 1, fontSize: 10 }}>← Back</button>
                  <button onClick={() => setSubmitStep(3)} style={{ ...btnG, flex: 2, fontSize: 10 }}>Next: Description →</button>
                </div>
              </div>
            )}

            {submitStep === 3 && (
              <div style={{ ...card }}>
                <div style={{ fontFamily: G.serif, fontSize: 15, color: G.text, fontWeight: "bold", marginBottom: 14 }}>Deal Description</div>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ ...lbl }}>Property Condition <span style={{ color: G.muted, fontWeight: "normal" }}>(tell buyers what makes this deal)</span></div>
                  <select value={wForm.condition} onChange={(e) => wUpdate("condition", e.target.value)} style={{ width: "100%", background: G.surface, border: `1px solid ${G.border}`, borderRadius: 5, color: G.text, fontSize: 13, fontFamily: G.mono, padding: "9px 11px", outline: "none" }}>
                    {["Light Cosmetic", "Cosmetic Flip", "Full Rehab", "Major Rehab"].map((o) => <option key={o} value={o} style={{ background: G.card }}>{o}</option>)}
                  </select>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ ...lbl }}>Deal Description <span style={{ color: G.muted, fontWeight: "normal" }}>(tell buyers what makes this deal)</span></div>
                  <textarea value={wForm.description} onChange={(e) => wUpdate("description", e.target.value)} placeholder="Describe the opportunity - seller motivation, property condition, why this is a good deal, access situation, title status..." rows={4} style={{ width: "100%", background: G.surface, border: `1px solid ${G.border}`, borderRadius: 5, color: G.text, fontSize: 12, fontFamily: G.mono, padding: "9px 11px", outline: "none", resize: "vertical", lineHeight: 1.6, boxSizing: "border-box" }} />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <div style={{ ...lbl }}>Deal Highlights (comma separated)</div>
                  <input value={wForm.highlights} onChange={(e) => wUpdate("highlights", e.target.value)} placeholder="Clear title, Motivated seller, Comps at $380K, Vacant and accessible" style={{ width: "100%", background: G.surface, border: `1px solid ${G.border}`, borderRadius: 5, color: G.text, fontSize: 13, fontFamily: G.mono, padding: "9px 11px", outline: "none", boxSizing: "border-box" }} />
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => setSubmitStep(2)} style={{ ...btnO, flex: 1, fontSize: 10 }}>← Back</button>
                  <button onClick={() => setSubmitStep(4)} style={{ ...btnG, flex: 2, fontSize: 10 }}>Next: Contact Info →</button>
                </div>
              </div>
            )}

            {submitStep === 4 && (
              <div style={{ ...card }}>
                <div style={{ fontFamily: G.serif, fontSize: 15, color: G.text, fontWeight: "bold", marginBottom: 14 }}>Your Contact Info</div>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10, marginBottom: 14 }}>
                  {[["Your Name", "contactName", "Ray Torres"], ["Company (optional)", "contactCompany", "DealBank Ventures"], ["Phone", "contactPhone", "(916) 555-0100"], ["Email", "contactEmail", "ray@deals.com"]].map(([l, f, ph]) => (
                    <div key={l}>
                      <div style={{ ...lbl }}>{l}</div>
                      <input value={wForm[f]} onChange={(e) => wUpdate(f, e.target.value)} placeholder={ph} style={{ width: "100%", background: G.surface, border: `1px solid ${G.border}`, borderRadius: 5, color: G.text, fontSize: 13, fontFamily: G.mono, padding: "8px 10px", outline: "none", boxSizing: "border-box" }} />
                    </div>
                  ))}
                </div>
                {submitError && <div style={{ fontSize: 10, color: G.red, marginBottom: 10 }}>{submitError}</div>}
                <div style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 6, padding: "12px", marginBottom: 14 }}>
                  <div style={{ ...lbl, color: G.gold, marginBottom: 6 }}>Platform Fee</div>
                  <div style={{ fontSize: 11, color: G.text, lineHeight: 1.8 }}>DealBank charges <strong style={{ color: G.gold }}>1.5% of the assignment fee</strong> when your deal closes. No upfront cost, no listing fee, no monthly charge.</div>
                  {wForm.assignFee && <div style={{ marginTop: 6, fontSize: 10, color: G.muted }}>On your {fmt(wForm.assignFee)} fee: <strong style={{ color: G.gold }}>{fmt(Math.round(toNum(wForm.assignFee) * 0.015))} to DealBank</strong>, <strong style={{ color: G.green }}>{fmt(Math.round(toNum(wForm.assignFee) * 0.985))} to you</strong></div>}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => setSubmitStep(3)} style={{ ...btnO, flex: 1, fontSize: 10 }}>← Back</button>
                  <button onClick={submitListing} disabled={submitBusy} style={{ ...btnG, flex: 2, fontSize: 10, opacity: submitBusy ? 0.7 : 1 }}>
                    {submitBusy ? "Submitting..." : "Submit Deal to Buyer Network"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  if (mktView === "buyers") {
    return (
      <BuyerNetworkView
        G={G}
        card={card}
        btnO={btnO}
        buyersLoading={buyersLoading}
        buyersError={buyersError}
        buyers={buyers}
        buyerStats={buyerStats}
        onBack={() => setMktView("feed")}
      />
    );
  }

  return (
    <div>
      {listingsError && <div style={{ ...card, marginBottom: 10, borderColor: `${G.red}55`, color: G.red, fontSize: 10 }}>{listingsError}</div>}
      <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", justifyContent: "space-between", alignItems: isMobile ? "stretch" : "flex-start", gap: isMobile ? 10 : 0, marginBottom: 12 }}>
        <div>
          <div style={{ fontFamily: G.serif, fontSize: isMobile ? 18 : 20, color: G.text, fontWeight: "bold" }}>Wholesale Deal Feed</div>
          <div style={{ fontSize: 10, color: G.muted, marginTop: 2 }}>{listingsLoading ? "Loading listings..." : `${filtered.length} deals available · Live from Supabase`}</div>
        </div>
        <div style={{ display: "flex", gap: 8, width: isMobile ? "100%" : "auto" }}>
          <button onClick={() => setMktView("buyers")} style={{ ...btnO, flex: isMobile ? 1 : "unset", fontSize: 9, padding: isMobile ? "8px 10px" : "7px 12px", borderColor: G.blue, color: G.blue }}>Buyer Network ({activeBuyerCount})</button>
          <button onClick={() => setMktView("submit")} style={{ ...btnG, flex: isMobile ? 1 : "unset", fontSize: 9, padding: isMobile ? "8px 10px" : "7px 12px" }}>+ Submit a Deal</button>
        </div>
      </div>

      <div style={{ background: "linear-gradient(135deg,#eff6ff,#e6efff)", border: "1px solid #93c5fd88", borderRadius: 8, padding: isMobile ? "10px 11px" : "12px 16px", marginBottom: 12, display: "flex", flexDirection: isMobile ? "column" : "row", justifyContent: "space-between", alignItems: isMobile ? "stretch" : "center", gap: isMobile ? 8 : 0 }}>
        <div>
          <div style={{ fontSize: 7, color: G.blue, letterSpacing: 3, marginBottom: 2 }}>SPONSORED · KIAVI HARD MONEY</div>
          <div style={{ fontFamily: G.serif, fontSize: 13, color: G.text, fontWeight: "bold" }}>Fund any deal in this feed in 5 days</div>
          <div style={{ fontSize: 9, color: G.muted }}>Pre-approval in 24 hours. Up to 90% of purchase. No income docs.</div>
        </div>
        <div style={{ background: G.blue, color: "#fff", borderRadius: 5, padding: "8px 12px", fontSize: 9, fontFamily: G.mono, fontWeight: "bold", letterSpacing: 2, whiteSpace: "nowrap", marginLeft: isMobile ? 0 : 12, textAlign: "center" }}>GET FUNDED →</div>
      </div>

      <DataSearchBar
        G={G}
        value={marketSearch}
        onChange={setMarketSearch}
        placeholder="Search by address, city, state, deal type, or numbers"
        resultCount={filtered.length}
        totalCount={listings.length}
      />

      <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ fontSize: 9, color: G.muted, letterSpacing: 2, marginRight: 4 }}>MARKET</div>
        {filterOptions.map((state) => (
          <div key={state} onClick={() => setMktFilter(state)} style={{ padding: isMobile ? "5px 8px" : "4px 10px", borderRadius: 4, cursor: "pointer", fontSize: isMobile ? 8 : 9, fontFamily: G.mono, border: `1px solid ${mktFilter === state ? G.green : G.border}`, background: mktFilter === state ? G.greenGlow : "transparent", color: mktFilter === state ? G.green : G.muted }}>
            {state}
          </div>
        ))}
        <div style={{ marginLeft: isMobile ? 0 : "auto", width: isMobile ? "100%" : "auto", display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ fontSize: 9, color: G.muted }}>SORT</div>
          {[ ["newest", "Newest"], ["roi", "Best ROI"], ["equity", "Most Equity"], ["price", "Lowest Price"] ].map(([v, l]) => (
            <div key={v} onClick={() => setMktSort(v)} style={{ padding: isMobile ? "5px 8px" : "4px 10px", borderRadius: 4, cursor: "pointer", fontSize: isMobile ? 8 : 9, fontFamily: G.mono, border: `1px solid ${mktSort === v ? G.gold : G.border}`, background: mktSort === v ? "#fef3c7" : "transparent", color: mktSort === v ? "#92400e" : G.muted }}>
              {l}
            </div>
          ))}
        </div>
      </div>

      {filtered.map((d) => (
        <div key={d.id} style={{ ...card, marginBottom: 10, borderColor: d.days === 0 ? `${G.green}44` : G.border, cursor: "pointer" }} onClick={() => setActiveListing(d)}>
          <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", justifyContent: "space-between", alignItems: "flex-start", gap: isMobile ? 8 : 0, marginBottom: 8 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                <div style={{ fontSize: 8, color: d.type === "Wholesale" ? G.gold : G.green, background: d.type === "Wholesale" ? `${G.gold}22` : G.greenGlow, border: `1px solid ${d.type === "Wholesale" ? G.gold : G.green}44`, borderRadius: 3, padding: "2px 7px", letterSpacing: 1 }}>
                  {d.type.toUpperCase()}
                </div>
                {d.days === 0 && <div style={{ fontSize: 8, color: "#ff6b6b", background: "#ff6b6b22", border: "1px solid #ff6b6b44", borderRadius: 3, padding: "2px 7px", letterSpacing: 1 }}>NEW TODAY</div>}
                <div style={{ fontSize: 9, color: G.muted }}>{d.days === 0 ? "Just posted" : `${d.days}d ago`} · {d.views} views</div>
              </div>
              <div style={{ fontFamily: G.serif, fontSize: isMobile ? 13 : 14, color: G.text, fontWeight: "bold", marginBottom: 2 }}>{d.addr}, {d.city}, {d.state}</div>
              <div style={{ fontSize: 9, color: G.muted }}>{d.beds}bd/{d.baths}ba · {d.sqft?.toLocaleString()} sqft · Built {d.yr} · {d.condition}</div>
            </div>
            <div style={{ textAlign: isMobile ? "left" : "right", minWidth: isMobile ? 0 : 100 }}>
              <div style={{ fontSize: 8, color: G.muted, letterSpacing: 2, marginBottom: 1 }}>ASKING</div>
              <div style={{ fontFamily: G.serif, fontSize: 18, color: G.text, fontWeight: "bold" }}>{fmt(d.ask)}</div>
              <div style={{ fontSize: 9, color: G.muted }}>+ {fmt(d.fee)} fee</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,minmax(0,1fr))" : "repeat(4,1fr)", gap: 6, marginBottom: 10 }}>
            {[{ l: "ARV", v: fmt(d.arv), c: G.green }, { l: "Est. Reno", v: fmt(d.reno), c: G.gold }, { l: "Equity", v: fmt(d.equity), c: G.text }, { l: "ROI", v: `${d.roi}%`, c: roiColor(d.roi) }].map(({ l, v, c }) => (
              <div key={l} style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 4, padding: "7px 9px", textAlign: "center" }}>
                <div style={{ fontSize: 7, color: G.muted, letterSpacing: 2, marginBottom: 2 }}>{l}</div>
                <div style={{ fontFamily: G.serif, fontSize: 13, color: c, fontWeight: "bold" }}>{v}</div>
              </div>
            ))}
          </div>

          <div style={{ fontSize: 10, color: G.muted, lineHeight: 1.6, marginBottom: 10 }}>{d.desc.slice(0, 120)}...</div>

          <div style={{ display: "flex", gap: 7 }}>
            <button onClick={(e) => { e.stopPropagation(); setActiveListing(d); }} style={{ ...btnG, flex: 2, fontSize: isMobile ? 10 : 9, padding: isMobile ? "9px 8px" : "8px" }}>View Full Deal →</button>
            <button onClick={(e) => { e.stopPropagation(); toggleSave(d.id); }} disabled={saveBusyId === d.id} style={{ ...btnO, flex: 1, fontSize: isMobile ? 10 : 9, padding: isMobile ? "9px 8px" : "8px", borderColor: savedDeals.includes(d.id) ? G.green : G.border, color: savedDeals.includes(d.id) ? G.green : G.muted, opacity: saveBusyId === d.id ? 0.65 : 1 }}>
              {savedDeals.includes(d.id) ? "Saved" : "Save"}
            </button>
          </div>
        </div>
      ))}

      {!listingsLoading && filtered.length === 0 && (
        <div style={{ ...card, textAlign: "center", padding: "18px 12px", fontSize: 10, color: G.muted }}>
          No listings available for this filter yet.
        </div>
      )}

      <div style={{ textAlign: "center", padding: "20px", fontSize: 10, color: G.muted }}>
        New deals posted daily. <span style={{ color: G.green, cursor: "pointer" }} onClick={() => setMktView("submit")}>Submit your own deal →</span>
      </div>
    </div>
  );
}
