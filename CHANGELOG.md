# Admin Portal — Changelog

Plain-language running log, newest entry at the top.

---

## 2026-08-21 — Partners & Shops + first production deploy

- Added the Partners & Shops screen: list/add/edit partners (External Shop or Supplying Partner), plus a per-partner settlement view with a live commission calculator.
- **First real production deploy**, live at `admin.trpbismipaniyan.com`, talking to the real backend and a real MySQL database.
- Added `server.js` and `postinstall` build wiring so this Vite SPA deploys correctly on Hostinger's Node.js App hosting (which runs a process, not just static files) — see `DEPLOYMENT.md`.
- Repainted the theme from a placeholder brown/amber palette to the confirmed brand purple `#5b1f97` + amber accent.

## 2026-08-21 — Initial build: shell, Cash Book, Inventory, WhatsApp Orders

- Scaffolded the shell (auth, layout, theme, shared components) following an existing sibling project's proven pattern, then built Bismi-specific modules on top: Cash Book (single ledger, per-location), Inventory (movement ledger, per-location, partner-consignment split), WhatsApp Orders (worklist from the website's cart).
- Deliberately dropped e-commerce-only modules (Orders, Carts, Payments, Returns, Customers) that don't apply to Bismi's walk-in/phone-order business.
