import { useMemo, useState } from "react";
import DataSearchBar from "../../components/DataSearchBar";
import { dealStageColor, formatMoney, formatRelativeTime } from "../../core/adminDashboardFormat";

export default function AdminDealsPanel({
  G,
  card,
  btnO,
  isMobile,
  deals,
  loading,
  error,
  dealsTotal,
  dealsClosed,
  onReload,
}) {
  const [dealSearch, setDealSearch] = useState("");

  const filteredDeals = useMemo(() => {
    const query = dealSearch.trim().toLowerCase();
    if (!query) return deals;

    return deals.filter((deal) => {
      const searchable = [
        deal.address,
        deal.stage,
        deal.userName,
        String(deal.arv || ""),
        String(deal.offerPrice || ""),
        String(deal.netProfit || ""),
      ].join(" ").toLowerCase();

      return searchable.includes(query);
    });
  }, [deals, dealSearch]);

  return (
    <div>
      <div style={{ fontFamily: G.serif, fontSize: isMobile ? 18 : 20, color: G.text, marginBottom: 12 }}>
        All Deals - Platform Wide ({dealsTotal} total · {dealsClosed} closed)
      </div>

      <DataSearchBar
        G={G}
        value={dealSearch}
        onChange={setDealSearch}
        placeholder="Search by address, stage, user, ARV, offer, or profit"
        resultCount={filteredDeals.length}
        totalCount={deals.length}
      />

      {error && (
        <div style={{ ...card, marginBottom: 10, borderColor: `${G.red}55` }}>
          <div style={{ fontSize: 9, color: G.red, marginBottom: 8 }}>{error}</div>
          <button onClick={onReload} style={{ ...btnO, padding: "4px 10px", fontSize: 8 }}>
            Retry
          </button>
        </div>
      )}

      {!error && loading && deals.length === 0 && (
        <div style={{ ...card, marginBottom: 8 }}>
          <div style={{ fontSize: 9, color: G.muted }}>Loading deals from public.deals...</div>
        </div>
      )}

      {!error && !loading && deals.length === 0 && (
        <div style={{ ...card, marginBottom: 8 }}>
          <div style={{ fontSize: 9, color: G.muted }}>No deals found in public.deals.</div>
        </div>
      )}

      {!error && !loading && deals.length > 0 && filteredDeals.length === 0 && (
        <div style={{ ...card, marginBottom: 8 }}>
          <div style={{ fontSize: 9, color: G.muted }}>No deals match your search.</div>
        </div>
      )}

      {filteredDeals.map((deal) => (
        <div key={deal.id} style={{ ...card, marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
            <div style={{ fontFamily: G.serif, fontSize: 13, color: G.text, fontWeight: "bold" }}>{deal.address}</div>
            <div
              style={{
                fontSize: 8,
                color: dealStageColor(deal.stage, G),
                background: G.greenGlow,
                borderRadius: 3,
                padding: "2px 8px",
                letterSpacing: 1,
              }}
            >
              {deal.stage}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(5,minmax(0,1fr))", gap: 6, fontSize: 9, color: G.muted }}>
            <span>
              User: <strong style={{ color: G.text }}>{deal.userName}</strong>
            </span>
            <span>
              ARV: <strong style={{ color: G.green }}>{formatMoney(deal.arv)}</strong>
            </span>
            <span>
              Offer: <strong style={{ color: G.text }}>{formatMoney(deal.offerPrice)}</strong>
            </span>
            <span>
              Profit: <strong style={{ color: G.green }}>{formatMoney(deal.netProfit)}</strong>
            </span>
            <span>Updated: {deal.updatedAt ? formatRelativeTime(deal.updatedAt) : "N/A"}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
