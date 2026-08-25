// Nav tree for Bismi Admin. `ownerOnly` hides an item entirely for
// non-owners (hidden module, not a greyed-out one). `requiredPermission`
// gates on the granular Security Roles system — a staff member needs this
// exact permission key granted to see the item (owners always pass, see
// AuthContext's hasPermission). Items with neither flag are visible to
// any signed-in employee.
//
// "WhatsApp Orders" is a worklist of order attempts sent from the site's
// cart-to-WhatsApp flow, not a real order-processing pipeline (see
// backend wa_orders table) — separate from "Sales Orders" below, which
// IS the real order/invoice/stock-out pipeline for every sale (walk-in
// or bulk), replacing Cash Book's old manual "Store sales" entry as the
// source of truth for revenue.
export const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: "🏠", path: "/" },
  { key: "globalsearch", label: "Transaction Search", icon: "🔎", path: "/global-search" },
  { key: "waorders", label: "WhatsApp Orders", icon: "💚", path: "/wa-orders", requiredPermission: "orders.manage" },
  { key: "salesorders", label: "Sales Orders", icon: "🧾", path: "/sales-orders", requiredPermission: "sales.manage" },
  { key: "stores", label: "Retail Stores", icon: "🏬", path: "/stores", requiredPermission: "stores.manage" },
  { key: "hr", label: "HR", icon: "🧑‍🍳", path: "/hr", requiredPermission: "hr.manage" },
  { key: "customers", label: "Customers", icon: "🧑‍🤝‍🧑", path: "/customers", requiredPermission: "sales.manage" },
  { key: "cashbook", label: "Cash Book", icon: "💰", path: "/cashbook", requiredPermission: "cashbook.manage" },
  { key: "bankaccounts", label: "Cash & Bank", icon: "🏦", path: "/bank-accounts", requiredPermission: "bank.manage" },
  { key: "products", label: "Products", icon: "🛍️", path: "/products", requiredPermission: "products.manage" },
  { key: "inventory", label: "Inventory", icon: "📊", path: "/inventory", requiredPermission: "inventory.manage" },
  { key: "partners", label: "Partners & Shops", icon: "🤝", path: "/partners", requiredPermission: "partners.manage" },
  { key: "vendors", label: "Vendors", icon: "🏭", path: "/vendors", requiredPermission: "purchasing.manage" },
  { key: "purchaseorders", label: "Purchase Orders", icon: "📋", path: "/purchase-orders", requiredPermission: "purchasing.manage" },
  { key: "production", label: "Production", icon: "⚙️", path: "/production", requiredPermission: "production.manage" },
  { key: "machines", label: "Machines", icon: "🔧", path: "/machines", requiredPermission: "production.manage" },
  { key: "costparameters", label: "Cost Parameters", icon: "💲", path: "/cost-parameters", requiredPermission: "production.manage" },
  { key: "reports", label: "Reports", icon: "📈", path: "/reports" },
  { key: "financialcontrol", label: "Financial Control", icon: "🧮", path: "/financial-control" },
  { key: "settings", label: "Settings", icon: "⚙️", path: "/settings" },
  { key: "team", label: "Team", icon: "🔑", path: "/team", ownerOnly: true, divider: true },
  { key: "security", label: "Security Roles", icon: "🛡️", path: "/security", ownerOnly: true },
  { key: "numbersequences", label: "Number Sequences", icon: "🔢", path: "/number-sequences", ownerOnly: true },
  { key: "workflows", label: "Workflow", icon: "🧭", path: "/workflows", ownerOnly: true },
  { key: "systemerrors", label: "System Errors", icon: "🛠️", path: "/system-errors", ownerOnly: true },
];
