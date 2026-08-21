# Admin Portal — Business Model & Features

For the full module roadmap and *why* each module is shaped the way it is, see `ADMIN-PORTAL-PLAN.md`. This file covers what's actually live today.

## The business, in brief

Bismi Bakery & Paniyan Shop — a bakery manufacturer (T.R. Pattinam factory) + 2 retail stores (Karaikal, Nagore), running a 3-way consignment/commission model. No POS, no online ordering. Full detail in `backend/BUSINESS-MODEL-FEATURES.md`.

## What's live and what it's for

- **Dashboard** — KPI snapshot (cash/bank balance, low stock, pending purchase orders, etc.) with quick-action shortcuts.
- **Cash Book** — the single company-wide ledger, income/expense entries tagged by location, head office's manual next-day entry point (no POS feeds it).
- **Inventory** — per-location stock (factory + 2 stores), recorded as a movement ledger (production received, transferred, sold, wasted, adjusted) rather than a simple stock number, so there's a full audit trail. Shows partner-consignment stock separately from Bismi's own stock.
- **WhatsApp Orders** — a worklist of order attempts sent from the public website's cart. Not a fulfilment system — staff review it and follow up with the customer directly in WhatsApp.
- **Partners & Shops** — the module for the business's most distinctive feature, the 3-way commission model. Covers External Shops (sell Bismi's product, keep 15%) and Supplying Partners (their product sells in a Bismi store, Bismi keeps 20%). Includes a settlement screen: enter a period's sales value, the commission split computes automatically.

## Still to build

Everything else in the module list — Products management (currently only exists via the backend's seed script), Vendors, Purchase Orders, Production (batches, yield, wastage against the real T.R. Pattinam process and the Plantree machine), Reports (the KPI list from the business doc), Settings, Team, Security Roles.
