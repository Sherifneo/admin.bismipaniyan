import { useEffect, useState } from "react";
import { financialDimensionsApi } from "../../api/admin";
import { ApiError } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import Modal from "../../components/Modal";
import CodeField, { useCodePreview } from "../../components/CodeField";
import { useDataTable, SearchByBar, ColumnHeader, DataTableToolbar, SelectAllHeaderCell, SelectRowCell } from "../../components/DataTable";

// The financial-attribution list — one row per store/factory plus
// Corporate/Admin. Never picked manually on a normal transaction (every
// sale/purchase/salary/transfer auto-derives its dimension server-side
// from its own location) — this page only exists to rename/manage the
// seeded rows, same "own tab" pattern as Positions/Categories.
export default function FinancialDimensionsTab() {
  const { hasPermission } = useAuth();
  const [dimensions, setDimensions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editDimension, setEditDimension] = useState(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await financialDimensionsApi.list({ includeInactive: true });
      setDimensions(data.items || []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load financial dimensions.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onSaved() {
    setShowAdd(false);
    setEditDimension(null);
    await load();
  }

  async function remove(dimension) {
    if (!window.confirm(`Remove financial dimension "${dimension.name}"?`)) return;
    try {
      await financialDimensionsApi.remove(dimension.dimension_id);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not remove this financial dimension.");
    }
  }

  const columns = [
    { key: "dimension_code", label: "Code", accessor: (d) => d.dimension_code || "" },
    { key: "name", label: "Name", accessor: (d) => d.name },
    { key: "location_name", label: "Linked location", accessor: (d) => d.location_name || "" },
    {
      key: "is_active", label: "Active", accessor: (d) => (d.is_active ? "yes" : "no"), filter: "select",
      options: [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }],
    },
  ];
  const table = useDataTable({ rows: dimensions, columns, rowKey: (d) => d.dimension_id });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 10 }}>
        <h2 className="bp-card-title">Financial Dimensions</h2>
        <button type="button" className="bp-btn-primary" onClick={() => setShowAdd(true)}>+ Add dimension</button>
      </div>
      <p className="bp-td-muted" style={{ margin: "-6px 0 14px" }}>
        Where a financial result is attributed for management reporting — every transaction picks this automatically
        from its own location; this list is only for renaming or adding a dimension.
      </p>

      {error && <div className="bp-inline-error">{error}</div>}

      <DataTableToolbar table={table} filename="financial-dimensions" totalCount={dimensions.length} />
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
              <tr><td colSpan={6} className="bp-table-empty">No financial dimensions found.</td></tr>
            ) : (
              table.filteredRows.map((d) => (
                <tr key={d.dimension_id} onClick={() => setEditDimension(d)} style={{ cursor: "pointer" }}>
                  <SelectRowCell table={table} row={d} />
                  <td className="bp-td-muted">{d.dimension_code || "—"}</td>
                  <td className="bp-td-strong">{d.name}</td>
                  <td className="bp-td-muted">{d.location_name || "—"}</td>
                  <td className="bp-td-muted">{d.is_active ? "Yes" : "No"}</td>
                  <td className="bp-td-actions">
                    <button type="button" className="bp-btn-sm" onClick={(e) => { e.stopPropagation(); setEditDimension(d); }}>Edit</button>
                    {hasPermission("finance.manage", "full_control") && (
                      <button type="button" className="bp-btn-sm" onClick={(e) => { e.stopPropagation(); remove(d); }}>Delete</button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showAdd && <DimensionModal onClose={() => setShowAdd(false)} onDone={onSaved} />}
      {editDimension && <DimensionModal dimension={editDimension} onClose={() => setEditDimension(null)} onDone={onSaved} />}
    </div>
  );
}

function DimensionModal({ dimension, onClose, onDone }) {
  const isEdit = !!dimension;
  const [name, setName] = useState(dimension?.name || "");
  const [isActive, setIsActive] = useState(dimension ? !!dimension.is_active : true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const codeField = useCodePreview("financial_dimension", isEdit ? dimension.dimension_code : null);

  async function submit(e) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    if (codeField.mode === "manual" && !isEdit && !codeField.value.trim()) {
      setError("Enter a dimension code.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      if (isEdit) {
        await financialDimensionsApi.update(dimension.dimension_id, { name: name.trim(), is_active: isActive });
      } else {
        await financialDimensionsApi.create({
          name: name.trim(),
          dimension_code: codeField.mode === "manual" ? codeField.value.trim() : undefined,
        });
      }
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save this financial dimension.");
      setSubmitting(false);
    }
  }

  return (
    <Modal title={isEdit ? `Edit — ${dimension.name}` : "Add financial dimension"} onClose={onClose}>
      <form onSubmit={submit} className="bp-form">
        {error && <div className="bp-inline-error">{error}</div>}

        <CodeField label="Dimension code" field={codeField} isEdit={isEdit} />

        <label className="bp-field-label" htmlFor="fdName">Name</label>
        <input id="fdName" type="text" className="bp-field-input" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />

        {isEdit && (
          <label className="bp-field-label" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            Active
          </label>
        )}

        <div className="bp-form-actions">
          <button type="button" className="bp-btn-outline" onClick={onClose} disabled={submitting}>Cancel</button>
          <button type="submit" className="bp-btn-primary" disabled={submitting}>{submitting ? "Saving…" : isEdit ? "Save changes" : "Add dimension"}</button>
        </div>
      </form>
    </Modal>
  );
}
