# Admin Portal — Changelog

Plain-language running log, newest entry at the top.

---

## 2026-08-25 — Cash & Bank rework, Bank Transactions page, Cash Book manual/automatic split

- Renamed "Bank Accounts" to "Cash & Bank" (sidebar, page title, Security Roles permission label) and added full account details to its form — account number, IFSC, IBAN, currency.
- Added a new "Bank Transactions" page (between Cash & Bank and the next menu item) — every deposit, withdrawal, and transfer across every account, filterable by account, type, status, and date.
- Cash Book split into two tabs: **Cash Book**, showing only entries staff typed in by hand (with an Approved/Draft filter), and **Ledger Transaction**, showing everything — manual and automatic (sales, purchase payments, salary, settlements) — with type, period, and source filters.
- Financial Control's Overview now shows one "Total balance" instead of separate Cash/Bank tiles, removed the old Transaction History tab (superseded by the new Bank Transactions page), and its Transfer form now moves money between any two accounts, not just cash-to-bank.
- Reconciliation now works one account at a time (pick Petty Cash or a specific bank, then reconcile that account's period) instead of an all/cash/bank split.
- Company Details (Settings) gained a "Default financial account" picker — the account automatic transactions post to unless a specific one is chosen.
- **Fixed a real production bug**: the app was calling the wrong API domain (`api.bismipaniyan.com` instead of the actual `api.trpbismipaniyan.com`), which made every screen fail with "Could not reach the server" after the latest deploy. Found and fixed same-day.

## 2026-08-21 — Partners & Shops + first production deploy

- Added the Partners & Shops screen: list/add/edit partners (External Shop or Supplying Partner), plus a per-partner settlement view with a live commission calculator.
- **First real production deploy**, live at `admin.trpbismipaniyan.com`, talking to the real backend and a real MySQL database.
- Added `server.js` and `postinstall` build wiring so this Vite SPA deploys correctly on Hostinger's Node.js App hosting (which runs a process, not just static files) — see `DEPLOYMENT.md`.
- Repainted the theme from a placeholder brown/amber palette to the confirmed brand purple `#5b1f97` + amber accent.

## 2026-08-21 — Initial build: shell, Cash Book, Inventory, WhatsApp Orders

- Scaffolded the shell (auth, layout, theme, shared components) following an existing sibling project's proven pattern, then built Bismi-specific modules on top: Cash Book (single ledger, per-location), Inventory (movement ledger, per-location, partner-consignment split), WhatsApp Orders (worklist from the website's cart).
- Deliberately dropped e-commerce-only modules (Orders, Carts, Payments, Returns, Customers) that don't apply to Bismi's walk-in/phone-order business.
