import { useEffect, useState } from "react";
import { costParametersApi, employeesApi } from "../../api/admin";
import { ApiError } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import Modal from "../../components/Modal";
import { useDataTable, SearchByBar, ColumnHeader, DataTableToolbar, SelectAllHeaderCell, SelectRowCell, ColumnChooserButton } from "../../components/DataTable";
import { useUrlSearch } from "../../hooks/useUrlSearch";
import { formatDate, formatDateTime } from "../../utils/date";

const CATEGORY_LABELS = { material: "Material", labour: "Labour", overhead: "Overhead", utility: "Utility" };
const RATE_TYPE_LABELS = { per_hour: "Per hour", per_production: "Per production" };

function inr(n) {
  return n === null || n === undefined || n === "" ? "—" : "₹" + Number(n).toLocaleString("en-IN", { maximumFractionDigits: 4 });
}

// Reference numbers used in production costing (e.g. flour cost per kg,
// a baker's per-hour labour rate). Pricing is append-only history (see
// backend/src/routes/cost-parameters.js) — editing a parameter's
// metadata (name/category/etc.) is a direct update, but a new value adds
// a dated history row instead of overwriting, so a run costed last month
// still reflects the rate that applied then.
export default function CostParametersList() {
  const { hasPermission } = useAuth();
  const urlSearch = useUrlSearch();
  const [params, setParams] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editParam, setEditParam] = useState(null);
  const [historyParam, setHistoryParam] = useState(null);

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
    employeesApi.list({}).then((d) => setEmployees(d.items || [])).catch(() => {});
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
    {
      key: "category", label: "Category", accessor: (p) => p.category, filter: "select",
      options: Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label })),
    },
    {
      key: "rate_type", label: "Rate type", accessor: (p) => p.rate_type, filter: "select",
      options: Object.entries(RATE_TYPE_LABELS).map(([value, label]) => ({ value, label })),
    },
    { key: "current_value", label: "Current value", accessor: (p) => Number(p.current_value ?? p.value), filter: "number" },
    { key: "unit", label: "Unit", accessor: (p) => p.unit || "" },
    { key: "linked_employee_name", label: "Linked employee", accessor: (p) => p.linked_employee_name || "" },
    { key: "notes", label: "Notes", accessor: (p) => p.notes || "" },
    { key: "created_by_name", label: "Created by", accessor: (p) => p.created_by_name || "", hiddenByDefault: true },
    { key: "created_at", label: "Created at", accessor: (p) => p.created_at || "", filter: "dateRange", hiddenByDefault: true },
    { key: "updated_by_name", label: "Updated by", accessor: (p) => p.updated_by_name || "", hiddenByDefault: true },
    { key: "updated_at", label: "Updated at", accessor: (p) => p.updated_at || "", filter: "dateRange", hiddenByDefault: true },
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
        Reference values used to cost production runs. A new value is dated history, not an overwrite.
      </p>

      {error && <div className="bp-inline-error">{error}</div>}

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <DataTableToolbar table={table} filename="cost-parameters" totalCount={params.length} />
        <ColumnChooserButton table={table} columns={columns} />
      </div>
      <SearchByBar table={table} columns={columns} />

      <div className="bp-table-wrap">
        <table className="bp-table">
          <thead>
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
              {table.isColumnVisible(columns[10].key) && <ColumnHeader table={table} column={columns[10]} />}
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={13} className="bp-table-empty">Loading…</td></tr>
            ) : table.filteredRows.length === 0 ? (
              <tr><td colSpan={13} className="bp-table-empty">No cost parameters found.</td></tr>
            ) : (
              table.filteredRows.map((p) => (
                <tr key={p.param_id} onClick={() => setEditParam(p)} style={{ cursor: "pointer" }}>
                  <SelectRowCell table={table} row={p} />
                  {table.isColumnVisible("name") && <td className="bp-td-strong">{p.name}</td>}
                  {table.isColumnVisible("category") && <td className="bp-td-muted">{CATEGORY_LABELS[p.category] || p.category}</td>}
                  {table.isColumnVisible("rate_type") && <td className="bp-td-muted">{RATE_TYPE_LABELS[p.rate_type] || p.rate_type}</td>}
                  {table.isColumnVisible("current_value") && <td>{inr(p.current_value ?? p.value)}</td>}
                  {table.isColumnVisible("unit") && <td className="bp-td-muted">{p.unit || "—"}</td>}
                  {table.isColumnVisible("linked_employee_name") && <td className="bp-td-muted">{p.linked_employee_name || "—"}</td>}
                  {table.isColumnVisible("notes") && <td className="bp-td-muted">{p.notes || "—"}</td>}
                  {table.isColumnVisible("created_by_name") && <td className="bp-td-muted">{p.created_by_name || "—"}</td>}
                  {table.isColumnVisible("created_at") && <td className="bp-td-muted">{formatDateTime(p.created_at) || "—"}</td>}
                  {table.isColumnVisible("updated_by_name") && <td className="bp-td-muted">{p.updated_by_name || "—"}</td>}
                  {table.isColumnVisible("updated_at") && <td className="bp-td-muted">{formatDateTime(p.updated_at) || "—"}</td>}
                  <td className="bp-td-actions">
                    <button type="button" className="bp-btn-sm" onClick={(e) => { e.stopPropagation(); setHistoryParam(p); }}>History</button>
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

      {showAdd && <CostParameterModal employees={employees} onClose={() => setShowAdd(false)} onDone={onSaved} />}
      {editParam && <CostParameterModal param={editParam} employees={employees} onClose={() => setEditParam(null)} onDone={onSaved} />}
      {historyParam && <HistoryModal param={historyParam} onClose={() => setHistoryParam(null)} />}
    </div>
  );
}

function CostParameterModal({ param, employees, onClose, onDone }) {
  const isEdit = !!param;
  const [name, setName] = useState(param?.name || "");
  const [category, setCategory] = useState(param?.category || "material");
  const [rateType, setRateType] = useState(param?.rate_type || "per_production");
  const [linkedEmployeeId, setLinkedEmployeeId] = useState(param?.linked_employee_id || "");
  const [unit, setUnit] = useState(param?.unit || "");
  const [notes, setNotes] = useState(param?.notes || "");
  // "Add a new rate" is deliberately separate from editing metadata —
  // starts blank/unchecked on edit so an ordinary metadata edit never
  // accidentally adds a spurious history row.
  const [addingRate, setAddingRate] = useState(!isEdit);
  const [value, setValue] = useState(isEdit ? "" : "");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isLabour = category === "labour";

  async function submit(e) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    if (!isEdit || addingRate) {
      if (value === "" || Number.isNaN(Number(value))) {
        setError("Enter a value.");
        return;
      }
    }
    setSubmitting(true);
    setError("");
    try {
      const body = {
        name: name.trim(),
        category,
        rate_type: isLabour ? "per_hour" : rateType,
        linked_employee_id: isLabour ? (linkedEmployeeId || undefined) : undefined,
        unit: unit || undefined,
        notes: notes || undefined,
      };
      if (!isEdit || addingRate) {
        body.value = Number(value);
        body.effective_date = effectiveDate || undefined;
      }
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
            <label className="bp-field-label" htmlFor="cpCategory">Category</label>
            <select id="cpCategory" className="bp-field-input" value={category} onChange={(e) => setCategory(e.target.value)}>
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label className="bp-field-label" htmlFor="cpUnit">Unit</label>
            <input id="cpUnit" type="text" className="bp-field-input" placeholder="e.g. per kg, per hr" value={unit} onChange={(e) => setUnit(e.target.value)} />
          </div>
        </div>

        {isLabour ? (
          <>
            <label className="bp-field-label" htmlFor="cpEmployee">Linked employee</label>
            <select id="cpEmployee" className="bp-field-input" value={linkedEmployeeId} onChange={(e) => setLinkedEmployeeId(e.target.value)}>
              <option value="">— None —</option>
              {employees.map((emp) => <option key={emp.employee_id} value={emp.employee_id}>{emp.full_name}</option>)}
            </select>
            <p className="bp-td-muted" style={{ fontSize: 12, marginTop: -6, marginBottom: 10 }}>
              Rate is computed automatically from this employee's monthly salary (per hour, 26 days × 8 hours) — value entry below is disabled.
            </p>
          </>
        ) : (
          <>
            <label className="bp-field-label" htmlFor="cpRateType">Rate type</label>
            <select id="cpRateType" className="bp-field-input" value={rateType} onChange={(e) => setRateType(e.target.value)}>
              {Object.entries(RATE_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </>
        )}

        <label className="bp-field-label" htmlFor="cpNotes">Notes (optional)</label>
        <textarea id="cpNotes" className="bp-field-input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />

        {!isLabour && (
          <>
            {isEdit && (
              <label className="bp-field-label" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input type="checkbox" checked={addingRate} onChange={(e) => setAddingRate(e.target.checked)} />
                Add a new rate
              </label>
            )}
            {(!isEdit || addingRate) && (
              <div className="bp-form-row">
                <div style={{ flex: 1 }}>
                  <label className="bp-field-label" htmlFor="cpValue">Value</label>
                  <input id="cpValue" type="number" step="0.0001" className="bp-field-input" value={value} onChange={(e) => setValue(e.target.value)} required={!isEdit || addingRate} />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="bp-field-label" htmlFor="cpEffective">Effective date (optional)</label>
                  <input id="cpEffective" type="date" className="bp-field-input" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} />
                </div>
              </div>
            )}
          </>
        )}

        <div className="bp-form-actions">
          <button type="button" className="bp-btn-outline" onClick={onClose} disabled={submitting}>Cancel</button>
          <button type="submit" className="bp-btn-primary" disabled={submitting}>{submitting ? "Saving…" : isEdit ? "Save changes" : "Add parameter"}</button>
        </div>
      </form>
    </Modal>
  );
}

function HistoryModal({ param, onClose }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    costParametersApi.history(param.param_id)
      .then((d) => setHistory(d.items || []))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load history."))
      .finally(() => setLoading(false));
  }, [param.param_id]);

  return (
    <Modal title={`History — ${param.name}`} onClose={onClose}>
      {error && <div className="bp-inline-error">{error}</div>}
      {loading ? (
        <div className="bp-td-muted">Loading…</div>
      ) : history.length === 0 ? (
        <div className="bp-td-muted">No rate history recorded yet.</div>
      ) : (
        <table className="bp-table">
          <thead>
            <tr><th>Effective date</th><th>Value</th></tr>
          </thead>
          <tbody>
            {history.map((h) => (
              <tr key={h.history_id}>
                <td className="bp-td-muted">{formatDate(h.effective_date)}</td>
                <td className="bp-td-strong">{inr(h.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Modal>
  );
}
