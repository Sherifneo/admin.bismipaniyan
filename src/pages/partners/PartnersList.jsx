import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { partnersApi, productsApi, locationsApi, inventoryApi } from "../../api/admin";
import { ApiError } from "../../api/client";
import Modal from "../../components/Modal";
import Pagination from "../../components/Pagination";
import SearchBox from "../../components/SearchBox";
import StatusBadge from "../../components/StatusBadge";
import CodeField, { useCodePreview } from "../../components/CodeField";
import { useDataTable, SearchByBar, ColumnHeader, DataTableToolbar, SelectAllHeaderCell, SelectRowCell, ColumnChooserButton } from "../../components/DataTable";
import { useUrlSearch } from "../../hooks/useUrlSearch";
import { formatDate, formatDateTime } from "../../utils/date";
import "./Partners.css";

const LIMIT = 100;

function inr(n) {
  return "₹" + Number(n || 0).toLocaleString("en-IN");
}

const TYPE_LABELS = {
  external_shop: "External Shop",
  supplying_partner: "Supplying Partner",
};

// The 3-way commission model from Bismi_Bakery_Business_Model_Summary.xlsx:
// Model A (Bismi's own product in Bismi's own store) has no partner at
// all, so it never appears here. This screen covers Models B and C —
// external_shop sells Bismi's product (they keep the commission%,
// Bismi gets the rest) and supplying_partner's product sells in a Bismi
// store (Bismi keeps the commission%, the partner gets the rest).
export default function PartnersList() {
  const urlSearch = useUrlSearch();
  const [partners, setPartners] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [type, setType] = useState("");
  const [q, setQ] = useState(urlSearch.q);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editPartner, setEditPartner] = useState(null);
  const [settlementsFor, setSettlementsFor] = useState(null);
  const [stockFor, setStockFor] = useState(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await partnersApi.list({ page, limit: LIMIT, type, q });
      setPartners(data.items || []);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load partners.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, type, q]);

  function submitSearch(value) {
    setPage(1);
    setQ(value);
  }

  async function onSaved() {
    setShowAdd(false);
    setEditPartner(null);
    await load();
  }

  const columns = [
    { key: "partner_code", label: "Code", accessor: (p) => p.partner_code || "" },
    { key: "name", label: "Name", accessor: (p) => p.name },
    {
      key: "type", label: "Type", accessor: (p) => p.type, filter: "select",
      options: Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label })),
    },
    { key: "contact", label: "Contact", accessor: (p) => (p.contact_name || "") + (p.contact_phone ? ` · ${p.contact_phone}` : "") },
    { key: "location", label: "Location", accessor: (p) => p.location || "" },
    { key: "commission_percent", label: "Commission", accessor: (p) => Number(p.commission_percent), filter: "number" },
    {
      key: "settlement_frequency", label: "Settlement", accessor: (p) => p.settlement_frequency, filter: "select",
      options: [{ value: "daily", label: "Daily" }, { value: "weekly", label: "Weekly" }, { value: "monthly", label: "Monthly" }],
    },
    { key: "created_by_name", label: "Created by", accessor: (p) => p.created_by_name || "", hiddenByDefault: true },
    { key: "created_at", label: "Created at", accessor: (p) => p.created_at || "", filter: "dateRange", hiddenByDefault: true },
    { key: "updated_by_name", label: "Updated by", accessor: (p) => p.updated_by_name || "", hiddenByDefault: true },
    { key: "updated_at", label: "Updated at", accessor: (p) => p.updated_at || "", filter: "dateRange", hiddenByDefault: true },
  ];
  const table = useDataTable({ rows: partners, columns, rowKey: (p) => p.partner_id });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 10 }}>
        <h1 className="bp-page-title">Partners &amp; Shops</h1>
        <button type="button" className="bp-btn-primary" onClick={() => setShowAdd(true)}>+ Add partner</button>
      </div>
      <p className="bp-td-muted" style={{ margin: "-6px 0 14px" }}>
        External shops sell Bismi's product and keep a commission. Supplying partners' products sell in Bismi's stores and Bismi keeps a commission.
      </p>

      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
        <select className="bp-field-input" style={{ width: "auto" }} value={type} onChange={(e) => { setType(e.target.value); setPage(1); }}>
          <option value="">All types</option>
          <option value="external_shop">External Shop</option>
          <option value="supplying_partner">Supplying Partner</option>
        </select>
      </div>

      <SearchBox placeholder="Search by name…" onSearch={submitSearch} initialValue={urlSearch.q} />

      {error && <div className="bp-inline-error">{error}</div>}

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <DataTableToolbar table={table} filename="partners" totalCount={partners.length} />
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
              {table.isColumnVisible(columns[10].key) && <ColumnHeader table={table} column={columns[10]} />}
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={13} className="bp-table-empty">Loading…</td></tr>
            ) : table.filteredRows.length === 0 ? (
              <tr><td colSpan={13} className="bp-table-empty">No partners found.</td></tr>
            ) : (
              table.filteredRows.map((p) => (
                <tr key={p.partner_id} onClick={() => setEditPartner(p)} style={{ cursor: "pointer" }}>
                  <SelectRowCell table={table} row={p} />
                  {table.isColumnVisible("partner_code") && <td className="bp-td-muted">{p.partner_code || "—"}</td>}
                  {table.isColumnVisible("name") && <td className="bp-td-strong">{p.name}</td>}
                  {table.isColumnVisible("type") && <td><span className={`bp-partner-type-badge bp-partner-type-${p.type}`}>{TYPE_LABELS[p.type]}</span></td>}
                  {table.isColumnVisible("contact") && <td className="bp-td-muted">{p.contact_name || "—"}{p.contact_phone ? ` · ${p.contact_phone}` : ""}</td>}
                  {table.isColumnVisible("location") && <td className="bp-td-muted">{p.location || "—"}</td>}
                  {table.isColumnVisible("commission_percent") && <td>{Number(p.commission_percent)}%</td>}
                  {table.isColumnVisible("settlement_frequency") && <td className="bp-td-muted" style={{ textTransform: "capitalize" }}>{p.settlement_frequency}</td>}
                  {table.isColumnVisible("created_by_name") && <td className="bp-td-muted">{p.created_by_name || "—"}</td>}
                  {table.isColumnVisible("created_at") && <td className="bp-td-muted">{formatDateTime(p.created_at) || "—"}</td>}
                  {table.isColumnVisible("updated_by_name") && <td className="bp-td-muted">{p.updated_by_name || "—"}</td>}
                  {table.isColumnVisible("updated_at") && <td className="bp-td-muted">{formatDateTime(p.updated_at) || "—"}</td>}
                  <td className="bp-td-actions">
                    {p.type === "supplying_partner" && (
                      <button type="button" className="bp-btn-sm" onClick={(e) => { e.stopPropagation(); setStockFor(p); }}>Stock</button>
                    )}
                    <button type="button" className="bp-btn-sm" onClick={(e) => { e.stopPropagation(); setSettlementsFor(p); }}>Settlements</button>
                    <button type="button" className="bp-btn-sm" onClick={(e) => { e.stopPropagation(); setEditPartner(p); }}>Edit</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} limit={LIMIT} total={total} onPageChange={setPage} />

      {showAdd && <PartnerModal onClose={() => setShowAdd(false)} onDone={onSaved} />}
      {editPartner && <PartnerModal partner={editPartner} onClose={() => setEditPartner(null)} onDone={onSaved} />}
      {settlementsFor && <SettlementsModal partner={settlementsFor} onClose={() => setSettlementsFor(null)} />}
      {stockFor && <PartnerStockModal partner={stockFor} onClose={() => setStockFor(null)} />}
    </div>
  );
}

