export default function DataSearchBar({
  G,
  value,
  onChange,
  placeholder = "Search...",
  resultCount = null,
  totalCount = null,
}) {
  const hasValue = String(value || "").trim().length > 0;
  const showCount = Number.isFinite(Number(resultCount)) && Number.isFinite(Number(totalCount));

  return (
    <div style={{ marginBottom: 10 }}>
      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          background: G.surface,
          border: `1px solid ${G.border}`,
          borderRadius: 8,
          padding: "8px 10px",
        }}
      >
        <div style={{ fontSize: 10, color: G.muted, letterSpacing: 1 }}>SEARCH</div>
        <input
          value={value}
          onChange={(event) => onChange?.(event.target.value)}
          placeholder={placeholder}
          style={{
            flex: 1,
            minWidth: 0,
            background: "transparent",
            border: "none",
            outline: "none",
            color: G.text,
            fontSize: 11,
            fontFamily: G.mono,
          }}
        />
        {hasValue && (
          <button
            onClick={() => onChange?.("")}
            style={{
              border: `1px solid ${G.border}`,
              background: "transparent",
              color: G.muted,
              borderRadius: 4,
              fontSize: 8,
              padding: "3px 7px",
              cursor: "pointer",
            }}
          >
            Clear
          </button>
        )}
      </div>

      {showCount && (
        <div style={{ fontSize: 9, color: G.muted, marginTop: 5 }}>
          Showing {Number(resultCount).toLocaleString()} of {Number(totalCount).toLocaleString()}
        </div>
      )}
    </div>
  );
}
