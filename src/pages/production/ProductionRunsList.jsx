import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { productionApi, machinesApi, locationsApi, productsApi, employeesApi, bomsApi, costParametersApi } from "../../api/admin";
import { ApiError } from "../../api/client";
import Modal from "../../components/Modal";
import Pagination from "../../components/Pagination";
import StatusBadge from "../../components/StatusBadge";
import { useDataTable, SearchByBar, ColumnHeader, DataTableToolbar, SelectAllHeaderCell, SelectRowCell, ColumnChooserButton } from "../../components/DataTable";
import { useUrlSearch } from "../../hooks/useUrlSearch";
import { useAuth } from "../../auth/AuthContext";
import { formatDate, formatDateTime } from "../../utils/date";

const LIMIT = 20;
const STAGE_LABELS = { mixing: "Mixing", baking: "Baking", packing: "Packing" };

// Stage hours are stored/costed as true decimal hours (0.75 = 45 min,
// matches hourly_rate_snapshot math everywhere) but typed/displayed as
// HH:MM so "45 minutes" doesn't require mental decimal-hour conversion.
function decimalToHm(decimal) {
  if (decimal === null || decimal === undefined || decimal === "") return { h: "", m: "" };
  const totalMinutes = Math.round(Number(decimal) * 60);
  return { h: String(Math.floor(totalMinutes / 60)), m: String(totalMinutes % 60).padStart(2, "0") };
}
function hmToDecimal(h, m) {
  const hours = Number(h) || 0;
  const minutes = Number(m) || 0;
  return Math.round((hours + minutes / 60) * 100) / 100;
}

// HH:MM stage-hours editor — displays/edits in real time units, converts
// to/from decimal hours (the value actually stored and used for cost
// math) internally so nothing downstream needs to change.
function HoursInput({ decimalValue, onChange, disabled }) {
  const { h, m } = decimalToHm(decimalValue);
  return (
    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
      <input
        type="number" min="0" step="1" className="bp-field-input" style={{ width: 56 }}
        placeholder="H" value={h} disabled={disabled}
        onChange={(e) => onChange(hmToDecimal(e.target.value, m))}
      />
      <span className="bp-td-muted">h</span>
      <input
        type="number" min="0" max="59" step="1" className="bp-field-input" style={{ width: 56 }}
        placeholder="M" value={m} disabled={disabled}
        onChange={(e) => onChange(hmToDecimal(h, e.target.value))}
      />
      <span className="bp-td-muted">m</span>
    </div>
  );
}

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

const NEW_RUN_STEPS = ["Setup", "Details", "Review"];

