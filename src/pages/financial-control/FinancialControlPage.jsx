import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { financialControlApi, financialAccountsApi } from "../../api/admin";
import { ApiError } from "../../api/client";
import FinancialDimensionsTab from "./FinancialDimensionsTab";
import ReconciliationTab from "./ReconciliationTab";

function inr(n) {
  return "₹" + Number(n || 0).toLocaleString("en-IN");
}

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "dimensions", label: "Financial Dimensions" },
  { key: "reconciliation", label: "Reconciliation" },
];

// Company-level financial home: the accounts overview (Overview tab —
// the actual transfer form and every transaction live under Cash & Bank's
// Transfer / Bank Transaction tabs) plus the Financial Dimensions
// management list (Dimensions tab) and per-account Reconciliation.
export default function FinancialControlPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "overview";
  function setTab(key) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("tab", key);
      return next;
    }, { replace: true });
  }
  const [summary, setSummary] = useState(null);
  const [accountBalances, setAccountBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    Promise.all([financialControlApi.getSummary(), financialAccountsApi.balances()])
      .then(([summaryData, balancesData]) => {
        setSummary(summaryData);
        setAccountBalances(balancesData.items || []);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load the account position."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="bp-page-title">Financial Control</h1>
      <p className="bp-td-muted" style={{ margin: "-6px 0 14px" }}>
        Bismi Bakery's company-wide account position, and the financial dimensions used to attribute results to
        each store or factory in reports.
      </p>

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

      {tab === "overview" ? (
        <>
          {error && <div className="bp-inline-error">{error}</div>}

          {loading ? (
            <div>Loading…</div>
          ) : summary ? (
            <div className="bp-kpi-grid">
              <div className="bp-kpi-card bp-kpi-success">
                <div className="bp-kpi-label">Total balance</div>
                <div className="bp-kpi-value">{inr(summary.total_balance)}</div>
              </div>
            </div>
          ) : null}

          <div className="bp-card" style={{ marginTop: 18 }}>
            <h2 className="bp-card-title">Financial Account balances</h2>
            <p className="bp-td-muted" style={{ marginBottom: 14 }}>
              Opening balance plus every approved amount in and out, per account — the same figures Cash Book and
              Banking use.
            </p>
            <div className="bp-table-wrap">
              <table className="bp-table">
                <thead>
                  <tr>
                    <th>Account</th>
                    <th>Opening</th>
                    <th>In</th>
                    <th>Out</th>
                    <th>Current balance</th>
                  </tr>
                </thead>
                <tbody>
                  {accountBalances.length === 0 ? (
                    <tr><td colSpan={5} className="bp-table-empty">No financial accounts yet.</td></tr>
                  ) : (
                    accountBalances.map((a) => (
                      <tr key={a.financial_account_id}>
                        <td className="bp-td-strong">{a.name}</td>
                        <td>{inr(a.opening_balance)}</td>
                        <td>{inr(a.total_in)}</td>
                        <td>{inr(a.total_out)}</td>
                        <td className="bp-td-strong">{inr(a.current_balance)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bp-card" style={{ maxWidth: 560, marginTop: 18 }}>
            <h2 className="bp-card-title">Move money between accounts</h2>
            <p className="bp-td-muted" style={{ marginBottom: 14 }}>
              Recording a transfer, and every account's full transaction history, now live on the Banking
              page's Transfer and Bank Transaction tabs.
            </p>
            <Link to="/bank-accounts" className="bp-btn-primary" style={{ display: "inline-block", textDecoration: "none" }}>
              Go to Banking → Transfer
            </Link>
          </div>
        </>
      ) : tab === "dimensions" ? (
        <FinancialDimensionsTab />
      ) : (
        <ReconciliationTab />
      )}
    </div>
  );
}
