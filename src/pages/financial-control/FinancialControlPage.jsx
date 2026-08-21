import { useEffect, useState } from "react";
import { financialControlApi, bankAccountsApi, locationsApi } from "../../api/admin";
import { ApiError } from "../../api/client";

function inr(n) {
  return "₹" + Number(n || 0).toLocaleString("en-IN");
}

// The one place that keeps the Cash Book and Bank Accounts reconcilable:
// a transfer writes one cashbook_entries row and one bank_transactions row
// in a single backend transaction (see backend/src/routes/financial-control.js).
// No permission gate — any signed-in staff member can see this and record
// a transfer, per navConfig.js.
export default function FinancialControlPage() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadSummary() {
    setLoading(true);
    setError("");
    try {
      const data = await financialControlApi.getSummary();
      setSummary(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load the cash position.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSummary();
  }, []);

  return (
    <div>
      <h1 className="bp-page-title">Financial Control</h1>
      <p className="bp-td-muted" style={{ margin: "-6px 0 14px" }}>
        Today's overall cash position, and a place to record moving money between physical cash and a bank account.
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
        </div>
      ) : null}

      <TransferForm onTransferred={loadSummary} />
    </div>
  );
}

function TransferForm({ onTransferred }) {
  const [direction, setDirection] = useState("cash_to_bank");
  const [bankAccounts, setBankAccounts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [bankAccountId, setBankAccountId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    bankAccountsApi.list({}).then((d) => {
      const items = d.items || [];
      setBankAccounts(items);
      setBankAccountId((prev) => prev || items[0]?.bank_account_id || "");
    }).catch(() => {});
    locationsApi.list().then((d) => {
      const items = d.items || d || [];
      setLocations(items);
      setLocationId((prev) => prev || items[0]?.location_id || "");
    }).catch(() => {});
  }, []);

  async function submit(e) {
    e.preventDefault();
    setSuccess("");
    const amountNum = Number(amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    if (!bankAccountId || !locationId) {
      setError("Select a bank account and a location.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await financialControlApi.transfer({
        direction,
        bank_account_id: bankAccountId,
        location_id: locationId,
        amount: amountNum,
        description: description || undefined,
      });
      setAmount("");
      setDescription("");
      setSuccess("Transfer recorded.");
      await onTransferred();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not record this transfer.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bp-card" style={{ maxWidth: 560, marginTop: 18 }}>
      <h2 className="bp-card-title">Record a transfer</h2>
      <form onSubmit={submit} className="bp-form">
        {error && <div className="bp-inline-error">{error}</div>}
        {success && <div className="bp-td-muted">{success}</div>}

        <label className="bp-field-label" htmlFor="fcDirection">Direction</label>
        <select id="fcDirection" className="bp-field-input" value={direction} onChange={(e) => setDirection(e.target.value)}>
          <option value="cash_to_bank">Cash → Bank (deposit)</option>
          <option value="bank_to_cash">Bank → Cash (withdrawal)</option>
        </select>

        <div className="bp-form-row">
          <div style={{ flex: 1 }}>
            <label className="bp-field-label" htmlFor="fcBankAccount">Bank account</label>
            <select id="fcBankAccount" className="bp-field-input" value={bankAccountId} onChange={(e) => setBankAccountId(e.target.value)} required>
              {bankAccounts.length === 0 && <option value="">No bank accounts yet</option>}
              {bankAccounts.map((a) => <option key={a.bank_account_id} value={a.bank_account_id}>{a.account_name}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label className="bp-field-label" htmlFor="fcLocation">Location</label>
            <select id="fcLocation" className="bp-field-input" value={locationId} onChange={(e) => setLocationId(e.target.value)} required>
              {locations.map((l) => <option key={l.location_id} value={l.location_id}>{l.name}</option>)}
            </select>
          </div>
        </div>

        <label className="bp-field-label" htmlFor="fcAmount">Amount (₹)</label>
        <input id="fcAmount" type="number" min="0.01" step="0.01" className="bp-field-input" value={amount} onChange={(e) => setAmount(e.target.value)} required />

        <label className="bp-field-label" htmlFor="fcDesc">Description (optional)</label>
        <textarea id="fcDesc" className="bp-field-input" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />

        <div className="bp-form-actions">
          <button type="submit" className="bp-btn-primary" disabled={submitting || bankAccounts.length === 0}>
            {submitting ? "Recording…" : "Record transfer"}
          </button>
        </div>
      </form>
    </div>
  );
}
