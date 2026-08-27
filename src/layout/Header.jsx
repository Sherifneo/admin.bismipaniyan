import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useTheme } from "../theme/ThemeContext";
import { NAV_ITEMS } from "./navConfig";
import "./Header.css";

// Breadcrumb is derived from the same NAV_ITEMS list the sidebar uses —
// single source of truth, no separate title-per-page bookkeeping.
// NAV_ITEMS is a tree: a standalone leaf has its own `path`; a module's
// pages live in `children`. Look for the matching CHILD's label first
// (e.g. "Ledger Transaction" for /cashbook?tab=ledger), since that's
// more specific than the module name — fall back to the module/leaf
// label if no child path matches.
function currentModuleLabel(pathname) {
  if (pathname === "/") return "Dashboard";
  for (const item of NAV_ITEMS) {
    if (item.children) {
      const child = item.children.find((c) => pathname.startsWith(c.path.split("?")[0]));
      if (child) return child.label;
    } else if (item.path && item.path !== "/" && pathname.startsWith(item.path)) {
      return item.label;
    }
  }
  return null;
}

export default function Header({ onMenuClick, onRefresh }) {
  const { admin, logout } = useAuth();
  const { preference, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [signingOut, setSigningOut] = useState(false);
  const [spinning, setSpinning] = useState(false);

  const systemPrefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  const isDark = preference === "dark" || (preference === "system" && systemPrefersDark);

  function handleRefresh() {
    setSpinning(true);
    onRefresh();
    // Purely cosmetic — the remount itself is synchronous, this just gives
    // the spin animation time to be visible instead of a single frame.
    setTimeout(() => setSpinning(false), 500);
  }

  async function handleSignOut() {
    setSigningOut(true);
    await logout();
    navigate("/login", { replace: true });
  }

  const initial = (admin?.full_name || "?").trim().charAt(0).toUpperCase();
  const moduleLabel = currentModuleLabel(location.pathname);

  return (
    <header className="bp-header">
      <button type="button" className="bp-header-menu-btn" onClick={onMenuClick} aria-label="Open menu">
        ☰
      </button>
      <span className="bp-admin-badge">ADMIN</span>
      {moduleLabel && (
        <nav className="bp-breadcrumb" aria-label="Breadcrumb">
          <span>Bismipaniyan Admin</span>
          <span className="bp-breadcrumb-sep">/</span>
          <span className="bp-breadcrumb-current">{moduleLabel}</span>
        </nav>
      )}
      <button
        type="button"
        className={"bp-header-refresh-btn" + (spinning ? " is-spinning" : "")}
        onClick={handleRefresh}
        title="Refresh this page's data"
        aria-label="Refresh"
      >
        ↻
      </button>
      <div className="bp-header-spacer" />
      <button
        type="button"
        className="bp-header-theme-btn"
        onClick={toggleTheme}
        title={isDark ? "Switch to light mode" : "Switch to dark mode"}
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      >
        {isDark ? "☀️" : "🌙"}
      </button>
      <div className="bp-header-user">
        <Link to="/profile" className="bp-header-profile-link" title="Your profile">
          <span className="bp-header-avatar" aria-hidden="true">
            {initial}
          </span>
          <div className="bp-header-userinfo">
            <span className="bp-header-name">{admin?.full_name}</span>
            <span className="bp-header-role">{admin?.role === "owner" ? "Owner" : admin?.role === "super_user" ? "Super User" : "Staff"}</span>
          </div>
        </Link>
        <button
          type="button"
          className="bp-header-signout"
          onClick={handleSignOut}
          disabled={signingOut}
        >
          {signingOut ? "Signing out…" : "Sign out"}
        </button>
      </div>
    </header>
  );
}
