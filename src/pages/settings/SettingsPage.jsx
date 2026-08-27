import { useSearchParams } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import CompanyDetailsTab from "./CompanyDetailsTab";

// Settings holds (owner-only) Company Details — Bismi's legal/statutory
// identity used on invoices. Sidebar customization (drag-reorder +
// favorites) was removed in favor of the sidebar's own pin-main-modules
// feature (see layout/sidebarState.js) — no longer lives here. Change-
// password and theme/design personalization moved to the Profile page
// (reached via the header avatar), since those are personal-identity
// actions, not app-wide settings.
const TABS = [
  { key: "company", label: "Company Details" },
];

export default function SettingsPage() {
  const { admin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "company";
  function setTab(key) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("tab", key);
      return next;
    }, { replace: true });
  }
  const visibleTabs = TABS.filter((t) => t.key !== "company" || admin?.role === "owner");

  return (
    <div>
      <h1 className="bp-page-title">Settings</h1>
      <div className="bp-tabs" style={{ marginBottom: 16 }}>
        {visibleTabs.map((t) => (
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
      {tab === "company" && admin?.role === "owner" && <CompanyDetailsTab />}
    </div>
  );
}
