import { useEffect, useMemo, useRef, useState } from "react";
import { exportCsv } from "../utils/exportCsv";

// Shared table behavior — Dynamics-style per-column header filter/sort,
// row selection with an export-selected action, and export-all — meant
// to wrap any existing <table>, not replace it. Pages keep their own
// <tr> markup (click-to-edit, StatusBadge, action buttons); this hook/
// wrapper only owns: sort order, which rows currently pass the column
// filters, which rows are checked, and turning either into a CSV
// download. See TABLE-CONVENTIONS.md for how to wire a new or existing
// table page.
//
// columns: [{ key, label, accessor: (row) => value, filter: "text" | "select" | "dateRange" | false }]
// rowKey: (row) => string
export function useDataTable({ rows, columns, rowKey }) {
  const [filters, setFilters] = useState({}); // { [columnKey]: string | string[] | { from, to } }
  const [sort, setSort] = useState(null); // { key, dir: 'asc' | 'desc' } | null
  const [selected, setSelected] = useState(() => new Set());

  const filterableColumns = columns.filter((c) => c.filter !== false);

  const filteredRows = useMemo(() => {
    const matched = rows.filter((row) =>
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

    if (!sort) return matched;
    const col = columns.find((c) => c.key === sort.key);
    if (!col) return matched;
    const dir = sort.dir === "desc" ? -1 : 1;
    return [...matched].sort((a, b) => {
      const av = col.accessor(a);
      const bv = col.accessor(b);
      if (av === bv) return 0;
      if (av === null || av === undefined || av === "") return 1;
      if (bv === null || bv === undefined || bv === "") return -1;
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv), undefined, { numeric: true }) * dir;
    });
  }, [rows, filters, filterableColumns, sort, columns]);

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
  function setSortKey(key, dir) {
    setSort(key ? { key, dir } : null);
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
    columns,
    filters, setFilter, clearFilter, clearAllFilters,
    sort, setSortKey,
    filteredRows,
    selected, toggleRow, toggleAllFiltered, isSelected, allFilteredSelected, selectedRows,
    exportAll, exportSelected,
  };
}

// A <th> replacement: column label + a small chevron that opens a
// Dynamics-style popup (Sort A-Z / Z-A, then a filter input, Apply/Clear)
// for that one column. Drop this in wherever a page currently has
// `<th>Label</th>` for a column defined in `columns`. Columns with
// `filter: false` still get sort-only (no filter section) unless
// `sortable: false` is also set, in which case it renders as a plain
// unclickable header (e.g. an actions column — just use a plain <th> for
// those instead of this component).
export function ColumnHeader({ table, column }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(table.filters[column.key]);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setDraft(table.filters[column.key]);
    function onOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [open, column.key, table.filters]);

  const isSorted = table.sort?.key === column.key;
  const isFiltered = table.filters[column.key] !== undefined && table.filters[column.key] !== "" &&
    !(Array.isArray(table.filters[column.key]) && table.filters[column.key].length === 0);
  const canFilter = column.filter !== false;

  function applySort(dir) {
    table.setSortKey(column.key, dir);
    setOpen(false);
  }
  function applyFilter() {
    table.setFilter(column.key, draft);
    setOpen(false);
  }
  function clear() {
    table.clearFilter(column.key);
    if (isSorted) table.setSortKey(null);
    setDraft(undefined);
    setOpen(false);
  }

  return (
    <th className="bp-colheader" ref={wrapRef}>
      <button type="button" className="bp-colheader-btn" onClick={() => setOpen((v) => !v)}>
        <span>{column.label}</span>
        <span className={"bp-colheader-chevron" + (isSorted || isFiltered ? " is-active" : "")} aria-hidden="true">
          {isSorted ? (table.sort.dir === "desc" ? "▼" : "▲") : "▾"}
        </span>
      </button>
      {open && (
        <div className="bp-colheader-menu" onClick={(e) => e.stopPropagation()}>
          <button type="button" className="bp-colheader-menu-item" onClick={() => applySort("asc")}>↑ Sort A to Z</button>
          <button type="button" className="bp-colheader-menu-item" onClick={() => applySort("desc")}>↓ Sort Z to A</button>
          {canFilter && (
            <>
              <div className="bp-colheader-menu-sep" />
              <ColumnFilterInput column={column} value={draft} onChange={setDraft} />
              <div className="bp-colheader-menu-actions">
                <button type="button" className="bp-btn-sm bp-btn-primary" onClick={applyFilter}>Apply</button>
                <button type="button" className="bp-btn-sm bp-btn-outline" onClick={clear}>Clear</button>
              </div>
            </>
          )}
        </div>
      )}
    </th>
  );
}

function ColumnFilterInput({ column, value, onChange }) {
  if (column.filter === "select") {
    const options = column.options || [];
    const current = Array.isArray(value) ? value : [];
    return (
      <select
        className="bp-field-input"
        value={current[0] || ""}
        onChange={(e) => onChange(e.target.value ? [e.target.value] : [])}
      >
        <option value="">All</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    );
  }
  if (column.filter === "dateRange") {
    const current = value || {};
    return (
      <div style={{ display: "flex", gap: 4 }}>
        <input
          type="date"
          className="bp-field-input"
          value={current.from || ""}
          onChange={(e) => onChange({ ...current, from: e.target.value || undefined })}
          title="From"
        />
        <input
          type="date"
          className="bp-field-input"
          value={current.to || ""}
          onChange={(e) => onChange({ ...current, to: e.target.value || undefined })}
          title="To"
        />
      </div>
    );
  }
  return (
    <input
      type="text"
      className="bp-field-input"
      placeholder="Contains…"
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      autoFocus
    />
  );
}

// "Search by <column>" — a dropdown to pick which column, plus a text
// box that live-filters it. Sits above/near the table, same page, no
// navigation (see TABLE-CONVENTIONS.md's Header search section).
export function SearchByBar({ table, columns }) {
  const searchable = columns.filter((c) => c.filter !== false && c.filter !== "select" && c.filter !== "dateRange");
  const [column, setColumn] = useState(searchable[0]?.key || "");
  const value = table.filters[column] || "";

  if (searchable.length === 0) return null;

  return (
    <div className="bp-searchby">
      <span className="bp-searchby-icon" aria-hidden="true">🔍</span>
      <input
        type="text"
        className="bp-field-input bp-searchby-input"
        placeholder="Search…"
        value={value}
        onChange={(e) => table.setFilter(column, e.target.value)}
      />
      <span className="bp-td-muted" style={{ whiteSpace: "nowrap" }}>Search by</span>
      <select
        className="bp-field-input bp-searchby-select"
        value={column}
        onChange={(e) => {
          if (value) table.clearFilter(column);
          setColumn(e.target.value);
        }}
      >
        {searchable.map((c) => (
          <option key={c.key} value={c.key}>{c.label}</option>
        ))}
      </select>
    </div>
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
