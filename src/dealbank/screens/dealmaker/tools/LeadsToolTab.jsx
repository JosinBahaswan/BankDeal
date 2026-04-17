import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../../lib/supabaseClient";
import { beginCheckout, getCreditPackPriceId } from "../../../core/billing";
import { LEAD_FILTERS, LEAD_LIST_TYPES } from "./toolData";

const GENERATED_FIRST_NAMES = ["Maria", "Jason", "Helen", "Ramon", "Lydia", "Noah", "Ariana", "Carlos", "Nina", "Brandon"];
const GENERATED_LAST_NAMES = ["Ortega", "Kim", "Fox", "Diaz", "Shaw", "Brooks", "Cole", "Rivera", "Tran", "Howard"];
const GENERATED_STREET_NAMES = ["Maple St", "Birchwood Dr", "Elmwood Ct", "Poplar Ave", "Vista Canyon Rd", "Oak Grove Blvd"];

function randomInt(max) {
  return Math.floor(Math.random() * max);
}

function estimateListPull(minEquityRaw) {
  const minEquity = Number(minEquityRaw || 0);
  const equityBoost = Math.max(1, Math.floor(minEquity / 50000));
  const randomBase = randomInt(120) + 60;
  const estimatedCount = Math.max(15, Math.floor(randomBase / equityBoost));
  const creditCost = Math.ceil(estimatedCount * 1.2);

  return { estimatedCount, creditCost };
}

function buildGeneratedLead(buildForm) {
  const firstName = GENERATED_FIRST_NAMES[randomInt(GENERATED_FIRST_NAMES.length)];
  const lastName = GENERATED_LAST_NAMES[randomInt(GENERATED_LAST_NAMES.length)];
  const street = GENERATED_STREET_NAMES[randomInt(GENERATED_STREET_NAMES.length)];
  const houseNo = 100 + randomInt(9800);
  const minEquity = Number(buildForm.minEquity || 50000);
  const equity = minEquity + randomInt(80000);
  const avm = equity + 180000 + randomInt(220000);

  return {
    name: `${firstName} ${lastName}`,
    address: `${houseNo} ${street}, ${buildForm.city}`,
    phone: `(9${randomInt(9)}${randomInt(10)}) 555-${String(randomInt(10000)).padStart(4, "0")}`,
    equity,
    avm,
    status: "New",
    listType: buildForm.listType,
    tags: [buildForm.propertyType, buildForm.listType],
  };
}

function statusBadge(status, G) {
  const map = {
    New: G.green,
    Contacted: "#60a5fa",
    "Follow Up": G.gold,
    "Offer Sent": "#10b981",
  };
  const color = map[status] || G.muted;
  return {
    fontSize: 7,
    color,
    background: `${color}22`,
    border: `1px solid ${color}44`,
    borderRadius: 3,
    padding: "2px 7px",
    letterSpacing: 1,
  };
}

