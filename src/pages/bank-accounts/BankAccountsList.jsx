import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { bankAccountsApi, bankTransactionsApi, financialControlApi, financialAccountsApi } from "../../api/admin";
import { ApiError } from "../../api/client";
import Modal from "../../components/Modal";
import ExportMenu from "../../components/ExportMenu";
import StatusBadge from "../../components/StatusBadge";
import ReasonConfirmModal from "../../components/ReasonConfirmModal";
import { useDataTable, SearchByBar, ColumnHeader, DataTableToolbar, SelectAllHeaderCell, SelectRowCell, ColumnChooserButton } from "../../components/DataTable";
import { useUrlSearch } from "../../hooks/useUrlSearch";

function inr(n) {
  return "₹" + Number(n || 0).toLocaleString("en-IN");
}

const TABS = [
  { key: "accounts", label: "Accounts" },
  { key: "transfer", label: "Transfer" },
  { key: "banktransaction", label: "Bank Transaction" },
];

// Cash & Bank (every Financial Account — Petty Cash and every named bank
// account) + the transfer tool live together here — a transfer writes
// one bank_transactions row on each side, in a single backend
// transaction (see backend/src/routes/financial-control.js). Financial
// Control (navConfig's separate "financialcontrol" item) is now just a
// slim company-wide overview that points here for the actual transfer
// form, same tab-switch pattern as ReportsPage.jsx.
export default function BankAccountsList() {
  const urlSearch = useUrlSearch();
  const [tab, setTab] = useState("accounts");
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editAccount, setEditAccount] = useState(null);

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
    { key: "account_name", label: "Bank ID", accessor: (a) => a.account_name },
    { key: "bank_name", label: "Bank", accessor: (a) => a.bank_name },
    { key: "account_number_last4", label: "Account #", accessor: (a) => a.account_number_last4 ? `•••• ${a.account_number_last4}` : "" },
    { key: "ifsc", label: "IFSC", accessor: (a) => a.ifsc || "", hiddenByDefault: true },
    { key: "iban", label: "IBAN", accessor: (a) => a.iban || "", hiddenByDefault: true },
    { key: "currency", label: "Currency", accessor: (a) => a.currency || "INR", hiddenByDefault: true },
    { key: "balance", label: "Balance", accessor: (a) => a.balance, filter: "number" },
    {
      key: "is_active", label: "Status", accessor: (a) => (a.is_active ? "active" : "inactive"), filter: "select",
      options: [{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }],
    },
    { key: "created_by_name", label: "Created by", accessor: (a) => a.created_by_name || "", hiddenByDefault: true },
    { key: "created_at", label: "Created at", accessor: (a) => a.created_at || "", filter: "dateRange", hiddenByDefault: true },
    { key: "updated_by_name", label: "Updated by", accessor: (a) => a.updated_by_name || "", hiddenByDefault: true },
    { key: "updated_at", label: "Updated at", accessor: (a) => a.updated_at || "", filter: "dateRange", hiddenByDefault: true },
  ];
  const table = useDataTable({ rows: accounts, columns, rowKey: (a) => a.bank_account_id });

  useEffect(() => {
    if (urlSearch.q) table.setFilter("account_name", { operator: "contains", value: urlSearch.q });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 10 }}>
        <h1 className="bp-page-title">Cash & Bank</h1>
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

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <DataTableToolbar table={table} filename="bank-accounts" totalCount={accounts.length} />
            <ColumnChooserButton table={table} columns={columns} />
          </div>
          <SearchByBar table={table} columns={columns} />

          <div className="bp-table-wrap">
            <table className="bp-table">
              <thead>
                <tr>
                  <SelectAllHeaderCell table={table} />
                  {columns.map((c) => table.isColumnVisible(c.key) && <ColumnHeader key={c.key} table={table} column={c} />)}
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={columns.length + 2} className="bp-table-empty">Loading…</td></tr>
                ) : table.filteredRows.length === 0 ? (
                  <tr><td colSpan={columns.length + 2} className="bp-table-empty">No bank accounts yet.</td></tr>
                ) : (
                  table.filteredRows.map((a) => (
                    <tr key={a.bank_account_id} onClick={() => setEditAccount(a)} style={{ cursor: "pointer" }}>
                      <SelectRowCell table={table} row={a} />
                      {table.isColumnVisible("account_name") && <td className="bp-td-strong">{a.account_name}</td>}
                      {table.isColumnVisible("bank_name") && <td className="bp-td-muted">{a.bank_name}</td>}
                      {table.isColumnVisible("account_number_last4") && <td className="bp-td-muted">{a.account_number_last4 ? `•••• ${a.account_number_last4}` : "—"}</td>}
                      {table.isColumnVisible("ifsc") && <td className="bp-td-muted">{a.ifsc || "—"}</td>}
                      {table.isColumnVisible("iban") && <td className="bp-td-muted">{a.iban || "—"}</td>}
                      {table.isColumnVisible("currency") && <td className="bp-td-muted">{a.currency || "INR"}</td>}
                      {table.isColumnVisible("balance") && <td>{inr(a.balance)}</td>}
                      {table.isColumnVisible("is_active") && <td><StatusBadge status={a.is_active ? "active" : "inactive"} /></td>}
                      {table.isColumnVisible("created_by_name") && <td className="bp-td-muted">{a.created_by_name || "—"}</td>}
                      {table.isColumnVisible("created_at") && <td className="bp-td-muted">{a.created_at ? new Date(a.created_at).toLocaleString("en-IN") : "—"}</td>}
                      {table.isColumnVisible("updated_by_name") && <td className="bp-td-muted">{a.updated_by_name || "—"}</td>}
                      {table.isColumnVisible("updated_at") && <td className="bp-td-muted">{a.updated_at ? new Date(a.updated_at).toLocaleString("en-IN") : "—"}</td>}
                      <td className="bp-td-actions">
                        <button type="button" className="bp-btn-sm" onClick={(e) => { e.stopPropagation(); setEditAccount(a); }}>Edit</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : tab === "transfer" ? (
        <TransferTab onTransferred={load} />
      ) : (
        <BankTransactionTab onChanged={load} />
      )}

      {showAdd && <AccountModal onClose={() => setShowAdd(false)} onDone={onSaved} />}
      {editAccount && <AccountModal account={editAccount} onClose={() => setEditAccount(null)} onDone={onSaved} />}
    </div>
  );
}

