import { useEffect, useState } from "react";
import { teamApi } from "../../api/admin";
import { ApiError } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import Modal from "../../components/Modal";
import StatusBadge from "../../components/StatusBadge";
import { useDataTable, SearchByBar, ColumnHeader, DataTableToolbar, SelectAllHeaderCell, SelectRowCell } from "../../components/DataTable";
import { useUrlSearch } from "../../hooks/useUrlSearch";

const ROLE_LABELS = {
  owner: "Owner",
  super_user: "Super User",
  staff: "Staff",
};

// Owner-only screen (see navConfig's ownerOnly flag) for managing the
// admin roster. No delete — suspending via status is the deactivation
// mechanism (admin_id is referenced by lots of recorded_by/created_by
// columns elsewhere, so soft-delete avoids FK issues).
export default function TeamList() {
  const { admin: me } = useAuth();
  const urlSearch = useUrlSearch();
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editAdmin, setEditAdmin] = useState(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await teamApi.list();
      setAdmins(data || []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load the team.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onSaved() {
    setShowAdd(false);
    setEditAdmin(null);
    await load();
  }

  const columns = [
    { key: "full_name", label: "Name", accessor: (a) => a.full_name },
    { key: "email", label: "Email", accessor: (a) => a.email },
    {
      key: "role", label: "Role", accessor: (a) => a.role, filter: "select",
      options: Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label })),
    },
    {
      key: "status", label: "Status", accessor: (a) => a.status, filter: "select",
      options: [{ value: "active", label: "Active" }, { value: "suspended", label: "Suspended" }],
    },
  ];
  const table = useDataTable({ rows: admins, columns, rowKey: (a) => a.admin_id });

  useEffect(() => {
    if (urlSearch.q) table.setFilter("full_name", urlSearch.q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 10 }}>
        <h1 className="bp-page-title">Team</h1>
        <button type="button" className="bp-btn-primary" onClick={() => setShowAdd(true)}>+ Add staff</button>
      </div>
      <p className="bp-td-muted" style={{ margin: "-6px 0 14px" }}>
        Admins who can sign in to this portal. Owner accounts can't be created or edited here.
      </p>

      {error && <div className="bp-inline-error">{error}</div>}

      <DataTableToolbar table={table} filename="team" totalCount={admins.length} />
      <SearchByBar table={table} columns={columns} />

      <div className="bp-table-wrap">
        <table className="bp-table">
          <thead>
            <tr>
              <SelectAllHeaderCell table={table} />
              <ColumnHeader table={table} column={columns[0]} />
              <ColumnHeader table={table} column={columns[1]} />
              <ColumnHeader table={table} column={columns[2]} />
              <ColumnHeader table={table} column={columns[3]} />
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="bp-table-empty">Loading…</td></tr>
            ) : table.filteredRows.length === 0 ? (
              <tr><td colSpan={6} className="bp-table-empty">No admins found.</td></tr>
            ) : (
              table.filteredRows.map((a) => (
                <tr key={a.admin_id}>
                  <SelectRowCell table={table} row={a} />
                  <td className="bp-td-strong">{a.full_name}</td>
                  <td className="bp-td-muted">{a.email}</td>
                  <td>{ROLE_LABELS[a.role] || a.role}</td>
                  <td><StatusBadge status={a.status} /></td>
                  <td className="bp-td-actions">
                    {a.role !== "owner" && (
                      <button type="button" className="bp-btn-sm" onClick={() => setEditAdmin(a)}>Edit</button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showAdd && <AddStaffModal canCreateSuperUser={me?.role === "owner"} onClose={() => setShowAdd(false)} onDone={onSaved} />}
      {editAdmin && <EditStaffModal admin={editAdmin} onClose={() => setEditAdmin(null)} onDone={onSaved} />}
    </div>
  );
}

function AddStaffModal({ canCreateSuperUser, onClose, onDone }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("staff");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !password) {
      setError("Full name, email, and password are required.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await teamApi.create({
        full_name: fullName.trim(),
        email: email.trim(),
        password,
        role: canCreateSuperUser ? role : "staff",
      });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create this admin.");
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Add staff" onClose={onClose}>
      <form onSubmit={submit} className="bp-form">
        {error && <div className="bp-inline-error">{error}</div>}

        <label className="bp-field-label" htmlFor="tFullName">Full name</label>
        <input id="tFullName" type="text" className="bp-field-input" value={fullName} onChange={(e) => setFullName(e.target.value)} required autoFocus />

        <label className="bp-field-label" htmlFor="tEmail">Email</label>
        <input id="tEmail" type="email" className="bp-field-input" value={email} onChange={(e) => setEmail(e.target.value)} required />

        <label className="bp-field-label" htmlFor="tPassword">Password</label>
        <input id="tPassword" type="password" className="bp-field-input" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required autoComplete="new-password" />

        {canCreateSuperUser && (
          <>
            <label className="bp-field-label" htmlFor="tRole">Role</label>
            <select id="tRole" className="bp-field-input" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="staff">Staff</option>
              <option value="super_user">Super User</option>
            </select>
          </>
        )}

        <div className="bp-form-actions">
          <button type="button" className="bp-btn-outline" onClick={onClose} disabled={submitting}>Cancel</button>
          <button type="submit" className="bp-btn-primary" disabled={submitting}>{submitting ? "Saving…" : "Add staff"}</button>
        </div>
      </form>
    </Modal>
  );
}

function EditStaffModal({ admin, onClose, onDone }) {
  const [fullName, setFullName] = useState(admin.full_name || "");
  const [status, setStatus] = useState(admin.status || "active");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!fullName.trim()) {
      setError("Full name is required.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await teamApi.update(admin.admin_id, { full_name: fullName.trim(), status });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save this admin.");
      setSubmitting(false);
    }
  }

  return (
    <Modal title={`Edit — ${admin.full_name}`} onClose={onClose}>
      <form onSubmit={submit} className="bp-form">
        {error && <div className="bp-inline-error">{error}</div>}

        <label className="bp-field-label" htmlFor="teFullName">Full name</label>
        <input id="teFullName" type="text" className="bp-field-input" value={fullName} onChange={(e) => setFullName(e.target.value)} required autoFocus />

        <label className="bp-field-label" htmlFor="teStatus">Status</label>
        <select id="teStatus" className="bp-field-input" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>

        <div className="bp-form-actions">
          <button type="button" className="bp-btn-outline" onClick={onClose} disabled={submitting}>Cancel</button>
          <button type="submit" className="bp-btn-primary" disabled={submitting}>{submitting ? "Saving…" : "Save changes"}</button>
        </div>
      </form>
    </Modal>
  );
}
