import { useEffect, useState } from "react";
import { locationsApi } from "../../api/admin";
import { ApiError } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import Modal from "../../components/Modal";
import CodeField, { useCodePreview } from "../../components/CodeField";
import { useDataTable, SearchByBar, DataTableToolbar, SelectAllHeaderCell, SelectRowCell, ColumnHeader } from "../../components/DataTable";

function inr(n) {
  return "₹" + Number(n || 0).toLocaleString("en-IN");
}

// Every physical place Bismi operates — the factory plus every retail
// store (TRP, Karaikal, Nagore). Not a new concept: this is the same
// `locations` table Inventory/Sales Orders/Purchase Orders/Cash Book
// already tag everything by, finally with its own admin screen instead
// of only existing via the seed script.
export default function StoresList() {
  const { hasPermission } = useAuth();
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editStore, setEditStore] = useState(null);
  const [drillStore, setDrillStore] = useState(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await locationsApi.list();
      setStores(data || []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load stores.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onSaved() {
    setShowAdd(false);
    setEditStore(null);
    await load();
  }

  const canManage = hasPermission("stores.manage", "edit");

  const columns = [
    { key: "location_code", label: "Code", accessor: (s) => s.location_code || "" },
    { key: "name", label: "Name", accessor: (s) => s.name },
    {
      key: "kind", label: "Kind", accessor: (s) => s.kind, filter: "select",
      options: [{ value: "store", label: "Store" }, { value: "factory", label: "Factory" }],
    },
    { key: "address", label: "Address", accessor: (s) => s.address || "" },
    {
      key: "is_active", label: "Active", accessor: (s) => (s.is_active ? "Yes" : "No"), filter: "select",
      options: [{ value: "Yes", label: "Yes" }, { value: "No", label: "No" }],
    },
  ];
  const table = useDataTable({ rows: stores, columns, rowKey: (s) => s.location_id });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 10 }}>
        <h1 className="bp-page-title">Retail Stores</h1>
        {canManage && (
          <button type="button" className="bp-btn-primary" onClick={() => setShowAdd(true)}>+ Add store</button>
        )}
      </div>
      <p className="bp-td-muted" style={{ margin: "-6px 0 14px" }}>
        Every location Bismi operates from — the factory and every retail store. Click a store to see its stock, sales, and cash position.
      </p>

      {error && <div className="bp-inline-error">{error}</div>}

      <DataTableToolbar table={table} filename="retail-stores" totalCount={stores.length} />
      <SearchByBar table={table} columns={columns} />

      <div className="bp-table-wrap">
        <table className="bp-table">
          <thead>
            <tr>
              <SelectAllHeaderCell table={table} />
              <ColumnHeader table={table} column={columns[0]} />
              <ColumnHeader table={table} column={columns[1]} />
              <ColumnHeader table={table} column={columns[2]} />
              <ColumnHeader table={table} column={columns[3]} />
              <ColumnHeader table={table} column={columns[4]} />
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="bp-table-empty">Loading…</td></tr>
            ) : table.filteredRows.length === 0 ? (
              <tr><td colSpan={7} className="bp-table-empty">No stores found.</td></tr>
            ) : (
              table.filteredRows.map((s) => (
                <tr key={s.location_id} onClick={() => setDrillStore(s)} style={{ cursor: "pointer" }}>
                  <SelectRowCell table={table} row={s} />
                  <td className="bp-td-muted">{s.location_code || "—"}</td>
                  <td className="bp-td-strong">{s.name}</td>
                  <td className="bp-td-muted" style={{ textTransform: "capitalize" }}>{s.kind}</td>
                  <td className="bp-td-muted">{s.address || "—"}</td>
                  <td className="bp-td-muted">{s.is_active ? "Yes" : "No"}</td>
                  <td className="bp-td-actions">
                    {canManage && (
                      <button type="button" className="bp-btn-sm" onClick={(e) => { e.stopPropagation(); setEditStore(s); }}>Edit</button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showAdd && <StoreModal onClose={() => setShowAdd(false)} onDone={onSaved} />}
      {editStore && <StoreModal store={editStore} onClose={() => setEditStore(null)} onDone={onSaved} />}
      {drillStore && <StoreSummaryModal store={drillStore} onClose={() => setDrillStore(null)} />}
    </div>
  );
}

function StoreModal({ store, onClose, onDone }) {
  const isEdit = !!store;
  const [name, setName] = useState(store?.name || "");
  const [kind, setKind] = useState(store?.kind || "store");
  const [address, setAddress] = useState(store?.address || "");
  const [isActive, setIsActive] = useState(store ? !!store.is_active : true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const codeField = useCodePreview(kind === "factory" ? "location_factory" : "location", isEdit ? store.location_code : null);

  async function submit(e) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    if (codeField.mode === "manual" && !isEdit && !codeField.value.trim()) {
      setError("Enter a store code.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      if (isEdit) {
        await locationsApi.update(store.location_id, { name: name.trim(), address: address || undefined, is_active: isActive });
      } else {
        await locationsApi.create({
          name: name.trim(),
          kind,
          address: address || undefined,
          location_code: codeField.mode === "manual" ? codeField.value.trim() : undefined,
        });
      }
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save this store.");
      setSubmitting(false);
    }
  }

  return (
    <Modal title={isEdit ? `Edit — ${store.name}` : "Add store"} onClose={onClose}>
      <form onSubmit={submit} className="bp-form">
        {error && <div className="bp-inline-error">{error}</div>}

        <CodeField label="Store code" field={codeField} isEdit={isEdit} />

        <label className="bp-field-label" htmlFor="sName">Name</label>
        <input id="sName" type="text" className="bp-field-input" value={name} onChange={(e) => setName(e.target.value)} required />

        {!isEdit && (
          <>
            <label className="bp-field-label" htmlFor="sKind">Kind</label>
            <select id="sKind" className="bp-field-input" value={kind} onChange={(e) => setKind(e.target.value)}>
              <option value="store">Store</option>
              <option value="factory">Factory</option>
            </select>
          </>
        )}

        <label className="bp-field-label" htmlFor="sAddress">Address (optional)</label>
        <input id="sAddress" type="text" className="bp-field-input" value={address} onChange={(e) => setAddress(e.target.value)} />

        {isEdit && (
          <label className="bp-field-label" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            Active
          </label>
        )}

        <div className="bp-form-actions">
          <button type="button" className="bp-btn-outline" onClick={onClose} disabled={submitting}>Cancel</button>
          <button type="submit" className="bp-btn-primary" disabled={submitting}>{submitting ? "Saving…" : isEdit ? "Save changes" : "Add store"}</button>
        </div>
      </form>
    </Modal>
  );
}

function StoreSummaryModal({ store, onClose }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    locationsApi
      .summary(store.location_id)
      .then(setSummary)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load this store's summary."))
      .finally(() => setLoading(false));
  }, [store.location_id]);

  return (
    <Modal title={`${store.name} — Overview`} onClose={onClose}>
      {loading ? (
        <div className="bp-td-muted">Loading…</div>
      ) : error ? (
        <div className="bp-inline-error">{error}</div>
      ) : (
        <>
          <div className="bp-settlement-calc">
            <div className="bp-settlement-calc-row"><span>Products in stock</span><span>{summary.stock.product_count}</span></div>
            <div className="bp-settlement-calc-row"><span>Total units on hand</span><span>{summary.stock.total_units}</span></div>
            <div className="bp-settlement-calc-row bp-settlement-calc-total"><span>Sales recorded here (this month)</span><span>{inr(summary.sales_this_month.total)}</span></div>
            <div className="bp-settlement-calc-row"><span>Orders this month</span><span>{summary.sales_this_month.order_count}</span></div>
          </div>
          <p className="bp-td-muted" style={{ marginTop: 10, fontSize: 12 }}>
            Cash and bank balances are company-wide — see Cash Book or Financial Control for Bismi Bakery's overall position.
          </p>
        </>
      )}
    </Modal>
  );
}
