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
  onUpdateUser,
  onDeleteUser,
  onCreateUser,
}) {
  const [userSearch, setUserSearch] = useState("");
  const [editingUser, setEditingUser] = useState(null);
  const [creatingUser, setCreatingUser] = useState(false);
  const [deletingUser, setDeletingUser] = useState(null);
  const [newUser, setNewUser] = useState({ name: "", email: "", type: "dealmaker", password: "Password123!" });
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");

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
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 10, color: G.muted }}>{totalUsers} total users</div>
          <button
            onClick={() => setCreatingUser(true)}
            style={{ ...btnO, padding: "5px 12px", fontSize: 9, borderColor: G.green, color: G.green, background: G.greenGlow }}
          >
            + Create User
          </button>
        </div>
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
              <div style={{ fontSize: 8, color: G.muted, letterSpacing: 2, textAlign: "right" }}>ACTIONS</div>
            </div>

            {filteredUsers.map((row) => (
              <div
                key={row.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 120px",
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
                <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                  <button
                    onClick={() => setEditingUser({ ...row })}
                    style={{ ...btnO, padding: "4px 8px", fontSize: 8, borderColor: G.border }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setDeletingUser(row)}
                    style={{ ...btnO, padding: "4px 8px", fontSize: 8, borderColor: `${G.red}44`, color: G.red }}
                  >
                    Delete
                  </button>
                </div>
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
                <div style={{ display: "flex", gap: 8, marginTop: 10, paddingTop: 10, borderTop: `1px solid ${G.faint}` }}>
                  <button
                    onClick={() => setEditingUser({ ...row })}
                    style={{ ...btnO, flex: 1, padding: "6px", fontSize: 9 }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setDeletingUser(row)}
                    style={{ ...btnO, flex: 1, padding: "6px", fontSize: 9, borderColor: `${G.red}44`, color: G.red }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {editingUser && (
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
            <div style={{ ...card, maxWidth: 400, width: "100%", background: G.surface }}>
              <div style={{ fontFamily: G.serif, fontSize: 18, marginBottom: 4 }}>Edit User</div>
              <div style={{ fontSize: 10, color: G.muted, marginBottom: 16 }}>ID: {editingUser.id}</div>

              {actionError && <div style={{ fontSize: 10, color: G.red, marginBottom: 12 }}>{actionError}</div>}

              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 9, color: G.muted, marginBottom: 4, letterSpacing: 1 }}>FULL NAME</div>
                <input
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  style={{ width: "100%", background: "transparent", border: `1px solid ${G.border}`, borderRadius: 4, color: G.text, padding: "8px", fontSize: 11, boxSizing: "border-box" }}
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 9, color: G.muted, marginBottom: 4, letterSpacing: 1 }}>EMAIL ADDRESS</div>
                <input
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  style={{ width: "100%", background: "transparent", border: `1px solid ${G.border}`, borderRadius: 4, color: G.text, padding: "8px", fontSize: 11, boxSizing: "border-box" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 9, color: G.muted, marginBottom: 4, letterSpacing: 1 }}>USER TYPE</div>
                  <select
                    value={editingUser.type}
                    onChange={(e) => setEditingUser({ ...editingUser, type: e.target.value })}
                    style={{ width: "100%", background: G.surface, border: `1px solid ${G.border}`, borderRadius: 4, color: G.text, padding: "8px", fontSize: 11, boxSizing: "border-box" }}
                  >
                    <option value="dealmaker">Dealmaker</option>
                    <option value="contractor">Contractor</option>
                    <option value="realtor">Realtor</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 9, color: G.muted, marginBottom: 4, letterSpacing: 1 }}>STATUS</div>
                  <select
                    value={editingUser.isActive ? "active" : "inactive"}
                    onChange={(e) => setEditingUser({ ...editingUser, isActive: e.target.value === "active" })}
                    style={{ width: "100%", background: G.surface, border: `1px solid ${G.border}`, borderRadius: 4, color: G.text, padding: "8px", fontSize: 11, boxSizing: "border-box" }}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  disabled={busy}
                  onClick={() => setEditingUser(null)}
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
                      await onUpdateUser(editingUser.id, {
                        name: editingUser.name,
                        email: editingUser.email,
                        type: editingUser.type,
                        is_active: editingUser.isActive,
                      });
                      setEditingUser(null);
                    } catch (err) {
                      setActionError(err.message || "Failed to update user");
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

        {deletingUser && (
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
            <div style={{ ...card, maxWidth: 350, width: "100%", background: G.surface, textAlign: "center" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
              <div style={{ fontFamily: G.serif, fontSize: 18, marginBottom: 8 }}>Delete User?</div>
              <div style={{ fontSize: 11, color: G.muted, marginBottom: 20, lineHeight: 1.6 }}>
                Are you sure you want to delete <strong>{deletingUser.name}</strong>? This action will remove their profile and cannot be undone.
              </div>

              {actionError && <div style={{ fontSize: 10, color: G.red, marginBottom: 12 }}>{actionError}</div>}

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  disabled={busy}
                  onClick={() => setDeletingUser(null)}
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
                      await onDeleteUser(deletingUser.id);
                      setDeletingUser(null);
                    } catch (err) {
                      setActionError(err.message || "Failed to delete user");
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
        {creatingUser && (
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
            <div style={{ ...card, maxWidth: 400, width: "100%", background: G.surface }}>
              <div style={{ fontFamily: G.serif, fontSize: 18, marginBottom: 16 }}>Create New User</div>

              {actionError && <div style={{ fontSize: 10, color: G.red, marginBottom: 12 }}>{actionError}</div>}

              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 9, color: G.muted, marginBottom: 4, letterSpacing: 1 }}>FULL NAME</div>
                <input
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  placeholder="e.g. John Doe"
                  style={{ width: "100%", background: "transparent", border: `1px solid ${G.border}`, borderRadius: 4, color: G.text, padding: "8px", fontSize: 11, boxSizing: "border-box" }}
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 9, color: G.muted, marginBottom: 4, letterSpacing: 1 }}>EMAIL ADDRESS</div>
                <input
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="john@example.com"
                  style={{ width: "100%", background: "transparent", border: `1px solid ${G.border}`, borderRadius: 4, color: G.text, padding: "8px", fontSize: 11, boxSizing: "border-box" }}
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 9, color: G.muted, marginBottom: 4, letterSpacing: 1 }}>INITIAL PASSWORD</div>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  style={{ width: "100%", background: "transparent", border: `1px solid ${G.border}`, borderRadius: 4, color: G.text, padding: "8px", fontSize: 11, boxSizing: "border-box" }}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 9, color: G.muted, marginBottom: 4, letterSpacing: 1 }}>USER TYPE</div>
                <select
                  value={newUser.type}
                  onChange={(e) => setNewUser({ ...newUser, type: e.target.value })}
                  style={{ width: "100%", background: G.surface, border: `1px solid ${G.border}`, borderRadius: 4, color: G.text, padding: "8px", fontSize: 11, boxSizing: "border-box" }}
                >
                  <option value="dealmaker">Dealmaker</option>
                  <option value="contractor">Contractor</option>
                  <option value="realtor">Realtor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  disabled={busy}
                  onClick={() => setCreatingUser(false)}
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
                      await onCreateUser(newUser);
                      setCreatingUser(false);
                      setNewUser({ name: "", email: "", type: "dealmaker", password: "Password123!" });
                    } catch (err) {
                      setActionError(err.message || "Failed to create user");
                    } finally {
                      setBusy(false);
                    }
                  }}
                  style={{ ...btnO, flex: 1, padding: "8px", fontSize: 10, borderColor: G.green, color: G.green, background: G.greenGlow }}
                >
                  {busy ? "Creating..." : "Create User"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