// 3-step wizard: Setup (machine/date/product/planned qty) -> Details
// (BOM/workers/notes, now that the product is known) -> Review
// (everything read-only) before actually creating the run.
function NewRunModal({ products, locations, machines, employees, onClose, onDone }) {
  const factoryLocations = factoryOnly(locations);
  const [step, setStep] = useState(0);
  const [productId, setProductId] = useState("");
  const [locationId, setLocationId] = useState(factoryLocations[0]?.location_id || "");
  const defaultOven = machines.find((m) => /oven/i.test(m.name));
  const [machineId, setMachineId] = useState(defaultOven?.machine_id || "");
  const [quantity, setQuantity] = useState("");
  const [boms, setBoms] = useState([]);
  const [bomId, setBomId] = useState("");
  const [bomDetail, setBomDetail] = useState(null);
  const [runDate, setRunDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [defaultEmployeeId, setDefaultEmployeeId] = useState("");
  // Which stages have been individually overridden — those stop
  // following the default worker when it changes.
  const [stageEmployees, setStageEmployees] = useState({ mixing: "", baking: "", packing: "" });
  const [stageEditedManually, setStageEditedManually] = useState(() => new Set());
  // Only used when no BOM is picked — a run must consume raw material
  // one way or the other, never neither.
  const [rawMaterialLines, setRawMaterialLines] = useState([{ raw_material_product_id: "", quantity: "" }]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const rawMaterials = products.filter((p) => p.item_kind === "raw_material");

  function addMaterialLine() {
    setRawMaterialLines((prev) => [...prev, { raw_material_product_id: "", quantity: "" }]);
  }
  function removeMaterialLine(idx) {
    setRawMaterialLines((prev) => prev.filter((_, i) => i !== idx));
  }
  function updateMaterialLine(idx, field, value) {
    setRawMaterialLines((prev) => prev.map((l, i) => (i === idx ? { ...l, [field]: value } : l)));
  }

  useEffect(() => {
    if (!productId) {
      setBoms([]);
      setBomId("");
      return;
    }
    bomsApi.list({ productId }).then((d) => setBoms((d.items || []).filter((b) => b.status === "approved"))).catch(() => setBoms([]));
    setBomId("");
  }, [productId]);

  useEffect(() => {
    if (!bomId) {
      setBomDetail(null);
      return;
    }
    bomsApi.get(bomId).then(setBomDetail).catch(() => setBomDetail(null));
  }, [bomId]);

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

  function goNext() {
    setError("");
    if (step === 0) {
      if (!productId || !locationId) {
        setError("Select a product and a location.");
        return;
      }
      if (!quantity || Number(quantity) <= 0) {
        setError("Planned quantity must be greater than zero.");
        return;
      }
    }
    if (step === 1) {
      if (!defaultEmployeeId) {
        setError("Select a default worker.");
        return;
      }
      if (!bomId) {
        const validLines = rawMaterialLines.filter((l) => l.raw_material_product_id && Number(l.quantity) > 0);
        if (validLines.length === 0) {
          setError("Choose a BOM or add at least one raw material for this run.");
          return;
        }
      }
    }
    setStep((s) => Math.min(s + 1, NEW_RUN_STEPS.length - 1));
  }

  function goBack() {
    setError("");
    setStep((s) => Math.max(s - 1, 0));
  }

  async function submit() {
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
        raw_materials: bomId
          ? undefined
          : rawMaterialLines
              .filter((l) => l.raw_material_product_id && Number(l.quantity) > 0)
              .map((l) => ({ raw_material_product_id: l.raw_material_product_id, quantity: Number(l.quantity) })),
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

  const selectedProduct = products.find((p) => p.product_id === productId);
  const selectedMachine = machines.find((m) => m.machine_id === machineId);
  const selectedBom = boms.find((b) => b.bom_id === bomId);
  const employeeName = (id) => employees.find((emp) => emp.employee_id === id)?.full_name || "—";

  return (
    <Modal title="New production run" onClose={onClose}>
      <div className="bp-tabs" style={{ marginBottom: 14 }}>
        {NEW_RUN_STEPS.map((label, i) => (
          <div
            key={label}
            className={`bp-tab${i === step ? " is-active" : ""}`}
            style={{ cursor: "default", opacity: i > step ? 0.5 : 1 }}
          >
            {i + 1}. {label}
          </div>
        ))}
      </div>

      <div className="bp-form">
        {error && <div className="bp-inline-error">{error}</div>}

        {step === 0 && (
          <>
            <div className="bp-form-row">
              <div style={{ flex: 1 }}>
                <label className="bp-field-label" htmlFor="runMachine">Machine (optional)</label>
                <select id="runMachine" className="bp-field-input" value={machineId} onChange={(e) => setMachineId(e.target.value)}>
                  <option value="">— None —</option>
                  {machines.map((m) => <option key={m.machine_id} value={m.machine_id}>{m.name}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label className="bp-field-label" htmlFor="runDate">Run date (optional)</label>
                <input id="runDate" type="date" className="bp-field-input" value={runDate} onChange={(e) => setRunDate(e.target.value)} />
              </div>
            </div>

            <div className="bp-form-row">
              <div style={{ flex: 1 }}>
                <label className="bp-field-label" htmlFor="runProduct">Product</label>
                <select id="runProduct" className="bp-field-input" value={productId} onChange={(e) => setProductId(e.target.value)} required>
                  <option value="">Select product…</option>
                  {products.map((p) => <option key={p.product_id} value={p.product_id}>{p.product_code ? `${p.product_code} — ${p.name}` : p.name}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label className="bp-field-label" htmlFor="runQty">Planned quantity</label>
                <input id="runQty" type="number" min="0" step="0.01" className="bp-field-input" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
              </div>
            </div>

            <label className="bp-field-label" htmlFor="runLocation">Location</label>
            <select id="runLocation" className="bp-field-input" value={locationId} onChange={(e) => setLocationId(e.target.value)} required>
              {factoryLocations.map((l) => <option key={l.location_id} value={l.location_id}>{l.name}</option>)}
            </select>
          </>
        )}

        {step === 1 && (
          <>
            {boms.length > 0 && (
              <>
                <label className="bp-field-label" htmlFor="runBom">BOM (consumes raw materials on completion)</label>
                <select id="runBom" className="bp-field-input" value={bomId} onChange={(e) => setBomId(e.target.value)}>
                  <option value="">— None —</option>
                  {boms.map((b) => <option key={b.bom_id} value={b.bom_id}>{b.bom_code ? `${b.bom_code} — ` : ""}{b.bom_name} (makes {b.output_qty} {b.product_uom})</option>)}
                </select>

                {bomDetail && (
                  <div className="bp-table-wrap" style={{ marginTop: 8, marginBottom: 10 }}>
                    <table className="bp-table">
                      <thead>
                        <tr><th>Item code</th><th>Raw material</th><th>Category</th><th>Qty</th></tr>
                      </thead>
                      <tbody>
                        {(bomDetail.lines || []).map((l) => (
                          <tr key={l.bom_line_id}>
                            <td className="bp-td-muted">{l.raw_material_code || "—"}</td>
                            <td className="bp-td-strong">{l.raw_material_name}</td>
                            <td className="bp-td-muted" style={{ textTransform: "capitalize" }}>{(l.raw_material_item_kind || "").replace("_", " ") || "—"}</td>
                            <td className="bp-td-muted">{l.quantity} {l.raw_material_uom}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {!bomId && (
              <>
                <label className="bp-field-label">Raw materials consumed (required — no BOM selected)</label>
                {rawMaterialLines.map((line, idx) => (
                  <div key={idx} className="bp-form-row" style={{ marginBottom: 6, alignItems: "flex-end" }}>
                    <div style={{ flex: 2 }}>
                      <select
                        className="bp-field-input"
                        value={line.raw_material_product_id}
                        onChange={(e) => updateMaterialLine(idx, "raw_material_product_id", e.target.value)}
                      >
                        <option value="">Select raw material…</option>
                        {rawMaterials.map((p) => <option key={p.product_id} value={p.product_id}>{p.product_code ? `${p.product_code} — ${p.name}` : p.name}</option>)}
                      </select>
                    </div>
                    <div style={{ flex: 1 }}>
                      <input
                        type="number" min="0" step="0.01" className="bp-field-input" placeholder="Qty"
                        value={line.quantity}
                        onChange={(e) => updateMaterialLine(idx, "quantity", e.target.value)}
                      />
                    </div>
                    <button type="button" className="bp-btn-outline" onClick={() => removeMaterialLine(idx)} disabled={rawMaterialLines.length === 1}>Remove</button>
                  </div>
                ))}
                <button type="button" className="bp-btn-sm" onClick={addMaterialLine} style={{ marginBottom: 10 }}>+ Add line</button>
              </>
            )}

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
          </>
        )}

        {step === 2 && (
          <>
            <label className="bp-field-label">Review</label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px 20px", marginBottom: 14 }}>
              <div><span className="bp-td-muted">Product</span><br /><strong>{selectedProduct?.name || "—"}</strong></div>
              <div><span className="bp-td-muted">Planned quantity</span><br /><strong>{quantity || "—"}</strong></div>
              <div><span className="bp-td-muted">Location</span><br />{factoryLocations.find((l) => l.location_id === locationId)?.name || "—"}</div>
              <div><span className="bp-td-muted">Machine</span><br />{selectedMachine?.name || "— None —"}</div>
              <div><span className="bp-td-muted">Run date</span><br />{runDate || "—"}</div>
              <div><span className="bp-td-muted">BOM</span><br />{selectedBom?.bom_name || "— None —"}</div>
            </div>

            {!bomId && (
              <>
                <label className="bp-field-label">Raw materials</label>
                <div className="bp-table-wrap" style={{ marginBottom: 14 }}>
                  <table className="bp-table">
                    <thead><tr><th>Raw material</th><th>Qty</th></tr></thead>
                    <tbody>
                      {rawMaterialLines.filter((l) => l.raw_material_product_id && Number(l.quantity) > 0).map((l, idx) => {
                        const p = rawMaterials.find((rm) => rm.product_id === l.raw_material_product_id);
                        return (
                          <tr key={idx}>
                            <td className="bp-td-strong">{p?.name || "—"}</td>
                            <td className="bp-td-muted">{l.quantity} {p?.uom}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            <label className="bp-field-label">Stage workers</label>
            <div className="bp-table-wrap" style={{ marginBottom: 14 }}>
              <table className="bp-table">
                <thead><tr><th>Stage</th><th>Worker</th></tr></thead>
                <tbody>
                  {Object.entries(STAGE_LABELS).map(([stage, label]) => (
                    <tr key={stage}>
                      <td className="bp-td-strong">{label}</td>
                      <td>{employeeName(stageEmployees[stage] || defaultEmployeeId)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {notes && <p className="bp-td-muted" style={{ marginTop: 0 }}>{notes}</p>}
          </>
        )}

        <div className="bp-form-actions">
          {step === 0 ? (
            <button type="button" className="bp-btn-outline" onClick={onClose} disabled={submitting}>Cancel</button>
          ) : (
            <button type="button" className="bp-btn-outline" onClick={goBack} disabled={submitting}>Back</button>
          )}
          {step < NEW_RUN_STEPS.length - 1 ? (
            <button type="button" className="bp-btn-primary" onClick={goNext}>Next</button>
          ) : (
            <button type="button" className="bp-btn-primary" onClick={submit} disabled={submitting}>{submitting ? "Saving…" : "Create run"}</button>
          )}
        </div>
      </div>
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
  const { hasPermission } = useAuth();
  const [run, setRun] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [stageBusy, setStageBusy] = useState(null);
  const [stageHoursDraft, setStageHoursDraft] = useState({});
  const [showComplete, setShowComplete] = useState(false);
  const [fillingLastHours, setFillingLastHours] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

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

  // Prefills each not-yet-completed stage's hours from that product's
  // last completed run — only when the worker matches this run's
  // assigned worker for that stage, since a different worker's past
  // hours aren't a reliable estimate for this run.
  async function applyLastHours() {
    setFillingLastHours(true);
    setError("");
    try {
      const { stages: lastStages } = await productionApi.lastHours(run.product_id);
      const draft = {};
      for (const s of run.stages) {
        if (s.status === "completed") continue;
        const match = lastStages.find((ls) => ls.stage === s.stage && ls.employee_id === s.employee_id);
        if (match && match.hours_worked != null) draft[s.stage] = Number(match.hours_worked);
      }
      if (Object.keys(draft).length === 0) {
        setError("No matching hours found from this product's last completed run (same worker per stage).");
      }
      setStageHoursDraft((prev) => ({ ...prev, ...draft }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not fetch last production hours.");
    } finally {
      setFillingLastHours(false);
    }
  }

  // Completes every not-yet-completed stage in order, in one click —
  // owner-only (production.manage full_control), and still requires
  // every stage to already have a worker and hours filled in (via the
  // draft or an already-saved value) exactly like completing one stage
  // individually. Sequential (not parallel) since each stage's
  // completion is gated on the previous one already being completed.
  async function markAllStages() {
    for (const s of run.stages) {
      if (s.status === "completed") continue;
      if (!s.employee_id) {
        setError(`Assign a worker to ${STAGE_LABELS[s.stage]} before marking all complete.`);
        return;
      }
      const hours = stageHoursDraft[s.stage] ?? s.hours_worked ?? "";
      if (!hours || Number(hours) <= 0) {
        setError(`Enter hours worked for ${STAGE_LABELS[s.stage]} before marking all complete.`);
        return;
      }
    }
    setMarkingAll(true);
    setError("");
    try {
      for (const stage of STAGES_ORDER) {
        const s = run.stages.find((x) => x.stage === stage);
        if (!s || s.status === "completed") continue;
        const hours = stageHoursDraft[s.stage] ?? s.hours_worked;
        await productionApi.updateStage(runId, stage, { status: "completed", hours_worked: Number(hours) });
      }
      await load();
      await onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not mark all stages complete.");
    } finally {
      setMarkingAll(false);
    }
  }

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
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <label className="bp-field-label" style={{ marginBottom: 0 }}>Stages</label>
                {!allStagesCompleted && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button type="button" className="bp-btn-sm" onClick={applyLastHours} disabled={fillingLastHours || busy}>
                      {fillingLastHours ? "Fetching…" : "Last Prod hrs"}
                    </button>
                    {hasPermission("production.manage", "full_control") && (
                      <button type="button" className="bp-btn-sm" onClick={markAllStages} disabled={markingAll || busy}>
                        {markingAll ? "Marking…" : "Mark all"}
                      </button>
                    )}
                  </div>
                )}
              </div>
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
                            <HoursInput
                              decimalValue={stageHoursDraft[s.stage] ?? s.hours_worked ?? ""}
                              onChange={(decimal) => setStageHoursDraft((prev) => ({ ...prev, [s.stage]: decimal }))}
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
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

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

  // Full server-computed breakdown (material + labour + overhead) for
  // exactly what completing right now, with these choices, would
  // produce — refetched whenever actual quantity or the selected
  // overheads change, so the operator sees the real numbers before
  // committing, not just the overhead subtotal.
  useEffect(() => {
    if (!actualQuantity || Number(actualQuantity) <= 0) {
      setPreview(null);
      return;
    }
    const overhead_entries = params
      .filter((p) => selected[p.param_id] && quantities[p.param_id] !== undefined && quantities[p.param_id] !== "")
      .map((p) => ({ param_id: p.param_id, quantity: Number(quantities[p.param_id]) }));
    setPreviewLoading(true);
    productionApi.costPreview(runId, { actual_quantity: Number(actualQuantity), overhead_entries: JSON.stringify(overhead_entries) })
      .then(setPreview)
      .catch(() => setPreview(null))
      .finally(() => setPreviewLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId, actualQuantity, JSON.stringify(selected), JSON.stringify(quantities)]);

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

        <label className="bp-field-label">Cost summary (preview — this is exactly what completing now will record)</label>
        {previewLoading && !preview ? (
          <p className="bp-td-muted">Calculating…</p>
        ) : preview && preview.lines.length > 0 ? (
          <div className="bp-table-wrap" style={{ marginBottom: 10 }}>
            <table className="bp-table">
              <thead><tr><th>Type</th><th>Item</th><th>Amount</th></tr></thead>
              <tbody>
                {preview.lines.map((l, idx) => (
                  <tr key={idx}>
                    <td className="bp-td-muted" style={{ textTransform: "capitalize" }}>{l.line_type}</td>
                    <td>{l.label}</td>
                    <td className="bp-td-strong">{inr(l.amount)}</td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={2} className="bp-td-strong" style={{ textAlign: "right" }}>Total production cost</td>
                  <td className="bp-td-strong">{inr(preview.total_cost)}</td>
                </tr>
                <tr>
                  <td colSpan={2} className="bp-td-strong" style={{ textAlign: "right" }}>Cost per unit</td>
                  <td className="bp-td-strong">{inr(preview.cost_per_unit)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <p className="bp-td-muted">Enter actual quantity to see the cost preview.</p>
        )}
        <p className="bp-td-muted" style={{ fontSize: 11.5 }}>
          This preview recalculates live as you change actual quantity or the applicable costs below — it's exactly
          what will be recorded if you complete now.
        </p>

        <div className="bp-form-actions">
          <button type="button" className="bp-btn-outline" onClick={onClose} disabled={submitting}>Cancel</button>
          <button type="submit" className="bp-btn-primary" disabled={submitting}>{submitting ? "Completing…" : "Complete Production"}</button>
        </div>
      </form>
    </Modal>
  );
}
