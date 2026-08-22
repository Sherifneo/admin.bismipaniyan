import { useEffect, useState } from "react";
import { salaryPaymentsApi } from "../../api/admin";
import { ApiError } from "../../api/client";
import StatusBadge from "../../components/StatusBadge";
import { useDataTable, SearchByBar, ColumnHeader, DataTableToolbar, SelectAllHeaderCell, SelectRowCell } from "../../components/DataTable";

function inr(n) {
  return "₹" + Number(n || 0).toLocaleString("en-IN");
}

function currentPeriod() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// One month's whole active roster, paid or not — a "Mark paid" writes
// one Cash Book expense entry per employee (see backend/src/routes/
// salary-payments.js), same "mark as paid -> ledger write" pattern as
// Purchase Orders' Accounts Payable. Unlike a per-employee history view,
// this shows every active employee for the chosen month even if nothing
// has been paid yet, so nobody is missed.
export default function SalaryPaymentsList() {
  const [period, setPeriod] = useState(currentPeriod());
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [payingId, setPayingId] = useState(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await salaryPaymentsApi.list({ period });
      setRows(data.items || []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load salary payments.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  async function markPaid(row) {
    if (!window.confirm(`Mark ${inr(row.monthly_salary)} paid to ${row.full_name} for ${period}? This writes one Cash Book expense entry.`)) return;
    setPayingId(row.employee_id);
    setError("");
    try {
      await salaryPaymentsApi.pay({ employee_id: row.employee_id, pay_period: period, amount: row.monthly_salary });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not record this payment.");
    } finally {
      setPayingId(null);
    }
  }

  const columns = [
    { key: "employee_code", label: "Code", accessor: (r) => r.employee_code || "" },
    { key: "full_name", label: "Name", accessor: (r) => r.full_name },
    { key: "role_designation", label: "Role", accessor: (r) => r.role_designation || "" },
    { key: "location_name", label: "Location", accessor: (r) => r.location_name || "" },
    { key: "monthly_salary", label: "Salary", accessor: (r) => r.monthly_salary, filter: "number" },
    {
      key: "status", label: "Status", accessor: (r) => (r.salary_payment_id ? "paid" : "requested"), filter: "select",
      options: [{ value: "paid", label: "Paid" }, { value: "requested", label: "Unpaid" }],
    },
    { key: "paid_date", label: "Paid date", accessor: (r) => r.paid_date || "", filter: "dateRange" },
  ];
  const table = useDataTable({ rows, columns, rowKey: (r) => r.employee_id });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 10 }}>
        <h1 className="bp-page-title">Salary Payments</h1>
        <div>
          <label className="bp-field-label" htmlFor="spPeriod">Month</label>
          <input id="spPeriod" type="month" className="bp-field-input" value={period} onChange={(e) => setPeriod(e.target.value)} />
        </div>
      </div>
      <p className="bp-td-muted" style={{ margin: "-6px 0 14px" }}>
        Every active employee for the selected month — mark paid to write one Cash Book expense entry automatically.
      </p>

      {error && <div className="bp-inline-error">{error}</div>}

      <DataTableToolbar table={table} filename={`salary-payments-${period}`} totalCount={rows.length} />
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
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="bp-table-empty">Loading…</td></tr>
            ) : table.filteredRows.length === 0 ? (
              <tr><td colSpan={9} className="bp-table-empty">No active employees found.</td></tr>
            ) : (
              table.filteredRows.map((r) => (
                <tr key={r.employee_id}>
                  <SelectRowCell table={table} row={r} />
                  <td className="bp-td-muted">{r.employee_code || "—"}</td>
                  <td className="bp-td-strong">{r.full_name}</td>
                  <td className="bp-td-muted">{r.role_designation || "—"}</td>
                  <td className="bp-td-muted">{r.location_name || "—"}</td>
                  <td>{inr(r.monthly_salary)}</td>
                  <td><StatusBadge status={r.salary_payment_id ? "paid" : "requested"} label={r.salary_payment_id ? "Paid" : "Unpaid"} /></td>
                  <td className="bp-td-muted">{r.paid_date || "—"}</td>
                  <td className="bp-td-actions">
                    {!r.salary_payment_id && (
                      <button type="button" className="bp-btn-sm" onClick={() => markPaid(r)} disabled={payingId === r.employee_id}>
                        {payingId === r.employee_id ? "Paying…" : "Mark paid"}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
