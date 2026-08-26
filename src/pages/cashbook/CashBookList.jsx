import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { cashbookApi, cashbookCategoriesApi, locationsApi, financialAccountsApi } from "../../api/admin";
import { ApiError } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import ExportMenu from "../../components/ExportMenu";
import Pagination from "../../components/Pagination";
import Modal from "../../components/Modal";
import ReasonConfirmModal from "../../components/ReasonConfirmModal";
import { useDataTable, SearchByBar, ColumnHeader, SelectAllHeaderCell, SelectRowCell, ColumnChooserButton } from "../../components/DataTable";
import { useUrlSearch } from "../../hooks/useUrlSearch";
import { formatDate, formatDateTime } from "../../utils/date";
import "./CashBook.css";

const LIMIT = 20;

function inr(n) {
  return "₹" + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

const CSV_COLUMNS = [
  { label: "Date", accessor: (e) => e.entry_date },
  { label: "Location", accessor: (e) => e.location_name },
  { label: "Financial Account", accessor: (e) => e.financial_account_name },
  { label: "Type", accessor: (e) => e.entry_type },
  { label: "Category", accessor: (e) => e.category },
  { label: "Source", accessor: (e) => e.source },
  { label: "Amount", accessor: (e) => e.amount },
  { label: "Description", accessor: (e) => e.description },
];

// Cash Book (this tab) shows manual entries only (source='manual') — no
// automatic sales/purchase/salary/settlement/transfer postings, per the
// owner's confirmed requirement. Ledger Transaction shows everything
// (manual + automatic), with its own income/expense/type/period filters
// — the "All" view this screen used to be. 'deleted' isn't a source/
// entryType value — it switches the list call to includeDeleted=true.
const TABS = [
  { key: "cashbook", label: "Cash Book" },
  { key: "ledger", label: "Ledger Transaction" },
  { key: "reversals", label: "Reversals" },
  { key: "deleted", label: "Recently Deleted" },
  { key: "categories", label: "Categories" },
];

// Single company-wide cash book, entries tagged by location — head office
// enters each location's prior day's cash position manually (no POS
// integration; this screen IS the source of truth, per the confirmed
// "no POS, back-office ledger, next-day manual entry" requirement).
export default function CashBookList() {
  const { hasPermission } = useAuth();
  const urlSearch = useUrlSearch();
  const [locations, setLocations] = useState([]);
  const [entries, setEntries] = useState([]);
  const [total, setTotal] = useState(0);
  const [totals, setTotals] = useState({ total_income: 0, total_expense: 0, total_equity: 0, total_advance: 0, net: 0 });
  const [page, setPage] = useState(1);
  const [locationId, setLocationId] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [ledgerEntryType, setLedgerEntryType] = useState("");
  const [tab, setTab] = useState("cashbook");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [reverseTarget, setReverseTarget] = useState(null);
  const [restoring, setRestoring] = useState(null);
  const [approving, setApproving] = useState(null);
  const [reversals, setReversals] = useState([]);

  useEffect(() => {
    locationsApi.list().then(setLocations).catch(() => {});
  }, []);

  async function load() {
    if (tab === "categories") return; // CategoriesTab manages its own loading state
    setLoading(true);
    setError("");
    try {
      if (tab === "reversals") {
        const data = await cashbookApi.listReversals({ page, limit: LIMIT });
        setReversals(data.items || []);
        setTotal(data.total);
      } else {
        const params = { page, limit: LIMIT, locationId };
        if (tab === "deleted") {
          params.includeDeleted = true;
        } else if (tab === "cashbook") {
          params.source = "manual";
          if (statusFilter) params.status = statusFilter;
        } else if (tab === "ledger") {
          if (ledgerEntryType) params.entryType = ledgerEntryType;
        }
        const data = await cashbookApi.list(params);
        setEntries(data.items || []);
        setTotal(data.total);
        setTotals({ total_income: data.total_income, total_expense: data.total_expense, net: data.net });
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load cash book entries.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, locationId, tab, statusFilter, ledgerEntryType]);

  function changeTab(key) {
    setTab(key);
    setPage(1);
  }

  async function onSaved() {
    setShowAdd(false);
    await load();
  }

  async function onDeleteConfirmed(reason) {
    await cashbookApi.remove(deleteTarget.entry_id, reason);
    setDeleteTarget(null);
    await load();
  }

  async function restore(entry) {
    setRestoring(entry.entry_id);
    try {
      await cashbookApi.restore(entry.entry_id);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not restore this entry.");
    } finally {
      setRestoring(null);
    }
  }

  async function approve(entry) {
    setApproving(entry.entry_id);
    try {
      await cashbookApi.approve(entry.entry_id);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not approve this entry.");
    } finally {
      setApproving(null);
    }
  }

  async function onReverseConfirmed(description) {
    await cashbookApi.reverse(reverseTarget.entry_id, { description });
    setReverseTarget(null);
    await load();
  }

  const columns = [
    { key: "universal_trans_id", label: "TransID", accessor: (e) => e.universal_trans_id || "", hiddenByDefault: true },
    { key: "entry_date", label: "Date", accessor: (e) => e.entry_date, filter: "dateRange" },
    { key: "location_name", label: "Location", accessor: (e) => e.location_name },
    { key: "financial_account_name", label: "Financial Account", accessor: (e) => e.financial_account_name || "" },
    {
      key: "entry_type", label: "Type", accessor: (e) => e.entry_type, filter: "select",
      options: [{ value: "income", label: "Income" }, { value: "expense", label: "Expense" }, { value: "transfer", label: "Transfer" }, { value: "equity", label: "Equity" }, { value: "advance", label: "Advance" }],
    },
    { key: "category", label: "Category", accessor: (e) => e.category },
    {
      key: "source", label: "Source", accessor: (e) => e.source, filter: "select",
      options: [{ value: "manual", label: "Manual" }, { value: "system", label: "Automatic" }],
      hiddenByDefault: tab === "cashbook",
    },
    { key: "description", label: "Description", accessor: (e) => e.description || "" },
    { key: "amount", label: "Amount", accessor: (e) => e.amount, filter: "number" },
    {
      key: "status", label: "Status", accessor: (e) => e.status, filter: "select",
      options: [{ value: "draft", label: "Draft" }, { value: "approved", label: "Approved" }],
    },
    { key: "created_by_name", label: "Created by", accessor: (e) => e.created_by_name || "", hiddenByDefault: true },
    { key: "created_at", label: "Created at", accessor: (e) => e.created_at || "", filter: "dateRange", hiddenByDefault: true },
    { key: "updated_by_name", label: "Updated by", accessor: (e) => e.updated_by_name || "", hiddenByDefault: true },
    { key: "updated_at", label: "Updated at", accessor: (e) => e.updated_at || "", filter: "dateRange", hiddenByDefault: true },
  ];
  const table = useDataTable({ rows: entries, columns, rowKey: (e) => e.entry_id });

  useEffect(() => {
    if (urlSearch.q) table.setFilter("category", { operator: "contains", value: urlSearch.q });
    if (urlSearch.from || urlSearch.to) table.setFilter("entry_date", { operator: "between", from: urlSearch.from || undefined, to: urlSearch.to || undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 10 }}>
        <h1 className="bp-page-title">Cash Book</h1>
        <div style={{ display: "flex", gap: 8 }}>
          {table.selectedRows.length > 0 && (
            <button type="button" className="bp-btn-sm bp-btn-outline" onClick={() => table.exportSelected("cash-book-entries")}>
              Export selected ({table.selectedRows.length})
            </button>
          )}
          <ExportMenu filename="cashbook" rows={entries} columns={CSV_COLUMNS} />
          {(tab === "cashbook" || tab === "ledger") && (
            <button type="button" className="bp-btn-primary" onClick={() => setShowAdd(true)}>+ Add entry</button>
          )}
        </div>
      </div>

      {tab !== "deleted" && tab !== "reversals" && tab !== "categories" && (
        <div className="bp-cashbook-totals">
          <div className="bp-kpi-card bp-kpi-success">
            <div className="bp-kpi-label">Income (filtered)</div>
            <div className="bp-kpi-value">{inr(totals.total_income)}</div>
          </div>
          <div className="bp-kpi-card bp-kpi-danger">
            <div className="bp-kpi-label">Expense (filtered)</div>
            <div className="bp-kpi-value">{inr(totals.total_expense)}</div>
          </div>
          <div className="bp-kpi-card">
            <div className="bp-kpi-label">Equity (filtered)</div>
            <div className="bp-kpi-value">{inr(totals.total_equity)}</div>
          </div>
          <div className="bp-kpi-card">
            <div className="bp-kpi-label">Advance (filtered)</div>
            <div className="bp-kpi-value">{inr(totals.total_advance)}</div>
          </div>
          <div className="bp-kpi-card">
            <div className="bp-kpi-label">Net</div>
            <div className="bp-kpi-value">{inr(totals.net)}</div>
          </div>
        </div>
      )}

      <div className="bp-tabs" style={{ marginBottom: 14 }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`bp-tab${tab === t.key ? " is-active" : ""}`}
            onClick={() => changeTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab !== "reversals" && tab !== "categories" && (
        <div className="bp-cashbook-filters">
          <select className="bp-field-input" value={locationId} onChange={(e) => { setLocationId(e.target.value); setPage(1); }}>
            <option value="">All locations</option>
            {locations.map((l) => <option key={l.location_id} value={l.location_id}>{l.name}</option>)}
          </select>
          {tab === "cashbook" && (
            <select className="bp-field-input" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
              <option value="">Approved &amp; Draft</option>
              <option value="approved">Approved</option>
              <option value="draft">Draft</option>
            </select>
          )}
          {tab === "ledger" && (
            <select className="bp-field-input" value={ledgerEntryType} onChange={(e) => { setLedgerEntryType(e.target.value); setPage(1); }}>
              <option value="">All types</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
              <option value="transfer">Transfer</option>
              <option value="equity">Equity</option>
              <option value="advance">Advance</option>
            </select>
          )}
        </div>
      )}

      {error && <div className="bp-inline-error">{error}</div>}

      {tab === "categories" ? (
        <CategoriesTab />
      ) : tab === "reversals" ? (
        <div className="bp-table-wrap">
          <table className="bp-table">
            <thead>
              <tr>
                <th>Reversed on</th>
                <th>Reversed by</th>
                <th>Location</th>
                <th>Original type</th>
                <th>Original category</th>
                <th>Original date</th>
                <th>Amount</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="bp-table-empty">Loading…</td></tr>
              ) : reversals.length === 0 ? (
                <tr><td colSpan={8} className="bp-table-empty">No reversals yet.</td></tr>
              ) : (
                reversals.map((r) => (
                  <tr key={r.reversal_entry_id}>
                    <td className="bp-td-muted">{formatDateTime(r.reversed_at) || "—"}</td>
                    <td className="bp-td-muted">{r.reversed_by_name || "—"}</td>
                    <td className="bp-td-strong">{r.location_name}</td>
                    <td>
                      <span className={`bp-badge ${r.entry_type === "income" ? "bp-badge-success" : r.entry_type === "expense" ? "bp-badge-danger" : "bp-badge-neutral"}`}>
                        {r.entry_type === "income" ? "Income" : r.entry_type === "expense" ? "Expense" : "Transfer"}
                      </span>
                    </td>
                    <td>{r.category}</td>
                    <td className="bp-td-muted">{formatDate(r.original_entry_date)}</td>
                    <td className="bp-td-strong">{inr(r.amount)}</td>
                    <td className="bp-td-muted">{r.reversal_description || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <ColumnChooserButton table={table} columns={columns} />
          </div>
          <SearchByBar table={table} columns={columns} />

          <div className="bp-table-wrap">
            <table className="bp-table">
              <thead>
                {tab === "deleted" ? (
                  <tr>
                    <SelectAllHeaderCell table={table} />
                    {columns.map((c) => table.isColumnVisible(c.key) && <ColumnHeader key={c.key} table={table} column={c} />)}
                    <th>Delete reason</th>
                    <th></th>
                  </tr>
                ) : (
                  <tr>
                    <SelectAllHeaderCell table={table} />
                    {columns.map((c) => table.isColumnVisible(c.key) && <ColumnHeader key={c.key} table={table} column={c} />)}
                    <th></th>
                  </tr>
                )}
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={tab === "deleted" ? 17 : 16} className="bp-table-empty">Loading…</td></tr>
                ) : table.filteredRows.length === 0 ? (
                  <tr><td colSpan={tab === "deleted" ? 17 : 16} className="bp-table-empty">{tab === "deleted" ? "No deleted entries." : tab === "cashbook" ? "No manual cash book entries found." : "No ledger transactions found."}</td></tr>
                ) : (
                  table.filteredRows.map((e) => (
                    <tr key={e.entry_id}>
                      <SelectRowCell table={table} row={e} />
                      {table.isColumnVisible("universal_trans_id") && (
                        <td>
                          {e.universal_trans_id ? (
                            <Link to={`/global-search?trans=${encodeURIComponent(e.universal_trans_id)}`} className="bp-trans-id-link">{e.universal_trans_id}</Link>
                          ) : "—"}
                        </td>
                      )}
                      {table.isColumnVisible("entry_date") && <td className="bp-td-muted">{formatDate(e.entry_date)}</td>}
                      {table.isColumnVisible("location_name") && <td className="bp-td-strong">{e.location_name}</td>}
                      {table.isColumnVisible("financial_account_name") && <td className="bp-td-muted">{e.financial_account_name || "—"}</td>}
                      {table.isColumnVisible("entry_type") && (
                        <td>
                          {e.entry_type === "transfer" ? (
                            <span className="bp-badge bp-badge-neutral">
                              {e.direction === "subtract" ? "→ Bank" : "← Bank"}
                            </span>
                          ) : e.entry_type === "equity" ? (
                            <span className="bp-badge bp-badge-neutral">
                              {e.direction === "subtract" ? "Equity — Out" : "Equity — In"}
                            </span>
                          ) : e.entry_type === "advance" ? (
                            <span className="bp-badge bp-badge-neutral">
                              {e.direction === "subtract" ? "Advance — Given" : "Advance — Recovered"}
                            </span>
                          ) : (
                            <span className={`bp-badge ${e.entry_type === "income" ? "bp-badge-success" : "bp-badge-danger"}`}>
                              {e.entry_type === "income" ? "Income" : "Expense"}
                            </span>
                          )}
                          {e.reversal_of_entry_id && <span className="bp-badge bp-badge-neutral" style={{ marginLeft: 4 }}>Reversal</span>}
                        </td>
                      )}
                      {table.isColumnVisible("category") && <td>{e.category}</td>}
                      {table.isColumnVisible("source") && <td className="bp-td-muted">{e.source === "manual" ? "Manual" : "Automatic"}</td>}
                      {table.isColumnVisible("description") && <td className="bp-td-muted">{e.description || "—"}</td>}
                      {table.isColumnVisible("amount") && <td className="bp-td-strong">{inr(e.amount)}</td>}
                      {table.isColumnVisible("status") && (
                        <td>
                          <span className={`bp-badge ${e.status === "approved" ? "bp-badge-success" : "bp-badge-warning"}`}>
                            {e.status === "approved" ? "Approved" : "Draft"}
                          </span>
                          {e.reversed && <span className="bp-badge bp-badge-neutral" style={{ marginLeft: 4 }}>Reversed</span>}
                        </td>
                      )}
                      {table.isColumnVisible("created_by_name") && <td className="bp-td-muted">{e.created_by_name || "—"}</td>}
                      {table.isColumnVisible("created_at") && <td className="bp-td-muted">{formatDateTime(e.created_at) || "—"}</td>}
                      {table.isColumnVisible("updated_by_name") && <td className="bp-td-muted">{e.updated_by_name || "—"}</td>}
                      {table.isColumnVisible("updated_at") && <td className="bp-td-muted">{formatDateTime(e.updated_at) || "—"}</td>}
                      {tab === "deleted" ? (
                        <>
                          <td className="bp-td-muted">{e.delete_reason || "—"}</td>
                          <td className="bp-td-actions">
                            {hasPermission("cashbook.manage", "full_control") && (
                              <button type="button" className="bp-btn-sm" onClick={() => restore(e)} disabled={restoring === e.entry_id}>
                                {restoring === e.entry_id ? "Restoring…" : "Restore"}
                              </button>
                            )}
                          </td>
                        </>
                      ) : (
                        <td className="bp-td-actions">
                          {e.status === "draft" && hasPermission("cashbook.manage", "edit") && (
                            <button type="button" className="bp-btn-sm" onClick={() => approve(e)} disabled={approving === e.entry_id} title="Approve">
                              {approving === e.entry_id ? "…" : "Approve"}
                            </button>
                          )}
                          {e.status === "approved" && !e.reversed && hasPermission("cashbook.manage", "full_control") && (
                            <button type="button" className="bp-btn-sm" onClick={() => setReverseTarget(e)} title="Reverse">↺</button>
                          )}
                          {e.status !== "approved" && hasPermission("cashbook.manage", "full_control") && (
                            <button type="button" className="bp-btn-sm" onClick={() => setDeleteTarget(e)} title="Delete" aria-label="Delete">🗑</button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab !== "reversals" && tab !== "categories" && <Pagination page={page} limit={LIMIT} total={total} onPageChange={setPage} />}

      {showAdd && <AddEntryModal locations={locations} onClose={() => setShowAdd(false)} onDone={onSaved} onManageCategories={() => changeTab("categories")} />}
      {deleteTarget && (
        <ReasonConfirmModal
          title="Delete cash book entry"
          message={`This moves the ${deleteTarget.entry_type} entry of ${inr(deleteTarget.amount)} for ${deleteTarget.location_name} on ${formatDate(deleteTarget.entry_date)} to Recently Deleted.`}
          confirmLabel="Delete"
          onClose={() => setDeleteTarget(null)}
          onConfirm={onDeleteConfirmed}
        />
      )}
      {reverseTarget && (
        <ReasonConfirmModal
          title="Reverse cash book entry"
          message={`This posts a new offsetting entry for the ${reverseTarget.entry_type} of ${inr(reverseTarget.amount)} for ${reverseTarget.location_name} on ${formatDate(reverseTarget.entry_date)}. The original stays on record, flagged as reversed — nothing is deleted or changed.`}
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

function AddEntryModal({ locations, onClose, onDone, onManageCategories }) {
  const [locationId, setLocationId] = useState(locations[0]?.location_id || "");
  const [entryType, setEntryType] = useState("income");
  const [direction, setDirection] = useState("add");
  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10));
  const [financialAccounts, setFinancialAccounts] = useState([]);
  const [financialAccountId, setFinancialAccountId] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const needsDirection = entryType === "equity" || entryType === "advance";

  useEffect(() => {
    financialAccountsApi.list().then((data) => {
      const items = data.items || [];
      setFinancialAccounts(items);
      setFinancialAccountId((prev) => prev || items[0]?.financial_account_id || "");
    }).catch(() => {});
  }, []);

  async function loadCategories(type) {
    try {
      const data = await cashbookCategoriesApi.list({ entryType: type });
      const items = data.items || [];
      setCategories(items);
      setCategory((prev) => (items.find((c) => c.name === prev) ? prev : items[0]?.name || ""));
    } catch {
      // Category list failing to load shouldn't block the rest of the form.
    }
  }

  useEffect(() => {
    loadCategories(entryType);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function changeType(type) {
    setEntryType(type);
    loadCategories(type);
  }

  async function submit(e) {
    e.preventDefault();
    if (!locationId) {
      setError("Select a location.");
      return;
    }
    if (!category) {
      setError("Select a category.");
      return;
    }
    if (!financialAccountId) {
      setError("Select a financial account (Cash or a bank account).");
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
      await cashbookApi.create({
        location_id: locationId,
        entry_type: entryType,
        direction: needsDirection ? direction : undefined,
        category,
        amount: amountNum,
        description: description || undefined,
        entry_date: entryDate,
        financial_account_id: financialAccountId,
      });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save this entry.");
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Add cash book entry" onClose={onClose}>
      <form onSubmit={submit} className="bp-form">
        {error && <div className="bp-inline-error">{error}</div>}

        <label className="bp-field-label" htmlFor="cbType">Type</label>
        <select id="cbType" className="bp-field-input" value={entryType} onChange={(e) => changeType(e.target.value)}>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
          <option value="equity">Equity</option>
          <option value="advance">Advance</option>
        </select>

        {needsDirection && (
          <>
            <label className="bp-field-label" htmlFor="cbDirection">Direction</label>
            <select id="cbDirection" className="bp-field-input" value={direction} onChange={(e) => setDirection(e.target.value)}>
              <option value="add">
                {entryType === "equity" ? "In — owner putting money into the business" : "In — advance recovered"}
              </option>
              <option value="subtract">
                {entryType === "equity" ? "Out — owner drawing money out" : "Out — advance given"}
              </option>
            </select>
          </>
        )}

        <label className="bp-field-label" htmlFor="cbFinancialAccount">Financial Account</label>
        <select id="cbFinancialAccount" className="bp-field-input" value={financialAccountId} onChange={(e) => setFinancialAccountId(e.target.value)} required>
          {financialAccounts.length === 0 && <option value="">Loading…</option>}
          {financialAccounts.map((a) => <option key={a.financial_account_id} value={a.financial_account_id}>{a.name}</option>)}
        </select>
        <div className="bp-td-muted" style={{ fontSize: 11, margin: "4px 0 0" }}>
          Where the money actually moved — Cash or a specific bank account.
        </div>

        <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
          <div style={{ flex: 1 }}>
            <label className="bp-field-label" htmlFor="cbCategory">Category</label>
            <select id="cbCategory" className="bp-field-input" value={category} onChange={(e) => setCategory(e.target.value)}>
              {categories.length === 0 && <option value="">No categories yet</option>}
              {categories.map((c) => <option key={c.category_id} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          {onManageCategories && (
            <button type="button" className="bp-btn-sm" onClick={() => { onClose(); onManageCategories(); }} style={{ marginBottom: 2 }}>
              Manage categories
            </button>
          )}
        </div>

        <div className="bp-form-row">
          <div style={{ flex: 1 }}>
            <label className="bp-field-label" htmlFor="cbAmount">Amount (₹)</label>
            <input id="cbAmount" type="number" min="0.01" step="0.01" className="bp-field-input" value={amount} onChange={(e) => setAmount(e.target.value)} required autoFocus />
          </div>
          <div style={{ flex: 1 }}>
            <label className="bp-field-label" htmlFor="cbDate">Date</label>
            <input id="cbDate" type="date" className="bp-field-input" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} required />
          </div>
        </div>

        <label className="bp-field-label" htmlFor="cbLocation">Location</label>
        <select id="cbLocation" className="bp-field-input" value={locationId} onChange={(e) => setLocationId(e.target.value)} required>
          {locations.map((l) => <option key={l.location_id} value={l.location_id}>{l.name}</option>)}
        </select>

        <label className="bp-field-label" htmlFor="cbDesc">Description (optional)</label>
        <input id="cbDesc" type="text" className="bp-field-input" value={description} onChange={(e) => setDescription(e.target.value)} />

        <div className="bp-form-actions">
          <button type="button" className="bp-btn-outline" onClick={onClose} disabled={submitting}>Cancel</button>
          <button type="submit" className="bp-btn-primary" disabled={submitting}>{submitting ? "Saving…" : "Save entry"}</button>
        </div>
      </form>
    </Modal>
  );
}

// Its own tab on the main Cash Book page (not a nested modal) — list with
// inline edit/delete, plus a small add-category form. Any manual entry's
// category picker reads live from cashbook_categories on open, so a
// rename/add here is reflected the next time Add Entry is opened — no
// extra "refresh" plumbing needed since that list is a page reload away
// (switching tabs), not a modal-on-modal render.
function CategoriesTab() {
  const { hasPermission } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("income");
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await cashbookCategoriesApi.list({});
      setItems(data.items || []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load categories.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function addCategory(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    setBusy(true);
    setError("");
    try {
      await cashbookCategoriesApi.create({ name: newName.trim(), entry_type: newType });
      setNewName("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not add this category.");
    } finally {
      setBusy(false);
    }
  }

  function startEdit(c) {
    setEditingId(c.category_id);
    setEditingName(c.name);
  }

  async function saveEdit(id) {
    if (!editingName.trim()) return;
    setBusy(true);
    setError("");
    try {
      await cashbookCategoriesApi.update(id, { name: editingName.trim() });
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not rename this category.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(c) {
    if (!window.confirm(`Remove category "${c.name}"?`)) return;
    setBusy(true);
    setError("");
    try {
      await cashbookCategoriesApi.remove(c.category_id);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not remove this category.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {error && <div className="bp-inline-error">{error}</div>}

      <div className="bp-table-wrap" style={{ marginBottom: 14 }}>
        <table className="bp-table">
          <thead>
            <tr><th>Name</th><th>Type</th><th></th></tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={3} className="bp-table-empty">Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={3} className="bp-table-empty">No categories yet.</td></tr>
            ) : (
              items.map((c) => (
                <tr key={c.category_id}>
                  <td>
                    {editingId === c.category_id ? (
                      <input
                        type="text"
                        className="bp-field-input"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        autoFocus
                      />
                    ) : (
                      c.name
                    )}
                  </td>
                  <td className="bp-td-muted">{c.entry_type === "income" ? "Income" : "Expense"}</td>
                  <td className="bp-td-actions">
                    {editingId === c.category_id ? (
                      <>
                        <button type="button" className="bp-btn-sm" onClick={() => saveEdit(c.category_id)} disabled={busy}>Save</button>
                        <button type="button" className="bp-btn-sm" onClick={() => setEditingId(null)} disabled={busy}>Cancel</button>
                      </>
                    ) : (
                      <>
                        <button type="button" className="bp-btn-sm" onClick={() => startEdit(c)} disabled={busy}>Rename</button>
                        {hasPermission("cashbook.manage", "full_control") && (
                          <button type="button" className="bp-btn-sm" onClick={() => remove(c)} disabled={busy}>Delete</button>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <form onSubmit={addCategory} className="bp-form-row" style={{ alignItems: "flex-end" }}>
        <div style={{ flex: 2 }}>
          <label className="bp-field-label" htmlFor="catName">New category</label>
          <input id="catName" type="text" className="bp-field-input" value={newName} onChange={(e) => setNewName(e.target.value)} />
        </div>
        <div style={{ flex: 1 }}>
          <label className="bp-field-label" htmlFor="catType">Type</label>
          <select id="catType" className="bp-field-input" value={newType} onChange={(e) => setNewType(e.target.value)}>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
        </div>
        <button type="submit" className="bp-btn-primary" disabled={busy || !newName.trim()}>+ Add</button>
      </form>
    </div>
  );
}
