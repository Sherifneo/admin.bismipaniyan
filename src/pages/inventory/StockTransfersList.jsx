import { useEffect, useState } from "react";
import { stockTransfersApi, locationsApi, productsApi } from "../../api/admin";
import { ApiError } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import Modal from "../../components/Modal";
import ReasonConfirmModal from "../../components/ReasonConfirmModal";
import { useDataTable, SearchByBar, ColumnHeader, DataTableToolbar, SelectAllHeaderCell, SelectRowCell, ColumnChooserButton } from "../../components/DataTable";
import { formatDate, formatDateTime } from "../../utils/date";

// Moving Bismi's own stock between two of its own locations (Factory to
// a store, or store to store) — purely operational, never touches Cash
// Book/financial-dimension anything, since stock changing shelves within
// the same company isn't a sale or a purchase. Previously only existed
// as two disconnected raw inventory_movements rows with no order-level
// UI; this gives it the same "order with a status" shape as Purchase
// Orders/Sales Orders/Production Runs.
export default function StockTransfersList() {
  const { hasPermission } = useAuth();
  const [transfers, setTransfers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await stockTransfersApi.list({});
      setTransfers(data.items || []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load stock transfers.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    locationsApi.list().then(setLocations).catch(() => {});
    productsApi.list({}).then((data) => setProducts(data.items || data || [])).catch(() => {});
  }, []);

  async function onSaved() {
    setShowAdd(false);
    await load();
  }

  async function complete(transfer) {
    if (!window.confirm(`Complete transfer ${transfer.transfer_number}? This moves ${transfer.quantity} ${transfer.uom || ""} of ${transfer.product_name} from ${transfer.from_location_name} to ${transfer.to_location_name}.`)) return;
    setBusyId(transfer.transfer_id);
    setError("");
    try {
      await stockTransfersApi.complete(transfer.transfer_id);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not complete this transfer.");
    } finally {
      setBusyId(null);
    }
  }

  async function confirmCancel(reason) {
    setBusyId(cancelTarget.transfer_id);
    setError("");
    try {
      await stockTransfersApi.cancel(cancelTarget.transfer_id, reason);
      setCancelTarget(null);
      await load();
    } finally {
      setBusyId(null);
    }
  }

  const columns = [
    { key: "transfer_number", label: "Transfer #", accessor: (t) => t.transfer_number || "" },
    { key: "product_code", label: "Item ID", accessor: (t) => t.product_code || "" },
    { key: "product_name", label: "Product", accessor: (t) => t.product_name },
    { key: "from_location_name", label: "From", accessor: (t) => t.from_location_name },
    { key: "to_location_name", label: "To", accessor: (t) => t.to_location_name },
    { key: "quantity", label: "Quantity", accessor: (t) => t.quantity, filter: "number" },
    { key: "transfer_date", label: "Date", accessor: (t) => t.transfer_date, filter: "dateRange" },
    {
      key: "status", label: "Status", accessor: (t) => t.status, filter: "select",
      options: [{ value: "draft", label: "Draft" }, { value: "completed", label: "Completed" }, { value: "cancelled", label: "Cancelled" }],
    },
    { key: "created_by_name", label: "Created by", accessor: (t) => t.created_by_name || "", hiddenByDefault: true },
    { key: "created_at", label: "Created at", accessor: (t) => t.created_at || "", filter: "dateRange", hiddenByDefault: true },
  ];
  const table = useDataTable({ rows: transfers, columns, rowKey: (t) => t.transfer_id });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 10 }}>
        <h2 className="bp-card-title">Transfers</h2>
        <button type="button" className="bp-btn-primary" onClick={() => setShowAdd(true)}>+ New transfer</button>
      </div>
      <p className="bp-td-muted" style={{ margin: "-6px 0 14px" }}>
        Move stock between the factory and any store, or between stores. Purely inventory — never affects Cash Book.
      </p>

      {error && <div className="bp-inline-error">{error}</div>}

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <DataTableToolbar table={table} filename="stock-transfers" totalCount={transfers.length} />
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
              {table.isColumnVisible(columns[9].key) && <ColumnHeader table={table} column={columns[9]} />}
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={11} className="bp-table-empty">Loading…</td></tr>
            ) : table.filteredRows.length === 0 ? (
              <tr><td colSpan={11} className="bp-table-empty">No stock transfers found.</td></tr>
            ) : (
              table.filteredRows.map((t) => (
                <tr key={t.transfer_id}>
                  <SelectRowCell table={table} row={t} />
                  {table.isColumnVisible("transfer_number") && <td className="bp-td-muted">{t.transfer_number || "—"}</td>}
                  {table.isColumnVisible("product_code") && <td className="bp-td-muted">{t.product_code || "—"}</td>}
                  {table.isColumnVisible("product_name") && <td className="bp-td-strong">{t.product_name}</td>}
                  {table.isColumnVisible("from_location_name") && <td className="bp-td-muted">{t.from_location_name}</td>}
                  {table.isColumnVisible("to_location_name") && <td className="bp-td-muted">{t.to_location_name}</td>}
                  {table.isColumnVisible("quantity") && <td>{t.quantity} {t.uom || ""}</td>}
                  {table.isColumnVisible("transfer_date") && <td className="bp-td-muted">{formatDate(t.transfer_date)}</td>}
                  {table.isColumnVisible("status") && <td className="bp-td-muted" style={{ textTransform: "capitalize" }}>{t.status}</td>}
                  {table.isColumnVisible("created_by_name") && <td className="bp-td-muted">{t.created_by_name || "—"}</td>}
                  {table.isColumnVisible("created_at") && <td className="bp-td-muted">{formatDateTime(t.created_at) || "—"}</td>}
                  <td className="bp-td-actions">
                    {t.status === "draft" && hasPermission("inventory.manage", "edit") && (
                      <>
                        <button type="button" className="bp-btn-sm" onClick={() => complete(t)} disabled={busyId === t.transfer_id}>
                          {busyId === t.transfer_id ? "…" : "Complete"}
                        </button>
                        <button type="button" className="bp-btn-sm" onClick={() => setCancelTarget(t)} disabled={busyId === t.transfer_id}>Cancel</button>
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showAdd && <TransferModal locations={locations} products={products} onClose={() => setShowAdd(false)} onDone={onSaved} />}
      {cancelTarget && (
        <ReasonConfirmModal
          title="Cancel stock transfer"
          message={`Cancel transfer ${cancelTarget.transfer_number}?`}
          confirmLabel="Cancel transfer"
          onClose={() => setCancelTarget(null)}
          onConfirm={confirmCancel}
        />
      )}
    </div>
  );
}

function TransferModal({ locations, products, onClose, onDone }) {
  const [productId, setProductId] = useState("");
  const [fromLocationId, setFromLocationId] = useState("");
  const [toLocationId, setToLocationId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [transferDate, setTransferDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!productId || !fromLocationId || !toLocationId) {
      setError("Product, from location, and to location are required.");
      return;
    }
    if (fromLocationId === toLocationId) {
      setError("From and to locations must be different.");
      return;
    }
    const qtyNum = Number(quantity);
    if (!Number.isFinite(qtyNum) || qtyNum <= 0) {
      setError("Enter a quantity greater than zero.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await stockTransfersApi.create({
        product_id: productId,
        from_location_id: fromLocationId,
        to_location_id: toLocationId,
        quantity: qtyNum,
        transfer_date: transferDate || undefined,
        notes: notes || undefined,
      });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create this transfer.");
      setSubmitting(false);
    }
  }

  return (
    <Modal title="New stock transfer" onClose={onClose}>
      <form onSubmit={submit} className="bp-form">
        {error && <div className="bp-inline-error">{error}</div>}

        <label className="bp-field-label" htmlFor="stProduct">Product</label>
        <select id="stProduct" className="bp-field-input" value={productId} onChange={(e) => setProductId(e.target.value)} required autoFocus>
          <option value="">Select a product…</option>
          {products.map((p) => <option key={p.product_id} value={p.product_id}>{p.product_code ? `${p.product_code} — ${p.name}` : p.name}</option>)}
        </select>

        <div className="bp-form-row">
          <div style={{ flex: 1 }}>
            <label className="bp-field-label" htmlFor="stFrom">From location</label>
            <select id="stFrom" className="bp-field-input" value={fromLocationId} onChange={(e) => setFromLocationId(e.target.value)} required>
              <option value="">Select…</option>
              {locations.map((l) => <option key={l.location_id} value={l.location_id}>{l.name}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label className="bp-field-label" htmlFor="stTo">To location</label>
            <select id="stTo" className="bp-field-input" value={toLocationId} onChange={(e) => setToLocationId(e.target.value)} required>
              <option value="">Select…</option>
              {locations.map((l) => <option key={l.location_id} value={l.location_id}>{l.name}</option>)}
            </select>
          </div>
        </div>

        <div className="bp-form-row">
          <div style={{ flex: 1 }}>
            <label className="bp-field-label" htmlFor="stQty">Quantity</label>
            <input id="stQty" type="number" min="0.01" step="0.01" className="bp-field-input" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
          </div>
          <div style={{ flex: 1 }}>
            <label className="bp-field-label" htmlFor="stDate">Date</label>
            <input id="stDate" type="date" className="bp-field-input" value={transferDate} onChange={(e) => setTransferDate(e.target.value)} />
          </div>
        </div>

        <label className="bp-field-label" htmlFor="stNotes">Notes (optional)</label>
        <input id="stNotes" type="text" className="bp-field-input" value={notes} onChange={(e) => setNotes(e.target.value)} />

        <div className="bp-form-actions">
          <button type="button" className="bp-btn-outline" onClick={onClose} disabled={submitting}>Cancel</button>
          <button type="submit" className="bp-btn-primary" disabled={submitting}>{submitting ? "Saving…" : "Create transfer"}</button>
        </div>
      </form>
    </Modal>
  );
}
