import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { reportsApi, locationsApi, productsApi } from "../../api/admin";
import { ApiError } from "../../api/client";
import ExportMenu from "../../components/ExportMenu";
import Pagination from "../../components/Pagination";
import { useDataTable, SearchByBar, ColumnHeader, SelectAllHeaderCell, SelectRowCell } from "../../components/DataTable";
import { formatDate } from "../../utils/date";

const LIMIT = 100;

function inr(n) {
  return "₹" + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

const TABS = [
  { key: "profit-loss", label: "Profit & Loss" },
  { key: "financial-position", label: "Financial Position" },
  { key: "cash-bank", label: "Cash & Bank" },
  { key: "payables-aging", label: "Payables" },
  { key: "inventory-production", label: "Inventory & Production" },
  { key: "cashbook", label: "Cash Book Summary" },
  { key: "stock", label: "Stock Movements" },
  { key: "po", label: "Purchase Orders by Status" },
  { key: "dimension", label: "By Financial Dimension" },
];

// Deliberately simple — three read-only report views over existing data,
// each a table + CSV export. No BI tooling, no date-range picker library
// (plain <input type="date"> pairs, matching the rest of the app).
export default function ReportsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "cashbook";
  function setTab(key) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("tab", key);
      return next;
    }, { replace: true });
  }

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

      {tab === "profit-loss" && <ProfitLossTab />}
      {tab === "financial-position" && <FinancialPositionTab />}
      {tab === "cash-bank" && <CashBankTab />}
      {tab === "payables-aging" && <PayablesAgingTab />}
      {tab === "inventory-production" && <InventoryProductionTab />}
      {tab === "cashbook" && <CashbookSummaryTab />}
      {tab === "stock" && <StockMovementsTab />}
      {tab === "po" && <PurchaseOrdersByStatusTab />}
      {tab === "dimension" && <FinancialDimensionSummaryTab />}
    </div>
  );
}

// ---- Profit & Loss -----------------------------------------------------
// Cash-basis management report — a plain indented statement, not a
// DataTable row list, matching the owner's requested layout.
function ProfitLossTab() {
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = today.slice(0, 8) + "01";
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    reportsApi
      .profitLoss({ from, to })
      .then(setData)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load this report."))
      .finally(() => setLoading(false));
  }, [from, to]);

  return (
    <div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}>
        <input type="date" className="bp-field-input" style={{ width: "auto" }} value={from} onChange={(e) => setFrom(e.target.value)} />
        <span className="bp-td-muted">to</span>
        <input type="date" className="bp-field-input" style={{ width: "auto" }} value={to} onChange={(e) => setTo(e.target.value)} />
      </div>
      <p className="bp-td-muted" style={{ fontSize: 12, margin: "0 0 16px" }}>
        Management P&L based on posted financial transactions and cash recognition dates — not a statutory/accrual statement.
      </p>

      {error && <div className="bp-inline-error">{error}</div>}
      {loading ? (
        <div className="bp-td-muted">Loading…</div>
      ) : data && (
        <div className="bp-statement" style={{ maxWidth: 520 }}>
          <StatementRow label="Sales" value={data.revenue.sales} />
          <StatementRow label="Partner Commission" value={data.revenue.partner_commission} />
          <StatementRow label="Total Revenue" value={data.revenue.total} strong />
          <StatementDivider />
          <StatementRow label="Cost of Goods Sold" value={data.cogs} negative />
          <StatementRow label="Gross Profit" value={data.gross_profit} strong />
          <StatementDivider />
          {data.expenses.length === 0 ? (
            <div className="bp-td-muted" style={{ padding: "4px 0" }}>No operating expenses in this range.</div>
          ) : (
            data.expenses.map((e) => <StatementRow key={e.category} label={e.category} value={e.amount} negative indent />)
          )}
          <StatementRow label="Total Operating Expenses" value={data.total_expenses} negative strong />
          <StatementDivider thick />
          <StatementRow label="Net Profit" value={data.net_profit} strong big />
        </div>
      )}
    </div>
  );
}

function StatementRow({ label, value, strong, negative, indent, big }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", paddingLeft: indent ? 16 : 0 }}>
      <span className={strong ? "bp-td-strong" : "bp-td-muted"} style={{ fontSize: big ? 16 : 14 }}>{label}</span>
      <span
        className={strong ? "bp-td-strong" : ""}
        style={{ fontSize: big ? 16 : 14, fontFeatureSettings: "'tnum'" }}
      >
        {negative ? "− " : ""}{inr(Math.abs(value))}
      </span>
    </div>
  );
}
function StatementDivider({ thick }) {
  return <div style={{ borderTop: thick ? "2px solid var(--bp-border, #ddd)" : "1px solid var(--bp-border, #eee)", margin: "6px 0" }} />;
}

