import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { systemUsersApi, employeesApi } from "../../api/admin";
import { ApiError } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import Modal from "../../components/Modal";
import ReasonConfirmModal from "../../components/ReasonConfirmModal";
import StatusBadge from "../../components/StatusBadge";
import { useDataTable, SearchByBar, ColumnHeader, DataTableToolbar, SelectAllHeaderCell, SelectRowCell, ColumnChooserButton } from "../../components/DataTable";
import { useUrlSearch } from "../../hooks/useUrlSearch";

const ROLE_LABELS = {
  owner: "Owner",
  super_user: "Super User",
  staff: "Staff",
};

const TABS = [
  { key: "active", label: "Active" },
  { key: "removed", label: "Delete User" },
];

// Owner-only screen (see navConfig's ownerOnly flag) for managing the
// admin/login roster — renamed from "Team". No hard delete — "Remove
// User" sets status='removed' (a real soft delete, admin_id is
// referenced by lots of recorded_by/created_by columns elsewhere) and
// moves the row to the "Delete User" tab.
export default function SystemUsersList() {
  const { admin: me } = useAuth();
  const urlSearch = useUrlSearch();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "active";
  function setTab(key) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("tab", key);
      return next;
    }, { replace: true });
  }

  const [admins, setAdmins] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editAdmin, setEditAdmin] = useState(null);
  const [linkAdmin, setLinkAdmin] = useState(null);
  const [removeAdmin, setRemoveAdmin] = useState(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await systemUsersApi.list(tab === "removed" ? { status: "removed" } : {});
      setAdmins(data || []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load system users.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  useEffect(() => {
    employeesApi.list().then((d) => setEmployees(d?.items || [])).catch(() => {});
  }, []);

  async function onSaved() {
    setShowAdd(false);
    setEditAdmin(null);
    setLinkAdmin(null);
    await load();
  }

  async function confirmRemove(reason) {
    await systemUsersApi.remove(removeAdmin.admin_id);
    setRemoveAdmin(null);
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
      options: [{ value: "active", label: "Active" }, { value: "suspended", label: "Suspended" }, { value: "removed", label: "Removed" }],
    },
    { key: "employee_name", label: "Employee", accessor: (a) => a.employee_name || "" },
  ];
  const table = useDataTable({ rows: admins, columns, rowKey: (a) => a.admin_id });

  useEffect(() => {
    if (urlSearch.q) table.setFilter("full_name", { operator: "contains", value: urlSearch.q });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 10 }}>
        <h1 className="bp-page-title">System User</h1>
        {tab === "active" && (
          <button type="button" className="bp-btn-primary" onClick={() => setShowAdd(true)}>+ Add staff</button>
        )}
      </div>
      <p className="bp-td-muted" style={{ margin: "-6px 0 14px" }}>
        Admins who can sign in to this portal. Owner accounts can't be created or edited here.
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={tab === t.key ? "bp-btn-sm bp-btn-primary" : "bp-btn-sm bp-btn-outline"}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <div className="bp-inline-error">{error}</div>}

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <DataTableToolbar table={table} filename="system-users" totalCount={admins.length} />
        <ColumnChooserButton table={table} columns={columns} />
      </div>
      <SearchByBar table={table} columns={columns} />

      <div className="bp-table-wrap">
        <table className="bp-table">
          <thead>
            <tr>
              <SelectAllHeaderCell table={table} />
              {table.isColumnVisible(columns[0].key) && <ColumnHeader table={table} column={columns[0]} />}
              {table.isColumnVisible(columns[1].key) && <ColumnHeader table={table} column={columns[1]} />}
              {table.isColumnVisible(columns[2].key) && <ColumnHeader table={table} column={columns[2]} />}
              {table.isColumnVisible(columns[3].key) && <ColumnHeader table={table} column={columns[3]} />}
              {table.isColumnVisible(columns[4].key) && <ColumnHeader table={table} column={columns[4]} />}
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="bp-table-empty">Loading…</td></tr>
            ) : table.filteredRows.length === 0 ? (
              <tr><td colSpan={7} className="bp-table-empty">{tab === "removed" ? "No removed users." : "No admins found."}</td></tr>
            ) : (
              table.filteredRows.map((a) => (
                <tr key={a.admin_id}>
                  <SelectRowCell table={table} row={a} />
                  {table.isColumnVisible("full_name") && <td className="bp-td-strong">{a.full_name}</td>}
                  {table.isColumnVisible("email") && <td className="bp-td-muted">{a.email}</td>}
                  {table.isColumnVisible("role") && <td>{ROLE_LABELS[a.role] || a.role}</td>}
                  {table.isColumnVisible("status") && <td><StatusBadge status={a.status} /></td>}
                  {table.isColumnVisible("employee_name") && <td className="bp-td-muted">{a.employee_name || "—"}</td>}
                  <td className="bp-td-actions">
                    {tab === "active" && a.role !== "owner" && (
                      <>
                        <button type="button" className="bp-btn-sm" onClick={() => setEditAdmin(a)}>Edit</button>
                        <button type="button" className="bp-btn-sm" onClick={() => setLinkAdmin(a)}>Change employee</button>
                        {me?.role === "owner" && (
                          <button type="button" className="bp-btn-sm" onClick={() => setRemoveAdmin(a)}>Remove User</button>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showAdd && <AddStaffModal canCreateSuperUser={me?.role === "owner"} employees={employees} onClose={() => setShowAdd(false)} onDone={onSaved} />}
      {editAdmin && <EditStaffModal admin={editAdmin} onClose={() => setEditAdmin(null)} onDone={onSaved} />}
      {linkAdmin && <ChangeEmployeeModal admin={linkAdmin} employees={employees} onClose={() => setLinkAdmin(null)} onDone={onSaved} />}
      {removeAdmin && (
        <ReasonConfirmModal
          title={`Remove ${removeAdmin.full_name}?`}
          message="This account will no longer be able to sign in. It can be found later on the Delete User tab."
          confirmLabel="Remove User"
          onClose={() => setRemoveAdmin(null)}
          onConfirm={confirmRemove}
        />
      )}
    </div>
  );
}

function AddStaffModal({ canCreateSuperUser, employees, onClose, onDone }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("staff");
  const [employeeId, setEmployeeId] = useState("");
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
      await systemUsersApi.create({
        full_name: fullName.trim(),
        email: email.trim(),
        password,
        role: canCreateSuperUser ? role : "staff",
        employee_id: employeeId || undefined,
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

        <label className="bp-field-label" htmlFor="tEmployee">Employee (optional)</label>
        <select id="tEmployee" className="bp-field-input" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
          <option value="">Not linked to an employee</option>
          {employees.map((emp) => (
            <option key={emp.employee_id} value={emp.employee_id}>{emp.full_name}</option>
          ))}
        </select>

        <div className="bp-form-actions">
          <button type="button" className="bp-btn-outline" onClick={onClose} disabled={submitting}>Cancel</button>
          <button type="submit" className="bp-btn-primary" disabled={submitting}>{submitting ? "Saving…" : "Add staff"}</button>
        </div>
      </form>
    </Modal>
  );
}

// Full name and status only now — employee linking moved to its own
// ChangeEmployeeModal (confirm step + audit log), see below.
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
      await systemUsersApi.update(admin.admin_id, { full_name: fullName.trim(), status });
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

// Employee link gets its own dedicated action with a one-step
// confirmation before saving — the backend (system-users.js's PUT /:id)
// writes an admin_audit_log row whenever employee_id actually changes,
// visible in Settings -> Activity Log.
function ChangeEmployeeModal({ admin, employees, onClose, onDone }) {
  const [employeeId, setEmployeeId] = useState(admin.employee_id || "");
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const selected = employees.find((e) => e.employee_id === employeeId);

  async function confirm() {
    setSubmitting(true);
    setError("");
    try {
      await systemUsersApi.update(admin.admin_id, { employee_id: employeeId || null });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save this link.");
      setSubmitting(false);
      setConfirming(false);
    }
  }

  if (confirming) {
    return (
      <Modal title="Confirm employee link" onClose={() => setConfirming(false)}>
        <div className="bp-form">
          {error && <div className="bp-inline-error">{error}</div>}
          <p>
            {selected
              ? <>Link <strong>{admin.full_name}</strong> to employee <strong>{selected.full_name}</strong>?</>
              : <>Remove {admin.full_name}'s employee link?</>}
          </p>
          <div className="bp-form-actions">
            <button type="button" className="bp-btn-outline" onClick={() => setConfirming(false)} disabled={submitting}>Back</button>
            <button type="button" className="bp-btn-primary" onClick={confirm} disabled={submitting}>{submitting ? "Saving…" : "Confirm"}</button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title={`Change linked employee — ${admin.full_name}`} onClose={onClose}>
      <div className="bp-form">
        {error && <div className="bp-inline-error">{error}</div>}
        <label className="bp-field-label" htmlFor="ceEmployee">Employee</label>
        <select id="ceEmployee" className="bp-field-input" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} autoFocus>
          <option value="">Not linked to an employee</option>
          {employees.map((emp) => (
            <option key={emp.employee_id} value={emp.employee_id}>{emp.full_name}</option>
          ))}
        </select>
        <div className="bp-form-actions">
          <button type="button" className="bp-btn-outline" onClick={onClose}>Cancel</button>
          <button
            type="button"
            className="bp-btn-primary"
            onClick={() => setConfirming(true)}
            disabled={(employeeId || "") === (admin.employee_id || "")}
          >
            Continue
          </button>
        </div>
      </div>
    </Modal>
  );
}
