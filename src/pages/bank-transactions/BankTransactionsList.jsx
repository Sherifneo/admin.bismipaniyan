import { useEffect, useState } from "react";
import { bankTransactionsApi, financialAccountsApi } from "../../api/admin";
import { ApiError } from "../../api/client";
import ExportMenu from "../../components/ExportMenu";
import Pagination from "../../components/Pagination";
import StatusBadge from "../../components/StatusBadge";

const LIMIT = 25;

function inr(n) {
  return "₹" + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

const CSV_COLUMNS = [
  { label: "Date", accessor: (t) => t.txn_date },
  { label: "Account", accessor: (t) => t.financial_account_name },
  { label: "Type", accessor: (t) => t.txn_type },
  { label: "Amount", accessor: (t) => t.amount },
  { label: "Description", accessor: (t) => t.description },
  { label: "Status", accessor: (t) => t.status },
  { label: "Recorded by", accessor: (t) => t.recorded_by_name },
];

function monthStartStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// Every bank_transactions row across every Financial Account, in one
// place — the raw deposit/withdrawal/transfer activity, separate from
// Cash Book (which also includes sales/purchase/salary/settlement
// entries) and Reconciliation (a per-account review/sign-off layer).
// Filterable by account, type, status, and date/period, defaulted to
// this month.
export default function BankTransactionsList() {
  const [financialAccounts, setFinancialAccounts] = useState([]);
  const [financialAccountId, setFinancialAccountId] = useState("");
  const [txnType, setTxnType] = useState("");
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState(monthStartStr());
  const [to, setTo] = useState(todayStr());
  const [page, setPage] = useState(1);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [totals, setTotals] = useState({ total_in: 0, total_out: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    financialAccountsApi.list().then((data) => setFinancialAccounts(data.items || [])).catch(() => {});
  }, []);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await bankTransactionsApi.list({
        page, limit: LIMIT,
        financialAccountId: financialAccountId || undefined,
        txnType: txnType || undefined,
        status: status || undefined,
        from: from || undefined,
        to: to || undefined,
      });
      setItems(data.items || []);
      setTotal(data.total || 0);
      setTotals({ total_in: data.total_in, total_out: data.total_out });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load bank transactions.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, financialAccountId, txnType, status, from, to]);

  function resetPageAnd(setter) {
    return (value) => {
      setPage(1);
      setter(value);
    };
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 10 }}>
        <h1 className="bp-page-title">Bank Transactions</h1>
        <ExportMenu filename="bank-transactions" rows={items} columns={CSV_COLUMNS} />
      </div>
      <p className="bp-td-muted" style={{ margin: "-6px 0 14px" }}>
        Every deposit, withdrawal, and transfer across every Financial Account, in one place.
      </p>

      <div className="bp-kpi-grid" style={{ marginBottom: 14 }}>
        <div className="bp-kpi-card bp-kpi-success">
          <div className="bp-kpi-label">In (filtered)</div>
          <div className="bp-kpi-value">{inr(totals.total_in)}</div>
        </div>
        <div className="bp-kpi-card bp-kpi-danger">
          <div className="bp-kpi-label">Out (filtered)</div>
          <div className="bp-kpi-value">{inr(totals.total_out)}</div>
        </div>
        <div className="bp-kpi-card">
          <div className="bp-kpi-label">Net</div>
          <div className="bp-kpi-value">{inr(Number(totals.total_in) - Number(totals.total_out))}</div>
        </div>
      </div>

      <div className="bp-cashbook-filters">
        <select className="bp-field-input" value={financialAccountId} onChange={(e) => resetPageAnd(setFinancialAccountId)(e.target.value)}>
          <option value="">All accounts</option>
          {financialAccounts.map((a) => <option key={a.financial_account_id} value={a.financial_account_id}>{a.name}</option>)}
        </select>
        <select className="bp-field-input" value={txnType} onChange={(e) => resetPageAnd(setTxnType)(e.target.value)}>
          <option value="">All types</option>
          <option value="deposit">Deposit</option>
          <option value="withdrawal">Withdrawal</option>
        </select>
        <select className="bp-field-input" value={status} onChange={(e) => resetPageAnd(setStatus)(e.target.value)}>
          <option value="">Any status</option>
          <option value="draft">Draft</option>
          <option value="approved">Approved</option>
        </select>
        <input type="date" className="bp-field-input" style={{ width: "auto" }} value={from} onChange={(e) => resetPageAnd(setFrom)(e.target.value)} />
        <input type="date" className="bp-field-input" style={{ width: "auto" }} value={to} onChange={(e) => resetPageAnd(setTo)(e.target.value)} />
      </div>

      {error && <div className="bp-inline-error">{error}</div>}

      <div className="bp-table-wrap">
        <table className="bp-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Account</th>
              <th>Type</th>
              <th>Amount</th>
              <th>Description</th>
              <th>Status</th>
              <th>Recorded by</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="bp-table-empty">Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={7} className="bp-table-empty">No bank transactions found.</td></tr>
            ) : (
              items.map((t) => (
                <tr key={t.bank_txn_id}>
                  <td className="bp-td-muted">{t.txn_date}</td>
                  <td className="bp-td-strong">{t.financial_account_name}</td>
                  <td>
                    <StatusBadge status={t.txn_type === "deposit" ? "success" : "warning"} label={t.txn_type === "deposit" ? "Deposit" : "Withdrawal"} />
                    {t.reversal_of_bank_txn_id && <span className="bp-badge bp-badge-neutral" style={{ marginLeft: 4 }}>Reversal</span>}
                    {t.reversed && <span className="bp-badge bp-badge-neutral" style={{ marginLeft: 4 }}>Reversed</span>}
                  </td>
                  <td className="bp-td-strong">{inr(t.amount)}</td>
                  <td className="bp-td-muted">{t.description || "—"}</td>
                  <td><StatusBadge status={t.status} /></td>
                  <td className="bp-td-muted">{t.recorded_by_name || "—"}</td>
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
