import { useEffect, useState } from "react";
import { inventoryApi, locationsApi, productsApi } from "../../api/admin";
import { ApiError } from "../../api/client";
import { formatQty } from "../../lib/uom";
import ExportMenu from "../../components/ExportMenu";
import Pagination from "../../components/Pagination";
import Modal from "../../components/Modal";
import SearchBox from "../../components/SearchBox";
import "./Inventory.css";

const LIMIT = 20;

const CSV_COLUMNS = [
  { label: "Product", accessor: (r) => r.name },
  { label: "SKU", accessor: (r) => r.sku },
  { label: "Location", accessor: (r) => r.location_name },
  { label: "Bismi stock", accessor: (r) => r.stock_qty },
  { label: "Consignment stock", accessor: (r) => r.consignment_stock_qty },
];

// Stock is derived from the inventory_movements ledger, split into
// Bismi-owned stock and partner-owned consignment stock held in a Bismi
// store (Model C of the 3-way commission model) — a store's shelf is not
// one undifferentiated pool of stock.
export default function InventoryList() {
  const [locations, setLocations] = useState([]);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [locationId, setLocationId] = useState("");
  const [q, setQ] = useState("");
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
      const data = await inventoryApi.list({ page, limit: LIMIT, locationId, q });
      setRows(data.items || []);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load inventory.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, locationId, q]);

  function submitSearch(value) {
    setPage(1);
    setQ(value);
  }

  async function onMovementSaved() {
    setShowMovement(false);
    await load();
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 10 }}>
        <h1 className="bp-page-title">Inventory</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <ExportMenu filename="inventory" rows={rows} columns={CSV_COLUMNS} />
          <button type="button" className="bp-btn-primary" onClick={() => setShowMovement(true)}>+ Record movement</button>
        </div>
      </div>

      <div className="bp-inventory-filters">
        <select className="bp-field-input" value={locationId} onChange={(e) => { setLocationId(e.target.value); setPage(1); }}>
          <option value="">All locations</option>
          {locations.map((l) => <option key={l.location_id} value={l.location_id}>{l.name}</option>)}
        </select>
      </div>

      <SearchBox placeholder="Search by product name or SKU…" onSearch={submitSearch} />

      {error && <div className="bp-inline-error">{error}</div>}

      <div className="bp-table-wrap">
        <table className="bp-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>SKU</th>
              <th>Location</th>
              <th>Bismi stock</th>
              <th>Consignment stock</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="bp-table-empty">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={5} className="bp-table-empty">No stock movements recorded yet.</td></tr>
            ) : (
              rows.map((r) => {
                const isLow = r.low_stock_alert && Number(r.stock_qty) <= Number(r.low_stock_alert);
                return (
                  <tr key={`${r.product_id}:${r.location_id}`}>
                    <td className="bp-td-strong">{r.name}</td>
                    <td className="bp-td-muted">{r.sku || "—"}</td>
                    <td>{r.location_name}</td>
                    <td className={isLow ? "bp-stock-low" : ""}>{formatQty(r.stock_qty, r.uom)}</td>
                    <td className="bp-td-muted">
                      {Number(r.consignment_stock_qty || 0) > 0 ? formatQty(r.consignment_stock_qty, r.uom) : "—"}
                    </td>
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

const MOVEMENT_TYPES = [
  { value: "production_in", label: "Production received (factory)" },
  { value: "purchase_in", label: "Raw material received (factory)" },
  { value: "transfer_in", label: "Stock received from factory (store)" },
  { value: "transfer_out", label: "Stock dispatched to store (factory)" },
  { value: "sale", label: "Sold (manual next-day entry)" },
  { value: "wastage", label: "Wastage / damaged / expired" },
  { value: "adjustment", label: "Manual adjustment (+/-)" },
];

function RecordMovementModal({ locations, onClose, onDone }) {
  const [productQuery, setProductQuery] = useState("");
  const [productOptions, setProductOptions] = useState([]);
  const [productId, setProductId] = useState("");
  const [locationId, setLocationId] = useState(locations[0]?.location_id || "");
  const [movementType, setMovementType] = useState("adjustment");
  const [qty, setQty] = useState("");
  const [note, setNote] = useState("");
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10));
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const handle = setTimeout(() => {
      productsApi.list({ q: productQuery, limit: 10 }).then((data) => setProductOptions(data.items || [])).catch(() => {});
    }, 250);
    return () => clearTimeout(handle);
  }, [productQuery]);

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
        <input
          id="mvProduct"
          type="text"
          className="bp-field-input"
          placeholder="Search by name or SKU…"
          value={productQuery}
          onChange={(e) => { setProductQuery(e.target.value); setProductId(""); }}
        />
        {productOptions.length > 0 && !productId && (
          <div style={{ border: "1px solid var(--bp-border)", borderRadius: "var(--bp-radius-sm)", marginTop: 4, maxHeight: 140, overflow: "auto" }}>
            {productOptions.map((p) => (
              <div
                key={p.product_id}
                style={{ padding: "6px 10px", fontSize: 13, cursor: "pointer" }}
                onClick={() => { setProductId(p.product_id); setProductQuery(p.name); setProductOptions([]); }}
              >
                {p.name} {p.sku ? `(${p.sku})` : ""}
              </div>
            ))}
          </div>
        )}

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
