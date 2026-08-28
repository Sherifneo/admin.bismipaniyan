import { useEffect, useState } from "react";
import { inventoryApi, locationsApi } from "../../api/admin";
import { ApiError } from "../../api/client";
import { formatQty } from "../../lib/uom";
import ExportMenu from "../../components/ExportMenu";
import Pagination from "../../components/Pagination";
import Modal from "../../components/Modal";
import ProductPicker from "../../components/ProductPicker";
import LiveSearchBox from "../../components/LiveSearchBox";
import { useDataTable, ColumnHeader, SelectAllHeaderCell, SelectRowCell, ColumnChooserButton } from "../../components/DataTable";
import { useUrlSearch } from "../../hooks/useUrlSearch";
import "./Inventory.css";

const LIMIT = 100;

function inr(n) {
  return "₹" + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

const CSV_COLUMNS = [
  { label: "Code", accessor: (r) => r.product_code },
  { label: "Product", accessor: (r) => r.name },
  { label: "SKU", accessor: (r) => r.sku },
  { label: "Location", accessor: (r) => r.location_name },
  { label: "On hand", accessor: (r) => r.stock_qty },
  { label: "Value", accessor: (r) => r.stock_value },
  { label: "Consignment stock", accessor: (r) => r.consignment_stock_qty },
];

// Stock is derived from the inventory_movements ledger, split into
// Bismi-owned stock and partner-owned consignment stock held in a Bismi
// store (Model C of the 3-way commission model) — a store's shelf is not
// one undifferentiated pool of stock.
export default function InventoryList() {
  const urlSearch = useUrlSearch();
  const [locations, setLocations] = useState([]);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalValue, setTotalValue] = useState(0);
  const [page, setPage] = useState(1);
  const [locationId, setLocationId] = useState("");
  const [q, setQ] = useState(urlSearch.q);
  const [qField, setQField] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showMovement, setShowMovement] = useState(false);

  useEffect(() => {
    locationsApi.list().then(setLocations).catch(() => {});
  }, []);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await inventoryApi.list({ page, limit: LIMIT, locationId, q, qField });
      setRows(data.items || []);
      setTotal(data.total);
      setTotalValue(data.total_value || 0);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load inventory.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, locationId, q, qField]);

  function submitSearch(value) {
    setPage(1);
    setQField("");
    setQ(value);
  }

  async function onMovementSaved() {
    setShowMovement(false);
    await load();
  }

  const columns = [
    { key: "product_code", label: "Code", accessor: (r) => r.product_code || "" },
    { key: "name", label: "Product", accessor: (r) => r.name },
    { key: "sku", label: "SKU", accessor: (r) => r.sku || "" },
    { key: "location_name", label: "Location", accessor: (r) => r.location_name },
    { key: "stock_qty", label: "On hand", accessor: (r) => r.stock_qty, filter: "number" },
    { key: "stock_value", label: "Value", accessor: (r) => r.stock_value, filter: "number" },
    { key: "consignment_stock_qty", label: "Consignment stock", accessor: (r) => r.consignment_stock_qty ?? "", filter: "number" },
  ];
  const table = useDataTable({ rows, columns, rowKey: (r) => `${r.product_id}:${r.location_id}` });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 10 }}>
        <h2 className="bp-card-title">Stock</h2>
        <div style={{ display: "flex", gap: 8 }}>
          {table.selectedRows.length > 0 && (
            <button type="button" className="bp-btn-sm bp-btn-outline" onClick={() => table.exportSelected("inventory")}>
              Export selected ({table.selectedRows.length})
            </button>
          )}
          <ExportMenu filename="inventory" rows={rows} columns={CSV_COLUMNS} />
          <button type="button" className="bp-btn-primary" onClick={() => setShowMovement(true)}>+ Record movement</button>
        </div>
      </div>

      <div className="bp-kpi-grid" style={{ marginBottom: 14 }}>
        <div className="bp-kpi-card">
          <div className="bp-kpi-label">Total inventory value (filtered)</div>
          <div className="bp-kpi-value">{inr(totalValue)}</div>
        </div>
      </div>

      <div className="bp-inventory-filters">
        <select className="bp-field-input" value={locationId} onChange={(e) => { setLocationId(e.target.value); setPage(1); }}>
          <option value="">All locations</option>
          {locations.map((l) => <option key={l.location_id} value={l.location_id}>{l.name}</option>)}
        </select>
      </div>

      <LiveSearchBox
        placeholder="Search by product code, name, or SKU…"
        initialValue={urlSearch.q}
        onSearch={submitSearch}
        fetchSuggestions={(term) => inventoryApi.list({ page: 1, limit: 8, locationId, q: term }).then((d) => d.items || [])}
        renderSuggestion={(r) => `${r.product_code ? `${r.product_code} — ` : ""}${r.name}${r.location_name ? ` (${r.location_name})` : ""}`}
      />

      {error && <div className="bp-inline-error">{error}</div>}

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <ColumnChooserButton table={table} columns={columns} />
      </div>

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
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="bp-table-empty">Loading…</td></tr>
            ) : table.filteredRows.length === 0 ? (
              <tr><td colSpan={8} className="bp-table-empty">No stock movements recorded yet.</td></tr>
            ) : (
              table.filteredRows.map((r) => {
                const isLow = r.low_stock_alert && Number(r.stock_qty) <= Number(r.low_stock_alert);
                return (
                  <tr key={`${r.product_id}:${r.location_id}`}>
                    <SelectRowCell table={table} row={r} />
                    {table.isColumnVisible("product_code") && <td className="bp-td-muted">{r.product_code || "—"}</td>}
                    {table.isColumnVisible("name") && <td className="bp-td-strong">{r.name}</td>}
                    {table.isColumnVisible("sku") && <td className="bp-td-muted">{r.sku || "—"}</td>}
                    {table.isColumnVisible("location_name") && <td>{r.location_name}</td>}
                    {table.isColumnVisible("stock_qty") && <td className={isLow ? "bp-stock-low" : ""}>{formatQty(r.stock_qty, r.uom)}</td>}
                    {table.isColumnVisible("stock_value") && <td>{inr(r.stock_value)}</td>}
                    {table.isColumnVisible("consignment_stock_qty") && (
                      <td className="bp-td-muted">
                        {Number(r.consignment_stock_qty || 0) > 0 ? formatQty(r.consignment_stock_qty, r.uom) : "—"}
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} limit={LIMIT} total={total} onPageChange={setPage} />

      {showMovement && (
        <RecordMovementModal locations={locations} onClose={() => setShowMovement(false)} onDone={onMovementSaved} />
      )}
    </div>
  );
}

// transfer_in/transfer_out are deliberately not offered here — moving
// stock between two of Bismi's own locations now always goes through the
// Transfers tab (StockTransfersList.jsx), which pairs the two movements
// under one order with a status instead of letting them be created
// separately and unpaired via this manual form.
const MOVEMENT_TYPES = [
  { value: "production_in", label: "Production received (factory)" },
  { value: "purchase_in", label: "Raw material received (factory)" },
  { value: "sale", label: "Sold (manual next-day entry)" },
  { value: "wastage", label: "Wastage / damaged / expired" },
  { value: "adjustment", label: "Manual adjustment (+/-)" },
];

function RecordMovementModal({ locations, onClose, onDone }) {
  const [productId, setProductId] = useState("");
  const [locationId, setLocationId] = useState(locations[0]?.location_id || "");
  const [movementType, setMovementType] = useState("adjustment");
  const [qty, setQty] = useState("");
  const [note, setNote] = useState("");
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10));
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isAdjustment = movementType === "adjustment";

  async function submit(e) {
    e.preventDefault();
    if (!productId) {
      setError("Search for and select a product.");
      return;
    }
    if (!locationId) {
      setError("Select a location.");
      return;
    }
    const qtyNum = Number(qty);
    if (!Number.isFinite(qtyNum) || qtyNum === 0) {
      setError("Enter a non-zero quantity.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await inventoryApi.recordMovement({
        product_id: productId,
        location_id: locationId,
        movement_type: movementType,
        qty: qtyNum,
        note: note || undefined,
        entry_date: entryDate,
      });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not record this movement.");
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Record stock movement" onClose={onClose}>
      <form onSubmit={submit} className="bp-form">
        {error && <div className="bp-inline-error">{error}</div>}

        <label className="bp-field-label" htmlFor="mvProduct">Product</label>
        <ProductPicker
          id="mvProduct"
          value={productId}
          onChange={(id) => setProductId(id)}
          placeholder="Search by code or name…"
          required
        />

        <label className="bp-field-label" htmlFor="mvLocation">Location</label>
        <select id="mvLocation" className="bp-field-input" value={locationId} onChange={(e) => setLocationId(e.target.value)} required>
          {locations.map((l) => <option key={l.location_id} value={l.location_id}>{l.name}</option>)}
        </select>

        <label className="bp-field-label" htmlFor="mvType">Movement type</label>
        <select id="mvType" className="bp-field-input" value={movementType} onChange={(e) => setMovementType(e.target.value)}>
          {MOVEMENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>

        <label className="bp-field-label" htmlFor="mvQty">
          Quantity {isAdjustment ? "(use a negative number to reduce stock)" : ""}
        </label>
        <input id="mvQty" type="number" step="0.01" className="bp-field-input" value={qty} onChange={(e) => setQty(e.target.value)} required />

        <label className="bp-field-label" htmlFor="mvDate">Date</label>
        <input id="mvDate" type="date" className="bp-field-input" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} required />

        <label className="bp-field-label" htmlFor="mvNote">Note (optional)</label>
        <input id="mvNote" type="text" className="bp-field-input" value={note} onChange={(e) => setNote(e.target.value)} />

        <div className="bp-form-actions">
          <button type="button" className="bp-btn-outline" onClick={onClose} disabled={submitting}>Cancel</button>
          <button type="submit" className="bp-btn-primary" disabled={submitting}>{submitting ? "Saving…" : "Record movement"}</button>
        </div>
      </form>
    </Modal>
  );
}
