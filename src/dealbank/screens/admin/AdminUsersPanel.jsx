import { useMemo, useState } from "react";
import DataSearchBar from "../../components/DataSearchBar";
import { formatRelativeTime, formatShortDate, userStatusColor, userTypeColor } from "../../core/adminDashboardFormat";

export default function AdminUsersPanel({
  G,
  card,
  btnO,
  isMobile,
  totalUsers,
  users,
  loading,
  error,
  onReload,
}) {
  const [userSearch, setUserSearch] = useState("");

  const filteredUsers = useMemo(() => {
    const query = userSearch.trim().toLowerCase();
    if (!query) return users;

    return users.filter((row) => {
      const searchable = [
        row.name,
        row.email,
        row.type,
        row.isActive ? "active" : "inactive",
        row.joinedAt,
        row.lastLogin,
      ].join(" ").toLowerCase();

      return searchable.includes(query);
    });
  }, [users, userSearch]);

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: isMobile ? "flex-start" : "center",
          flexWrap: "wrap",
          gap: 8,
          marginBottom: 12,
        }}
      >
        <div style={{ fontFamily: G.serif, fontSize: isMobile ? 18 : 20, color: G.text }}>User Management</div>
        <div style={{ fontSize: 10, color: G.muted }}>{totalUsers} total users</div>
      </div>

      <DataSearchBar
        G={G}
        value={userSearch}
        onChange={setUserSearch}
        placeholder="Search by name, email, type, or status"
        resultCount={filteredUsers.length}
        totalCount={users.length}
      />

      <div style={{ ...card }}>
        {error && (
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 9, color: G.red, marginBottom: 8 }}>{error}</div>
            <button onClick={onReload} style={{ ...btnO, padding: "4px 10px", fontSize: 8 }}>
              Retry
            </button>
          </div>
        )}

        {!error && loading && users.length === 0 && (
          <div style={{ fontSize: 9, color: G.muted }}>Loading users from public.users...</div>
        )}

        {!error && !loading && users.length === 0 && (
          <div style={{ fontSize: 9, color: G.muted }}>No users found in public.users.</div>
        )}

        {!error && !loading && users.length > 0 && filteredUsers.length === 0 && (
          <div style={{ fontSize: 9, color: G.muted }}>No users match your search.</div>
        )}

        {!isMobile && filteredUsers.length > 0 && (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr",
                padding: "8px 12px",
                background: G.surface,
                borderRadius: "4px 4px 0 0",
                borderBottom: `1px solid ${G.border}`,
                marginBottom: 0,
              }}
            >
              {["NAME / EMAIL", "TYPE", "STATUS", "JOINED", "LAST LOGIN"].map((header) => (
                <div key={header} style={{ fontSize: 8, color: G.muted, letterSpacing: 2 }}>
                  {header}
                </div>
              ))}
            </div>

            {filteredUsers.map((row) => (
              <div
                key={row.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr",
                  padding: "10px 12px",
                  borderBottom: `1px solid ${G.faint}`,
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontSize: 11, color: G.text }}>{row.name}</div>
                  <div style={{ fontSize: 9, color: G.muted }}>{row.email}</div>
                </div>
                <div style={{ fontSize: 9, color: userTypeColor(row.type, G), textTransform: "capitalize" }}>{row.type}</div>
                <div style={{ fontSize: 9, color: userStatusColor(row.isActive, G) }}>{row.isActive ? "Active" : "Inactive"}</div>
                <div style={{ fontSize: 9, color: G.muted }}>{formatShortDate(row.joinedAt)}</div>
                <div style={{ fontSize: 9, color: G.muted }}>{row.lastLogin ? formatRelativeTime(row.lastLogin) : "Never"}</div>
              </div>
            ))}
          </>
        )}

        {isMobile && filteredUsers.length > 0 && (
          <div>
            {filteredUsers.map((row) => (
              <div
                key={row.id}
                style={{
                  background: G.surface,
                  border: `1px solid ${G.border}`,
                  borderRadius: 6,
                  padding: "10px",
                  marginBottom: 8,
                }}
              >
                <div style={{ fontFamily: G.serif, fontSize: 13, color: G.text, marginBottom: 2 }}>{row.name}</div>
                <div style={{ fontSize: 9, color: G.muted, marginBottom: 8 }}>{row.email}</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                  <div style={{ fontSize: 9, color: G.muted }}>
                    Type: <span style={{ color: userTypeColor(row.type, G), textTransform: "capitalize" }}>{row.type}</span>
                  </div>
                  <div style={{ fontSize: 9, color: G.muted }}>
                    Status: <span style={{ color: userStatusColor(row.isActive, G) }}>{row.isActive ? "Active" : "Inactive"}</span>
                  </div>
                  <div style={{ fontSize: 9, color: G.muted }}>Joined: {formatShortDate(row.joinedAt)}</div>
                  <div style={{ fontSize: 9, color: G.muted }}>
                    Last login: {row.lastLogin ? formatRelativeTime(row.lastLogin) : "Never"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
