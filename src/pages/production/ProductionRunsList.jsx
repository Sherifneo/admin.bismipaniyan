import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { productionApi, machinesApi, locationsApi, productsApi, employeesApi, bomsApi, costParametersApi } from "../../api/admin";
import { ApiError } from "../../api/client";
import Modal from "../../components/Modal";
import Pagination from "../../components/Pagination";
import StatusBadge from "../../components/StatusBadge";
import { useDataTable, SearchByBar, ColumnHeader, DataTableToolbar, SelectAllHeaderCell, SelectRowCell, ColumnChooserButton } from "../../components/DataTable";
import { useUrlSearch } from "../../hooks/useUrlSearch";
import { formatDate, formatDateTime } from "../../utils/date";

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
    {
      key: "quantity", label: "Qty",
      accessor: (run) => run.actual_quantity != null && run.actual_quantity !== run.planned_quantity
        ? `${run.planned_quantity} → ${run.actual_quantity}` : run.planned_quantity,
    },
    { key: "run_date", label: "Run date", accessor: (run) => run.run_date, filter: "dateRange" },
    {
      key: "status", label: "Status", accessor: (run) => run.status, filter: "select",
      options: [{ value: "planned", label: "Planned" }, { value: "in_progress", label: "In progress" }, { value: "completed", label: "Completed" }, { value: "cancelled", label: "Cancelled" }],
    },
    { key: "created_by_name", label: "Created by", accessor: (run) => run.created_by_name || "", hiddenByDefault: true },
    { key: "created_at", label: "Created at", accessor: (run) => run.created_at || "", filter: "dateRange", hiddenByDefault: true },
    { key: "updated_by_name", label: "Updated by", accessor: (run) => run.updated_by_name || "", hiddenByDefault: true },
    { key: "updated_at", label: "Updated at", accessor: (run) => run.updated_at || "", filter: "dateRange", hiddenByDefault: true },
    { key: "universal_trans_id", label: "TransID", accessor: (run) => run.universal_trans_id || "", hiddenByDefault: true },
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
                  {table.isColumnVisible("quantity") && (
                    <td className="bp-td-muted">
                      {run.planned_quantity} {run.uom}
                      {run.actual_quantity != null && run.actual_quantity !== run.planned_quantity ? ` → ${run.actual_quantity} ${run.uom}` : ""}
                    </td>
                  )}
                  {table.isColumnVisible("run_date") && <td className="bp-td-muted">{formatDate(run.run_date)}</td>}
                  {table.isColumnVisible("status") && <td><StatusBadge status={run.status} /></td>}
                  {table.isColumnVisible("created_by_name") && <td className="bp-td-muted">{run.created_by_name || "—"}</td>}
                  {table.isColumnVisible("created_at") && <td className="bp-td-muted">{formatDateTime(run.created_at) || "—"}</td>}
                  {table.isColumnVisible("updated_by_name") && <td className="bp-td-muted">{run.updated_by_name || "—"}</td>}
                  {table.isColumnVisible("updated_at") && <td className="bp-td-muted">{formatDateTime(run.updated_at) || "—"}</td>}
                  {table.isColumnVisible("universal_trans_id") && (
                    <td>
                      {run.universal_trans_id ? (
                        <Link to={`/global-search?trans=${encodeURIComponent(run.universal_trans_id)}`} className="bp-trans-id-link" onClick={(e) => e.stopPropagation()}>{run.universal_trans_id}</Link>
                      ) : "—"}
                    </td>
                  )}
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
  const [boms, setBoms] = useState([]);
  const [bomId, setBomId] = useState("");
  const [runDate, setRunDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [defaultEmployeeId, setDefaultEmployeeId] = useState("");
  // Which stages have been individually overridden — those stop
  // following the default worker when it changes.
  const [stageEmployees, setStageEmployees] = useState({ mixing: "", baking: "", packing: "" });
  const [stageEditedManually, setStageEditedManually] = useState(() => new Set());
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!productId) {
      setBoms([]);
      setBomId("");
      return;
    }
    bomsApi.list({ productId }).then((d) => setBoms((d.items || []).filter((b) => b.status === "approved"))).catch(() => setBoms([]));
    setBomId("");
  }, [productId]);

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
      setError("Planned quantity must be greater than zero.");
      return;
    }
    if (!defaultEmployeeId) {
      setError("Select a default worker.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await productionApi.createRun({
        product_id: productId,
        location_id: locationId,
        machine_id: machineId || undefined,
        planned_quantity: Number(quantity),
        run_date: runDate || undefined,
        notes: notes || undefined,
        bom_id: bomId || undefined,
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
            <label className="bp-field-label" htmlFor="runQty">Planned quantity</label>
            <input id="runQty" type="number" min="0" step="0.01" className="bp-field-input" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
          </div>
        </div>

        {boms.length > 0 && (
          <>
            <label className="bp-field-label" htmlFor="runBom">BOM (optional — consumes raw materials on completion)</label>
            <select id="runBom" className="bp-field-input" value={bomId} onChange={(e) => setBomId(e.target.value)}>
              <option value="">— None —</option>
              {boms.map((b) => <option key={b.bom_id} value={b.bom_id}>{b.bom_name} (makes {b.output_qty} {b.product_uom})</option>)}
            </select>
          </>
        )}

        <label className="bp-field-label" htmlFor="runDate">Run date (optional)</label>
        <input id="runDate" type="date" className="bp-field-input" value={runDate} onChange={(e) => setRunDate(e.target.value)} />

        <label className="bp-field-label" htmlFor="runDefaultWorker">Default worker</label>
        <select id="runDefaultWorker" className="bp-field-input" value={defaultEmployeeId} onChange={(e) => changeDefaultEmployee(e.target.value)} required>
          <option value="">Select a worker…</option>
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

const STAGES_ORDER = ["mixing", "baking", "packing"];

// Mixing -> Baking -> Packing must complete in that order; a stage
// needs a worker AND hours worked before it can go to Completed, and
// hours are captured right here, inline, since that's the moment
// they're actually known — not deferred to run completion.
function stageBlockReason(stage, run) {
  if (!run.stages) return null;
  const idx = STAGES_ORDER.indexOf(stage);
  for (let i = 0; i < idx; i++) {
    const prior = run.stages.find((s) => s.stage === STAGES_ORDER[i]);
    if (!prior || prior.status !== "completed") {
      return `Complete ${STAGE_LABELS[STAGES_ORDER[i]]} first`;
    }
  }
  return null;
}

function RunDetailModal({ runId, onClose, onChanged }) {
  const [run, setRun] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [stageBusy, setStageBusy] = useState(null);
  const [stageHoursDraft, setStageHoursDraft] = useState({});
  const [showComplete, setShowComplete] = useState(false);

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
    setError("");
    try {
      await productionApi.updateStage(runId, stage, body);
      await load();
      await onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update this stage.");
    } finally {
      setStageBusy(null);
    }
  }

  function completeStage(s) {
    const blockReason = stageBlockReason(s.stage, run);
    if (blockReason) {
      setError(`${blockReason}.`);
      return;
    }
    if (!s.employee_id) {
      setError("Assign a worker to this stage before marking it complete.");
      return;
    }
    const hours = stageHoursDraft[s.stage] ?? s.hours_worked ?? "";
    if (!hours || Number(hours) <= 0) {
      setError("Enter hours worked for this stage before marking it complete.");
      return;
    }
    updateStage(s.stage, { status: "completed", hours_worked: Number(hours) });
  }

  const allStagesCompleted = run?.stages && run.stages.length > 0 && run.stages.every((s) => s.status === "completed");

  return (
    <Modal title={run ? `${run.product_name} — ${run.location_name}` : "Production run"} onClose={onClose} size="lg">
      {loading ? (
        <div className="bp-td-muted">Loading…</div>
      ) : (
        <>
          {error && <div className="bp-inline-error">{error}</div>}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px 20px", marginBottom: 14 }}>
            <div><span className="bp-td-muted">Status</span><br /><StatusBadge status={run.status} /></div>
            <div><span className="bp-td-muted">Planned qty</span><br /><strong>{run.planned_quantity} {run.uom}</strong></div>
            <div><span className="bp-td-muted">Actual qty</span><br /><strong>{run.actual_quantity != null ? `${run.actual_quantity} ${run.uom}` : "—"}</strong></div>
            <div><span className="bp-td-muted">Run date</span><br />{formatDate(run.run_date)}</div>
            <div><span className="bp-td-muted">Machine</span><br />{run.machine_name || "—"}</div>
            <div><span className="bp-td-muted">BOM</span><br />{run.bom_name || "—"}</div>
            {run.total_cost != null && <div><span className="bp-td-muted">Total production cost</span><br /><strong>{inr(run.total_cost)}</strong></div>}
            {run.cost_per_unit != null && <div><span className="bp-td-muted">Cost per unit</span><br /><strong>{inr(run.cost_per_unit)}</strong></div>}
          </div>

          {run.notes && <p className="bp-td-muted" style={{ marginTop: 0, marginBottom: 12 }}>{run.notes}</p>}

          {run.stages && run.stages.length > 0 && (
            <>
              <label className="bp-field-label">Stages</label>
              <div className="bp-table-wrap" style={{ marginBottom: 14 }}>
                <table className="bp-table">
                  <colgroup>
                    <col style={{ width: "16%" }} />
                    <col style={{ width: "30%" }} />
                    <col style={{ width: "12%" }} />
                    <col style={{ width: "18%" }} />
                    <col style={{ width: "24%" }} />
                  </colgroup>
                  <thead>
                    <tr><th>Stage</th><th>Worker</th><th>Hours</th><th>Status</th><th></th></tr>
                  </thead>
                  <tbody>
                    {run.stages.map((s) => {
                      const blockReason = stageBlockReason(s.stage, run);
                      return (
                        <tr key={s.stage_id}>
                          <td className="bp-td-strong">{STAGE_LABELS[s.stage]}</td>
                          <td>
                            <select
                              className="bp-field-input"
                              value={s.employee_id || ""}
                              onChange={(e) => updateStage(s.stage, { employee_id: e.target.value || undefined })}
                              disabled={stageBusy === s.stage || s.status === "completed"}
                            >
                              <option value="">— None —</option>
                              {employees.map((emp) => <option key={emp.employee_id} value={emp.employee_id}>{emp.full_name}</option>)}
                            </select>
                          </td>
                          <td>
                            <input
                              type="number" min="0" step="0.25" className="bp-field-input"
                              value={stageHoursDraft[s.stage] ?? s.hours_worked ?? ""}
                              onChange={(e) => setStageHoursDraft((prev) => ({ ...prev, [s.stage]: e.target.value }))}
                              disabled={stageBusy === s.stage || s.status === "completed"}
                            />
                          </td>
                          <td>
                            {s.status === "completed" ? (
                              <StatusBadge status="completed" />
                            ) : (
                              <button
                                type="button" className="bp-btn-sm"
                                onClick={() => completeStage(s)}
                                disabled={stageBusy === s.stage || !!blockReason}
                              >
                                {stageBusy === s.stage ? "Saving…" : "Mark complete"}
                              </button>
                            )}
                          </td>
                          <td className="bp-td-muted" style={{ fontSize: 11.5 }}>{s.status !== "completed" && blockReason}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {run.status === "completed" && run.cost_lines && run.cost_lines.length > 0 && (
            <>
              <label className="bp-field-label">Cost breakdown</label>
              <div className="bp-table-wrap" style={{ marginBottom: 14 }}>
                <table className="bp-table">
                  <thead>
                    <tr><th>Type</th><th>Name</th><th>Qty / Hours</th><th>Rate</th><th>Amount</th></tr>
                  </thead>
                  <tbody>
                    {run.cost_lines.map((l) => (
                      <tr key={l.cost_line_id}>
                        <td className="bp-td-muted" style={{ textTransform: "capitalize" }}>{l.line_type}</td>
                        <td>{l.line_type === "labour" ? `${STAGE_LABELS[l.stage]} — ${l.employee_name_snapshot}` : l.line_type === "overhead" ? l.param_name_snapshot : "BOM materials"}</td>
                        <td className="bp-td-muted">{l.line_type === "labour" ? l.hours : l.quantity ?? "—"}</td>
                        <td className="bp-td-muted">{l.line_type === "labour" ? inr(l.hourly_rate_snapshot) : l.rate_snapshot != null ? inr(l.rate_snapshot) : "—"}</td>
                        <td className="bp-td-strong">{inr(l.cost_amount)}</td>
                      </tr>
                    ))}
                    <tr>
                      <td colSpan={4} className="bp-td-strong" style={{ textAlign: "right" }}>Total</td>
                      <td className="bp-td-strong">{inr(run.total_cost)}</td>
                    </tr>
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
              <div>
                <button
                  type="button" className="bp-btn-primary"
                  onClick={() => setShowComplete(true)}
                  disabled={busy || !allStagesCompleted}
                >
                  Complete production
                </button>
                {!allStagesCompleted && <div className="bp-td-muted" style={{ fontSize: 11.5, marginTop: 4 }}>Complete all 3 stages first</div>}
              </div>
            )}
            {run.status !== "completed" && run.status !== "cancelled" && (
              <button type="button" className="bp-btn-outline" onClick={() => setStatus("cancelled")} disabled={busy}>Cancel</button>
            )}
          </div>
        </>
      )}

      {showComplete && (
        <CompleteRunModal
          runId={runId}
          run={run}
          onClose={() => setShowComplete(false)}
          onDone={async () => { setShowComplete(false); await load(); await onChanged(); }}
        />
      )}
    </Modal>
  );
}

function inr(n) {
  return n === null || n === undefined || n === "" ? "—" : "₹" + Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

// The confirmation screen at the moment of completion: stages/workers/
// hours are already locked in (captured per-stage above), material cost
// is a read-only preview computed from the run's BOM (never re-asked —
// the server independently recomputes and snapshots it), and only the
// Cost Parameters the operator explicitly flags as applicable to this
// run are included — nothing is forced.
function CompleteRunModal({ runId, run, onClose, onDone }) {
  const [params, setParams] = useState([]);
  const [selected, setSelected] = useState({}); // param_id -> true/false
  const [quantities, setQuantities] = useState({}); // param_id -> quantity
  const [actualQuantity, setActualQuantity] = useState(run.planned_quantity != null ? String(run.planned_quantity) : "");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    costParametersApi.list().then((d) => {
      const active = (d.items || []).filter((p) => p.is_active);
      setParams(active);
      const initSelected = {};
      const initQty = {};
      for (const p of active) {
        if (p.default_consumption != null) {
          initSelected[p.param_id] = true;
          initQty[p.param_id] = String(p.default_consumption);
        }
      }
      setSelected(initSelected);
      setQuantities(initQty);
    }).catch(() => {});
  }, []);

  const overheadCost = params.reduce((sum, p) => {
    if (!selected[p.param_id]) return sum;
    const qty = Number(quantities[p.param_id]) || 0;
    return sum + qty * Number(p.current_value ?? p.value ?? 0);
  }, 0);

  async function submit(e) {
    e.preventDefault();
    if (!actualQuantity || Number(actualQuantity) <= 0) {
      setError("Actual quantity produced must be greater than zero.");
      return;
    }
    for (const p of params) {
      if (!selected[p.param_id]) continue;
      const qty = quantities[p.param_id];
      if (qty === undefined || qty === "" || !Number.isFinite(Number(qty))) {
        setError(`Enter a quantity for ${p.name}.`);
        return;
      }
    }
    setSubmitting(true);
    setError("");
    try {
      const overhead_entries = params
        .filter((p) => selected[p.param_id])
        .map((p) => ({ param_id: p.param_id, quantity: Number(quantities[p.param_id]) }));
      await productionApi.updateRun(runId, { status: "completed", actual_quantity: Number(actualQuantity), overhead_entries });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not complete this production run.");
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Complete Production Run" onClose={onClose} size="lg">
      <form onSubmit={submit} className="bp-form">
        {error && <div className="bp-inline-error">{error}</div>}

        <div style={{ display: "flex", gap: 16, marginBottom: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div><span className="bp-td-muted">Product:</span> <strong>{run.product_name}</strong></div>
          <div><span className="bp-td-muted">Location:</span> {run.location_name}</div>
          <div><span className="bp-td-muted">Planned quantity:</span> {run.planned_quantity} {run.uom}</div>
        </div>

        <div className="bp-form-row">
          <div style={{ flex: 1 }}>
            <label className="bp-field-label" htmlFor="actualQty">Actual quantity produced</label>
            <input
              id="actualQty" type="number" min="0" step="0.01" className="bp-field-input"
              value={actualQuantity} onChange={(e) => setActualQuantity(e.target.value)} required
            />
          </div>
          <div style={{ flex: 1 }} />
        </div>

        <label className="bp-field-label">Stages</label>
        <div className="bp-table-wrap" style={{ marginBottom: 10 }}>
          <table className="bp-table">
            <thead><tr><th>Stage</th><th>Worker</th><th>Hours</th></tr></thead>
            <tbody>
              {(run.stages || []).map((s) => (
                <tr key={s.stage_id}>
                  <td>{STAGE_LABELS[s.stage]}</td>
                  <td>{s.employee_name}</td>
                  <td>{s.hours_worked}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {params.length > 0 && (
          <>
            <label className="bp-field-label">Applicable production costs (optional — only what applies to this run)</label>
            <div className="bp-table-wrap" style={{ marginBottom: 10 }}>
              <table className="bp-table">
                <tbody>
                  {params.map((p) => (
                    <tr key={p.param_id}>
                      <td style={{ width: 30 }}>
                        <input
                          type="checkbox"
                          checked={!!selected[p.param_id]}
                          onChange={(e) => setSelected((prev) => ({ ...prev, [p.param_id]: e.target.checked }))}
                        />
                      </td>
                      <td>{p.name} {p.unit ? <span className="bp-td-muted">({p.unit})</span> : null}</td>
                      <td style={{ width: 100 }}>
                        <input
                          type="number" step="0.0001" className="bp-field-input"
                          value={quantities[p.param_id] ?? ""}
                          onChange={(e) => setQuantities((prev) => ({ ...prev, [p.param_id]: e.target.value }))}
                          disabled={!selected[p.param_id]}
                        />
                      </td>
                      <td className="bp-td-muted">
                        {selected[p.param_id] ? inr((Number(quantities[p.param_id]) || 0) * Number(p.current_value ?? p.value ?? 0)) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div className="bp-settlement-calc">
          <div className="bp-settlement-calc-row"><span>Applicable overhead (this screen)</span><span>{inr(overheadCost)}</span></div>
        </div>
        <p className="bp-td-muted" style={{ fontSize: 11.5 }}>
          Material cost (from the BOM) and labour cost (from the stage hours above) are computed automatically when you
          complete this run, based on the actual quantity above — adjusting it changes the material cost calculated on
          submit. The full breakdown, including this overhead total, will be shown on the run afterward.
        </p>

        <div className="bp-form-actions">
          <button type="button" className="bp-btn-outline" onClick={onClose} disabled={submitting}>Cancel</button>
          <button type="submit" className="bp-btn-primary" disabled={submitting}>{submitting ? "Completing…" : "Complete Production"}</button>
        </div>
      </form>
    </Modal>
  );
}
