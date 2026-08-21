import { NavLink } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { NAV_ITEMS } from "./navConfig";
import "./Sidebar.css";

// On desktop this renders as the usual fixed-width sidebar. Below the
// mobile breakpoint (see Sidebar.css) it's an off-canvas drawer — hidden
// by default, slid in via the "is-open" class when the header's hamburger
// toggles `mobileOpen`, with a tap-outside overlay to close it.
export default function Sidebar({ mobileOpen, onClose }) {
  const { admin, hasPermission } = useAuth();

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
          {NAV_ITEMS.map((item) => {
            if (item.ownerOnly && admin?.role !== "owner") return null;
            if (item.requiredPermission && !hasPermission(item.requiredPermission)) return null;
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
                </NavLink>
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
