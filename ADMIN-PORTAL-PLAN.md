# Bismipaniyan Admin Portal — Plan

**Type:** Internal back-office tool. No customer-facing e-commerce features (no Orders/Carts/Payments/Returns/Customers modules — those are nammahearth-specific and don't apply here).
**Stack:** React 19 + Vite + react-router-dom + recharts (same stack/architecture as nh-adminportal).
**Repo path:** `admin-portal/`

## Why this shell, not a from-scratch build
The user has already built and validated this shell once (nammahearth's nh-adminportal) and is now customizing it per client as a service. Reusing it here means:
- Same auth flow (token in localStorage, `/api/admin/auth/me` boot check, permission-gated nav).
- Same layout (Sidebar + Header + AppShell, mobile drawer, breadcrumb-from-nav).
- Same design tokens pattern (CSS custom properties in `theme.css`, shared utility classes in `theme/shared.css`) — recolored to Bismi's brand purple `#5b1f97` + amber accent instead of nammahearth's plum.
- Same shared components: Modal, Pagination, SearchBox, StatusBadge, ExportMenu, ReasonConfirmModal.
- Same list-page shape: search → filters → table → pagination → modals for create/edit, CSV export.

This is the "keep the chassis, swap the modules" approach the user confirmed (2026-08-21).

## What's built so far (shell only, no live backend)
- `src/auth/` — AuthContext, ProtectedRoute
- `src/api/` — client.js (fetch wrapper, 401 handling), config.js (env detection), admin.js (endpoint stubs — **these point at endpoints that don't exist yet**, a real backend is a separate project)
- `src/layout/` — AppShell, Sidebar, Header, navConfig, FullScreenSpinner
- `src/components/` — Modal, Pagination, SearchBox, StatusBadge, ExportMenu, ReasonConfirmModal
- `src/pages/Dashboard.jsx`, `Login.jsx`, `ComingSoon.jsx`
- `src/theme/` — theme.css (tokens), shared.css (page/table/form/button classes)
- `App.jsx` — routes wired for nav, all modules currently render "Coming soon"

## Modules to build — reflecting Bismi's actual business model

Bismi is a bakery **manufacturer** with a factory (T.R. Pattinam) + 2 retail stores (Karaikal, Nagore), running a **three-way consignment model**, not a single-location retailer. Source: `Bismi_Bakery_Business_Model_Summary.xlsx`.

| Model | Flow | Commission |
|---|---|---|
| A — Bismi's own product, sold in Bismi's own store | Factory → Bismi store → customer | None, 100% to Bismi |
| B — Bismi's product, sold via an external partner shop | Factory → external shop → customer | 15% to shop, 85% to Bismi |
| C — a local partner's product, sold in Bismi's own store | Partner → Bismi store → customer | 20% to Bismi, 80% to partner |

This is the single biggest structural difference from nammahearth (which is a single-owner e-commerce business with no consignment). It means:

### New masters nammahearth doesn't have
- **Partner Business Master** — name, contact, products supplied, commission %, settlement frequency (Model C partners).
- **External Shop Master** — shop name, owner, contact, location, commission %, settlement frequency (Model B shops).
- **Location Master** — factory (T.R. Pattinam) + Karaikal store + Nagore store, since inventory and sales need to be tracked per-location, not globally.

### Modules, adapted
- **Products** — Bismi's real ~30-item range (1/2 N.H, Box N.H, T.L.H, Paniyan varieties, Rusk, Bread, Buns, Muruku, etc. — already listed with prices in the business doc) plus raw materials (Maida, Sugar, Butter, Oil, Egg, Ghee, Cashew, Milk Powder).
- **Inventory** — per-location stock (factory raw material + finished goods, Karaikal store stock, Nagore store stock), plus separate tracking for **partner-owned stock held on consignment** in Bismi stores (Model C) and **Bismi stock held at external shops** (Model B) — this is not a single stockroom like nammahearth's.
- **Vendors** — raw material suppliers (unchanged concept from nammahearth).
- **Partners / External Shops** *(new — no nammahearth equivalent)* — the two consignment-relationship masters above, plus a commission settlement screen (sales value → commission % → amount due, per the business doc's sample calculator).
- **Production** — batch production against Bismi's actual process (measurement → mixing on the Plantree machine → sizing/layering → cutting → arranging → baking → packing → labelling), yield/wastage/QC — same shape as nammahearth's Production module, just mapped to Bismi's real machine (`Plantree`, Machine ID BM0001) and steps.
- **Cash Book / Bank** — unchanged concept, but needs to roll up across factory + 2 stores.
- **Team** — Bismi's real headcount: 5 production employees (T.R. Pattinam), 3 each at Karaikal and Nagore (11 total).
- **Reports** — per the business doc's explicit "Recommended Reports" list:
  - Sales: daily / store-wise / product-wise / monthly / bulk / partner-product sales
  - Inventory: raw material, finished goods, per-store, external-shop stock, partner-owned stock, damaged/expired, stock movement
  - Financial: daily cash position, vendor payable, **partner payable**, **external-shop receivable**, gross profit, store & product profitability, monthly income statement
  - Production: batch production, raw-material consumption, yield, wastage, QC status, product cost
- **Settings / Security / Number Sequences** — unchanged concept from nammahearth.

### Explicitly dropped from nammahearth's module set
Orders, Cart Tracker, Payments, Returns, WhatsApp Inquiry, Customers, Coupons — all e-commerce-specific, don't apply to a walk-in/phone/consignment bakery business (confirmed with the user 2026-08-21).

## Suggested build order
1. Location Master + Partner/External Shop masters (foundational — everything else references these).
2. Products (real Bismi catalog) + Raw Materials.
3. Inventory (per-location + consignment stock split).
4. Partners/External Shops settlement screen (the commission calculator).
5. Production (batches against the real process).
6. Cash Book / Bank.
7. Team, Vendors, Purchasing.
8. Reports (once enough of the above exists to report on).
9. Settings / Security / Number Sequences.

## Open questions for the business owner
1. Does each store (Karaikal, Nagore) need its own login/staff accounts, or does the owner want a single shared login per store to start?
2. Is there an existing POS/billing system at the stores, or will this admin portal *be* the billing system (i.e. does "Cash Book" need a point-of-sale screen, not just a ledger)?
3. Settlement frequency for partners/external shops — daily, weekly, monthly? (Needed to design the settlement screen.)
4. Is there a backend/API already, or does one need to be built from scratch alongside this frontend? (Right now `src/api/admin.js` points at endpoints that don't exist.)
