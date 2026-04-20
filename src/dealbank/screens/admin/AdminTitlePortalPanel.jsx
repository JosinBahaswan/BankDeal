import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";

const TITLE_PORTAL_ADMIN_ENDPOINT = String(import.meta.env.VITE_TITLE_PORTAL_ADMIN_ENDPOINT || "/api/title-portal-admin").trim();

function asText(value, fallback = "") {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized || fallback;
}

function asBool(value, fallback = false) {
  const normalized = asText(value).toLowerCase();
  if (!normalized) return fallback;
  return ["1", "true", "yes"].includes(normalized);
}

function formatDateTime(value) {
  const text = asText(value);
  if (!text) return "-";
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString();
}

async function getAccessTokenOrThrow() {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = asText(sessionData?.session?.access_token);
  if (!accessToken) {
    throw new Error("Session expired. Please sign in again.");
  }

  return accessToken;
}

async function authedJsonFetch(path, options = {}) {
  const token = await getAccessTokenOrThrow();
  const response = await fetch(path, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.error) {
    throw new Error(asText(payload?.error, `Request failed (${response.status})`));
  }

  return payload;
}

export default function AdminTitlePortalPanel({ G, card, btnO, isMobile }) {
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [contractId, setContractId] = useState("");
  const [titleCompanyEmail, setTitleCompanyEmail] = useState("");
  const [invalidateExisting, setInvalidateExisting] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [generatedPortalUrl, setGeneratedPortalUrl] = useState("");
  const [copied, setCopied] = useState(false);

  const loadTokens = useCallback(async () => {
    if (!TITLE_PORTAL_ADMIN_ENDPOINT) {
      setError("VITE_TITLE_PORTAL_ADMIN_ENDPOINT is not configured.");
      setTokens([]);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const payload = await authedJsonFetch(`${TITLE_PORTAL_ADMIN_ENDPOINT}?limit=30`);
      setTokens(Array.isArray(payload?.tokens) ? payload.tokens : []);
    } catch (loadError) {
      setTokens([]);
      setError(loadError?.message || "Failed to load title portal tokens");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTokens();
  }, [loadTokens]);

  const activeTokenCount = useMemo(
    () => tokens.filter((row) => !asBool(row?.expired)).length,
    [tokens],
  );

  const handleCreatePortal = async (event) => {
    event.preventDefault();

    const normalizedContractId = asText(contractId);
    if (!normalizedContractId) {
      setSubmitError("Contract ID is required.");
      return;
    }

    setSubmitting(true);
    setSubmitError("");
    setGeneratedPortalUrl("");
    setCopied(false);

    try {
      const payload = await authedJsonFetch(TITLE_PORTAL_ADMIN_ENDPOINT, {
        method: "POST",
        body: {
          contractId: normalizedContractId,
          titleCompanyEmail: asText(titleCompanyEmail),
          invalidateExisting,
        },
      });

      const freshUrl = asText(payload?.portalUrl);
      if (!freshUrl) {
        throw new Error("Server did not return a portal URL");
      }

      setGeneratedPortalUrl(freshUrl);
      await loadTokens();
    } catch (createError) {
      setSubmitError(createError?.message || "Failed to generate title portal token");
    } finally {
      setSubmitting(false);
    }
  };

  const copyGeneratedUrl = async () => {
    if (!generatedPortalUrl) return;
    try {
      if (!navigator?.clipboard?.writeText) {
        throw new Error("Clipboard API unavailable");
      }
      await navigator.clipboard.writeText(generatedPortalUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  const openGeneratedUrl = () => {
    if (!generatedPortalUrl) return;
    window.open(generatedPortalUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: isMobile ? "flex-start" : "center",
          gap: 8,
          flexWrap: "wrap",
          marginBottom: 12,
        }}
      >
        <div>
          <div style={{ fontFamily: G.serif, fontSize: isMobile ? 18 : 20, color: G.text }}>Title Portal Ops</div>
          <div style={{ fontSize: 9, color: G.muted, marginTop: 2 }}>
            Generate secure title-company portal links and monitor active tokens.
          </div>
        </div>
        <div style={{ fontSize: 9, color: G.muted }}>{activeTokenCount} active token(s)</div>
      </div>

      <form onSubmit={handleCreatePortal} style={{ ...card, marginBottom: 10 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1.3fr 1fr",
            gap: 10,
            marginBottom: 10,
          }}
        >
          <div>
            <div style={{ fontSize: 9, color: G.muted, marginBottom: 4 }}>Contract ID</div>
            <input
              value={contractId}
              onChange={(event) => setContractId(event.target.value)}
              placeholder="00000000-0000-0000-0000-000000000000"
              style={{
                width: "100%",
                background: G.surface,
                border: `1px solid ${G.border}`,
                borderRadius: 6,
                color: G.text,
                padding: "9px 10px",
                fontSize: 10,
              }}
            />
          </div>

          <div>
            <div style={{ fontSize: 9, color: G.muted, marginBottom: 4 }}>Title Company Email (optional)</div>
            <input
              value={titleCompanyEmail}
              onChange={(event) => setTitleCompanyEmail(event.target.value)}
              placeholder="closings@titleco.com"
              style={{
                width: "100%",
                background: G.surface,
                border: `1px solid ${G.border}`,
                borderRadius: 6,
                color: G.text,
                padding: "9px 10px",
                fontSize: 10,
              }}
            />
          </div>
        </div>

        <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 9, color: G.muted }}>
          <input
            type="checkbox"
            checked={invalidateExisting}
            onChange={(event) => setInvalidateExisting(event.target.checked)}
          />
          Invalidate existing active tokens for the same contract/email
        </label>

        {submitError && (
          <div style={{ marginTop: 8, fontSize: 9, color: G.red }}>{submitError}</div>
        )}

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
          <button
            type="submit"
            disabled={submitting}
            style={{
              ...btnO,
              padding: "7px 12px",
              fontSize: 9,
              background: G.green,
              borderColor: `${G.green}99`,
              color: "#fff",
              opacity: submitting ? 0.8 : 1,
            }}
          >
            {submitting ? "Generating..." : "Generate Portal Link"}
          </button>
          <button type="button" onClick={loadTokens} style={{ ...btnO, padding: "7px 12px", fontSize: 9 }}>
            Refresh Token List
          </button>
        </div>

        {generatedPortalUrl && (
          <div
            style={{
              marginTop: 10,
              background: G.surface,
              border: `1px solid ${G.border}`,
              borderRadius: 7,
              padding: "10px",
            }}
          >
            <div style={{ fontSize: 9, color: G.muted, marginBottom: 6 }}>Generated portal URL</div>
            <div
              style={{
                fontSize: 9,
                color: G.text,
                wordBreak: "break-all",
                background: `${G.faint}`,
                borderRadius: 5,
                padding: "8px",
                border: `1px solid ${G.border}`,
              }}
            >
              {generatedPortalUrl}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
              <button type="button" onClick={copyGeneratedUrl} style={{ ...btnO, padding: "6px 10px", fontSize: 8 }}>
                {copied ? "Copied" : "Copy URL"}
              </button>
              <button type="button" onClick={openGeneratedUrl} style={{ ...btnO, padding: "6px 10px", fontSize: 8 }}>
                Open Portal URL
              </button>
            </div>
          </div>
        )}
      </form>

      <div style={{ ...card }}>
        <div style={{ fontSize: 10, color: G.text, marginBottom: 8 }}>Recent Title Portal Tokens</div>

        {error && (
          <div style={{ fontSize: 9, color: G.red, marginBottom: 8 }}>{error}</div>
        )}

        {!error && loading && tokens.length === 0 && (
          <div style={{ fontSize: 9, color: G.muted }}>Loading title portal token activity...</div>
        )}

        {!error && !loading && tokens.length === 0 && (
          <div style={{ fontSize: 9, color: G.muted }}>No title portal tokens found.</div>
        )}

        {tokens.map((tokenRow) => {
          const expired = asBool(tokenRow?.expired, false);
          const statusColor = expired ? G.red : G.green;

          return (
            <div
              key={tokenRow.id}
              style={{
                border: `1px solid ${G.border}`,
                borderRadius: 7,
                padding: "9px 10px",
                marginBottom: 8,
                background: G.surface,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                <div style={{ fontSize: 10, color: G.text }}>
                  {asText(tokenRow?.contract?.title, "DealBank Contract")}
                </div>
                <div
                  style={{
                    fontSize: 8,
                    color: statusColor,
                    border: `1px solid ${statusColor}66`,
                    background: `${statusColor}22`,
                    borderRadius: 999,
                    padding: "2px 8px",
                    textTransform: "uppercase",
                    letterSpacing: 1,
                  }}
                >
                  {expired ? "expired" : "active"}
                </div>
              </div>

              <div style={{ fontSize: 9, color: G.muted, display: "grid", gap: 2 }}>
                <div>Contract ID: {asText(tokenRow.contractId, "-")}</div>
                <div>Title Company: {asText(tokenRow.titleCompanyEmail, "-")}</div>
                <div>Expires: {formatDateTime(tokenRow.expiresAt)}</div>
                <div>Last Accessed: {formatDateTime(tokenRow.lastAccessedAt)}</div>
                <div>Created: {formatDateTime(tokenRow.createdAt)}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
