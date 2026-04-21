import { useState } from "react";
import DataSearchBar from "../../components/DataSearchBar";
import { reviewStatusColor, reviewStatusLabel } from "./realtorComplianceApi";

function asNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toCurrency(value) {
  return `$${Math.round(asNumber(value)).toLocaleString()}`;
}

function formatDate(value) {
  if (!value) return "--";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "--";
  return parsed.toLocaleDateString(undefined, { month: "short", day: "2-digit", year: "numeric" });
}

export default function CommissionCompliancePanel({
  G,
  card,
  btnG,
  closedDeals,
  reviewsByListing,
  submitBusyListingId,
  onSubmit,
}) {
  const [reviewSearch, setReviewSearch] = useState("");
  const deals = Array.isArray(closedDeals) ? closedDeals : [];
  const reviewMap = reviewsByListing instanceof Map ? reviewsByListing : new Map();

  const pendingCount = deals.filter((deal) => {
    const row = reviewMap.get(deal.id);
    return !row || String(row.status || "").toLowerCase() === "pending";
  }).length;

  const approvedCount = deals.filter((deal) => {
    const row = reviewMap.get(deal.id);
    return String(row?.status || "").toLowerCase() === "approved";
  }).length;

  const reviewQuery = reviewSearch.trim().toLowerCase();
  const filteredDeals = !reviewQuery
    ? deals
    : deals.filter((deal) => {
      const review = reviewMap.get(deal.id) || null;
      const searchable = [
        deal.address,
        deal.date,
        deal.dealMaker,
        String(deal.salePrice || ""),
        String(deal.grossCommission || ""),
        String(deal.yourNet || ""),
        review?.status || "",
        review?.compliance_note || "",
      ].join(" ").toLowerCase();

      return searchable.includes(reviewQuery);
    });

  return (
    <div style={{ ...card }}>
      <div style={{ fontSize: 9, color: G.blue, letterSpacing: 3, marginBottom: 4 }}>RESPA COMPLIANCE REVIEW</div>
      <div style={{ fontSize: 10, color: G.muted, lineHeight: 1.7, marginBottom: 10 }}>
        Every referral commission split can be submitted for compliance review. Review status is attached to each closed listing for audit traceability.
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 8, marginBottom: 10 }}>
        {[
          { label: "Closed Deals", value: deals.length, color: G.text },
          { label: "Pending Review", value: pendingCount, color: G.gold },
          { label: "Approved", value: approvedCount, color: G.green },
        ].map((item) => (
          <div key={item.label} style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 6, padding: "8px 10px", textAlign: "center" }}>
            <div style={{ fontSize: 7, color: G.muted, letterSpacing: 2, marginBottom: 2 }}>{item.label.toUpperCase()}</div>
            <div style={{ fontFamily: G.serif, fontSize: 15, color: item.color, fontWeight: "bold" }}>{item.value}</div>
          </div>
        ))}
      </div>

      <DataSearchBar
        G={G}
        value={reviewSearch}
        onChange={setReviewSearch}
        placeholder="Search compliance by address, deal maker, status, note, or amount"
        resultCount={filteredDeals.length}
        totalCount={deals.length}
      />

      {deals.length === 0 && (
        <div style={{ fontSize: 10, color: G.muted }}>
          Close your first referral transaction to submit compliance documentation.
        </div>
      )}

      {deals.length > 0 && filteredDeals.length === 0 && (
        <div style={{ fontSize: 10, color: G.muted }}>
          No compliance rows match your search.
        </div>
      )}

      {filteredDeals.map((deal) => {
        const review = reviewMap.get(deal.id) || null;
        const statusColor = reviewStatusColor(review?.status, G);
        const statusLabel = reviewStatusLabel(review?.status);
        const isPending = String(review?.status || "").toLowerCase() === "pending" || !review;
        const isSubmitting = submitBusyListingId === deal.id;

        return (
          <div key={deal.id} style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 6, padding: "10px", marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start", marginBottom: 6, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontFamily: G.serif, fontSize: 12, color: G.text, marginBottom: 2 }}>{deal.address}</div>
                <div style={{ fontSize: 9, color: G.muted }}>Closed {deal.date} · Gross {toCurrency(deal.grossCommission)} · Net {toCurrency(deal.yourNet)}</div>
              </div>
              <div style={{ fontSize: 8, color: statusColor, border: `1px solid ${statusColor}44`, background: `${statusColor}22`, borderRadius: 3, padding: "2px 8px", letterSpacing: 1 }}>
                {statusLabel}
              </div>
            </div>

            {review?.reviewed_at && (
              <div style={{ fontSize: 9, color: G.muted, marginBottom: 6 }}>
                Reviewed on {formatDate(review.reviewed_at)}
              </div>
            )}

            {review?.compliance_note && (
              <div style={{ fontSize: 9, color: G.gold, marginBottom: 6, lineHeight: 1.6 }}>
                Note: {review.compliance_note}
              </div>
            )}

            <button
              onClick={() => onSubmit?.(deal.id)}
              disabled={isSubmitting}
              style={{
                ...btnG,
                width: "100%",
                fontSize: 9,
                padding: "7px 10px",
                opacity: isSubmitting ? 0.7 : 1,
                cursor: isSubmitting ? "not-allowed" : "pointer",
                background: isPending ? btnG.background : "#113217",
              }}
            >
              {isSubmitting
                ? "Submitting..."
                : isPending
                  ? "Submit Compliance Review"
                  : "Resubmit Compliance Review"}
            </button>
          </div>
        );
      })}
    </div>
  );
}
