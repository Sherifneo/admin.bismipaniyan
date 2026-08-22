# Table conventions

Every table in the admin portal — existing or new — follows this pattern, modeled directly on Microsoft Dynamics 365's list views (confirmed with the owner via screenshots). Excel-style column filters is not a metaphor — it's this exact UI, and it's the way to build every table, not a one-off.

## What every table gets

1. **Per-column header dropdown** — click the small chevron in a column's header (built into the header cell itself, not a separate row above the table): a popup shows "Sort A to Z" / "Sort Z to A", then (for filterable columns) a filter input — text contains, a dropdown for enum-like columns, or a from/to date range — with Apply/Clear buttons. Matches Dynamics' column-header filter exactly.
2. **A "Search by [column]" bar** above the table: a text box + a dropdown to pick which column it searches, live-filtering as you type. Also modeled on Dynamics' list-view search bar. This is a per-page, in-place filter — it does **not** navigate anywhere.
3. **Row selection** — a checkbox column, click-to-toggle, a header "select all" checkbox that selects/deselects everything currently passing the filters (not the whole unfiltered table).
4. **Export** — "Export all" (every row passing the current filters) and "Export selected" (only checked rows), both client-side CSV via the existing `exportCsv` util.

There is **no cross-module/global header search** — an earlier attempt at a header module-picker-that-navigates-elsewhere was explicitly rejected by the owner ("this is not what I asked for") in favor of the in-page Dynamics pattern above. Do not reintroduce a global search bar in `Header.jsx`.

## How to wire it — `src/components/DataTable.jsx`

`DataTable.jsx` is not a table-rendering component — it's a hook (`useDataTable`) plus small pieces (`ColumnHeader`, `SearchByBar`, `DataTableToolbar`, `SelectAllHeaderCell`, `SelectRowCell`) that wrap **your own** `<table>` markup. Pages keep full control of row rendering (click-to-edit, `StatusBadge`, action buttons) — the hook only owns sort order, which rows currently pass the filters, and which are checked.

```jsx
import { useDataTable, SearchByBar, DataTableToolbar, SelectAllHeaderCell, SelectRowCell, ColumnHeader } from "../../components/DataTable";

const columns = [
  { key: "code", label: "Code", accessor: (row) => row.code || "" },
  { key: "name", label: "Name", accessor: (row) => row.name },
  { key: "status", label: "Status", accessor: (row) => row.status, filter: "select",
    options: [{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }] },
  { key: "created_at", label: "Created", accessor: (row) => row.created_at, filter: "dateRange" },
  { key: "notes", label: "Notes", accessor: (row) => row.notes || "", filter: false }, // no filter, but still sortable
];
const table = useDataTable({ rows: myRows, columns, rowKey: (row) => row.my_id });

// Above the table:
<DataTableToolbar table={table} filename="my-export-name" totalCount={myRows.length} />
<SearchByBar table={table} columns={columns} />

// Your <thead> row — swap each plain <th>Label</th> for a ColumnHeader,
// keep the first cell as the select-all checkbox and any trailing
// action-only column as a plain empty <th>:
<tr>
  <SelectAllHeaderCell table={table} />
  <ColumnHeader table={table} column={columns[0]} />
  <ColumnHeader table={table} column={columns[1]} />
  <ColumnHeader table={table} column={columns[2]} />
  <ColumnHeader table={table} column={columns[3]} />
  <ColumnHeader table={table} column={columns[4]} />
  <th></th>{/* actions column — no header filter, matches existing row markup */}
</tr>

// Render table.filteredRows instead of the raw rows array in your .map():
table.filteredRows.map((row) => (
  <tr key={row.my_id} onClick={...}>
    <SelectRowCell table={table} row={row} />
    {/* ...your existing <td> cells, unchanged... */}
  </tr>
))
```

### Column definition rules

- `accessor` always returns a **displayable string/primitive** — the same value shown in the cell. This is what filtering, sorting, and CSV export all use.
- `filter: false` disables the filter section of that column's popup (sort still works). Use this for free-text columns with no meaningful filter (long notes) — NOT for the actions column, which should stay a plain `<th></th>`, not a `ColumnHeader` at all (there's no data to sort/filter there).
- `filter: "select"` needs an `options` array (`{ value, label }`) — usually the same enum a `<select>` elsewhere in the page already uses.
- `filter: "dateRange"` expects `accessor` to return an ISO-ish date string (`YYYY-MM-DD` or a full timestamp — only the first 10 chars are compared).
- Default (no `filter` key, or `filter: "text"`) is case-insensitive substring match.
- `SearchByBar` only offers columns with plain text filtering (excludes `select`/`dateRange`/`false` columns) in its "Search by" dropdown — those have their own dedicated filter UI in the column header instead.

### What NOT to do

- Don't build a second table-rendering component. `DataTable.jsx` deliberately doesn't render `<table>`/`<tr>`/`<td>` itself — every page's row markup stays exactly as before.
- Don't reimplement CSV export per page — `DataTableToolbar`'s Export all/selected already calls the shared `exportCsv` util with your `columns` definition. The older `ExportMenu` component (server-side "export all matching filters" for paginated tables) is a separate, still-valid pattern for tables backed by server pagination where the full dataset isn't loaded client-side (e.g. Products) — use `DataTable`'s client-side export for everything else, and it's fine to have both on one page (see `ProductsList.jsx`).
- Don't add a global/header search bar. Search is per-page, in-place, via `SearchByBar` — see the rejected-approach note above.

## Rollout status

Applied (Dynamics-style column headers + SearchByBar): Retail Stores.
Mid-rollout: every other page listed below still has the OLDER always-visible FilterBar-row implementation from a prior iteration and needs the same column-header/SearchByBar swap StoresList.jsx just got: Customers, Products, Vendors, Machines, Partners (+ its Settlements sub-table), Sales Orders, Purchase Orders, Cash Book, Inventory, WhatsApp Orders, Bank Accounts, Production Runs, Cost Parameters, Team, Reports (all three tabs), Activity Log. `useDataTable`'s API is stable — only each page's `<thead>`/toolbar JSX needs updating (`FilterBar` → `SearchByBar`, each `<th>Label</th>` → `<ColumnHeader table={table} column={columns[N]} />`), not the `columns` array or `useDataTable` call itself.

Deliberately skipped: Dashboard's "Low stock" widget (top-6 glance preview inside a summary card, capped at `.slice(0, 6)`, no pagination), Cash Book's "Manage categories" modal sub-table (name + type only, no search need), and Security Roles' per-admin permissions matrix (a fixed set of ~9 rows, not a searchable list). None are real searchable list screens — filters/selection/export would be noise.
