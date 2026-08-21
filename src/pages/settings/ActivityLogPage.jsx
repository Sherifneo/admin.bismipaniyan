import { useEffect, useState } from "react";
import { activityLogApi } from "../../api/admin";
import { ApiError } from "../../api/client";
import Pagination from "../../components/Pagination";

const LIMIT = 20;

// Nav label is "System Errors" (navConfig.js) but this is the honest
// version: a read-only view of admin_audit_log — actions admins took
// that are logged for accountability (e.g. deleting a cashbook entry),
// not a system error/exception tracker. Titled "Activity Log" per the
// brief.
export default function ActivityLogPage() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      try {
        const data = await activityLogApi.list({ page, limit: LIMIT });
        setItems(data.items || []);
        setTotal(data.total || 0);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Could not load the activity log.");
      } finally {
        setLoading(false);
      }
    })();
  }, [page]);

  return (
    <div>
      <h1 className="bp-page-title">Activity Log</h1>
      <p className="bp-td-muted" style={{ margin: "-6px 0 14px" }}>
        Actions taken by admins that are logged for accountability, such as deleting a cash book entry.
      </p>

      {error && <div className="bp-inline-error">{error}</div>}

      <div className="bp-table-wrap">
        <table className="bp-table">
          <thead>
            <tr>
              <th>When</th>
              <th>Who</th>
              <th>Action</th>
              <th>Entity</th>
              <th>Reason</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="bp-table-empty">Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={5} className="bp-table-empty">No activity recorded yet.</td></tr>
            ) : (
              items.map((entry) => (
                <tr key={entry.audit_id}>
                  <td className="bp-td-muted">{new Date(entry.created_at).toLocaleString("en-IN")}</td>
                  <td>{entry.actor_name || "System"}</td>
                  <td style={{ textTransform: "capitalize" }}>{entry.action}</td>
                  <td className="bp-td-muted">{entry.entity_type} · {entry.entity_id}</td>
                  <td className="bp-td-muted">{entry.reason || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} limit={LIMIT} total={total} onPageChange={setPage} />
    </div>
  );
}
