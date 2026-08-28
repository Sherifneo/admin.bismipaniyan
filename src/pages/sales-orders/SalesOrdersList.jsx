import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { salesOrdersApi, customersApi, locationsApi, productsApi, employeesApi } from "../../api/admin";
import { ApiError } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import Modal from "../../components/Modal";
import ReasonConfirmModal from "../../components/ReasonConfirmModal";
import ProductPicker from "../../components/ProductPicker";
import Pagination from "../../components/Pagination";
import StatusBadge from "../../components/StatusBadge";
import CodeField, { useCodePreview } from "../../components/CodeField";
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

// Every sale — walk-in or bulk — is a Sales Order. Deliberately just two
// real statuses (draft -> completed): a counter sale needs to be fast,
// not a multi-step approval chain like Purchase Orders. Completing an
// order does everything at once: writes stock out, records the Cash Book
// income, and makes the GST invoice available (see backend/src/routes/
// sales-orders.js). This is now the source of truth for revenue — Cash
// Book's old manual "Store sales" entry isn't the way to record a sale
// anymore, this is.
export default function SalesOrdersList() {
  const urlSearch = useUrlSearch();
  const [customers, setCustomers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [qField, setQField] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [viewSo, setViewSo] = useState(null);

  useEffect(() => {
    customersApi.list({}).then((d) => setCustomers(d.items || [])).catch(() => {});
    locationsApi.list().then(setLocations).catch(() => {});
    employeesApi.list().then((d) => setEmployees(d.items || [])).catch(() => {});
  }, []);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await salesOrdersApi.list({ page, limit: LIMIT, status, q, qField });
      setOrders(data.items || []);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load sales orders.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status, q, qField]);

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
    { key: "so_number", label: "SO #", accessor: (so) => so.so_number },
    { key: "buyer", label: "Buyer", accessor: (so) => so.customer_name || so.walkin_name || "Walk-in" },
    { key: "location_name", label: "Location", accessor: (so) => so.location_name },
    { key: "date", label: "Date", accessor: (so) => so.completed_date || so.order_date, filter: "dateRange" },
    { key: "total", label: "Total", accessor: (so) => so.total, filter: "number" },
    {
      key: "status", label: "Status", accessor: (so) => so.status, filter: "select",
      options: [{ value: "draft", label: "Draft" }, { value: "completed", label: "Completed" }, { value: "cancelled", label: "Cancelled" }],
    },
    { key: "sales_responsible_name", label: "Sales Responsible", accessor: (so) => so.sales_responsible_name || "" },
    { key: "created_by_name", label: "Created by", accessor: (so) => so.created_by_name || "", hiddenByDefault: true },
    { key: "created_at", label: "Created at", accessor: (so) => so.created_at || "", filter: "dateRange", hiddenByDefault: true },
    { key: "updated_by_name", label: "Updated by", accessor: (so) => so.updated_by_name || "", hiddenByDefault: true },
    { key: "updated_at", label: "Updated at", accessor: (so) => so.updated_at || "", filter: "dateRange", hiddenByDefault: true },
    { key: "universal_trans_id", label: "TransID", accessor: (so) => so.universal_trans_id || "", hiddenByDefault: true },
  ];
  const table = useDataTable({ rows: orders, columns, rowKey: (so) => so.so_id });

  // Seed from the header's GlobalSearch, once, on arrival — buyer/SO#
  // free text and the date range column, if either was passed in the URL.
  useEffect(() => {
    if (urlSearch.q) table.setFilter("buyer", { operator: "contains", value: urlSearch.q });
    if (urlSearch.from || urlSearch.to) table.setFilter("date", { operator: "between", from: urlSearch.from || undefined, to: urlSearch.to || undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 10 }}>
        <h1 className="bp-page-title">Sales Orders</h1>
        <button type="button" className="bp-btn-primary" onClick={() => setShowAdd(true)}>+ New sale</button>
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
        <select className="bp-field-input" style={{ width: "auto" }} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {error && <div className="bp-inline-error">{error}</div>}

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <DataTableToolbar table={table} filename="sales-orders" totalCount={orders.length} />
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
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={14} className="bp-table-empty">Loading…</td></tr>
            ) : table.filteredRows.length === 0 ? (
              <tr><td colSpan={14} className="bp-table-empty">No sales orders found.</td></tr>
            ) : (
              table.filteredRows.map((so) => (
                <tr key={so.so_id} onClick={() => setViewSo(so)} style={{ cursor: "pointer" }}>
                  <SelectRowCell table={table} row={so} />
                  {table.isColumnVisible("so_number") && <td className="bp-td-strong">{so.so_number}</td>}
                  {table.isColumnVisible("buyer") && <td>{so.customer_name || so.walkin_name || "Walk-in"}</td>}
                  {table.isColumnVisible("location_name") && <td className="bp-td-muted">{so.location_name}</td>}
                  {table.isColumnVisible("date") && <td className="bp-td-muted">{formatDate(so.completed_date || so.order_date)}</td>}
                  {table.isColumnVisible("total") && <td className="bp-td-strong">{inr(so.total)}</td>}
                  {table.isColumnVisible("status") && <td><StatusBadge status={so.status} /></td>}
                  {table.isColumnVisible("sales_responsible_name") && <td className="bp-td-muted">{so.sales_responsible_name || "—"}</td>}
                  {table.isColumnVisible("created_by_name") && <td className="bp-td-muted">{so.created_by_name || "—"}</td>}
                  {table.isColumnVisible("created_at") && <td className="bp-td-muted">{formatDateTime(so.created_at) || "—"}</td>}
                  {table.isColumnVisible("updated_by_name") && <td className="bp-td-muted">{so.updated_by_name || "—"}</td>}
                  {table.isColumnVisible("updated_at") && <td className="bp-td-muted">{formatDateTime(so.updated_at) || "—"}</td>}
                  {table.isColumnVisible("universal_trans_id") && (
                    <td onClick={(e) => e.stopPropagation()}>
                      {so.universal_trans_id ? (
                        <Link to={`/global-search?trans=${encodeURIComponent(so.universal_trans_id)}`} className="bp-trans-id-link">{so.universal_trans_id}</Link>
                      ) : "—"}
                    </td>
                  )}
                  <td className="bp-td-actions">
                    <button type="button" className="bp-btn-sm" onClick={(e) => { e.stopPropagation(); setViewSo(so); }}>View</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} limit={LIMIT} total={total} onPageChange={setPage} />

      {showAdd && (
        <NewSoModal customers={customers} locations={locations} employees={employees} onClose={() => setShowAdd(false)} onDone={onSaved} />
      )}
      {viewSo && (
        <SoDetailModal soId={viewSo.so_id} onClose={() => setViewSo(null)} onChanged={load} />
      )}
    </div>
  );
}

// Only real retail stores sell — the factory location is a production
// site, never a Sales Order's "Sold from".
function storesOnly(locations) {
  return locations.filter((l) => l.kind === "store");
}

function NewSoModal({ customers, locations, employees, onClose, onDone }) {
  const { admin: me } = useAuth();
  const stores = storesOnly(locations);
  const [locationId, setLocationId] = useState(stores[0]?.location_id || "");
  const [buyerType, setBuyerType] = useState("walkin"); // 'walkin' | 'customer'
  const [customerId, setCustomerId] = useState("");
  const [walkinCustomer, setWalkinCustomer] = useState(null);
  const [walkinLoading, setWalkinLoading] = useState(false);
  const [orderDate, setOrderDate] = useState(todayStr());
  const [notes, setNotes] = useState("");
  // Defaults to the logged-in user's own linked employee record (System
  // User -> Employee link, see SystemUsersList.jsx) if they have one — but any active
  // employee can be picked instead, since the person entering the sale
  // isn't always the one it should be credited to.
  const [salesResponsibleId, setSalesResponsibleId] = useState(me?.employee_id || "");
  const [items, setItems] = useState([{ product_id: "", quantity: "", unit_price: "" }]);
  const [products, setProducts] = useState([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const codeField = useCodePreview("sales_order", null);

  // Store picked first, buyer second: Walk-in auto-resolves to that
  // store's own "Walk-in — <Store>" customer record (no more free-typed
  // name/phone — see 011_retail_stores.sql). Re-fetches whenever the
  // store changes since each store has its own walk-in customer.
  useEffect(() => {
    if (buyerType !== "walkin" || !locationId) {
      setWalkinCustomer(null);
      return;
    }
    let cancelled = false;
    setWalkinLoading(true);
    customersApi
      .walkinFor(locationId)
      .then((d) => {
        if (cancelled) return;
        setWalkinCustomer((d.items || []).find((c) => c.is_walkin_default) || null);
      })
      .catch(() => { if (!cancelled) setWalkinCustomer(null); })
      .finally(() => { if (!cancelled) setWalkinLoading(false); });
    return () => { cancelled = true; };
  }, [buyerType, locationId]);

  const [discountEnabled, setDiscountEnabled] = useState(false);
  const [discountAmount, setDiscountAmount] = useState("");
  const [discountPercent, setDiscountPercent] = useState("");
  const [discountEditedField, setDiscountEditedField] = useState(null);

  function toggleDiscountEnabled(checked) {
    setDiscountEnabled(checked);
    if (!checked) {
      setDiscountAmount("");
      setDiscountPercent("");
      setDiscountEditedField(null);
    }
  }

  const [gstEnabled, setGstEnabled] = useState(false);
  const [gstAmount, setGstAmount] = useState("");
  const [gstPercent, setGstPercent] = useState("");
  const [gstEditedField, setGstEditedField] = useState(null);

  useEffect(() => {
    productsApi.list({ limit: 500, itemKind: "finished_good" }).then((d) => setProducts(d.items || [])).catch(() => {});
  }, []);

  function updateItem(idx, field, value) {
    setItems((prev) => {
      const next = prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it));
      // Auto-fill unit price from the product's selling_price when a
      // product is first picked, so a counter sale usually needs no
      // typing beyond quantity — still editable per-line if needed.
      if (field === "product_id") {
        const product = products.find((p) => p.product_id === value);
        if (product && product.selling_price != null && !next[idx].unit_price) {
          next[idx].unit_price = String(product.selling_price);
        }
      }
      return next;
    });
  }

  function addRow() {
    setItems((prev) => [...prev, { product_id: "", quantity: "", unit_price: "" }]);
  }

  // No mixed cart: once any line has a product picked, every other line
  // is filtered to that same owning partner (or, if it's a Bismi-owned
  // product, to Bismi-owned products only) — undefined means the cart is
  // still empty and unlocked. The backend re-checks this at create time
  // regardless (sales-orders.js's POST /), this is UX convenience only.
  let lockedOwnerId;
  for (const it of items) {
    if (!it.product_id) continue;
    const product = products.find((p) => p.product_id === it.product_id);
    if (product) {
      lockedOwnerId = product.owning_partner_id || null;
      break;
    }
  }
  function removeRow(idx) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  const subtotal = items.reduce((sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.unit_price) || 0), 0);

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
    if (!locationId) {
      setError("Select a store.");
      return;
    }
    if (buyerType === "customer" && !customerId) {
      setError("Select a customer.");
      return;
    }
    if (buyerType === "walkin" && !walkinCustomer) {
      setError("This store has no walk-in customer set up yet.");
      return;
    }
    if (!salesResponsibleId) {
      setError("Select the Sales Responsible employee.");
      return;
    }
    const cleanItems = items.filter((it) => it.product_id && it.quantity && it.unit_price !== "");
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
      await salesOrdersApi.create({
        customer_id: buyerType === "customer" ? customerId : walkinCustomer.customer_id,
        location_id: locationId,
        order_date: orderDate || undefined,
        notes: notes || undefined,
        sales_responsible_employee_id: salesResponsibleId,
        items: cleanItems.map((it) => ({ product_id: it.product_id, quantity: Number(it.quantity), unit_price: Number(it.unit_price) })),
        gst_enabled: gstEnabled,
        gst_percent: gstEnabled && gstEditedField === "percent" ? Number(gstPercent) : undefined,
        gst_amount: gstEnabled && gstEditedField === "amount" ? Number(gstAmount) : undefined,
        discount_percent: discountEditedField === "percent" ? Number(discountPercent) : undefined,
        discount_amount: discountEditedField === "amount" ? Number(discountAmount) : undefined,
      });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create this sale.");
      setSubmitting(false);
    }
  }

  return (
    <Modal title="New sale" onClose={onClose}>
      <form onSubmit={submit} className="bp-form">
        {error && <div className="bp-inline-error">{error}</div>}

        <label className="bp-field-label">Sale number</label>
        <input type="text" className="bp-field-input" value={codeField.loading ? "Loading…" : codeField.preview} disabled />

        <div className="bp-form-row">
          <div style={{ flex: 1 }}>
            <label className="bp-field-label" htmlFor="soLocation">Store</label>
            <select id="soLocation" className="bp-field-input" value={locationId} onChange={(e) => setLocationId(e.target.value)} required autoFocus>
              {stores.map((l) => <option key={l.location_id} value={l.location_id}>{l.name}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label className="bp-field-label" htmlFor="soDate">Date</label>
            <input id="soDate" type="date" className="bp-field-input" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} required />
          </div>
        </div>

        <label className="bp-field-label">Buyer</label>
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <button type="button" className={buyerType === "walkin" ? "bp-btn-sm bp-btn-primary" : "bp-btn-sm bp-btn-outline"} onClick={() => setBuyerType("walkin")}>
            Walk-in
          </button>
          <button type="button" className={buyerType === "customer" ? "bp-btn-sm bp-btn-primary" : "bp-btn-sm bp-btn-outline"} onClick={() => setBuyerType("customer")}>
            Customer
          </button>
        </div>

        {buyerType === "walkin" ? (
          <p className="bp-td-muted" style={{ marginTop: -6, marginBottom: 12 }}>
            {walkinLoading ? "Loading…" : walkinCustomer ? <>Sold to <strong className="bp-td-strong">{walkinCustomer.name}</strong></> : "This store has no walk-in customer set up yet."}
          </p>
        ) : (
          <>
            <label className="bp-field-label" htmlFor="soCustomer">Customer</label>
            <select id="soCustomer" className="bp-field-input" value={customerId} onChange={(e) => setCustomerId(e.target.value)} required>
              <option value="">Select a customer…</option>
              {customers.map((c) => <option key={c.customer_id} value={c.customer_id}>{c.name}{c.phone ? ` (${c.phone})` : ""}</option>)}
            </select>
          </>
        )}

        <label className="bp-field-label">Items</label>
        {lockedOwnerId !== undefined && (
          <p className="bp-td-muted" style={{ marginTop: -4, marginBottom: 6, fontSize: 12 }}>
            {lockedOwnerId
              ? `This order is for ${products.find((p) => p.owning_partner_id === lockedOwnerId)?.owning_partner_name}'s products only.`
              : "This order is for Bismi's own products only."}
          </p>
        )}
        {items.map((it, idx) => {
          const selectedProduct = products.find((p) => p.product_id === it.product_id);
          return (
            <div key={idx} className="bp-form-row" style={{ alignItems: "flex-end" }}>
              <div style={{ flex: 2 }}>
                <ProductPicker
                  itemKind="finished_good"
                  ownerId={lockedOwnerId || undefined}
                  value={it.product_id}
                  initialLabel={selectedProduct ? (selectedProduct.product_code ? `${selectedProduct.product_code} — ${selectedProduct.name}` : selectedProduct.name) : ""}
                  onChange={(id) => updateItem(idx, "product_id", id)}
                  placeholder="Search products by code or name…"
                />
              </div>
              <div style={{ flex: 1 }}>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder={selectedProduct?.uom ? `Qty (${selectedProduct.uom})` : "Qty"}
                  className="bp-field-input"
                  value={it.quantity}
                  onChange={(e) => updateItem(idx, "quantity", e.target.value)}
                />
              </div>
              <div style={{ flex: 1 }}>
                <input type="number" min="0" step="0.01" placeholder="Unit price ₹" className="bp-field-input" value={it.unit_price} onChange={(e) => updateItem(idx, "unit_price", e.target.value)} />
              </div>
              <button type="button" className="bp-btn-outline" onClick={() => removeRow(idx)} disabled={items.length === 1}>✕</button>
            </div>
          );
        })}
        <button type="button" className="bp-btn-sm" onClick={addRow} style={{ alignSelf: "flex-start", marginBottom: 10 }}>+ Add line</button>

        <label className="bp-field-label" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input type="checkbox" checked={discountEnabled} onChange={(e) => toggleDiscountEnabled(e.target.checked)} />
          Apply discount
        </label>
        {discountEnabled && (
          <div className="bp-form-row">
            <div style={{ flex: 1 }}>
              <input type="number" min="0" step="0.01" placeholder="Discount ₹" className="bp-field-input" value={discountAmount} onChange={(e) => onDiscountAmountChange(e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <input type="number" min="0" max="100" step="0.01" placeholder="Discount %" className="bp-field-input" value={discountPercent} onChange={(e) => onDiscountPercentChange(e.target.value)} />
            </div>
          </div>
        )}

        <label className="bp-field-label" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="checkbox"
            checked={gstEnabled}
            onChange={(e) => {
              const checked = e.target.checked;
              setGstEnabled(checked);
              if (!checked) { setGstAmount(""); setGstPercent(""); setGstEditedField(null); }
            }}
          />
          Apply GST
        </label>
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

        <label className="bp-field-label" htmlFor="soResponsible">Sales Responsible</label>
        <select id="soResponsible" className="bp-field-input" value={salesResponsibleId} onChange={(e) => setSalesResponsibleId(e.target.value)} required>
          <option value="">Select an employee…</option>
          {employees.map((emp) => (
            <option key={emp.employee_id} value={emp.employee_id}>{emp.full_name}</option>
          ))}
        </select>

        <label className="bp-field-label" htmlFor="soNotes">Notes (optional)</label>
        <textarea id="soNotes" className="bp-field-input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />

        <div className="bp-form-actions">
          <button type="button" className="bp-btn-outline" onClick={onClose} disabled={submitting}>Cancel</button>
          <button type="submit" className="bp-btn-primary" disabled={submitting}>{submitting ? "Saving…" : "Save as draft"}</button>
        </div>
      </form>
    </Modal>
  );
}

function SoDetailModal({ soId, onClose, onChanged }) {
  const [so, setSo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await salesOrdersApi.get(soId);
      setSo(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load this sales order.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [soId]);

  async function complete() {
    setBusy(true);
    try {
      await salesOrdersApi.complete(soId);
      await load();
      await onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not complete this sale.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmCancel(reason) {
    setBusy(true);
    try {
      await salesOrdersApi.cancel(soId, reason);
      setShowCancelConfirm(false);
      await load();
      await onChanged();
    } finally {
      setBusy(false);
    }
  }

  async function downloadInvoice() {
    try {
      await salesOrdersApi.downloadInvoice(soId);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not generate the invoice.");
    }
  }

  return (
    <Modal title={so ? `${so.so_number} — ${so.customer_name || so.walkin_name || "Walk-in"}` : "Sales order"} onClose={onClose}>
      {loading ? (
        <div className="bp-td-muted">Loading…</div>
      ) : error && !so ? (
        <div className="bp-inline-error">{error}</div>
      ) : (
        <>
          {error && <div className="bp-inline-error">{error}</div>}

          <div style={{ display: "flex", gap: 16, marginBottom: 12, flexWrap: "wrap" }}>
            <div><span className="bp-td-muted">Status: </span><StatusBadge status={so.status} /></div>
            <div><span className="bp-td-muted">Location:</span> {so.location_name}</div>
            <div><span className="bp-td-muted">Date:</span> {formatDate(so.completed_date || so.order_date)}</div>
            {so.sales_responsible_name && (
              <div><span className="bp-td-muted">Sales Responsible:</span> {so.sales_responsible_name}</div>
            )}
          </div>

          <table className="bp-table">
            <thead>
              <tr><th>Product</th><th>Qty</th><th>Unit price</th><th>Line total</th></tr>
            </thead>
            <tbody>
              {so.items.map((it) => (
                <tr key={it.so_item_id}>
                  <td>{it.product_name}</td>
                  <td className="bp-td-muted">{it.quantity} {it.uom}</td>
                  <td>{inr(it.unit_price)}</td>
                  <td className="bp-td-strong">{inr(it.quantity * it.unit_price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="bp-settlement-calc">
            <div className="bp-settlement-calc-row"><span>Subtotal</span><span>{inr(so.subtotal)}</span></div>
            {Number(so.discount_amount) > 0 && (
              <div className="bp-settlement-calc-row">
                <span>Discount{so.discount_percent != null ? ` (${so.discount_percent}%)` : ""}</span>
                <span>−{inr(so.discount_amount)}</span>
              </div>
            )}
            {so.gst_enabled && Number(so.gst_amount) > 0 && (
              <div className="bp-settlement-calc-row">
                <span>GST{so.gst_percent != null ? ` (${so.gst_percent}%)` : ""}</span>
                <span>+{inr(so.gst_amount)}</span>
              </div>
            )}
            <div className="bp-settlement-calc-row bp-settlement-calc-total"><span>Total</span><span>{inr(so.total)}</span></div>
          </div>

          {so.notes && <p className="bp-td-muted" style={{ marginTop: 10 }}>{so.notes}</p>}

          <div className="bp-form-actions">
            <button type="button" className="bp-btn-outline" onClick={downloadInvoice}>Download invoice</button>
            {so.status === "draft" && (
              <button type="button" className="bp-btn-outline" onClick={() => setShowCancelConfirm(true)} disabled={busy}>Cancel order</button>
            )}
            {so.status === "draft" && (
              <button type="button" className="bp-btn-primary" onClick={complete} disabled={busy}>Complete sale</button>
            )}
          </div>
        </>
      )}
      {showCancelConfirm && (
        <ReasonConfirmModal
          title="Cancel sales order"
          message="This will mark the order as cancelled. This cannot be undone."
          confirmLabel="Cancel order"
          onClose={() => setShowCancelConfirm(false)}
          onConfirm={confirmCancel}
        />
      )}
    </Modal>
  );
}