function PartnerModal({ partner, onClose, onDone }) {
  const isEdit = !!partner;
  const [name, setName] = useState(partner?.name || "");
  const [type, setType] = useState(partner?.type || "external_shop");
  const [contactName, setContactName] = useState(partner?.contact_name || "");
  const [contactPhone, setContactPhone] = useState(partner?.contact_phone || "");
  const [location, setLocation] = useState(partner?.location || "");
  const [commissionPercent, setCommissionPercent] = useState(partner ? String(partner.commission_percent) : (partner?.type === "supplying_partner" ? "20" : "15"));
  const [settlementFrequency, setSettlementFrequency] = useState(partner?.settlement_frequency || "weekly");
  const [notes, setNotes] = useState(partner?.notes || "");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const codeField = useCodePreview("partner", isEdit ? partner.partner_code : null);

  function changeType(newType) {
    setType(newType);
    if (!isEdit) setCommissionPercent(newType === "supplying_partner" ? "20" : "15");
  }

  async function submit(e) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    const commissionNum = Number(commissionPercent);
    if (!Number.isFinite(commissionNum) || commissionNum < 0 || commissionNum > 100) {
      setError("Enter a valid commission percent (0-100).");
      return;
    }
    if (codeField.mode === "manual" && !isEdit && !codeField.value.trim()) {
      setError("Enter a partner code.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const body = {
        name: name.trim(),
        contact_name: contactName || undefined,
        contact_phone: contactPhone || undefined,
        location: location || undefined,
        commission_percent: commissionNum,
        settlement_frequency: settlementFrequency,
        notes: notes || undefined,
        partner_code: codeField.mode === "manual" && !isEdit ? codeField.value.trim() : undefined,
      };
      if (isEdit) {
        await partnersApi.update(partner.partner_id, body);
      } else {
        await partnersApi.create({ ...body, type });
      }
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save this partner.");
      setSubmitting(false);
    }
  }

  return (
    <Modal title={isEdit ? `Edit — ${partner.name}` : "Add partner"} onClose={onClose}>
      <form onSubmit={submit} className="bp-form">
        {error && <div className="bp-inline-error">{error}</div>}

        <CodeField label="Partner code" field={codeField} isEdit={isEdit} />

        {!isEdit && (
          <>
            <label className="bp-field-label" htmlFor="pType">Type</label>
            <select id="pType" className="bp-field-input" value={type} onChange={(e) => changeType(e.target.value)}>
              <option value="external_shop">External Shop — sells Bismi's product, keeps commission</option>
              <option value="supplying_partner">Supplying Partner — their product sells in Bismi's store, Bismi keeps commission</option>
            </select>
          </>
        )}

        <label className="bp-field-label" htmlFor="pName">Name</label>
        <input id="pName" type="text" className="bp-field-input" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />

        <div className="bp-form-row">
          <div style={{ flex: 1 }}>
            <label className="bp-field-label" htmlFor="pContactName">Contact name</label>
            <input id="pContactName" type="text" className="bp-field-input" value={contactName} onChange={(e) => setContactName(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label className="bp-field-label" htmlFor="pContactPhone">Contact phone</label>
            <input id="pContactPhone" type="tel" className="bp-field-input" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
          </div>
        </div>

        <label className="bp-field-label" htmlFor="pLocation">Location</label>
        <input id="pLocation" type="text" className="bp-field-input" value={location} onChange={(e) => setLocation(e.target.value)} />

        <div className="bp-form-row">
          <div style={{ flex: 1 }}>
            <label className="bp-field-label" htmlFor="pCommission">Commission %</label>
            <input id="pCommission" type="number" min="0" max="100" step="0.01" className="bp-field-input" value={commissionPercent} onChange={(e) => setCommissionPercent(e.target.value)} required />
          </div>
          <div style={{ flex: 1 }}>
            <label className="bp-field-label" htmlFor="pFrequency">Settlement frequency</label>
            <select id="pFrequency" className="bp-field-input" value={settlementFrequency} onChange={(e) => setSettlementFrequency(e.target.value)}>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
        </div>

        <label className="bp-field-label" htmlFor="pNotes">Notes (optional)</label>
        <textarea id="pNotes" className="bp-field-input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />

        <div className="bp-form-actions">
          <button type="button" className="bp-btn-outline" onClick={onClose} disabled={submitting}>Cancel</button>
          <button type="submit" className="bp-btn-primary" disabled={submitting}>{submitting ? "Saving…" : isEdit ? "Save changes" : "Add partner"}</button>
        </div>
      </form>
    </Modal>
  );
}

function PartnerStockModal({ partner, onClose }) {
  const [stock, setStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showReceive, setShowReceive] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [productsRefreshKey, setProductsRefreshKey] = useState(0);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await inventoryApi.list({ partnerId: partner.partner_id, limit: 100 });
      setStock(data.items || []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load stock.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Modal title={`Stock — ${partner.name}`} onClose={onClose}>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 10 }}>
        <button type="button" className="bp-btn-outline" onClick={() => setShowAddProduct(true)}>+ Add product</button>
        <button type="button" className="bp-btn-primary" onClick={() => setShowReceive(true)}>+ Receive stock</button>
      </div>
      {error && <div className="bp-inline-error">{error}</div>}
      {loading ? (
        <div className="bp-td-muted">Loading…</div>
      ) : stock.length === 0 ? (
        <div className="bp-td-muted">No consigned stock recorded yet.</div>
      ) : (
        <table className="bp-table">
          <thead><tr><th>Product</th><th>Location</th><th>Qty on hand</th></tr></thead>
          <tbody>
            {stock.map((s) => (
              <tr key={`${s.product_id}-${s.location_id}`}>
                <td className="bp-td-strong">{s.name}</td>
                <td className="bp-td-muted">{s.location_name}</td>
                <td>{s.consignment_stock_qty} {s.uom}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {showReceive && (
        <ReceiveStockForm
          partner={partner}
          refreshKey={productsRefreshKey}
          onClose={() => setShowReceive(false)}
          onDone={async () => { setShowReceive(false); await load(); }}
        />
      )}
      {showAddProduct && (
        <AddPartnerProductForm
          partner={partner}
          onClose={() => setShowAddProduct(false)}
          onDone={() => { setShowAddProduct(false); setProductsRefreshKey((k) => k + 1); }}
        />
      )}
    </Modal>
  );
}

// Deliberately minimal — a supplying partner's product isn't Bismi's
// own stock to cost, so this is just Name + Selling price. Commission
// is always that partner's own commission_percent (set once on the
// partner, Model C is never per-product) — never asked here. Gets its
// own P-EXT-0001 style code (routes/partners.js's POST /:id/products,
// counter_key 'partner_product') so these are visually distinct from
// Bismi's own P-00001 products everywhere they appear.
function AddPartnerProductForm({ partner, onClose, onDone }) {
  const [name, setName] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    if (!sellingPrice || Number(sellingPrice) <= 0) {
      setError("Selling price must be greater than zero.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await partnersApi.createProduct(partner.partner_id, { name: name.trim(), selling_price: Number(sellingPrice) });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not add this product.");
      setSubmitting(false);
    }
  }

  return (
    <Modal title={`Add product — ${partner.name}`} onClose={onClose}>
      <form onSubmit={submit} className="bp-form">
        {error && <div className="bp-inline-error">{error}</div>}
        <p className="bp-td-muted" style={{ fontSize: 12, marginTop: 0 }}>
          Commission is this partner's own rate ({partner.commission_percent}%), applied automatically when this item sells — no need to set it per product.
        </p>
        <label className="bp-field-label" htmlFor="appName">Name</label>
        <input id="appName" type="text" className="bp-field-input" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        <label className="bp-field-label" htmlFor="appPrice">Selling price (₹)</label>
        <input id="appPrice" type="number" min="0" step="0.01" className="bp-field-input" value={sellingPrice} onChange={(e) => setSellingPrice(e.target.value)} required />
        <div className="bp-form-actions">
          <button type="button" className="bp-btn-outline" onClick={onClose} disabled={submitting}>Cancel</button>
          <button type="submit" className="bp-btn-primary" disabled={submitting}>{submitting ? "Saving…" : "Add product"}</button>
        </div>
      </form>
    </Modal>
  );
}

function ReceiveStockForm({ partner, refreshKey, onClose, onDone }) {
  const [products, setProducts] = useState([]);
  const [productId, setProductId] = useState("");
  const [locations, setLocations] = useState([]);
  const [locationId, setLocationId] = useState("");
  const [qty, setQty] = useState("");
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    productsApi.list({ ownerId: partner.partner_id, limit: 200 }).then((d) => setProducts(d.items || [])).catch(() => {});
    locationsApi.list().then(setLocations).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  async function submit(e) {
    e.preventDefault();
    if (!productId || !locationId || !qty) {
      setError("Product, location, and quantity are required.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await partnersApi.receiveStock(partner.partner_id, {
        product_id: productId, location_id: locationId, qty: Number(qty),
        entry_date: entryDate || undefined, note: note || undefined,
      });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not record this stock.");
      setSubmitting(false);
    }
  }

  return (
    <Modal title={`Receive stock — ${partner.name}`} onClose={onClose}>
      <form onSubmit={submit} className="bp-form">
        {error && <div className="bp-inline-error">{error}</div>}
        {products.length === 0 && (
          <p className="bp-td-muted" style={{ fontSize: 12 }}>
            This partner has no products yet — add one from Products first, with this partner set as the owning partner.
          </p>
        )}
        <label className="bp-field-label" htmlFor="rsProduct">Product</label>
        <select id="rsProduct" className="bp-field-input" value={productId} onChange={(e) => setProductId(e.target.value)} required autoFocus>
          <option value="">Select product…</option>
          {products.map((p) => <option key={p.product_id} value={p.product_id}>{p.name}</option>)}
        </select>
        <div className="bp-form-row">
          <div style={{ flex: 1 }}>
            <label className="bp-field-label" htmlFor="rsLocation">Location</label>
            <select id="rsLocation" className="bp-field-input" value={locationId} onChange={(e) => setLocationId(e.target.value)} required>
              <option value="">Select location…</option>
              {locations.map((l) => <option key={l.location_id} value={l.location_id}>{l.name}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label className="bp-field-label" htmlFor="rsQty">Quantity</label>
            <input id="rsQty" type="number" min="0.001" step="0.001" className="bp-field-input" value={qty} onChange={(e) => setQty(e.target.value)} required />
          </div>
        </div>
        <label className="bp-field-label" htmlFor="rsDate">Date</label>
        <input id="rsDate" type="date" className="bp-field-input" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
        <label className="bp-field-label" htmlFor="rsNote">Note (optional)</label>
        <textarea id="rsNote" className="bp-field-input" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        <div className="bp-form-actions">
          <button type="button" className="bp-btn-outline" onClick={onClose} disabled={submitting}>Cancel</button>
          <button type="submit" className="bp-btn-primary" disabled={submitting}>{submitting ? "Saving…" : "Receive stock"}</button>
        </div>
      </form>
    </Modal>
  );
}

function SettlementsModal({ partner, onClose }) {
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await partnersApi.listSettlements(partner.partner_id, { limit: 20 });
      setSettlements(data.items || []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load settlements.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function markPaid(settlement) {
    await partnersApi.updateSettlementStatus(settlement.settlement_id, "paid");
    await load();
  }

  const owedLabel = partner.type === "external_shop" ? "Shop owes Bismi" : "Bismi owes partner";

  const columns = [
    { key: "period", label: "Period", accessor: (s) => s.period_start, filter: "dateRange" },
    { key: "sales_value", label: "Sales", accessor: (s) => s.sales_value, filter: "number" },
    { key: "net_amount", label: owedLabel, accessor: (s) => s.net_amount, filter: "number" },
    {
      key: "status", label: "Status", accessor: (s) => s.status, filter: "select",
      options: [{ value: "pending", label: "Pending" }, { value: "paid", label: "Paid" }],
    },
    { key: "updated_by_name", label: "Updated by", accessor: (s) => s.updated_by_name || "", hiddenByDefault: true },
    { key: "updated_at", label: "Updated at", accessor: (s) => s.updated_at || "", filter: "dateRange", hiddenByDefault: true },
    { key: "universal_trans_id", label: "TransID", accessor: (s) => s.universal_trans_id || "", hiddenByDefault: true },
  ];
  const table = useDataTable({ rows: settlements, columns, rowKey: (s) => s.settlement_id });

  return (
    <Modal title={`Settlements — ${partner.name}`} onClose={onClose}>
      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        {table.selectedRows.length > 0 && (
          <button type="button" className="bp-btn-sm bp-btn-outline" onClick={() => table.exportSelected(`settlements-${partner.partner_code || partner.partner_id}`)}>
            Export selected ({table.selectedRows.length})
          </button>
        )}
        {settlements.length > 0 && (
          <button type="button" className="bp-btn-sm bp-btn-outline" onClick={() => table.exportAll(`settlements-${partner.partner_code || partner.partner_id}`)}>
            Export all
          </button>
        )}
        <button type="button" className="bp-btn-primary" onClick={() => setShowAdd(true)}>
          {partner.type === "supplying_partner" ? "+ Pay out" : "+ New settlement"}
        </button>
        <ColumnChooserButton table={table} columns={columns} />
      </div>

      {error && <div className="bp-inline-error">{error}</div>}

      {loading ? (
        <div className="bp-td-muted">Loading…</div>
      ) : settlements.length === 0 ? (
        <div className="bp-td-muted">No settlements recorded yet.</div>
      ) : (
        <>
          <SearchByBar table={table} columns={columns} />
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
                <th></th>
              </tr>
            </thead>
            <tbody>
              {table.filteredRows.map((s) => (
                <tr key={s.settlement_id}>
                  <SelectRowCell table={table} row={s} />
                  {table.isColumnVisible("period") && <td className="bp-td-muted">{formatDate(s.period_start)} → {formatDate(s.period_end)}</td>}
                  {table.isColumnVisible("sales_value") && <td>{inr(s.sales_value)}</td>}
                  {table.isColumnVisible("net_amount") && <td className="bp-td-strong">{inr(s.net_amount)}</td>}
                  {table.isColumnVisible("status") && <td><StatusBadge status={s.status} /></td>}
                  {table.isColumnVisible("updated_by_name") && <td className="bp-td-muted">{s.updated_by_name || "—"}</td>}
                  {table.isColumnVisible("updated_at") && <td className="bp-td-muted">{formatDateTime(s.updated_at) || "—"}</td>}
                  {table.isColumnVisible("universal_trans_id") && (
                    <td>
                      {s.universal_trans_id ? (
                        <Link to={`/global-search?trans=${encodeURIComponent(s.universal_trans_id)}`} className="bp-trans-id-link">{s.universal_trans_id}</Link>
                      ) : "—"}
                    </td>
                  )}
                  <td className="bp-td-actions">
                    {s.status === "pending" && (
                      <button type="button" className="bp-btn-sm" onClick={() => markPaid(s)}>Mark paid</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {showAdd && partner.type === "supplying_partner" && (
        <PayOutForm
          partner={partner}
          onClose={() => setShowAdd(false)}
          onDone={async () => { setShowAdd(false); await load(); }}
        />
      )}
      {showAdd && partner.type !== "supplying_partner" && (
        <NewSettlementForm
          partner={partner}
          onClose={() => setShowAdd(false)}
          onDone={async () => { setShowAdd(false); await load(); }}
        />
      )}
    </Modal>
  );
}

// Supplying partners take their commission at each sale now (see
// backend/src/routes/sales-orders.js's POST /:id/complete), so there's
// no period/sales-value math left to enter by hand — this just shows
// the current running balance owed and pays it out in one action.
function PayOutForm({ partner, onClose, onDone }) {
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    partnersApi.payableBalance(partner.partner_id)
      .then((d) => setBalance(d.payable_balance))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load the balance owed."))
      .finally(() => setLoading(false));
  }, [partner.partner_id]);

  async function submit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await partnersApi.payOut(partner.partner_id, {});
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not record this payout.");
      setSubmitting(false);
    }
  }

  return (
    <Modal title={`Pay out — ${partner.name}`} onClose={onClose}>
      <form onSubmit={submit} className="bp-form">
        {error && <div className="bp-inline-error">{error}</div>}
        {loading ? (
          <div className="bp-td-muted">Loading…</div>
        ) : (
          <div className="bp-settlement-calc">
            <div className="bp-settlement-calc-row bp-settlement-calc-total">
              <span>Amount owed to {partner.name}</span><span>{inr(balance)}</span>
            </div>
          </div>
        )}
        <p className="bp-td-muted" style={{ fontSize: 12 }}>
          Commission is already taken from each sale — this pays out the full balance above. Cash/Bank decreases by
          this amount and the balance owed clears to zero; no additional income or expense is created.
        </p>
        <div className="bp-form-actions">
          <button type="button" className="bp-btn-outline" onClick={onClose} disabled={submitting}>Cancel</button>
          <button type="submit" className="bp-btn-primary" disabled={submitting || loading || !balance}>
            {submitting ? "Saving…" : "Pay out"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function NewSettlementForm({ partner, onClose, onDone }) {
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [salesValue, setSalesValue] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const salesNum = Number(salesValue) || 0;
  const commissionAmount = Math.round(salesNum * (partner.commission_percent / 100) * 100) / 100;
  const netAmount = Math.round((salesNum - commissionAmount) * 100) / 100;
  const owedLabel = partner.type === "external_shop" ? "Shop owes Bismi" : "Bismi owes partner";

  async function submit(e) {
    e.preventDefault();
    if (!periodStart || !periodEnd) {
      setError("Enter the settlement period.");
      return;
    }
    if (!Number.isFinite(salesNum) || salesNum <= 0) {
      setError("Enter a valid sales value.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await partnersApi.createSettlement(partner.partner_id, {
        period_start: periodStart,
        period_end: periodEnd,
        sales_value: salesNum,
        notes: notes || undefined,
      });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not record this settlement.");
      setSubmitting(false);
    }
  }

  return (
    <Modal title="New settlement" onClose={onClose}>
      <form onSubmit={submit} className="bp-form">
        {error && <div className="bp-inline-error">{error}</div>}

        <div className="bp-form-row">
          <div style={{ flex: 1 }}>
            <label className="bp-field-label" htmlFor="sPeriodStart">Period start</label>
            <input id="sPeriodStart" type="date" className="bp-field-input" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} required />
          </div>
          <div style={{ flex: 1 }}>
            <label className="bp-field-label" htmlFor="sPeriodEnd">Period end</label>
            <input id="sPeriodEnd" type="date" className="bp-field-input" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} required />
          </div>
        </div>

        <label className="bp-field-label" htmlFor="sSales">Sales value for this period (₹)</label>
        <input id="sSales" type="number" min="0.01" step="0.01" className="bp-field-input" value={salesValue} onChange={(e) => setSalesValue(e.target.value)} required autoFocus />

        <div className="bp-settlement-calc">
          <div className="bp-settlement-calc-row"><span>Sales value</span><span>{inr(salesNum)}</span></div>
          <div className="bp-settlement-calc-row"><span>Commission ({Number(partner.commission_percent)}%)</span><span>{inr(commissionAmount)}</span></div>
          <div className="bp-settlement-calc-row bp-settlement-calc-total"><span>{owedLabel}</span><span>{inr(netAmount)}</span></div>
        </div>

        <label className="bp-field-label" htmlFor="sNotes">Notes (optional)</label>
        <textarea id="sNotes" className="bp-field-input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />

        <div className="bp-form-actions">
          <button type="button" className="bp-btn-outline" onClick={onClose} disabled={submitting}>Cancel</button>
          <button type="submit" className="bp-btn-primary" disabled={submitting}>{submitting ? "Saving…" : "Record settlement"}</button>
        </div>
      </form>
    </Modal>
  );
}
