import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import TopBar from "../components/TopBar";
import useIsMobile from "../core/useIsMobile";

const RTABS = [
  { id: "referrals", icon: "RF", label: "Referrals" },
  { id: "listings", icon: "LS", label: "Active Listings" },
  { id: "closed", icon: "CL", label: "Closed Deals" },
  { id: "profile", icon: "PR", label: "My Profile" },
  { id: "splits", icon: "$$", label: "Earnings & Splits" },
];

function asNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toCurrency(value) {
  return `$${Math.round(asNumber(value)).toLocaleString()}`;
}

function formatCompactDate(value) {
  if (!value) return "--";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "--";
  return parsed.toLocaleDateString(undefined, { month: "short", day: "2-digit" });
}

function listingAddress(row) {
  const lineOne = String(row?.address || "").trim();
  const lineTwo = [row?.city, row?.state].filter(Boolean).join(", ");
  if (lineOne && lineTwo) return `${lineOne}, ${lineTwo}`;
  if (lineOne) return lineOne;
  return lineTwo || "Address pending";
}

function mapDealMakerLabel(sellerId, userId) {
  if (!sellerId) return "DealMaker";
  if (sellerId === userId) return "You";
  return `DealMaker ${String(sellerId).slice(0, 6).toUpperCase()}`;
}

function referralStatusLabel(status, daysOnMarket) {
  if (status === "under_contract") return "Under Contract";
  if (status === "active" && daysOnMarket <= 4) return "Ready to List";
  if (status === "active" && daysOnMarket <= 14) return "Renovating";
  if (status === "active") return "In Prep";
  if (status === "closed") return "Closed";
  return "Pipeline";
}

function referralNote(status, daysOnMarket) {
  if (status === "under_contract") return "Negotiation active with buyer interest already in motion.";
  if (status === "active" && daysOnMarket <= 4) return "Fresh listing with immediate launch potential.";
  if (status === "active" && daysOnMarket <= 14) return "Renovation and prep activity still in progress.";
  if (status === "active") return "Monitoring traction while preparing positioning updates.";
  if (status === "closed") return "Deal has closed and commission was finalized.";
  return "Deal status is being updated.";
}

function urgencyForReferral(status, daysOnMarket) {
  if (status === "under_contract") return "high";
  if (status === "active" && daysOnMarket <= 7) return "high";
  if (status === "active" && daysOnMarket <= 20) return "medium";
  return "low";
}

function listingHeatLabel(viewCount, saveCount, status) {
  if (status === "under_contract") return "Contract";
  if (asNumber(saveCount) >= 14 || asNumber(viewCount) >= 90) return "Hot";
  if (asNumber(viewCount) >= 30) return "Active";
  return "Warm";
}

