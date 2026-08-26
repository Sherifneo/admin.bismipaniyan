import { useEffect, useState } from "react";
import { productsApi, uomsApi, bomsApi } from "../../api/admin";
import { ApiError } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import ExportMenu from "../../components/ExportMenu";
import Modal from "../../components/Modal";
import Pagination from "../../components/Pagination";
import SearchBox from "../../components/SearchBox";
import CodeField, { useCodePreview } from "../../components/CodeField";
import { useDataTable, SearchByBar, ColumnHeader, SelectAllHeaderCell, SelectRowCell, ColumnChooserButton } from "../../components/DataTable";
import { useUrlSearch } from "../../hooks/useUrlSearch";
import { formatDateTime } from "../../utils/date";

const LIMIT = 20;

function inr(n) {
  return n === null || n === undefined || n === "" ? "—" : "₹" + Number(n).toLocaleString("en-IN");
}

const TABS = [
  { key: "products", label: "Products" },
  { key: "uom", label: "UOM" },
  { key: "bom", label: "BOM" },
];

const CSV_COLUMNS = [
  { label: "SKU", accessor: (p) => p.sku },
  { label: "Name", accessor: (p) => p.name },
  { label: "Kind", accessor: (p) => p.item_kind },
  { label: "UOM", accessor: (p) => p.uom },
  { label: "Cost price", accessor: (p) => p.cost_price },
  { label: "Selling price", accessor: (p) => p.selling_price },
];

