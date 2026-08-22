import { useEffect, useState } from "react";
import { productionApi, machinesApi, locationsApi, productsApi, employeesApi } from "../../api/admin";
import { ApiError } from "../../api/client";
import Modal from "../../components/Modal";
import Pagination from "../../components/Pagination";
import StatusBadge from "../../components/StatusBadge";
import { useDataTable, SearchByBar, ColumnHeader, DataTableToolbar, SelectAllHeaderCell, SelectRowCell, ColumnChooserButton } from "../../components/DataTable";
import { useUrlSearch } from "../../hooks/useUrlSearch";

const LIMIT = 20;
const STAGE_LABELS = { mixing: "Mixing", baking: "Baking", packing: "Packing" };

// Only the factory actually produces anything — the retail stores are
// never a production location. Mirrors SalesOrdersList.jsx's storesOnly()
// the same way, just filtered to the opposite kind.
function factoryOnly(locations) {
  return locations.filter((l) => l.kind === "factory");
}

// Turns raw materials into finished goods at a location, optionally on a
// specific machine. A run starts 'planned', moves through 'in_progress',
// and only 'completed' writes stock into inventory_movements as a
// production_in movement (see backend/src/routes/production-runs.js) —
// mirroring how a purchase order only touches stock on 'received'.
export default function ProductionRunsList() {
  const urlSearch = useUrlSearch();
  const [products, setProducts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [machines, setMachines] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [runs, setRuns] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [viewRun, setViewRun] = useState(null);

  useEffect(() => {
    productsApi.list({ limit: 500 }).then((d) => setProducts(d.items || [])).catch(() => {});
    locationsApi.list().then(setLocations).catch(() => {});
    machinesApi.list({}).then((d) => setMachines(d.items || [])).catch(() => {});
    employeesApi.list({}).then((d) => setEmployees(d.items || [])).catch(() => {});
  }, []);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await productionApi.listRuns({ page, limit: LIMIT, status });
      setRuns(data.items || []);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load production runs.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status]);

  async function onSaved() {
    setShowAdd(false);
    await load();
  }

  const columns = [
    { key: "product_code", label: "Item ID", accessor: (run) => run.product_code || "" },
    { key: "product_name", label: "Product", accessor: (run) => run.product_name },
    { key: "location_name", label: "Location", accessor: (run) => run.location_name },
    { key: "machine_name", label: "Machine", accessor: (run) => run.machine_name || "" },
    { key: "quantity_produced", label: "Qty", accessor: (run) => run.quantity_produced, filter: "number" },
    { key: "run_date", label: "Run date", accessor: (run) => run.run_date, filter: "dateRange" },
    {
      key: "status", label: "Status", accessor: (run) => run.status, filter: "select",
      options: [{ value: "planned", label: "Planned" }, { value: "in_progress", label: "In progress" }, { value: "completed", label: "Completed" }, { value: "cancelled", label: "Cancelled" }],
    },
    { key: "created_by_name", label: "Created by", accessor: (run) => run.created_by_name || "", hiddenByDefault: true },
    { key: "created_at", label: "Created at", accessor: (run) => run.created_at || "", filter: "dateRange", hiddenByDefault: true },
    { key: "updated_by_name", label: "Updated by", accessor: (run) => run.updated_by_name || "", hiddenByDefault: true },
    { key: "updated_at", label: "Updated at", accessor: (run) => run.updated_at || "", filter: "dateRange", hiddenByDefault: true },
  ];
  const table = useDataTable({ rows: runs, columns, rowKey: (run) => run.run_id });

  useEffect(() => {
    if (urlSearch.q) table.setFilter("product_name", { operator: "contains", value: urlSearch.q });
    if (urlSearch.from || urlSearch.to) table.setFilter("run_date", { operator: "between", from: urlSearch.from || undefined, to: urlSearch.to || undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 10 }}>
        <h1 className="bp-page-title">Production Runs</h1>
        <button type="button" className="bp-btn-primary" onClick={() => setShowAdd(true)}>+ New run</button>
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
        <select className="bp-field-input" style={{ width: "auto" }} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          <option value="planned">Planned</option>
          <option value="in_progress">In progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {error && <div className="bp-inline-error">{error}</div>}

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <DataTableToolbar table={table} filename="production-runs" totalCount={runs.length} />
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
              <tr><td colSpan={13} className="bp-table-empty">No production runs found.</td></tr>
            ) : (
              table.filteredRows.map((run) => (
                <tr key={run.run_id}>
                  <SelectRowCell table={table} row={run} />
                  {table.isColumnVisible("product_code") && <td className="bp-td-muted">{run.product_code || "—"}</td>}
                  {table.isColumnVisible("product_name") && <td className="bp-td-strong">{run.product_name}</td>}
                  {table.isColumnVisible("location_name") && <td className="bp-td-muted">{run.location_name}</td>}
                  {table.isColumnVisible("machine_name") && <td className="bp-td-muted">{run.machine_name || "—"}</td>}
                  {table.isColumnVisible("quantity_produced") && <td className="bp-td-muted">{run.quantity_produced} {run.uom}</td>}
                  {table.isColumnVisible("run_date") && <td className="bp-td-muted">{run.run_date}</td>}
                  {table.isColumnVisible("status") && <td><StatusBadge status={run.status} /></td>}
                  {table.isColumnVisible("created_by_name") && <td className="bp-td-muted">{run.created_by_name || "—"}</td>}
                  {table.isColumnVisible("created_at") && <td className="bp-td-muted">{run.created_at ? new Date(run.created_at).toLocaleString("en-IN") : "—"}</td>}
                  {table.isColumnVisible("updated_by_name") && <td className="bp-td-muted">{run.updated_by_name || "—"}</td>}
                  {table.isColumnVisible("updated_at") && <td className="bp-td-muted">{run.updated_at ? new Date(run.updated_at).toLocaleString("en-IN") : "—"}</td>}
                  <td className="bp-td-actions">
                    <button type="button" className="bp-btn-sm" onClick={() => setViewRun(run)}>View</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} limit={LIMIT} total={total} onPageChange={setPage} />

      {showAdd && (
        <NewRunModal products={products} locations={locations} machines={machines} employees={employees} onClose={() => setShowAdd(false)} onDone={onSaved} />
      )}
      {viewRun && (
        <RunDetailModal runId={viewRun.run_id} onClose={() => setViewRun(null)} onChanged={load} />
      )}
    </div>
  );
}

function NewRunModal({ products, locations, machines, employees, onClose, onDone }) {
  const factoryLocations = factoryOnly(locations);
  const [productId, setProductId] = useState("");
  const [locationId, setLocationId] = useState(factoryLocations[0]?.location_id || "");
  const [machineId, setMachineId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [runDate, setRunDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [defaultEmployeeId, setDefaultEmployeeId] = useState("");
  // Which stages have been individually overridden — those stop
  // following the default worker when it changes.
  const [stageEmployees, setStageEmployees] = useState({ mixing: "", baking: "", packing: "" });
  const [stageEditedManually, setStageEditedManually] = useState(() => new Set());
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function changeDefaultEmployee(value) {
    setDefaultEmployeeId(value);
    setStageEmployees((prev) => {
      const next = { ...prev };
      for (const stage of Object.keys(STAGE_LABELS)) {
        if (!stageEditedManually.has(stage)) next[stage] = value;
      }
      return next;
    });
  }

  function changeStageEmployee(stage, value) {
    setStageEmployees((prev) => ({ ...prev, [stage]: value }));
    setStageEditedManually((prev) => new Set(prev).add(stage));
  }

  async function submit(e) {
    e.preventDefault();
    if (!productId || !locationId) {
      setError("Select a product and a location.");
      return;
    }
    if (!quantity || Number(quantity) <= 0) {
      setError("Quantity produced must be greater than zero.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await productionApi.createRun({
        product_id: productId,
        location_id: locationId,
        machine_id: machineId || undefined,
        quantity_produced: Number(quantity),
        run_date: runDate || undefined,
        notes: notes || undefined,
        default_employee_id: defaultEmployeeId || undefined,
        stage_employees: {
          mixing: stageEmployees.mixing || undefined,
          baking: stageEmployees.baking || undefined,
          packing: stageEmployees.packing || undefined,
        },
      });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create this production run.");
      setSubmitting(false);
    }
  }

  return (
    <Modal title="New production run" onClose={onClose}>
      <form onSubmit={submit} className="bp-form">
        {error && <div className="bp-inline-error">{error}</div>}

        <div className="bp-form-row">
          <div style={{ flex: 1 }}>
            <label className="bp-field-label" htmlFor="runProduct">Product</label>
            <select id="runProduct" className="bp-field-input" value={productId} onChange={(e) => setProductId(e.target.value)} required>
              <option value="">Select product…</option>
              {products.map((p) => <option key={p.product_id} value={p.product_id}>{p.product_code ? `${p.product_code} — ${p.name}` : p.name}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label className="bp-field-label" htmlFor="runLocation">Location</label>
            <select id="runLocation" className="bp-field-input" value={locationId} onChange={(e) => setLocationId(e.target.value)} required>
              {factoryLocations.map((l) => <option key={l.location_id} value={l.location_id}>{l.name}</option>)}
            </select>
          </div>
        </div>

        <div className="bp-form-row">
          <div style={{ flex: 1 }}>
            <label className="bp-field-label" htmlFor="runMachine">Machine (optional)</label>
            <select id="runMachine" className="bp-field-input" value={machineId} onChange={(e) => setMachineId(e.target.value)}>
              <option value="">— None —</option>
              {machines.map((m) => <option key={m.machine_id} value={m.machine_id}>{m.name}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label className="bp-field-label" htmlFor="runQty">Quantity produced</label>
            <input id="runQty" type="number" min="0" step="0.01" className="bp-field-input" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
          </div>
        </div>

        <label className="bp-field-label" htmlFor="runDate">Run date (optional)</label>
        <input id="runDate" type="date" className="bp-field-input" value={runDate} onChange={(e) => setRunDate(e.target.value)} />

        <label className="bp-field-label" htmlFor="runDefaultWorker">Default worker</label>
        <select id="runDefaultWorker" className="bp-field-input" value={defaultEmployeeId} onChange={(e) => changeDefaultEmployee(e.target.value)}>
          <option value="">— None —</option>
          {employees.map((emp) => <option key={emp.employee_id} value={emp.employee_id}>{emp.full_name}</option>)}
        </select>
        <p className="bp-td-muted" style={{ fontSize: 12, marginTop: -6, marginBottom: 10 }}>
          Auto-fills Mixing, Baking, and Packing below — change any stage individually if a different worker is doing that step.
        </p>

        <label className="bp-field-label">Stage workers</label>
        <div className="bp-form-row">
          {Object.entries(STAGE_LABELS).map(([stage, label]) => (
            <div key={stage} style={{ flex: 1 }}>
              <label className="bp-field-label" htmlFor={`runStage-${stage}`} style={{ fontWeight: 400, fontSize: 11.5 }}>{label}</label>
              <select
                id={`runStage-${stage}`}
                className="bp-field-input"
                value={stageEmployees[stage]}
                onChange={(e) => changeStageEmployee(stage, e.target.value)}
              >
                <option value="">— None —</option>
                {employees.map((emp) => <option key={emp.employee_id} value={emp.employee_id}>{emp.full_name}</option>)}
              </select>
            </div>
          ))}
        </div>

        <label className="bp-field-label" htmlFor="runNotes">Notes (optional)</label>
        <textarea id="runNotes" className="bp-field-input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />

        <div className="bp-form-actions">
          <button type="button" className="bp-btn-outline" onClick={onClose} disabled={submitting}>Cancel</button>
          <button type="submit" className="bp-btn-primary" disabled={submitting}>{submitting ? "Saving…" : "Create run"}</button>
        </div>
      </form>
    </Modal>
  );
}

function RunDetailModal({ runId, onClose, onChanged }) {
  const [run, setRun] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [stageBusy, setStageBusy] = useState(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await productionApi.getRun(runId);
      setRun(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load this production run.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    employeesApi.list({}).then((d) => setEmployees(d.items || [])).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId]);

  async function setStatus(status) {
    setBusy(true);
    try {
      await productionApi.updateRun(runId, { status });
      await load();
      await onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update status.");
    } finally {
      setBusy(false);
    }
  }

  async function updateStage(stage, body) {
    setStageBusy(stage);
    try {
      await productionApi.updateStage(runId, stage, body);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update this stage.");
    } finally {
      setStageBusy(null);
    }
  }

  return (
    <Modal title={run ? `${run.product_name} — ${run.location_name}` : "Production run"} onClose={onClose}>
      {loading ? (
        <div className="bp-td-muted">Loading…</div>
      ) : error ? (
        <div className="bp-inline-error">{error}</div>
      ) : (
        <>
          <div style={{ display: "flex", gap: 16, marginBottom: 12, flexWrap: "wrap" }}>
            <div><span className="bp-td-muted">Status: </span><StatusBadge status={run.status} /></div>
            <div><span className="bp-td-muted">Quantity:</span> {run.quantity_produced} {run.uom}</div>
            <div><span className="bp-td-muted">Run date:</span> {run.run_date}</div>
            {run.machine_name && <div><span className="bp-td-muted">Machine:</span> {run.machine_name}</div>}
          </div>

          {run.notes && <p className="bp-td-muted" style={{ marginTop: 0, marginBottom: 12 }}>{run.notes}</p>}

          {run.stages && run.stages.length > 0 && (
            <>
              <label className="bp-field-label">Stages</label>
              <div className="bp-table-wrap" style={{ marginBottom: 14 }}>
                <table className="bp-table">
                  <thead>
                    <tr><th>Stage</th><th>Worker</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {run.stages.map((s) => (
                      <tr key={s.stage_id}>
                        <td className="bp-td-strong">{STAGE_LABELS[s.stage]}</td>
                        <td>
                          <select
                            className="bp-field-input"
                            value={s.employee_id || ""}
                            onChange={(e) => updateStage(s.stage, { employee_id: e.target.value || undefined })}
                            disabled={stageBusy === s.stage}
                          >
                            <option value="">— None —</option>
                            {employees.map((emp) => <option key={emp.employee_id} value={emp.employee_id}>{emp.full_name}</option>)}
                          </select>
                        </td>
                        <td>
                          <select
                            className="bp-field-input"
                            value={s.status}
                            onChange={(e) => updateStage(s.stage, { status: e.target.value })}
                            disabled={stageBusy === s.stage}
                          >
                            <option value="pending">Pending</option>
                            <option value="in_progress">In progress</option>
                            <option value="completed">Completed</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <div className="bp-form-actions">
            {run.status === "planned" && (
              <button type="button" className="bp-btn-outline" onClick={() => setStatus("in_progress")} disabled={busy}>Start</button>
            )}
            {(run.status === "planned" || run.status === "in_progress") && (
              <button type="button" className="bp-btn-primary" onClick={() => setStatus("completed")} disabled={busy}>Complete (adds to stock)</button>
            )}
            {run.status !== "completed" && run.status !== "cancelled" && (
              <button type="button" className="bp-btn-outline" onClick={() => setStatus("cancelled")} disabled={busy}>Cancel</button>
            )}
          </div>
        </>
      )}
    </Modal>
  );
}
