import { useEffect, useState } from "react";
import { workflowsApi, teamApi } from "../../api/admin";
import { ApiError } from "../../api/client";
import StatusBadge from "../../components/StatusBadge";

// Every named approval point in the system (Cash Book entry approval,
// Reconciliation approval — see backend/src/db/migrations/030_workflows.sql)
// and who's assigned to approve it. Not a generic workflow builder — one
// row per existing approval step, exactly one approver each, per the
// owner's explicit requirement. Assigning nobody (or an inactive
// workflow) just falls back to the existing permission-based gate
// (cashbook.manage/finance.manage), so this is additive, not a new lock
// staff can get stuck behind by default.
export default function WorkflowsPage() {
  const [items, setItems] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [workflowsData, adminsData] = await Promise.all([workflowsApi.list(), teamApi.list()]);
      setItems(workflowsData.items || []);
      setAdmins((adminsData.items || adminsData || []).filter((a) => a.status === "active"));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load workflows.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function setApprover(workflow, approverAdminId) {
    setSaving(workflow.workflow_key);
    setError("");
    try {
      await workflowsApi.update(workflow.workflow_key, { approver_admin_id: approverAdminId || null });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update this workflow.");
    } finally {
      setSaving(null);
    }
  }

  async function toggleActive(workflow) {
    setSaving(workflow.workflow_key);
    setError("");
    try {
      await workflowsApi.update(workflow.workflow_key, { is_active: !workflow.is_active });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update this workflow.");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div>
      <h1 className="bp-page-title">Workflow</h1>
      <p className="bp-td-muted" style={{ margin: "-6px 0 14px" }}>
        Every approval step in the system and who's assigned to approve it. Each workflow has exactly one approver —
        the owner can always approve regardless of assignment. Leaving a workflow unassigned (or turning it off)
        falls back to the normal permission-based approval gate.
      </p>

      {error && <div className="bp-inline-error">{error}</div>}

      <div className="bp-table-wrap">
        <table className="bp-table">
          <thead>
            <tr>
              <th>Workflow</th>
              <th>Description</th>
              <th>Approver</th>
              <th>Status</th>
              <th>Last updated</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="bp-table-empty">Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={6} className="bp-table-empty">No workflows configured yet.</td></tr>
            ) : (
              items.map((w) => (
                <tr key={w.workflow_key} style={!w.is_active ? { opacity: 0.55 } : undefined}>
                  <td className="bp-td-strong">{w.label}</td>
                  <td className="bp-td-muted">{w.description || "—"}</td>
                  <td>
                    <select
                      className="bp-field-input"
                      style={{ width: "auto" }}
                      value={w.approver_admin_id || ""}
                      onChange={(e) => setApprover(w, e.target.value)}
                      disabled={saving === w.workflow_key}
                    >
                      <option value="">No one assigned (permission-based only)</option>
                      {admins.map((a) => (
                        <option key={a.admin_id} value={a.admin_id}>{a.full_name} ({a.role === "owner" ? "Owner" : a.role === "super_user" ? "Super User" : "Staff"})</option>
                      ))}
                    </select>
                  </td>
                  <td><StatusBadge status={w.is_active ? "active" : "inactive"} /></td>
                  <td className="bp-td-muted">{w.updated_at ? new Date(w.updated_at).toLocaleString("en-IN") : "—"}{w.updated_by_name ? ` — ${w.updated_by_name}` : ""}</td>
                  <td className="bp-td-actions">
                    <button type="button" className="bp-btn-sm" onClick={() => toggleActive(w)} disabled={saving === w.workflow_key}>
                      {w.is_active ? "Turn off" : "Turn on"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
