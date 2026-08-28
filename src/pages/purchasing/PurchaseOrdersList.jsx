import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { purchasingApi, vendorsApi, locationsApi, productsApi, financialAccountsApi } from "../../api/admin";
import { ApiError } from "../../api/client";
import Modal from "../../components/Modal";
import Pagination from "../../components/Pagination";
import StatusBadge from "../../components/StatusBadge";
import { useCodePreview } from "../../components/CodeField";
import { useDataTable, SearchByBar, ColumnHeader, DataTableToolbar, SelectAllHeaderCell, SelectRowCell, ColumnChooserButton } from "../../components/DataTable";
import { useUrlSearch } from "../../hooks/useUrlSearch";
import { formatDate, formatDateTime } from "../../utils/date";

const LIMIT = 100;

function inr(n) {
  return "₹" + Number(n || 0).toLocaleString("en-IN");
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// Raw-material buying: a PO is created in draft, marked 'ordered' once
// sent to the vendor, then 'received' once goods arrive — which is the
// one status change that writes stock into inventory_movements (see
// backend/src/routes/purchase-orders.js).
export default function PurchaseOrdersList() {
  const urlSearch = useUrlSearch();
  const [vendors, setVendors] = useState([]);
  const [locations, setLocations] = useState([]);
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [payableOnly, setPayableOnly] = useState(false);
  const [q, setQ] = useState("");
  const [qField, setQField] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [viewPo, setViewPo] = useState(null);

  useEffect(() => {
    vendorsApi.list({}).then((d) => setVendors(d.items || [])).catch(() => {});
    locationsApi.list().then(setLocations).catch(() => {});
  }, []);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const params = { page, limit: LIMIT, q, qField };
      if (payableOnly) {
        // Accounts Payable: money Bismi currently owes — received but
        // not yet paid. Overrides the status filter while active.
        params.status = "received";
        params.paymentStatus = "unpaid";
      } else if (status) {
        params.status = status;
      }
      const data = await purchasingApi.list(params);
      setOrders(data.items || []);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load purchase orders.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status, payableOnly, q, qField]);

  // SearchByBar's "Search by <column>" now hits the server (via q/qField)
  // instead of only filtering whatever page of rows is already loaded.
  function searchByColumn(columnKey, value) {
    setPage(1);
    setQField(columnKey);
    setQ(value);
  }

  async function onSaved() {
    setShowAdd(false);
    await load();
  }

  const columns = [
    { key: "po_number", label: "PO #", accessor: (po) => po.po_number },
    { key: "vendor_name", label: "Vendor", accessor: (po) => po.vendor_code ? `${po.vendor_code} — ${po.vendor_name}` : po.vendor_name },
    { key: "location_name", label: "Location", accessor: (po) => po.location_name },
    { key: "order_date", label: "Order date", accessor: (po) => po.order_date, filter: "dateRange" },
    { key: "expected_date", label: "Expected", accessor: (po) => po.expected_date || "", filter: "dateRange" },
    { key: "total", label: "Total", accessor: (po) => po.total, filter: "number" },
    {
      key: "status", label: "Status", accessor: (po) => po.status, filter: "select",
      options: [{ value: "draft", label: "Draft" }, { value: "ordered", label: "Ordered" }, { value: "received", label: "Received" }, { value: "cancelled", label: "Cancelled" }],
    },
    {
      key: "payment_status", label: "Payment", accessor: (po) => (po.status === "received" ? (po.payment_status === "paid" ? "paid" : "unpaid") : ""), filter: "select",
      options: [{ value: "paid", label: "Paid" }, { value: "unpaid", label: "Unpaid" }],
    },
    { key: "created_by_name", label: "Created by", accessor: (po) => po.created_by_name || "", hiddenByDefault: true },
    { key: "created_at", label: "Created at", accessor: (po) => po.created_at || "", filter: "dateRange", hiddenByDefault: true },
    { key: "updated_by_name", label: "Updated by", accessor: (po) => po.updated_by_name || "", hiddenByDefault: true },
    { key: "updated_at", label: "Updated at", accessor: (po) => po.updated_at || "", filter: "dateRange", hiddenByDefault: true },
    { key: "universal_trans_id", label: "TransID", accessor: (po) => po.universal_trans_id || "", hiddenByDefault: true },
  ];
  const table = useDataTable({ rows: orders, columns, rowKey: (po) => po.po_id });

  useEffect(() => {
    if (urlSearch.q) table.setFilter("vendor_name", { operator: "contains", value: urlSearch.q });
    if (urlSearch.from || urlSearch.to) table.setFilter("order_date", { operator: "between", from: urlSearch.from || undefined, to: urlSearch.to || undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 10 }}>
        <h1 className="bp-page-title">Purchase Orders</h1>
        <button type="button" className="bp-btn-primary" onClick={() => setShowAdd(true)}>+ New purchase order</button>
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10, flexWrap: "wrap" }}>
        <select
          className="bp-field-input"
          style={{ width: "auto" }}
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          disabled={payableOnly}
        >
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="ordered">Ordered</option>
          <option value="received">Received</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <button
          type="button"
          className={payableOnly ? "bp-btn-sm bp-btn-primary" : "bp-btn-sm bp-btn-outline"}
          onClick={() => { setPayableOnly((v) => !v); setPage(1); }}
        >
          Accounts Payable (unpaid)
        </button>
      </div>

      {error && <div className="bp-inline-error">{error}</div>}

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <DataTableToolbar table={table} filename="purchase-orders" totalCount={orders.length} />
        <ColumnChooserButton table={table} columns={columns} />
      </div>
      <SearchByBar table={table} columns={columns} onServerSearch={searchByColumn} serverColumn={qField} serverValue={q} />

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
              {table.isColumnVisible(columns[10].key) && <ColumnHeader table={table} column={columns[10]} />}
              {table.isColumnVisible(columns[11].key) && <ColumnHeader table={table} column={columns[11]} />}
              {table.isColumnVisible(columns[12].key) && <ColumnHeader table={table} column={columns[12]} />}
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={15} className="bp-table-empty">Loading…</td></tr>
            ) : table.filteredRows.length === 0 ? (
              <tr><td colSpan={15} className="bp-table-empty">No purchase orders found.</td></tr>
            ) : (
              table.filteredRows.map((po) => (
                <tr key={po.po_id} onClick={() => setViewPo(po)} style={{ cursor: "pointer" }}>
                  <SelectRowCell table={table} row={po} />
                  {table.isColumnVisible("po_number") && <td className="bp-td-strong">{po.po_number}</td>}
                  {table.isColumnVisible("vendor_name") && <td>{po.vendor_code ? `${po.vendor_code} — ${po.vendor_name}` : po.vendor_name}</td>}
                  {table.isColumnVisible("location_name") && <td className="bp-td-muted">{po.location_name}</td>}
                  {table.isColumnVisible("order_date") && <td className="bp-td-muted">{formatDate(po.order_date)}</td>}
                  {table.isColumnVisible("expected_date") && <td className="bp-td-muted">{formatDate(po.expected_date) || "—"}</td>}
                  {table.isColumnVisible("total") && <td className="bp-td-strong">{inr(po.total)}</td>}
                  {table.isColumnVisible("status") && <td><StatusBadge status={po.status} /></td>}
                  {table.isColumnVisible("payment_status") && (
                    <td>
                      {po.status === "received" ? (
                        <StatusBadge status={po.payment_status === "paid" ? "paid" : "requested"} label={po.payment_status === "paid" ? "Paid" : "Unpaid"} />
                      ) : (
                        <span className="bp-td-muted">—</span>
                      )}
                    </td>
                  )}
                  {table.isColumnVisible("created_by_name") && <td className="bp-td-muted">{po.created_by_name || "—"}</td>}
                  {table.isColumnVisible("created_at") && <td className="bp-td-muted">{formatDateTime(po.created_at) || "—"}</td>}
                  {table.isColumnVisible("updated_by_name") && <td className="bp-td-muted">{po.updated_by_name || "—"}</td>}
                  {table.isColumnVisible("updated_at") && <td className="bp-td-muted">{formatDateTime(po.updated_at) || "—"}</td>}
                  {table.isColumnVisible("universal_trans_id") && (
                    <td onClick={(e) => e.stopPropagation()}>
                      {po.universal_trans_id ? (
                        <Link to={`/global-search?trans=${encodeURIComponent(po.universal_trans_id)}`} className="bp-trans-id-link">{po.universal_trans_id}</Link>
                      ) : "—"}
                    </td>
                  )}
                  <td className="bp-td-actions">
                    <button type="button" className="bp-btn-sm" onClick={(e) => { e.stopPropagation(); setViewPo(po); }}>View</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} limit={LIMIT} total={total} onPageChange={setPage} />

      {showAdd && (
        <NewPoModal vendors={vendors} locations={locations} onClose={() => setShowAdd(false)} onDone={onSaved} />
      )}
      {viewPo && (
        <PoDetailModal poId={viewPo.po_id} onClose={() => setViewPo(null)} onChanged={load} />
      )}
    </div>
  );
}

