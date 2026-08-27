# Bismi Bakery Admin Portal — Project Context

React 19 + Vite admin/back-office UI for Bismi Bakery, at `admin.trpbismipaniyan.com`. Read this before making changes.

## What this is

The internal staff-facing tool for **Bismi Bakery & Paniyan Shop**, a traditional bakery manufacturer in Karaikal, Puducherry. Not a customer-facing app — no shopping cart, no checkout, staff-only login. See `BUSINESS-MODEL-FEATURES.md` for the business context.

One of three sibling repos for the same business:
- `Bismipaniyan` — the public website (`trpbismipaniyan.com`)
- **`admin.bismipaniyan`** — this repo (`admin.trpbismipaniyan.com`)
- `api.bismipaniyan` — the backend API (`api.trpbismipaniyan.com`)

Separate repos, separate Hostinger deploy targets — see `DEPLOYMENT.md`.

## Architecture

Deliberately follows a proven shell pattern (originally from a sibling project, nammahearth) — reuse the generic parts verbatim, design business modules fresh per this client's actual operations:

- **`src/auth/`** — token-in-localStorage auth (`bp_admin_token`), `AuthContext` boots by calling `/api/admin/auth/me`, `ProtectedRoute` gates by sign-in state, `ownerOnly`, or `requiredPermission`.
- **`src/api/client.js`** — fetch wrapper; a 401 clears the token and fires a `bp-admin-auth-change` event the auth context listens for.
- **`src/api/admin.js`** — one function per backend endpoint, grouped by module (`cashbookApi`, `inventoryApi`, `partnersApi`, etc.).
- **`src/layout/navConfig.js`** — the single source of truth for the sidebar. `App.jsx` generates routes from this same list, so a route can never exist without a nav entry or vice versa. A nav item with no page built yet renders `ComingSoon` automatically.
- **`src/theme/`** — `theme.css` (CSS custom-property tokens, brand purple `#5b1f97` + amber accent) and `shared.css` (page/table/form/button classes reused by every module).
- **`src/components/`** — Modal, Pagination, SearchBox, StatusBadge, ExportMenu, ReasonConfirmModal — shared across every list page.
- **List-page shape**: search/filter → table → pagination → modal for create/edit → CSV export. Every built module follows this.

## Deploy shape

This is a Vite SPA — `npm run build` produces static files in `dist/`. Hostinger's Node.js App hosting needs a running process, not a bare static host, so `server.js` (a tiny Express static-file server with an SPA fallback) serves the built output. `postinstall` runs `vite build` automatically so a plain `npm install` produces `dist/` before `npm start` needs it. `vite` and `@vitejs/plugin-react` are real `dependencies`, not `devDependencies`, so a production-only install still has what it needs.

## What's built vs. not

Built: Login, Dashboard, Cash Book (Cash Book / Ledger Transaction / Reversals / Recently Deleted / Categories tabs), Inventory (Stock / Transfers / Transactions tabs), WhatsApp Orders, Partners & Shops, Products, Vendors, Purchase Orders, Production, Machines, Cost Parameters, Reports, Settings, Team, Security Roles, Number Sequences, System Errors, Transaction Search, and the financial-accounts subsystem — Cash & Bank (`bank-accounts` route/nav key, page at `src/pages/bank-accounts/`, renamed from "Bank Accounts"; tabs are Accounts / Transfer / Bank Transaction, the last a full Dynamics-style filterable table of every deposit/withdrawal/transfer across every account, replacing the old standalone Bank Transactions page and the old per-account Transactions modal), and Financial Control (accounts overview, Financial Dimensions, per-account Reconciliation).

