import { useEffect, useState } from "react";
import Modal from "./Modal";
import { ApiError } from "../api/client";
import { formatDateTime } from "../utils/date";

const FIELD_LABELS = {
  name: "Name",
  cost_price: "Cost price",
  selling_price: "Selling price",
  full_name: "Name",
  monthly_salary: "Monthly salary",
  role_designation: "Position",
  location_id: "Location",
  is_active: "Active",
};

function formatValue(v) {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  return String(v);
}

// Read-only change history for a single entity (product or employee),
// backed by the generic admin_audit_log table — same shape already used
// for System Users' employee_link_changed logging.
export default function EntityHistoryModal({ title, entityId, fetchFn, onClose }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    fetchFn(entityId)
      .then((data) => setItems(data.items || []))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load history."))
      .finally(() => setLoading(false));
  }, [entityId, fetchFn]);

  return (
    <Modal title={title} onClose={onClose}>
      {loading && <p className="bp-td-muted">Loading…</p>}
      {error && <div className="bp-inline-error">{error}</div>}
      {!loading && !error && items.length === 0 && <p className="bp-td-muted">No changes recorded yet.</p>}
      {!loading && items.length > 0 && (
        <table className="bp-table">
          <thead>
            <tr>
              <th>Field</th>
              <th>Old value</th>
              <th>New value</th>
              <th>Changed by</th>
              <th>When</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row) => {
              let meta = {};
              try {
                meta = typeof row.metadata === "string" ? JSON.parse(row.metadata) : row.metadata || {};
              } catch {
                meta = {};
              }
              return (
                <tr key={row.audit_id}>
                  <td>{FIELD_LABELS[meta.field] || meta.field || row.action}</td>
                  <td>{formatValue(meta.old_value)}</td>
                  <td>{formatValue(meta.new_value)}</td>
                  <td>{row.actor_name || "—"}</td>
                  <td>{formatDateTime(row.created_at)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </Modal>
  );
}
