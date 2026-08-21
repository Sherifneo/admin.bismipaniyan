import { useEffect, useState } from "react";
import { productionApi, machinesApi, locationsApi, productsApi } from "../../api/admin";
import { ApiError } from "../../api/client";
import Modal from "../../components/Modal";
import Pagination from "../../components/Pagination";
import StatusBadge from "../../components/StatusBadge";

const LIMIT = 20;

// Turns raw materials into finished goods at a location, optionally on a
// specific machine. A run starts 'planned', moves through 'in_progress',
// and only 'completed' writes stock into inventory_movements as a
// production_in movement (see backend/src/routes/production-runs.js) —
// mirroring how a purchase order only touches stock on 'received'.
export default function ProductionRunsList() {
  const [products, setProducts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [machines, setMachines] = useState([]);
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

      <div className="bp-table-wrap">
        <table className="bp-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Location</th>
              <th>Machine</th>
              <th>Qty</th>
              <th>Run date</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="bp-table-empty">Loading…</td></tr>
            ) : runs.length === 0 ? (
              <tr><td colSpan={7} className="bp-table-empty">No production runs found.</td></tr>
            ) : (
              runs.map((run) => (
                <tr key={run.run_id}>
                  <td className="bp-td-strong">{run.product_name}</td>
                  <td className="bp-td-muted">{run.location_name}</td>
                  <td className="bp-td-muted">{run.machine_name || "—"}</td>
                  <td className="bp-td-muted">{run.quantity_produced} {run.uom}</td>
                  <td className="bp-td-muted">{run.run_date}</td>
                  <td><StatusBadge status={run.status} /></td>
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
        <NewRunModal products={products} locations={locations} machines={machines} onClose={() => setShowAdd(false)} onDone={onSaved} />
      )}
      {viewRun && (
        <RunDetailModal runId={viewRun.run_id} onClose={() => setViewRun(null)} onChanged={load} />
      )}
    </div>
  );
}

function NewRunModal({ products, locations, machines, onClose, onDone }) {
  const [productId, setProductId] = useState("");
  const [locationId, setLocationId] = useState(locations[0]?.location_id || "");
  const [machineId, setMachineId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [runDate, setRunDate] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
              {products.map((p) => <option key={p.product_id} value={p.product_id}>{p.name}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label className="bp-field-label" htmlFor="runLocation">Location</label>
            <select id="runLocation" className="bp-field-input" value={locationId} onChange={(e) => setLocationId(e.target.value)} required>
              {locations.map((l) => <option key={l.location_id} value={l.location_id}>{l.name}</option>)}
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

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

          {run.notes && <p className="bp-td-muted" style={{ marginTop: 10 }}>{run.notes}</p>}

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
