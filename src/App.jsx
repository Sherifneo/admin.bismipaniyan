import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./theme/ThemeContext";
import { ModeProvider } from "./theme/ModeContext";
import { TextSizeProvider } from "./theme/TextSizeContext";
import { AuthProvider } from "./auth/AuthContext";
import ProtectedRoute from "./auth/ProtectedRoute";
import AppShell from "./layout/AppShell";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ProfilePage from "./pages/ProfilePage";
import ComingSoon from "./pages/ComingSoon";
import CashBookList from "./pages/cashbook/CashBookList";
import InventoryPage from "./pages/inventory/InventoryPage";
import WaOrdersList from "./pages/waorders/WaOrdersList";
import SalesOrdersList from "./pages/sales-orders/SalesOrdersList";
import CustomersList from "./pages/customers/CustomersList";
import StoresList from "./pages/stores/StoresList";
import HRPage from "./pages/hr/HRPage";
import PartnersList from "./pages/partners/PartnersList";
import ProductsList from "./pages/products/ProductsList";
import VendorsList from "./pages/vendors/VendorsList";
import PurchaseOrdersList from "./pages/purchasing/PurchaseOrdersList";
import BankAccountsList from "./pages/bank-accounts/BankAccountsList";
import FinancialControlPage from "./pages/financial-control/FinancialControlPage";
import MachinesList from "./pages/machines/MachinesList";
import CostParametersList from "./pages/production/CostParametersList";
import ProductionRunsList from "./pages/production/ProductionRunsList";
import ReportsPage from "./pages/reports/ReportsPage";
import SettingsPage from "./pages/settings/SettingsPage";
import SystemUsersList from "./pages/system-users/SystemUsersList";
import SecurityRolesList from "./pages/security/SecurityRolesList";
import NumberSequencesPage from "./pages/settings/NumberSequencesPage";
import ActivityLogPage from "./pages/settings/ActivityLogPage";
import GlobalSearchPage from "./pages/global-search/GlobalSearchPage";
import WorkflowsPage from "./pages/workflows/WorkflowsPage";
import CalendarPage from "./pages/calendar/CalendarPage";
import { NAV_ITEMS } from "./layout/navConfig";

// Modules with a real page built go here instead of the ComingSoon
// fallback below, keyed by nav item key. Add an entry here as each
// module's list page gets built.
const BUILT_PAGES = {
  globalsearch: GlobalSearchPage,
  workflows: WorkflowsPage,
  cashbook: CashBookList,
  inventory: InventoryPage,
  waorders: WaOrdersList,
  salesorders: SalesOrdersList,
  customers: CustomersList,
  stores: StoresList,
  hr: HRPage,
  partners: PartnersList,
  products: ProductsList,
  vendors: VendorsList,
  purchaseorders: PurchaseOrdersList,
  bankaccounts: BankAccountsList,
  financialcontrol: FinancialControlPage,
  machines: MachinesList,
  costparameters: CostParametersList,
  production: ProductionRunsList,
  reports: ReportsPage,
  settings: SettingsPage,
  systemUsers: SystemUsersList,
  security: SecurityRolesList,
  numbersequences: NumberSequencesPage,
  systemerrors: ActivityLogPage,
  calendar: CalendarPage,
  // A module's route-generation key is its FIRST child's key (see
  // flattenRoutes below) — for HR and Settings that first child isn't
  // the module's own top-level key, so it needs its own alias here too.
  employees: HRPage,
  companydetails: SettingsPage,
};

// Every nav item without a built page renders the shared placeholder.
// Kept data-driven off the same NAV_ITEMS list the sidebar uses, so a
// route can never exist without a corresponding nav entry (or vice versa).
//
// NAV_ITEMS is now a tree (a top-level entry either has its own `path`,
// or `children`). Route generation flattens it back to exactly one
// <Route> per distinct PATHNAME — several children of the same module
// can share one page at different ?tab= values (e.g. "/products?tab=uom"
// and "/products?tab=bom" both belong to the single "/products" page),
// and must never each get their own <Route>, which is why this dedupes
// on the pathname (ignoring the query string) rather than on nav key.
function flattenRoutes(items) {
  const seen = new Map(); // pathname -> nav item (first one wins == the "default" entry for that page)
  for (const item of items) {
    if (item.children) {
      for (const child of item.children) {
        const pathname = child.path.split("?")[0];
        if (!seen.has(pathname)) seen.set(pathname, child);
      }
    } else if (item.path && item.path !== "/") {
      seen.set(item.path, item);
    }
  }
  return [...seen.values()];
}
const placeholderRoutes = flattenRoutes(NAV_ITEMS);

function GlassOrbs() {
  return (
    <div className="bp-glass-orbs" aria-hidden="true">
      <div className="bp-glass-orb bp-glass-orb-1" />
      <div className="bp-glass-orb bp-glass-orb-2" />
      <div className="bp-glass-orb bp-glass-orb-3" />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ModeProvider>
        <TextSizeProvider>
          <GlassOrbs />
          <BrowserRouter>
            <AuthProvider>
              <Routes>
                <Route path="/login" element={<Login />} />

                <Route
                  element={
                    <ProtectedRoute>
                      <AppShell />
                    </ProtectedRoute>
                  }
                >
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  {placeholderRoutes.map((item) => {
                    const BuiltPage = BUILT_PAGES[item.key];
                    const page = BuiltPage ? <BuiltPage /> : <ComingSoon title={item.label} />;
                    const needsGate = item.ownerOnly || item.requiredPermission;
                    const element = needsGate ? (
                      <ProtectedRoute ownerOnly={item.ownerOnly} requiredPermission={item.requiredPermission}>
                        {page}
                      </ProtectedRoute>
                    ) : (
                      page
                    );
                    return <Route key={item.key} path={item.path.split("?")[0]} element={element} />;
                  })}
                </Route>
              </Routes>
            </AuthProvider>
          </BrowserRouter>
        </TextSizeProvider>
      </ModeProvider>
    </ThemeProvider>
  );
}
