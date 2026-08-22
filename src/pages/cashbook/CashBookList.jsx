import { useEffect, useState } from "react";
import { cashbookApi, cashbookCategoriesApi, locationsApi } from "../../api/admin";
import { ApiError } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import ExportMenu from "../../components/ExportMenu";
import Pagination from "../../components/Pagination";
import Modal from "../../components/Modal";
import ReasonConfirmModal from "../../components/ReasonConfirmModal";
import { useDataTable, SearchByBar, ColumnHeader, SelectAllHeaderCell, SelectRowCell, ColumnChooserButton } from "../../components/DataTable";
import { useUrlSearch } from "../../hooks/useUrlSearch";
import "./CashBook.css";

const LIMIT = 20;

function inr(n) {
  return "₹" + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

const CSV_COLUMNS = [
  { label: "Date", accessor: (e) => e.entry_date },
  { label: "Location", accessor: (e) => e.location_name },
  { label: "Type", accessor: (e) => e.entry_type },
  { label: "Category", accessor: (e) => e.category },
  { label: "Amount", accessor: (e) => e.amount },
  { label: "Description", accessor: (e) => e.description },
];

// Tabs own the type filter now (replaces the old dropdown). 'deleted' is
// not an entryType value — it switches the list call to includeDeleted=true
// instead of filtering by type.
const TABS = [
  { key: "all", label: "All" },
  { key: "income", label: "Income" },
  { key: "expense", label: "Expense" },
  { key: "transfer", label: "Transfer" },
  { key: "deleted", label: "Recently Deleted" },
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
  const [totals, setTotals] = useState({ total_income: 0, total_expense: 0, net: 0 });
  const [page, setPage] = useState(1);
  const [locationId, setLocationId] = useState("");
  const [tab, setTab] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [restoring, setRestoring] = useState(null);

  useEffect(() => {
    locationsApi.list().then(setLocations).catch(() => {});
  }, []);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const params = { page, limit: LIMIT, locationId };
      if (tab === "deleted") {
        params.includeDeleted = true;
      } else if (tab !== "all") {
        params.entryType = tab;
      }
      const data = await cashbookApi.list(params);
      setEntries(data.items || []);
      setTotal(data.total);
      setTotals({ total_income: data.total_income, total_expense: data.total_expense, net: data.net });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load cash book entries.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, locationId, tab]);

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

  const columns = [
    { key: "entry_date", label: "Date", accessor: (e) => e.entry_date, filter: "dateRange" },
    { key: "location_name", label: "Location", accessor: (e) => e.location_name },
    {
      key: "entry_type", label: "Type", accessor: (e) => e.entry_type, filter: "select",
      options: [{ value: "income", label: "Income" }, { value: "expense", label: "Expense" }, { value: "transfer", label: "Transfer" }],
    },
    { key: "category", label: "Category", accessor: (e) => e.category },
    { key: "description", label: "Description", accessor: (e) => e.description || "" },
    { key: "amount", label: "Amount", accessor: (e) => e.amount, filter: "number" },
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
          <button type="button" className="bp-btn-primary" onClick={() => setShowAdd(true)}>+ Add entry</button>
        </div>
      </div>

      {tab !== "deleted" && (
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

      <div className="bp-cashbook-filters">
        <select className="bp-field-input" value={locationId} onChange={(e) => { setLocationId(e.target.value); setPage(1); }}>
          <option value="">All locations</option>
          {locations.map((l) => <option key={l.location_id} value={l.location_id}>{l.name}</option>)}
        </select>
      </div>

      {error && <div className="bp-inline-error">{error}</div>}

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
                {table.isColumnVisible(columns[0].key) && <ColumnHeader table={table} column={columns[0]} />}
                {table.isColumnVisible(columns[1].key) && <ColumnHeader table={table} column={columns[1]} />}
                {table.isColumnVisible(columns[2].key) && <ColumnHeader table={table} column={columns[2]} />}
                {table.isColumnVisible(columns[3].key) && <ColumnHeader table={table} column={columns[3]} />}
                {table.isColumnVisible(columns[4].key) && <ColumnHeader table={table} column={columns[4]} />}
                {table.isColumnVisible(columns[5].key) && <ColumnHeader table={table} column={columns[5]} />}
                {table.isColumnVisible(columns[6].key) && <ColumnHeader table={table} column={columns[6]} />}
                {table.isColumnVisible(columns[7].key) && <ColumnHeader table={table} column={columns[7]} />}
                {table.isColumnVisible(columns[8].key) && <ColumnHeader table={table} column={columns[8]} />}
                {table.isColumnVisible(columns[9].key) && <ColumnHeader table={table} column={columns[9]} />}
                <th>Delete reason</th>
                <th></th>
              </tr>
            ) : (
              <tr>
                <SelectAllHeaderCell table={table} />
                {table.isColumnVisible(columns[0].key) && <ColumnHeader table={table} column={columns[0]} />}
                {table.isColumnVisible(columns[1].key) && <ColumnHeader table={table} column={columns[1]} />}
                {table.isColumnVisible(columns[2].key) && <ColumnHeader table={table} column={columns[2]} />}
                {table.isColumnVisible(columns[3].key) && <ColumnHeader table={table} column={columns[3]} />}
                {table.isColumnVisible(columns[4].key) && <ColumnHeader table={table} column={columns[4]} />}
                {table.isColumnVisible(columns[5].key) && <ColumnHeader table={table} column={columns[5]} />}
                {table.isColumnVisible(columns[6].key) && <ColumnHeader table={table} column={columns[6]} />}
                {table.isColumnVisible(columns[7].key) && <ColumnHeader table={table} column={columns[7]} />}
                {table.isColumnVisible(columns[8].key) && <ColumnHeader table={table} column={columns[8]} />}
                {table.isColumnVisible(columns[9].key) && <ColumnHeader table={table} column={columns[9]} />}
                <th></th>
              </tr>
            )}
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={tab === "deleted" ? 13 : 12} className="bp-table-empty">Loading…</td></tr>
            ) : table.filteredRows.length === 0 ? (
              <tr><td colSpan={tab === "deleted" ? 13 : 12} className="bp-table-empty">{tab === "deleted" ? "No deleted entries." : "No cash book entries found."}</td></tr>
            ) : (
              table.filteredRows.map((e) => (
                <tr key={e.entry_id}>
                  <SelectRowCell table={table} row={e} />
                  {table.isColumnVisible("entry_date") && <td className="bp-td-muted">{e.entry_date}</td>}
                  {table.isColumnVisible("location_name") && <td className="bp-td-strong">{e.location_name}</td>}
                  {table.isColumnVisible("entry_type") && (
                    <td>
                      {e.entry_type === "transfer" ? (
                        <span className="bp-badge bp-badge-neutral">
                          {e.direction === "subtract" ? "→ Bank" : "← Bank"}
                        </span>
                      ) : (
                        <span className={`bp-badge ${e.entry_type === "income" ? "bp-badge-success" : "bp-badge-danger"}`}>
                          {e.entry_type === "income" ? "Income" : "Expense"}
                        </span>
                      )}
                    </td>
                  )}
                  {table.isColumnVisible("category") && <td>{e.category}</td>}
                  {table.isColumnVisible("description") && <td className="bp-td-muted">{e.description || "—"}</td>}
                  {table.isColumnVisible("amount") && <td className="bp-td-strong">{inr(e.amount)}</td>}
                  {table.isColumnVisible("created_by_name") && <td className="bp-td-muted">{e.created_by_name || "—"}</td>}
                  {table.isColumnVisible("created_at") && <td className="bp-td-muted">{e.created_at ? new Date(e.created_at).toLocaleString("en-IN") : "—"}</td>}
                  {table.isColumnVisible("updated_by_name") && <td className="bp-td-muted">{e.updated_by_name || "—"}</td>}
                  {table.isColumnVisible("updated_at") && <td className="bp-td-muted">{e.updated_at ? new Date(e.updated_at).toLocaleString("en-IN") : "—"}</td>}
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
                      {hasPermission("cashbook.manage", "full_control") && (
                        <button type="button" className="bp-btn-sm" onClick={() => setDeleteTarget(e)}>Delete</button>
                      )}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} limit={LIMIT} total={total} onPageChange={setPage} />

      {showAdd && <AddEntryModal locations={locations} onClose={() => setShowAdd(false)} onDone={onSaved} />}
      {deleteTarget && (
        <ReasonConfirmModal
          title="Delete cash book entry"
          message={`This permanently removes the ${deleteTarget.entry_type} entry of ${inr(deleteTarget.amount)} for ${deleteTarget.location_name} on ${deleteTarget.entry_date}.`}
          confirmLabel="Delete"
          onClose={() => setDeleteTarget(null)}
          onConfirm={onDeleteConfirmed}
        />
      )}
    </div>
  );
}

