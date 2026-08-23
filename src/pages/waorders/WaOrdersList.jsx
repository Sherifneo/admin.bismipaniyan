import { useEffect, useState } from "react";
import { waOrdersApi } from "../../api/admin";
import { ApiError } from "../../api/client";
import StatusBadge from "../../components/StatusBadge";
import Pagination from "../../components/Pagination";
import Modal from "../../components/Modal";
import { useDataTable, SearchByBar, ColumnHeader, DataTableToolbar, SelectAllHeaderCell, SelectRowCell, ColumnChooserButton } from "../../components/DataTable";
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
    { key: "customer_name", label: "Customer", accessor: (o) => o.customer_name || "" },
    { key: "customer_phone", label: "Phone", accessor: (o) => o.customer_phone || "" },
    { key: "items", label: "Items", accessor: (o) => o.items.length },
    { key: "subtotal", label: "Subtotal", accessor: (o) => o.subtotal, filter: "number" },
    {
      key: "status", label: "Status", accessor: (o) => o.status, filter: "select",
      options: STATUS_OPTIONS.map((s) => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) })),
    },
    { key: "customer_address", label: "Address", accessor: (o) => o.customer_address || "", hiddenByDefault: true },
    { key: "updated_by_name", label: "Updated by", accessor: (o) => o.updated_by_name || "", hiddenByDefault: true },
    { key: "updated_at", label: "Updated at", accessor: (o) => o.updated_at || "", filter: "dateRange", hiddenByDefault: true },
  ];
  const table = useDataTable({ rows: orders, columns, rowKey: (o) => o.wa_order_id });

  useEffect(() => {
    if (urlSearch.from || urlSearch.to) table.setFilter("created_at", { operator: "between", from: urlSearch.from || undefined, to: urlSearch.to || undefined });
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

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <DataTableToolbar table={table} filename="wa-orders" totalCount={orders.length} />
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
              {table.isColumnVisible(columns[5].key) && <ColumnHeader table={table} column={columns[5]} />}
              {table.isColumnVisible(columns[6].key) && <ColumnHeader table={table} column={columns[6]} />}
              {table.isColumnVisible(columns[7].key) && <ColumnHeader table={table} column={columns[7]} />}
              {table.isColumnVisible(columns[8].key) && <ColumnHeader table={table} column={columns[8]} />}
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={11} className="bp-table-empty">Loading…</td></tr>
            ) : table.filteredRows.length === 0 ? (
              <tr><td colSpan={11} className="bp-table-empty">No WhatsApp order attempts yet.</td></tr>
            ) : (
              table.filteredRows.map((o) => (
                <tr key={o.wa_order_id} onClick={() => setDetailOrder(o)} style={{ cursor: "pointer" }}>
                  <SelectRowCell table={table} row={o} />
                  {table.isColumnVisible("created_at") && <td className="bp-td-muted">{new Date(o.created_at).toLocaleString("en-IN")}</td>}
                  {table.isColumnVisible("customer_name") && <td className="bp-td-strong">{o.customer_name || "—"}</td>}
                  {table.isColumnVisible("customer_phone") && <td className="bp-td-muted">{o.customer_phone || "—"}</td>}
                  {table.isColumnVisible("items") && <td className="bp-td-strong">{o.items.length} item{o.items.length === 1 ? "" : "s"}</td>}
                  {table.isColumnVisible("subtotal") && <td>{inr(o.subtotal)}</td>}
                  {table.isColumnVisible("status") && <td><StatusBadge status={o.status} /></td>}
                  {table.isColumnVisible("customer_address") && <td className="bp-td-muted">{o.customer_address || "—"}</td>}
                  {table.isColumnVisible("updated_by_name") && <td className="bp-td-muted">{o.updated_by_name || "—"}</td>}
                  {table.isColumnVisible("updated_at") && <td className="bp-td-muted">{o.updated_at ? new Date(o.updated_at).toLocaleString("en-IN") : "—"}</td>}
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
          <div style={{ marginBottom: 14 }}>
            <div className="bp-td-strong">{detailOrder.customer_name || "—"}</div>
            <div className="bp-td-muted">{detailOrder.customer_phone || "—"}</div>
            {detailOrder.customer_address && <div className="bp-td-muted" style={{ marginTop: 4 }}>{detailOrder.customer_address}</div>}
          </div>
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
