import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { financialControlApi } from "../../api/admin";
import { ApiError } from "../../api/client";
import FinancialDimensionsTab from "./FinancialDimensionsTab";

function inr(n) {
  return "₹" + Number(n || 0).toLocaleString("en-IN");
}

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "dimensions", label: "Financial Dimensions" },
];

// Company-level financial home: the cash+bank overview (Overview tab —
// the actual transfer form lives under Bank Accounts -> Transfer, next to
// the balances it moves) plus the Financial Dimensions management list
// (Dimensions tab) — same "own tab, not nested modal" pattern as
// Positions/Categories.
export default function FinancialControlPage() {
  const [tab, setTab] = useState("overview");
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
        Bismi Bakery's company-wide cash/bank position, and the financial dimensions used to attribute results to
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
        </>
      ) : (
        <FinancialDimensionsTab />
      )}
    </div>
  );
}
