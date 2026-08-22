import { useEffect, useState } from "react";
import { costParametersApi } from "../../api/admin";
import { ApiError } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import Modal from "../../components/Modal";
import { useDataTable, SearchByBar, ColumnHeader, DataTableToolbar, SelectAllHeaderCell, SelectRowCell } from "../../components/DataTable";
import { useUrlSearch } from "../../hooks/useUrlSearch";

// Reference numbers used in production costing (e.g. flour cost per kg,
// electricity per unit) — not historical records, so edits/deletes are
// hard, not soft-deleted like most other reference data.
export default function CostParametersList() {
  const { hasPermission } = useAuth();
  const urlSearch = useUrlSearch();
  const [params, setParams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editParam, setEditParam] = useState(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await costParametersApi.list();
      setParams(data.items || []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load cost parameters.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onSaved() {
    setShowAdd(false);
    setEditParam(null);
    await load();
  }

  async function remove(param) {
    if (!window.confirm(`Remove ${param.name}?`)) return;
    await costParametersApi.remove(param.param_id);
    await load();
  }

  const columns = [
    { key: "name", label: "Name", accessor: (p) => p.name },
    { key: "value", label: "Value", accessor: (p) => p.value, filter: "number" },
    { key: "unit", label: "Unit", accessor: (p) => p.unit || "" },
    { key: "notes", label: "Notes", accessor: (p) => p.notes || "" },
  ];
  const table = useDataTable({ rows: params, columns, rowKey: (p) => p.param_id });

  useEffect(() => {
    if (urlSearch.q) table.setFilter("name", { operator: "contains", value: urlSearch.q });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 10 }}>
        <h1 className="bp-page-title">Cost Parameters</h1>
        <button type="button" className="bp-btn-primary" onClick={() => setShowAdd(true)}>+ Add parameter</button>
      </div>
      <p className="bp-td-muted" style={{ margin: "-6px 0 14px" }}>
        Reference values used to cost production runs.
      </p>

      {error && <div className="bp-inline-error">{error}</div>}

      <DataTableToolbar table={table} filename="cost-parameters" totalCount={params.length} />
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
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="bp-table-empty">Loading…</td></tr>
            ) : table.filteredRows.length === 0 ? (
              <tr><td colSpan={6} className="bp-table-empty">No cost parameters found.</td></tr>
            ) : (
              table.filteredRows.map((p) => (
                <tr key={p.param_id} onClick={() => setEditParam(p)} style={{ cursor: "pointer" }}>
                  <SelectRowCell table={table} row={p} />
                  <td className="bp-td-strong">{p.name}</td>
                  <td>{p.value}</td>
                  <td className="bp-td-muted">{p.unit || "—"}</td>
                  <td className="bp-td-muted">{p.notes || "—"}</td>
                  <td className="bp-td-actions">
                    <button type="button" className="bp-btn-sm" onClick={(e) => { e.stopPropagation(); setEditParam(p); }}>Edit</button>
                    {hasPermission("production.manage", "full_control") && (
                      <button type="button" className="bp-btn-sm" onClick={(e) => { e.stopPropagation(); remove(p); }}>Remove</button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showAdd && <CostParameterModal onClose={() => setShowAdd(false)} onDone={onSaved} />}
      {editParam && <CostParameterModal param={editParam} onClose={() => setEditParam(null)} onDone={onSaved} />}
    </div>
  );
}

function CostParameterModal({ param, onClose, onDone }) {
  const isEdit = !!param;
  const [name, setName] = useState(param?.name || "");
  const [value, setValue] = useState(param?.value ?? "");
  const [unit, setUnit] = useState(param?.unit || "");
  const [notes, setNotes] = useState(param?.notes || "");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    if (value === "" || Number.isNaN(Number(value))) {
      setError("Value is required.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const body = {
        name: name.trim(),
        value: Number(value),
        unit: unit || undefined,
        notes: notes || undefined,
      };
      if (isEdit) {
        await costParametersApi.update(param.param_id, body);
      } else {
        await costParametersApi.create(body);
      }
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save this parameter.");
      setSubmitting(false);
    }
  }

  return (
    <Modal title={isEdit ? `Edit — ${param.name}` : "Add cost parameter"} onClose={onClose}>
      <form onSubmit={submit} className="bp-form">
        {error && <div className="bp-inline-error">{error}</div>}

        <label className="bp-field-label" htmlFor="cpName">Name</label>
        <input id="cpName" type="text" className="bp-field-input" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />

        <div className="bp-form-row">
          <div style={{ flex: 1 }}>
            <label className="bp-field-label" htmlFor="cpValue">Value</label>
            <input id="cpValue" type="number" step="0.0001" className="bp-field-input" value={value} onChange={(e) => setValue(e.target.value)} required />
          </div>
          <div style={{ flex: 1 }}>
            <label className="bp-field-label" htmlFor="cpUnit">Unit</label>
            <input id="cpUnit" type="text" className="bp-field-input" placeholder="e.g. per kg, per hr" value={unit} onChange={(e) => setUnit(e.target.value)} />
          </div>
        </div>

        <label className="bp-field-label" htmlFor="cpNotes">Notes (optional)</label>
        <textarea id="cpNotes" className="bp-field-input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />

        <div className="bp-form-actions">
          <button type="button" className="bp-btn-outline" onClick={onClose} disabled={submitting}>Cancel</button>
          <button type="submit" className="bp-btn-primary" disabled={submitting}>{submitting ? "Saving…" : isEdit ? "Save changes" : "Add parameter"}</button>
        </div>
      </form>
    </Modal>
  );
}
