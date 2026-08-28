// Nav tree for Bismi Admin. A top-level entry is either a standalone
// leaf (`path`, no `children`) or a module (`children`, no own `path` —
// its "default" page is `children[0]`). Every leaf/child keeps its own
// `ownerOnly`/`requiredPermission` exactly as before — there is no
// module-level permission concept; a module is visible if at least one
// of its children is visible (see Sidebar.jsx's filtering).
//
// A tab-backed child's `path` points at its parent page's own route
// plus `?tab=<key>` (e.g. "/products?tab=uom") — the page itself reads
// that query param via useSearchParams (see e.g. ProductsList.jsx) and
// treats the URL as the source of truth for which tab is showing.
// App.jsx's route generation dedupes on pathname (ignoring the query
// string), so every tab-backed child of one page still shares exactly
// one <Route> — see App.jsx's flattenRoutes().
//
// "WhatsApp Orders" is a worklist of order attempts sent from the site's
// cart-to-WhatsApp flow, not a real order-processing pipeline (see
// backend wa_orders table) — separate from "Sales Orders", which IS the
// real order/invoice/stock-out pipeline for every sale.
//
// Top-level order is a deliberate business-priority sequence (owner's
// choice), not alphabetical or grouped by "type": Dashboard, Finance,
// Sales, Production, Inventory, Purchasing, Products, Partners & Shops,
// Workforce (formerly labeled "HR" — same key/routes, label only),
// WhatsApp Orders, Reports, Settings.
//
// An optional `group` on a child is a purely cosmetic section-header
// string shown by SubmodulePanel.jsx (e.g. Finance's children are split
// into "Cash & Bank" / "Banking" / "Financial Year" is ungrouped) — it
// has zero effect on routing/flattening/permissions. Where a child has a
// `group`, its own `label` intentionally omits the group name as a
// prefix (e.g. "Accounts" not "Banking — Accounts") since the panel's
// section heading already supplies that context.
export const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: "🏠", path: "/" },
  {
    key: "finance", label: "Finance", icon: "💰",
    children: [
      { key: "cashbook", label: "Cash Book", path: "/cashbook?tab=cashbook", requiredPermission: "cashbook.manage", group: "Cash & Bank" },
      { key: "ledgertransaction", label: "Ledger Transaction", path: "/cashbook?tab=ledger", requiredPermission: "cashbook.manage", group: "Cash & Bank" },
      { key: "reversals", label: "Reversals", path: "/cashbook?tab=reversals", requiredPermission: "cashbook.manage", group: "Cash & Bank" },
      { key: "cashbookcategories", label: "Categories", path: "/cashbook?tab=categories", requiredPermission: "cashbook.manage", group: "Cash & Bank" },
      { key: "recentlydeleted", label: "Recently Deleted", path: "/cashbook?tab=deleted", requiredPermission: "cashbook.manage", group: "Cash & Bank" },
      { key: "bankaccounts", label: "Accounts", path: "/bank-accounts?tab=accounts", requiredPermission: "bank.manage", group: "Banking" },
      { key: "banktransfer", label: "Transfer", path: "/bank-accounts?tab=transfer", requiredPermission: "bank.manage", group: "Banking" },
      { key: "banktransaction", label: "Bank Transaction", path: "/bank-accounts?tab=banktransaction", requiredPermission: "bank.manage", group: "Banking" },
      { key: "financialcontrol", label: "Overview", path: "/financial-control?tab=overview", group: "Financial Control" },
      { key: "financialdimensions", label: "Dimensions", path: "/financial-control?tab=dimensions", group: "Financial Control" },
      { key: "reconciliation", label: "Reconciliation", path: "/financial-control?tab=reconciliation", group: "Financial Control" },
      { key: "calendar", label: "Financial Year", path: "/calendar" },
    ],
  },
  {
    key: "sales", label: "Sales", icon: "🧾",
    children: [
      { key: "salesorders", label: "Sales Orders", path: "/sales-orders", requiredPermission: "sales.manage" },
      { key: "customers", label: "Customers", path: "/customers", requiredPermission: "sales.manage" },
    ],
  },
  {
    key: "production", label: "Production", icon: "⚙️",
    children: [
      { key: "production", label: "Production Runs", path: "/production", requiredPermission: "production.manage" },
      { key: "costparameters", label: "Cost Parameters", path: "/cost-parameters", requiredPermission: "production.manage" },
      { key: "machines", label: "Machines", path: "/machines", requiredPermission: "production.manage" },
    ],
  },
  {
    key: "inventory", label: "Inventory", icon: "📊",
    children: [
      { key: "inventory", label: "Inventory", path: "/inventory?tab=stock", requiredPermission: "inventory.manage" },
      { key: "stocktransfers", label: "Stock Transfers", path: "/inventory?tab=transfers", requiredPermission: "inventory.manage" },
      { key: "inventorytransactions", label: "Transactions", path: "/inventory?tab=transactions", requiredPermission: "inventory.manage" },
      { key: "stores", label: "Retail Stores", path: "/stores", requiredPermission: "stores.manage" },
    ],
  },
  {
    key: "purchasing", label: "Purchasing", icon: "📋",
    children: [
      { key: "purchaseorders", label: "Purchase Orders", path: "/purchase-orders", requiredPermission: "purchasing.manage" },
      { key: "vendors", label: "Vendors", path: "/vendors", requiredPermission: "purchasing.manage" },
    ],
  },
  {
    key: "products", label: "Products", icon: "🛍️",
    children: [
      { key: "products", label: "Products", path: "/products?tab=products", requiredPermission: "products.manage", group: "Product Catalog" },
      { key: "uom", label: "UOM", path: "/products?tab=uom", requiredPermission: "products.manage", group: "Product Setup" },
      { key: "bom", label: "BOM", path: "/products?tab=bom", requiredPermission: "products.manage", group: "Product Setup" },
      { key: "changemanagement", label: "Change Management", path: "/products?tab=change-management", requiredPermission: "products.manage", group: "Governance" },
    ],
  },
  { key: "partners", label: "Partners & Shops", icon: "🤝", path: "/partners", requiredPermission: "partners.manage" },
  {
    key: "hr", label: "Workforce", icon: "🧑‍🍳",
    children: [
      { key: "employees", label: "Employees", path: "/hr?tab=employees", requiredPermission: "hr.manage" },
      { key: "positions", label: "Positions", path: "/hr?tab=positions", requiredPermission: "hr.manage" },
      { key: "salarypayments", label: "Salary Payments", path: "/hr?tab=salarypayments", requiredPermission: "hr.manage" },
    ],
  },
  { key: "waorders", label: "WhatsApp Orders", icon: "💚", path: "/wa-orders", requiredPermission: "orders.manage" },
  {
    key: "reports", label: "Reports", icon: "📈",
    children: [
      { key: "reports", label: "Reports", path: "/reports" },
      { key: "globalsearch", label: "Transaction Search", path: "/global-search" },
    ],
  },
  {
    key: "settings", label: "Settings", icon: "⚙️",
    children: [
      { key: "companydetails", label: "Company Details", path: "/settings?tab=company" },
      { key: "systemUsers", label: "System User", path: "/system-users", ownerOnly: true },
      { key: "security", label: "Security Roles", path: "/security", ownerOnly: true },
      { key: "numbersequences", label: "Number Sequences", path: "/number-sequences", ownerOnly: true },
      { key: "workflows", label: "Workflow", path: "/workflows", ownerOnly: true },
      { key: "systemerrors", label: "System Errors", path: "/system-errors", ownerOnly: true },
    ],
  },
];