function AccountModal({ account, onClose, onDone }) {
  const isEdit = !!account;
  const [accountName, setAccountName] = useState(account?.account_name || "");
  const [bankName, setBankName] = useState(account?.bank_name || "");
  const [accountNumber, setAccountNumber] = useState(account?.account_number || "");
  const [ifsc, setIfsc] = useState(account?.ifsc || "");
  const [iban, setIban] = useState(account?.iban || "");
  const [currency, setCurrency] = useState(account?.currency || "INR");
  const [openingBalance, setOpeningBalance] = useState(account ? String(account.opening_balance) : "0");
  const [isActive, setIsActive] = useState(account ? !!account.is_active : true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!accountName.trim() || !bankName.trim()) {
      setError("Bank ID and bank name are required.");
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
        account_number: accountNumber.trim() || undefined,
        ifsc: ifsc.trim() || undefined,
        iban: iban.trim() || undefined,
        currency: currency.trim() || "INR",
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

        <label className="bp-field-label" htmlFor="baName">Bank ID</label>
        <input id="baName" type="text" className="bp-field-input" value={accountName} onChange={(e) => setAccountName(e.target.value)} required autoFocus />

        <label className="bp-field-label" htmlFor="baBank">Bank name</label>
        <input id="baBank" type="text" className="bp-field-input" value={bankName} onChange={(e) => setBankName(e.target.value)} required />

        <label className="bp-field-label" htmlFor="baAccountNumber">Account number</label>
        <input id="baAccountNumber" type="text" className="bp-field-input" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />

        <div className="bp-form-row">
          <div style={{ flex: 1 }}>
            <label className="bp-field-label" htmlFor="baIfsc">IFSC</label>
            <input id="baIfsc" type="text" maxLength={11} className="bp-field-input" value={ifsc} onChange={(e) => setIfsc(e.target.value.toUpperCase())} />
          </div>
          <div style={{ flex: 1 }}>
            <label className="bp-field-label" htmlFor="baIban">IBAN</label>
            <input id="baIban" type="text" maxLength={34} className="bp-field-input" value={iban} onChange={(e) => setIban(e.target.value.toUpperCase())} />
          </div>
        </div>

        <div className="bp-form-row">
          <div style={{ flex: 1 }}>
            <label className="bp-field-label" htmlFor="baCurrency">Currency</label>
            <input id="baCurrency" type="text" maxLength={3} className="bp-field-input" value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} />
          </div>
          <div style={{ flex: 1 }}>
            <label className="bp-field-label" htmlFor="baOpening">Opening balance (₹)</label>
            <input id="baOpening" type="number" min="0" step="0.01" className="bp-field-input" value={openingBalance} onChange={(e) => setOpeningBalance(e.target.value)} required />
          </div>
        </div>

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

// Full Dynamics-style table (per TABLE-CONVENTIONS.md), same shape as
// Cash Book's Ledger Transaction tab — every bank_transactions row
// across every Financial Account, with account/type/status/period
// filters via the column headers plus KPI totals. Replaces the old
// per-account "Transactions" modal and the standalone Bank Transactions
// page — this tab is now the one place to see and filter them all.
function BankTransactionTab({ onChanged }) {
  const urlSearch = useUrlSearch();
  const [financialAccounts, setFinancialAccounts] = useState([]);
  const [items, setItems] = useState([]);
  const [totals, setTotals] = useState({ total_in: 0, total_out: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [reverseTarget, setReverseTarget] = useState(null);

  useEffect(() => {
    financialAccountsApi.list().then((data) => setFinancialAccounts(data.items || [])).catch(() => {});
  }, []);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await bankTransactionsApi.list({ limit: 1000 });
      setItems(data.items || []);
      setTotals({ total_in: data.total_in, total_out: data.total_out });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load bank transactions.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onTxnAdded() {
    setShowAdd(false);
    await load();
    await onChanged();
  }

  async function onReverseConfirmed(description) {
    await bankAccountsApi.reverseTransaction(reverseTarget.bank_account_id, reverseTarget.bank_txn_id, { description });
    setReverseTarget(null);
    await load();
    await onChanged();
  }

  const columns = [
    { key: "universal_trans_id", label: "TransID", accessor: (t) => t.universal_trans_id || "", hiddenByDefault: true },
    { key: "txn_date", label: "Date", accessor: (t) => t.txn_date, filter: "dateRange" },
    { key: "financial_account_name", label: "Account", accessor: (t) => t.financial_account_name || "" },
    {
      key: "txn_type", label: "Type", accessor: (t) => t.txn_type, filter: "select",
      options: [{ value: "deposit", label: "Deposit" }, { value: "withdrawal", label: "Withdrawal" }],
    },
    { key: "amount", label: "Amount", accessor: (t) => t.amount, filter: "number" },
    { key: "description", label: "Description", accessor: (t) => t.description || "" },
    {
      key: "status", label: "Status", accessor: (t) => t.status, filter: "select",
      options: [{ value: "draft", label: "Draft" }, { value: "approved", label: "Approved" }],
    },
    { key: "recorded_by_name", label: "Recorded by", accessor: (t) => t.recorded_by_name || "" },
  ];
  const table = useDataTable({ rows: items, columns, rowKey: (t) => t.bank_txn_id });

  useEffect(() => {
    if (urlSearch.q) table.setFilter("description", { operator: "contains", value: urlSearch.q });
    if (urlSearch.from || urlSearch.to) table.setFilter("txn_date", { operator: "between", from: urlSearch.from || undefined, to: urlSearch.to || undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
        <p className="bp-td-muted" style={{ margin: 0 }}>
          Every deposit, withdrawal, and transfer across every account — filter by account, type, status, or date.
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          <ExportMenu filename="bank-transactions" rows={table.filteredRows} columns={columns.map((c) => ({ label: c.label, accessor: c.accessor }))} />
          <button type="button" className="bp-btn-primary" onClick={() => setShowAdd(true)}>+ Add transaction</button>
        </div>
      </div>

      <div className="bp-kpi-grid" style={{ marginBottom: 14 }}>
        <div className="bp-kpi-card bp-kpi-success">
          <div className="bp-kpi-label">In</div>
          <div className="bp-kpi-value">{inr(totals.total_in)}</div>
        </div>
        <div className="bp-kpi-card bp-kpi-danger">
          <div className="bp-kpi-label">Out</div>
          <div className="bp-kpi-value">{inr(totals.total_out)}</div>
        </div>
        <div className="bp-kpi-card">
          <div className="bp-kpi-label">Net</div>
          <div className="bp-kpi-value">{inr(Number(totals.total_in) - Number(totals.total_out))}</div>
        </div>
      </div>

      {error && <div className="bp-inline-error">{error}</div>}

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <ColumnChooserButton table={table} columns={columns} />
      </div>
      <SearchByBar table={table} columns={columns} />

      <div className="bp-table-wrap">
        <table className="bp-table">
          <thead>
            <tr>
              <SelectAllHeaderCell table={table} />
              {columns.map((c) => table.isColumnVisible(c.key) && <ColumnHeader key={c.key} table={table} column={c} />)}
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={columns.length + 2} className="bp-table-empty">Loading…</td></tr>
            ) : table.filteredRows.length === 0 ? (
              <tr><td colSpan={columns.length + 2} className="bp-table-empty">No bank transactions found.</td></tr>
            ) : (
              table.filteredRows.map((t) => (
                <tr key={t.bank_txn_id}>
                  <SelectRowCell table={table} row={t} />
                  {table.isColumnVisible("universal_trans_id") && (
                    <td>
                      {t.universal_trans_id ? (
                        <Link to={`/global-search?trans=${encodeURIComponent(t.universal_trans_id)}`} className="bp-trans-id-link">{t.universal_trans_id}</Link>
                      ) : "—"}
                    </td>
                  )}
                  {table.isColumnVisible("txn_date") && <td className="bp-td-muted">{t.txn_date}</td>}
                  {table.isColumnVisible("financial_account_name") && <td className="bp-td-strong">{t.financial_account_name}</td>}
                  {table.isColumnVisible("txn_type") && (
                    <td>
                      <StatusBadge status={t.txn_type === "deposit" ? "success" : "warning"} label={t.txn_type === "deposit" ? "Deposit" : "Withdrawal"} />
                      {t.reversal_of_bank_txn_id && <span className="bp-badge bp-badge-neutral" style={{ marginLeft: 4 }}>Reversal</span>}
                      {t.reversed && <span className="bp-badge bp-badge-neutral" style={{ marginLeft: 4 }}>Reversed</span>}
                    </td>
                  )}
                  {table.isColumnVisible("amount") && <td className="bp-td-strong">{inr(t.amount)}</td>}
                  {table.isColumnVisible("description") && <td className="bp-td-muted">{t.description || "—"}</td>}
                  {table.isColumnVisible("status") && <td><StatusBadge status={t.status} /></td>}
                  {table.isColumnVisible("recorded_by_name") && <td className="bp-td-muted">{t.recorded_by_name || "—"}</td>}
                  <td className="bp-td-actions">
                    {t.status === "approved" && !t.reversed && (
                      <button type="button" className="bp-btn-sm" onClick={() => setReverseTarget(t)} title="Reverse">↺</button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <AddTransactionModal financialAccounts={financialAccounts} onClose={() => setShowAdd(false)} onDone={onTxnAdded} />
      )}
      {reverseTarget && (
        <ReasonConfirmModal
          title="Reverse bank transaction"
          message={`This posts a new offsetting ${reverseTarget.txn_type === "deposit" ? "withdrawal" : "deposit"} for ${inr(reverseTarget.amount)}. The original stays on record, flagged as reversed — nothing is deleted or changed.`}
          confirmLabel="Reverse"
          reasonLabel="Reason for reversal"
          danger={false}
          onClose={() => setReverseTarget(null)}
          onConfirm={onReverseConfirmed}
        />
      )}
    </div>
  );
}

function AddTransactionModal({ financialAccounts, onClose, onDone }) {
  const [accountId, setAccountId] = useState(financialAccounts[0]?.financial_account_id || "");
  const [txnType, setTxnType] = useState("deposit");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [txnDate, setTxnDate] = useState(new Date().toISOString().slice(0, 10));
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setAccountId((prev) => prev || financialAccounts[0]?.financial_account_id || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [financialAccounts]);

  async function submit(e) {
    e.preventDefault();
    if (!accountId) {
      setError("Select an account.");
      return;
    }
    const amountNum = Number(amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const account = financialAccounts.find((a) => a.financial_account_id === accountId);
      await bankAccountsApi.addTransaction(account.bank_account_id, {
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

        <label className="bp-field-label" htmlFor="txAccount">Account</label>
        <select id="txAccount" className="bp-field-input" value={accountId} onChange={(e) => setAccountId(e.target.value)} required>
          {financialAccounts.length === 0 && <option value="">Loading…</option>}
          {financialAccounts.map((a) => <option key={a.financial_account_id} value={a.financial_account_id}>{a.name}</option>)}
        </select>

        <label className="bp-field-label" htmlFor="txType">Type</label>
        <select id="txType" className="bp-field-input" value={txnType} onChange={(e) => setTxnType(e.target.value)}>
          <option value="deposit">Deposit</option>
          <option value="withdrawal">Withdrawal</option>
        </select>

        <label className="bp-field-label" htmlFor="txAmount">Amount (₹)</label>
        <input id="txAmount" type="number" min="0.01" step="0.01" className="bp-field-input" value={amount} onChange={(e) => setAmount(e.target.value)} required />

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

// "From" -> "To" reads explicitly. Any Financial Account can transfer to
// any other now (Petty Cash <-> HDFC, or HDFC <-> SBI) — both legs are
// bank_transactions rows against their own account (see
// financial-control.js's POST /transfer), so there's no cash-only
// special case in the UI anymore.
function TransferTab({ onTransferred }) {
  const [financialAccounts, setFinancialAccounts] = useState([]);
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function loadAccounts() {
    try {
      const data = await financialAccountsApi.balances();
      const items = data.items || [];
      setFinancialAccounts(items);
      setFromId((prev) => prev || items[0]?.financial_account_id || "");
    } catch {
      // Non-critical for the initial load — the picker just stays empty.
    }
  }

  useEffect(() => {
    loadAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // "To" options exclude whatever's selected in "From".
  const toOptions = financialAccounts.filter((a) => a.financial_account_id !== fromId);

  useEffect(() => {
    if (!toOptions.find((o) => o.financial_account_id === toId)) {
      setToId(toOptions[0]?.financial_account_id || "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromId, financialAccounts.length]);

  const fromAccount = financialAccounts.find((a) => a.financial_account_id === fromId);

  async function submit(e) {
    e.preventDefault();
    setSuccess("");
    const amountNum = Number(amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    if (!fromId || !toId || fromId === toId) {
      setError("Select two different accounts.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      await financialControlApi.transfer({
        from_account_id: fromId,
        to_account_id: toId,
        amount: amountNum,
        description: description || undefined,
      });
      setAmount("");
      setDescription("");
      await Promise.all([loadAccounts(), onTransferred()]);
      setSuccess("Transfer recorded — balances updated.");
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
        Move money between any two Financial Accounts — Petty Cash, or any named bank account. Both balances update together.
      </p>
      <form onSubmit={submit} className="bp-form">
        {error && <div className="bp-inline-error">{error}</div>}
        {success && <div className="bp-td-muted">{success}</div>}

        <div className="bp-form-row">
          <div style={{ flex: 1 }}>
            <label className="bp-field-label" htmlFor="fcFrom">From account</label>
            <select id="fcFrom" className="bp-field-input" value={fromId} onChange={(e) => setFromId(e.target.value)}>
              {financialAccounts.length === 0 && <option value="">Loading…</option>}
              {financialAccounts.map((a) => <option key={a.financial_account_id} value={a.financial_account_id}>{a.name}</option>)}
            </select>
            {fromAccount && (
              <div className="bp-td-muted" style={{ marginTop: 4, fontSize: 12 }}>Available: {inr(fromAccount.current_balance)}</div>
            )}
          </div>
          <div style={{ flex: 1 }}>
            <label className="bp-field-label" htmlFor="fcTo">To account</label>
            <select id="fcTo" className="bp-field-input" value={toId} onChange={(e) => setToId(e.target.value)}>
              {toOptions.length === 0 && <option value="">No other accounts yet</option>}
              {toOptions.map((a) => <option key={a.financial_account_id} value={a.financial_account_id}>{a.name}</option>)}
            </select>
          </div>
        </div>

        <label className="bp-field-label" htmlFor="fcAmount">Amount (₹)</label>
        <input id="fcAmount" type="number" min="0.01" step="0.01" className="bp-field-input" value={amount} onChange={(e) => setAmount(e.target.value)} required />

        <label className="bp-field-label" htmlFor="fcDesc">Description (optional)</label>
        <textarea id="fcDesc" className="bp-field-input" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />

        <div className="bp-form-actions">
          <button type="submit" className="bp-btn-primary" disabled={submitting || !fromId || !toId}>
            {submitting ? "Recording…" : "Record transfer"}
          </button>
        </div>
      </form>
    </div>
  );
}
