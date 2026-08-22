import { useEffect, useState } from "react";
import { positionsApi } from "../../api/admin";
import { ApiError } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import Modal from "../../components/Modal";
import CodeField, { useCodePreview } from "../../components/CodeField";
import { useDataTable, SearchByBar, ColumnHeader, DataTableToolbar, SelectAllHeaderCell, SelectRowCell, ColumnChooserButton } from "../../components/DataTable";
import { useUrlSearch } from "../../hooks/useUrlSearch";

// The managed list behind Employees' Role/Position dropdown — its own
// full page (Machines/Employees/Vendors pattern), not a nested modal, so
// it gets a real code, search/filter, and a full audit-friendly table.
export default function PositionsList() {
  const { hasPermission } = useAuth();
  const urlSearch = useUrlSearch();
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editPosition, setEditPosition] = useState(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await positionsApi.list({ includeInactive: true });
      setPositions(data.items || []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load positions.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onSaved() {
    setShowAdd(false);
    setEditPosition(null);
    await load();
  }

  async function remove(position) {
    if (!window.confirm(`Remove position "${position.name}"?`)) return;
    try {
      await positionsApi.remove(position.position_id);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not remove this position.");
    }
  }

  const columns = [
    { key: "position_code", label: "Code", accessor: (p) => p.position_code || "" },
    { key: "name", label: "Name", accessor: (p) => p.name },
    {
      key: "is_active", label: "Active", accessor: (p) => (p.is_active ? "yes" : "no"), filter: "select",
      options: [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }],
    },
  ];
  const table = useDataTable({ rows: positions, columns, rowKey: (p) => p.position_id });

  useEffect(() => {
    if (urlSearch.q) table.setFilter("name", { operator: "contains", value: urlSearch.q });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 10 }}>
        <h1 className="bp-page-title">Positions</h1>
        <button type="button" className="bp-btn-primary" onClick={() => setShowAdd(true)}>+ Add position</button>
      </div>
      <p className="bp-td-muted" style={{ margin: "-6px 0 14px" }}>
        The list of job positions employees can be assigned to — used by the Role field on the Employee form.
      </p>

      {error && <div className="bp-inline-error">{error}</div>}

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <DataTableToolbar table={table} filename="positions" totalCount={positions.length} />
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
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="bp-table-empty">Loading…</td></tr>
            ) : table.filteredRows.length === 0 ? (
              <tr><td colSpan={5} className="bp-table-empty">No positions found.</td></tr>
            ) : (
              table.filteredRows.map((p) => (
                <tr key={p.position_id} onClick={() => setEditPosition(p)} style={{ cursor: "pointer" }}>
                  <SelectRowCell table={table} row={p} />
                  {table.isColumnVisible("position_code") && <td className="bp-td-muted">{p.position_code || "—"}</td>}
                  {table.isColumnVisible("name") && <td className="bp-td-strong">{p.name}</td>}
                  {table.isColumnVisible("is_active") && <td className="bp-td-muted">{p.is_active ? "Yes" : "No"}</td>}
                  <td className="bp-td-actions">
                    <button type="button" className="bp-btn-sm" onClick={(e) => { e.stopPropagation(); setEditPosition(p); }}>Edit</button>
                    {hasPermission("hr.manage", "full_control") && (
                      <button type="button" className="bp-btn-sm" onClick={(e) => { e.stopPropagation(); remove(p); }}>Delete</button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showAdd && <PositionModal onClose={() => setShowAdd(false)} onDone={onSaved} />}
      {editPosition && <PositionModal position={editPosition} onClose={() => setEditPosition(null)} onDone={onSaved} />}
    </div>
  );
}

function PositionModal({ position, onClose, onDone }) {
  const isEdit = !!position;
  const [name, setName] = useState(position?.name || "");
  const [isActive, setIsActive] = useState(position ? !!position.is_active : true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const codeField = useCodePreview("position", isEdit ? position.position_code : null);

  async function submit(e) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    if (codeField.mode === "manual" && !isEdit && !codeField.value.trim()) {
      setError("Enter a position code.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      if (isEdit) {
        await positionsApi.update(position.position_id, { name: name.trim(), is_active: isActive });
      } else {
        await positionsApi.create({
          name: name.trim(),
          position_code: codeField.mode === "manual" ? codeField.value.trim() : undefined,
        });
      }
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save this position.");
      setSubmitting(false);
    }
  }

  return (
    <Modal title={isEdit ? `Edit — ${position.name}` : "Add position"} onClose={onClose}>
      <form onSubmit={submit} className="bp-form">
        {error && <div className="bp-inline-error">{error}</div>}

        <CodeField label="Position code" field={codeField} isEdit={isEdit} />

        <label className="bp-field-label" htmlFor="posName">Name</label>
        <input id="posName" type="text" className="bp-field-input" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />

        {isEdit && (
          <label className="bp-field-label" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            Active
          </label>
        )}

        <div className="bp-form-actions">
          <button type="button" className="bp-btn-outline" onClick={onClose} disabled={submitting}>Cancel</button>
          <button type="submit" className="bp-btn-primary" disabled={submitting}>{submitting ? "Saving…" : isEdit ? "Save changes" : "Add position"}</button>
        </div>
      </form>
    </Modal>
  );
}
