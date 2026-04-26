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
  onUpdateDeal,
  onDeleteDeal,
  onCreateDeal,
}) {
  const [dealSearch, setDealSearch] = useState("");
  const [editingDeal, setEditingDeal] = useState(null);
  const [creatingDeal, setCreatingDeal] = useState(false);
  const [deletingDeal, setDeletingDeal] = useState(null);
  const [newDeal, setNewDeal] = useState({ address: "", stage: "Lead", arv: 0, offerPrice: 0, userId: "" });
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");

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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontFamily: G.serif, fontSize: isMobile ? 18 : 20, color: G.text }}>
          All Deals - Platform Wide ({dealsTotal} total · {dealsClosed} closed)
        </div>
        <button
          onClick={() => setCreatingDeal(true)}
          style={{ ...btnO, padding: "5px 12px", fontSize: 9, borderColor: G.green, color: G.green, background: G.greenGlow }}
        >
          + Create Deal
        </button>
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

          <div style={{ display: "flex", gap: 8, marginTop: 10, paddingTop: 10, borderTop: `1px solid ${G.faint}` }}>
            <button
              onClick={() => setEditingDeal({ ...deal })}
              style={{ ...btnO, flex: 1, padding: "5px", fontSize: 8 }}
            >
              Edit Deal
            </button>
            <button
              onClick={() => setDeletingDeal(deal)}
              style={{ ...btnO, flex: 1, padding: "5px", fontSize: 8, borderColor: `${G.red}44`, color: G.red }}
            >
              Delete
            </button>
          </div>
        </div>
      ))}

      {editingDeal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
          <div style={{ ...card, maxWidth: 400, width: "100%", background: G.surface }}>
            <div style={{ fontFamily: G.serif, fontSize: 18, marginBottom: 4 }}>Edit Deal</div>
            <div style={{ fontSize: 10, color: G.muted, marginBottom: 16 }}>ID: {editingDeal.id}</div>

            {actionError && <div style={{ fontSize: 10, color: G.red, marginBottom: 12 }}>{actionError}</div>}

            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 9, color: G.muted, marginBottom: 4, letterSpacing: 1 }}>PROPERTY ADDRESS</div>
              <input
                value={editingDeal.address}
                onChange={(e) => setEditingDeal({ ...editingDeal, address: e.target.value })}
                style={{ width: "100%", background: "transparent", border: `1px solid ${G.border}`, borderRadius: 4, color: G.text, padding: "8px", fontSize: 11, boxSizing: "border-box" }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 9, color: G.muted, marginBottom: 4, letterSpacing: 1 }}>DEAL STAGE</div>
              <select
                value={editingDeal.stage}
                onChange={(e) => setEditingDeal({ ...editingDeal, stage: e.target.value })}
                style={{ width: "100%", background: G.surface, border: `1px solid ${G.border}`, borderRadius: 4, color: G.text, padding: "8px", fontSize: 11, boxSizing: "border-box" }}
              >
                <option value="Lead">Lead</option>
                <option value="Underwriting">Underwriting</option>
                <option value="Offering">Offering</option>
                <option value="Under Contract">Under Contract</option>
                <option value="Closed">Closed</option>
                <option value="Archived">Archived</option>
              </select>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                disabled={busy}
                onClick={() => setEditingDeal(null)}
                style={{ ...btnO, flex: 1, padding: "8px", fontSize: 10 }}
              >
                Cancel
              </button>
              <button
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  setActionError("");
                  try {
                    await onUpdateDeal(editingDeal.id, {
                      address: editingDeal.address,
                      stage: editingDeal.stage,
                    });
                    setEditingDeal(null);
                  } catch (err) {
                    setActionError(err.message || "Failed to update deal");
                  } finally {
                    setBusy(false);
                  }
                }}
                style={{ ...btnO, flex: 1, padding: "8px", fontSize: 10, borderColor: G.green, color: G.green, background: G.greenGlow }}
              >
                {busy ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deletingDeal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
          <div style={{ ...card, maxWidth: 350, width: "100%", background: G.surface, textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
            <div style={{ fontFamily: G.serif, fontSize: 18, marginBottom: 8 }}>Delete Deal?</div>
            <div style={{ fontSize: 11, color: G.muted, marginBottom: 20, lineHeight: 1.6 }}>
              Are you sure you want to delete the deal for <strong>{deletingDeal.address}</strong>? This action cannot be undone.
            </div>

            {actionError && <div style={{ fontSize: 10, color: G.red, marginBottom: 12 }}>{actionError}</div>}

            <div style={{ display: "flex", gap: 10 }}>
              <button
                disabled={busy}
                onClick={() => setDeletingDeal(null)}
                style={{ ...btnO, flex: 1, padding: "8px", fontSize: 10 }}
              >
                Cancel
              </button>
              <button
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  setActionError("");
                  try {
                    await onDeleteDeal(deletingDeal.id);
                    setDeletingDeal(null);
                  } catch (err) {
                    setActionError(err.message || "Failed to delete deal");
                  } finally {
                    setBusy(false);
                  }
                }}
                style={{ ...btnO, flex: 1, padding: "8px", fontSize: 10, borderColor: G.red, color: G.red, background: `${G.red}11` }}
              >
                {busy ? "Deleting..." : "Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
      {creatingDeal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
          <div style={{ ...card, maxWidth: 400, width: "100%", background: G.surface }}>
            <div style={{ fontFamily: G.serif, fontSize: 18, marginBottom: 16 }}>Create New Deal</div>

            {actionError && <div style={{ fontSize: 10, color: G.red, marginBottom: 12 }}>{actionError}</div>}

            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 9, color: G.muted, marginBottom: 4, letterSpacing: 1 }}>PROPERTY ADDRESS</div>
              <input
                value={newDeal.address}
                onChange={(e) => setNewDeal({ ...newDeal, address: e.target.value })}
                placeholder="123 Main St, City, ST"
                style={{ width: "100%", background: "transparent", border: `1px solid ${G.border}`, borderRadius: 4, color: G.text, padding: "8px", fontSize: 11, boxSizing: "border-box" }}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 9, color: G.muted, marginBottom: 4, letterSpacing: 1 }}>ARV ($)</div>
                <input
                  type="number"
                  value={newDeal.arv}
                  onChange={(e) => setNewDeal({ ...newDeal, arv: Number(e.target.value) })}
                  style={{ width: "100%", background: "transparent", border: `1px solid ${G.border}`, borderRadius: 4, color: G.text, padding: "8px", fontSize: 11, boxSizing: "border-box" }}
                />
              </div>
              <div>
                <div style={{ fontSize: 9, color: G.muted, marginBottom: 4, letterSpacing: 1 }}>OFFER PRICE ($)</div>
                <input
                  type="number"
                  value={newDeal.offerPrice}
                  onChange={(e) => setNewDeal({ ...newDeal, offerPrice: Number(e.target.value) })}
                  style={{ width: "100%", background: "transparent", border: `1px solid ${G.border}`, borderRadius: 4, color: G.text, padding: "8px", fontSize: 11, boxSizing: "border-box" }}
                />
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 9, color: G.muted, marginBottom: 4, letterSpacing: 1 }}>DEAL STAGE</div>
              <select
                value={newDeal.stage}
                onChange={(e) => setNewDeal({ ...newDeal, stage: e.target.value })}
                style={{ width: "100%", background: G.surface, border: `1px solid ${G.border}`, borderRadius: 4, color: G.text, padding: "8px", fontSize: 11, boxSizing: "border-box" }}
              >
                <option value="Lead">Lead</option>
                <option value="Underwriting">Underwriting</option>
                <option value="Offering">Offering</option>
                <option value="Under Contract">Under Contract</option>
                <option value="Closed">Closed</option>
              </select>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                disabled={busy}
                onClick={() => setCreatingDeal(false)}
                style={{ ...btnO, flex: 1, padding: "8px", fontSize: 10 }}
              >
                Cancel
              </button>
              <button
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  setActionError("");
                  try {
                    await onCreateDeal(newDeal);
                    setCreatingDeal(false);
                    setNewDeal({ address: "", stage: "Lead", arv: 0, offerPrice: 0, userId: "" });
                  } catch (err) {
                    setActionError(err.message || "Failed to create deal");
                  } finally {
                    setBusy(false);
                  }
                }}
                style={{ ...btnO, flex: 1, padding: "8px", fontSize: 10, borderColor: G.green, color: G.green, background: G.greenGlow }}
              >
                {busy ? "Creating..." : "Create Deal"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
