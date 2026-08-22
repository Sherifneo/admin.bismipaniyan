import { useEffect, useState } from "react";
import { machinesApi, locationsApi } from "../../api/admin";
import { ApiError } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import Modal from "../../components/Modal";
import CodeField, { useCodePreview } from "../../components/CodeField";

// Production equipment (ovens, mixers, etc.) — attached to a production
// run so output can be traced to the machine that made it.
export default function MachinesList() {
  const { hasPermission } = useAuth();
  const [machines, setMachines] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editMachine, setEditMachine] = useState(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await machinesApi.list({});
      setMachines(data.items || []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load machines.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    locationsApi.list().then(setLocations).catch(() => {});
  }, []);

  async function onSaved() {
    setShowAdd(false);
    setEditMachine(null);
    await load();
  }

  async function remove(machine) {
    if (!window.confirm(`Remove ${machine.name} from machines?`)) return;
    await machinesApi.remove(machine.machine_id);
    await load();
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 10 }}>
        <h1 className="bp-page-title">Machines</h1>
        <button type="button" className="bp-btn-primary" onClick={() => setShowAdd(true)}>+ Add machine</button>
      </div>
      <p className="bp-td-muted" style={{ margin: "-6px 0 14px" }}>
        Production equipment — assign a machine to a production run to trace output.
      </p>

      {error && <div className="bp-inline-error">{error}</div>}

      <div className="bp-table-wrap">
        <table className="bp-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Kind</th>
              <th>Location</th>
              <th>Active</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="bp-table-empty">Loading…</td></tr>
            ) : machines.length === 0 ? (
              <tr><td colSpan={6} className="bp-table-empty">No machines found.</td></tr>
            ) : (
              machines.map((m) => (
                <tr key={m.machine_id} onClick={() => setEditMachine(m)} style={{ cursor: "pointer" }}>
                  <td className="bp-td-muted">{m.machine_code || "—"}</td>
                  <td className="bp-td-strong">{m.name}</td>
                  <td className="bp-td-muted">{m.kind || "—"}</td>
                  <td className="bp-td-muted">{m.location_name || "—"}</td>
                  <td className="bp-td-muted">{m.is_active ? "Yes" : "No"}</td>
                  <td className="bp-td-actions">
                    <button type="button" className="bp-btn-sm" onClick={(e) => { e.stopPropagation(); setEditMachine(m); }}>Edit</button>
                    {hasPermission("production.manage", "full_control") && (
                      <button type="button" className="bp-btn-sm" onClick={(e) => { e.stopPropagation(); remove(m); }}>Remove</button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showAdd && <MachineModal locations={locations} onClose={() => setShowAdd(false)} onDone={onSaved} />}
      {editMachine && <MachineModal machine={editMachine} locations={locations} onClose={() => setEditMachine(null)} onDone={onSaved} />}
    </div>
  );
}

function MachineModal({ machine, locations, onClose, onDone }) {
  const isEdit = !!machine;
  const [name, setName] = useState(machine?.name || "");
  const [kind, setKind] = useState(machine?.kind || "");
  const [locationId, setLocationId] = useState(machine?.location_id || "");
  const [isActive, setIsActive] = useState(machine ? !!machine.is_active : true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const codeField = useCodePreview("machine", isEdit ? machine.machine_code : null);

  async function submit(e) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    if (codeField.mode === "manual" && !isEdit && !codeField.value.trim()) {
      setError("Enter a machine code.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const body = {
        name: name.trim(),
        kind: kind || undefined,
        location_id: locationId || undefined,
        is_active: isActive,
        machine_code: codeField.mode === "manual" && !isEdit ? codeField.value.trim() : undefined,
      };
      if (isEdit) {
        await machinesApi.update(machine.machine_id, body);
      } else {
        await machinesApi.create(body);
      }
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save this machine.");
      setSubmitting(false);
    }
  }

  return (
    <Modal title={isEdit ? `Edit — ${machine.name}` : "Add machine"} onClose={onClose}>
      <form onSubmit={submit} className="bp-form">
        {error && <div className="bp-inline-error">{error}</div>}

        <CodeField label="Machine code" field={codeField} isEdit={isEdit} />

        <label className="bp-field-label" htmlFor="mName">Name</label>
        <input id="mName" type="text" className="bp-field-input" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />

        <div className="bp-form-row">
          <div style={{ flex: 1 }}>
            <label className="bp-field-label" htmlFor="mKind">Kind</label>
            <input id="mKind" type="text" className="bp-field-input" placeholder="e.g. Oven, Mixer" value={kind} onChange={(e) => setKind(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label className="bp-field-label" htmlFor="mLocation">Location</label>
            <select id="mLocation" className="bp-field-input" value={locationId} onChange={(e) => setLocationId(e.target.value)}>
              <option value="">— None —</option>
              {locations.map((l) => <option key={l.location_id} value={l.location_id}>{l.name}</option>)}
            </select>
          </div>
        </div>

        {isEdit && (
          <label className="bp-field-label" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            Active
          </label>
        )}

        <div className="bp-form-actions">
          <button type="button" className="bp-btn-outline" onClick={onClose} disabled={submitting}>Cancel</button>
          <button type="submit" className="bp-btn-primary" disabled={submitting}>{submitting ? "Saving…" : isEdit ? "Save changes" : "Add machine"}</button>
        </div>
      </form>
    </Modal>
  );
}