// ---- Financial Position -------------------------------------------------
// Always "as of today" — no date picker. Inventory Value and Liabilities
// have no historical snapshot in this data model, so pairing them with a
// historical Cash/Bank figure under one selected date would misrepresent
// the report as more precise than it is.
function FinancialPositionTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    reportsApi
      .financialPosition()
      .then(setData)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load this report."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h2 className="bp-page-title" style={{ fontSize: 18, margin: "0 0 4px" }}>Financial Position — As of Today</h2>
      {error && <div className="bp-inline-error">{error}</div>}
      {loading ? (
        <div className="bp-td-muted">Loading…</div>
      ) : data && (
        <div className="bp-statement" style={{ maxWidth: 520, marginTop: 12 }}>
          <div className="bp-td-strong" style={{ marginBottom: 4 }}>Assets</div>
          <StatementRow label="Petty Cash + Bank Accounts" value={data.assets.cash_bank} indent />
          <StatementRow label="Inventory (Current Cost Estimate)" value={data.assets.inventory} indent />
          <StatementRow label="Total Assets" value={data.assets.total} strong />
          <StatementDivider />
          <div className="bp-td-strong" style={{ marginBottom: 4 }}>Liabilities</div>
          <StatementRow label="Vendor Payables" value={data.liabilities.vendor_payables} indent />
          <StatementRow label="Partner Payables" value={data.liabilities.partner_payables} indent />
          <StatementRow label="Total Liabilities" value={data.liabilities.total} strong />
          <StatementDivider thick />
          <StatementRow label="Net Business Position" value={data.net_business_position} strong big />
          <p className="bp-td-muted" style={{ fontSize: 12, marginTop: 8 }}>{data.note}</p>
        </div>
      )}
    </div>
  );
}

// ---- Cash & Bank ---------------------------------------------------------
const CASH_BANK_CSV_COLUMNS = [
  { label: "Financial Account", accessor: (r) => r.name },
  { label: "Opening", accessor: (r) => r.opening },
  { label: "In", accessor: (r) => r.in },
  { label: "Out", accessor: (r) => r.out },
  { label: "Closing", accessor: (r) => r.closing },
];

