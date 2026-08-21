import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import "./AppShell.css";

export default function AppShell() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const location = useLocation();

  // Close the drawer on every navigation — otherwise it stays open behind
  // the new page after tapping a nav link on mobile.
  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  return (
    <div className="bp-shell">
      <Sidebar mobileOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <div className="bp-shell-main">
        <Header onMenuClick={() => setMobileNavOpen((v) => !v)} onRefresh={() => setRefreshKey((k) => k + 1)} />
        <main className="bp-shell-content">
          {/* Keying on the path + a bump counter remounts just the current
              page on refresh — each page's own load() re-runs from its
              initial useEffect, same as a real navigation to it. */}
          <Outlet key={`${location.pathname}:${refreshKey}`} />
        </main>
      </div>
    </div>
  );
}
