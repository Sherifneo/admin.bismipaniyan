import { useEffect, useState } from "react";
import { machinesApi, locationsApi } from "../../api/admin";
import { ApiError } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import Modal from "../../components/Modal";
import CodeField, { useCodePreview } from "../../components/CodeField";
import { useDataTable, SearchByBar, ColumnHeader, DataTableToolbar, SelectAllHeaderCell, SelectRowCell, ColumnChooserButton } from "../../components/DataTable";
import { useUrlSearch } from "../../hooks/useUrlSearch";

// Production equipment (ovens, mixers, etc.) — attached to a production
// run so output can be traced to the machine that made it.
export default function MachinesList() {
  const { hasPermission } = useAuth();
  const urlSearch = useUrlSearch();
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
      const data = await machinesApi.list({ includeInactive: true });
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

  const columns = [
    { key: "machine_code", label: "Code", accessor: (m) => m.machine_code || "" },
    { key: "name", label: "Name", accessor: (m) => m.name },
    { key: "kind", label: "Kind", accessor: (m) => m.kind || "" },
    { key: "location_name", label: "Location", accessor: (m) => m.location_name || "" },
    {
      key: "is_active", label: "Active", accessor: (m) => (m.is_active ? "yes" : "no"), filter: "select",
      options: [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }],
    },
    { key: "created_by_name", label: "Created by", accessor: (m) => m.created_by_name || "", hiddenByDefault: true },
    { key: "created_at", label: "Created at", accessor: (m) => m.created_at || "", filter: "dateRange", hiddenByDefault: true },
    { key: "updated_by_name", label: "Updated by", accessor: (m) => m.updated_by_name || "", hiddenByDefault: true },
    { key: "updated_at", label: "Updated at", accessor: (m) => m.updated_at || "", filter: "dateRange", hiddenByDefault: true },
  ];
  const table = useDataTable({ rows: machines, columns, rowKey: (m) => m.machine_id });

  useEffect(() => {
    if (urlSearch.q) table.setFilter("name", { operator: "contains", value: urlSearch.q });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <DataTableToolbar table={table} filename="machines" totalCount={machines.length} />
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
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={11} className="bp-table-empty">Loading…</td></tr>
            ) : table.filteredRows.length === 0 ? (
              <tr><td colSpan={11} className="bp-table-empty">No machines found.</td></tr>
            ) : (
              table.filteredRows.map((m) => (
                <tr key={m.machine_id} onClick={() => setEditMachine(m)} style={{ cursor: "pointer" }}>
                  <SelectRowCell table={table} row={m} />
                  {table.isColumnVisible("machine_code") && <td className="bp-td-muted">{m.machine_code || "—"}</td>}
                  {table.isColumnVisible("name") && <td className="bp-td-strong">{m.name}</td>}
                  {table.isColumnVisible("kind") && <td className="bp-td-muted">{m.kind || "—"}</td>}
                  {table.isColumnVisible("location_name") && <td className="bp-td-muted">{m.location_name || "—"}</td>}
                  {table.isColumnVisible("is_active") && <td className="bp-td-muted">{m.is_active ? "Yes" : "No"}</td>}
                  {table.isColumnVisible("created_by_name") && <td className="bp-td-muted">{m.created_by_name || "—"}</td>}
                  {table.isColumnVisible("created_at") && <td className="bp-td-muted">{m.created_at ? new Date(m.created_at).toLocaleString("en-IN") : "—"}</td>}
                  {table.isColumnVisible("updated_by_name") && <td className="bp-td-muted">{m.updated_by_name || "—"}</td>}
                  {table.isColumnVisible("updated_at") && <td className="bp-td-muted">{m.updated_at ? new Date(m.updated_at).toLocaleString("en-IN") : "—"}</td>}
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