function AddEntryModal({ locations, onClose, onDone }) {
  const [locationId, setLocationId] = useState(locations[0]?.location_id || "");
  const [entryType, setEntryType] = useState("income");
  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10));
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showCategories, setShowCategories] = useState(false);

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
        category,
        amount: amountNum,
        description: description || undefined,
        entry_date: entryDate,
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

        <label className="bp-field-label" htmlFor="cbLocation">Location</label>
        <select id="cbLocation" className="bp-field-input" value={locationId} onChange={(e) => setLocationId(e.target.value)} required>
          {locations.map((l) => <option key={l.location_id} value={l.location_id}>{l.name}</option>)}
        </select>

        <label className="bp-field-label" htmlFor="cbType">Type</label>
        <select id="cbType" className="bp-field-input" value={entryType} onChange={(e) => changeType(e.target.value)}>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>

        <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
          <div style={{ flex: 1 }}>
            <label className="bp-field-label" htmlFor="cbCategory">Category</label>
            <select id="cbCategory" className="bp-field-input" value={category} onChange={(e) => setCategory(e.target.value)}>
              {categories.length === 0 && <option value="">No categories yet</option>}
              {categories.map((c) => <option key={c.category_id} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <button type="button" className="bp-btn-sm" onClick={() => setShowCategories(true)} style={{ marginBottom: 2 }}>
            Manage categories
          </button>
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

        <label className="bp-field-label" htmlFor="cbDesc">Description (optional)</label>
        <input id="cbDesc" type="text" className="bp-field-input" value={description} onChange={(e) => setDescription(e.target.value)} />

        <div className="bp-form-actions">
          <button type="button" className="bp-btn-outline" onClick={onClose} disabled={submitting}>Cancel</button>
          <button type="submit" className="bp-btn-primary" disabled={submitting}>{submitting ? "Saving…" : "Save entry"}</button>
        </div>
      </form>

      {showCategories && (
        <CategoriesModal
          onClose={() => setShowCategories(false)}
          onChanged={() => loadCategories(entryType)}
        />
      )}
    </Modal>
  );
}

// Lightweight nested modal: list with inline edit/delete, plus a small
// add-category form. Renders on top of AddEntryModal so the category
// picker there refreshes the moment something changes here.
function CategoriesModal({ onClose, onChanged }) {
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
      onChanged();
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
      onChanged();
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
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not remove this category.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Manage categories" onClose={onClose}>
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
    </Modal>
  );
}
