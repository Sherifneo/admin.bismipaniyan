import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./theme/ThemeContext";
import { ModeProvider } from "./theme/ModeContext";
import { AuthProvider } from "./auth/AuthContext";
import ProtectedRoute from "./auth/ProtectedRoute";
import AppShell from "./layout/AppShell";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ProfilePage from "./pages/ProfilePage";
import ComingSoon from "./pages/ComingSoon";
import CashBookList from "./pages/cashbook/CashBookList";
import InventoryList from "./pages/inventory/InventoryList";
import WaOrdersList from "./pages/waorders/WaOrdersList";
import SalesOrdersList from "./pages/sales-orders/SalesOrdersList";
import CustomersList from "./pages/customers/CustomersList";
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
import TeamList from "./pages/team/TeamList";
import SecurityRolesList from "./pages/security/SecurityRolesList";
import NumberSequencesPage from "./pages/settings/NumberSequencesPage";
import ActivityLogPage from "./pages/settings/ActivityLogPage";
import { NAV_ITEMS } from "./layout/navConfig";

// Modules with a real page built go here instead of the ComingSoon
// fallback below, keyed by nav item key. Add an entry here as each
// module's list page gets built.
const BUILT_PAGES = {
  cashbook: CashBookList,
  inventory: InventoryList,
  waorders: WaOrdersList,
  salesorders: SalesOrdersList,
  customers: CustomersList,
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
  team: TeamList,
  security: SecurityRolesList,
  numbersequences: NumberSequencesPage,
  systemerrors: ActivityLogPage,
};

// Every nav item without a built page renders the shared placeholder.
// Kept data-driven off the same NAV_ITEMS list the sidebar uses, so a
// route can never exist without a corresponding nav entry (or vice versa).
const placeholderRoutes = NAV_ITEMS.filter((item) => item.path !== "/");

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
                  return <Route key={item.key} path={item.path} element={element} />;
                })}
              </Route>
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </ModeProvider>
    </ThemeProvider>
  );
}
