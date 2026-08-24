import { useEffect, useState } from "react";
import { financialReconciliationApi, financialAccountsApi } from "../../api/admin";
import { ApiError } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import StatusBadge from "../../components/StatusBadge";

function inr(n) {
  return "₹" + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// Calculate -> Review -> Reconcile -> Approve, one Financial Account at a
// time — matches how a real cash-drawer count or bank statement
// reconciliation actually works (Petty Cash reconciled separately from
// HDFC, separately from any other account). A batch never creates a
// financial transaction of its own — Calculate is a pure preview read
// over cashbook_entries/bank_transactions for that one account, and
// Reconcile/Approve only flip the batch's own status. The account's live
// balance is completely unaffected by this workflow; it was already
// correct the moment each underlying transaction was individually
// approved (see cashbook.js's / bank-accounts.js's Draft/Approve/Reverse).
export default function ReconciliationTab() {
  const { hasPermission } = useAuth();
  const [from, setFrom] = useState(todayStr());
  const [to, setTo] = useState(todayStr());
  const [financialAccounts, setFinancialAccounts] = useState([]);
  const [financialAccountId, setFinancialAccountId] = useState("");
  const [summary, setSummary] = useState(null);
  const [calculating, setCalculating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [batch, setBatch] = useState(null);
  const [recentBatches, setRecentBatches] = useState([]);
  const [loadingRecent, setLoadingRecent] = useState(true);

  async function loadRecent() {
    setLoadingRecent(true);
    try {
      const data = await financialReconciliationApi.list({ limit: 10 });
      setRecentBatches(data.items || []);
    } catch {
      // Non-critical — the recent-batches list is a convenience, not the main flow.
    } finally {
      setLoadingRecent(false);
    }
  }

  useEffect(() => {
    loadRecent();
    financialAccountsApi.list().then((data) => {
      const items = data.items || [];
      setFinancialAccounts(items);
      setFinancialAccountId((prev) => prev || items[0]?.financial_account_id || "");
    }).catch(() => {});
  }, []);

  async function calculate() {
    if (from > to) {
      setError("From date must be on or before the to date.");
      return;
    }
    if (!financialAccountId) {
      setError("Select a financial account.");
      return;
    }
    setCalculating(true);
    setError("");
    setBatch(null);
    try {
      const data = await financialReconciliationApi.calculate({ from, to, financial_account_id: financialAccountId });
      setSummary(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not calculate this period.");
    } finally {
      setCalculating(false);
    }
  }

  async function saveDraft() {
    if (!summary) return;
    setSaving(true);
    setError("");
    try {
      const created = await financialReconciliationApi.create({
        from,
        to,
        financial_account_id: financialAccountId,
        opening_balance: summary.opening_balance,
        total_in: summary.total_in,
        total_out: summary.total_out,
        calculated_balance: summary.calculated_balance,
      });
      setBatch(created);
      await loadRecent();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save this reconciliation.");
    } finally {
      setSaving(false);
    }
  }

  async function reconcile() {
    if (!batch) return;
    setSaving(true);
    setError("");
    try {
      const updated = await financialReconciliationApi.reconcile(batch.batch_id);
      setBatch(updated);
      await loadRecent();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not mark this period reconciled.");
    } finally {
      setSaving(false);
    }
  }

  async function approve() {
    if (!batch) return;
    if (!window.confirm(`Approve this reconciliation for ${from} to ${to}? This locks the period as reviewed.`)) return;
    setSaving(true);
    setError("");
    try {
      const updated = await financialReconciliationApi.approve(batch.batch_id);
      setBatch(updated);
      await loadRecent();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not approve this reconciliation.");
    } finally {
      setSaving(false);
    }
  }

  async function openBatch(b) {
    setError("");
    try {
      const full = await financialReconciliationApi.get(b.batch_id);
      setBatch(full);
      setFrom(full.from_date);
      setTo(full.to_date);
      setFinancialAccountId(full.financial_account_id || "");
      setSummary({
        opening_balance: full.opening_balance,
        total_in: full.total_in,
        total_out: full.total_out,
        calculated_balance: full.calculated_balance,
        items: full.items,
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load this reconciliation.");
    }
  }

  const items = summary?.items || [];

  return (
    <div>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 14 }}>
        <div>
          <label className="bp-field-label" htmlFor="rcFrom">From date</label>
          <input id="rcFrom" type="date" className="bp-field-input" style={{ width: "auto" }} value={from} onChange={(e) => { setFrom(e.target.value); setBatch(null); setSummary(null); }} />
        </div>
        <div>
          <label className="bp-field-label" htmlFor="rcTo">To date</label>
          <input id="rcTo" type="date" className="bp-field-input" style={{ width: "auto" }} value={to} onChange={(e) => { setTo(e.target.value); setBatch(null); setSummary(null); }} />
        </div>
        <div>
          <label className="bp-field-label" htmlFor="rcType">Financial account</label>
          <select id="rcType" className="bp-field-input" style={{ width: "auto" }} value={financialAccountId} onChange={(e) => { setFinancialAccountId(e.target.value); setBatch(null); setSummary(null); }}>
            {financialAccounts.length === 0 && <option value="">Loading…</option>}
            {financialAccounts.map((a) => <option key={a.financial_account_id} value={a.financial_account_id}>{a.name}</option>)}
          </select>
        </div>
        <button type="button" className="bp-btn-primary" onClick={calculate} disabled={calculating}>
          {calculating ? "Calculating…" : "Calculate"}
        </button>
      </div>

      {error && <div className="bp-inline-error">{error}</div>}

      {summary && (
        <>
          <div className="bp-kpi-grid" style={{ marginBottom: 14 }}>
            <div className="bp-kpi-card">
              <div className="bp-kpi-label">Opening balance</div>
              <div className="bp-kpi-value">{inr(summary.opening_balance)}</div>
            </div>
            <div className="bp-kpi-card bp-kpi-success">
              <div className="bp-kpi-label">Cash in</div>
              <div className="bp-kpi-value">{inr(summary.total_in)}</div>
            </div>
            <div className="bp-kpi-card bp-kpi-danger">
              <div className="bp-kpi-label">Cash out</div>
              <div className="bp-kpi-value">{inr(summary.total_out)}</div>
            </div>
            <div className="bp-kpi-card">
              <div className="bp-kpi-label">Calculated balance</div>
              <div className="bp-kpi-value">{inr(summary.calculated_balance)}</div>
            </div>
          </div>

          <div className="bp-table-wrap" style={{ marginBottom: 14 }}>
            <table className="bp-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Reference</th>
                  <th>Description</th>
                  <th>Account</th>
                  <th>In</th>
                  <th>Out</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr><td colSpan={8} className="bp-table-empty">No transactions in this period.</td></tr>
                ) : (
                  items.map((t) => (
                    <tr key={`${t.type}-${t.id}`}>
                      <td className="bp-td-muted">{t.date}</td>
                      <td>{t.type}</td>
                      <td className="bp-td-muted">{t.reference || "—"}</td>
                      <td className="bp-td-muted">{t.description || "—"}</td>
                      <td className="bp-td-muted">{t.account}</td>
                      <td>{Number(t.in_amount) > 0 ? inr(t.in_amount) : "—"}</td>
                      <td>{Number(t.out_amount) > 0 ? inr(t.out_amount) : "—"}</td>
                      <td><StatusBadge status={t.status} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <span className="bp-td-muted">Status:</span>
            <StatusBadge status={batch?.status || "draft"} label={batch ? batch.status[0].toUpperCase() + batch.status.slice(1) : "Not saved"} />

            {!batch && (
              <button type="button" className="bp-btn-primary" onClick={saveDraft} disabled={saving}>
                {saving ? "Saving…" : "Save & Review"}
              </button>
            )}
            {batch && batch.status === "draft" && hasPermission("finance.manage", "edit") && (
              <button type="button" className="bp-btn-primary" onClick={reconcile} disabled={saving}>
                {saving ? "…" : "Reconcile"}
              </button>
            )}
            {batch && batch.status === "reconciled" && hasPermission("finance.manage", "full_control") && (
              <button type="button" className="bp-btn-primary" onClick={approve} disabled={saving}>
                {saving ? "…" : "Approve"}
              </button>
            )}
            {batch && batch.status === "approved" && (
              <span className="bp-td-muted">Approved by {batch.approved_by_name || "—"} on {batch.approved_at ? new Date(batch.approved_at).toLocaleString("en-IN") : "—"}</span>
            )}
          </div>
        </>
      )}

      <h2 className="bp-card-title" style={{ marginTop: 24 }}>Recent reconciliations</h2>
      <div className="bp-table-wrap">
        <table className="bp-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Period</th>
              <th>Account</th>
              <th>Calculated balance</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loadingRecent ? (
              <tr><td colSpan={6} className="bp-table-empty">Loading…</td></tr>
            ) : recentBatches.length === 0 ? (
              <tr><td colSpan={6} className="bp-table-empty">No reconciliations yet.</td></tr>
            ) : (
              recentBatches.map((b) => (
                <tr key={b.batch_id} onClick={() => openBatch(b)} style={{ cursor: "pointer" }}>
                  <td className="bp-td-muted">{b.batch_code || "—"}</td>
                  <td className="bp-td-strong">{b.from_date} to {b.to_date}</td>
                  <td className="bp-td-muted">{b.financial_account_name || "—"}</td>
                  <td>{inr(b.calculated_balance)}</td>
                  <td><StatusBadge status={b.status} /></td>
                  <td className="bp-td-actions">
                    <button type="button" className="bp-btn-sm" onClick={(e) => { e.stopPropagation(); openBatch(b); }}>View</button>
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
