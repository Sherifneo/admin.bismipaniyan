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

Built: Login, Dashboard, Cash Book, Inventory, WhatsApp Orders, Partners & Shops.

Not built: Bank Accounts, Products (CRUD UI — products currently only exist via the backend's seed script), Vendors, Purchase Orders, Production, Machines, Cost Parameters, Reports, Financial Control, Settings, Team, Security Roles, Number Sequences, System Errors. See `ADMIN-PORTAL-PLAN.md` for the full build order.

## Conventions to follow

- New module: add a nav entry in `navConfig.js` (with `requiredPermission` matching what the backend route expects), a page component in `src/pages/<module>/`, register it in `App.jsx`'s `BUILT_PAGES`.
- Reuse `bp-page-title`, `bp-table`, `bp-btn-primary`/`-outline`/`-sm`, `bp-field-input`, `bp-form-row` etc. from `shared.css` rather than writing new CSS for standard list/form UI.
- No password-reset/change-password screen exists yet — this is a known gap, not an oversight to silently work around.
