import { useEffect, useState } from "react";
import { salaryPaymentsApi, financialAccountsApi, companySettingsApi } from "../../api/admin";
import { ApiError } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import StatusBadge from "../../components/StatusBadge";
import Modal from "../../components/Modal";
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
  const { admin } = useAuth();
  const canPay = admin?.role === "owner" || admin?.role === "super_user";
  const [period, setPeriod] = useState(currentPeriod());
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [payTarget, setPayTarget] = useState(null);

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
        Every active employee for the selected month — Pay salary writes one Cash Book expense entry.
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
                    {!r.salary_payment_id && canPay && (
                      <button type="button" className="bp-btn-sm" onClick={() => setPayTarget(r)}>
                        Pay salary
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {payTarget && (
        <PaySalaryModal
          row={payTarget}
          period={period}
          onClose={() => setPayTarget(null)}
          onDone={async () => { setPayTarget(null); await load(); }}
        />
      )}
    </div>
  );
}

// Owner/super_user only (enforced again server-side — see backend
// salary-payments.js's POST /). Mirrors PurchaseOrdersList.jsx's
// PayPoModal: an explicit account picker + confirm step, never an
// auto-post to whatever the company default happens to be. The picker
// pre-fills with company_settings.default_financial_account_id (today
// Petty Cash) purely as a convenience default — nothing is written
// until the owner reviews and clicks Confirm. Amount defaults to the
// employee's monthly_salary but stays editable (e.g. an advance
// deduction or part-month pay), per explicit owner direction.
function PaySalaryModal({ row, period, onClose, onDone }) {
  const [amount, setAmount] = useState(row.monthly_salary);
  const [accounts, setAccounts] = useState([]);
  const [financialAccountId, setFinancialAccountId] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([financialAccountsApi.list(), companySettingsApi.get()])
      .then(([accountsData, settings]) => {
        const items = accountsData.items || [];
        setAccounts(items);
        const defaultId = settings?.default_financial_account_id;
        const fallback = items.some((a) => a.financial_account_id === defaultId) ? defaultId : items[0]?.financial_account_id || "";
        setFinancialAccountId((prev) => prev || fallback);
      })
      .catch(() => {});
  }, []);

  async function submit(e) {
    e.preventDefault();
    const payAmount = Number(amount);
    if (!Number.isFinite(payAmount) || payAmount <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    if (!financialAccountId) {
      setError("Select which account to pay from.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await salaryPaymentsApi.pay({
        employee_id: row.employee_id,
        pay_period: period,
        amount: payAmount,
        financial_account_id: financialAccountId,
      });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not record this payment.");
      setSubmitting(false);
    }
  }

  return (
    <Modal title={`Pay salary — ${row.full_name}`} onClose={onClose}>
      <form onSubmit={submit} className="bp-form">
        {error && <div className="bp-inline-error">{error}</div>}
        <p className="bp-td-muted" style={{ fontSize: 12, marginTop: 0 }}>
          {row.full_name} for {period}. Monthly salary: {inr(row.monthly_salary)}.
        </p>

        <label className="bp-field-label" htmlFor="paySalaryAmount">Amount (₹)</label>
        <input id="paySalaryAmount" type="number" min="0.01" step="0.01" className="bp-field-input" value={amount} onChange={(e) => setAmount(e.target.value)} required autoFocus />

        <label className="bp-field-label" htmlFor="paySalaryAccount" style={{ marginTop: 10 }}>Pay from account</label>
        <select id="paySalaryAccount" className="bp-field-input" value={financialAccountId} onChange={(e) => setFinancialAccountId(e.target.value)} required>
          {accounts.length === 0 && <option value="">Loading…</option>}
          {accounts.map((a) => <option key={a.financial_account_id} value={a.financial_account_id}>{a.name}</option>)}
        </select>
        <div className="bp-td-muted" style={{ fontSize: 11, margin: "4px 0 0" }}>
          Where the money actually moved — Cash or a specific bank account.
        </div>

        <div className="bp-form-actions">
          <button type="button" className="bp-btn-outline" onClick={onClose} disabled={submitting}>Cancel</button>
          <button type="submit" className="bp-btn-primary" disabled={submitting}>{submitting ? "Paying…" : "Confirm pay salary"}</button>
        </div>
      </form>
    </Modal>
  );
}
