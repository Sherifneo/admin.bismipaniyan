import { useSearchParams } from "react-router-dom";
import EmployeesList from "./EmployeesList";
import PositionsList from "./PositionsList";
import SalaryPaymentsList from "./SalaryPaymentsList";

const TABS = [
  { key: "employees", label: "Employees" },
  { key: "positions", label: "Positions" },
  { key: "salarypayments", label: "Salary Payments" },
];

// One HR module, one nav entry — Employees/Positions/Salary Payments are
// tabs on the same page rather than three separate sidebar items, matching
// the admin-settings tab-bar pattern (Users/Security/Departments/...) the
// owner asked for. Each tab is still the same self-contained component it
// always was (own state, own API calls) — this page only owns which one
// is visible, same shallow wrapper shape as ReportsPage.jsx's TABS switch.
export default function HRPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "employees";
  function setTab(key) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("tab", key);
      return next;
    }, { replace: true });
  }

  return (
    <div>
      <h1 className="bp-page-title">HR</h1>
      <p className="bp-td-muted" style={{ margin: "-6px 0 14px" }}>
        Staff roster, job positions, and monthly salary payments.
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

      {tab === "employees" && <EmployeesList onManagePositions={() => setTab("positions")} />}
      {tab === "positions" && <PositionsList />}
      {tab === "salarypayments" && <SalaryPaymentsList />}
    </div>
  );
}
