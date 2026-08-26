import { useEffect, useState } from "react";
import { activityLogApi } from "../../api/admin";
import { ApiError } from "../../api/client";
import Pagination from "../../components/Pagination";
import { useDataTable, SearchByBar, ColumnHeader, DataTableToolbar, SelectAllHeaderCell, SelectRowCell } from "../../components/DataTable";
import { formatDateTime } from "../../utils/date";

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

  const columns = [
    { key: "created_at", label: "When", accessor: (e) => e.created_at, filter: "dateRange" },
    { key: "actor_name", label: "Who", accessor: (e) => e.actor_name || "System" },
    { key: "action", label: "Action", accessor: (e) => e.action },
    { key: "entity", label: "Entity", accessor: (e) => `${e.entity_type} · ${e.entity_id}` },
    { key: "reason", label: "Reason", accessor: (e) => e.reason || "" },
  ];
  const table = useDataTable({ rows: items, columns, rowKey: (e) => e.audit_id });

  return (
    <div>
      <h1 className="bp-page-title">Activity Log</h1>
      <p className="bp-td-muted" style={{ margin: "-6px 0 14px" }}>
        Actions taken by admins that are logged for accountability, such as deleting a cash book entry.
      </p>

      {error && <div className="bp-inline-error">{error}</div>}

      <DataTableToolbar table={table} filename="activity-log" totalCount={items.length} />
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
              <ColumnHeader table={table} column={columns[4]} />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="bp-table-empty">Loading…</td></tr>
            ) : table.filteredRows.length === 0 ? (
              <tr><td colSpan={6} className="bp-table-empty">No activity recorded yet.</td></tr>
            ) : (
              table.filteredRows.map((entry) => (
                <tr key={entry.audit_id}>
                  <SelectRowCell table={table} row={entry} />
                  <td className="bp-td-muted">{formatDateTime(entry.created_at)}</td>
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
