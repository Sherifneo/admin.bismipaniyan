import { useEffect, useState } from "react";
import { bankAccountsApi } from "../../api/admin";
import { ApiError } from "../../api/client";
import Modal from "../../components/Modal";
import Pagination from "../../components/Pagination";
import StatusBadge from "../../components/StatusBadge";

const LIMIT = 20;

function inr(n) {
  return "₹" + Number(n || 0).toLocaleString("en-IN");
}

// One bank_accounts row per real bank account, running balance computed
// server-side as opening_balance + deposits - withdrawals (see
// backend/src/routes/bank-accounts.js). Transfers between cash and a bank
// account are recorded from the Financial Control page, not here — this
// page only manages accounts and their own deposit/withdrawal ledger.
export default function BankAccountsList() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editAccount, setEditAccount] = useState(null);
  const [txnAccount, setTxnAccount] = useState(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await bankAccountsApi.list({});
      setAccounts(data.items || []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load bank accounts.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onSaved() {
    setShowAdd(false);
    setEditAccount(null);
    await load();
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 10 }}>
        <h1 className="bp-page-title">Bank Accounts</h1>
        <button type="button" className="bp-btn-primary" onClick={() => setShowAdd(true)}>+ Add account</button>
      </div>

      {error && <div className="bp-inline-error">{error}</div>}

      <div className="bp-table-wrap">
        <table className="bp-table">
          <thead>
            <tr>
              <th>Account name</th>
              <th>Bank</th>
              <th>Account #</th>
              <th>Balance</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="bp-table-empty">Loading…</td></tr>
            ) : accounts.length === 0 ? (
              <tr><td colSpan={6} className="bp-table-empty">No bank accounts yet.</td></tr>
            ) : (
              accounts.map((a) => (
                <tr key={a.bank_account_id}>
                  <td className="bp-td-strong">{a.account_name}</td>
                  <td className="bp-td-muted">{a.bank_name}</td>
                  <td className="bp-td-muted">{a.account_number_last4 ? `•••• ${a.account_number_last4}` : "—"}</td>
                  <td>{inr(a.balance)}</td>
                  <td><StatusBadge status={a.is_active ? "active" : "inactive"} /></td>
                  <td className="bp-td-actions">
                    <button type="button" className="bp-btn-sm" onClick={() => setTxnAccount(a)}>Transactions</button>
                    <button type="button" className="bp-btn-sm" onClick={() => setEditAccount(a)}>Edit</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showAdd && <AccountModal onClose={() => setShowAdd(false)} onDone={onSaved} />}
      {editAccount && <AccountModal account={editAccount} onClose={() => setEditAccount(null)} onDone={onSaved} />}
      {txnAccount && <TransactionsModal account={txnAccount} onClose={() => setTxnAccount(null)} onChanged={load} />}
    </div>
  );
}

function AccountModal({ account, onClose, onDone }) {
  const isEdit = !!account;
  const [accountName, setAccountName] = useState(account?.account_name || "");
  const [bankName, setBankName] = useState(account?.bank_name || "");
  const [last4, setLast4] = useState(account?.account_number_last4 || "");
  const [openingBalance, setOpeningBalance] = useState(account ? String(account.opening_balance) : "0");
  const [isActive, setIsActive] = useState(account ? !!account.is_active : true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!accountName.trim() || !bankName.trim()) {
      setError("Account name and bank name are required.");
      return;
    }
    const openingNum = Number(openingBalance);
    if (!Number.isFinite(openingNum) || openingNum < 0) {
      setError("Enter a valid opening balance.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const body = {
        account_name: accountName.trim(),
        bank_name: bankName.trim(),
        account_number_last4: last4 || undefined,
        opening_balance: openingNum,
      };
      if (isEdit) {
        await bankAccountsApi.update(account.bank_account_id, { ...body, is_active: isActive });
      } else {
        await bankAccountsApi.create(body);
      }
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save this account.");
      setSubmitting(false);
    }
  }

  return (
    <Modal title={isEdit ? `Edit — ${account.account_name}` : "Add bank account"} onClose={onClose}>
      <form onSubmit={submit} className="bp-form">
        {error && <div className="bp-inline-error">{error}</div>}

        <label className="bp-field-label" htmlFor="baName">Account name</label>
        <input id="baName" type="text" className="bp-field-input" value={accountName} onChange={(e) => setAccountName(e.target.value)} required autoFocus />

        <div className="bp-form-row">
          <div style={{ flex: 1 }}>
            <label className="bp-field-label" htmlFor="baBank">Bank name</label>
            <input id="baBank" type="text" className="bp-field-input" value={bankName} onChange={(e) => setBankName(e.target.value)} required />
          </div>
          <div style={{ flex: 1 }}>
            <label className="bp-field-label" htmlFor="baLast4">Account # (last 4)</label>
            <input id="baLast4" type="text" maxLength={8} className="bp-field-input" value={last4} onChange={(e) => setLast4(e.target.value)} />
          </div>
        </div>

        <label className="bp-field-label" htmlFor="baOpening">Opening balance (₹)</label>
        <input id="baOpening" type="number" min="0" step="0.01" className="bp-field-input" value={openingBalance} onChange={(e) => setOpeningBalance(e.target.value)} required />

        {isEdit && (
          <label className="bp-field-label" style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            Active
          </label>
        )}

        <div className="bp-form-actions">
          <button type="button" className="bp-btn-outline" onClick={onClose} disabled={submitting}>Cancel</button>
          <button type="submit" className="bp-btn-primary" disabled={submitting}>{submitting ? "Saving…" : isEdit ? "Save changes" : "Add account"}</button>
        </div>
      </form>
    </Modal>
  );
}

