import { NavLink } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { NAV_ITEMS } from "./navConfig";
import { getStoredOrder, getStoredFavorites, sortNavItems } from "./sidebarPrefs";
import "./Sidebar.css";

// On desktop this renders as the usual fixed-width sidebar. Below the
// mobile breakpoint (see Sidebar.css) it's an off-canvas drawer — hidden
// by default, slid in via the "is-open" class when the header's hamburger
// toggles `mobileOpen`, with a tap-outside overlay to close it.
//
// IMPORTANT: the Settings page's sidebar-customization feature (drag
// reorder + favorites, see sidebarPrefs.js) ONLY affects the display
// order computed here. App.jsx generates routes straight off the
// original NAV_ITEMS array/order — this component never mutates or
// reorders that source list, only a locally-derived display copy.
export default function Sidebar({ mobileOpen, onClose }) {
  const { admin, hasPermission } = useAuth();

  // Dashboard always stays first/fixed (not draggable, not part of the
  // customizable set) — visibleItems below never includes it.
  const dashboardItem = NAV_ITEMS.find((item) => item.key === "dashboard");
  const visibleItems = NAV_ITEMS.filter((item) => {
    if (item.key === "dashboard") return false;
    if (item.ownerOnly && admin?.role !== "owner") return false;
    if (item.requiredPermission && !hasPermission(item.requiredPermission)) return false;
    return true;
  });

  const favoriteKeys = getStoredFavorites();
  const favSet = new Set(favoriteKeys);
  const orderedItems = sortNavItems(visibleItems, getStoredOrder(), favoriteKeys);
  const displayItems = dashboardItem ? [dashboardItem, ...orderedItems] : orderedItems;

  return (
    <>
      {mobileOpen && <div className="bp-sidebar-overlay" onClick={onClose} aria-hidden="true" />}
      <aside className={"bp-sidebar" + (mobileOpen ? " is-open" : "")}>
        <div className="bp-sidebar-brand">
          <span className="bp-sidebar-mark">BP</span>
          <span className="bp-sidebar-title">Bismipaniyan</span>
          <button type="button" className="bp-sidebar-close" onClick={onClose} aria-label="Close menu">
            ✕
          </button>
        </div>

        <nav className="bp-sidebar-nav">
          {displayItems.map((item) => {
            const isFavorited = item.key !== "dashboard" && favSet.has(item.key);
            return (
              <div key={item.key}>
                {item.divider && <div className="bp-sidebar-divider" />}
                <NavLink
                  to={item.path}
                  end={item.path === "/"}
                  className={({ isActive }) => "bp-sidebar-link" + (isActive ? " is-active" : "")}
                >
                  <span className="bp-sidebar-icon" aria-hidden="true">
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                  {isFavorited && (
                    <span className="bp-sidebar-star" aria-label="Favorited" title="Favorited">★</span>
                  )}
                </NavLink>
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
