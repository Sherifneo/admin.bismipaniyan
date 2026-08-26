import { useEffect, useState } from "react";
import { reportsApi, locationsApi, productsApi } from "../../api/admin";
import { ApiError } from "../../api/client";
import ExportMenu from "../../components/ExportMenu";
import Pagination from "../../components/Pagination";
import { useDataTable, SearchByBar, ColumnHeader, SelectAllHeaderCell, SelectRowCell } from "../../components/DataTable";
import { formatDate } from "../../utils/date";

const LIMIT = 30;

function inr(n) {
  return "₹" + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

const TABS = [
  { key: "cashbook", label: "Cash Book Summary" },
  { key: "stock", label: "Stock Movements" },
  { key: "po", label: "Purchase Orders by Status" },
  { key: "dimension", label: "By Financial Dimension" },
];

// Deliberately simple — three read-only report views over existing data,
// each a table + CSV export. No BI tooling, no date-range picker library
// (plain <input type="date"> pairs, matching the rest of the app).
export default function ReportsPage() {
  const [tab, setTab] = useState("cashbook");

  return (
    <div>
      <h1 className="bp-page-title">Reports</h1>

      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={tab === t.key ? "bp-btn-sm bp-btn-primary" : "bp-btn-sm bp-btn-outline"}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "cashbook" && <CashbookSummaryTab />}
      {tab === "stock" && <StockMovementsTab />}
      {tab === "po" && <PurchaseOrdersByStatusTab />}
      {tab === "dimension" && <FinancialDimensionSummaryTab />}
    </div>
  );
}

const CASHBOOK_CSV_COLUMNS = [
  { label: "Date", accessor: (r) => r.entry_date },
  { label: "Income", accessor: (r) => r.total_income },
  { label: "Expense", accessor: (r) => r.total_expense },
  { label: "Net", accessor: (r) => r.net },
];

