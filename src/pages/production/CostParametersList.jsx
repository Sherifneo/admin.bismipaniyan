import { useEffect, useState } from "react";
import { costParametersApi, employeesApi } from "../../api/admin";
import { ApiError } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import Modal from "../../components/Modal";
import { formatDate, formatDateTime } from "../../utils/date";

const CATEGORY_LABELS = { material: "Material", labour: "Labour", overhead: "Overhead", utility: "Utility" };
const BASIS_LABELS = { per_hour: "Per hour", per_production: "—" };

function inr(n) {
  return n === null || n === undefined || n === "" ? "—" : "₹" + Number(n).toLocaleString("en-IN", { maximumFractionDigits: 4 });
}

// These rates are applied automatically when a production run is
// completed — staff never type a rate themselves at that point, they
// just pick which ones are applicable. Editing a rate here only affects
// runs completed after the change; every already-completed run
// permanently keeps the rate it actually used (append-only history, see
// backend/src/routes/cost-parameters.js).
export default function CostParametersList() {
  const { hasPermission } = useAuth();
  const [params, setParams] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editParam, setEditParam] = useState(null);
  const [rateParam, setRateParam] = useState(null);
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
    setRateParam(null);
    await load();
  }

  async function remove(param) {
    if (!window.confirm(`Remove ${param.name}?`)) return;
    try {
      await costParametersApi.remove(param.param_id);
      await load();
    } catch (err) {
      window.alert(err instanceof ApiError ? err.message : "Could not remove this parameter.");
    }
  }

  async function toggleActive(param) {
    await costParametersApi.update(param.param_id, { is_active: !param.is_active });
    await load();
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 10 }}>
        <h1 className="bp-page-title">Cost Parameters</h1>
        <button type="button" className="bp-btn-primary" onClick={() => setShowAdd(true)}>+ Add parameter</button>
      </div>
      <p className="bp-td-muted" style={{ margin: "-6px 0 14px" }}>
        These rates are applied automatically when a production run is completed — staff never type a rate themselves.
        Editing a rate here only affects runs completed after the change; every already-completed run permanently keeps
        the rate it actually used.
      </p>

      {error && <div className="bp-inline-error">{error}</div>}

      <div className="bp-table-wrap">
        <table className="bp-table">
          <thead>
            <tr>
              <th>Parameter</th>
              <th>Rate</th>
              <th>Unit</th>
              <th>Basis</th>
              <th>Active</th>
              <th>Last updated</th>
              <th>Updated by</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="bp-table-empty">Loading…</td></tr>
            ) : params.length === 0 ? (
              <tr><td colSpan={8} className="bp-table-empty">No cost parameters yet.</td></tr>
            ) : (
              params.map((p) => (
                <tr key={p.param_id} style={{ opacity: p.is_active ? 1 : 0.55 }}>
                  <td className="bp-td-strong">{p.name}</td>
                  <td>{inr(p.current_value ?? p.value)}</td>
                  <td className="bp-td-muted">{p.unit || "—"}</td>
                  <td className="bp-td-muted">{BASIS_LABELS[p.rate_type] ?? "—"}</td>
                  <td>
                    <span className={`bp-badge ${p.is_active ? "bp-badge-success" : "bp-badge-neutral"}`}>
                      {p.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="bp-td-muted">{formatDateTime(p.updated_at) || "—"}</td>
                  <td className="bp-td-muted">{p.updated_by_name || p.created_by_name || "—"}</td>
                  <td className="bp-td-actions">
                    <button type="button" className="bp-btn-sm" onClick={() => setRateParam(p)}>Edit rate</button>
                    <button type="button" className="bp-btn-sm" onClick={() => setEditParam(p)}>Edit</button>
                    <button type="button" className="bp-btn-sm" onClick={() => setHistoryParam(p)}>History</button>
                    {hasPermission("production.manage", "full_control") && (
                      <>
                        <button type="button" className="bp-btn-sm" onClick={() => toggleActive(p)}>
                          {p.is_active ? "Deactivate" : "Activate"}
                        </button>
                        <button type="button" className="bp-btn-sm" onClick={() => remove(p)}>Remove</button>
                      </>
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
      {rateParam && <EditRateModal param={rateParam} onClose={() => setRateParam(null)} onDone={onSaved} />}
      {historyParam && <HistoryModal param={historyParam} onClose={() => setHistoryParam(null)} />}
    </div>
  );
}

// The common weekly action — just update the rate, nothing else. Kept
// separate from the full Edit form so changing a price doesn't require
// wading through Category/Unit/Notes every time.
function EditRateModal({ param, onClose, onDone }) {
  const [value, setValue] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (value === "" || Number.isNaN(Number(value))) {
      setError("Enter a rate.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await costParametersApi.update(param.param_id, { value: Number(value), effective_date: effectiveDate || undefined });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update this rate.");
      setSubmitting(false);
    }
  }

  return (
    <Modal title={`Edit rate — ${param.name}`} onClose={onClose}>
      <form onSubmit={submit} className="bp-form">
        {error && <div className="bp-inline-error">{error}</div>}
        <p className="bp-td-muted" style={{ marginTop: 0 }}>
          Current rate: <strong>{inr(param.current_value ?? param.value)}</strong>{param.unit ? ` / ${param.unit}` : ""}
        </p>

        <label className="bp-field-label" htmlFor="erValue">New rate (₹)</label>
        <input id="erValue" type="number" step="0.0001" className="bp-field-input" value={value} onChange={(e) => setValue(e.target.value)} required autoFocus />

        <label className="bp-field-label" htmlFor="erDate">Effective date (optional)</label>
        <input id="erDate" type="date" className="bp-field-input" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} />
        <p className="bp-td-muted" style={{ fontSize: 12, marginTop: -6 }}>
          Leave blank to apply from today. This doesn't change any already-completed production run's recorded cost.
        </p>

        <div className="bp-form-actions">
          <button type="button" className="bp-btn-outline" onClick={onClose} disabled={submitting}>Cancel</button>
          <button type="submit" className="bp-btn-primary" disabled={submitting}>{submitting ? "Saving…" : "Save rate"}</button>
        </div>
      </form>
    </Modal>
  );
}

function CostParameterModal({ param, employees, onClose, onDone }) {
  const isEdit = !!param;
  const [name, setName] = useState(param?.name || "");
  const [value, setValue] = useState(isEdit ? "" : "");
  const [unit, setUnit] = useState(param?.unit || "");
  const [category, setCategory] = useState(param?.category || "material");
  const [rateType, setRateType] = useState(param?.rate_type || "per_production");
  const [linkedEmployeeId, setLinkedEmployeeId] = useState(param?.linked_employee_id || "");
  const [defaultConsumption, setDefaultConsumption] = useState(param?.default_consumption ?? "");
  const [notes, setNotes] = useState(param?.notes || "");
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
    if (!isEdit && !isLabour && (value === "" || Number.isNaN(Number(value)))) {
      setError("Enter a rate.");
      return;
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
        default_consumption: defaultConsumption === "" ? undefined : Number(defaultConsumption),
        notes: notes || undefined,
      };
      if (!isEdit) {
        body.value = isLabour ? 0 : Number(value);
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
        <input id="cpName" type="text" className="bp-field-input" placeholder="e.g. Electricity" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />

        {!isEdit && !isLabour && (
          <>
            <div className="bp-form-row">
              <div style={{ flex: 1 }}>
                <label className="bp-field-label" htmlFor="cpValue">Rate (₹)</label>
                <input id="cpValue" type="number" step="0.0001" className="bp-field-input" value={value} onChange={(e) => setValue(e.target.value)} required />
              </div>
              <div style={{ flex: 1 }}>
                <label className="bp-field-label" htmlFor="cpUnit">Unit (optional)</label>
                <input id="cpUnit" type="text" className="bp-field-input" placeholder="e.g. kWh, litre, kg" value={unit} onChange={(e) => setUnit(e.target.value)} />
              </div>
            </div>
            <p className="bp-td-muted" style={{ fontSize: 12, marginTop: -6, marginBottom: 10 }}>
              Unit just labels the rate for display (e.g. "₹8.00 / kWh") — leave it blank if it doesn't apply.
            </p>
          </>
        )}

        {isEdit && !isLabour && (
          <>
            <label className="bp-field-label" htmlFor="cpUnit">Unit (optional)</label>
            <input id="cpUnit" type="text" className="bp-field-input" placeholder="e.g. kWh, litre, kg" value={unit} onChange={(e) => setUnit(e.target.value)} />
            <p className="bp-td-muted" style={{ fontSize: 12, marginTop: -6, marginBottom: 10 }}>
              To change the rate itself, use "Edit rate" from the list instead — this form is for name/category/unit only.
            </p>
          </>
        )}

        <div className="bp-form-row">
          <div style={{ flex: 1 }}>
            <label className="bp-field-label" htmlFor="cpCategory">Category</label>
            <select id="cpCategory" className="bp-field-input" value={category} onChange={(e) => setCategory(e.target.value)}>
              {Object.entries(CATEGORY_LABELS).map(([v, label]) => <option key={v} value={v}>{label}</option>)}
            </select>
          </div>
          {!isLabour && (
            <div style={{ flex: 1 }}>
              <label className="bp-field-label" htmlFor="cpRateType">Basis</label>
              <select id="cpRateType" className="bp-field-input" value={rateType} onChange={(e) => setRateType(e.target.value)}>
                <option value="per_production">Flat, per production run</option>
                <option value="per_hour">Per hour</option>
              </select>
            </div>
          )}
        </div>

        {isLabour && (
          <>
            <label className="bp-field-label" htmlFor="cpEmployee">Linked employee</label>
            <select id="cpEmployee" className="bp-field-input" value={linkedEmployeeId} onChange={(e) => setLinkedEmployeeId(e.target.value)}>
              <option value="">— None —</option>
              {employees.map((emp) => <option key={emp.employee_id} value={emp.employee_id}>{emp.full_name}</option>)}
            </select>
            <p className="bp-td-muted" style={{ fontSize: 12, marginTop: -6, marginBottom: 10 }}>
              Rate is computed automatically from this employee's monthly salary (per hour, 26 days × 8 hours) — no rate is entered here.
            </p>
          </>
        )}

        {!isLabour && (
          <>
            <label className="bp-field-label" htmlFor="cpDefaultConsumption">Default amount per run (optional)</label>
            <input
              id="cpDefaultConsumption" type="number" step="0.0001" className="bp-field-input"
              placeholder="Pre-fills this parameter's quantity when completing a run"
              value={defaultConsumption} onChange={(e) => setDefaultConsumption(e.target.value)}
            />
          </>
        )}

        <label className="bp-field-label" htmlFor="cpNotes">Notes (optional)</label>
        <textarea id="cpNotes" className="bp-field-input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />

        {!isEdit && !isLabour && (
          <>
            <label className="bp-field-label" htmlFor="cpEffective">Effective date (optional)</label>
            <input id="cpEffective" type="date" className="bp-field-input" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} />
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
            <tr><th>Effective date</th><th>Rate</th></tr>
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