function TransactionsModal({ account, onClose, onChanged }) {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [balance, setBalance] = useState(account.balance);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await bankAccountsApi.listTransactions(account.bank_account_id, { page, limit: LIMIT });
      setItems(data.items || []);
      setTotal(data.total || 0);
      setBalance(data.balance);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load transactions.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  async function onTxnAdded() {
    setShowAdd(false);
    setPage(1);
    await load();
    await onChanged();
  }

  return (
    <Modal title={`Transactions — ${account.account_name}`} onClose={onClose}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 10 }}>
        <div><span className="bp-td-muted">Current balance:</span> <span className="bp-td-strong">{inr(balance)}</span></div>
        <button type="button" className="bp-btn-primary" onClick={() => setShowAdd(true)}>+ Add transaction</button>
      </div>

      {error && <div className="bp-inline-error">{error}</div>}

      <div className="bp-table-wrap">
        <table className="bp-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Amount</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="bp-table-empty">Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={4} className="bp-table-empty">No transactions yet.</td></tr>
            ) : (
              items.map((t) => (
                <tr key={t.bank_txn_id}>
                  <td className="bp-td-muted">{t.txn_date}</td>
                  <td><StatusBadge status={t.txn_type === "deposit" ? "success" : "warning"} label={t.txn_type === "deposit" ? "Deposit" : "Withdrawal"} /></td>
                  <td className="bp-td-strong">{inr(t.amount)}</td>
                  <td className="bp-td-muted">{t.description || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} limit={LIMIT} total={total} onPageChange={setPage} />

      {showAdd && (
        <AddTransactionModal accountId={account.bank_account_id} onClose={() => setShowAdd(false)} onDone={onTxnAdded} />
      )}
    </Modal>
  );
}

function AddTransactionModal({ accountId, onClose, onDone }) {
  const [txnType, setTxnType] = useState("deposit");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [txnDate, setTxnDate] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e) {
    e.preventDefault();
    const amountNum = Number(amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await bankAccountsApi.addTransaction(accountId, {
        txn_type: txnType,
        amount: amountNum,
        description: description || undefined,
        txn_date: txnDate || undefined,
      });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not record this transaction.");
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Add transaction" onClose={onClose}>
      <form onSubmit={submit} className="bp-form">
        {error && <div className="bp-inline-error">{error}</div>}

        <label className="bp-field-label" htmlFor="txType">Type</label>
        <select id="txType" className="bp-field-input" value={txnType} onChange={(e) => setTxnType(e.target.value)}>
          <option value="deposit">Deposit</option>
          <option value="withdrawal">Withdrawal</option>
        </select>

        <label className="bp-field-label" htmlFor="txAmount">Amount (₹)</label>
        <input id="txAmount" type="number" min="0.01" step="0.01" className="bp-field-input" value={amount} onChange={(e) => setAmount(e.target.value)} required autoFocus />

        <label className="bp-field-label" htmlFor="txDate">Date (optional)</label>
        <input id="txDate" type="date" className="bp-field-input" value={txnDate} onChange={(e) => setTxnDate(e.target.value)} />

        <label className="bp-field-label" htmlFor="txDesc">Description (optional)</label>
        <textarea id="txDesc" className="bp-field-input" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />

        <div className="bp-form-actions">
          <button type="button" className="bp-btn-outline" onClick={onClose} disabled={submitting}>Cancel</button>
          <button type="submit" className="bp-btn-primary" disabled={submitting}>{submitting ? "Saving…" : "Add transaction"}</button>
        </div>
      </form>
    </Modal>
  );
}
