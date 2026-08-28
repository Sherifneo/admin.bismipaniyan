# Admin Portal — Changelog

One entry per commit, newest first. **Version ID = the git commit hash** — the
authoritative way to identify exactly what code was live at any point. To
inspect or restore any past version:

- `git show <hash>` — view that commit's full diff without touching your working tree.
- `git checkout <hash>` — check out that exact snapshot (read-only/detached HEAD; use `git checkout main` afterward to return to the tip).
- `git log --oneline` — the short hashes below (e.g. `4b63b3ac`) match what Hostinger's deployments screen shows.

Each entry states what the code/behavior was **AS-IS** (before) and what it became **TO-BE** (after).

---

## v62d06e8b — Add Month/Financial Year filters and YTD comparison to P&L tab — 2026-08-28 15:44 (+03:00)

**Version ID**: `62d06e8b8f102feb3db5429c02be36160c48ba63` (short: `62d06e8b`)
**How to get this version**: `git checkout 62d06e8b8f102feb3db5429c02be36160c48ba63` (read-only) or `git show 62d06e8b8f102feb3db5429c02be36160c48ba63` (view the diff)

**AS-IS (before):** `ProfitLossTab` in `src/pages/reports/ReportsPage.jsx` had only a plain custom From/To date range — no quick way to jump to a specific month or financial year, and no Year-to-Date figure shown anywhere.
**TO-BE (after):** Added Month (dropdown + year) and Financial Year (Apr–Mar) quick-pickers next to the existing custom range — both are pure shortcuts that set `from`/`to`, the report itself still runs on a plain date range, no new backend filtering mode. Added a Year-to-Date net profit figure (FY start, always April 1, through today) shown side by side with the currently selected period's own net profit, so "how's the year doing" and "how's this period doing" are visible at a glance. No backend change — reuses the existing `/profit-loss?from&to` endpoint twice (once for YTD, once for the selected range).

---

## v2fc32e17 — Add Financial Reports tabs (P&L, Financial Position, Cash & Bank, Payables Aging, Inventory & Production) — 2026-08-28 11:22 (+03:00)

**Version ID**: `2fc32e17c05cea22f394fa41b94e3f1c487a21a0` (short: `2fc32e17`)
**How to get this version**: `git checkout 2fc32e17c05cea22f394fa41b94e3f1c487a21a0` (read-only) or `git show 2fc32e17c05cea22f394fa41b94e3f1c487a21a0` (view the diff)

**AS-IS (before):** Reports was a small set of listings; `src/pages/reports/ReportsPage.jsx` had no Profit & Loss, Financial Position, Cash & Bank, Payables Aging, or Inventory & Production tabs, and `src/api/admin.js` had no API functions to back them.
**TO-BE (after):** Large addition to `src/pages/reports/ReportsPage.jsx` (+389 lines) adding five new report tabs: Profit & Loss, Financial Position, Cash & Bank, Payables Aging, and Inventory & Production. `src/api/admin.js` gained 6 new API functions to back these. This turns Reports from a small set of listings into a real financial-reporting surface, aligned with the app's Financial Dimensions/Financial Control terminology.

---

## ve914c2c9 — Reorder Product form for FG-/RM- code split, lock Kind after creation — 2026-08-28 07:23 (+03:00)

**Version ID**: `e914c2c9ddaa25c3b04cdc0e7212591ec797d274` (short: `e914c2c9`)
**How to get this version**: `git checkout e914c2c9ddaa25c3b04cdc0e7212591ec797d274` (read-only) or `git show e914c2c9ddaa25c3b04cdc0e7212591ec797d274` (view the diff)

**AS-IS (before):** In `src/pages/products/ProductsList.jsx`, the Product create/edit form had `Kind` (Finished Good vs. Raw Material) positioned after the code preview, even though the product code prefix (`FG-`/`RM-`) depends on it. `Kind` remained editable after a product existed.
**TO-BE (after):** Modified `src/pages/products/ProductsList.jsx` (+20/-15). Reordered the form so `Kind` is chosen before the code preview. `Kind` is now locked/disabled once a product exists (editable only at creation) to prevent a code-prefix mismatch after the fact.

---

## v86c669a5 — Collapse sale item picker back to one line, fix qty/UOM layout glitch — 2026-08-28 00:57 (+03:00)

**Version ID**: `86c669a5b61d3b8ef7a5795df5ffc198f1bdac7a` (short: `86c669a5`)
**How to get this version**: `git checkout 86c669a5b61d3b8ef7a5795df5ffc198f1bdac7a` (read-only) or `git show 86c669a5b61d3b8ef7a5795df5ffc198f1bdac7a` (view the diff)

**AS-IS (before):** Following the previous two commits' item-search work, the sale-item row in `src/pages/sales-orders/SalesOrdersList.jsx` had a quantity/UOM alignment glitch after the item picker was widened onto a wrapped/multi-line layout.
**TO-BE (after):** `src/pages/sales-orders/SalesOrdersList.jsx` (-12 net lines). UI-only rollback/fix: collapses the item picker back onto a single line and corrects the quantity/UOM layout.

---

## v2b525134 — Move Sales Responsible above Notes, add item search + UOM to sale items — 2026-08-28 00:51 (+03:00)

**Version ID**: `2b52513418b0d94cec72749e1d4cf3c8ac516150` (short: `2b525134`)
**How to get this version**: `git checkout 2b52513418b0d94cec72749e1d4cf3c8ac516150` (read-only) or `git show 2b52513418b0d94cec72749e1d4cf3c8ac516150` (view the diff)

**AS-IS (before):** In the New Sales Order form (`src/pages/sales-orders/SalesOrdersList.jsx`), "Sales Responsible" sat below the Notes field, and each sale line item had only a plain dropdown for picking a product, with no visible UOM (unit of measure) label.
**TO-BE (after):** `src/pages/sales-orders/SalesOrdersList.jsx` (+52/-26). Reordered the form to put "Sales Responsible" above Notes, and added a searchable item picker plus a visible UOM label to each sale line item, so the operator can find a product by typing instead of scrolling a plain dropdown.

---

## vcdbbad94 — Add Sales Responsible field to Sales Orders and Employee link to Team — 2026-08-28 00:36 (+03:00)

**Version ID**: `cdbbad9441e6f8b92797381b919a7efe58f2c6da` (short: `cdbbad94`)
**How to get this version**: `git checkout cdbbad9441e6f8b92797381b919a7efe58f2c6da` (read-only) or `git show cdbbad9441e6f8b92797381b919a7efe58f2c6da` (view the diff)

**AS-IS (before):** Sales Orders had no field attributing a sale to a staff member, and Team (login accounts) had no link/reference to the matching Employee record — Team and HR/Workforce (Employees) were unconnected data models.
**TO-BE (after):** `src/pages/sales-orders/SalesOrdersList.jsx` (+34/-4) and `src/pages/team/TeamList.jsx` (+34/-6). Sales Orders gained a "Sales Responsible" field; Team gained a link/reference to the matching Employee record, connecting the two data models.

---

## v02fa6a4d — Add mandatory Incharge field to Retail Stores — 2026-08-28 00:17 (+03:00)

**Version ID**: `02fa6a4d03d5e1838f8492aa5d47645d0f7f3410` (short: `02fa6a4d`)
**How to get this version**: `git checkout 02fa6a4d03d5e1838f8492aa5d47645d0f7f3410` (read-only) or `git show 02fa6a4d03d5e1838f8492aa5d47645d0f7f3410` (view the diff)

**AS-IS (before):** The Store create/edit form and list in `src/pages/stores/StoresList.jsx` had no field for the staff member responsible for a retail store.
**TO-BE (after):** `src/pages/stores/StoresList.jsx` (+39/-4). Added a required "Incharge" field to the Store create/edit form and list.

---

## v13bce320 — Redesign nav as two-panel Main Module -> Submodule flyout, remove Favorites — 2026-08-27 23:55 (+03:00)

**Version ID**: `13bce3204b30c562709ff2d5787201110702afff` (short: `13bce320`)
**How to get this version**: `git checkout 13bce3204b30c562709ff2d5787201110702afff` (read-only) or `git show 13bce3204b30c562709ff2d5787201110702afff` (view the diff)