function CashBankTab() {
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = today.slice(0, 8) + "01";
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    reportsApi
      .cashBankSummary({ from, to })
      .then(setData)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load this report."))
      .finally(() => setLoading(false));
  }, [from, to]);

  const items = data?.items || [];
  const columns = [
    { key: "name", label: "Financial Account", accessor: (r) => r.name },
    { key: "opening", label: "Opening", accessor: (r) => r.opening, filter: "number" },
    { key: "in", label: "In", accessor: (r) => r.in, filter: "number" },
    { key: "out", label: "Out", accessor: (r) => r.out, filter: "number" },
    { key: "closing", label: "Closing", accessor: (r) => r.closing, filter: "number" },
  ];
  const table = useDataTable({ rows: items, columns, rowKey: (r) => r.financial_account_id });

  return (
    <div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10, flexWrap: "wrap" }}>
        <input type="date" className="bp-field-input" style={{ width: "auto" }} value={from} onChange={(e) => setFrom(e.target.value)} />
        <span className="bp-td-muted">to</span>
        <input type="date" className="bp-field-input" style={{ width: "auto" }} value={to} onChange={(e) => setTo(e.target.value)} />
        <ExportMenu filename="cash-bank-summary" rows={items} columns={CASH_BANK_CSV_COLUMNS} />
      </div>

      {error && <div className="bp-inline-error">{error}</div>}

      {data && (
        <div className="bp-kpi-grid" style={{ marginBottom: 14 }}>
          <div className="bp-kpi-card">
            <div className="bp-kpi-label">Total Company Money (as of {formatDate(to)})</div>
            <div className="bp-kpi-value">{inr(data.total_company_money)}</div>
          </div>
        </div>
      )}

      <div className="bp-table-wrap">
        <table className="bp-table">
          <thead>
            <tr>
              <ColumnHeader table={table} column={columns[0]} />
              <ColumnHeader table={table} column={columns[1]} />
              <ColumnHeader table={table} column={columns[2]} />
              <ColumnHeader table={table} column={columns[3]} />
              <ColumnHeader table={table} column={columns[4]} />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="bp-table-empty">Loading…</td></tr>
            ) : table.filteredRows.length === 0 ? (
              <tr><td colSpan={5} className="bp-table-empty">No financial accounts found.</td></tr>
            ) : (
              table.filteredRows.map((r) => (
                <tr key={r.financial_account_id}>
                  <td className="bp-td-strong">{r.name}</td>
                  <td>{inr(r.opening)}</td>
                  <td>{inr(r.in)}</td>
                  <td>{inr(r.out)}</td>
                  <td className="bp-td-strong">{inr(r.closing)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---- Payables Aging -------------------------------------------------------
function PayablesAgingTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    reportsApi
      .payablesAging()
      .then(setData)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load this report."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      {error && <div className="bp-inline-error">{error}</div>}
      {loading ? (
        <div className="bp-td-muted">Loading…</div>
      ) : data && (
        <>
          <h2 className="bp-page-title" style={{ fontSize: 16, margin: "0 0 8px" }}>Vendors</h2>
          <div className="bp-table-wrap" style={{ marginBottom: 24 }}>
            <table className="bp-table">
              <thead><tr><th>Vendor</th><th>PO</th><th>Amount</th><th>Age</th></tr></thead>
              <tbody>
                {data.vendors.length === 0 ? (
                  <tr><td colSpan={4} className="bp-table-empty">No unpaid purchase orders.</td></tr>
                ) : (
                  data.vendors.map((v, i) => (
                    <tr key={i}>
                      <td className="bp-td-strong">{v.name}</td>
                      <td className="bp-td-muted">{v.po_number}</td>
                      <td>{inr(v.amount)}</td>
                      <td><span className="bp-badge">{v.bucket}</span></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <h2 className="bp-page-title" style={{ fontSize: 16, margin: "0 0 8px" }}>Partners</h2>
          <div className="bp-table-wrap">
            <table className="bp-table">
              <thead><tr><th>Partner</th><th>Amount</th><th>Age</th></tr></thead>
              <tbody>
                {data.partners.length === 0 ? (
                  <tr><td colSpan={3} className="bp-table-empty">No outstanding partner payables.</td></tr>
                ) : (
                  data.partners.map((p, i) => (
                    <tr key={i}>
                      <td className="bp-td-strong">{p.name}</td>
                      <td>{inr(p.amount)}</td>
                      <td><span className="bp-badge">{p.bucket}</span></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {data.partners_is_estimate && (
            <p className="bp-td-muted" style={{ fontSize: 12, marginTop: 8 }}>{data.partners_note}</p>
          )}
        </>
      )}
    </div>
  );
}

// ---- Inventory & Production -----------------------------------------------
function InventoryProductionTab() {
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = today.slice(0, 8) + "01";
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);
  const [inv, setInv] = useState(null);
  const [prodItems, setProdItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    Promise.all([reportsApi.inventoryValue(), reportsApi.productionCostSummary({ from, to })])
      .then(([invData, prodData]) => {
        setInv(invData);
        setProdItems(prodData.items || []);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load this report."))
      .finally(() => setLoading(false));
  }, [from, to]);

  return (
    <div>
      {error && <div className="bp-inline-error">{error}</div>}

      <h2 className="bp-page-title" style={{ fontSize: 16, margin: "0 0 4px" }}>Inventory Value (Current Cost Estimate)</h2>
      {loading ? (
        <div className="bp-td-muted">Loading…</div>
      ) : inv && (
        <div className="bp-kpi-grid" style={{ marginBottom: 6 }}>
          <div className="bp-kpi-card">
            <div className="bp-kpi-label">Raw Materials</div>
            <div className="bp-kpi-value">{inr(inv.raw_materials_value)}</div>
          </div>
          <div className="bp-kpi-card">
            <div className="bp-kpi-label">Finished Goods</div>
            <div className="bp-kpi-value">{inr(inv.finished_goods_value)}</div>
          </div>
          <div className="bp-kpi-card">
            <div className="bp-kpi-label">Total</div>
            <div className="bp-kpi-value">{inr(inv.total_value)}</div>
          </div>
        </div>
      )}
      <p className="bp-td-muted" style={{ fontSize: 12, margin: "0 0 24px" }}>
        Valued at each product's latest received cost — not its own historical purchase cost. A management estimate, not an audited valuation.
      </p>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 10 }}>
        <h2 className="bp-page-title" style={{ fontSize: 16, margin: "0 0 8px" }}>Production Cost</h2>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <input type="date" className="bp-field-input" style={{ width: "auto" }} value={from} onChange={(e) => setFrom(e.target.value)} />
          <span className="bp-td-muted">to</span>
          <input type="date" className="bp-field-input" style={{ width: "auto" }} value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>
      <div className="bp-table-wrap">
        <table className="bp-table">
          <thead>
            <tr>
              <th>Date</th><th>Product</th><th>Planned</th><th>Actual</th>
              <th>Material</th><th>Labour</th><th>Overhead</th><th>Total</th><th>Cost/Unit</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="bp-table-empty">Loading…</td></tr>
            ) : prodItems.length === 0 ? (
              <tr><td colSpan={9} className="bp-table-empty">No completed production runs in this range.</td></tr>
            ) : (
              prodItems.map((r) => (
                <tr key={r.run_id}>
                  <td className="bp-td-muted">{formatDate(r.run_date)}</td>
                  <td className="bp-td-strong">{r.product_name}</td>
                  <td>{r.planned_quantity}</td>
                  <td>{r.actual_quantity ?? "—"}</td>
                  <td>{inr(r.material_cost)}</td>
                  <td>{inr(r.labour_cost)}</td>
                  <td>{inr(r.overhead_cost)}</td>
                  <td className="bp-td-strong">{inr(r.total_cost)}</td>
                  <td>{r.cost_per_unit !== null ? inr(r.cost_per_unit) : "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
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