**Workflow** (`src/pages/workflows/WorkflowsPage.jsx`, `workflows` nav key, `ownerOnly: true`) lists every named approval point (Cash Book entry approval, Reconciliation approval — see backend `CLAUDE.md`'s note on migration 030) and lets the owner assign exactly one approver per workflow from an active-admins dropdown. TransID columns added across the app are `hiddenByDefault: true` everywhere (opt in via the column chooser) except the Reconciliation tab's plain "Recent reconciliations" table, which has no column chooser and so doesn't show TransID there at all — open a batch to see it.

**Transaction Search** (`src/pages/global-search/GlobalSearchPage.jsx`, `globalsearch` nav key, no `requiredPermission` — matches the backend's bare `requireAdmin()`) is the cross-module lookup for the universal `universal_trans_id` (TRX-YYYYMMDD-NNNNNN) every transactional row now carries — see backend `CLAUDE.md`'s note on migration 029. Search any TransID or module document number (SO-/PO-/CB-/IM-/ST-/batch code), click through to a transaction's full detail plus its Related Transactions (source/parent, reversal pairs, transfer legs). Every relevant list page (Cash Book/Ledger, Bank Transaction, Inventory Transactions, Sales/Purchase Orders, Production Runs, Partner Settlements, Reconciliation) shows the row's `universal_trans_id` as a `.bp-trans-id-link` (`shared.css`) linking to `/global-search?trans=<id>`.

**Products page has three tabs** (`src/pages/products/ProductsList.jsx`): Products (unchanged), **UOM** (`UomTab` — the "manage a small list" pattern: add/rename/deactivate/delete units, feeds the Product modal's unit dropdown instead of a hardcoded Each/Kg), and **BOM** (`BomTab`/`BomModal` — recipes: pick a finished good, an output quantity, and one or more raw-material lines with quantities; a product can have several named BOMs). The Production Runs "New production run" modal (`ProductionRunsList.jsx`'s `NewRunModal`) loads that product's **approved** BOMs only when a product is selected and shows an optional BOM dropdown — picking one means completing the run also deducts those raw materials from stock (see backend `CLAUDE.md`'s migration 033/034 notes), in addition to the existing finished-good stock addition.

BOMs have their own Draft/Approved status (badge in `BomTab`'s list), an "Approve" button gated by `products.manage`+`full_control` (also checked against the Workflow module's `bom_approval` assignment server-side), and delete is icon-only (🗑, `title`/`aria-label="Delete"` — no text label, matching Cash Book's delete-icon convention) and restricted to `admin.role === "owner"` on draft BOMs only — an approved BOM can only be deactivated, never deleted, from either role.

**Partner Products / Partner Inventory / Partner Sales** (`supplying_partner` type only — see backend `CLAUDE.md`'s migration 035 note): the Product modal (`ProductsList.jsx`) has an "Owning partner" dropdown (active supplying partners only); an owned product shows a `.bp-partner-type-badge` next to its name in the list, plus a hidden-by-default "Owner" column. `PartnersList.jsx` gets a "Stock" button (supplying partners only) opening `PartnerStockModal` — a partner-scoped stock list plus a "+ Receive stock" action (`ReceiveStockForm`) that posts to the dedicated `POST /partners/:id/receive-stock` route. `SalesOrdersList.jsx`'s `NewSoModal` locks its product picker to one owner (Bismi or a single partner) once any line has a product — client-side convenience backing the server-side no-mixed-cart check.

Completing a partner-product sale does not credit the full amount as Bismi's income — only the commission is (see backend note); the rest posts as a `cashbook_entries.entry_type='partner_payable'` row, shown in Cash Book's Type filter/badge (`CashBookList.jsx`, badge text "Partner Payable — Received"/"— Paid out" by `direction`) but **not** offered in the manual Add Entry form's Type dropdown — it's system-generated only, like `transfer`. `PartnersList.jsx`'s Settlements modal branches by partner type: `external_shop` keeps the original period/sales-value `NewSettlementForm` unchanged; `supplying_partner` instead shows `PayOutForm` — the current balance owed (`GET /partners/:id/payable-balance`) and a single "Pay out" button (`POST /partners/:id/pay-out`), no manual sales-value entry since commission is already taken per-sale.

Not built: a change-password screen. See `ADMIN-PORTAL-PLAN.md` for the original module list and build order (a pre-build plan, not kept current as a build tracker — treat its "not built" markers with caution).

## Conventions to follow

- New module: add a nav entry in `navConfig.js` (with `requiredPermission` matching what the backend route expects), a page component in `src/pages/<module>/`, register it in `App.jsx`'s `BUILT_PAGES`.
- Reuse `bp-page-title`, `bp-table`, `bp-btn-primary`/`-outline`/`-sm`, `bp-field-input`, `bp-form-row` etc. from `shared.css` rather than writing new CSS for standard list/form UI.
- No password-reset/change-password screen exists yet — this is a known gap, not an oversight to silently work around.

### "Manage a small list" pattern — tabs on a page, never a nested modal

When a feature needs an owner-editable reference list (categories, positions, statuses, any small admin-managed lookup table used elsewhere as a dropdown), it gets its **own tab on the parent module's page** — not a `Modal` opened from inside another `Modal`. The owner rejected the nested-modal shape explicitly (Cash Book's "Manage categories" and HR's "Manage positions" both started this way and were both corrected to tabs) — a modal-on-modal doesn't have room for a real table and reads as broken/cramped no matter how it's laid out.

Reference: the owner's screenshot pattern is a Dynamics-365-style admin screen — one page, a `bp-tabs`/`bp-tab` bar across the top (Users / Security / Departments / Categories / ...), each tab swapping in a different full-width table+form section on the same page, no page navigation and no popup-inside-popup.

**Shape to follow**, using Cash Book's Categories tab and HR's Positions tab as the templates:
1. The list gets a `TABS` entry alongside the module's other tabs (e.g. `{ key: "categories", label: "Categories" }` next to Cash Book's All/Income/Expense/... tabs) — reuse the page's *existing* tab bar if it has one (Cash Book), or introduce one if it doesn't yet (HR's `HRPage.jsx` wraps `EmployeesList`/`PositionsList`/`SalaryPaymentsList` as tabs, each still its own self-contained component).
2. The list's CRUD UI (add/rename/deactivate/delete, inline edit) becomes a plain `<div>`-wrapped component — not `<Modal>` — so it renders full-width inside the tab instead of a fixed ~420px modal box.
3. Anywhere else in the module that needs to jump to that list (e.g. a "Manage" button next to a dropdown sourced from it) switches the parent's tab state (`onManageX={() => setTab("x")}` threaded down as a prop) instead of opening a nested modal or navigating to a separate route/new tab.
4. If the list benefits from a real code (most master lists do — see Machines/Employees/Vendors), give it one via `nextCode()` the same way, registered in `backend/src/routes/number-sequences.js`'s `TARGET_BY_KEY`.

Do not default to a nested `Modal` for a "manage this list" feature going forward — start with a tab.