**AS-IS (before):** The sidebar was a single-column collapsible tree (Main Module → Submodule expanding in place), with no separate `selectedModuleKey`/`panelOpen` state split, no grouped submodule sections, and no dedicated nav-accent tokens (nav color inherited the general theme accent). The Favorites feature (added just the previous commit) existed as a header dropdown.
**TO-BE (after):** Major sidebar rework (804 insertions / 614 deletions across `src/layout/`). Replaces the single-column collapsible tree sidebar with the current **two-panel ERP-style flyout**: a narrow rail (`Sidebar.jsx`, Main Modules only) plus a new `SubmodulePanel.jsx`/`SubmodulePanel.css` component that opens as a floating panel beside it. Adds `selectedModuleKey` (derived from URL) vs. `panelOpen` (in-memory only) as separate state, "last visited child per module" persistence in `sidebarState.js`, and grouped submodule sections via a `group` field in `navConfig.js`. The entire **Favorites** feature (`favoritesState.js`, `Header.jsx`'s `FavoritesMenu`) is removed per owner instruction — back to Pin-only. `theme.css` gains dedicated `--bp-nav-accent`/`--bp-nav-accent-text`/`--bp-nav-accent-soft` tokens so the nav stays warm amber/gold independent of each theme's general accent color.

---

## vc5c1edb5 — Replace Standard + System theme palette with owner-supplied iOS-style tokens — 2026-08-27 23:31 (+03:00)

**Version ID**: `c5c1edb559f78f166e4574e21b0053aea80189a7` (short: `c5c1edb5`)
**How to get this version**: `git checkout c5c1edb559f78f166e4574e21b0053aea80189a7` (read-only) or `git show c5c1edb559f78f166e4574e21b0053aea80189a7` (view the diff)

**AS-IS (before):** In Standard mode, the "System" theme used the prior palette rather than a genuine OS-follow implementation, and dark mode there leaned slate-blue rather than pure black, with non-bold nav text.
**TO-BE (after):** `src/theme/theme.css` (+86/-30). Replaced the Standard-mode "System" theme with a flat "Liquid Glass Design System (iOS-inspired)" palette supplied directly by the owner — white/light-gray surfaces, iOS blue (`#0a84ff`) accent. Makes System the one Standard theme that genuinely follows the OS's light/dark preference via `prefers-color-scheme`, with a deliberate pure-black (not slate-blue) dark branch and bold white nav text.

---

## v9da8bb04 — Reorder sidebar modules, rename HR to Workforce, fix accordion expand bug — 2026-08-27 23:17 (+03:00)

**Version ID**: `9da8bb0412512c3a39d49028998cc9d60733c0be` (short: `9da8bb04`)
**How to get this version**: `git checkout 9da8bb0412512c3a39d49028998cc9d60733c0be` (read-only) or `git show 9da8bb0412512c3a39d49028998cc9d60733c0be` (view the diff)

**AS-IS (before):** Top-level sidebar modules were ordered alphabetically/by insertion order rather than by business priority, the HR module was labeled "HR", and an already-expanded sidebar accordion module wouldn't collapse correctly on re-click.
**TO-BE (after):** `src/layout/navConfig.js` (+70/-44 net) and `src/layout/Sidebar.jsx` (+40 lines net). Set the top-level module order to the owner-chosen business-priority sequence (Dashboard, Finance, Sales, Production, Inventory, Purchasing, Products, Partners & Shops, Workforce, WhatsApp Orders, Reports, Settings). Renamed the "HR" nav label to "Workforce" (label-only — routes/files unchanged). Fixed the accordion re-click collapse bug.

---

## vb5326176 — Add favorites (header dropdown), fix module re-click toggle, premium chevron — 2026-08-27 23:01 (+03:00)

**Version ID**: `b532617648d73135514da670e8c3941e1519b213` (short: `b5326176`)
**How to get this version**: `git checkout b532617648d73135514da670e8c3941e1519b213` (read-only) or `git show b532617648d73135514da670e8c3941e1519b213` (view the diff)

**AS-IS (before):** There was no per-page favorites system, re-clicking an already-open sidebar module wouldn't toggle it closed, and the expand/collapse chevron used the plain original styling.
**TO-BE (after):** New `src/layout/favoritesState.js` (41 lines) plus changes to `Header.jsx`/`Header.css` (+82 lines of CSS) and `Sidebar.jsx`/`Sidebar.css`. Added a per-page ★ favorites system with a header dropdown menu, fixed the module re-click toggle bug, and restyled the expand/collapse chevron. Note: this entire Favorites feature was removed again two commits later (`13bce320`) per explicit owner instruction in favor of Pin-only.

---

## v5814a967 — Add "Business" as a 4th Standard-mode theme (white sidebar, blue accent) — 2026-08-27 22:51 (+03:00)

**Version ID**: `5814a967abdcb6f630e5a7485f2d5820be167125` (short: `5814a967`)
**How to get this version**: `git checkout 5814a967abdcb6f630e5a7485f2d5820be167125` (read-only) or `git show 5814a967abdcb6f630e5a7485f2d5820be167125` (view the diff)

**AS-IS (before):** Standard mode had only 3 themes (System, Light, Dark) — no "Business" `data-theme` value existed.
**TO-BE (after):** `src/theme/theme.css` (+58 lines), `ProfilePage.jsx`, and `ThemeContext.jsx`. Added a 4th `data-theme` value, "Business," modeled on a reference screenshot: white/untinted sidebar, single indigo/blue accent (`--bp-standard-accent: #4f6bed`), fully rounded pill-shaped status badges, light gray-blue page background. Deliberately Standard-mode-only — `ProfilePage.jsx`'s theme picker only shows the swatch while Mode=Standard, and switching Mode away from Standard auto-reverts a chosen "business" theme back to "system."

---

## vabbaba2b — Restructure sidebar into collapsible Main Module -> Submodule tree; add Financial Year (Calendar) — 2026-08-27 22:43 (+03:00)

**Version ID**: `abbaba2b76970d2e3ffd9c734bae48eac6c6b6b5` (short: `abbaba2b`)
**How to get this version**: `git checkout abbaba2b76970d2e3ffd9c734bae48eac6c6b6b5` (read-only) or `git show abbaba2b76970d2e3ffd9c734bae48eac6c6b6b5` (view the diff)

**AS-IS (before):** The sidebar was a flat list (`NAV_ITEMS` had no `children` tree structure), sidebar prefs lived in `sidebarPrefs.js`, there was no Financial Year/Calendar page or `financialYear.js` helper, and several sections that later moved into the module tree still lived directly in `SettingsPage.jsx`.
**TO-BE (after):** Restructured the sidebar from a flat list into a collapsible Main Module → Submodule tree (`src/layout/Sidebar.jsx` +202/-net, `Sidebar.css` +127, `navConfig.js` +131/-net — `NAV_ITEMS` becomes a real tree with `children`). Removed `sidebarPrefs.js` (79 lines) in favor of a new `src/layout/sidebarState.js` (42 lines). New `src/pages/calendar/CalendarPage.jsx` (60 lines, route `/calendar`) — sidebar-labeled "Financial Year" — plus a new `src/utils/financialYear.js` (26 lines) helper. `SettingsPage.jsx` shrank sharply (-164 lines net) as several of its sections were absorbed into the new module tree. This single-column expand-in-place tree was itself replaced one round later by the two-panel flyout sidebar (`13bce320`).

---

## v29a1dd18 — Gray out Selling price/% for raw materials on the Product form — 2026-08-27 22:18 (+03:00)

**Version ID**: `29a1dd186228739de053277254d5f0d3241c5e56` (short: `29a1dd18`)
**How to get this version**: `git checkout 29a1dd186228739de053277254d5f0d3241c5e56` (read-only) or `git show 29a1dd186228739de053277254d5f0d3241c5e56` (view the diff)

**AS-IS (before):** In `src/pages/products/ProductsList.jsx`'s `ProductModal`, Selling price and Selling % remained enabled/required regardless of Kind, so a Raw material could be created with stale or leftover Selling values.
**TO-BE (after):** `src/pages/products/ProductsList.jsx` (+23/-4). `ProductModal` now computes `isRawMaterial = itemKind === "raw_material"` and disables (and un-requires) the Selling price and Selling % inputs whenever true, matching a corresponding backend conditional-validation change. Switching Kind to Raw material on an open create form also clears both fields to `""` so a leftover value from before the switch is never silently submitted.

---

## v37b27e32 — Improve BOM raw-material picker, rename BOM code label to BOM ID, add search to Number Sequences — 2026-08-27 21:53 (+03:00)

**Version ID**: `37b27e324591025d7b8bf7ddf32080f7040818b4` (short: `37b27e32`)
**How to get this version**: `git checkout 37b27e324591025d7b8bf7ddf32080f7040818b4` (read-only) or `git show 37b27e324591025d7b8bf7ddf32080f7040818b4` (view the diff)

**AS-IS (before):** `BomModal`'s raw-material line picker option label was just a bare product name, with no UOM shown next to the quantity input. The `bom_code` field's user-facing label read "BOM code" (the underlying field/variable was already `bom_code`). Number Sequences page had no search.
**TO-BE (after):** `src/pages/products/ProductsList.jsx` and `src/pages/settings/NumberSequencesPage.jsx`. `BomModal`'s raw-material line picker option label changed to `{product_code} — {name} (Raw material)` for clarity, with each line now showing that material's UOM next to the quantity input. The `bom_code` field's user-facing label was renamed to "BOM ID" (code/variable name unchanged). Number Sequences page gained search (`useDataTable`/`SearchByBar`).

---

## v92ecd570 — Wire SearchByBar to server-side search on 9 list pages — 2026-08-27 21:05 (+03:00)

**Version ID**: `92ecd570796d8a5ec59f15e45e3ee60788f0c332` (short: `92ecd570`)
**How to get this version**: `git checkout 92ecd570796d8a5ec59f15e45e3ee60788f0c332` (read-only) or `git show 92ecd570796d8a5ec59f15e45e3ee60788f0c332` (view the diff)

**AS-IS (before):** `SearchByBar` only filtered already-loaded rows client-side, with no `onServerSearch`/`serverColumn`/`serverValue` props — so a search missed matches sitting on page 2+ of a paginated list on Cash Book, Inventory, Inventory Transactions, Partners, Production Runs, Products, Purchase Orders, Sales Orders, and WhatsApp Orders. Backend routes had no `qField` param alongside `q`.
**TO-BE (after):** `src/components/DataTable.jsx` (+45/-11) gained an optional server mode for `SearchByBar` (`onServerSearch`, `serverColumn`, `serverValue` props) so a search hits the backend instead of only filtering already-loaded rows. Wired into 9 pages: Cash Book, Inventory, Inventory Transactions, Partners, Production Runs, Products, Purchase Orders, Sales Orders, WhatsApp Orders. Backend routes gained a matching `qField` param alongside `q`.

---

## v08e9c325 — Bump list page size from 20/25/30 to 100 — 2026-08-27 20:39 (+03:00)

**Version ID**: `08e9c3254db7c821b9071ae636dd9f4bf999d974` (short: `08e9c325`)
**How to get this version**: `git checkout 08e9c3254db7c821b9071ae636dd9f4bf999d974` (read-only) or `git show 08e9c3254db7c821b9071ae636dd9f4bf999d974` (view the diff)

**AS-IS (before):** Pagination defaulted to 20/25/30 rows per page across 11 list pages (Cash Book, Inventory, Inventory Transactions, Partners, Production Runs, Products, Purchase Orders, Reports, Sales Orders, Activity Log, WhatsApp Orders), which made the client-side-search-misses-page-2 problem more likely to bite.
**TO-BE (after):** One-line page-size change across those 11 list pages — pagination default raised from 20/25/30 rows to 100, incidentally reducing (though not structurally fixing) the client-side-search-misses-page-2 problem addressed properly by the next-but-one commit.

---

## va2abbe08 — Bidirectional Selling %/price sync, remove Owning partner from Product form — 2026-08-27 20:21 (+03:00)

**Version ID**: `a2abbe081510a875bd3d2d992ccf7af70f9f34aa` (short: `a2abbe08`)
**How to get this version**: `git checkout a2abbe081510a875bd3d2d992ccf7af70f9f34aa` (read-only) or `git show a2abbe081510a875bd3d2d992ccf7af70f9f34aa` (view the diff)

**AS-IS (before):** The "Selling %" markup field only synced one direction (percentage → price) and started blank on edit instead of initializing from existing prices. The Product form had an "Owning partner" select (Products was not yet Bismi-only in the form), and submit bodies sent `owning_partner_id`.
**TO-BE (after):** `src/pages/products/ProductsList.jsx` (+35/-23). Made "Selling %" sync in both directions: typing a percentage recomputes Selling price (`applyMarkup`), and typing Selling price directly recomputes the percentage (`applySellingPrice`). On edit, the field now initializes from the product's existing prices instead of starting blank. Removed the "Owning partner" select entirely (Products is Bismi-only), replaced with a read-only "Owner: Bismi" display; `owning_partner_id` is no longer sent by this form's submit body.

---

## vb2210f71 — Add Selling % markup field and one-step Add Partner Product flow — 2026-08-27 19:59 (+03:00)

**Version ID**: `b2210f71ad7b2dff7afd6f80aa955fb20c39f997` (short: `b2210f71`)
**How to get this version**: `git checkout b2210f71ad7b2dff7afd6f80aa955fb20c39f997` (read-only) or `git show b2210f71ad7b2dff7afd6f80aa955fb20c39f997` (view the diff)

**AS-IS (before):** The Product form had no "Selling %" convenience field. Creating a supplying partner's own product required navigating to the main Products screen and manually setting `owning_partner_id` — there was no in-context "add product" flow from a partner's Stock modal.
**TO-BE (after):** `src/pages/products/ProductsList.jsx` (+24) and `src/pages/partners/PartnersList.jsx` (+78). Added a "Selling %" convenience field to the Product form (computed client-side from Cost/Selling price). Added a "+ Add product" button to a supplying partner's Stock modal (`PartnerStockModal`/new `AddPartnerProductForm`) letting the operator create that partner's product (Name + Selling price only) in one step.

---

## v16dc60d1 — Redesign Change Management tab to global per-field locks — 2026-08-27 17:40 (+03:00)

**Version ID**: `16dc60d1c309fa31822d231aef0a9ff83fb0fa5d` (short: `16dc60d1`)
**How to get this version**: `git checkout 16dc60d1c309fa31822d231aef0a9ff83fb0fa5d` (read-only) or `git show 16dc60d1c309fa31822d231aef0a9ff83fb0fa5d` (view the diff)

**AS-IS (before):** The Change Management feature (added the previous commit) locked per-record, not per-field, and had no `changeManagementApi`/`GET /change-management`/`PUT /change-management/:fieldKey` backing.
**TO-BE (after):** `src/pages/products/ProductsList.jsx` (+75/-116 net, i.e. a net simplification) and `src/api/admin.js`. Redesigned Change Management from per-record locking to **global-per-field** locking, after the owner clarified the actual requirement mid-round. Now lists 8 lockable fields (Name, Cost price, Selling price, UOM, Kind, Low stock alert threshold, Owning partner, BOM recipe), each with its own Locked/Unlocked badge, backed by `changeManagementApi` (`GET /change-management`, `PUT /change-management/:fieldKey`). Locking a field blocks editing it across every product/BOM at once.

---

## va841b347 — Add Change Management tab (owner-only lock); require cost/selling price — 2026-08-27 17:19 (+03:00)

**Version ID**: `a841b3473d4dc534409e0f3f205a8620fe7e19a3` (short: `a841b347`)
**How to get this version**: `git checkout a841b3473d4dc534409e0f3f205a8620fe7e19a3` (read-only) or `git show a841b3473d4dc534409e0f3f205a8620fe7e19a3` (view the diff)

**AS-IS (before):** No Change Management tab existed on Products. Cost price and Selling price were optional fields on the Product form.
**TO-BE (after):** `src/pages/products/ProductsList.jsx` (+199/-17). First version of the Change Management tab (later redesigned — see `16dc60d1`), an owner-only lock mechanism on Products, plus made Cost price and Selling price **required** fields on the Product form, matching a corresponding backend validation change.

---

## v7389ba06 — Add Last Prod hrs / Mark all buttons, switch stage hours to HH:MM entry — 2026-08-27 17:07 (+03:00)

**Version ID**: `7389ba062fe4bd67fd8caf381f8547240bc8597d` (short: `7389ba06`)
**How to get this version**: `git checkout 7389ba062fe4bd67fd8caf381f8547240bc8597d` (read-only) or `git show 7389ba062fe4bd67fd8caf381f8547240bc8597d` (view the diff)

**AS-IS (before):** Stage hours were entered as a single decimal input (still stored/costed as decimal hours downstream), and there was no "Last Prod hrs" prefill or "Mark all" button on Production Runs.
**TO-BE (after):** `src/pages/production/ProductionRunsList.jsx` (+122 net lines). Stage hours are now entered as separate Hours/Minutes fields (`HoursInput`, `decimalToHm`/`hmToDecimal` helpers) instead of a single confusing decimal input (still stored/costed as decimal hours downstream). Added "Last Prod hrs" (prefills a stage's hours from that product's last completed run, only when the worker matches) and "Mark all" (owner-only, completes every remaining stage at once using currently-filled-in hours).

---

## v19e89a80 — Show BOM raw-material detail, default machine to Oven, require raw material, add cost preview before completing — 2026-08-27 16:18 (+03:00)

**Version ID**: `19e89a80a20e2d9e99f8f53a094a933fa89aed9c` (short: `19e89a80`)
**How to get this version**: `git checkout 19e89a80a20e2d9e99f8f53a094a933fa89aed9c` (read-only) or `git show 19e89a80a20e2d9e99f8f53a094a933fa89aed9c` (view the diff)

**AS-IS (before):** `NewRunModal`'s BOM select showed no detail table for the selected BOM's lines. `machineId` had no default. A run could be created with neither a BOM nor manually specified raw materials. `CompleteRunModal` had no cost-preview endpoint or breakdown before completion.
**TO-BE (after):** `src/pages/production/ProductionRunsList.jsx` (+167/-13). `NewRunModal`'s BOM select now shows a read-only detail table (item code/raw material/category/qty) for the selected BOM's lines. `machineId` now defaults to whichever machine's name matches `/oven/i`. A run can no longer be created with neither a BOM nor manually specified raw materials — a required "Raw materials consumed" line-item picker appears when no BOM is selected. `CompleteRunModal` now calls a new `GET /production-runs/:id/cost-preview` endpoint and renders the full material/labour/overhead cost breakdown live, before the operator commits the run.

---

## v0e519cc7 — Simplify Cost Parameters: clearer table, split rate vs. metadata editing — 2026-08-27 15:27 (+03:00)

**Version ID**: `0e519cc71b5775dbee5f154c1b897bb5e3ec9d1e` (short: `0e519cc7`)
**How to get this version**: `git checkout 0e519cc71b5775dbee5f154c1b897bb5e3ec9d1e` (read-only) or `git show 0e519cc71b5775dbee5f154c1b897bb5e3ec9d1e` (view the diff)

**AS-IS (before):** `CostParametersList.jsx` used a different layout not matching the nammahearth sibling app's reference, labeled the rate-type field "Rate type", and had a single combined Add/Edit modal covering both rate value and metadata (name/category/unit/notes) together.
**TO-BE (after):** `src/pages/production/CostParametersList.jsx` (+156/-142, near-total rewrite of the page). Redesigned to a plain fixed-column table (Parameter/Rate/Unit/Basis/Active/Last updated/Updated by), matching a reference layout from the sibling nammahearth app. "Rate type" relabeled "Basis". Split the Add/Edit modal into a quick **Edit rate** action (value + effective date only) versus the full **Edit** (name/category/unit/notes), so editing metadata never touches price history.

---

## v30c97763 — Show BOM code in the BOM form, list, and Production Run picker — 2026-08-27 15:13 (+03:00)

**Version ID**: `30c97763534e47d965b8867378ad1121c1dc0759` (short: `30c97763`)
**How to get this version**: `git checkout 30c97763534e47d965b8867378ad1121c1dc0759` (read-only) or `git show 30c97763534e47d965b8867378ad1121c1dc0759` (view the diff)

**AS-IS (before):** The BOM form/list had no visible sequential `bom_code`, and the Production Run wizard's BOM dropdown options showed no code prefix.
**TO-BE (after):** `src/pages/products/ProductsList.jsx` (+14/-3 net) and `src/pages/production/ProductionRunsList.jsx`. Added the sequential `bom_code` (e.g. `BOM-00001`) display via the standard `CodeField` component on the BOM form/list, and prefixed each option in the Production Run wizard's BOM dropdown with its code.

---

## v87b7e084 — New Production Run: 3-step wizard (Setup / Details / Review) — 2026-08-27 12:43 (+03:00)

**Version ID**: `87b7e084a620038960fc202e4b405bb8139e442e` (short: `87b7e084`)
**How to get this version**: `git checkout 87b7e084a620038960fc202e4b405bb8139e442e` (read-only) or `git show 87b7e084a620038960fc202e4b405bb8139e442e` (view the diff)

**AS-IS (before):** `NewRunModal` was a single, undivided form covering Machine, Run date, Product, Planned quantity, Location, BOM, worker assignment, and Notes all at once, with no step indicator or per-step validation.
**TO-BE (after):** `src/pages/production/ProductionRunsList.jsx` (+160/-75). Restructured `NewRunModal` into a 3-step wizard with a non-clickable step indicator: **Setup** (Machine, Run date, Product, Planned quantity, Location), **Details** (BOM, Default worker + per-stage overrides, Notes), **Review** (read-only summary plus stage-worker table). Each step validates its own required fields before Next advances. The underlying `POST /production-runs` payload is unchanged — pure UI/flow restructure.

---

## v83e8f1f8 — Wide production run view, Planned/Actual quantity split — 2026-08-27 09:50 (+03:00)

**Version ID**: `83e8f1f87560b590c6c33d608d0304aa3f23d138` (short: `83e8f1f8`)
**How to get this version**: `git checkout 83e8f1f87560b590c6c33d608d0304aa3f23d138` (read-only) or `git show 83e8f1f87560b590c6c33d608d0304aa3f23d138` (view the diff)

**AS-IS (before):** `Modal.jsx` had no `size="lg"` variant. `NewRunModal`'s quantity field was labeled plain "Quantity"; `CompleteRunModal` had no "Actual quantity produced" field, and the run detail/list showed only a single quantity with no Planned-vs-Actual comparison or cost-per-unit.
**TO-BE (after):** `src/components/Modal.jsx`/`Modal.css` gained a new `size="lg"` prop (`.bp-modal-lg`, `max-width: 760px`, purely additive — every other modal in the app omits it and is unaffected). `ProductionRunsList.jsx` (+72/-28): `NewRunModal`'s quantity field relabeled "Planned quantity"; `CompleteRunModal` gained a required "Actual quantity produced" field (prefilled from planned, editable, sent as `actual_quantity`). The run detail/list now show Planned vs. Actual (list shows "Planned → Actual" only once completed and only when they differ) plus cost-per-unit.

---

## vd536037f — Production stage sequencing UI, batch cost breakdown, mandatory Position — 2026-08-27 07:49 (+03:00)

**Version ID**: `d536037f979397e84f7018821168cc00d8aada3d` (short: `d536037f`)
**How to get this version**: `git checkout d536037f979397e84f7018821168cc00d8aada3d` (read-only) or `git show d536037f979397e84f7018821168cc00d8aada3d` (view the diff)

**AS-IS (before):** Production stages had no sequencing enforcement, `NewRunModal`'s Default worker was optional, `RunDetailModal`'s stage table had no Hours input, completing a run fired a bare status update with no cost-parameter selection, `CostParametersList.jsx` had no "Default consumption" field or Active/Deactivate toggle, and `EmployeesList.jsx`'s Position field was optional.
**TO-BE (after):** `src/pages/production/ProductionRunsList.jsx` (+312 lines, the largest single-page change to date). Production stages are now sequenced: `NewRunModal`'s Default worker is required; `RunDetailModal`'s stage table gained an Hours input per row; marking a stage complete requires a worker and hours and is blocked until earlier stages are done. The run-level "Complete" button only enables once all 3 stages are done, opening a new `CompleteRunModal` that lets the operator check off applicable Cost Parameters (with editable quantities) instead of firing a bare status update — server computes material/labour cost automatically. `CostParametersList.jsx` (+46) gained a "Default consumption" field and Active/Deactivate toggle. `EmployeesList.jsx`'s Position field became required.

---

## v25c3772c — Add Partner Products, Partner Inventory, and Partner Sales UI — 2026-08-27 07:11 (+03:00)

**Version ID**: `25c3772cc75088710568460199c174347177d998` (short: `25c3772c`)
**How to get this version**: `git checkout 25c3772cc75088710568460199c174347177d998` (read-only) or `git show 25c3772cc75088710568460199c174347177d998` (view the diff)

**AS-IS (before):** There was no `supplying_partner`-specific UI: no "Owning partner" dropdown on the Product modal, no partner-type badge, no Stock button/modal on Partners, and no per-owner lock on the Sales Order product picker. Cash Book had no "Partner Payable" entry-type badge.
**TO-BE (after):** `src/pages/partners/PartnersList.jsx` (+209 net lines), `src/pages/products/ProductsList.jsx` (+36), `src/pages/sales-orders/SalesOrdersList.jsx` (+27). Adds the `supplying_partner`-specific UI: an "Owning partner" dropdown on the Product modal, a `.bp-partner-type-badge` in the list, a "Stock" button on Partners opening `PartnerStockModal` (partner-scoped stock + "+ Receive stock"), and a lock in `SalesOrdersList.jsx`'s `NewSoModal` restricting the product picker to one owner (Bismi or a single partner) per order once any line has a product. `CashBookList.jsx` gained the "Partner Payable" entry type badge for commission-based partner settlements.

---

## vbbbbda92 — BOM approval workflow UI + icon-only delete — 2026-08-26 23:56 (+03:00)

**Version ID**: `bbbbda925619004944500f4814e8477d815d4711` (short: `bbbbda92`)
**How to get this version**: `git checkout bbbbda925619004944500f4814e8477d815d4711` (read-only) or `git show bbbbda925619004944500f4814e8477d815d4711` (view the diff)

**AS-IS (before):** The BOM tab had no Draft/Approved status badge or Approve button, and delete was a plain text button available without the owner-only/draft-only restriction.
**TO-BE (after):** `src/pages/products/ProductsList.jsx` (+44/-12). Added a Draft/Approved status badge and "Approve" button (gated by `products.manage`+`full_control`) to the BOM tab. Delete became icon-only (🗑, with `title`/`aria-label`), restricted to `admin.role === "owner"` on draft BOMs only — an approved BOM can only be deactivated, never deleted.

---

## v75431a24 — Add UOM and BOM tabs to Products page — 2026-08-26 23:42 (+03:00)

**Version ID**: `75431a24ba4dd151527ab880f2ce69134c4b8fd4` (short: `75431a24`)
**How to get this version**: `git checkout 75431a24ba4dd151527ab880f2ce69134c4b8fd4` (read-only) or `git show 75431a24ba4dd151527ab880f2ce69134c4b8fd4` (view the diff)

**AS-IS (before):** The Product modal's unit dropdown was hardcoded to Each/Kg, with no owner-editable UOM list. Products had no BOM (recipe) concept, and `NewRunModal` had no way to select a BOM or auto-deduct raw materials.
**TO-BE (after):** `src/pages/products/ProductsList.jsx` (+462 lines — near tripling of the file). Added two new tabs: **UOM** (`UomTab` — a "manage a small list" pattern for units feeding the Product modal's unit dropdown, replacing the hardcoded Each/Kg) and **BOM** (`BomTab`/`BomModal` — recipes: finished good, output quantity, one or more raw-material lines). `ProductionRunsList.jsx`'s `NewRunModal` (+26) loads that product's approved BOMs and shows an optional BOM dropdown; picking one deducts those raw materials from stock on completion.

---

## v745f2202 — Standardize all dates to DD-MM-YYYY display format — 2026-08-26 23:21 (+03:00)

**Version ID**: `745f22022f00d2efc6eeb33b7c194f26ed82e138` (short: `745f2202`)
**How to get this version**: `git checkout 745f22022f00d2efc6eeb33b7c194f26ed82e138` (read-only) or `git show 745f22022f00d2efc6eeb33b7c194f26ed82e138` (view the diff)

**AS-IS (before):** There was no shared date-formatting utility; dates across 18 list pages (Bank Accounts, Cash Book, Customers, Financial Control's Reconciliation tab, Global Search, Inventory Transactions, Stock Transfers, Machines, Partners, Cost Parameters, Production Runs, Products, Purchase Orders, Reports, Sales Orders, Activity Log, Vendors, WhatsApp Orders) rendered in ad hoc/locale-default formatting.
**TO-BE (after):** New `src/utils/date.js` (26 lines) — a shared date-formatting utility — adopted across those 18 list pages. Every date display in the app now renders consistently as `DD-MM-YYYY` instead of ad hoc/locale-default formatting.

---

## vac061b4b — Fix cramped Add Entry modal spacing — 2026-08-25 20:37 (+03:00)

**Version ID**: `ac061b4b1229c7a3268267cc1eb30f281da64f9b` (short: `ac061b4b`)
**How to get this version**: `git checkout ac061b4b1229c7a3268267cc1eb30f281da64f9b` (read-only) or `git show ac061b4b1229c7a3268267cc1eb30f281da64f9b` (view the diff)

**AS-IS (before):** The Add Entry modal in `src/pages/cashbook/CashBookList.jsx` had cramped CSS/spacing.
**TO-BE (after):** One-line CSS/spacing fix in `src/pages/cashbook/CashBookList.jsx` for the Add Entry modal's cramped layout.

---

## vd7cadd56 — Rename Cash & Bank to Banking, add Equity/Advance to Cash Book — 2026-08-25 20:30 (+03:00)

**Version ID**: `d7cadd569cfe1e355b27385f8982f9b3086d5ec4` (short: `d7cadd56`)
**How to get this version**: `git checkout d7cadd569cfe1e355b27385f8982f9b3086d5ec4` (read-only) or `git show d7cadd569cfe1e355b27385f8982f9b3086d5ec4` (view the diff)

**AS-IS (before):** The nav label read "Cash & Bank" (not "Banking"), and the Cash Book Add Entry form had no "Equity" or "Advance" entry types/categories.
**TO-BE (after):** `navConfig.js` renamed the "Cash & Bank" nav label to "Banking". `CashBookList.jsx` (+51/-13) added "Equity" and "Advance" as new manual entry types/categories available in the Add Entry form.

---

## v9d1ff2fd — Hide TransID by default, add Workflow approver assignment page — 2026-08-25 19:32 (+03:00)

**Version ID**: `9d1ff2fded4854943fac0087a4b48adfb3a889c8` (short: `9d1ff2fd`)
**How to get this version**: `git checkout 9d1ff2fded4854943fac0087a4b48adfb3a889c8` (read-only) or `git show 9d1ff2fded4854943fac0087a4b48adfb3a889c8` (view the diff)

**AS-IS (before):** There was no Workflow page for assigning approvers to named approval points. The TransID columns added in the previous commit were shown by default everywhere, with no `hiddenByDefault` opt-in.
**TO-BE (after):** New `src/pages/workflows/WorkflowsPage.jsx` (127 lines, `ownerOnly: true`) — lists every named approval point (Cash Book entry approval, Reconciliation approval) and lets the owner assign one approver per workflow from an active-admins dropdown. The TransID columns added in the previous commit were made `hiddenByDefault: true` everywhere (opt-in via column chooser) except Reconciliation's plain "Recent reconciliations" table, which has no column chooser at all.

---

## vb351c378 — Add universal TransID UI: Transaction Search + column everywhere — 2026-08-25 19:16 (+03:00)

**Version ID**: `b351c378d5dddc7455d3d7228c0a1dfd3b9203b4` (short: `b351c378`)
**How to get this version**: `git checkout b351c378d5dddc7455d3d7228c0a1dfd3b9203b4` (read-only) or `git show b351c378d5dddc7455d3d7228c0a1dfd3b9203b4` (view the diff)

**AS-IS (before):** There was no cross-module Transaction Search screen and no Inventory Transactions list page. No list page showed the universal `universal_trans_id` (`TRX-YYYYMMDD-NNNNNN`) or linked to a full transaction detail view.
**TO-BE (after):** New `src/pages/global-search/GlobalSearchPage.jsx` (225 lines) — the cross-module Transaction Search screen for the universal `universal_trans_id` every transactional row now carries. Also new `src/pages/inventory/InventoryTransactionsList.jsx` (196 lines). Adds a `.bp-trans-id-link` TransID column/link (`shared.css`) to Bank Accounts, Cash Book, Reconciliation, Partners, Production Runs, Purchase Orders, and Sales Orders, each linking to `/global-search?trans=<id>` for full transaction detail plus Related Transactions (source/parent, reversal pairs, transfer legs).

---

## v534824f9 — Move Bank Transactions into a Cash & Bank tab, drop standalone page — 2026-08-25 00:48 (+03:00)

**Version ID**: `534824f9f4daf8c824c6789982d6438cf2e75358` (short: `534824f9`)
**How to get this version**: `git checkout 534824f9f4daf8c824c6789982d6438cf2e75358` (read-only) or `git show 534824f9f4daf8c824c6789982d6438cf2e75358` (view the diff)

**AS-IS (before):** Bank Transactions was a standalone page (`src/pages/bank-transactions/BankTransactionsList.jsx`, 178 lines) with its own nav entry/route, separate from `BankAccountsList.jsx`.
**TO-BE (after):** Deleted `src/pages/bank-transactions/BankTransactionsList.jsx` (178 lines removed) — its content was folded into `BankAccountsList.jsx` (+170/-net) as a "Bank Transaction" tab, and the standalone nav entry/route were removed. Consolidates the Cash & Bank module from two separate pages into one tabbed page.

---

## v26564026 — Update docs for Cash & Bank rename, Bank Transactions, Cash Book split — 2026-08-25 00:37 (+03:00)

**Version ID**: `26564026d719659e5dfabe6fae8b5e7e0c8b93de` (short: `26564026`)
**How to get this version**: `git checkout 26564026d719659e5dfabe6fae8b5e7e0c8b93de` (read-only) or `git show 26564026d719659e5dfabe6fae8b5e7e0c8b93de` (view the diff)

**AS-IS (before):** `ADMIN-PORTAL-PLAN.md`, `CHANGELOG.md`, `CLAUDE.md`, and `TABLE-CONVENTIONS.md` did not yet describe the Cash & Bank rename, new Bank Transactions page, or the Cash Book manual/automatic split introduced in the previous day's `84d81754` commit.
**TO-BE (after):** Docs-only commit: updated `ADMIN-PORTAL-PLAN.md`, `CHANGELOG.md` (added the entry this rebuild has since replaced), `CLAUDE.md`, and `TABLE-CONVENTIONS.md` to describe the Cash & Bank rename, new Bank Transactions page, and the Cash Book manual/automatic split. No application code changed.

---

## v3e26fe95 — Fix production API base URL to api.trpbismipaniyan.com — 2026-08-25 00:27 (+03:00)

**Version ID**: `3e26fe95d185132dee637ad5edef927cda8c9bfe` (short: `3e26fe95`)
**How to get this version**: `git checkout 3e26fe95d185132dee637ad5edef927cda8c9bfe` (read-only) or `git show 3e26fe95d185132dee637ad5edef927cda8c9bfe` (view the diff)

**AS-IS (before):** `src/api/config.js` pointed at the wrong API domain (`api.bismipaniyan.com` instead of the actual `api.trpbismipaniyan.com`), which made every screen fail with "Could not reach the server" after the prior day's deploy.
**TO-BE (after):** One-line fix in `src/api/config.js` correcting the API base URL to `api.trpbismipaniyan.com`. **Production incident fix**, found and fixed same-day.

---

## v84d81754 — Rework Cash & Bank UI: Petty Cash model, Bank Transactions page, Cash Book manual-only — 2026-08-24 23:28 (+03:00)

**Version ID**: `84d81754b0864751aa5d644e2616c4fe211fb25c` (short: `84d81754`)
**How to get this version**: `git checkout 84d81754b0864751aa5d644e2616c4fe211fb25c` (read-only) or `git show 84d81754b0864751aa5d644e2616c4fe211fb25c` (view the diff)

**AS-IS (before):** `BankAccountsList.jsx` had no Petty Cash model; there was no standalone Bank Transactions page (deposits/withdrawals/transfers lived in a per-account `TransactionHistoryTab.jsx`, 162 lines). Cash Book showed both manual and automatic rows together. `ReconciliationTab.jsx` did not reconcile one account at a time.
**TO-BE (after):** `BankAccountsList.jsx` rewritten around a Petty Cash model (206 net lines changed). New `src/pages/bank-transactions/BankTransactionsList.jsx` (178 lines) — a standalone deposit/withdrawal/transfer ledger across every account (later folded back into a tab by `534824f9`). `TransactionHistoryTab.jsx` (162 lines) was deleted, superseded by the new page. `CashBookList.jsx` split so Cash Book shows only manually-entered rows. `ReconciliationTab.jsx` reworked to reconcile one account at a time.

---

## v385c8e4c — Add Financial Account field to Cash Book, bank txn reverse, balances view — 2026-08-24 21:46 (+03:00)

**Version ID**: `385c8e4c5f47dbe8a1e3ff49f1ecd342cacff116` (short: `385c8e4c`)
**How to get this version**: `git checkout 385c8e4c5f47dbe8a1e3ff49f1ecd342cacff116` (read-only) or `git show 385c8e4c5f47dbe8a1e3ff49f1ecd342cacff116` (view the diff)

**AS-IS (before):** Cash Book entries had no Financial Account field, `BankAccountsList.jsx` had no reverse action for bank transactions, and `FinancialControlPage.jsx` had no account balances overview.
**TO-BE (after):** `CashBookList.jsx` (+57/-32) gained a Financial Account field on entries. `BankAccountsList.jsx` (+38) added a reverse action for bank transactions. `FinancialControlPage.jsx` (+49) added an account balances overview.

---

## v8e3df5dc — Show customer name/phone/address on WhatsApp Orders — 2026-08-23 18:50 (+03:00)

**Version ID**: `8e3df5dc03a5912e4c547040ae5e3f1809c89e71` (short: `8e3df5dc`)
**How to get this version**: `git checkout 8e3df5dc03a5912e4c547040ae5e3f1809c89e71` (read-only) or `git show 8e3df5dc03a5912e4c547040ae5e3f1809c89e71` (view the diff)

**AS-IS (before):** The WhatsApp Orders worklist in `src/pages/waorders/WaOrdersList.jsx` had no customer name, phone, or address columns/detail — staff had to cross-reference elsewhere to see who placed an order.
**TO-BE (after):** `src/pages/waorders/WaOrdersList.jsx` (+16/-2). Added customer name, phone, and address columns/detail to the WhatsApp Orders worklist.

---

## v500d1979 — Add Company Details tab to Settings (owner-only) — 2026-08-22 23:55 (+03:00)

**Version ID**: `500d19798d3efd7a5f3eb6d61c23a8e66cbd3a2e` (short: `500d1979`)
**How to get this version**: `git checkout 500d19798d3efd7a5f3eb6d61c23a8e66cbd3a2e` (read-only) or `git show 500d19798d3efd7a5f3eb6d61c23a8e66cbd3a2e` (view the diff)

**AS-IS (before):** Settings had no owner-only tab for editing company-level details (name, address, and similar fields).
**TO-BE (after):** New `src/pages/settings/CompanyDetailsTab.jsx` (164 lines), wired into `SettingsPage.jsx` (+36). Owner-only tab for editing company-level details consumed elsewhere in the app.

---

## vcb6ef5a7 — Add Sync button + inactive badge to Number Sequences; Customers active/inactive UI — 2026-08-22 23:22 (+03:00)

**Version ID**: `cb6ef5a71bf5b5def0a0b721fda673410b27c2bf` (short: `cb6ef5a7`)
**How to get this version**: `git checkout cb6ef5a71bf5b5def0a0b721fda673410b27c2bf` (read-only) or `git show cb6ef5a71bf5b5def0a0b721fda673410b27c2bf` (view the diff)

**AS-IS (before):** `NumberSequencesPage.jsx` had no "Sync" button (reconciling a counter's stored value against actual usage) or inactive-sequence badge. `CustomersList.jsx` had no active/inactive toggle UI.
**TO-BE (after):** `NumberSequencesPage.jsx` (+39/-4) added a "Sync" button and an inactive-sequence badge. `CustomersList.jsx` (+27/-4) added active/inactive toggle UI matching the pattern used elsewhere.

---

## v026ef68e — Add Reconciliation and Transaction History tabs to Financial Control — 2026-08-22 22:47 (+03:00)

**Version ID**: `026ef68eb0f110ed2460f3df99624be82f76a0de` (short: `026ef68e`)
**How to get this version**: `git checkout 026ef68eb0f110ed2460f3df99624be82f76a0de` (read-only) or `git show 026ef68eb0f110ed2460f3df99624be82f76a0de` (view the diff)

**AS-IS (before):** `FinancialControlPage.jsx` had no account reconciliation tab and no full transaction-history view.
**TO-BE (after):** New `src/pages/financial-control/ReconciliationTab.jsx` (291 lines) and `TransactionHistoryTab.jsx` (162 lines), wired into `FinancialControlPage.jsx`. Added account reconciliation and a full transaction-history view to the Financial Control module (the Transaction History tab was later removed in `84d81754`, superseded by the standalone Bank Transactions page).

---

## v010f2cac — Merge Inventory + Stock Transfers into tabs; inventory value; product code everywhere; date defaults; Products active toggle — 2026-08-22 22:18 (+03:00)

**Version ID**: `010f2cacf288eccb4097210309f25cdc4ff02022` (short: `010f2cac`)
**How to get this version**: `git checkout 010f2cacf288eccb4097210309f25cdc4ff02022` (read-only) or `git show 010f2cacf288eccb4097210309f25cdc4ff02022` (view the diff)

**AS-IS (before):** Inventory and Stock Transfers were separate nav entries/pages, with no computed inventory value display, inconsistent product-code visibility across inventory/production/purchasing screens, no sensible date-field defaults, and no active/inactive toggle on Products.
**TO-BE (after):** New `src/pages/inventory/InventoryPage.jsx` (43 lines) wraps `InventoryList.jsx` and `StockTransfersList.jsx` as tabs (Stock / Transfers), replacing separate nav entries with one tabbed page (`navConfig.js` -1 entry). Added a computed inventory value display, showed the product code consistently across inventory/production/purchasing screens, set sensible date-field defaults, and added an active/inactive toggle to Products.

---

## vc474ffc3 — Add Financial Dimensions tab, By-Dimension report, and Stock Transfers page — 2026-08-22 21:34 (+03:00)

**Version ID**: `c474ffc384661ef9ce15b9c9592803fcea56b13b` (short: `c474ffc3`)
**How to get this version**: `git checkout c474ffc384661ef9ce15b9c9592803fcea56b13b` (read-only) or `git show c474ffc384661ef9ce15b9c9592803fcea56b13b` (view the diff)

**AS-IS (before):** Financial Control had no Financial Dimensions master list, there was no standalone Stock Transfers page, and Reports had no report grouped/filterable by Financial Dimension.
**TO-BE (after):** New `src/pages/financial-control/FinancialDimensionsTab.jsx` (186 lines) — the Financial Dimensions master list, wired into `FinancialControlPage.jsx` (+96/-net). New `src/pages/inventory/StockTransfersList.jsx` (260 lines) — a standalone page for stock transfers between locations. `ReportsPage.jsx` (+109) added a report grouped/filterable by Financial Dimension.

---

## v5956de01 — Clamp column-filter popup to the viewport so the last column doesn't overflow off-screen — 2026-08-22 19:05 (+03:00)

**Version ID**: `5956de0107d5624a6d06f8989cf835fe920a7bb2` (short: `5956de01`)
**How to get this version**: `git checkout 5956de0107d5624a6d06f8989cf835fe920a7bb2` (read-only) or `git show 5956de0107d5624a6d06f8989cf835fe920a7bb2` (view the diff)

**AS-IS (before):** The Excel-style column-filter popup on the rightmost table column could render partially off-screen.
**TO-BE (after):** `src/components/DataTable.jsx` (+24/-2). Bug fix: clamps the popup's position to stay within the viewport.

---

## v81770bce — Fix column-filter popup rendering clipped/scroll-trapped on every table — 2026-08-22 18:59 (+03:00)

**Version ID**: `81770bce58a9410a566f065cf5ccdf8e34a61c2d` (short: `81770bce`)
**How to get this version**: `git checkout 81770bce58a9410a566f065cf5ccdf8e34a61c2d` (read-only) or `git show 81770bce58a9410a566f065cf5ccdf8e34a61c2d` (view the diff)

**AS-IS (before):** The column-filter popup was visually clipped or trapped inside a scrolling table container on every list page — likely a portal/positioning or `overflow` containment issue in the shared `DataTable` component used by all tables.
**TO-BE (after):** `src/components/DataTable.jsx` (+~40 net) and `shared.css`. Fixed the column-filter popup being visually clipped or trapped inside a scrolling table container, applied to the shared `DataTable` component used by all tables.

---

## v0fd6ec0e — Move Cash Book's category manager into a tab; document the pattern — 2026-08-22 18:48 (+03:00)

**Version ID**: `0fd6ec0eb17e8fed186f4ec5d32ff8c444df4256` (short: `0fd6ec0e`)
**How to get this version**: `git checkout 0fd6ec0eb17e8fed186f4ec5d32ff8c444df4256` (read-only) or `git show 0fd6ec0eb17e8fed186f4ec5d32ff8c444df4256` (view the diff)

**AS-IS (before):** "Manage categories" was a nested modal-inside-modal in `CashBookList.jsx`, a shape the owner had explicitly rejected as cramped. `CLAUDE.md` did not yet document a canonical pattern for this kind of feature.
**TO-BE (after):** `CashBookList.jsx` (+24/-26 net) moved "Manage categories" from a nested modal-inside-modal into a Categories tab alongside the page's other tabs. `CLAUDE.md` (+14) documents this as the canonical "manage a small list" pattern for future similar features (later also applied to HR's Positions).

---

## v808a1f69 — Merge Employees, Positions, Salary Payments into one HR page with tabs — 2026-08-22 18:28 (+03:00)

**Version ID**: `808a1f692436a9cba8109384bc27f7efc213380f` (short: `808a1f69`)
**How to get this version**: `git checkout 808a1f692436a9cba8109384bc27f7efc213380f` (read-only) or `git show 808a1f692436a9cba8109384bc27f7efc213380f` (view the diff)

**AS-IS (before):** Employees, Positions, and Salary Payments were 3 separate nav entries/routes/pages, with no single HR module wrapping them.
**TO-BE (after):** New `src/pages/hr/HRPage.jsx` (46 lines) wraps `EmployeesList`, `PositionsList`, and `SalaryPaymentsList` as tabs on one page, replacing 3 separate nav entries/routes with a single tabbed HR module (matching the "manage a small list" tab convention).

---

## va8d03626 — Give Positions its own full page instead of a cramped nested modal — 2026-08-22 18:08 (+03:00)

**Version ID**: `a8d03626173d20d1384e4491d7334c2ccc0820c8` (short: `a8d03626`)
**How to get this version**: `git checkout a8d03626173d20d1384e4491d7334c2ccc0820c8` (read-only) or `git show a8d03626173d20d1384e4491d7334c2ccc0820c8` (view the diff)

**AS-IS (before):** Positions management was a 178-line nested-modal-inside-modal inside `EmployeesList.jsx`, with no standalone page.
**TO-BE (after):** New `src/pages/hr/PositionsList.jsx` (190 lines); removed 178 lines of nested-modal Positions management from `EmployeesList.jsx`. First step of extracting the "manage a small list" pattern out of a cramped modal-inside-modal — this page was itself merged into HR's tab set one commit later (`808a1f69`).

---

## v8d889f4e — Add positions dropdown, factory code preview, Cash Book approve/reverse UI — 2026-08-22 17:39 (+03:00)

**Version ID**: `8d889f4e8194655ad271c57626ccedfaca258094` (short: `8d889f4e`)
**How to get this version**: `git checkout 8d889f4e8194655ad271c57626ccedfaca258094` (read-only) or `git show 8d889f4e8194655ad271c57626ccedfaca258094` (view the diff)

**AS-IS (before):** Cash Book had no Approve/Reverse actions or status UI for cash entries. `EmployeesList.jsx` had no Position dropdown or factory/auto-generated code preview.
**TO-BE (after):** `CashBookList.jsx` (+327/-116, a near-rewrite) added Approve/Reverse actions and status UI for cash entries. `EmployeesList.jsx` (+195) added a Position dropdown (sourced from the new small-list pattern) and a factory/auto-generated code preview via `CodeField`.

---

## v65d20008 — Add HR/Employees, production worker stages, Cost Parameters redesign, column chooser + audit columns everywhere — 2026-08-22 15:35 (+03:00)

**Version ID**: `65d200086882d1cfaa12731bc24f80515ae33696` (short: `65d20008`)
**How to get this version**: `git checkout 65d200086882d1cfaa12731bc24f80515ae33696` (read-only) or `git show 65d200086882d1cfaa12731bc24f80515ae33696` (view the diff)

**AS-IS (before):** There was no HR module (no Employees or Salary Payments pages). `ProductionRunsList.jsx` had no worker-per-stage tracking. `CostParametersList.jsx` used its earlier, simpler design. `DataTable.jsx` had no column chooser, and list pages generally lacked standard audit columns (created/updated by+at).
**TO-BE (after):** Large cross-cutting commit (1326 insertions across 23 files). New `src/pages/hr/EmployeesList.jsx` (251 lines) and `SalaryPaymentsList.jsx` (139 lines) — the first HR module pages. `ProductionRunsList.jsx` (+182) added worker-per-stage tracking. `CostParametersList.jsx` (+200) redesigned. `DataTable.jsx` (+143) added a column chooser (show/hide columns) and every list page gained standard audit columns (created/updated by+at), rolled out to essentially every existing list.

---

## v2618ef92 — Operator-driven column filters (ERP-style), replacing plain "Contains" — 2026-08-22 13:54 (+03:00)

**Version ID**: `2618ef92e9f5e3c91e78439939444d20a4f02214` (short: `2618ef92`)
**How to get this version**: `git checkout 2618ef92e9f5e3c91e78439939444d20a4f02214` (read-only) or `git show 2618ef92e9f5e3c91e78439939444d20a4f02214` (view the diff)

**AS-IS (before):** `DataTable.jsx`'s column filter was a plain "Contains"-only text filter on every list page.
**TO-BE (after):** `src/components/DataTable.jsx` (+322/-~40, largest single change to this file so far). Replaced the plain "Contains"-only text filter with ERP-style operator-driven filters per column (equals, starts-with, ranges, etc., depending on column type) across every list page using `DataTable`. `TABLE-CONVENTIONS.md` updated to document the new filter operators.

---

## v1936b125 — Rebuild table filters/search as Dynamics-style column headers, not a filter row — 2026-08-22 13:42 (+03:00)

**Version ID**: `1936b125a275115c1421f9522e9f7bd175b0cf7e` (short: `1936b125`)
**How to get this version**: `git checkout 1936b125a275115c1421f9522e9f7bd175b0cf7e` (read-only) or `git show 1936b125a275115c1421f9522e9f7bd175b0cf7e` (view the diff)

**AS-IS (before):** Column filtering lived in a separate filter row below the table headers, and a global-search-bar experiment (`src/layout/GlobalSearch.jsx`/`.css`, 160 lines, added the previous commit) provided page-level search.
**TO-BE (after):** `src/components/DataTable.jsx` (+180/-~110). Reworked column filtering from a separate filter row into Dynamics-365-style filter icons on each column header (`ColumnHeader`). Deleted `src/layout/GlobalSearch.jsx`/`.css` (160 lines removed) — the earlier global-search-bar experiment was dropped in favor of per-page table filtering. `shared.css` (+123) gained supporting styles.

---

## vb2465c32 — Excel-style column filters, row selection/export, and header search everywhere — 2026-08-22 13:31 (+03:00)

**Version ID**: `b2465c329caa923f10a017e195a37b2a615541cf` (short: `b2465c32`)
**How to get this version**: `git checkout b2465c329caa923f10a017e195a37b2a615541cf` (read-only) or `git show b2465c329caa923f10a017e195a37b2a615541cf` (view the diff)

**AS-IS (before):** There was no shared `DataTable` component — list pages had ad hoc tables with no Excel-style column filters, row selection, or export, and no documented table conventions.
**TO-BE (after):** New `src/components/DataTable.jsx` (208 lines) — the foundational shared table component (later heavily extended) providing Excel-style column filters, row selection, and export. New `src/hooks/useUrlSearch.js` (16 lines) and a short-lived `src/layout/GlobalSearch.jsx`/`.css` (98+62 lines, header search bar — removed the very next commit). New `TABLE-CONVENTIONS.md` documents the pattern. Rolled out to essentially every list page (17 pages touched).

---

## v4eaff377 — Add Retail Stores page, store-first Sales Order buyer flow, Last Record UI — 2026-08-22 13:02 (+03:00)

**Version ID**: `4eaff377a6b2c22422fa99647bc7d7ba4ffd1bb7` (short: `4eaff377`)
**How to get this version**: `git checkout 4eaff377a6b2c22422fa99647bc7d7ba4ffd1bb7` (read-only) or `git show 4eaff377a6b2c22422fa99647bc7d7ba4ffd1bb7` (view the diff)

**AS-IS (before):** There was no Retail Stores master list. `SalesOrdersList.jsx`'s buyer flow did not pick a Store first, and Number Sequences/Security Roles had no entries for the module.
**TO-BE (after):** New `src/pages/stores/StoresList.jsx` (218 lines) — Retail Stores master list. `SalesOrdersList.jsx` (+53 net) reworked the buyer flow to pick a Store first. `NumberSequencesPage.jsx` (+40) and `SecurityRolesList.jsx` gained matching entries for the new module.

---

## va4db0c09 — Always show the next code in create forms (Microsoft Dynamics-style) — 2026-08-22 12:31 (+03:00)

**Version ID**: `a4db0c0963a3d742982a55bbf14c827570561fed` (short: `a4db0c09`)
**How to get this version**: `git checkout a4db0c0963a3d742982a55bbf14c827570561fed` (read-only) or `git show a4db0c0963a3d742982a55bbf14c827570561fed` (view the diff)

**AS-IS (before):** Code-preview logic was bespoke and duplicated across Customers, Machines, Partners, Products, Vendors, with no shared component; Purchase Orders and Sales Orders had no code preview at all.
**TO-BE (after):** New shared `src/components/CodeField.jsx` (68 lines) — a reusable input showing a live preview of the next auto-generated code (Dynamics-365-style), replacing bespoke code-preview logic duplicated across Customers, Machines, Partners, Products, Vendors (each simplified/shortened by this change) and added fresh to Purchase Orders and Sales Orders.

---

## v12c0e1a3 — Show master codes, add manual-code entry, full-control Number Sequences UI — 2026-08-22 12:17 (+03:00)

**Version ID**: `12c0e1a3ac5500399a54170c749f24cfebd57f3e` (short: `12c0e1a3`)
**How to get this version**: `git checkout 12c0e1a3ac5500399a54170c749f24cfebd57f3e` (read-only) or `git show 12c0e1a3ac5500399a54170c749f24cfebd57f3e` (view the diff)

**AS-IS (before):** `NumberSequencesPage.jsx` had no editing control over sequence config, and the Customers/Machines/Partners/Products/Vendors list pages showed no generated code and had no manual-code-entry override.
**TO-BE (after):** `NumberSequencesPage.jsx` (+73/-net) gained full editing control over sequence config. Customers/Machines/Partners/Products/Vendors list pages each show their master record's generated code and gained a manual-code-entry override option, ahead of the dedicated `CodeField` component added the next commit.

---

## vfeb65a6a — Revert default design mode back to Liquid Glass — 2026-08-22 11:53 (+03:00)

**Version ID**: `feb65a6a0c6ccc5b96c862a19515fc8069af2bca` (short: `feb65a6a`)
**How to get this version**: `git checkout feb65a6a0c6ccc5b96c862a19515fc8069af2bca` (read-only) or `git show feb65a6a0c6ccc5b96c862a19515fc8069af2bca` (view the diff)

**AS-IS (before):** Following the previous commit, the app's default design Mode was briefly Standard (alongside newly added text-size control).
**TO-BE (after):** `ModeContext.jsx` (+9/-7) and `index.html`. Reverted the app's default design Mode from Standard back to Glass, while keeping the rest of the previous commit's changes (text-size control).

---

## v11c1b31e — Dark theme colors, fix invisible System breadcrumb, Standard as default, text size control — 2026-08-22 11:48 (+03:00)

**Version ID**: `11c1b31e81e9eb9649273a18bd253f5242e62ce2` (short: `11c1b31e`)
**How to get this version**: `git checkout 11c1b31e81e9eb9649273a18bd253f5242e62ce2` (read-only) or `git show 11c1b31e81e9eb9649273a18bd253f5242e62ce2` (view the diff)

**AS-IS (before):** There was no user-adjustable text size control. The System theme had an invisible/unreadable breadcrumb, Dark theme colors needed refinement, and the app's default Mode was still Glass.
**TO-BE (after):** New `src/theme/TextSizeContext.jsx` (53 lines) — user-adjustable text size, exposed in `ProfilePage.jsx` (+29). `theme.css` (+97/-24) refined Dark theme colors and fixed the invisible breadcrumb in the System theme. `App.jsx` (+63/-net) and `index.html` wired Standard mode as the (temporary) default, reverted the very next commit.

---

## vae029c44 — Exact System colors, fix orange sidebar text bug, Copilot-style Dark theme — 2026-08-22 11:28 (+03:00)

**Version ID**: `ae029c44ffdaa4d3716d015ca3fb043777c3f88f` (short: `ae029c44`)
**How to get this version**: `git checkout ae029c44ffdaa4d3716d015ca3fb043777c3f88f` (read-only) or `git show ae029c44ffdaa4d3716d015ca3fb043777c3f88f` (view the diff)

**AS-IS (before):** The System theme's colors did not exactly match spec, sidebar text rendered orange unintentionally in some state, and the Dark theme did not yet resemble GitHub Copilot's dark palette.
**TO-BE (after):** `theme.css` (+42/-35). Matched the System theme's colors exactly to spec, fixed the orange sidebar text bug, and restyled the Dark theme to resemble GitHub Copilot's dark palette.

---

## vdc6e7001 — Give Standard mode 3 fixed looks (System/Light/Dark), not a light/dark resolution — 2026-08-22 11:16 (+03:00)

**Version ID**: `dc6e7001b7224f85535ccfc16ed4c351e36db976` (short: `dc6e7001`)
**How to get this version**: `git checkout dc6e7001b7224f85535ccfc16ed4c351e36db976` (read-only) or `git show dc6e7001b7224f85535ccfc16ed4c351e36db976` (view the diff)

**AS-IS (before):** Standard mode was a single theme that resolved to light/dark, with no distinct System/Light/Dark CSS blocks.
**TO-BE (after):** `ThemeContext.jsx` (+15/-12) and `theme.css` (+115/-105, ~half the file rewritten). Changed Standard mode into 3 genuinely distinct fixed looks — System, Light, Dark — each its own CSS block, an architecture that (mostly) persists through later theme commits.

---

## vee770a51 — Standard mode: chrome matches theme (Hostinger-style), not inverted — 2026-08-22 11:05 (+03:00)

**Version ID**: `ee770a518d5a85a810c0b440a1db5c800d1bfce1` (short: `ee770a51`)
**How to get this version**: `git checkout ee770a518d5a85a810c0b440a1db5c800d1bfce1` (read-only) or `git show ee770a518d5a85a810c0b440a1db5c800d1bfce1` (view the diff)

**AS-IS (before):** Standard mode's chrome (sidebar/header) intentionally inverted against the selected theme, per the previous two commits' approach.
**TO-BE (after):** `theme.css` (+48/-77, net reduction). Reversed the previous two commits' chrome-inversion approach — sidebar/header chrome now follows the selected theme directly (Hostinger-dashboard style) instead of intentionally inverting against it.

---

## v90fb0720 — Fix Standard+Dark chrome not inverting: remove stale duplicate CSS block — 2026-08-22 10:54 (+03:00)

**Version ID**: `90fb0720d68e72047bba183968874908e98f41e9` (short: `90fb0720`)
**How to get this version**: `git checkout 90fb0720d68e72047bba183968874908e98f41e9` (read-only) or `git show 90fb0720d68e72047bba183968874908e98f41e9` (view the diff)

**AS-IS (before):** A stale duplicate CSS block in `theme.css` was overriding the intended Standard+Dark chrome-inversion rules from the previous commit, silently preventing them from taking effect.
**TO-BE (after):** `theme.css` (-44 lines only). Pure bug fix: removed the duplicate block, letting the intended chrome-inversion rules take effect.

---

## v1e068a40 — Invert Standard mode chrome against theme, tone down accents — 2026-08-22 10:49 (+03:00)

**Version ID**: `1e068a409183e144f7ba3d7d516e3f408eb1c879` (short: `1e068a40`)
**How to get this version**: `git checkout 1e068a409183e144f7ba3d7d516e3f408eb1c879` (read-only) or `git show 1e068a409183e144f7ba3d7d516e3f408eb1c879` (view the diff)

**AS-IS (before):** Standard mode's chrome (sidebar/header) followed the selected light/dark theme directly, and accent colors were more intense across the palette.
**TO-BE (after):** `theme.css` (152 insertions / 142 deletions — roughly half the file rewritten). Made Standard mode's chrome intentionally invert against the selected light/dark theme instead of following it directly, and toned down accent color intensity across the palette.

---

## vd70a90a2 — Fix Standard mode: chrome now follows light/dark theme instead of always dark — 2026-08-22 10:36 (+03:00)

**Version ID**: `d70a90a253d3512b23deb9e2c3efbe31c11a52cf` (short: `d70a90a2`)
**How to get this version**: `git checkout d70a90a253d3512b23deb9e2c3efbe31c11a52cf` (read-only) or `git show d70a90a253d3512b23deb9e2c3efbe31c11a52cf` (view the diff)

**AS-IS (before):** Standard mode's chrome was always rendering dark regardless of the selected theme.
**TO-BE (after):** `theme.css` (+116/-34). Bug fix: chrome now correctly follows the chosen light/dark theme.

---

## v20ee1db2 — Give Standard mode its own distinct palette, not a flattened Glass theme — 2026-08-22 10:30 (+03:00)

**Version ID**: `20ee1db28745b29ffdae004cfa31c393803d48d5` (short: `20ee1db2`)
**How to get this version**: `git checkout 20ee1db28745b29ffdae004cfa31c393803d48d5` (read-only) or `git show 20ee1db28745b29ffdae004cfa31c393803d48d5` (view the diff)

**AS-IS (before):** Standard mode was effectively a flattened/non-glass rendering of the same palette as Glass mode, with no distinct color identity of its own.
**TO-BE (after):** `theme.css` (+171/-10, single-file change). Gives Standard mode a genuinely distinct color palette of its own, the start of Standard mode's identity as a separate design system from Liquid Glass.

---

## v13ada630 — Add Profile page: personalization (theme + design mode) and account management — 2026-08-22 10:08 (+03:00)

**Version ID**: `13ada6302fdd942b5ea779759bea8dcca2e76d4c` (short: `13ada630`)
**How to get this version**: `git checkout 13ada6302fdd942b5ea779759bea8dcca2e76d4c` (read-only) or `git show 13ada6302fdd942b5ea779759bea8dcca2e76d4c` (view the diff)

**AS-IS (before):** There was no dedicated Profile page; personalization and account management lived inside `SettingsPage.jsx`, and there was no Glass/Standard mode toggle as a first-class context.
**TO-BE (after):** New `src/pages/ProfilePage.jsx` (218 lines) + `ProfilePage.css` (234 lines) — the Personalization card (Mode/Theme toggles, later Text Size) and account management, moved out of Settings (`SettingsPage.jsx` -106 lines). New `src/theme/ModeContext.jsx` (48 lines) introduces the Glass/Standard mode toggle as a first-class context alongside the existing theme context. `theme.css` (+76) added supporting tokens.

---

## v0b1888e4 — Add Sales Orders + Customers pages, Accounts Payable UI on Purchase Orders — 2026-08-22 09:49 (+03:00)

**Version ID**: `0b1888e445a7ad3558934cd6f84dc760c5ab0c4e` (short: `0b1888e4`)
**How to get this version**: `git checkout 0b1888e445a7ad3558934cd6f84dc760c5ab0c4e` (read-only) or `git show 0b1888e445a7ad3558934cd6f84dc760c5ab0c4e` (view the diff)

**AS-IS (before):** There were no Sales Orders or Customers pages — no sales-side modules existed yet. `PurchaseOrdersList.jsx` had no Accounts Payable status/tracking UI.
**TO-BE (after):** New `src/pages/sales-orders/SalesOrdersList.jsx` (517 lines) and `src/pages/customers/CustomersList.jsx` (167 lines) — Sales Orders and Customers are the first sales-side modules. `PurchaseOrdersList.jsx` (+66/-net) added Accounts Payable status/tracking UI.

---

## v50f30744 — Add row-click, delete-button gating, Cash Book tabs, sidebar customization — 2026-08-22 09:29 (+03:00)

**Version ID**: `50f30744217e6e7e0617a8e3ca36ad87252e8e88` (short: `50f30744`)
**How to get this version**: `git checkout 50f30744217e6e7e0617a8e3ca36ad87252e8e88` (read-only) or `git show 50f30744217e6e7e0617a8e3ca36ad87252e8e88` (view the diff)

**AS-IS (before):** There was no sidebar customization/persistence mechanism, Cash Book had no tabs, and Bank Accounts, Machines, Partners, Cost Parameters, Products, Purchase Orders, Security Roles, Vendors, WhatsApp Orders had no row-click-to-open or permission-gated delete buttons.
**TO-BE (after):** New `src/layout/sidebarPrefs.js` (79 lines, later replaced by `sidebarState.js`) — sidebar customization/persistence. `CashBookList.jsx` (+149/-31) gained tabs. Row-click-to-open and permission-gated delete buttons rolled out across Bank Accounts, Machines, Partners, Cost Parameters, Products, Purchase Orders, Security Roles, Vendors, WhatsApp Orders. `SettingsPage.jsx` (+149) grew significantly (pre-dates the later Profile page split).

---

## vd418603b — Add PO GST/discount UI, editable Number Sequences, transfer safety UX — 2026-08-22 08:38 (+03:00)

**Version ID**: `d418603bab1758111c3ceb74a67e7835bf7f08da` (short: `d418603b`)
**How to get this version**: `git checkout d418603bab1758111c3ceb74a67e7835bf7f08da` (read-only) or `git show d418603bab1758111c3ceb74a67e7835bf7f08da` (view the diff)

**AS-IS (before):** The PO form had no GST or discount fields. Number Sequences configuration was not editable. Stock transfers had no confirmation/safety UX.
**TO-BE (after):** `PurchaseOrdersList.jsx` (+150/-5) added GST and discount fields to the PO form. `BankAccountsList.jsx` (+~230 net) and `FinancialControlPage.jsx` (-net, simplification) reworked. `NumberSequencesPage.jsx` (+~200 net) made sequence configuration editable. `CashBookList.jsx` (+~190 net) grew substantially. Added confirmation/safety UX around stock transfers.

---

## vfbd3f2fd — Add Bank Accounts, Production, Reports, Team/Security Roles pages — 2026-08-22 01:05 (+03:00)

**Version ID**: `fbd3f2fd8a144e67210e1fdfdf3af861dc6388ea` (short: `fbd3f2fd`)
**How to get this version**: `git checkout fbd3f2fd8a144e67210e1fdfdf3af861dc6388ea` (read-only) or `git show fbd3f2fd8a144e67210e1fdfdf3af861dc6388ea` (view the diff)

**AS-IS (before):** Bank Accounts, Production, Reports, Team, Security Roles, Number Sequences, and Activity Log did not exist as modules.
**TO-BE (after):** Large multi-module addition (1984 insertions across 12 new files). New pages: `src/pages/bank-accounts/BankAccountsList.jsx` (323 lines), `src/pages/financial-control/FinancialControlPage.jsx` (166 lines, first version), `src/pages/machines/MachinesList.jsx` (170 lines), `src/pages/production/CostParametersList.jsx` (166 lines) and `ProductionRunsList.jsx` (283 lines, first version), `src/pages/reports/ReportsPage.jsx` (287 lines, first version), `src/pages/security/SecurityRolesList.jsx` (169 lines), `src/pages/settings/ActivityLogPage.jsx` (79 lines) and `NumberSequencesPage.jsx` (71 lines, first version), and `src/pages/team/TeamList.jsx` (213 lines). This is the commit that first stood up Bank Accounts, Production, Reports, Team, Security Roles, Number Sequences, and Activity Log as modules — most rebuilt/expanded significantly in later commits.

---

## v3aa0c22b — Fix low-contrast brand-purple text in dark mode — 2026-08-22 00:48 (+03:00)

**Version ID**: `3aa0c22b927685894ad612a74f0ad8fab2e15bdd` (short: `3aa0c22b`)
**How to get this version**: `git checkout 3aa0c22b927685894ad612a74f0ad8fab2e15bdd` (read-only) or `git show 3aa0c22b927685894ad612a74f0ad8fab2e15bdd` (view the diff)

**AS-IS (before):** The brand purple (`#5b1f97`) text was low-contrast/hard to read against dark-mode backgrounds in several places.
**TO-BE (after):** `theme.css` (+27/-16) and small fixes in `ExportMenu.css`, `Modal.css`, `ComingSoon.jsx`, `Login.css`, `shared.css`. Fixed the brand purple text's low contrast against dark-mode backgrounds.

---

## v93d82056 — Make the glass effect visibly obvious, not just technically correct — 2026-08-22 00:41 (+03:00)

**Version ID**: `93d82056e07e1539a81f6d06b5a0207cdc823e8e` (short: `93d82056`)
**How to get this version**: `git checkout 93d82056e07e1539a81f6d06b5a0207cdc823e8e` (read-only) or `git show 93d82056e07e1539a81f6d06b5a0207cdc823e8e` (view the diff)

**AS-IS (before):** The Liquid Glass effect introduced in the previous commit was technically present (blur/transparency tokens existed) but visually too subtle to read as "glass."
**TO-BE (after):** `theme.css` (+108/-24, largest change in the file to date). Pushed the blur/translucency/border treatment to be clearly visible, plus supporting tweaks in `App.jsx`, `AppShell.css`, `Sidebar.css`, `Login.css`.

---

## vec6b5d58 — Add Liquid Glass design system with light/dark theming — 2026-08-22 00:36 (+03:00)

**Version ID**: `ec6b5d5817b923e2a6b80b0162a1d9d00bd8c623` (short: `ec6b5d58`)
**How to get this version**: `git checkout ec6b5d5817b923e2a6b80b0162a1d9d00bd8c623` (read-only) or `git show ec6b5d5817b923e2a6b80b0162a1d9d00bd8c623` (view the diff)

**AS-IS (before):** No Liquid Glass design system existed — no blur/translucency tokens and no `ThemeContext.jsx` to drive light/dark theming.
**TO-BE (after):** `theme.css` (+237/-10, the foundational rewrite) introduces the **Liquid Glass** design system — light/dark theming with blur/translucency tokens — plus a new `src/theme/ThemeContext.jsx` (64 lines) to drive it. Supporting updates across `App.jsx`, `Header.jsx`/`.css`, `Sidebar.css`, `Modal.css`, `ExportMenu.css`, `Pagination.css`, `StatusBadge.css`, `Dashboard.css`, `Login.css`, `Partners.css`, `shared.css`, and `index.html`. This is the origin commit of the app's signature visual system, refined heavily by the several commits that immediately follow.

---

## vf09cb744 — Add Products, Vendors, Purchase Orders, and Settings (change password) — 2026-08-22 00:14 (+03:00)

**Version ID**: `f09cb744d77a1f11bdc7a782a260b7c12687513d` (short: `f09cb744`)
**How to get this version**: `git checkout f09cb744d77a1f11bdc7a782a260b7c12687513d` (read-only) or `git show f09cb744d77a1f11bdc7a782a260b7c12687513d` (view the diff)

**AS-IS (before):** Products, Vendors, Purchase Orders, and Settings did not exist as modules/pages.
**TO-BE (after):** New `src/pages/products/ProductsList.jsx` (241 lines), `src/pages/vendors/VendorsList.jsx` (170 lines), `src/pages/purchasing/PurchaseOrdersList.jsx` (333 lines), and `src/pages/settings/SettingsPage.jsx` (104 lines, including a change-password form). Three new business modules plus the first version of Settings.

---

## v57973a26 — Add TECHNICAL-STRUCTURE.md: full system architecture and infra reference — 2026-08-22 00:04 (+03:00)

**Version ID**: `57973a262322cac44d280d093af2d959573b9447` (short: `57973a26`)
**How to get this version**: `git checkout 57973a262322cac44d280d093af2d959573b9447` (read-only) or `git show 57973a262322cac44d280d093af2d959573b9447` (view the diff)

**AS-IS (before):** No `TECHNICAL-STRUCTURE.md` document existed describing the full system architecture and infrastructure.
**TO-BE (after):** Docs-only: new `TECHNICAL-STRUCTURE.md` (135 lines) documenting the full system architecture and infrastructure (the 3-repo split, deploy targets, stack) referenced by later `CLAUDE.md` context. No application code changed.

---

## v42366dd4 — Add CLAUDE.md, DEPLOYMENT.md, BUSINESS-MODEL-FEATURES.md, CHANGELOG.md — 2026-08-22 00:02 (+03:00)

**Version ID**: `42366dd40184357e3968632434b3c4abc6884833` (short: `42366dd4`)
**How to get this version**: `git checkout 42366dd40184357e3968632434b3c4abc6884833` (read-only) or `git show 42366dd40184357e3968632434b3c4abc6884833` (view the diff)

**AS-IS (before):** No project documentation set existed — no `CLAUDE.md`, `DEPLOYMENT.md`, `BUSINESS-MODEL-FEATURES.md`, or `CHANGELOG.md`.
**TO-BE (after):** Docs-only: introduced the project's core documentation set — `CLAUDE.md` (project context/conventions for AI-assisted development), `DEPLOYMENT.md`, `BUSINESS-MODEL-FEATURES.md` (Bismi's real 3-way consignment/commission business model), and the original `CHANGELOG.md` (this file, now rebuilt into the full per-commit format). No application code changed.

---

## v7546f51c — Add Partners & Shops module: list, add/edit, settlement calculator — 2026-08-21 23:52 (+03:00)

**Version ID**: `7546f51c813a13fc40a43781a516eb10f8627c07` (short: `7546f51c`)
**How to get this version**: `git checkout 7546f51c813a13fc40a43781a516eb10f8627c07` (read-only) or `git show 7546f51c813a13fc40a43781a516eb10f8627c07` (view the diff)

**AS-IS (before):** No Partners & Shops module existed.
**TO-BE (after):** New `src/pages/partners/PartnersList.jsx` (407 lines) + `Partners.css` (41 lines) — the first version of the Partners & Shops module: list, add/edit partners (External Shop or Supplying Partner types), plus a per-partner settlement view with a live commission calculator, reflecting Bismi's real 3-way consignment/commission business model.

---

## v76eacabf — Add Hostinger Node.js App deploy support (build + static serve) — 2026-08-21 20:52 (+03:00)

**Version ID**: `76eacabf767a1e29029a4dbc8681f270d762e89c` (short: `76eacabf`)
**How to get this version**: `git checkout 76eacabf767a1e29029a4dbc8681f270d762e89c` (read-only) or `git show 76eacabf767a1e29029a4dbc8681f270d762e89c` (view the diff)

**AS-IS (before):** There was no `server.js` and no way to run the built app on Hostinger's Node.js App hosting, which requires a persistent process rather than serving static files directly — `vite`/`@vitejs/plugin-react` were plain `devDependencies` with no `postinstall` build step, so a production-only install had nothing runnable.
**TO-BE (after):** New `server.js` (20 lines) — a tiny Express static-file server with SPA fallback — plus `package.json` changes moving `vite`/`@vitejs/plugin-react` into real `dependencies` and adding a `postinstall` script that runs `vite build` automatically. This is what made the very first production deploy possible.

---

## v3c7d9800 — Initial admin portal scaffold: auth, layout, theme, Cash Book, Inventory, WhatsApp Orders — 2026-08-21 20:41 (+03:00)

**Version ID**: `3c7d980083b9d22c117b8fe8786ee43887000b1f` (short: `3c7d9800`)
**How to get this version**: `git checkout 3c7d980083b9d22c117b8fe8786ee43887000b1f` (read-only) or `git show 3c7d980083b9d22c117b8fe8786ee43887000b1f` (view the diff)

**AS-IS (before):** No admin portal existed — nothing had been built yet.
**TO-BE (after):** The founding commit (47 files, 4938 lines). Scaffolded the shell — `src/auth/` (`AuthContext.jsx`, `ProtectedRoute.jsx`), `src/api/` (`client.js`, `admin.js`, `config.js`), `src/layout/` (`AppShell`, `Header`, `Sidebar`, `navConfig.js`), shared components (`Modal`, `Pagination`, `ExportMenu`, `StatusBadge`, `SearchBox`, `ReasonConfirmModal`), and the initial `theme.css`/`shared.css` — following an existing sibling project's (nammahearth) proven pattern. Built the first three Bismi-specific business modules on top: Cash Book (`CashBookList.jsx`), Inventory (`InventoryList.jsx`), and WhatsApp Orders (`WaOrdersList.jsx`), plus a placeholder `Dashboard.jsx` and `Login.jsx`. Deliberately dropped e-commerce-only modules (Orders, Carts, Payments, Returns, Customers) that don't apply to Bismi's walk-in/phone-order business.
