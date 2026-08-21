import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import ProtectedRoute from "./auth/ProtectedRoute";
import AppShell from "./layout/AppShell";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ComingSoon from "./pages/ComingSoon";
import CashBookList from "./pages/cashbook/CashBookList";
import InventoryList from "./pages/inventory/InventoryList";
import WaOrdersList from "./pages/waorders/WaOrdersList";
import { NAV_ITEMS } from "./layout/navConfig";

// Modules with a real page built go here instead of the ComingSoon
// fallback below, keyed by nav item key. Add an entry here as each
// module's list page gets built.
const BUILT_PAGES = {
  cashbook: CashBookList,
  inventory: InventoryList,
  waorders: WaOrdersList,
};

// Every nav item without a built page renders the shared placeholder.
// Kept data-driven off the same NAV_ITEMS list the sidebar uses, so a
// route can never exist without a corresponding nav entry (or vice versa).
const placeholderRoutes = NAV_ITEMS.filter((item) => item.path !== "/");

export default function App() {
  return (
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
  );
}