function CashbookSummaryTab() {
  const [locations, setLocations] = useState([]);
  const [locationId, setLocationId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    locationsApi.list().then(setLocations).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    setError("");
    reportsApi
      .cashbookSummary({ from, to, locationId })
      .then(setData)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load this report."))
      .finally(() => setLoading(false));
  }, [from, to, locationId]);

  const items = data?.items || [];
  const columns = [
    { key: "entry_date", label: "Date", accessor: (r) => r.entry_date, filter: "dateRange" },
    { key: "total_income", label: "Income", accessor: (r) => r.total_income, filter: "number" },
    { key: "total_expense", label: "Expense", accessor: (r) => r.total_expense, filter: "number" },
    { key: "net", label: "Net", accessor: (r) => r.net, filter: "number" },
  ];
  const table = useDataTable({ rows: items, columns, rowKey: (r) => r.entry_date });

  return (
    <div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10, flexWrap: "wrap" }}>
        <select className="bp-field-input" style={{ width: "auto" }} value={locationId} onChange={(e) => setLocationId(e.target.value)}>
          <option value="">All locations</option>
          {locations.map((l) => <option key={l.location_id} value={l.location_id}>{l.name}</option>)}
        </select>
        <input type="date" className="bp-field-input" style={{ width: "auto" }} value={from} onChange={(e) => setFrom(e.target.value)} />
        <span className="bp-td-muted">to</span>
        <input type="date" className="bp-field-input" style={{ width: "auto" }} value={to} onChange={(e) => setTo(e.target.value)} />
        {table.selectedRows.length > 0 && (
          <button type="button" className="bp-btn-sm bp-btn-outline" onClick={() => table.exportSelected("cashbook-summary")}>
            Export selected ({table.selectedRows.length})
          </button>
        )}
        <ExportMenu filename="cashbook-summary" rows={items} columns={CASHBOOK_CSV_COLUMNS} />
      </div>

      {error && <div className="bp-inline-error">{error}</div>}

      {data && (
        <div className="bp-kpi-grid" style={{ marginBottom: 14 }}>
          <div className="bp-kpi-card bp-kpi-success">
            <div className="bp-kpi-label">Total income</div>
            <div className="bp-kpi-value">{inr(data.total_income)}</div>
          </div>
          <div className="bp-kpi-card bp-kpi-danger">
            <div className="bp-kpi-label">Total expense</div>
            <div className="bp-kpi-value">{inr(data.total_expense)}</div>
          </div>
          <div className="bp-kpi-card">
            <div className="bp-kpi-label">Net</div>
            <div className="bp-kpi-value">{inr(data.net)}</div>
          </div>
        </div>
      )}

      <SearchByBar table={table} columns={columns} />

      <div className="bp-table-wrap">
        <table className="bp-table">
          <thead>
            <tr>
              <SelectAllHeaderCell table={table} />
              <ColumnHeader table={table} column={columns[0]} />
              <ColumnHeader table={table} column={columns[1]} />
              <ColumnHeader table={table} column={columns[2]} />
              <ColumnHeader table={table} column={columns[3]} />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="bp-table-empty">Loading…</td></tr>
            ) : table.filteredRows.length === 0 ? (
              <tr><td colSpan={5} className="bp-table-empty">No cash book entries in this range.</td></tr>
            ) : (
              table.filteredRows.map((r) => (
                <tr key={r.entry_date}>
                  <SelectRowCell table={table} row={r} />
                  <td className="bp-td-muted">{formatDate(r.entry_date)}</td>
                  <td>{inr(r.total_income)}</td>
                  <td>{inr(r.total_expense)}</td>
                  <td className="bp-td-strong">{inr(r.net)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const STOCK_CSV_COLUMNS = [
  { label: "Date", accessor: (r) => r.entry_date },
  { label: "Product", accessor: (r) => r.product_name },
  { label: "SKU", accessor: (r) => r.sku },
  { label: "Location", accessor: (r) => r.location_name },
  { label: "Type", accessor: (r) => r.movement_type },
  { label: "Qty delta", accessor: (r) => r.qty_delta },
  { label: "Note", accessor: (r) => r.note },
];

const MOVEMENT_TYPE_OPTIONS = [
  { value: "production_in", label: "production_in" },
  { value: "production_consume", label: "production_consume" },
  { value: "purchase_in", label: "purchase_in" },
  { value: "transfer_in", label: "transfer_in" },
  { value: "transfer_out", label: "transfer_out" },
  { value: "sale", label: "sale" },
  { value: "wastage", label: "wastage" },
  { value: "adjustment", label: "adjustment" },
];

function StockMovementsTab() {
  const [products, setProducts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [productId, setProductId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    productsApi.list({ limit: 500 }).then((d) => setProducts(d.items || [])).catch(() => {});
    locationsApi.list().then(setLocations).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    setError("");
    reportsApi
      .stockMovements({ productId, locationId, from, to, page, limit: LIMIT })
      .then((d) => {
        setItems(d.items || []);
        setTotal(d.total || 0);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load this report."))
      .finally(() => setLoading(false));
  }, [productId, locationId, from, to, page]);

  const columns = [
    { key: "entry_date", label: "Date", accessor: (r) => r.entry_date, filter: "dateRange" },
    { key: "product_name", label: "Product", accessor: (r) => r.product_name },
    { key: "sku", label: "SKU", accessor: (r) => r.sku || "" },
    { key: "location_name", label: "Location", accessor: (r) => r.location_name },
    { key: "movement_type", label: "Type", accessor: (r) => r.movement_type, filter: "select", options: MOVEMENT_TYPE_OPTIONS },
    { key: "qty_delta", label: "Qty delta", accessor: (r) => r.qty_delta, filter: "number" },
    { key: "note", label: "Note", accessor: (r) => r.note || "" },
  ];
  const table = useDataTable({ rows: items, columns, rowKey: (r) => r.movement_id });

  return (
    <div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10, flexWrap: "wrap" }}>
        <select className="bp-field-input" style={{ width: "auto" }} value={productId} onChange={(e) => { setProductId(e.target.value); setPage(1); }}>
          <option value="">All products</option>
          {products.map((p) => <option key={p.product_id} value={p.product_id}>{p.name}</option>)}
        </select>
        <select className="bp-field-input" style={{ width: "auto" }} value={locationId} onChange={(e) => { setLocationId(e.target.value); setPage(1); }}>
          <option value="">All locations</option>
          {locations.map((l) => <option key={l.location_id} value={l.location_id}>{l.name}</option>)}
        </select>
        <input type="date" className="bp-field-input" style={{ width: "auto" }} value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
        <span className="bp-td-muted">to</span>
        <input type="date" className="bp-field-input" style={{ width: "auto" }} value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} />
        {table.selectedRows.length > 0 && (
          <button type="button" className="bp-btn-sm bp-btn-outline" onClick={() => table.exportSelected("stock-movements")}>
            Export selected ({table.selectedRows.length})
          </button>
        )}
        <ExportMenu filename="stock-movements" rows={items} columns={STOCK_CSV_COLUMNS} />
      </div>

      {error && <div className="bp-inline-error">{error}</div>}

      <SearchByBar table={table} columns={columns} />

      <div className="bp-table-wrap">
        <table className="bp-table">
          <thead>
            <tr>
              <SelectAllHeaderCell table={table} />
              <ColumnHeader table={table} column={columns[0]} />
              <ColumnHeader table={table} column={columns[1]} />
              <ColumnHeader table={table} column={columns[2]} />
              <ColumnHeader table={table} column={columns[3]} />
              <ColumnHeader table={table} column={columns[4]} />
              <ColumnHeader table={table} column={columns[5]} />
              <ColumnHeader table={table} column={columns[6]} />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="bp-table-empty">Loading…</td></tr>
            ) : table.filteredRows.length === 0 ? (
              <tr><td colSpan={8} className="bp-table-empty">No stock movements found.</td></tr>
            ) : (
              table.filteredRows.map((r) => (
                <tr key={r.movement_id}>
                  <SelectRowCell table={table} row={r} />
                  <td className="bp-td-muted">{formatDate(r.entry_date)}</td>
                  <td className="bp-td-strong">{r.product_name}</td>
                  <td className="bp-td-muted">{r.sku}</td>
                  <td>{r.location_name}</td>
                  <td>{r.movement_type}</td>
                  <td>{r.qty_delta}</td>
                  <td className="bp-td-muted">{r.note || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} limit={LIMIT} total={total} onPageChange={setPage} />
    </div>
  );
}

const PO_STATUS_CSV_COLUMNS = [
  { label: "Status", accessor: (r) => r.status },
  { label: "Count", accessor: (r) => r.count },
  { label: "Total value", accessor: (r) => r.total_value },
];

function PurchaseOrdersByStatusTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    reportsApi
      .purchaseOrdersByStatus({})
      .then((d) => setItems(d.items || []))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load this report."))
      .finally(() => setLoading(false));
  }, []);

  const columns = [
    { key: "status", label: "Status", accessor: (r) => r.status },
    { key: "count", label: "Count", accessor: (r) => r.count, filter: "number" },
    { key: "total_value", label: "Total value", accessor: (r) => r.total_value, filter: "number" },
  ];
  const table = useDataTable({ rows: items, columns, rowKey: (r) => r.status });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10, gap: 8 }}>
        {table.selectedRows.length > 0 && (
          <button type="button" className="bp-btn-sm bp-btn-outline" onClick={() => table.exportSelected("purchase-orders-by-status")}>
            Export selected ({table.selectedRows.length})
          </button>
        )}
        <ExportMenu filename="purchase-orders-by-status" rows={items} columns={PO_STATUS_CSV_COLUMNS} />
      </div>

      {error && <div className="bp-inline-error">{error}</div>}

      <SearchByBar table={table} columns={columns} />

      <div className="bp-table-wrap">
        <table className="bp-table">
          <thead>
            <tr>
              <SelectAllHeaderCell table={table} />
              <ColumnHeader table={table} column={columns[0]} />
              <ColumnHeader table={table} column={columns[1]} />
              <ColumnHeader table={table} column={columns[2]} />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="bp-table-empty">Loading…</td></tr>
            ) : table.filteredRows.length === 0 ? (
              <tr><td colSpan={4} className="bp-table-empty">No purchase orders found.</td></tr>
            ) : (
              table.filteredRows.map((r) => (
                <tr key={r.status}>
                  <SelectRowCell table={table} row={r} />
                  <td className="bp-td-strong">{r.status}</td>
                  <td>{r.count}</td>
                  <td>{inr(r.total_value)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const DIMENSION_CSV_COLUMNS = [
  { label: "Dimension", accessor: (r) => r.dimension_name },
  { label: "Income", accessor: (r) => r.total_income },
  { label: "Expense", accessor: (r) => r.total_expense },
  { label: "Net", accessor: (r) => r.net },
];

// Company-wide income/expense grouped by financial dimension (Factory/
// Karaikal/Nagore/TRP Store/Corporate) instead of by day — "Karaikal's
// share of expense this month," answering the store-profitability
// requirement without ever filtering by location_id (which no longer
// means financial ownership — see cashbook_entries.financial_dimension_id).
function FinancialDimensionSummaryTab() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    reportsApi
      .financialDimensionSummary({ from, to })
      .then(setData)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load this report."))
      .finally(() => setLoading(false));
  }, [from, to]);

  const items = data?.items || [];
  const columns = [
    { key: "dimension_name", label: "Dimension", accessor: (r) => r.dimension_name },
    { key: "total_income", label: "Income", accessor: (r) => r.total_income, filter: "number" },
    { key: "total_expense", label: "Expense", accessor: (r) => r.total_expense, filter: "number" },
    { key: "net", label: "Net", accessor: (r) => r.net, filter: "number" },
  ];
  const table = useDataTable({ rows: items, columns, rowKey: (r) => r.dimension_id });

  return (
    <div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10, flexWrap: "wrap" }}>
        <input type="date" className="bp-field-input" style={{ width: "auto" }} value={from} onChange={(e) => setFrom(e.target.value)} />
        <span className="bp-td-muted">to</span>
        <input type="date" className="bp-field-input" style={{ width: "auto" }} value={to} onChange={(e) => setTo(e.target.value)} />
        {table.selectedRows.length > 0 && (
          <button type="button" className="bp-btn-sm bp-btn-outline" onClick={() => table.exportSelected("financial-dimension-summary")}>
            Export selected ({table.selectedRows.length})
          </button>
        )}
        <ExportMenu filename="financial-dimension-summary" rows={items} columns={DIMENSION_CSV_COLUMNS} />
      </div>

      {error && <div className="bp-inline-error">{error}</div>}

      {data && (
        <div className="bp-kpi-grid" style={{ marginBottom: 14 }}>
          <div className="bp-kpi-card bp-kpi-success">
            <div className="bp-kpi-label">Total income</div>
            <div className="bp-kpi-value">{inr(data.total_income)}</div>
          </div>
          <div className="bp-kpi-card bp-kpi-danger">
            <div className="bp-kpi-label">Total expense</div>
            <div className="bp-kpi-value">{inr(data.total_expense)}</div>
          </div>
          <div className="bp-kpi-card">
            <div className="bp-kpi-label">Net</div>
            <div className="bp-kpi-value">{inr(data.net)}</div>
          </div>
        </div>
      )}

      <SearchByBar table={table} columns={columns} />

      <div className="bp-table-wrap">
        <table className="bp-table">
          <thead>
            <tr>
              <SelectAllHeaderCell table={table} />
              <ColumnHeader table={table} column={columns[0]} />
              <ColumnHeader table={table} column={columns[1]} />
              <ColumnHeader table={table} column={columns[2]} />
              <ColumnHeader table={table} column={columns[3]} />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="bp-table-empty">Loading…</td></tr>
            ) : table.filteredRows.length === 0 ? (
              <tr><td colSpan={5} className="bp-table-empty">No financial dimensions found.</td></tr>
            ) : (
              table.filteredRows.map((r) => (
                <tr key={r.dimension_id}>
                  <SelectRowCell table={table} row={r} />
                  <td className="bp-td-strong">{r.dimension_name}</td>
                  <td>{inr(r.total_income)}</td>
                  <td>{inr(r.total_expense)}</td>
                  <td className="bp-td-strong">{inr(r.net)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