export default function LeadsToolTab({ ctx }) {
  const { G, card, lbl, btnG, btnO, fmt, user } = ctx;

  const [credits, setCredits] = useState({ dataCredits: 0, skipTracesUsed: 132, leadsPulled: 487 });
  const [buildForm, setBuildForm] = useState({ city: "Sacramento", propertyType: "Single Family", listType: "Absentee Owner", minEquity: "50000" });
  const [pullEstimate, setPullEstimate] = useState(null);
  const [filterType, setFilterType] = useState("All");
  const [leadRows, setLeadRows] = useState([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [leadsError, setLeadsError] = useState("");
  const [billingError, setBillingError] = useState("");
  const [creditBalanceLoading, setCreditBalanceLoading] = useState(false);
  const [purchaseInFlight, setPurchaseInFlight] = useState("");
  const [savedIds, setSavedIds] = useState([]);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [dialLead, setDialLead] = useState(null);
  const [smsToast, setSmsToast] = useState("");

  const filteredLeads = useMemo(() => {
    if (filterType === "All") return leadRows;
    return leadRows.filter((lead) => lead.listType === filterType);
  }, [leadRows, filterType]);

  function mapLeadRow(row) {
    return {
      id: row.id,
      name: row.name || "Unknown Owner",
      address: row.address || "Address not provided",
      phone: row.phone || "Phone not provided",
      equity: Number(row.equity || 0),
      avm: Number(row.avm_value || 0),
      status: row.status || "New",
      listType: row.lead_type || "High Equity",
      tags: Array.isArray(row.tags) ? row.tags : [],
    };
  }

  useEffect(() => {
    let active = true;

    async function loadLeads() {
      if (!user?.id) {
        if (!active) return;
        setLeadRows([]);
        setLeadsLoading(false);
        setLeadsError("");
        return;
      }

      setLeadsLoading(true);
      setLeadsError("");

      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .eq("owner_id", user.id)
        .order("added_at", { ascending: false });

      if (!active) return;

      if (error) {
        setLeadsError(`Failed to load leads: ${error.message}`);
        setLeadRows([]);
        setLeadsLoading(false);
        return;
      }

      const mapped = (data || []).map(mapLeadRow);
      setLeadRows(mapped);
      setCredits((prev) => ({ ...prev, leadsPulled: mapped.length }));
      setLeadsLoading(false);
    }

    loadLeads();

    return () => {
      active = false;
    };
  }, [user?.id]);

  function showToast(message) {
    setSmsToast(message);
    setTimeout(() => setSmsToast(""), 1800);
  }

  useEffect(() => {
    let active = true;
    let creditsChannel;

    async function loadCreditBalance() {
      if (!user?.id) {
        if (!active) return;
        setCredits((prev) => ({ ...prev, dataCredits: 0 }));
        setCreditBalanceLoading(false);
        setBillingError("");
        return;
      }

      setCreditBalanceLoading(true);
      setBillingError("");

      const { data, error } = await supabase
        .from("credit_purchases")
        .select("credits_remaining")
        .eq("user_id", user.id);

      if (!active) return;

      if (error) {
        setBillingError(`Failed to load credit balance: ${error.message}`);
        setCreditBalanceLoading(false);
        return;
      }

      const totalRemaining = (data || []).reduce((sum, row) => sum + Number(row.credits_remaining || 0), 0);
      setCredits((prev) => ({ ...prev, dataCredits: totalRemaining }));
      setCreditBalanceLoading(false);
    }

    loadCreditBalance();

    if (user?.id) {
      creditsChannel = supabase
        .channel(`credit-purchases-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "credit_purchases",
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            loadCreditBalance();
          },
        )
        .subscribe();
    }

    return () => {
      active = false;
      if (creditsChannel) {
        supabase.removeChannel(creditsChannel);
      }
    };
  }, [user?.id]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const checkoutKind = params.get("kind");
    const checkoutStatus = params.get("checkout");

    if (checkoutKind !== "credits") return;

    if (checkoutStatus === "success") {
      showToast("Payment completed. Credits will refresh shortly.");
    }

    if (checkoutStatus === "cancel") {
      showToast("Credit pack checkout canceled.");
    }

    const cleanUrl = `${window.location.pathname}${window.location.hash || ""}`;
    window.history.replaceState({}, document.title, cleanUrl);
  }, []);

  async function saveLead(lead) {
    if (!user?.id) {
      showToast("Login required before saving leads");
      return null;
    }

    const payload = {
      owner_id: user.id,
      name: lead.name,
      phone: lead.phone,
      address: lead.address,
      equity: Number(lead.equity || 0),
      avm_value: Number(lead.avm || 0),
      status: lead.status || "New",
      lead_type: lead.listType || "High Equity",
      tags: Array.isArray(lead.tags) ? lead.tags : [],
      source: "lead_builder",
      added_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("leads")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      setLeadsError(`Failed to save lead: ${error.message}`);
      showToast("Failed to save lead");
      return null;
    }

    const mapped = mapLeadRow(data);
    setLeadRows((prev) => [mapped, ...prev]);
    return mapped;
  }

  const onPullList = async () => {
    const { estimatedCount, creditCost } = estimateListPull(buildForm.minEquity);
    setPullEstimate({ estimatedCount, creditCost });
    const generateCount = Math.min(4, Math.max(1, Math.floor(estimatedCount / 40)));

    let created = 0;

    for (let i = 0; i < generateCount; i += 1) {
      const lead = buildGeneratedLead(buildForm);

      const saved = await saveLead(lead);
      if (saved) created += 1;
    }

    if (created > 0) {
      setCredits((prev) => ({ ...prev, leadsPulled: prev.leadsPulled + created }));
      showToast(`${created} leads saved to database`);
    }
  };

  const toggleSave = (id) => {
    setSavedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const sendSms = (name) => {
    showToast(`SMS queued for ${name}`);
  };

  const callFromDialer = () => {
    if (!dialLead) return;
    showToast(`Calling ${dialLead.name}...`);
  };

  const purchaseCredits = async (pack) => {
    if (!user?.id || !user?.email) {
      showToast("Login required before purchasing credits");
      return;
    }

    const priceId = getCreditPackPriceId(pack.name);
    if (!priceId) {
      showToast("Missing Stripe price mapping for this credit pack");
      return;
    }

    setPurchaseInFlight(pack.name);
    setShowCreditModal(false);

    try {
      await beginCheckout({
        priceId,
        userId: user.id,
        email: user.email,
        mode: "payment",
        source: "leads_tool",
        successPath: "/",
      });
    } catch (error) {
      showToast(error?.message || "Unable to start checkout");
    } finally {
      setPurchaseInFlight("");
    }
  };

  return (
    <div>
      <div style={{ fontFamily: G.serif, fontSize: 18, marginBottom: 4 }}>Lead Lists</div>
      <div style={{ fontSize: 10, color: G.muted, marginBottom: 14 }}>Build targeted lists, manage credits, and action leads fast.</div>
      {leadsError && <div style={{ fontSize: 10, color: G.red, marginBottom: 10 }}>{leadsError}</div>}
      {billingError && <div style={{ fontSize: 10, color: G.red, marginBottom: 10 }}>{billingError}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 8, marginBottom: 12 }}>
        <div style={{ ...card, textAlign: "center" }}><div style={{ ...lbl, marginBottom: 3 }}>Data Credits</div><div style={{ fontFamily: G.serif, fontSize: 18, color: G.green }}>{creditBalanceLoading ? "..." : credits.dataCredits.toLocaleString()}</div></div>
        <div style={{ ...card, textAlign: "center" }}><div style={{ ...lbl, marginBottom: 3 }}>Skip Traces</div><div style={{ fontFamily: G.serif, fontSize: 18, color: G.text }}>{credits.skipTracesUsed}</div></div>
        <div style={{ ...card, textAlign: "center" }}><div style={{ ...lbl, marginBottom: 3 }}>Leads Pulled</div><div style={{ fontFamily: G.serif, fontSize: 18, color: G.text }}>{credits.leadsPulled}</div></div>
        <div style={{ ...card, textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <button onClick={() => setShowCreditModal(true)} style={{ ...btnG, fontSize: 9, padding: "8px 12px" }}>Buy Credits</button>
        </div>
      </div>

      <div style={{ ...card, marginBottom: 12 }}>
        <div style={{ fontFamily: G.serif, fontSize: 15, marginBottom: 8 }}>Build a List</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 8, marginBottom: 8 }}>
          <input value={buildForm.city} onChange={(e) => setBuildForm((p) => ({ ...p, city: e.target.value }))} placeholder="Market/City" style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 6, color: G.text, padding: "8px 10px", fontFamily: G.mono }} />
          <select value={buildForm.propertyType} onChange={(e) => setBuildForm((p) => ({ ...p, propertyType: e.target.value }))} style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 6, color: G.text, padding: "8px 10px", fontFamily: G.mono }}>
            {["Single Family", "Multi Family", "Condo", "Townhome"].map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select value={buildForm.listType} onChange={(e) => setBuildForm((p) => ({ ...p, listType: e.target.value }))} style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 6, color: G.text, padding: "8px 10px", fontFamily: G.mono }}>
            {LEAD_LIST_TYPES.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <input value={buildForm.minEquity} onChange={(e) => setBuildForm((p) => ({ ...p, minEquity: e.target.value.replace(/[^0-9]/g, "") }))} placeholder="Min Equity" style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 6, color: G.text, padding: "8px 10px", fontFamily: G.mono }} />
        </div>
        <button onClick={onPullList} style={{ ...btnG, fontSize: 9, padding: "8px 12px" }}>Pull List</button>
        {pullEstimate && (
          <div style={{ marginTop: 8, fontSize: 10, color: G.text }}>
            Estimated leads: <span style={{ color: G.green, fontWeight: "bold" }}>{pullEstimate.estimatedCount}</span> · Credit cost: <span style={{ color: G.gold, fontWeight: "bold" }}>{pullEstimate.creditCost}</span>
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
        {LEAD_FILTERS.map((item) => (
          <button
            key={item}
            onClick={() => setFilterType(item)}
            style={{
              ...btnO,
              padding: "5px 10px",
              fontSize: 8,
              borderColor: filterType === item ? G.green : G.border,
              color: filterType === item ? G.green : G.muted,
              background: filterType === item ? G.greenGlow : "transparent",
            }}
          >
            {item}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        {leadsLoading && (
          <div style={{ ...card, textAlign: "center", fontSize: 10, color: G.muted }}>
            Loading leads from database...
          </div>
        )}

        {!leadsLoading && filteredLeads.length === 0 && (
          <div style={{ ...card, textAlign: "center", padding: "16px 12px" }}>
            <div style={{ fontFamily: G.serif, fontSize: 14, marginBottom: 5 }}>No leads yet</div>
            <div style={{ fontSize: 10, color: G.muted }}>Pull a list to save leads into Supabase.</div>
          </div>
        )}

        {filteredLeads.map((lead) => (
          <div key={lead.id} style={{ ...card }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontFamily: G.serif, fontSize: 14, fontWeight: "bold" }}>{lead.name}</div>
                <div style={{ fontSize: 10, color: G.muted }}>{lead.address}</div>
                <div style={{ fontSize: 10, color: G.muted }}>{lead.phone}</div>
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "flex-start", flexWrap: "wrap" }}>
                <div style={statusBadge(lead.status, G)}>{lead.status}</div>
                <div style={statusBadge(lead.listType, G)}>{lead.listType}</div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 6, marginBottom: 8 }}>
              <div style={{ fontSize: 10, color: G.muted }}>Est. Equity: <span style={{ color: G.green, fontFamily: G.serif }}>{fmt(lead.equity)}</span></div>
              <div style={{ fontSize: 10, color: G.muted }}>AVM: <span style={{ color: G.text, fontFamily: G.serif }}>{fmt(lead.avm)}</span></div>
            </div>

            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
              {lead.tags.map((tag) => <div key={tag} style={statusBadge(tag, G)}>{tag}</div>)}
            </div>

            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button onClick={() => setDialLead(lead)} style={{ ...btnG, fontSize: 8, padding: "6px 10px" }}>Call</button>
              <button onClick={() => sendSms(lead.name)} style={{ ...btnO, fontSize: 8, padding: "6px 10px" }}>SMS</button>
              <button onClick={() => toggleSave(lead.id)} style={{ ...btnO, fontSize: 8, padding: "6px 10px", borderColor: savedIds.includes(lead.id) ? G.green : G.border, color: savedIds.includes(lead.id) ? G.green : G.muted }}>
                {savedIds.includes(lead.id) ? "Saved" : "Save"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {smsToast && <div style={{ position: "fixed", bottom: 14, right: 14, background: G.surface, border: `1px solid ${G.green}44`, borderRadius: 8, padding: "8px 12px", color: G.green, fontSize: 10 }}>{smsToast}</div>}

      {dialLead && (
        <div style={{ position: "fixed", right: 14, bottom: 14, width: 290, background: G.card, border: `1px solid ${G.green}44`, borderRadius: 8, padding: 12, zIndex: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <div style={{ fontFamily: G.serif, fontSize: 14, color: G.green }}>Dialer</div>
            <button onClick={() => setDialLead(null)} style={{ ...btnO, padding: "2px 8px", fontSize: 8 }}>Close</button>
          </div>
          <div style={{ fontSize: 10, color: G.text }}>{dialLead.name}</div>
          <div style={{ fontSize: 10, color: G.muted, marginBottom: 10 }}>{dialLead.phone}</div>
          <button onClick={callFromDialer} style={{ ...btnG, width: "100%", fontSize: 9 }}>Call {dialLead.phone}</button>
        </div>
      )}

      {showCreditModal && (
        <div style={{ position: "fixed", inset: 0, background: "#000000aa", display: "flex", alignItems: "center", justifyContent: "center", padding: 12, zIndex: 30 }}>
          <div style={{ ...card, width: "100%", maxWidth: 560 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ fontFamily: G.serif, fontSize: 16 }}>Buy Data Credits</div>
              <button onClick={() => setShowCreditModal(false)} disabled={Boolean(purchaseInFlight)} style={{ ...btnO, padding: "4px 9px", fontSize: 8, opacity: purchaseInFlight ? 0.7 : 1 }}>Close</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 8 }}>
              {[{ name: "Starter", credits: "500", price: "$49" }, { name: "Growth", credits: "2K", price: "$149", popular: true }, { name: "Pro", credits: "10K", price: "$499" }].map((pack) => (
                <div key={pack.name} style={{ background: G.surface, border: `1px solid ${pack.popular ? G.gold : G.border}`, borderRadius: 8, padding: 12 }}>
                  {pack.popular && <div style={statusBadge("Most Popular", { ...G, green: G.gold })}>Most Popular</div>}
                  <div style={{ fontFamily: G.serif, fontSize: 15, marginTop: pack.popular ? 8 : 0 }}>{pack.name}</div>
                  <div style={{ fontFamily: G.serif, fontSize: 22, color: G.green }}>{pack.credits}</div>
                  <div style={{ fontSize: 10, color: G.muted, marginBottom: 8 }}>credits</div>
                  <div style={{ fontFamily: G.serif, fontSize: 17, color: G.gold, marginBottom: 8 }}>{pack.price}</div>
                  <button
                    onClick={() => purchaseCredits(pack)}
                    disabled={Boolean(purchaseInFlight)}
                    style={{
                      ...btnG,
                      width: "100%",
                      fontSize: 8,
                      padding: "6px 8px",
                      opacity: purchaseInFlight && purchaseInFlight !== pack.name ? 0.7 : 1,
                      cursor: purchaseInFlight ? "not-allowed" : "pointer",
                    }}
                  >
                    {purchaseInFlight === pack.name ? "Redirecting..." : "Purchase"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
