# Table conventions

Every table in the admin portal — existing or new — follows this pattern, modeled directly on Microsoft Dynamics 365's list views (confirmed with the owner via screenshots). Excel-style column filters is not a metaphor — it's this exact UI, and it's the way to build every table, not a one-off.

## What every table gets

1. **Per-column header dropdown, operator-driven** — click the small chevron in a column's header (built into the header cell itself, not a separate row above the table): a popup shows "Sort A to Z" / "Sort Z to A", then an **operator dropdown** (its options depend on the column's data type — see below) and a value input that changes shape to match the chosen operator, with Apply/Clear buttons. Matches a modern ERP's (Dynamics-style) column-header filter.
2. **A "Search by [column]" bar** above the table: a text box + a dropdown to pick which column it searches, live-filtering as "contains" while you type. This is separate from and coarser than the per-column operator filter — it's the fast/broad search; the column header is for precise filtering. Per-page, in-place — it does **not** navigate anywhere.
3. **Row selection** — a checkbox column, click-to-toggle, a header "select all" checkbox that selects/deselects everything currently passing the filters (not the whole unfiltered table).
4. **Download** — a single icon button opening a small dropdown ("Download all" — every row passing the current filters, "Download selected" — only checked rows, disabled when nothing's checked), both client-side CSV via the existing `exportCsv` util. Styled like `ExportMenu.jsx`'s icon+dropdown pattern (same CSS classes, imported once into `DataTable.jsx` so every page gets it without needing to import `ExportMenu.css` itself).
5. **Column chooser** — a second small icon button opening a checklist of every column with checkboxes, to show/hide columns per viewer. Used for audit columns (see below) so they exist on every table without cluttering it by default.
6. Filters across different columns always combine with AND. Sort and every column's filter persist together — sorting doesn't clear filters, and (since this is all client-side React state) paging a server-paginated list doesn't clear them either.

### Operators by data type

A column's `filter` prop is also its data type — it picks which operator set the header popup offers:

- **`filter: "text"` (or omitted — this is the default)**: Contains, Does not contain, Starts with, Ends with, Equals, Does not equal, Is empty, Is not empty.
- **`filter: "number"`**: Equals, Does not equal, Greater than, Greater than or equal to, Less than, Less than or equal to, Between (shows Minimum/Maximum inputs), Is empty, Is not empty. Use this for any numeric column — price, quantity, stock, amount, discount, tax, total, commission %, balance.
- **`filter: "dateRange"`**: Equals, Before, After, On or before, On or after, Between (shows From/To date inputs), Is empty, Is not empty.
- **`filter: "select"`**: Is, Is not, Is empty, Is not empty — needs an `options` array (`{ value, label }`), and the value input becomes a `<select>` of those options rather than free text. Use for status/type/kind/category and other enum-like or lookup columns.
- **`filter: "boolean"`**: Is Yes, Is No only (no value input needed — picking the operator IS the filter). Use for true/false columns where a plain "Is Yes"/"Is No" reads more naturally than `select`'s "Is"/"Is not" — existing Yes/No columns built as `select` (e.g. Active/Inactive) are equally valid and don't need converting.
- **`filter: false`**: sort-only, no filter section in the popup. Use for the actions column, or long free-text columns (notes) with no meaningful filter.

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
- Don't reimplement CSV export per page — `DataTableToolbar`'s download dropdown already calls the shared `exportCsv` util with your `columns` definition. The older `ExportMenu` component (server-side "export all matching filters" for paginated tables) is a separate, still-valid pattern for tables backed by server pagination where the full dataset isn't loaded client-side (e.g. Products) — use `DataTable`'s client-side export for everything else, and it's fine to have both on one page (see `ProductsList.jsx`).
- Don't add a global/header search bar. Search is per-page, in-place, via `SearchByBar` — see the rejected-approach note above.

## Column chooser + audit columns (created/updated by & at)

Every genuinely transactional table (see `backend/src/db/migrations/015_audit_trail.sql` for the authoritative list) has `created_by`/`updated_by`/`updated_at` columns (alongside whatever `created_by`/`recorded_by` + `created_at` it already had — never renamed). These surface as 4 extra columns on every such page, all `hiddenByDefault: true` so they don't clutter the table for everyone — the column chooser is how a viewer opts into seeing them.

```jsx
import { useDataTable, SearchByBar, DataTableToolbar, ColumnChooserButton, SelectAllHeaderCell, SelectRowCell, ColumnHeader } from "../../components/DataTable";

const columns = [
  // ...your normal columns...
  { key: "created_by_name", label: "Created by", accessor: (row) => row.created_by_name || "", hiddenByDefault: true },
  { key: "created_at", label: "Created at", accessor: (row) => row.created_at || "", filter: "dateRange", hiddenByDefault: true },
  { key: "updated_by_name", label: "Updated by", accessor: (row) => row.updated_by_name || "", hiddenByDefault: true },
  { key: "updated_at", label: "Updated at", accessor: (row) => row.updated_at || "", filter: "dateRange", hiddenByDefault: true },
];

// Toolbar row — Download dropdown and Column chooser sit together:
<div style={{ display: "flex", gap: 8, alignItems: "center" }}>
  <DataTableToolbar table={table} filename="my-export-name" totalCount={myRows.length} />
  <ColumnChooserButton table={table} columns={columns} />
</div>
<SearchByBar table={table} columns={columns} />

// Every <ColumnHeader> and every <td> — not just the new ones — gets wrapped:
{table.isColumnVisible(columns[0].key) && <ColumnHeader table={table} column={columns[0]} />}
...
{table.isColumnVisible("created_by_name") && <td className="bp-td-muted">{row.created_by_name || "—"}</td>}
{table.isColumnVisible("created_at") && <td className="bp-td-muted">{row.created_at ? new Date(row.created_at).toLocaleString("en-IN") : "—"}</td>}
```

`created_by_name`/`updated_by_name` come from the backend joining `admins` on the table's `created_by`/`updated_by` columns and aliasing `full_name` — see `backend/src/routes/machines.js`'s GET route for the exact join shape, and its PUT route for how `updated_by = ?` is set unconditionally (never `COALESCE`-wrapped — every update really did just happen).

Remember to bump every loading/empty-row `colSpan` by however many new columns you added (this pass is always exactly +4).

Excluded from audit columns entirely: `locations` (static reference data), `admins`/`admin_permissions`/`counters`/`cashbook_categories` (system/self-referential, not business transactions), Dashboard's low-stock widget, Cash Book's category-management sub-table, Reports' read-only aggregate tabs (no underlying row to attribute), and Activity Log (itself an audit view).

## Rollout status

Fully applied (Dynamics-style column headers + SearchByBar + operator-driven filters): Retail Stores, Customers, Products, Vendors, Machines, Partners (+ its Settlements sub-table), Sales Orders, Purchase Orders, Cash Book, Inventory, WhatsApp Orders, Cash & Bank (renamed from "Bank Accounts"), Production Runs, Cost Parameters, Team, Reports (all three tabs), Activity Log. Bank Transactions (`src/pages/bank-transactions/BankTransactionsList.jsx`) uses the same page/filter/pagination shape but a plain table rather than the full DataTable/ColumnChooser machinery.

Numeric columns explicitly typed `filter: "number"` (rather than defaulting to text) as of this pass: Cash & Bank's balance, Cash Book's amount, Inventory's stock/consignment qty, Partners' commission % and its Settlements sub-table's sales/net amount, Cost Parameters' value, Production Runs' quantity, Products' cost/selling price and low-stock alert, Purchase Orders' total, Reports' income/expense/net/qty-delta/count/total-value, Sales Orders' total, WhatsApp Orders' subtotal. If you add a new numeric column anywhere, give it `filter: "number"` from the start rather than leaving it as default text.

Deliberately skipped: Dashboard's "Low stock" widget (top-6 glance preview inside a summary card, capped at `.slice(0, 6)`, no pagination), Cash Book's "Manage categories" modal sub-table (name + type only, no search need), and Security Roles' per-admin permissions matrix (a fixed set of ~9 rows, not a searchable list). None are real searchable list screens — filters/selection/export would be noise.
