# Table conventions

Every table in the admin portal — existing or new — follows this pattern. Confirmed with the owner: every list screen gets Excel-style per-column filters, row selection with CSV export (all + selected), and this is the way to build it, not a one-off.

## What every table gets

1. **Per-column filter bar** above the table — text contains-filter by default, a dropdown (`filter: "select"`) for enum-like columns (status, kind, active/inactive), or a from/to date range (`filter: "dateRange"`) for date columns.
2. **Row selection** — a checkbox column, click-to-toggle, a header "select all" checkbox that selects/deselects everything currently passing the filters (not the whole unfiltered table).
3. **Export** — "Export all" (every row passing the current filters) and "Export selected" (only checked rows), both client-side CSV via the existing `exportCsv` util. No new dependency, no server round-trip for this — it's the rows already loaded into the page.

## How to wire it — `src/components/DataTable.jsx`

`DataTable.jsx` is not a table-rendering component — it's a hook (`useDataTable`) plus small pieces (`FilterBar`, `DataTableToolbar`, `SelectAllHeaderCell`, `SelectRowCell`) that wrap **your own** `<table>` markup. Pages keep full control of row rendering (click-to-edit, `StatusBadge`, action buttons) — the hook only owns which rows currently pass the filters and which are checked.

```jsx
import { useDataTable, FilterBar, DataTableToolbar, SelectAllHeaderCell, SelectRowCell } from "../../components/DataTable";

const columns = [
  { key: "code", label: "Code", accessor: (row) => row.code || "" },
  { key: "name", label: "Name", accessor: (row) => row.name },
  { key: "status", label: "Status", accessor: (row) => row.status, filter: "select",
    options: [{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }] },
  { key: "created_at", label: "Created", accessor: (row) => row.created_at, filter: "dateRange" },
];
const table = useDataTable({ rows: myRows, columns, rowKey: (row) => row.my_id });

// Above the table:
<DataTableToolbar table={table} filename="my-export-name" totalCount={myRows.length} />
<FilterBar columns={columns} filters={table.filters} setFilter={table.setFilter} clearAllFilters={table.clearAllFilters} />

// In your <thead> row, first cell:
<SelectAllHeaderCell table={table} />

// Render table.filteredRows instead of the raw rows array in your .map():
table.filteredRows.map((row) => (
  <tr key={row.my_id} onClick={...}>
    <SelectRowCell table={table} row={row} />
    {/* ...your existing <td> cells... */}
  </tr>
))
```

### Column definition rules

- `accessor` always returns a **displayable string/primitive** — the same value shown in the cell, not a raw object. This is what both filtering and CSV export use.
- `filter: false` opts a column out entirely (e.g. an actions column, or a column with no meaningful filter — long free-text notes, etc).
- `filter: "select"` needs an `options` array (`{ value, label }`) — usually the same enum a `<select>` elsewhere in the page already uses.
- `filter: "dateRange"` expects `accessor` to return an ISO-ish date string (`YYYY-MM-DD` or a full timestamp — only the first 10 chars are compared).
- Default (no `filter` key, or `filter: "text"`) is case-insensitive substring match.

### What NOT to do

- Don't build a second table-rendering component. `DataTable.jsx` deliberately doesn't render `<table>`/`<tr>`/`<td>` itself — every page's row markup stays exactly as before, just reading from `table.filteredRows` instead of the raw array.
- Don't reimplement CSV export per page — `DataTableToolbar`'s Export all/selected already calls the shared `exportCsv` util with your `columns` definition. The older `ExportMenu` component (server-side "export all matching filters" for paginated tables) is a separate, still-valid pattern for tables backed by server pagination where the full dataset isn't loaded client-side (e.g. Products) — use `DataTable`'s client-side export for everything else.

## Rollout status

Applied: Retail Stores, Customers, Products, Vendors, and (via a background retrofit pass) Machines, Partners, Sales Orders, Purchase Orders, Cash Book, Inventory, WhatsApp Orders, Bank Accounts, Production, Cost Parameters, Team.

Deliberately skipped: Dashboard's "Low stock" widget (top-6 glance preview inside a summary card, capped at `.slice(0, 6)`, no pagination) and Cash Book's "Manage categories" modal sub-table (name + type only, no search need). Both are small in-context management lists, not full searchable list screens — filters/selection/export would be noise. If either grows into its own full list page, apply the pattern then.

## Header search — `GlobalSearch.jsx`

The header search bar is a launcher, not a results view: pick a module from the dropdown, optionally type a term and/or a date range, submit, and it navigates to that module's own list page as `<path>?q=<term>&from=<date>&to=<date>`. It does not render results itself — every target page is responsible for reading those params and seeding its own existing search state.

### Wiring a page to receive it

1. Add the page's nav `key` to `SEARCHABLE_KEYS` in `src/layout/GlobalSearch.jsx` if it isn't already there.
2. In the page, call `const urlSearch = useUrlSearch();` (from `src/hooks/useUrlSearch.js`) — returns `{ q, from, to }` read from the URL once.
3. Seed whichever of the page's own search mechanisms are relevant:
   - A server-side `q` param (`useState(urlSearch.q)` instead of `useState("")` for the page's own `q` state) — also pass `initialValue={urlSearch.q}` to `<SearchBox>` so the visible input matches.
   - A `DataTable` text/select column — call `table.setFilter(columnKey, urlSearch.q)` once in a mount-only `useEffect` (empty dependency array).
   - A `DataTable` `dateRange` column — call `table.setFilter(columnKey, { from: urlSearch.from || undefined, to: urlSearch.to || undefined })` the same way, only if `urlSearch.from || urlSearch.to`.
4. If a page has no single free-text-searchable field that makes sense for `q` (e.g. WhatsApp Orders, a worklist with no name/phone column), only wire the date range — don't force a `q` match onto an unrelated column.

See `SalesOrdersList.jsx` or `PurchaseOrdersList.jsx` for a page wired for both `q` and a date range; `WaOrdersList.jsx` for date-range-only.
