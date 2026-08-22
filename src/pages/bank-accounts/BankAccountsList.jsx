import { useEffect, useState } from "react";
import { bankAccountsApi, financialControlApi, locationsApi } from "../../api/admin";
import { ApiError } from "../../api/client";
import Modal from "../../components/Modal";
import Pagination from "../../components/Pagination";
import StatusBadge from "../../components/StatusBadge";
import { useDataTable, FilterBar, DataTableToolbar, SelectAllHeaderCell, SelectRowCell } from "../../components/DataTable";
import { useUrlSearch } from "../../hooks/useUrlSearch";

const LIMIT = 20;

function inr(n) {
  return "₹" + Number(n || 0).toLocaleString("en-IN");
}

const TABS = [
  { key: "accounts", label: "Accounts" },
  { key: "transfer", label: "Transfer" },
];

// Bank Accounts + the Cash <-> Bank transfer tool live together here — a
// transfer writes one cashbook_entries row and one bank_transactions row
// in a single backend transaction (see backend/src/routes/financial-control.js).
// Financial Control (navConfig's separate "financialcontrol" item) is now
// just a slim cash+bank overview that points here for the actual transfer
// form, same tab-switch pattern as ReportsPage.jsx.
export default function BankAccountsList() {
  const urlSearch = useUrlSearch();
  const [tab, setTab] = useState("accounts");
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

  const columns = [
    { key: "account_name", label: "Account name", accessor: (a) => a.account_name },
    { key: "bank_name", label: "Bank", accessor: (a) => a.bank_name },
    { key: "account_number_last4", label: "Account #", accessor: (a) => a.account_number_last4 ? `•••• ${a.account_number_last4}` : "" },
    { key: "balance", label: "Balance", accessor: (a) => a.balance },
    {
      key: "is_active", label: "Status", accessor: (a) => (a.is_active ? "active" : "inactive"), filter: "select",
      options: [{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }],
    },
  ];
  const table = useDataTable({ rows: accounts, columns, rowKey: (a) => a.bank_account_id });

  useEffect(() => {
    if (urlSearch.q) table.setFilter("account_name", urlSearch.q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 10 }}>
        <h1 className="bp-page-title">Bank Accounts</h1>
        {tab === "accounts" && (
          <button type="button" className="bp-btn-primary" onClick={() => setShowAdd(true)}>+ Add account</button>
        )}
      </div>

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

      {tab === "accounts" ? (
        <>
          {error && <div className="bp-inline-error">{error}</div>}

          <DataTableToolbar table={table} filename="bank-accounts" totalCount={accounts.length} />
          <FilterBar columns={columns} filters={table.filters} setFilter={table.setFilter} clearAllFilters={table.clearAllFilters} />

          <div className="bp-table-wrap">
            <table className="bp-table">
              <thead>
                <tr>
                  <SelectAllHeaderCell table={table} />
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
                  <tr><td colSpan={7} className="bp-table-empty">Loading…</td></tr>
                ) : table.filteredRows.length === 0 ? (
                  <tr><td colSpan={7} className="bp-table-empty">No bank accounts yet.</td></tr>
                ) : (
                  table.filteredRows.map((a) => (
                    <tr key={a.bank_account_id} onClick={() => setEditAccount(a)} style={{ cursor: "pointer" }}>
                      <SelectRowCell table={table} row={a} />
                      <td className="bp-td-strong">{a.account_name}</td>
                      <td className="bp-td-muted">{a.bank_name}</td>
                      <td className="bp-td-muted">{a.account_number_last4 ? `•••• ${a.account_number_last4}` : "—"}</td>
                      <td>{inr(a.balance)}</td>
                      <td><StatusBadge status={a.is_active ? "active" : "inactive"} /></td>
                      <td className="bp-td-actions">
                        <button type="button" className="bp-btn-sm" onClick={(e) => { e.stopPropagation(); setTxnAccount(a); }}>Transactions</button>
                        <button type="button" className="bp-btn-sm" onClick={(e) => { e.stopPropagation(); setEditAccount(a); }}>Edit</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <TransferTab accounts={accounts} onTransferred={load} />
      )}

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

// "From" -> "To" reads explicitly rather than an abstract direction
// dropdown. Bank-to-bank isn't supported (out of scope) — picking the
// same bank account (or a bank account on both sides) is blocked in the
// UI rather than left to the server to reject.
function TransferTab({ accounts, onTransferred }) {
  const [locations, setLocations] = useState([]);
  const [fromKey, setFromKey] = useState("cash");
  const [toKey, setToKey] = useState("");
  const [locationId, setLocationId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    locationsApi.list().then((d) => {
      const items = d.items || d || [];
      setLocations(items);
      setLocationId((prev) => prev || items[0]?.location_id || "");
    }).catch(() => {});
    loadSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadSummary() {
    try {
      const data = await financialControlApi.getSummary();
      setSummary(data);
    } catch {
      // Summary is a nice-to-have inline balance hint — a failed load
      // shouldn't block the transfer form itself.
    }
  }

  // "To" options exclude whatever's selected in "From", and bank-to-bank
  // is disallowed entirely — if From is a bank account, To can only be Cash.
  const toOptions = fromKey === "cash"
    ? accounts.map((a) => ({ key: a.bank_account_id, label: a.account_name }))
    : [{ key: "cash", label: "Cash in hand" }];

  useEffect(() => {
    if (!toOptions.find((o) => o.key === toKey)) {
      setToKey(toOptions[0]?.key || "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromKey, accounts.length]);

  const fromAccount = fromKey !== "cash" ? accounts.find((a) => a.bank_account_id === fromKey) : null;
  const fromBalance = fromKey === "cash" ? summary?.cash_balance : fromAccount?.balance;

  async function submit(e) {
    e.preventDefault();
    setSuccess("");
    const amountNum = Number(amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    if (!locationId) {
      setError("Select a location.");
      return;
    }
    if (fromKey === toKey) {
      setError("From and To must be different.");
      return;
    }
    if (fromKey !== "cash" && toKey !== "cash") {
      setError("Transfers between two bank accounts aren't supported yet — record two separate transfers via Cash.");
      return;
    }

    const direction = fromKey === "cash" ? "cash_to_bank" : "bank_to_cash";
    const bank_account_id = fromKey === "cash" ? toKey : fromKey;

    setSubmitting(true);
    setError("");
    try {
      await financialControlApi.transfer({
        direction,
        bank_account_id,
        location_id: locationId,
        amount: amountNum,
        description: description || undefined,
      });
      setAmount("");
      setDescription("");
      setSuccess("Transfer recorded.");
      await loadSummary();
      await onTransferred();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not record this transfer.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bp-card" style={{ maxWidth: 560 }}>
      <h2 className="bp-card-title">Record a transfer</h2>
      <p className="bp-td-muted" style={{ margin: "-4px 0 14px" }}>
        Move money between physical cash and a bank account. Both ledgers update together.
      </p>
      <form onSubmit={submit} className="bp-form">
        {error && <div className="bp-inline-error">{error}</div>}
        {success && <div className="bp-td-muted">{success}</div>}

        <div className="bp-form-row">
          <div style={{ flex: 1 }}>
            <label className="bp-field-label" htmlFor="fcFrom">From account</label>
            <select id="fcFrom" className="bp-field-input" value={fromKey} onChange={(e) => setFromKey(e.target.value)}>
              <option value="cash">Cash in hand</option>
              {accounts.map((a) => <option key={a.bank_account_id} value={a.bank_account_id}>{a.account_name}</option>)}
            </select>
            {fromBalance != null && (
              <div className="bp-td-muted" style={{ marginTop: 4, fontSize: 12 }}>Available: {inr(fromBalance)}</div>
            )}
          </div>
          <div style={{ flex: 1 }}>
            <label className="bp-field-label" htmlFor="fcTo">To account</label>
            <select id="fcTo" className="bp-field-input" value={toKey} onChange={(e) => setToKey(e.target.value)}>
              {toOptions.length === 0 && <option value="">No bank accounts yet</option>}
              {toOptions.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
          </div>
        </div>

        {fromKey !== "cash" && (
          <p className="bp-td-muted" style={{ fontSize: 12, marginTop: -4 }}>
            Transfers between two bank accounts aren't supported yet — record two separate transfers via Cash.
          </p>
        )}

        <div className="bp-form-row">
          <div style={{ flex: 1 }}>
            <label className="bp-field-label" htmlFor="fcLocation">Location</label>
            <select id="fcLocation" className="bp-field-input" value={locationId} onChange={(e) => setLocationId(e.target.value)} required>
              {locations.map((l) => <option key={l.location_id} value={l.location_id}>{l.name}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label className="bp-field-label" htmlFor="fcAmount">Amount (₹)</label>
            <input id="fcAmount" type="number" min="0.01" step="0.01" className="bp-field-input" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </div>
        </div>

        <label className="bp-field-label" htmlFor="fcDesc">Description (optional)</label>
        <textarea id="fcDesc" className="bp-field-input" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />

        <div className="bp-form-actions">
          <button type="submit" className="bp-btn-primary" disabled={submitting || (fromKey !== "cash" && accounts.length === 0) || !toKey}>
            {submitting ? "Recording…" : "Record transfer"}
          </button>
        </div>
      </form>
    </div>
  );
}
