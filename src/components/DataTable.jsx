import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { exportCsv } from "../utils/exportCsv";
import "./ExportMenu.css";

// Shared table behavior — Dynamics-style per-column header filter/sort,
// row selection with an export-selected action, and export-all — meant
// to wrap any existing <table>, not replace it. Pages keep their own
// <tr> markup (click-to-edit, StatusBadge, action buttons); this hook/
// wrapper only owns: sort order, which rows currently pass the column
// filters, which rows are checked, and turning either into a CSV
// download. See TABLE-CONVENTIONS.md for how to wire a new or existing
// table page.
//
// Shared open/outside-click-to-close behavior for the small popup-button
// components in this file (ColumnHeader's filter menu, the export
// dropdown, the column chooser) — factored out once three near-identical
// copies of this logic existed.
function useDropdown() {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [open]);

  return { open, setOpen, wrapRef };
}

// columns: [{ key, label, accessor: (row) => value, filter: "text" | "number" | "select" | "dateRange" | "boolean" | false, options?, hiddenByDefault? }]
// `filter` doubles as the column's data type — it picks which operator
// set the header popup offers (see OPERATORS_BY_TYPE below). Existing
// pages built before operator support was added keep working unchanged:
// the default (no `filter` key) is "text", "select"/"dateRange" behave
// exactly as before with a richer operator list layered on top.
// `hiddenByDefault` starts a column out of view until shown via the
// column chooser — used for audit columns (created/updated by & at) so
// they exist everywhere without cluttering every table by default.
// rowKey: (row) => string
export function useDataTable({ rows, columns, rowKey }) {
  // filters: { [columnKey]: { operator, value } | { operator, min, max } | { operator, from, to } }
  const [filters, setFilters] = useState({});
  const [sort, setSort] = useState(null); // { key, dir: 'asc' | 'desc' } | null
  const [selected, setSelected] = useState(() => new Set());
  const [visibleColumns, setVisibleColumns] = useState(
    () => new Set(columns.filter((c) => !c.hiddenByDefault).map((c) => c.key))
  );

  const filterableColumns = columns.filter((c) => c.filter !== false);

  const filteredRows = useMemo(() => {
    const matched = rows.filter((row) =>
      filterableColumns.every((col) => {
        const active = filters[col.key];
        if (!active || !active.operator) return true;
        return matchesFilter(colType(col), active, col.accessor(row));
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

  function isColumnVisible(key) {
    return visibleColumns.has(key);
  }
  function toggleColumnVisibility(key) {
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
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
    visibleColumns, isColumnVisible, toggleColumnVisibility,
    selected, toggleRow, toggleAllFiltered, isSelected, allFilteredSelected, selectedRows,
    exportAll, exportSelected,
  };
}

// A column's `filter` prop IS its data type for operator purposes.
// "text"/undefined -> text, "number" -> number, "dateRange" -> date,
// "select" -> lookup, "boolean" -> boolean.
function colType(col) {
  if (col.filter === "number") return "number";
  if (col.filter === "dateRange") return "date";
  if (col.filter === "select") return "select";
  if (col.filter === "boolean") return "boolean";
  return "text";
}

const OPERATORS_BY_TYPE = {
  text: [
    { value: "contains", label: "Contains" },
    { value: "notContains", label: "Does not contain" },
    { value: "startsWith", label: "Starts with" },
    { value: "endsWith", label: "Ends with" },
    { value: "equals", label: "Equals" },
    { value: "notEquals", label: "Does not equal" },
    { value: "isEmpty", label: "Is empty" },
    { value: "isNotEmpty", label: "Is not empty" },
  ],
  number: [
    { value: "equals", label: "Equals" },
    { value: "notEquals", label: "Does not equal" },
    { value: "gt", label: "Greater than" },
    { value: "gte", label: "Greater than or equal to" },
    { value: "lt", label: "Less than" },
    { value: "lte", label: "Less than or equal to" },
    { value: "between", label: "Between" },
    { value: "isEmpty", label: "Is empty" },
    { value: "isNotEmpty", label: "Is not empty" },
  ],
  date: [
    { value: "equals", label: "Equals" },
    { value: "before", label: "Before" },
    { value: "after", label: "After" },
    { value: "onOrBefore", label: "On or before" },
    { value: "onOrAfter", label: "On or after" },
    { value: "between", label: "Between" },
    { value: "isEmpty", label: "Is empty" },
    { value: "isNotEmpty", label: "Is not empty" },
  ],
  select: [
    { value: "is", label: "Is" },
    { value: "isNot", label: "Is not" },
    { value: "isEmpty", label: "Is empty" },
    { value: "isNotEmpty", label: "Is not empty" },
  ],
  boolean: [
    { value: "isYes", label: "Is Yes" },
    { value: "isNo", label: "Is No" },
  ],
};

// Default operator when a column's filter popup is first opened.
const DEFAULT_OPERATOR = {
  text: "contains",
  number: "equals",
  date: "equals",
  select: "is",
  boolean: "isYes",
};

function isBlank(raw) {
  return raw === null || raw === undefined || raw === "";
}

function matchesFilter(type, active, raw) {
  const { operator } = active;

  if (operator === "isEmpty") return isBlank(raw);
  if (operator === "isNotEmpty") return !isBlank(raw);

  if (type === "boolean") {
    const truthy = raw === true || raw === "true" || raw === "Yes" || raw === "yes" || raw === 1;
    return operator === "isYes" ? truthy : !truthy;
  }

  if (type === "select") {
    const rawStr = String(raw ?? "");
    const target = active.value;
    if (target === undefined || target === "" || (Array.isArray(target) && target.length === 0)) return true;
    const targets = Array.isArray(target) ? target : [target];
    const matches = targets.includes(rawStr);
    return operator === "isNot" ? !matches : matches;
  }

  if (type === "number") {
    if (isBlank(raw)) return false;
    const num = Number(raw);
    if (operator === "between") {
      const min = active.min === undefined || active.min === "" ? -Infinity : Number(active.min);
      const max = active.max === undefined || active.max === "" ? Infinity : Number(active.max);
      return num >= min && num <= max;
    }
    const target = Number(active.value);
    if (Number.isNaN(target)) return true;
    if (operator === "equals") return num === target;
    if (operator === "notEquals") return num !== target;
    if (operator === "gt") return num > target;
    if (operator === "gte") return num >= target;
    if (operator === "lt") return num < target;
    if (operator === "lte") return num <= target;
    return true;
  }

  if (type === "date") {
    if (isBlank(raw)) return false;
    const d = String(raw).slice(0, 10);
    if (operator === "between") {
      const from = active.from || "0000-00-00";
      const to = active.to || "9999-99-99";
      return d >= from && d <= to;
    }
    const target = active.value;
    if (!target) return true;
    if (operator === "equals") return d === target;
    if (operator === "before") return d < target;
    if (operator === "after") return d > target;
    if (operator === "onOrBefore") return d <= target;
    if (operator === "onOrAfter") return d >= target;
    return true;
  }

  // text
  const rawStr = String(raw ?? "").toLowerCase();
  const target = String(active.value ?? "").toLowerCase();
  if (target === "" && !["isEmpty", "isNotEmpty"].includes(operator)) return true;
  if (operator === "contains") return rawStr.includes(target);
  if (operator === "notContains") return !rawStr.includes(target);
  if (operator === "startsWith") return rawStr.startsWith(target);
  if (operator === "endsWith") return rawStr.endsWith(target);
  if (operator === "equals") return rawStr === target;
  if (operator === "notEquals") return rawStr !== target;
  return true;
}

// A <th> replacement: column label + a small chevron that opens a
// Dynamics-style popup (Sort A-Z / Z-A, then an operator-driven filter,
// Apply/Clear) for that one column. Drop this in wherever a page
// currently has `<th>Label</th>` for a column defined in `columns`.
// Columns with `filter: false` are sort-only (no filter section).
export function ColumnHeader({ table, column }) {
  const [open, setOpen] = useState(false);
  const active = table.filters[column.key];
  const [operator, setOperator] = useState(active?.operator || DEFAULT_OPERATOR[colType(column)]);
  const [draft, setDraft] = useState(active || {});
  const [menuPos, setMenuPos] = useState(null);
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  // The menu is portaled to document.body with position: fixed (see
  // render below) instead of a plain CSS-absolute child of the <th> —
  // .bp-table-wrap has overflow: auto for wide/short tables, and any
  // overflow ancestor clips+scroll-traps an absolutely positioned
  // descendant regardless of z-index. Recomputing on scroll/resize keeps
  // the menu glued to the header button while it's open.
  useLayoutEffect(() => {
    if (!open) return;
    function place() {
      const r = btnRef.current?.getBoundingClientRect();
      if (!r) return;
      // Anchor left-aligned to the button by default; if that would push
      // the menu (min-width 190px, actual width can run wider once a
      // date/number input renders) past the right edge, flip to
      // right-aligned against the button's right edge instead — the
      // classic "last column's filter renders off-screen" case. Same
      // clamp vertically for a header near the bottom of the viewport.
      const menuW = menuRef.current?.offsetWidth || 190;
      const menuH = menuRef.current?.offsetHeight || 0;
      const margin = 8;
      let left = r.left;
      if (left + menuW > window.innerWidth - margin) {
        left = Math.max(margin, r.right - menuW);
      }
      let top = r.bottom + 4;
      if (menuH && top + menuH > window.innerHeight - margin) {
        top = Math.max(margin, r.top - menuH - 4);
      }
      setMenuPos({ top, left });
    }
    place();
    // Placed once with estimated size, then re-measured now that the
    // portal has actually rendered (so menuRef.current has real
    // dimensions) — a date-input row is wider than the 190px estimate.
    const raf = requestAnimationFrame(place);
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open, operator]);

  useEffect(() => {
    if (!open) return;
    const current = table.filters[column.key];
    setOperator(current?.operator || DEFAULT_OPERATOR[colType(column)]);
    setDraft(current || {});
    function onOutside(e) {
      if (
        btnRef.current && !btnRef.current.contains(e.target) &&
        menuRef.current && !menuRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, column.key]);

  const isSorted = table.sort?.key === column.key;
  const isFiltered = !!active?.operator;
  const canFilter = column.filter !== false;
  const type = colType(column);

  function applySort(dir) {
    table.setSortKey(column.key, dir);
    setOpen(false);
  }
  function applyFilter() {
    table.setFilter(column.key, { ...draft, operator });
    setOpen(false);
  }
  function clear() {
    table.clearFilter(column.key);
    if (isSorted) table.setSortKey(null);
    setDraft({});
    setOperator(DEFAULT_OPERATOR[type]);
    setOpen(false);
  }

  const needsValue = !["isEmpty", "isNotEmpty", "isYes", "isNo"].includes(operator);

  return (
    <th className="bp-colheader">
      <button
        ref={btnRef}
        type="button"
        className={"bp-colheader-btn" + (isSorted || isFiltered ? " is-active" : "")}
        onClick={() => setOpen((v) => !v)}
      >
        <span>{column.label}</span>
        <span className={"bp-colheader-chevron" + (isSorted || isFiltered ? " is-active" : "")} aria-hidden="true">
          {isSorted ? (table.sort.dir === "desc" ? "▼" : "▲") : "▾"}
        </span>
      </button>
      {open && menuPos && createPortal(
        <div
          ref={menuRef}
          className="bp-colheader-menu bp-colheader-menu-portal"
          style={{ top: menuPos.top, left: menuPos.left }}
          onClick={(e) => e.stopPropagation()}
        >
          <button type="button" className="bp-colheader-menu-item" onClick={() => applySort("asc")}>↑ Sort A to Z</button>
          <button type="button" className="bp-colheader-menu-item" onClick={() => applySort("desc")}>↓ Sort Z to A</button>
          {canFilter && (
            <>
              <div className="bp-colheader-menu-sep" />
              <select
                className="bp-field-input"
                value={operator}
                onChange={(e) => { setOperator(e.target.value); setDraft({}); }}
              >
                {OPERATORS_BY_TYPE[type].map((op) => (
                  <option key={op.value} value={op.value}>{op.label}</option>
                ))}
              </select>
              {needsValue && (
                <div style={{ marginTop: 6 }}>
                  <FilterValueInput type={type} operator={operator} column={column} draft={draft} setDraft={setDraft} />
                </div>
              )}
              <div className="bp-colheader-menu-actions">
                <button type="button" className="bp-btn-sm bp-btn-primary" onClick={applyFilter}>Apply</button>
                <button type="button" className="bp-btn-sm bp-btn-outline" onClick={clear}>Clear</button>
              </div>
            </>
          )}
        </div>,
        document.body
      )}
    </th>
  );
}

function FilterValueInput({ type, operator, column, draft, setDraft }) {
  if (type === "select") {
    const options = column.options || [];
    return (
      <select
        className="bp-field-input"
        value={draft.value || ""}
        onChange={(e) => setDraft({ ...draft, value: e.target.value })}
        autoFocus
      >
        <option value="">Choose…</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    );
  }

  if (type === "number" && operator === "between") {
    return (
      <div style={{ display: "flex", gap: 4 }}>
        <input
          type="number"
          className="bp-field-input"
          placeholder="Minimum"
          value={draft.min ?? ""}
          onChange={(e) => setDraft({ ...draft, min: e.target.value })}
          autoFocus
        />
        <input
          type="number"
          className="bp-field-input"
          placeholder="Maximum"
          value={draft.max ?? ""}
          onChange={(e) => setDraft({ ...draft, max: e.target.value })}
        />
      </div>
    );
  }
  if (type === "number") {
    return (
      <input
        type="number"
        className="bp-field-input"
        placeholder="Value"
        value={draft.value ?? ""}
        onChange={(e) => setDraft({ ...draft, value: e.target.value })}
        autoFocus
      />
    );
  }

  if (type === "date" && operator === "between") {
    return (
      <div style={{ display: "flex", gap: 4 }}>
        <input
          type="date"
          className="bp-field-input"
          value={draft.from || ""}
          onChange={(e) => setDraft({ ...draft, from: e.target.value })}
          title="From date"
          autoFocus
        />
        <input
          type="date"
          className="bp-field-input"
          value={draft.to || ""}
          onChange={(e) => setDraft({ ...draft, to: e.target.value })}
          title="To date"
        />
      </div>
    );
  }
  if (type === "date") {
    return (
      <input
        type="date"
        className="bp-field-input"
        value={draft.value || ""}
        onChange={(e) => setDraft({ ...draft, value: e.target.value })}
        autoFocus
      />
    );
  }

  // text
  return (
    <input
      type="text"
      className="bp-field-input"
      placeholder="Value…"
      value={draft.value || ""}
      onChange={(e) => setDraft({ ...draft, value: e.target.value })}
      autoFocus
    />
  );
}

// "Search by <column>" — a dropdown to pick which column, plus a text
// box that live-filters it (always a case-insensitive "contains" against
// that column, regardless of the column's own operator-driven filter —
// this is the broad/fast search; the column header menu is for precise
// filtering). Sits above/near the table, same page, no navigation.
export function SearchByBar({ table, columns }) {
  const searchable = columns.filter((c) => c.filter !== false && c.filter !== "select" && c.filter !== "dateRange" && c.filter !== "boolean");
  const [column, setColumn] = useState(searchable[0]?.key || "");
  const active = table.filters[column];
  const value = active?.operator === "contains" ? active.value || "" : "";

  if (searchable.length === 0) return null;

  function onChange(v) {
    if (!v) {
      table.clearFilter(column);
    } else {
      table.setFilter(column, { operator: "contains", value: v });
    }
  }

  return (
    <div className="bp-searchby">
      <span className="bp-searchby-icon" aria-hidden="true">🔍</span>
      <input
        type="text"
        className="bp-field-input bp-searchby-input"
        placeholder="Search…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
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
      {Object.keys(table.filters).length > 0 && (
        <button type="button" className="bp-btn-sm bp-btn-outline" onClick={table.clearAllFilters}>
          Clear all filters
        </button>
      )}
    </div>
  );
}

// Single icon button -> dropdown with "Download all" / "Download
// selected" (mirrors the existing ExportMenu.jsx icon+dropdown pattern
// and reuses its CSS classes, see the ExportMenu.css import at the top
// of this file) — replaces what used to be two separate always-visible
// buttons.
function ExportDropdownButton({ table, filename }) {
  const { open, setOpen, wrapRef } = useDropdown();
  const { selectedRows, exportAll, exportSelected } = table;

  return (
    <div className="bp-export-wrap" ref={wrapRef}>
      <button type="button" className="bp-export-btn" title="Download" aria-label="Download" onClick={() => setOpen((v) => !v)}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      </button>
      {open && (
        <div className="bp-export-menu">
          <button type="button" className="bp-export-item" onClick={() => { exportAll(filename); setOpen(false); }}>
            Download all
            <span className="bp-export-item-sub">Every row passing the current filters</span>
          </button>
          <button
            type="button"
            className="bp-export-item"
            onClick={() => { exportSelected(filename); setOpen(false); }}
            disabled={selectedRows.length === 0}
          >
            Download selected ({selectedRows.length})
            <span className="bp-export-item-sub">Only the checked rows</span>
          </button>
        </div>
      )}
    </div>
  );
}

// Toolbar: filtered/selected counts + the Download dropdown. Sits above
// the table, next to the page's existing "+ Add …" button.
export function DataTableToolbar({ table, filename, totalCount }) {
  const { filteredRows, selectedRows } = table;
  return (
    <div className="bp-datatable-toolbar">
      <span className="bp-td-muted">
        {filteredRows.length === totalCount ? `${totalCount} rows` : `${filteredRows.length} of ${totalCount} rows`}
        {selectedRows.length > 0 && ` — ${selectedRows.length} selected`}
      </span>
      <ExportDropdownButton table={table} filename={filename} />
    </div>
  );
}

// Column-visibility chooser — a small icon button opening a checklist of
// every column, check/uncheck to show/hide it in the table. See
// TABLE-CONVENTIONS.md for how to wire a page's <thead>/<tbody> to
// respect `table.isColumnVisible(key)`.
export function ColumnChooserButton({ table, columns }) {
  const { open, setOpen, wrapRef } = useDropdown();
  const chooseable = columns.filter((c) => c.key);

  return (
    <div className="bp-export-wrap" ref={wrapRef}>
      <button type="button" className="bp-export-btn" title="Choose columns" aria-label="Choose columns" onClick={() => setOpen((v) => !v)}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <line x1="9" y1="4" x2="9" y2="20" />
          <line x1="15" y1="4" x2="15" y2="20" />
        </svg>
      </button>
      {open && (
        <div className="bp-export-menu" style={{ padding: "6px 0", maxHeight: 280, overflowY: "auto" }}>
          {chooseable.map((c) => (
            <label
              key={c.key}
              className="bp-export-item"
              style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}
            >
              <input
                type="checkbox"
                checked={table.isColumnVisible(c.key)}
                onChange={() => table.toggleColumnVisibility(c.key)}
              />
              {c.label}
            </label>
          ))}
        </div>
      )}
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
