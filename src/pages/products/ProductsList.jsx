import { useEffect, useState } from "react";
import { productsApi } from "../../api/admin";
import { ApiError } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import ExportMenu from "../../components/ExportMenu";
import Modal from "../../components/Modal";
import Pagination from "../../components/Pagination";
import SearchBox from "../../components/SearchBox";
import CodeField, { useCodePreview } from "../../components/CodeField";
import { useDataTable, SearchByBar, ColumnHeader, SelectAllHeaderCell, SelectRowCell, ColumnChooserButton } from "../../components/DataTable";
import { useUrlSearch } from "../../hooks/useUrlSearch";

const LIMIT = 20;

function inr(n) {
  return n === null || n === undefined || n === "" ? "—" : "₹" + Number(n).toLocaleString("en-IN");
}

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
    setLoading(true);
    setError("");
    try {
      const data = await productsApi.list({ page, limit: LIMIT, itemKind, q });
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
  }, [page, itemKind, q]);

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
    if (!window.confirm(`Remove ${product.name} from the product list?`)) return;
    await productsApi.remove(product.product_id);
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
      </div>

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
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={14} className="bp-table-empty">Loading…</td></tr>
            ) : table.filteredRows.length === 0 ? (
              <tr><td colSpan={14} className="bp-table-empty">No products found.</td></tr>
            ) : (
              table.filteredRows.map((p) => (
                <tr key={p.product_id} onClick={() => setEditProduct(p)} style={{ cursor: "pointer" }}>
                  <SelectRowCell table={table} row={p} />
                  {table.isColumnVisible("product_code") && <td className="bp-td-muted">{p.product_code || "—"}</td>}
                  {table.isColumnVisible("sku") && <td className="bp-td-muted">{p.sku || "—"}</td>}
                  {table.isColumnVisible("name") && <td className="bp-td-strong">{p.name}</td>}
                  {table.isColumnVisible("item_kind") && <td className="bp-td-muted" style={{ textTransform: "capitalize" }}>{p.item_kind.replace("_", " ")}</td>}
                  {table.isColumnVisible("uom") && <td className="bp-td-muted">{p.uom}</td>}
                  {table.isColumnVisible("cost_price") && <td>{inr(p.cost_price)}</td>}
                  {table.isColumnVisible("selling_price") && <td>{inr(p.selling_price)}</td>}
                  {table.isColumnVisible("low_stock_alert") && <td className="bp-td-muted">{p.low_stock_alert}</td>}
                  {table.isColumnVisible("created_by_name") && <td className="bp-td-muted">{p.created_by_name || "—"}</td>}
                  {table.isColumnVisible("created_at") && <td className="bp-td-muted">{p.created_at ? new Date(p.created_at).toLocaleString("en-IN") : "—"}</td>}
                  {table.isColumnVisible("updated_by_name") && <td className="bp-td-muted">{p.updated_by_name || "—"}</td>}
                  {table.isColumnVisible("updated_at") && <td className="bp-td-muted">{p.updated_at ? new Date(p.updated_at).toLocaleString("en-IN") : "—"}</td>}
                  <td className="bp-td-actions">
                    <button type="button" className="bp-btn-sm" onClick={(e) => { e.stopPropagation(); setEditProduct(p); }}>Edit</button>
                    {hasPermission("products.manage", "full_control") && (
                      <button type="button" className="bp-btn-sm" onClick={(e) => { e.stopPropagation(); remove(p); }}>Remove</button>
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
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const codeField = useCodePreview("product", isEdit ? product.product_code : null);

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
              <option value="each">Each</option>
              <option value="kg">Kg</option>
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

        <div className="bp-form-actions">
          <button type="button" className="bp-btn-outline" onClick={onClose} disabled={submitting}>Cancel</button>
          <button type="submit" className="bp-btn-primary" disabled={submitting}>{submitting ? "Saving…" : isEdit ? "Save changes" : "Add product"}</button>
        </div>
      </form>
    </Modal>
  );
}