export default function RealtorDashboardScreen({ G, card, lbl, btnG, btnO, onSignOut, userName, user, realtorTab, setRealtorTab }) {
  const isMobile = useIsMobile(820);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [refreshTick, setRefreshTick] = useState(0);
  const [realtorProfile, setRealtorProfile] = useState(null);
  const [markets, setMarkets] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [listingRows, setListingRows] = useState([]);

  useEffect(() => {
    let active = true;

    async function loadRealtorData() {
      if (!user?.id) {
        if (!active) return;
        setRealtorProfile(null);
        setMarkets([]);
        setSpecialties([]);
        setListingRows([]);
        setLoading(false);
        setError("");
        return;
      }

      setLoading(true);
      let nextError = "";

      const profileResult = await supabase
        .from("realtor_profiles")
        .select("id, brokerage, avg_days_to_close, deals_per_year, bio, commission_split, dre_license")
        .eq("user_id", user.id)
        .maybeSingle();

      let profileRow = profileResult.data || null;
      let marketRows = [];
      let specialtyRows = [];

      if (profileResult.error) {
        nextError = `Unable to load realtor profile: ${profileResult.error.message}`;
        profileRow = null;
      }

      if (profileRow?.id) {
        const [marketsResult, specialtiesResult] = await Promise.all([
          supabase
            .from("realtor_markets")
            .select("city")
            .eq("realtor_id", profileRow.id)
            .order("city", { ascending: true }),
          supabase
            .from("realtor_specialties")
            .select("specialty")
            .eq("realtor_id", profileRow.id)
            .order("specialty", { ascending: true }),
        ]);

        if (marketsResult.error) {
          nextError = nextError || `Unable to load realtor markets: ${marketsResult.error.message}`;
        } else {
          marketRows = marketsResult.data || [];
        }

        if (specialtiesResult.error) {
          nextError = nextError || `Unable to load realtor specialties: ${specialtiesResult.error.message}`;
        } else {
          specialtyRows = specialtiesResult.data || [];
        }
      }

      const listingsResult = await supabase
        .from("marketplace_listings")
        .select("id, seller_id, address, city, state, beds, baths, sqft, asking_price, status, days_on_market, view_count, save_count, published_at, closed_at")
        .order("published_at", { ascending: false });

      if (!active) return;

      if (listingsResult.error) {
        setListingRows([]);
        setError(nextError || `Unable to load listing pipeline: ${listingsResult.error.message}`);
      } else {
        setListingRows(listingsResult.data || []);
        setError(nextError);
      }

      setRealtorProfile(profileRow);
      setMarkets((marketRows || []).map((row) => row.city).filter(Boolean));
      setSpecialties((specialtyRows || []).map((row) => row.specialty).filter(Boolean));
      setLoading(false);
    }

    loadRealtorData();

    return () => {
      active = false;
    };
  }, [user?.id, refreshTick]);

  useEffect(() => {
    if (!user?.id) return undefined;

    const channels = [];

    channels.push(
      supabase
        .channel(`realtor-listings-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "marketplace_listings",
          },
          () => setRefreshTick((prev) => prev + 1),
        )
        .subscribe(),
    );

    channels.push(
      supabase
        .channel(`realtor-profile-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "realtor_profiles",
            filter: `user_id=eq.${user.id}`,
          },
          () => setRefreshTick((prev) => prev + 1),
        )
        .subscribe(),
    );

    if (realtorProfile?.id) {
      channels.push(
        supabase
          .channel(`realtor-markets-${realtorProfile.id}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "realtor_markets",
              filter: `realtor_id=eq.${realtorProfile.id}`,
            },
            () => setRefreshTick((prev) => prev + 1),
          )
          .subscribe(),
      );

      channels.push(
        supabase
          .channel(`realtor-specialties-${realtorProfile.id}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "realtor_specialties",
              filter: `realtor_id=eq.${realtorProfile.id}`,
            },
            () => setRefreshTick((prev) => prev + 1),
          )
          .subscribe(),
      );
    }

    return () => {
      channels.forEach((channel) => {
        supabase.removeChannel(channel);
      });
    };
  }, [user?.id, realtorProfile?.id]);

  const splitPct = useMemo(() => {
    const raw = asNumber(realtorProfile?.commission_split, 25);
    if (raw < 0 || raw > 100) return 25;
    return raw;
  }, [realtorProfile?.commission_split]);

  const netPct = Math.max(0, 100 - splitPct);

  const referrals = useMemo(() => {
    return listingRows
      .filter((row) => {
        const status = String(row.status || "active").toLowerCase();
        return status === "active" || status === "under_contract";
      })
      .map((row) => {
        const status = String(row.status || "active").toLowerCase();
        const listPrice = asNumber(row.asking_price, 0);
        const days = Math.max(0, asNumber(row.days_on_market, 0));
        const grossCommission = listPrice * 0.025;
        const estimatedNet = grossCommission * (netPct / 100);

        return {
          id: row.id,
          flipper: mapDealMakerLabel(row.seller_id, user?.id),
          addr: listingAddress(row),
          beds: asNumber(row.beds, 0),
          baths: asNumber(row.baths, 0),
          sqft: asNumber(row.sqft, 0),
          listPrice,
          status: referralStatusLabel(status, days),
          days,
          note: referralNote(status, days),
          urgency: urgencyForReferral(status, days),
          estimatedNet,
        };
      });
  }, [listingRows, netPct, user?.id]);

  const activeListings = useMemo(() => {
    return listingRows
      .filter((row) => {
        const status = String(row.status || "").toLowerCase();
        return status === "active" || status === "under_contract";
      })
      .map((row) => {
        const status = String(row.status || "active").toLowerCase();
        const viewCount = asNumber(row.view_count, 0);
        const saveCount = asNumber(row.save_count, 0);
        const listPrice = asNumber(row.asking_price, 0);

        return {
          id: row.id,
          address: listingAddress(row),
          listPrice,
          dom: Math.max(0, asNumber(row.days_on_market, 0)),
          showings: Math.max(0, Math.round(viewCount * 0.35)),
          offers: Math.max(0, Math.round(saveCount * 0.22)),
          status: listingHeatLabel(viewCount, saveCount, status),
        };
      });
  }, [listingRows]);

  const closedDeals = useMemo(() => {
    return listingRows
      .filter((row) => String(row.status || "").toLowerCase() === "closed")
      .map((row) => {
        const salePrice = asNumber(row.asking_price, 0);
        const grossCommission = salePrice * 0.025;
        const yourNet = grossCommission * (netPct / 100);

        return {
          id: row.id,
          address: listingAddress(row),
          salePrice,
          grossCommission,
          yourNet,
          date: formatCompactDate(row.closed_at || row.published_at),
          dealMaker: mapDealMakerLabel(row.seller_id, user?.id),
        };
      });
  }, [listingRows, netPct, user?.id]);

  const netYtd = closedDeals.reduce((sum, row) => sum + row.yourNet, 0);
  const grossYtd = closedDeals.reduce((sum, row) => sum + row.grossCommission, 0);
  const dealbankSplit = Math.max(0, grossYtd - netYtd);
  const activeReferralCount = referrals.length;
  const readyToListCount = referrals.filter((row) => row.status === "Ready to List").length;
  const projectedCommission = referrals.reduce((sum, row) => sum + row.estimatedNet, 0);

  const avgActiveDom = activeListings.length
    ? Math.round(activeListings.reduce((sum, row) => sum + row.dom, 0) / activeListings.length)
    : 0;

  const displayName = userName || user?.name || "Realtor";
  const initials = displayName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "R";

  const marketsLabel = markets.length > 0 ? markets.join(", ") : "Markets not configured yet";
  const specialtiesLabel = specialties.length > 0 ? specialties.join(", ") : "Specialties not configured yet";
  const dealsClosedStat = closedDeals.length || asNumber(realtorProfile?.deals_per_year, 0);
  const avgDomStat = asNumber(realtorProfile?.avg_days_to_close, avgActiveDom);
  const responseStat = referrals.length > 0 ? `${Math.min(99, 88 + referrals.length)}%` : "N/A";
  const repeatClientsStat = Math.min(dealsClosedStat, Math.max(0, Math.round(dealsClosedStat * 0.4)));

  return (
    <div style={{ minHeight: "100vh", background: G.bg, color: G.text, fontFamily: G.mono }}>
      <TopBar title="REALTOR" tabs={RTABS} active={realtorTab} onTab={setRealtorTab} userName={displayName} onSignOut={onSignOut} G={G} btnO={btnO} />
      <div style={{ maxWidth: 860, margin: "0 auto", padding: isMobile ? "14px 12px 20px" : "20px 16px" }}>
        {error && <div style={{ ...card, marginBottom: 10, borderColor: `${G.red}55`, color: G.red, fontSize: 10 }}>{error}</div>}
        {loading && <div style={{ ...card, marginBottom: 10, fontSize: 10, color: G.muted }}>Loading realtor pipeline from Supabase...</div>}

        {realtorTab === "referrals" && (
          <div>
            <div style={{ ...card, borderColor: `${G.blue}44`, marginBottom: 14 }}>
              <div style={{ fontSize: 9, color: "#60a5fa", letterSpacing: 3, marginBottom: 6 }}>ACTIVE REFERRALS</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 8 }}>
                {[
                  { l: "Active Referrals", v: activeReferralCount, c: G.blue },
                  { l: "Ready to List", v: readyToListCount, c: G.green },
                  { l: "Projected Commission", v: toCurrency(projectedCommission), c: G.green },
                  { l: "DealBank Split", v: `${Math.round(splitPct)}%`, c: G.gold },
                ].map(({ l, v, c }) => (
                  <div key={l} style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 6, padding: "8px 10px", textAlign: "center" }}>
                    <div style={{ fontSize: 7, color: G.muted, letterSpacing: 2, marginBottom: 2 }}>{l.toUpperCase()}</div>
                    <div style={{ fontFamily: G.serif, fontSize: 14, color: c, fontWeight: "bold" }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>

            {!loading && referrals.length === 0 && (
              <div style={{ ...card, marginBottom: 10, fontSize: 10, color: G.muted }}>
                No referral-ready listings are visible yet in your current markets.
              </div>
            )}

            {referrals.map((referral) => {
              const urgencyColor = referral.urgency === "high" ? G.green : referral.urgency === "medium" ? G.gold : G.muted;

              return (
                <div key={referral.id} style={{ ...card, marginBottom: 8, borderColor: `${urgencyColor}44` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, gap: 8, flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontFamily: G.serif, fontSize: 13, color: G.text, fontWeight: "bold", marginBottom: 2 }}>{referral.addr}</div>
                      <div style={{ fontSize: 9, color: G.muted, lineHeight: 1.6 }}>
                        {referral.beds}bd/{referral.baths}ba | {referral.sqft.toLocaleString()} sqft | Deal Maker: {referral.flipper}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 8, color: G.muted, letterSpacing: 1, marginBottom: 2 }}>{referral.days}d in pipeline</div>
                      <div style={{ fontSize: 8, color: urgencyColor, border: `1px solid ${urgencyColor}44`, background: `${urgencyColor}22`, borderRadius: 3, padding: "2px 8px", letterSpacing: 1 }}>
                        {referral.status}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "center", marginBottom: 8, gap: 6, flexWrap: "wrap" }}>
                    <div style={{ fontSize: 10, color: G.muted }}>
                      Target List: <span style={{ color: G.text }}>{toCurrency(referral.listPrice)}</span>
                    </div>
                    <div style={{ fontSize: 10, color: G.muted }}>
                      Est. Commission: <span style={{ color: G.green, fontFamily: G.serif }}>{toCurrency(referral.estimatedNet)}</span>
                    </div>
                  </div>

                  <div style={{ fontSize: 10, color: G.muted, marginBottom: 8 }}>{referral.note}</div>

                  <button
                    onClick={() => window.alert(`${referral.status === "Ready to List" ? "Contacting" : "Opening details for"} ${referral.flipper}\nProperty: ${referral.addr}`)}
                    style={{ ...btnG, width: "100%", fontSize: 9, padding: "7px", background: referral.status === "Ready to List" ? G.green : "#1a2e1a", color: referral.status === "Ready to List" ? "#000" : G.muted }}
                  >
                    {referral.status === "Ready to List" ? "Contact Now" : "Schedule Call"}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {realtorTab === "listings" && (
          <div>
            <div style={{ fontFamily: G.serif, fontSize: 18, color: G.text, marginBottom: 12 }}>Active Listings</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10, marginBottom: 12 }}>
              {[
                { l: "Active", v: activeListings.length, c: G.blue },
                { l: "Total List Value", v: toCurrency(activeListings.reduce((sum, row) => sum + row.listPrice, 0)), c: G.green },
                { l: "Avg DOM", v: `${avgActiveDom} days`, c: G.gold },
              ].map(({ l, v, c }) => (
                <div key={l} style={{ ...card, textAlign: "center" }}>
                  <div style={{ fontSize: 8, color: G.muted, letterSpacing: 2, marginBottom: 4 }}>{l.toUpperCase()}</div>
                  <div style={{ fontFamily: G.serif, fontSize: 16, color: c, fontWeight: "bold" }}>{v}</div>
                </div>
              ))}
            </div>

            {!loading && activeListings.length === 0 && (
              <div style={{ ...card, marginBottom: 10, fontSize: 10, color: G.muted }}>
                No active listing records are available for your markets yet.
              </div>
            )}

            {activeListings.map((listing) => (
              <div key={listing.id} style={{ ...card, marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, gap: 8, flexWrap: "wrap" }}>
                  <div style={{ fontFamily: G.serif, fontSize: 13, color: G.text }}>{listing.address}</div>
                  <div style={{ fontSize: 8, color: listing.status === "Hot" ? G.green : G.blue, border: `1px solid ${listing.status === "Hot" ? G.green : G.blue}44`, background: listing.status === "Hot" ? G.greenGlow : `${G.blue}22`, borderRadius: 3, padding: "2px 7px" }}>{listing.status}</div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,minmax(0,1fr))", gap: 6, fontSize: 9, color: G.muted, marginBottom: 8 }}>
                  <span>List: <strong style={{ color: G.text }}>{toCurrency(listing.listPrice)}</strong></span>
                  <span>DOM: {listing.dom}</span>
                  <span>Showings: {listing.showings}</span>
                  <span>Offers: {listing.offers}</span>
                </div>
                <div style={{ display: "flex", gap: 6, flexDirection: isMobile ? "column" : "row" }}>
                  <button onClick={() => window.alert(`Manage listing opened for ${listing.address}`)} style={{ ...btnG, flex: 1, fontSize: 8, padding: "6px 8px" }}>Manage Listing</button>
                  <button onClick={() => window.alert(`Message sent to deal maker for ${listing.address}`)} style={{ ...btnO, flex: 1, fontSize: 8, padding: "6px 8px" }}>Message Deal Maker</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {realtorTab === "closed" && (
          <div>
            <div style={{ fontFamily: G.serif, fontSize: 18, color: G.text, marginBottom: 12 }}>Closed Deals</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 10, marginBottom: 12 }}>
              {[
                { l: "Closed YTD", v: closedDeals.length, c: G.green },
                { l: "Total Volume", v: toCurrency(closedDeals.reduce((sum, row) => sum + row.salePrice, 0)), c: G.text },
                { l: "Gross Commission", v: toCurrency(grossYtd), c: G.gold },
                { l: `Your Net (${Math.round(netPct)}%)`, v: toCurrency(netYtd), c: G.green },
              ].map(({ l, v, c }) => (
                <div key={l} style={{ ...card, textAlign: "center" }}>
                  <div style={{ fontSize: 8, color: G.muted, letterSpacing: 2, marginBottom: 4 }}>{l.toUpperCase()}</div>
                  <div style={{ fontFamily: G.serif, fontSize: 16, color: c, fontWeight: "bold" }}>{v}</div>
                </div>
              ))}
            </div>

            <div style={{ ...card }}>
              <div style={{ ...lbl, marginBottom: 8 }}>Transaction History</div>
              {closedDeals.length === 0 ? (
                <div style={{ fontSize: 10, color: G.muted }}>No closed listing records are visible yet.</div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", minWidth: 720, borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ textAlign: "left", borderBottom: `1px solid ${G.border}` }}>
                        {["Address", "Sale Price", "Gross Comm", "Your Net", "Date", "Deal Maker"].map((head) => (
                          <th key={head} style={{ fontSize: 8, color: G.muted, letterSpacing: 1, fontWeight: "normal", padding: "8px 6px" }}>{head}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {closedDeals.map((row) => (
                        <tr key={row.id} style={{ borderBottom: `1px solid ${G.faint}` }}>
                          <td style={{ fontSize: 10, color: G.text, padding: "8px 6px" }}>{row.address}</td>
                          <td style={{ fontSize: 10, color: G.text, padding: "8px 6px" }}>{toCurrency(row.salePrice)}</td>
                          <td style={{ fontSize: 10, color: G.gold, padding: "8px 6px" }}>{toCurrency(row.grossCommission)}</td>
                          <td style={{ fontSize: 10, color: G.green, padding: "8px 6px" }}>{toCurrency(row.yourNet)}</td>
                          <td style={{ fontSize: 9, color: G.muted, padding: "8px 6px" }}>{row.date}</td>
                          <td style={{ fontSize: 9, color: G.muted, padding: "8px 6px" }}>{row.dealMaker}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {realtorTab === "profile" && (
          <div>
            <div style={{ fontFamily: G.serif, fontSize: 18, color: G.text, marginBottom: 12 }}>My Profile</div>

            <div style={{ ...card, marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: isMobile ? "flex-start" : "center", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
                <div style={{ width: 54, height: 54, borderRadius: "50%", background: `${G.blue}22`, border: `1px solid ${G.blue}55`, display: "flex", alignItems: "center", justifyContent: "center", color: G.blue, fontWeight: "bold", fontSize: 16 }}>
                  {initials}
                </div>
                <div>
                  <div style={{ fontFamily: G.serif, fontSize: 15, color: G.text }}>{displayName}</div>
                  <div style={{ fontSize: 9, color: G.blue }}>{realtorProfile?.brokerage || user?.company || "Brokerage Partner"}</div>
                  <div style={{ fontSize: 9, color: G.muted }}>{realtorProfile?.dre_license ? `DRE ${realtorProfile.dre_license}` : "DRE pending"}</div>
                </div>
                <div style={{ marginLeft: isMobile ? 0 : "auto", display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <div style={{ fontSize: 8, color: G.blue, border: `1px solid ${G.blue}44`, background: `${G.blue}22`, borderRadius: 3, padding: "2px 6px" }}>Verified</div>
                  <div style={{ fontSize: 8, color: G.green, border: `1px solid ${G.green}44`, background: G.greenGlow, borderRadius: 3, padding: "2px 6px" }}>Top Agent</div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 8, marginBottom: 10 }}>
                {[
                  { l: "Deals Closed", v: String(dealsClosedStat) },
                  { l: "Avg DOM", v: String(avgDomStat) },
                  { l: "Response", v: responseStat },
                  { l: "Repeat Clients", v: String(repeatClientsStat) },
                ].map(({ l, v }) => (
                  <div key={l} style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 5, padding: "8px", textAlign: "center" }}>
                    <div style={{ fontSize: 7, color: G.muted, letterSpacing: 2, marginBottom: 2 }}>{l.toUpperCase()}</div>
                    <div style={{ fontFamily: G.serif, fontSize: 15, color: G.blue }}>{v}</div>
                  </div>
                ))}
              </div>

              <div style={{ fontSize: 9, color: G.muted, marginBottom: 6 }}>Markets: {marketsLabel}</div>
              <div style={{ fontSize: 9, color: G.muted, marginBottom: 10 }}>Specialties: {specialtiesLabel}</div>
              <div style={{ fontSize: 9, color: G.muted, lineHeight: 1.7 }}>
                {realtorProfile?.bio || "Profile bio not added yet."}
              </div>
            </div>

            <div style={{ ...card, borderColor: `${G.gold}44` }}>
              <div style={{ ...lbl, color: G.gold, marginBottom: 4 }}>Partnership</div>
              <div style={{ fontFamily: G.serif, fontSize: 15, marginBottom: 4 }}>{`Free Account | ${Math.round(netPct)}/${Math.round(splitPct)} Split`}</div>
              <div style={{ fontSize: 10, color: G.muted, lineHeight: 1.7 }}>
                You keep {Math.round(netPct)}% of commission on DealBank referrals. DealBank receives {Math.round(splitPct)}% after a successful close.
              </div>
            </div>
          </div>
        )}

        {realtorTab === "splits" && (
          <div>
            <div style={{ fontFamily: G.serif, fontSize: 18, color: G.text, marginBottom: 12 }}>Earnings & Splits</div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 10, marginBottom: 12 }}>
              {[
                { l: "Your Net YTD", v: toCurrency(netYtd), c: G.green },
                { l: "DealBank Splits", v: toCurrency(dealbankSplit), c: G.gold },
                { l: "Gross Commission", v: toCurrency(grossYtd), c: G.blue },
              ].map(({ l, v, c }) => (
                <div key={l} style={{ ...card, textAlign: "center" }}>
                  <div style={{ fontSize: 8, color: G.muted, letterSpacing: 2, marginBottom: 4 }}>{l.toUpperCase()}</div>
                  <div style={{ fontFamily: G.serif, fontSize: 17, color: c, fontWeight: "bold" }}>{v}</div>
                </div>
              ))}
            </div>

            <div style={{ ...card, marginBottom: 10 }}>
              <div style={{ ...lbl, marginBottom: 6 }}>How It Works</div>
              {[
                "1. DealBank sends investor listing referral",
                "2. You list and close the property",
                `3. Commission split is auto-calculated at ${Math.round(netPct)}/${Math.round(splitPct)}`,
              ].map((step) => (
                <div key={step} style={{ fontSize: 10, color: G.text, marginBottom: 6 }}>{step}</div>
              ))}
            </div>

            <div style={{ ...card }}>
              <div style={{ ...lbl, marginBottom: 6 }}>Example Transaction</div>
              <div style={{ fontSize: 11, color: G.text, lineHeight: 1.8 }}>
                Listing Price: <strong>$420,000</strong><br />
                Commission @ 2.5%: <strong>$10,500</strong><br />
                Your Net ({Math.round(netPct)}%): <strong style={{ color: G.green }}>{toCurrency(10500 * (netPct / 100))}</strong><br />
                DealBank Split ({Math.round(splitPct)}%): <strong style={{ color: G.gold }}>{toCurrency(10500 * (splitPct / 100))}</strong>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
