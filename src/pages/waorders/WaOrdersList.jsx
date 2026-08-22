import { useEffect, useState } from "react";
import { waOrdersApi } from "../../api/admin";
import { ApiError } from "../../api/client";
import StatusBadge from "../../components/StatusBadge";
import Pagination from "../../components/Pagination";
import Modal from "../../components/Modal";
import { useDataTable, FilterBar, DataTableToolbar, SelectAllHeaderCell, SelectRowCell } from "../../components/DataTable";
import { useUrlSearch } from "../../hooks/useUrlSearch";

const LIMIT = 20;

function inr(n) {
  return "₹" + Number(n || 0).toLocaleString("en-IN");
}

const STATUS_OPTIONS = ["new", "contacted", "confirmed", "closed"];

// Worklist of order attempts sent from the website's cart-to-WhatsApp
// flow (see website/assets/cart.js's recordWaOrder). Best-effort record
// only — the actual order confirmation happens in a WhatsApp chat outside
// this system, so this screen exists so head office doesn't lose track of
// who reached out, not to process the order itself.
export default function WaOrdersList() {
  const urlSearch = useUrlSearch();
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [detailOrder, setDetailOrder] = useState(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await waOrdersApi.list({ page, limit: LIMIT, status });
      setOrders(data.items || []);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load WhatsApp orders.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status]);

  async function changeStatus(order, newStatus) {
    await waOrdersApi.updateStatus(order.wa_order_id, newStatus);
    await load();
  }

  const columns = [
    { key: "created_at", label: "Received", accessor: (o) => o.created_at, filter: "dateRange" },
    { key: "items", label: "Items", accessor: (o) => o.items.length },
    { key: "subtotal", label: "Subtotal", accessor: (o) => o.subtotal },
    {
      key: "status", label: "Status", accessor: (o) => o.status, filter: "select",
      options: STATUS_OPTIONS.map((s) => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) })),
    },
  ];
  const table = useDataTable({ rows: orders, columns, rowKey: (o) => o.wa_order_id });

  useEffect(() => {
    if (urlSearch.from || urlSearch.to) table.setFilter("created_at", { from: urlSearch.from || undefined, to: urlSearch.to || undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <h1 className="bp-page-title">WhatsApp Orders</h1>
      <p className="bp-td-muted" style={{ margin: "-6px 0 14px" }}>
        Order attempts sent from the website's cart. Confirm the actual order in WhatsApp — this is a worklist, not a live order feed.
      </p>

      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14 }}>
        <select className="bp-field-input" style={{ width: "auto" }} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
      </div>

      {error && <div className="bp-inline-error">{error}</div>}

      <DataTableToolbar table={table} filename="wa-orders" totalCount={orders.length} />
      <FilterBar columns={columns} filters={table.filters} setFilter={table.setFilter} clearAllFilters={table.clearAllFilters} />

      <div className="bp-table-wrap">
        <table className="bp-table">
          <thead>
            <tr>
              <SelectAllHeaderCell table={table} />
              <th>Received</th>
              <th>Items</th>
              <th>Subtotal</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="bp-table-empty">Loading…</td></tr>
            ) : table.filteredRows.length === 0 ? (
              <tr><td colSpan={6} className="bp-table-empty">No WhatsApp order attempts yet.</td></tr>
            ) : (
              table.filteredRows.map((o) => (
                <tr key={o.wa_order_id} onClick={() => setDetailOrder(o)} style={{ cursor: "pointer" }}>
                  <SelectRowCell table={table} row={o} />
                  <td className="bp-td-muted">{new Date(o.created_at).toLocaleString("en-IN")}</td>
                  <td className="bp-td-strong">{o.items.length} item{o.items.length === 1 ? "" : "s"}</td>
                  <td>{inr(o.subtotal)}</td>
                  <td><StatusBadge status={o.status} /></td>
                  <td className="bp-td-actions">
                    <button type="button" className="bp-btn-sm" onClick={(e) => { e.stopPropagation(); setDetailOrder(o); }}>View</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} limit={LIMIT} total={total} onPageChange={setPage} />

      {detailOrder && (
        <Modal title="Order details" onClose={() => setDetailOrder(null)}>
          <table className="bp-table" style={{ marginBottom: 14 }}>
            <thead>
              <tr><th>Item</th><th>Qty</th><th>Price</th></tr>
            </thead>
            <tbody>
              {detailOrder.items.map((it, i) => (
                <tr key={i}>
                  <td>{it.name}</td>
                  <td>{it.qty}</td>
                  <td>{inr(it.price * it.qty)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="bp-td-strong" style={{ marginBottom: 14 }}>Subtotal: {inr(detailOrder.subtotal)}</div>

          <label className="bp-field-label" htmlFor="waStatus">Status</label>
          <select
            id="waStatus"
            className="bp-field-input"
            value={detailOrder.status}
            onChange={(e) => { changeStatus(detailOrder, e.target.value); setDetailOrder({ ...detailOrder, status: e.target.value }); }}
          >
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
        </Modal>
      )}
    </div>
  );
}
