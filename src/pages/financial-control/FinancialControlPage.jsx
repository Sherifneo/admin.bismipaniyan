import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { financialControlApi } from "../../api/admin";
import { ApiError } from "../../api/client";

function inr(n) {
  return "₹" + Number(n || 0).toLocaleString("en-IN");
}

// Slim cash+bank overview. The actual transfer form now lives under Bank
// Accounts -> Transfer (see BankAccountsList.jsx's TransferTab) so it sits
// next to the bank balances it moves money in and out of — this page
// stays in nav (navConfig's "financialcontrol" item) as the at-a-glance
// summary, pointing there for the actual action.
export default function FinancialControlPage() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    financialControlApi
      .getSummary()
      .then(setSummary)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load the cash position."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="bp-page-title">Financial Control</h1>
      <p className="bp-td-muted" style={{ margin: "-6px 0 14px" }}>
        Today's overall cash position. Fund transfers now live under{" "}
        <Link to="/bank-accounts">Bank Accounts → Transfer</Link>.
      </p>

      {error && <div className="bp-inline-error">{error}</div>}

      {loading ? (
        <div>Loading…</div>
      ) : summary ? (
        <div className="bp-kpi-grid">
          <div className="bp-kpi-card bp-kpi-success">
            <div className="bp-kpi-label">Cash balance</div>
            <div className="bp-kpi-value">{inr(summary.cash_balance)}</div>
          </div>
          <div className="bp-kpi-card bp-kpi-success">
            <div className="bp-kpi-label">Bank balance</div>
            <div className="bp-kpi-value">{inr(summary.bank_balance)}</div>
          </div>
          <div className="bp-kpi-card">
            <div className="bp-kpi-label">Total (cash + bank)</div>
            <div className="bp-kpi-value">{inr(Number(summary.cash_balance) + Number(summary.bank_balance))}</div>
          </div>
        </div>
      ) : null}

      <div className="bp-card" style={{ maxWidth: 560, marginTop: 18 }}>
        <h2 className="bp-card-title">Move money between cash and a bank account</h2>
        <p className="bp-td-muted" style={{ marginBottom: 14 }}>
          Recording a transfer, and each bank account's own deposit/withdrawal history, now live on the Bank Accounts page.
        </p>
        <Link to="/bank-accounts" className="bp-btn-primary" style={{ display: "inline-block", textDecoration: "none" }}>
          Go to Bank Accounts → Transfer
        </Link>
      </div>
    </div>
  );
}