// Purchase orders are factory-only — raw materials and everything else
// Bismi buys in are received at the factory; a store only ever gets stock
// via a Sales Order or a Stock Transfer, never a direct vendor purchase.
// Matches sales-orders.js's server-side rule (stores-only) mirrored the
// other way; enforced server-side too, this is just the matching UI.
function factoryOnly(locations) {
  return locations.filter((l) => l.kind === "factory");
}

function NewPoModal({ vendors, locations, onClose, onDone }) {
  const factories = factoryOnly(locations);
  const [vendorId, setVendorId] = useState(vendors[0]?.vendor_id || "");
  const [locationId, setLocationId] = useState(factories[0]?.location_id || "");
  const [orderDate, setOrderDate] = useState(todayStr());
  const [expectedDate, setExpectedDate] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState([{ product_id: "", quantity: "", unit_cost: "" }]);
  const [products, setProducts] = useState([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const codeField = useCodePreview("purchase_order", null);

  // Discount: amount and percent side by side, entering one live-computes
  // the other for display — but only the field the user actually last
  // typed into is sent to the backend, so the server (source of truth for
  // the computation) never receives ambiguous "both" input.
  const [discountAmount, setDiscountAmount] = useState("");
  const [discountPercent, setDiscountPercent] = useState("");
  const [discountEditedField, setDiscountEditedField] = useState(null); // 'amount' | 'percent' | null

  const [gstEnabled, setGstEnabled] = useState(false);
  const [gstAmount, setGstAmount] = useState("");
  const [gstPercent, setGstPercent] = useState("");
  const [gstEditedField, setGstEditedField] = useState(null); // 'amount' | 'percent' | null

  useEffect(() => {
    productsApi.list({ limit: 500, itemKind: "raw_material" }).then((d) => setProducts(d.items || [])).catch(() => {});
  }, []);

  function updateItem(idx, field, value) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)));
  }

  // Selecting a product auto-fills Unit cost from its cost_price (still
  // freely editable afterward) — cost_price is already "the latest
  // received purchase unit cost," so this just saves re-typing a number
  // that's usually already correct.
  function selectProduct(idx, productId) {
    const product = products.find((p) => p.product_id === productId);
    setItems((prev) => prev.map((it, i) => (
      i === idx ? { ...it, product_id: productId, unit_cost: product?.cost_price ?? it.unit_cost } : it
    )));
  }

  async function fetchLastPrice(idx, productId) {
    if (!productId) return;
    try {
      const data = await purchasingApi.lastPrice(productId);
      if (data) updateItem(idx, "unit_cost", data.unit_cost);
    } catch {
      // Silently no-op — there may just be no prior received PO for this product.
    }
  }

  function addRow() {
    setItems((prev) => [...prev, { product_id: "", quantity: "", unit_cost: "" }]);
  }

  function removeRow(idx) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  const subtotal = items.reduce((sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.unit_cost) || 0), 0);

  // Live-computed discount, mirroring the backend's either/or logic so the
  // breakdown box updates as the user types, without waiting on a round trip.
  let liveDiscountAmount = 0;
  if (discountEditedField === "amount") {
    liveDiscountAmount = Number(discountAmount) || 0;
  } else if (discountEditedField === "percent") {
    liveDiscountAmount = subtotal * ((Number(discountPercent) || 0) / 100);
  }
  const subtotalAfterDiscount = subtotal - liveDiscountAmount;

  let liveGstAmount = 0;
  if (gstEnabled) {
    if (gstEditedField === "amount") {
      liveGstAmount = Number(gstAmount) || 0;
    } else if (gstEditedField === "percent") {
      liveGstAmount = subtotalAfterDiscount * ((Number(gstPercent) || 0) / 100);
    }
  }
  const liveTotal = subtotalAfterDiscount + liveGstAmount;

  function onDiscountAmountChange(v) {
    setDiscountAmount(v);
    setDiscountEditedField(v === "" ? null : "amount");
    if (v !== "") setDiscountPercent(subtotal > 0 ? String(Math.round((Number(v) / subtotal) * 100 * 100) / 100) : "0");
  }
  function onDiscountPercentChange(v) {
    setDiscountPercent(v);
    setDiscountEditedField(v === "" ? null : "percent");
    if (v !== "") setDiscountAmount(String(Math.round(subtotal * (Number(v) / 100) * 100) / 100));
  }
  function onGstAmountChange(v) {
    setGstAmount(v);
    setGstEditedField(v === "" ? null : "amount");
    if (v !== "") setGstPercent(subtotalAfterDiscount > 0 ? String(Math.round((Number(v) / subtotalAfterDiscount) * 100 * 100) / 100) : "0");
  }
  function onGstPercentChange(v) {
    setGstPercent(v);
    setGstEditedField(v === "" ? null : "percent");
    if (v !== "") setGstAmount(String(Math.round(subtotalAfterDiscount * (Number(v) / 100) * 100) / 100));
  }

  async function submit(e) {
    e.preventDefault();
    if (!vendorId || !locationId) {
      setError("Select a vendor and a location.");
      return;
    }
    const cleanItems = items.filter((it) => it.product_id && it.quantity && it.unit_cost);
    if (cleanItems.length === 0) {
      setError("Add at least one complete line item.");
      return;
    }
    if (gstEnabled && !gstEditedField) {
      setError("Enter a GST percent or a GST amount.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await purchasingApi.create({
        vendor_id: vendorId,
        location_id: locationId,
        order_date: orderDate || undefined,
        expected_date: expectedDate || undefined,
        notes: notes || undefined,
        items: cleanItems.map((it) => ({ product_id: it.product_id, quantity: Number(it.quantity), unit_cost: Number(it.unit_cost) })),
        gst_enabled: gstEnabled,
        gst_percent: gstEnabled && gstEditedField === "percent" ? Number(gstPercent) : undefined,
        gst_amount: gstEnabled && gstEditedField === "amount" ? Number(gstAmount) : undefined,
        discount_percent: discountEditedField === "percent" ? Number(discountPercent) : undefined,
        discount_amount: discountEditedField === "amount" ? Number(discountAmount) : undefined,
      });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create this purchase order.");
      setSubmitting(false);
    }
  }

  return (
    <Modal title="New purchase order" onClose={onClose}>
      <form onSubmit={submit} className="bp-form">
        {error && <div className="bp-inline-error">{error}</div>}

        <label className="bp-field-label">PO number</label>
        <input type="text" className="bp-field-input" value={codeField.loading ? "Loading…" : codeField.preview} disabled />

        <div className="bp-form-row">
          <div style={{ flex: 1 }}>
            <label className="bp-field-label" htmlFor="poVendor">Vendor</label>
            <select id="poVendor" className="bp-field-input" value={vendorId} onChange={(e) => setVendorId(e.target.value)} required>
              {vendors.length === 0 && <option value="">No vendors yet — add one first</option>}
              {vendors.map((v) => (
                <option key={v.vendor_id} value={v.vendor_id}>{v.vendor_code ? `${v.vendor_code} — ${v.name}` : v.name}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label className="bp-field-label" htmlFor="poLocation">Deliver to</label>
            <select id="poLocation" className="bp-field-input" value={locationId} onChange={(e) => setLocationId(e.target.value)} required>
              {factories.length === 0 && <option value="">No factory location found</option>}
              {factories.map((l) => <option key={l.location_id} value={l.location_id}>{l.name}</option>)}
            </select>
          </div>
        </div>

        <div className="bp-form-row">
          <div style={{ flex: 1 }}>
            <label className="bp-field-label" htmlFor="poOrderDate">Order date</label>
            <input id="poOrderDate" type="date" className="bp-field-input" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} required />
          </div>
          <div style={{ flex: 1 }}>
            <label className="bp-field-label" htmlFor="poExpected">Expected date (optional)</label>
            <input id="poExpected" type="date" className="bp-field-input" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} />
          </div>
        </div>

        <label className="bp-field-label">Line items</label>
        {items.map((it, idx) => {
          const selectedProduct = products.find((p) => p.product_id === it.product_id);
          return (
            <div key={idx} className="bp-form-row" style={{ alignItems: "flex-end" }}>
              <div style={{ flex: 2 }}>
                <select className="bp-field-input" value={it.product_id} onChange={(e) => selectProduct(idx, e.target.value)}>
                  <option value="">Select product…</option>
                  {products.map((p) => <option key={p.product_id} value={p.product_id}>{p.name}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <input type="number" min="0" step="0.01" placeholder="Qty" className="bp-field-input" value={it.quantity} onChange={(e) => updateItem(idx, "quantity", e.target.value)} />
              </div>
              <div className="bp-td-muted" style={{ width: 50, paddingBottom: 9 }}>{selectedProduct?.uom || ""}</div>
              <div style={{ flex: 1 }}>
                <input type="number" min="0" step="0.01" placeholder="Unit cost ₹" className="bp-field-input" value={it.unit_cost} onChange={(e) => updateItem(idx, "unit_cost", e.target.value)} />
              </div>
              <button type="button" className="bp-btn-sm" onClick={() => fetchLastPrice(idx, it.product_id)} disabled={!it.product_id}>Last PO Price</button>
              <button type="button" className="bp-btn-outline" onClick={() => removeRow(idx)} disabled={items.length === 1}>✕</button>
            </div>
          );
        })}
        <button type="button" className="bp-btn-sm" onClick={addRow} style={{ alignSelf: "flex-start", marginBottom: 10 }}>+ Add line</button>

        <label className="bp-field-label">Discount (optional)</label>
        <div className="bp-form-row">
          <div style={{ flex: 1 }}>
            <input type="number" min="0" step="0.01" placeholder="Discount ₹" className="bp-field-input" value={discountAmount} onChange={(e) => onDiscountAmountChange(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <input type="number" min="0" max="100" step="0.01" placeholder="Discount %" className="bp-field-input" value={discountPercent} onChange={(e) => onDiscountPercentChange(e.target.value)} />
          </div>
        </div>

        <label className="bp-field-label">GST</label>
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <button type="button" className={gstEnabled ? "bp-btn-sm bp-btn-primary" : "bp-btn-sm bp-btn-outline"} onClick={() => setGstEnabled(true)}>Yes</button>
          <button
            type="button"
            className={!gstEnabled ? "bp-btn-sm bp-btn-primary" : "bp-btn-sm bp-btn-outline"}
            onClick={() => { setGstEnabled(false); setGstAmount(""); setGstPercent(""); setGstEditedField(null); }}
          >
            No
          </button>
        </div>
        {gstEnabled && (
          <div className="bp-form-row">
            <div style={{ flex: 1 }}>
              <input type="number" min="0" step="0.01" placeholder="GST ₹" className="bp-field-input" value={gstAmount} onChange={(e) => onGstAmountChange(e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <input type="number" min="0" max="100" step="0.01" placeholder="GST %" className="bp-field-input" value={gstPercent} onChange={(e) => onGstPercentChange(e.target.value)} />
            </div>
          </div>
        )}

        <div className="bp-settlement-calc">
          <div className="bp-settlement-calc-row"><span>Subtotal</span><span>{inr(subtotal)}</span></div>
          {liveDiscountAmount > 0 && (
            <div className="bp-settlement-calc-row"><span>Discount</span><span>−{inr(liveDiscountAmount)}</span></div>
          )}
          {gstEnabled && liveGstAmount > 0 && (
            <div className="bp-settlement-calc-row"><span>GST</span><span>+{inr(liveGstAmount)}</span></div>
          )}
          <div className="bp-settlement-calc-row bp-settlement-calc-total"><span>Total</span><span>{inr(liveTotal)}</span></div>
        </div>

        <label className="bp-field-label" htmlFor="poNotes">Notes (optional)</label>
        <textarea id="poNotes" className="bp-field-input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />

        <div className="bp-form-actions">
          <button type="button" className="bp-btn-outline" onClick={onClose} disabled={submitting}>Cancel</button>
          <button type="submit" className="bp-btn-primary" disabled={submitting || vendors.length === 0}>{submitting ? "Saving…" : "Create purchase order"}</button>
        </div>
      </form>
    </Modal>
  );
}

function PoDetailModal({ poId, onClose, onChanged }) {
  const [po, setPo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPay, setShowPay] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await purchasingApi.get(poId);
      setPo(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load this purchase order.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poId]);

  async function setStatus(status) {
    setBusy(true);
    try {
      await purchasingApi.update(poId, { status });
      await load();
      await onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update status.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={po ? `${po.po_number} — ${po.vendor_code ? `${po.vendor_code} — ` : ""}${po.vendor_name}` : "Purchase order"} onClose={onClose}>
      {loading ? (
        <div className="bp-td-muted">Loading…</div>
      ) : error ? (
        <div className="bp-inline-error">{error}</div>
      ) : (
        <>
          <div style={{ display: "flex", gap: 16, marginBottom: 12, flexWrap: "wrap" }}>
            <div><span className="bp-td-muted">Status: </span><StatusBadge status={po.status} /></div>
            <div><span className="bp-td-muted">Location:</span> {po.location_name}</div>
            <div><span className="bp-td-muted">Order date:</span> {formatDate(po.order_date)}</div>
            {po.received_date && <div><span className="bp-td-muted">Received:</span> {formatDate(po.received_date)}</div>}
            {po.status === "received" && (
              <div>
                <span className="bp-td-muted">Payment: </span>
                <StatusBadge status={po.payment_status === "paid" ? "paid" : "requested"} label={po.payment_status === "paid" ? "Paid" : "Unpaid"} />
                {po.paid_date && <span className="bp-td-muted"> ({formatDate(po.paid_date)})</span>}
              </div>
            )}
          </div>

          <table className="bp-table">
            <thead>
              <tr><th>Product</th><th>Qty</th><th>Unit cost</th><th>Line total</th></tr>
            </thead>
            <tbody>
              {po.items.map((it) => (
                <tr key={it.po_item_id}>
                  <td>{it.product_name}</td>
                  <td className="bp-td-muted">{it.quantity} {it.uom}</td>
                  <td>{inr(it.unit_cost)}</td>
                  <td className="bp-td-strong">{inr(it.quantity * it.unit_cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="bp-settlement-calc">
            <div className="bp-settlement-calc-row"><span>Subtotal</span><span>{inr(po.subtotal)}</span></div>
            {Number(po.discount_amount) > 0 && (
              <div className="bp-settlement-calc-row">
                <span>Discount{po.discount_percent != null ? ` (${po.discount_percent}%)` : ""}</span>
                <span>−{inr(po.discount_amount)}</span>
              </div>
            )}
            {po.gst_enabled && Number(po.gst_amount) > 0 && (
              <div className="bp-settlement-calc-row">
                <span>GST{po.gst_percent != null ? ` (${po.gst_percent}%)` : ""}</span>
                <span>+{inr(po.gst_amount)}</span>
              </div>
            )}
            <div className="bp-settlement-calc-row bp-settlement-calc-total"><span>Total</span><span>{inr(po.total)}</span></div>
          </div>

          {po.notes && <p className="bp-td-muted" style={{ marginTop: 10 }}>{po.notes}</p>}

          <div className="bp-form-actions">
            {po.status === "draft" && (
              <button type="button" className="bp-btn-outline" onClick={() => setStatus("ordered")} disabled={busy}>Mark as ordered</button>
            )}
            {(po.status === "draft" || po.status === "ordered") && (
              <button type="button" className="bp-btn-primary" onClick={() => setStatus("received")} disabled={busy}>Mark received (adds to stock)</button>
            )}
            {po.status !== "received" && po.status !== "cancelled" && (
              <button type="button" className="bp-btn-outline" onClick={() => setStatus("cancelled")} disabled={busy}>Cancel</button>
            )}
            {po.status === "received" && po.payment_status !== "paid" && (
              <button type="button" className="bp-btn-primary" onClick={() => setShowPay(true)} disabled={busy}>Mark as paid</button>
            )}
          </div>
        </>
      )}
      {showPay && (
        <PayPoModal
          po={po}
          onClose={() => setShowPay(false)}
          onDone={async () => { setShowPay(false); await load(); await onChanged(); }}
        />
      )}
    </Modal>
  );
}

// Payment account is mandatory — same rule as Cash Book's manual Add Entry
// (backend/src/routes/cashbook.js's POST / rejects a missing
// financial_account_id the same way), applied here since paying a PO is
// the one PO action that actually moves money.
function PayPoModal({ po, onClose, onDone }) {
  const [accounts, setAccounts] = useState([]);
  const [financialAccountId, setFinancialAccountId] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    financialAccountsApi.list().then((data) => {
      const items = data.items || [];
      setAccounts(items);
      setFinancialAccountId((prev) => prev || items[0]?.financial_account_id || "");
    }).catch(() => {});
  }, []);

  async function submit(e) {
    e.preventDefault();
    if (!financialAccountId) {
      setError("Select a financial account (Cash or a bank account).");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await purchasingApi.pay(po.po_id, { financial_account_id: financialAccountId });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not mark this as paid.");
      setSubmitting(false);
    }
  }

  return (
    <Modal title={`Mark as paid — ${po.po_number}`} onClose={onClose}>
      <form onSubmit={submit} className="bp-form">
        {error && <div className="bp-inline-error">{error}</div>}
        <p className="bp-td-muted" style={{ fontSize: 12, marginTop: 0 }}>
          Paying {inr(po.total)} to {po.vendor_name}.
        </p>
        <label className="bp-field-label" htmlFor="payFinancialAccount">Financial Account</label>
        <select id="payFinancialAccount" className="bp-field-input" value={financialAccountId} onChange={(e) => setFinancialAccountId(e.target.value)} required autoFocus>
          {accounts.length === 0 && <option value="">Loading…</option>}
          {accounts.map((a) => <option key={a.financial_account_id} value={a.financial_account_id}>{a.name}</option>)}
        </select>
        <div className="bp-td-muted" style={{ fontSize: 11, margin: "4px 0 0" }}>
          Where the money actually moved — Cash or a specific bank account.
        </div>
        <div className="bp-form-actions">
          <button type="button" className="bp-btn-outline" onClick={onClose} disabled={submitting}>Cancel</button>
          <button type="submit" className="bp-btn-primary" disabled={submitting}>{submitting ? "Saving…" : "Mark as paid"}</button>
        </div>
      </form>
    </Modal>
  );
}
