import { useState } from "react";
import InventoryList from "./InventoryList";
import StockTransfersList from "./StockTransfersList";
import InventoryTransactionsList from "./InventoryTransactionsList";

const TABS = [
  { key: "stock", label: "Stock" },
  { key: "transfers", label: "Transfers" },
  { key: "transactions", label: "Transactions" },
];

// One Inventory module, one nav entry — Stock and Transfers are tabs on
// the same page rather than separate sidebar items, matching the HR
// (Employees/Positions/Salary Payments) and Cash Book (.../Categories)
// tab pattern. Each tab is still the same self-contained component it
// always was (own state, own API calls) — this page only owns which one
// is visible.
export default function InventoryPage() {
  const [tab, setTab] = useState("stock");

  return (
    <div>
      <h1 className="bp-page-title">Inventory</h1>
      <p className="bp-td-muted" style={{ margin: "-6px 0 14px" }}>
        Current stock across every location, and moving stock between the factory and stores.
      </p>

      <div className="bp-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`bp-tab${tab === t.key ? " is-active" : ""}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "stock" && <InventoryList />}
      {tab === "transfers" && <StockTransfersList />}
      {tab === "transactions" && <InventoryTransactionsList />}
    </div>
  );
}
