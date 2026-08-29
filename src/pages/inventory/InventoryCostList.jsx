import { useEffect, useState } from "react";
import { inventoryCostApi } from "../../api/admin";
import { ApiError } from "../../api/client";
import { formatDate } from "../../utils/date";
import ExportMenu from "../../components/ExportMenu";
import ProductPicker from "../../components/ProductPicker";
import { useDataTable, ColumnHeader, ColumnChooserButton } from "../../components/DataTable";
import { RunDetailModal } from "../production/ProductionRunsList";

function inr(n) {
  return "₹" + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const ITEM_KIND_LABELS = { finished_good: "Finished Good", raw_material: "Raw Material" };

const PRODUCT_CSV_COLUMNS = [
  { label: "Code", accessor: (r) => r.product_code },
  { label: "Product", accessor: (r) => r.name },
  { label: "Type", accessor: (r) => ITEM_KIND_LABELS[r.item_kind] || r.item_kind },
  { label: "UOM", accessor: (r) => r.uom },
  { label: "Current Unit Cost", accessor: (r) => r.current_unit_cost },
  { label: "Source", accessor: (r) => r.cost_source },
];

const RUN_CSV_COLUMNS = [
  { label: "Run ID", accessor: (r) => r.run_number || "" },
  { label: "Date", accessor: (r) => formatDate(r.run_date) },
  { label: "Product", accessor: (r) => r.product_name },
  { label: "Actual Qty", accessor: (r) => r.actual_quantity },
  { label: "Material Cost", accessor: (r) => r.material_cost },
  { label: "Labour Cost", accessor: (r) => r.labour_cost },
  { label: "Overhead", accessor: (r) => r.overhead_cost },
  { label: "Total Cost", accessor: (r) => r.total_cost },
  { label: "Cost / Unit", accessor: (r) => r.cost_per_unit },
];

// Read-only management view answering exactly two questions: what does
// each product currently cost, and what did each completed production
// run actually cost. No editing anywhere on this page, no new cost
// table, no FIFO/weighted-average/standard-costing — reuses
// products.cost_price (kept current by PO receipt + production
// completion, see backend production-runs.js) and the frozen
// production_run_cost_lines snapshot rows. See the owner's own spec for
// the full set of rules this page must follow.
export default function InventoryCostList() {
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState("");
  const [itemKind, setItemKind] = useState("");
  const [productQ, setProductQ] = useState("");

  const [runs, setRuns] = useState([]);
  const [runsLoading, setRunsLoading] = useState(true);
  const [runsError, setRunsError] = useState("");
  const [runProductId, setRunProductId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [viewRunId, setViewRunId] = useState(null);

  async function loadProducts() {
    setProductsLoading(true);
    setProductsError("");
    try {
      const data = await inventoryCostApi.products({ itemKind: itemKind || undefined, q: productQ || undefined, limit: 200 });
      setProducts(data.items || []);
    } catch (err) {
      setProductsError(err instanceof ApiError ? err.message : "Could not load product costs.");
    } finally {
      setProductsLoading(false);
    }
  }

  async function loadRuns() {
    setRunsLoading(true);
    setRunsError("");
    try {
      const data = await inventoryCostApi.productionRuns({
        productId: runProductId || undefined,
        from: from || undefined,
        to: to || undefined,
        limit: 100,
      });
      setRuns(data.items || []);
    } catch (err) {
      setRunsError(err instanceof ApiError ? err.message : "Could not load production cost history.");
    } finally {
      setRunsLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemKind, productQ]);

  useEffect(() => {
    loadRuns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runProductId, from, to]);

  const productColumns = [
    { key: "name", label: "Product", accessor: (r) => r.name },
    { key: "product_code", label: "Code", accessor: (r) => r.product_code || "" },
    { key: "item_kind", label: "Type", accessor: (r) => ITEM_KIND_LABELS[r.item_kind] || r.item_kind },
    { key: "uom", label: "UOM", accessor: (r) => r.uom },
    { key: "current_unit_cost", label: "Current Unit Cost", accessor: (r) => r.current_unit_cost, filter: "number" },
    { key: "cost_source", label: "Source", accessor: (r) => r.cost_source },
  ];
  const productTable = useDataTable({ rows: products, columns: productColumns, rowKey: (r) => r.product_id });

  const runColumns = [
    { key: "run_number", label: "Run ID", accessor: (r) => r.run_number || "" },
    { key: "run_date", label: "Date", accessor: (r) => formatDate(r.run_date) },
    { key: "product_name", label: "Product", accessor: (r) => r.product_name },
    { key: "actual_quantity", label: "Actual Qty", accessor: (r) => r.actual_quantity, filter: "number" },
    { key: "material_cost", label: "Material", accessor: (r) => r.material_cost, filter: "number" },
    { key: "labour_cost", label: "Labour", accessor: (r) => r.labour_cost, filter: "number" },
    { key: "overhead_cost", label: "Overhead", accessor: (r) => r.overhead_cost, filter: "number" },
    { key: "total_cost", label: "Total Cost", accessor: (r) => r.total_cost, filter: "number" },
    { key: "cost_per_unit", label: "Cost/Unit", accessor: (r) => r.cost_per_unit, filter: "number" },
  ];
  const runTable = useDataTable({ rows: runs, columns: runColumns, rowKey: (r) => r.run_id });

  return (
    <div>
      <h1 className="bp-page-title">Cost</h1>
      <p className="bp-td-muted" style={{ margin: "-6px 0 14px" }}>
        What each product currently costs, and what each completed production run actually cost. View only.
      </p>

      <div className="bp-card" style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
          <h2 className="bp-card-title" style={{ margin: 0 }}>Current Product Cost</h2>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <select className="bp-field-input" style={{ width: 170 }} value={itemKind} onChange={(e) => setItemKind(e.target.value)}>
              <option value="">All types</option>
              <option value="finished_good">Finished Good</option>
              <option value="raw_material">Raw Material</option>
            </select>
            <input
              type="text"
              className="bp-field-input"
              style={{ width: 220 }}
              placeholder="Search by code or name…"
              value={productQ}
              onChange={(e) => setProductQ(e.target.value)}
            />
            <ExportMenu filename="product-cost" columns={PRODUCT_CSV_COLUMNS} rows={products} />
          </div>
        </div>

        {productsError && <div className="bp-inline-error">{productsError}</div>}

        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
          <ColumnChooserButton table={productTable} columns={productColumns} />
        </div>

        <div className="bp-table-wrap">
          <table className="bp-table">
            <thead>
              <tr>
                {productColumns.map((c) => productTable.isColumnVisible(c.key) && <ColumnHeader key={c.key} table={productTable} column={c} />)}
              </tr>
            </thead>
            <tbody>
              {productsLoading ? (
                <tr><td colSpan={productColumns.length} className="bp-table-empty">Loading…</td></tr>
              ) : productTable.filteredRows.length === 0 ? (
                <tr><td colSpan={productColumns.length} className="bp-table-empty">No products found.</td></tr>
              ) : (
                productTable.filteredRows.map((p) => (
                  <tr key={p.product_id}>
                    {productTable.isColumnVisible("name") && <td>{p.name}</td>}
                    {productTable.isColumnVisible("product_code") && <td className="bp-td-muted">{p.product_code}</td>}
                    {productTable.isColumnVisible("item_kind") && <td className="bp-td-muted">{ITEM_KIND_LABELS[p.item_kind] || p.item_kind}</td>}
                    {productTable.isColumnVisible("uom") && <td className="bp-td-muted">{p.uom}</td>}
                    {productTable.isColumnVisible("current_unit_cost") && <td className="bp-td-strong">{inr(p.current_unit_cost)}</td>}
                    {productTable.isColumnVisible("cost_source") && <td className="bp-td-muted">{p.cost_source}</td>}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bp-card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
          <h2 className="bp-card-title" style={{ margin: 0 }}>Production Cost</h2>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ width: 220 }}>
              <ProductPicker
                value={runProductId}
                onChange={(id) => setRunProductId(id)}
                itemKind="finished_good"
                placeholder="Filter by product…"
              />
            </div>
            <input type="date" className="bp-field-input" style={{ width: 150 }} value={from} onChange={(e) => setFrom(e.target.value)} title="From date" />
            <input type="date" className="bp-field-input" style={{ width: 150 }} value={to} onChange={(e) => setTo(e.target.value)} title="To date" />
            <ExportMenu filename="production-cost" columns={RUN_CSV_COLUMNS} rows={runs} />
          </div>
        </div>
        <p className="bp-td-muted" style={{ marginTop: -6, marginBottom: 12 }}>
          Completed production runs only — an in-progress run has no final cost yet.
        </p>

        {runsError && <div className="bp-inline-error">{runsError}</div>}

        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
          <ColumnChooserButton table={runTable} columns={runColumns} />
        </div>

        <div className="bp-table-wrap">
          <table className="bp-table">
            <thead>
              <tr>
                {runColumns.map((c) => runTable.isColumnVisible(c.key) && <ColumnHeader key={c.key} table={runTable} column={c} />)}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {runsLoading ? (
                <tr><td colSpan={runColumns.length + 1} className="bp-table-empty">Loading…</td></tr>
              ) : runTable.filteredRows.length === 0 ? (
                <tr><td colSpan={runColumns.length + 1} className="bp-table-empty">No completed production runs found.</td></tr>
              ) : (
                runTable.filteredRows.map((r) => (
                  <tr key={r.run_id}>
                    {runTable.isColumnVisible("run_number") && <td>{r.run_number || "—"}</td>}
                    {runTable.isColumnVisible("run_date") && <td className="bp-td-muted">{formatDate(r.run_date)}</td>}
                    {runTable.isColumnVisible("product_name") && <td>{r.product_name}</td>}
                    {runTable.isColumnVisible("actual_quantity") && <td className="bp-td-muted">{r.actual_quantity} {r.uom}</td>}
                    {runTable.isColumnVisible("material_cost") && <td className="bp-td-muted">{inr(r.material_cost)}</td>}
                    {runTable.isColumnVisible("labour_cost") && <td className="bp-td-muted">{inr(r.labour_cost)}</td>}
                    {runTable.isColumnVisible("overhead_cost") && <td className="bp-td-muted">{inr(r.overhead_cost)}</td>}
                    {runTable.isColumnVisible("total_cost") && <td className="bp-td-strong">{inr(r.total_cost)}</td>}
                    {runTable.isColumnVisible("cost_per_unit") && <td className="bp-td-strong">{inr(r.cost_per_unit)}</td>}
                    <td><button type="button" className="bp-btn-sm" onClick={() => setViewRunId(r.run_id)}>View</button></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {viewRunId && (
        <RunDetailModal runId={viewRunId} onClose={() => setViewRunId(null)} onChanged={loadRuns} />
      )}
    </div>
  );
}
