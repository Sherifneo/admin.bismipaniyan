import { useEffect, useState } from "react";
import { systemUsersApi, securityApi } from "../../api/admin";
import { ApiError } from "../../api/client";

// The same permission keys the backend hardcodes in
// backend/src/routes/security.js, derived from navConfig.js's
// requiredPermission values.
const PERMISSION_KEYS = [
  { key: "cashbook.manage", label: "Cash Book" },
  { key: "inventory.manage", label: "Inventory" },
  { key: "bank.manage", label: "Banking" },
  { key: "products.manage", label: "Products" },
  { key: "partners.manage", label: "Partners & Shops" },
  { key: "purchasing.manage", label: "Purchasing" },
  { key: "production.manage", label: "Production" },
  { key: "orders.manage", label: "WhatsApp Orders" },
  { key: "sales.manage", label: "Sales Orders & Customers" },
  { key: "stores.manage", label: "Retail Stores" },
  { key: "hr.manage", label: "HR / Employees" },
  { key: "finance.manage", label: "Financial Dimensions" },
];

// Owner/super_user-only screen for granting per-key view/edit/delete
// permissions to staff. Owners implicitly have everything and never
// appear in the selector.
export default function SecurityRolesList() {
  const [staff, setStaff] = useState([]);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState("");

  useEffect(() => {
    (async () => {
      setLoadingStaff(true);
      setError("");
      try {
        const data = await systemUsersApi.list();
        setStaff((data || []).filter((a) => a.role !== "owner"));
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Could not load the team.");
      } finally {
        setLoadingStaff(false);
      }
    })();
  }, []);

  return (
    <div>
      <h1 className="bp-page-title">Security Roles</h1>
      <p className="bp-td-muted" style={{ margin: "-6px 0 14px" }}>
        Grant per-module permissions to staff and super users. Owners always have full access.
        <br />
        <strong>View</strong> — see the module only. <strong>Edit</strong> — create and edit records, cannot delete anything.{" "}
        <strong>Full control</strong> — create, edit, and delete.
      </p>

      {error && <div className="bp-inline-error">{error}</div>}

      <div className="bp-table-wrap" style={{ padding: 16, maxWidth: 320, marginBottom: 16 }}>
        <label className="bp-field-label" htmlFor="staffSelect">Staff admin</label>
        <select
          id="staffSelect"
          className="bp-field-input"
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          disabled={loadingStaff}
        >
          <option value="">{loadingStaff ? "Loading…" : "Select an admin…"}</option>
          {staff.map((a) => (
            <option key={a.admin_id} value={a.admin_id}>{a.full_name} ({a.email})</option>
          ))}
        </select>
      </div>

      {selectedId && <PermissionsPanel adminId={selectedId} />}
    </div>
  );
}

function PermissionsPanel({ adminId }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const [adminInfo, setAdminInfo] = useState(null);
  const [actions, setActions] = useState({});

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      setSuccess("");
      try {
        const data = await securityApi.getRoles(adminId);
        setAdminInfo(data);
        const map = {};
        for (const { key } of PERMISSION_KEYS) map[key] = "none";
        for (const g of data.permissions || []) map[g.permission_key] = g.action;
        setActions(map);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Could not load permissions.");
      } finally {
        setLoading(false);
      }
    })();
  }, [adminId]);

  function setAction(key, value) {
    setActions((prev) => ({ ...prev, [key]: value }));
  }

  async function save() {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const permissions = PERMISSION_KEYS.map(({ key }) => ({ permission_key: key, action: actions[key] || "none" }));
      await securityApi.updateRoles(adminId, { permissions });
      setSuccess("Permissions saved.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save permissions.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="bp-td-muted">Loading…</div>;

  return (
    <div className="bp-table-wrap" style={{ padding: 16, maxWidth: 520 }}>
      {adminInfo && (
        <h2 style={{ fontSize: 15, marginTop: 0, marginBottom: 12 }}>
          {adminInfo.full_name} <span className="bp-td-muted">({adminInfo.email})</span>
        </h2>
      )}

      {error && <div className="bp-inline-error">{error}</div>}
      {success && <div className="bp-inline-success">{success}</div>}

      <table className="bp-table">
        <thead>
          <tr>
            <th>Module</th>
            <th>Access</th>
          </tr>
        </thead>
        <tbody>
          {PERMISSION_KEYS.map(({ key, label }) => (
            <tr key={key}>
              <td className="bp-td-strong">{label}</td>
              <td>
                <select
                  className="bp-field-input"
                  style={{ width: "auto" }}
                  value={actions[key] || "none"}
                  onChange={(e) => setAction(key, e.target.value)}
                >
                  <option value="none">None</option>
                  <option value="view">View</option>
                  <option value="edit">Edit</option>
                  <option value="full_control">Full control</option>
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="bp-form-actions">
        <button type="button" className="bp-btn-primary" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}
