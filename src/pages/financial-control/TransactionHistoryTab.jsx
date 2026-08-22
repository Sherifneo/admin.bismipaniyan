import { useEffect, useState } from "react";
import { financialReconciliationApi } from "../../api/admin";
import { ApiError } from "../../api/client";
import ExportMenu from "../../components/ExportMenu";
import StatusBadge from "../../components/StatusBadge";
import { useDataTable, SearchByBar, ColumnHeader, SelectAllHeaderCell, SelectRowCell, ColumnChooserButton } from "../../components/DataTable";

function inr(n) {
  return "₹" + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function monthStartStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

const CSV_COLUMNS = [
  { label: "Date", accessor: (t) => t.date },
  { label: "Type", accessor: (t) => t.type },
  { label: "Reference", accessor: (t) => t.reference },
  { label: "Description", accessor: (t) => t.description },
  { label: "Account", accessor: (t) => t.account },
  { label: "In", accessor: (t) => t.in_amount },
  { label: "Out", accessor: (t) => t.out_amount },
  { label: "Location", accessor: (t) => t.location_name },
  { label: "Financial dimension", accessor: (t) => t.financial_dimension_name },
  { label: "Status", accessor: (t) => t.status },
];

// Read-only browse over every cash + bank transaction — no batch, no
// reconciliation state, just the same unified list the Reconcile tab
// previews, defaulted to this month and freely adjustable. No row
// actions here by design; managing an entry (approve/reverse/delete)
// still happens on its own page (Cash Book, Bank Accounts).
export default function TransactionHistoryTab() {
  const [from, setFrom] = useState(monthStartStr());
  const [to, setTo] = useState(todayStr());
  const [accountType, setAccountType] = useState("all");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await financialReconciliationApi.listTransactions({ from, to, accountType });
      setItems(data.items || []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load transaction history.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, accountType]);

  const columns = [
    { key: "date", label: "Date", accessor: (t) => t.date, filter: "dateRange" },
    { key: "type", label: "Type", accessor: (t) => t.type, filter: "select", options: [
      { value: "Sale", label: "Sale" }, { value: "Purchase", label: "Purchase" }, { value: "Salary", label: "Salary" },
      { value: "Settlement", label: "Settlement" }, { value: "Transfer", label: "Transfer" }, { value: "Manual", label: "Manual" },
      { value: "Reversal", label: "Reversal" }, { value: "Bank Deposit", label: "Bank Deposit" }, { value: "Bank Withdrawal", label: "Bank Withdrawal" },
    ] },
    { key: "reference", label: "Reference", accessor: (t) => t.reference || "" },
    { key: "description", label: "Description", accessor: (t) => t.description || "" },
    { key: "account", label: "Account", accessor: (t) => t.account },
    { key: "in_amount", label: "In", accessor: (t) => t.in_amount, filter: "number" },
    { key: "out_amount", label: "Out", accessor: (t) => t.out_amount, filter: "number" },
    { key: "location_name", label: "Location", accessor: (t) => t.location_name || "" },
    { key: "financial_dimension_name", label: "Financial dimension", accessor: (t) => t.financial_dimension_name || "" },
    {
      key: "status", label: "Status", accessor: (t) => t.status, filter: "select",
      options: [{ value: "draft", label: "Draft" }, { value: "approved", label: "Approved" }],
    },
  ];
  const table = useDataTable({ rows: items, columns, rowKey: (t) => `${t.type}-${t.id}` });

  return (
    <div>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 10 }}>
        <div>
          <label className="bp-field-label" htmlFor="thFrom">From date</label>
          <input id="thFrom" type="date" className="bp-field-input" style={{ width: "auto" }} value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="bp-field-label" htmlFor="thTo">To date</label>
          <input id="thTo" type="date" className="bp-field-input" style={{ width: "auto" }} value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div>
          <label className="bp-field-label" htmlFor="thType">Account</label>
          <select id="thType" className="bp-field-input" style={{ width: "auto" }} value={accountType} onChange={(e) => setAccountType(e.target.value)}>
            <option value="all">All</option>
            <option value="cash">Cash</option>
            <option value="bank">Bank</option>
          </select>
        </div>
        {table.selectedRows.length > 0 && (
          <button type="button" className="bp-btn-sm bp-btn-outline" onClick={() => table.exportSelected("transaction-history")}>
            Export selected ({table.selectedRows.length})
          </button>
        )}
        <ExportMenu filename="transaction-history" rows={items} columns={CSV_COLUMNS} />
        <ColumnChooserButton table={table} columns={columns} />
      </div>

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
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={11} className="bp-table-empty">Loading…</td></tr>
            ) : table.filteredRows.length === 0 ? (
              <tr><td colSpan={11} className="bp-table-empty">No transactions in this range.</td></tr>
            ) : (
              table.filteredRows.map((t) => (
                <tr key={`${t.type}-${t.id}`}>
                  <SelectRowCell table={table} row={t} />
                  {table.isColumnVisible("date") && <td className="bp-td-muted">{t.date}</td>}
                  {table.isColumnVisible("type") && <td>{t.type}</td>}
                  {table.isColumnVisible("reference") && <td className="bp-td-muted">{t.reference || "—"}</td>}
                  {table.isColumnVisible("description") && <td className="bp-td-muted">{t.description || "—"}</td>}
                  {table.isColumnVisible("account") && <td className="bp-td-muted">{t.account}</td>}
                  {table.isColumnVisible("in_amount") && <td>{Number(t.in_amount) > 0 ? inr(t.in_amount) : "—"}</td>}
                  {table.isColumnVisible("out_amount") && <td>{Number(t.out_amount) > 0 ? inr(t.out_amount) : "—"}</td>}
                  {table.isColumnVisible("location_name") && <td className="bp-td-muted">{t.location_name || "—"}</td>}
                  {table.isColumnVisible("financial_dimension_name") && <td className="bp-td-muted">{t.financial_dimension_name || "—"}</td>}
                  {table.isColumnVisible("status") && <td><StatusBadge status={t.status} /></td>}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
