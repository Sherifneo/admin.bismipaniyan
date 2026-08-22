import { useMemo, useState } from "react";
import { exportCsv } from "../utils/exportCsv";

// Shared table behavior — Excel-style per-column filtering, row
// selection with an export-selected action, and export-all — meant to
// wrap any existing <table>, not replace it. Pages keep their own <tr>
// markup (click-to-edit, StatusBadge, action buttons); this hook/wrapper
// only owns: which rows currently pass the column filters, which rows
// are checked, and turning either into a CSV download. See
// TABLE-CONVENTIONS.md for how to wire a new or existing table page.
//
// columns: [{ key, label, accessor: (row) => value, filter: "text" | "select" | "dateRange" | false }]
// rowKey: (row) => string
export function useDataTable({ rows, columns, rowKey }) {
  const [filters, setFilters] = useState({}); // { [columnKey]: string | string[] | { from, to } }
  const [selected, setSelected] = useState(() => new Set());

  const filterableColumns = columns.filter((c) => c.filter !== false);

  const filteredRows = useMemo(() => {
    return rows.filter((row) =>
      filterableColumns.every((col) => {
        const active = filters[col.key];
        if (active === undefined || active === null || active === "") return true;
        const raw = col.accessor(row);

        if (col.filter === "select") {
          if (!Array.isArray(active) || active.length === 0) return true;
          return active.includes(String(raw ?? ""));
        }
        if (col.filter === "dateRange") {
          if (!raw) return false;
          const d = String(raw).slice(0, 10);
          if (active.from && d < active.from) return false;
          if (active.to && d > active.to) return false;
          return true;
        }
        // text (default): case-insensitive substring
        return String(raw ?? "").toLowerCase().includes(String(active).toLowerCase());
      })
    );
  }, [rows, filters, filterableColumns]);

  function setFilter(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }
  function clearFilter(key) {
    setFilters((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }
  function clearAllFilters() {
    setFilters({});
  }

  function toggleRow(row) {
    const key = rowKey(row);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }
  function toggleAllFiltered() {
    setSelected((prev) => {
      const allKeys = filteredRows.map(rowKey);
      const allSelected = allKeys.length > 0 && allKeys.every((k) => prev.has(k));
      if (allSelected) return new Set();
      return new Set(allKeys);
    });
  }
  function isSelected(row) {
    return selected.has(rowKey(row));
  }
  const allFilteredSelected = filteredRows.length > 0 && filteredRows.every((r) => selected.has(rowKey(r)));
  const selectedRows = rows.filter((r) => selected.has(rowKey(r)));

  function exportAll(filename) {
    exportCsv(filename, columns.map((c) => ({ label: c.label, accessor: c.accessor })), filteredRows);
  }
  function exportSelected(filename) {
    exportCsv(filename + "-selected", columns.map((c) => ({ label: c.label, accessor: c.accessor })), selectedRows);
  }

  return {
    filters, setFilter, clearFilter, clearAllFilters,
    filteredRows,
    selected, toggleRow, toggleAllFiltered, isSelected, allFilteredSelected, selectedRows,
    exportAll, exportSelected,
  };
}

// The filter-bar row: one compact input/select per filterable column,
// meant to sit directly above (or as the second <tr> of the <thead> of)
// the page's own table.
export function FilterBar({ columns, filters, setFilter, clearAllFilters }) {
  const filterable = columns.filter((c) => c.filter !== false);
  const hasActive = Object.keys(filters).length > 0;

  return (
    <div className="bp-datatable-filterbar">
      {filterable.map((col) => (
        <ColumnFilter key={col.key} column={col} value={filters[col.key]} onChange={(v) => setFilter(col.key, v)} />
      ))}
      {hasActive && (
        <button type="button" className="bp-btn-sm bp-btn-outline" onClick={clearAllFilters}>
          Clear filters
        </button>
      )}
    </div>
  );
}

function ColumnFilter({ column, value, onChange }) {
  if (column.filter === "select") {
    const options = column.options || [];
    const current = Array.isArray(value) ? value : [];
    return (
      <select
        className="bp-field-input bp-datatable-filter-input"
        multiple={false}
        value={current[0] || ""}
        onChange={(e) => onChange(e.target.value ? [e.target.value] : [])}
      >
        <option value="">{column.label} — all</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    );
  }
  if (column.filter === "dateRange") {
    const current = value || {};
    return (
      <div className="bp-datatable-daterange">
        <input
          type="date"
          className="bp-field-input bp-datatable-filter-input"
          value={current.from || ""}
          onChange={(e) => onChange({ ...current, from: e.target.value || undefined })}
          title={`${column.label} from`}
        />
        <input
          type="date"
          className="bp-field-input bp-datatable-filter-input"
          value={current.to || ""}
          onChange={(e) => onChange({ ...current, to: e.target.value || undefined })}
          title={`${column.label} to`}
        />
      </div>
    );
  }
  return (
    <input
      type="text"
      className="bp-field-input bp-datatable-filter-input"
      placeholder={column.label}
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

// Toolbar: filtered/selected counts + Export all / Export selected. Sits
// above the table, next to the page's existing "+ Add …" button.
export function DataTableToolbar({ table, filename, totalCount }) {
  const { filteredRows, selectedRows, exportAll, exportSelected } = table;
  return (
    <div className="bp-datatable-toolbar">
      <span className="bp-td-muted">
        {filteredRows.length === totalCount ? `${totalCount} rows` : `${filteredRows.length} of ${totalCount} rows`}
        {selectedRows.length > 0 && ` — ${selectedRows.length} selected`}
      </span>
      <div style={{ display: "flex", gap: 8 }}>
        {selectedRows.length > 0 && (
          <button type="button" className="bp-btn-sm bp-btn-outline" onClick={() => exportSelected(filename)}>
            Export selected ({selectedRows.length})
          </button>
        )}
        <button type="button" className="bp-btn-sm bp-btn-outline" onClick={() => exportAll(filename)}>
          Export all
        </button>
      </div>
    </div>
  );
}

// Header checkbox cell — put as the first <th> in the page's own <thead> row.
export function SelectAllHeaderCell({ table }) {
  return (
    <th style={{ width: 32 }}>
      <input type="checkbox" checked={table.allFilteredSelected} onChange={table.toggleAllFiltered} aria-label="Select all" />
    </th>
  );
}

// Row checkbox cell — put as the first <td> in the page's own row markup.
// Stops propagation so it doesn't also trigger the row's click-to-edit.
export function SelectRowCell({ table, row }) {
  return (
    <td onClick={(e) => e.stopPropagation()}>
      <input type="checkbox" checked={table.isSelected(row)} onChange={() => table.toggleRow(row)} aria-label="Select row" />
    </td>
  );
}
