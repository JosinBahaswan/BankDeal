import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import useIsMobile from "../../core/useIsMobile";

const CONTRACTOR_PHOTOS_BUCKET = String(import.meta.env.VITE_CONTRACTOR_PHOTOS_BUCKET || "contractor-photos").trim();

function rateLabel(rateType, rateAmount) {
  if (!rateAmount) return "Rate not listed";
  if (rateType === "project") return `$${Number(rateAmount).toLocaleString()}/project`;
  if (rateType === "both") return `$${Number(rateAmount).toLocaleString()}+/hr or project`;
  return `$${Number(rateAmount).toLocaleString()}/hr`;
}

export default function ContractorsTab({ ctx }) {
  const { G, card, btnG, user } = ctx;
  const isMobile = useIsMobile(820);
  const [contractors, setContractors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadContractors() {
      if (!user?.id) {
        if (!active) return;
        setContractors([]);
        setError("Sign in to browse contractor network.");
        return;
      }

      setLoading(true);
      setError("");

      const { data: profileRows, error: profileError } = await supabase
        .from("contractor_profiles")
        .select("id, user_id, city, rate_type, rate_amount, bio, verified_badge, rating, total_jobs, photo_path")
        .order("verified_badge", { ascending: false })
        .order("rating", { ascending: false, nullsFirst: false })
        .limit(50);

      if (!active) return;

      if (profileError) {
        setLoading(false);
        setContractors([]);
        setError(`Unable to load contractors: ${profileError.message}`);
        return;
      }

      const profileIds = (profileRows || []).map((row) => row.id);
      let tradeRows = [];

      if (profileIds.length > 0) {
        const { data, error: tradesError } = await supabase
          .from("contractor_trades")
          .select("contractor_id, trade")
          .in("contractor_id", profileIds);

        if (!active) return;
        if (tradesError) {
          setLoading(false);
          setContractors([]);
          setError(`Unable to load contractor trades: ${tradesError.message}`);
          return;
        }

        tradeRows = data || [];
      }

      const tradesByContractor = tradeRows.reduce((acc, row) => {
        if (!acc[row.contractor_id]) acc[row.contractor_id] = [];
        acc[row.contractor_id].push(row.trade);
        return acc;
      }, {});

      const uniquePhotoPaths = [...new Set((profileRows || []).map((row) => row.photo_path).filter(Boolean))];
      const nextAvatarMap = {};

      if (CONTRACTOR_PHOTOS_BUCKET && uniquePhotoPaths.length > 0) {
        const signedRows = await Promise.all(uniquePhotoPaths.map(async (path) => {
          const { data, error: signedError } = await supabase
            .storage
            .from(CONTRACTOR_PHOTOS_BUCKET)
            .createSignedUrl(path, 60 * 60);

          if (signedError) return [path, ""];
          return [path, String(data?.signedUrl || "")];
        }));

        signedRows.forEach(([path, signedUrl]) => {
          if (!path || !signedUrl) return;
          nextAvatarMap[path] = signedUrl;
        });
      }

      const mapped = (profileRows || []).map((row, index) => {
        const isSelf = row.user_id === user.id;
        const name = isSelf ? (user.name || "You") : `Contractor ${String(row.id || index).slice(0, 6).toUpperCase()}`;
        const trades = tradesByContractor[row.id] || [];
        const initials = String(name)
          .split(" ")
          .map((part) => part[0])
          .join("")
          .slice(0, 2)
          .toUpperCase();

        return {
          id: row.id,
          avatar: initials || "CT",
          avatarUrl: row.photo_path ? (nextAvatarMap[row.photo_path] || "") : "",
          name,
          verified: Boolean(row.verified_badge),
          trade: trades.length > 0 ? trades.join(", ") : "General Contractor",
          location: row.city || "California",
          rating: Number(row.rating || 0).toFixed(1),
          jobs: Number(row.total_jobs || 0),
          rate: rateLabel(row.rate_type, row.rate_amount),
          bio: row.bio || "No bio added yet.",
        };
      });

      setContractors(mapped);
      setLoading(false);
    }

    loadContractors();

    return () => {
      active = false;
    };
  }, [user?.id, user?.name]);

  return (
    <div>
      <div style={{ fontFamily: G.serif, fontSize: 18, color: G.text, marginBottom: 14 }}>Local Contractor Network</div>
      {error && <div style={{ ...card, marginBottom: 10, borderColor: `${G.red}55`, color: G.red, fontSize: 10 }}>{error}</div>}
      {loading && <div style={{ ...card, marginBottom: 10, fontSize: 10, color: G.muted }}>Loading contractor profiles...</div>}

      {!loading && contractors.length === 0 && !error && (
        <div style={{ ...card, marginBottom: 10, fontSize: 10, color: G.muted }}>No contractor profiles are available yet.</div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
        {contractors.map((contractor) => (
          <div key={contractor.id} style={{ ...card }}>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 8 }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: G.greenGlow, border: `1px solid ${G.green}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: G.green, fontWeight: "bold", flexShrink: 0, overflow: "hidden" }}>
                {contractor.avatarUrl
                  ? <img src={contractor.avatarUrl} alt={contractor.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : contractor.avatar}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 2 }}>
                  <div style={{ fontFamily: G.serif, fontSize: 13, color: G.text, fontWeight: "bold" }}>{contractor.name}</div>
                  {contractor.verified && <div style={{ fontSize: 7, color: G.green, background: G.greenGlow, border: `1px solid ${G.green}44`, borderRadius: 3, padding: "1px 4px", letterSpacing: 1 }}>✓ VERIFIED</div>}
                </div>
                <div style={{ fontSize: 9, color: G.gold }}>{contractor.trade}</div>
                <div style={{ fontSize: 9, color: G.muted }}>{contractor.location} · ★ {contractor.rating} · {contractor.jobs} jobs · {contractor.rate}</div>
              </div>
            </div>
            <div style={{ fontSize: 10, color: G.muted, lineHeight: 1.6, marginBottom: 8 }}>{contractor.bio}</div>
            <button
              onClick={() => window.alert(`Quote request sent to ${contractor.name}\nTrade: ${contractor.trade}\nRate: ${contractor.rate}`)}
              style={{ ...btnG, width: "100%", fontSize: 9, padding: "8px" }}
            >
              Request Quote
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
