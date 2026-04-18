import { activityColor, formatRelativeTime } from "../../core/adminDashboardFormat";

export default function AdminRecentActivityCard({ G, card, lbl, btnO, activity, loading, error, onReload }) {
  return (
    <div style={{ ...card }}>
      <div style={{ ...lbl, marginBottom: 10 }}>Recent Platform Activity</div>

      {error && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 9, color: G.red, marginBottom: 8 }}>{error}</div>
          <button onClick={onReload} style={{ ...btnO, padding: "4px 10px", fontSize: 8 }}>
            Retry
          </button>
        </div>
      )}

      {!error && loading && activity.length === 0 && (
        <div style={{ fontSize: 9, color: G.muted }}>Collecting live activity feed...</div>
      )}

      {!error && !loading && activity.length === 0 && (
        <div style={{ fontSize: 9, color: G.muted }}>No recent activity yet.</div>
      )}

      {!error && activity.map((item, index) => (
        <div
          key={item.id}
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 10,
            padding: "7px 0",
            borderBottom: index < activity.length - 1 ? `1px solid ${G.faint}` : "none",
          }}
        >
          <span style={{ fontSize: 10, color: activityColor(item.category, G) }}>- {item.title}</span>
          <span style={{ fontSize: 9, color: G.muted, whiteSpace: "nowrap" }}>{formatRelativeTime(item.occurredAt)}</span>
        </div>
      ))}
    </div>
  );
}