// The product master — every finished good and raw material Bismi tracks.
// Feeds Inventory (stock is per product+location), Purchase Orders (raw
// materials bought from vendors), and the website's catalog is hand-
// maintained separately, not fetched from here.
export default function ProductsList() {
  const { hasPermission } = useAuth();
  const urlSearch = useUrlSearch();
  const [tab, setTab] = useState("products");
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [itemKind, setItemKind] = useState("");
  const [q, setQ] = useState(urlSearch.q);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editProduct, setEditProduct] = useState(null);

  async function load() {
    if (tab !== "products") return;
    setLoading(true);
    setError("");
    try {
      const data = await productsApi.list({ page, limit: LIMIT, itemKind, q, includeInactive: true });
      setProducts(data.items || []);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load products.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, itemKind, q, tab]);

  function submitSearch(value) {
    setPage(1);
    setQ(value);
  }

  async function onSaved() {
    setShowAdd(false);
    setEditProduct(null);
    await load();
  }

  async function remove(product) {
    if (!window.confirm(`Deactivate ${product.name}? It will be hidden from pickers elsewhere but can be reactivated here.`)) return;
    await productsApi.remove(product.product_id);
    await load();
  }

  async function reactivate(product) {
    await productsApi.update(product.product_id, { is_active: true });
    await load();
  }

  const columns = [
    { key: "product_code", label: "Code", accessor: (p) => p.product_code || "" },
    { key: "sku", label: "SKU", accessor: (p) => p.sku || "" },
    { key: "name", label: "Name", accessor: (p) => p.name },
    {
      key: "item_kind", label: "Kind", accessor: (p) => p.item_kind, filter: "select",
      options: [{ value: "finished_good", label: "Finished good" }, { value: "raw_material", label: "Raw material" }],
    },
    { key: "uom", label: "UOM", accessor: (p) => p.uom },
    {
      key: "is_active", label: "Active", accessor: (p) => (p.is_active ? "yes" : "no"), filter: "select",
      options: [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }],
    },
    { key: "cost_price", label: "Cost price", accessor: (p) => p.cost_price ?? "", filter: "number" },
    { key: "selling_price", label: "Selling price", accessor: (p) => p.selling_price ?? "", filter: "number" },
    { key: "low_stock_alert", label: "Low stock alert", accessor: (p) => p.low_stock_alert, filter: "number" },
    { key: "created_by_name", label: "Created by", accessor: (p) => p.created_by_name || "", hiddenByDefault: true },
    { key: "created_at", label: "Created at", accessor: (p) => p.created_at || "", filter: "dateRange", hiddenByDefault: true },
    { key: "updated_by_name", label: "Updated by", accessor: (p) => p.updated_by_name || "", hiddenByDefault: true },
    { key: "updated_at", label: "Updated at", accessor: (p) => p.updated_at || "", filter: "dateRange", hiddenByDefault: true },
  ];
  const table = useDataTable({ rows: products, columns, rowKey: (p) => p.product_id });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 10 }}>
        <h1 className="bp-page-title">Products</h1>
        {tab === "products" && (
          <div style={{ display: "flex", gap: 8 }}>
            {table.selectedRows.length > 0 && (
              <button type="button" className="bp-btn-sm bp-btn-outline" onClick={() => table.exportSelected("products")}>
                Export selected ({table.selectedRows.length})
              </button>
            )}
            <ExportMenu filename="products" rows={products} columns={CSV_COLUMNS} />
            <ColumnChooserButton table={table} columns={columns} />
            <button type="button" className="bp-btn-primary" onClick={() => setShowAdd(true)}>+ Add product</button>
          </div>
        )}
      </div>

      <div className="bp-tabs" style={{ marginBottom: 14 }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`bp-tab${tab === t.key ? " is-active" : ""}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "uom" ? (
        <UomTab />
      ) : tab === "bom" ? (
        <BomTab />
      ) : (
        <>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
        <select className="bp-field-input" style={{ width: "auto" }} value={itemKind} onChange={(e) => { setItemKind(e.target.value); setPage(1); }}>
          <option value="">All kinds</option>
          <option value="finished_good">Finished goods</option>
          <option value="raw_material">Raw materials</option>
        </select>
      </div>

      <SearchBox placeholder="Search by name or SKU…" onSearch={submitSearch} initialValue={urlSearch.q} />

      {error && <div className="bp-inline-error">{error}</div>}

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
              {table.isColumnVisible(columns[11].key) && <ColumnHeader table={table} column={columns[11]} />}
              {table.isColumnVisible(columns[12].key) && <ColumnHeader table={table} column={columns[12]} />}
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={15} className="bp-table-empty">Loading…</td></tr>
            ) : table.filteredRows.length === 0 ? (
              <tr><td colSpan={15} className="bp-table-empty">No products found.</td></tr>
            ) : (
              table.filteredRows.map((p) => (
                <tr key={p.product_id} onClick={() => setEditProduct(p)} style={{ cursor: "pointer", opacity: p.is_active ? 1 : 0.55 }}>
                  <SelectRowCell table={table} row={p} />
                  {table.isColumnVisible("product_code") && <td className="bp-td-muted">{p.product_code || "—"}</td>}
                  {table.isColumnVisible("sku") && <td className="bp-td-muted">{p.sku || "—"}</td>}
                  {table.isColumnVisible("name") && <td className="bp-td-strong">{p.name}</td>}
                  {table.isColumnVisible("item_kind") && <td className="bp-td-muted" style={{ textTransform: "capitalize" }}>{p.item_kind.replace("_", " ")}</td>}
                  {table.isColumnVisible("uom") && <td className="bp-td-muted">{p.uom}</td>}
                  {table.isColumnVisible("is_active") && <td className="bp-td-muted">{p.is_active ? "Yes" : "No"}</td>}
                  {table.isColumnVisible("cost_price") && <td>{inr(p.cost_price)}</td>}
                  {table.isColumnVisible("selling_price") && <td>{inr(p.selling_price)}</td>}
                  {table.isColumnVisible("low_stock_alert") && <td className="bp-td-muted">{p.low_stock_alert}</td>}
                  {table.isColumnVisible("created_by_name") && <td className="bp-td-muted">{p.created_by_name || "—"}</td>}
                  {table.isColumnVisible("created_at") && <td className="bp-td-muted">{formatDateTime(p.created_at) || "—"}</td>}
                  {table.isColumnVisible("updated_by_name") && <td className="bp-td-muted">{p.updated_by_name || "—"}</td>}
                  {table.isColumnVisible("updated_at") && <td className="bp-td-muted">{formatDateTime(p.updated_at) || "—"}</td>}
                  <td className="bp-td-actions">
                    <button type="button" className="bp-btn-sm" onClick={(e) => { e.stopPropagation(); setEditProduct(p); }}>Edit</button>
                    {hasPermission("products.manage", "full_control") && (
                      p.is_active ? (
                        <button type="button" className="bp-btn-sm" onClick={(e) => { e.stopPropagation(); remove(p); }}>Deactivate</button>
                      ) : (
                        <button type="button" className="bp-btn-sm" onClick={(e) => { e.stopPropagation(); reactivate(p); }}>Reactivate</button>
                      )
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} limit={LIMIT} total={total} onPageChange={setPage} />

      {showAdd && <ProductModal onClose={() => setShowAdd(false)} onDone={onSaved} />}
      {editProduct && <ProductModal product={editProduct} onClose={() => setEditProduct(null)} onDone={onSaved} />}
        </>
      )}
    </div>
  );
}

function ProductModal({ product, onClose, onDone }) {
  const isEdit = !!product;
  const [sku, setSku] = useState(product?.sku || "");
  const [name, setName] = useState(product?.name || "");
  const [itemKind, setItemKind] = useState(product?.item_kind || "finished_good");
  const [uom, setUom] = useState(product?.uom || "each");
  const [costPrice, setCostPrice] = useState(product?.cost_price ?? "");
  const [sellingPrice, setSellingPrice] = useState(product?.selling_price ?? "");
  const [lowStockAlert, setLowStockAlert] = useState(product?.low_stock_alert ?? "0");
  const [isActive, setIsActive] = useState(product ? !!product.is_active : true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [uoms, setUoms] = useState([]);
  const codeField = useCodePreview("product", isEdit ? product.product_code : null);

  useEffect(() => {
    uomsApi.list({}).then((data) => setUoms(data.items || [])).catch(() => {});
  }, []);

  async function submit(e) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    if (codeField.mode === "manual" && !isEdit && !codeField.value.trim()) {
      setError("Enter a product code.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const body = {
        sku: sku || undefined,
        name: name.trim(),
        item_kind: itemKind,
        uom,
        cost_price: costPrice === "" ? null : Number(costPrice),
        selling_price: sellingPrice === "" ? null : Number(sellingPrice),
        low_stock_alert: lowStockAlert === "" ? 0 : Number(lowStockAlert),
        product_code: codeField.mode === "manual" && !isEdit ? codeField.value.trim() : undefined,
        is_active: isEdit ? isActive : undefined,
      };
      if (isEdit) {
        await productsApi.update(product.product_id, body);
      } else {
        await productsApi.create(body);
      }
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save this product.");
      setSubmitting(false);
    }
  }

  return (
    <Modal title={isEdit ? `Edit — ${product.name}` : "Add product"} onClose={onClose}>
      <form onSubmit={submit} className="bp-form">
        {error && <div className="bp-inline-error">{error}</div>}

        <CodeField label="Product code" field={codeField} isEdit={isEdit} />

        <div className="bp-form-row">
          <div style={{ flex: 1 }}>
            <label className="bp-field-label" htmlFor="pSku">SKU (optional)</label>
            <input id="pSku" type="text" className="bp-field-input" value={sku} onChange={(e) => setSku(e.target.value)} disabled={isEdit} />
          </div>
          <div style={{ flex: 2 }}>
            <label className="bp-field-label" htmlFor="pName">Name</label>
            <input id="pName" type="text" className="bp-field-input" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
          </div>
        </div>

        <div className="bp-form-row">
          <div style={{ flex: 1 }}>
            <label className="bp-field-label" htmlFor="pKind">Kind</label>
            <select id="pKind" className="bp-field-input" value={itemKind} onChange={(e) => setItemKind(e.target.value)}>
              <option value="finished_good">Finished good</option>
              <option value="raw_material">Raw material</option>
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label className="bp-field-label" htmlFor="pUom">Unit of measure</label>
            <select id="pUom" className="bp-field-input" value={uom} onChange={(e) => setUom(e.target.value)}>
              {uoms.map((u) => <option key={u.uom_id} value={u.code}>{u.label}</option>)}
              {uom && !uoms.some((u) => u.code === uom) && <option value={uom}>{uom}</option>}
            </select>
          </div>
        </div>

        <div className="bp-form-row">
          <div style={{ flex: 1 }}>
            <label className="bp-field-label" htmlFor="pCost">Cost price (₹)</label>
            <input id="pCost" type="number" min="0" step="0.01" className="bp-field-input" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label className="bp-field-label" htmlFor="pSelling">Selling price (₹)</label>
            <input id="pSelling" type="number" min="0" step="0.01" className="bp-field-input" value={sellingPrice} onChange={(e) => setSellingPrice(e.target.value)} />
          </div>
        </div>

        <label className="bp-field-label" htmlFor="pLowStock">Low stock alert threshold</label>
        <input id="pLowStock" type="number" min="0" step="0.01" className="bp-field-input" value={lowStockAlert} onChange={(e) => setLowStockAlert(e.target.value)} />

        {isEdit && (
          <label className="bp-field-label" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            Active
          </label>
        )}

        <div className="bp-form-actions">
          <button type="button" className="bp-btn-outline" onClick={onClose} disabled={submitting}>Cancel</button>
          <button type="submit" className="bp-btn-primary" disabled={submitting}>{submitting ? "Saving…" : isEdit ? "Save changes" : "Add product"}</button>
        </div>
      </form>
    </Modal>
  );
}

function UomTab() {
  const { hasPermission } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingLabel, setEditingLabel] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await uomsApi.list({ includeInactive: true });
      setItems(data.items || []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load units.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function addUom(e) {
    e.preventDefault();
    if (!newCode.trim() || !newLabel.trim()) return;
    setBusy(true);
    setError("");
    try {
      await uomsApi.create({ code: newCode.trim(), label: newLabel.trim() });
      setNewCode("");
      setNewLabel("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not add this unit.");
    } finally {
      setBusy(false);
    }
  }

  function startEdit(u) {
    setEditingId(u.uom_id);
    setEditingLabel(u.label);
  }

  async function saveEdit(id) {
    if (!editingLabel.trim()) return;
    setBusy(true);
    setError("");
    try {
      await uomsApi.update(id, { label: editingLabel.trim() });
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not rename this unit.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(u) {
    setBusy(true);
    setError("");
    try {
      await uomsApi.update(u.uom_id, { is_active: !u.is_active });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update this unit.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(u) {
    if (!window.confirm(`Delete unit "${u.label}"?`)) return;
    setBusy(true);
    setError("");
    try {
      await uomsApi.remove(u.uom_id);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete this unit.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {error && <div className="bp-inline-error">{error}</div>}

      <div className="bp-table-wrap" style={{ marginBottom: 14 }}>
        <table className="bp-table">
          <thead>
            <tr><th>Code</th><th>Label</th><th>Active</th><th></th></tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="bp-table-empty">Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={4} className="bp-table-empty">No units yet.</td></tr>
            ) : (
              items.map((u) => (
                <tr key={u.uom_id} style={{ opacity: u.is_active ? 1 : 0.55 }}>
                  <td className="bp-td-muted">{u.code}</td>
                  <td>
                    {editingId === u.uom_id ? (
                      <input
                        type="text"
                        className="bp-field-input"
                        value={editingLabel}
                        onChange={(e) => setEditingLabel(e.target.value)}
                        autoFocus
                      />
                    ) : (
                      u.label
                    )}
                  </td>
                  <td className="bp-td-muted">{u.is_active ? "Yes" : "No"}</td>
                  <td className="bp-td-actions">
                    {editingId === u.uom_id ? (
                      <>
                        <button type="button" className="bp-btn-sm" onClick={() => saveEdit(u.uom_id)} disabled={busy}>Save</button>
                        <button type="button" className="bp-btn-sm" onClick={() => setEditingId(null)} disabled={busy}>Cancel</button>
                      </>
                    ) : (
                      <>
                        <button type="button" className="bp-btn-sm" onClick={() => startEdit(u)} disabled={busy}>Rename</button>
                        {hasPermission("products.manage", "full_control") && (
                          <>
                            <button type="button" className="bp-btn-sm" onClick={() => toggleActive(u)} disabled={busy}>
                              {u.is_active ? "Deactivate" : "Activate"}
                            </button>
                            <button type="button" className="bp-btn-sm" onClick={() => remove(u)} disabled={busy}>Delete</button>
                          </>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <form onSubmit={addUom} className="bp-form-row" style={{ alignItems: "flex-end" }}>
        <div style={{ flex: 1 }}>
          <label className="bp-field-label" htmlFor="uomCode">Code</label>
          <input id="uomCode" type="text" className="bp-field-input" value={newCode} onChange={(e) => setNewCode(e.target.value)} placeholder="e.g. litre" />
        </div>
        <div style={{ flex: 2 }}>
          <label className="bp-field-label" htmlFor="uomLabel">Label</label>
          <input id="uomLabel" type="text" className="bp-field-input" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="e.g. Litre" />
        </div>
        <button type="submit" className="bp-btn-primary" disabled={busy || !newCode.trim() || !newLabel.trim()}>+ Add</button>
      </form>
    </div>
  );
}

function BomTab() {
  const { admin, hasPermission } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editBom, setEditBom] = useState(null);
  const [busy, setBusy] = useState(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await bomsApi.list({ includeInactive: true });
      setItems(data.items || []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load BOMs.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onSaved() {
    setShowAdd(false);
    setEditBom(null);
    await load();
  }

  async function toggleActive(b) {
    await bomsApi.update(b.bom_id, { is_active: !b.is_active });
    await load();
  }

  async function approve(b) {
    setBusy(b.bom_id);
    setError("");
    try {
      await bomsApi.approve(b.bom_id);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not approve this BOM.");
    } finally {
      setBusy(null);
    }
  }

  async function remove(b) {
    if (!window.confirm(`Delete BOM "${b.bom_name}"?`)) return;
    try {
      await bomsApi.remove(b.bom_id);
      await load();
    } catch (err) {
      window.alert(err instanceof ApiError ? err.message : "Could not delete this BOM.");
    }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
        <button type="button" className="bp-btn-primary" onClick={() => setShowAdd(true)}>+ Add BOM</button>
      </div>

      {error && <div className="bp-inline-error">{error}</div>}

      <div className="bp-table-wrap">
        <table className="bp-table">
          <thead>
            <tr><th>Product</th><th>BOM name</th><th>Output qty</th><th>Status</th><th>Active</th><th></th></tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="bp-table-empty">Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={6} className="bp-table-empty">No BOMs yet.</td></tr>
            ) : (
              items.map((b) => (
                <tr key={b.bom_id} onClick={() => setEditBom(b)} style={{ cursor: "pointer", opacity: b.is_active ? 1 : 0.55 }}>
                  <td className="bp-td-strong">{b.product_name}</td>
                  <td>{b.bom_name}</td>
                  <td className="bp-td-muted">{b.output_qty} {b.product_uom}</td>
                  <td>
                    <span className={`bp-badge ${b.status === "approved" ? "bp-badge-success" : "bp-badge-warning"}`}>
                      {b.status === "approved" ? "Approved" : "Draft"}
                    </span>
                  </td>
                  <td className="bp-td-muted">{b.is_active ? "Yes" : "No"}</td>
                  <td className="bp-td-actions">
                    <button type="button" className="bp-btn-sm" onClick={(e) => { e.stopPropagation(); setEditBom(b); }}>Edit</button>
                    {b.status === "draft" && hasPermission("products.manage", "full_control") && (
                      <button type="button" className="bp-btn-sm" onClick={(e) => { e.stopPropagation(); approve(b); }} disabled={busy === b.bom_id}>
                        {busy === b.bom_id ? "Approving…" : "Approve"}
                      </button>
                    )}
                    {hasPermission("products.manage", "full_control") && (
                      <button type="button" className="bp-btn-sm" onClick={(e) => { e.stopPropagation(); toggleActive(b); }}>
                        {b.is_active ? "Deactivate" : "Activate"}
                      </button>
                    )}
                    {b.status === "draft" && admin?.role === "owner" && (
                      <button type="button" className="bp-btn-sm" onClick={(e) => { e.stopPropagation(); remove(b); }} title="Delete" aria-label="Delete">🗑</button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showAdd && <BomModal onClose={() => setShowAdd(false)} onDone={onSaved} />}
      {editBom && <BomModal bomSummary={editBom} onClose={() => setEditBom(null)} onDone={onSaved} />}
    </div>
  );
}

function BomModal({ bomSummary, onClose, onDone }) {
  const isEdit = !!bomSummary;
  const [loading, setLoading] = useState(isEdit);
  const [products, setProducts] = useState([]);
  const [productId, setProductId] = useState(bomSummary?.product_id || "");
  const [bomName, setBomName] = useState(bomSummary?.bom_name || "");
  const [outputQty, setOutputQty] = useState(bomSummary?.output_qty ?? "1");
  const [lines, setLines] = useState([{ raw_material_product_id: "", quantity: "" }]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    productsApi.list({ limit: 500, includeInactive: false }).then((data) => setProducts(data.items || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    bomsApi.get(bomSummary.bom_id)
      .then((data) => {
        setLines((data.lines || []).map((l) => ({ raw_material_product_id: l.raw_material_product_id, quantity: String(l.quantity) })));
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load this BOM."))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finishedGoods = products.filter((p) => p.item_kind === "finished_good");
  const rawMaterials = products.filter((p) => p.item_kind === "raw_material");

  function updateLine(idx, field, value) {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, [field]: value } : l)));
  }

  function addLine() {
    setLines((prev) => [...prev, { raw_material_product_id: "", quantity: "" }]);
  }

  function removeLine(idx) {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  }

  async function submit(e) {
    e.preventDefault();
    if (!productId) return setError("Choose the finished good this BOM produces.");
    if (!bomName.trim()) return setError("Enter a name for this BOM.");
    if (!outputQty || Number(outputQty) <= 0) return setError("Output quantity must be greater than zero.");
    const cleanLines = lines.filter((l) => l.raw_material_product_id && l.quantity);
    if (cleanLines.length === 0) return setError("Add at least one raw material line.");
    if (cleanLines.some((l) => Number(l.quantity) <= 0)) return setError("Every line's quantity must be greater than zero.");

    setSubmitting(true);
    setError("");
    try {
      const body = {
        product_id: productId,
        bom_name: bomName.trim(),
        output_qty: Number(outputQty),
        lines: cleanLines.map((l) => ({ raw_material_product_id: l.raw_material_product_id, quantity: Number(l.quantity) })),
      };
      if (isEdit) {
        await bomsApi.update(bomSummary.bom_id, body);
      } else {
        await bomsApi.create(body);
      }
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save this BOM.");
      setSubmitting(false);
    }
  }

  const selectedProduct = products.find((p) => p.product_id === productId);

  return (
    <Modal title={isEdit ? `Edit BOM — ${bomSummary.bom_name}` : "Add BOM"} onClose={onClose}>
      {loading ? (
        <div>Loading…</div>
      ) : (
        <form onSubmit={submit} className="bp-form">
          {error && <div className="bp-inline-error">{error}</div>}
          {isEdit && bomSummary.status === "approved" && (
            <p className="bp-td-muted" style={{ fontSize: 12, margin: "0 0 10px" }}>
              This BOM is approved. Changing the name, output quantity, or lines will move it back to Draft for re-approval.
            </p>
          )}

          <div className="bp-form-row">
            <div style={{ flex: 2 }}>
              <label className="bp-field-label" htmlFor="bomProduct">Finished good</label>
              <select id="bomProduct" className="bp-field-input" value={productId} onChange={(e) => setProductId(e.target.value)} disabled={isEdit}>
                <option value="">Select a product…</option>
                {finishedGoods.map((p) => <option key={p.product_id} value={p.product_id}>{p.name}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label className="bp-field-label" htmlFor="bomOutputQty">Output qty {selectedProduct ? `(${selectedProduct.uom})` : ""}</label>
              <input id="bomOutputQty" type="number" min="0" step="0.001" className="bp-field-input" value={outputQty} onChange={(e) => setOutputQty(e.target.value)} />
            </div>
          </div>

          <label className="bp-field-label" htmlFor="bomName">BOM name</label>
          <input id="bomName" type="text" className="bp-field-input" value={bomName} onChange={(e) => setBomName(e.target.value)} placeholder="e.g. Standard batch" autoFocus />

          <label className="bp-field-label" style={{ marginTop: 10 }}>Raw materials consumed</label>
          {lines.map((line, idx) => (
            <div key={idx} className="bp-form-row" style={{ alignItems: "flex-end" }}>
              <div style={{ flex: 2 }}>
                <select
                  className="bp-field-input"
                  value={line.raw_material_product_id}
                  onChange={(e) => updateLine(idx, "raw_material_product_id", e.target.value)}
                >
                  <option value="">Select raw material…</option>
                  {rawMaterials.map((p) => <option key={p.product_id} value={p.product_id}>{p.name}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <input
                  type="number"
                  min="0"
                  step="0.001"
                  className="bp-field-input"
                  placeholder="Qty"
                  value={line.quantity}
                  onChange={(e) => updateLine(idx, "quantity", e.target.value)}
                />
              </div>
              <button type="button" className="bp-btn-sm" onClick={() => removeLine(idx)} disabled={lines.length === 1}>Remove</button>
            </div>
          ))}
          <button type="button" className="bp-btn-sm" onClick={addLine} style={{ alignSelf: "flex-start" }}>+ Add line</button>

          <div className="bp-form-actions">
            <button type="button" className="bp-btn-outline" onClick={onClose} disabled={submitting}>Cancel</button>
            <button type="submit" className="bp-btn-primary" disabled={submitting}>{submitting ? "Saving…" : isEdit ? "Save changes" : "Add BOM"}</button>
          </div>
        </form>
      )}
    </Modal>
  );
}
