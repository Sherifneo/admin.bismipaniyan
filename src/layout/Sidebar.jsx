import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { NAV_ITEMS } from "./navConfig";
import { getPinned, setPinned, getExpanded, setExpanded } from "./sidebarState";
import "./Sidebar.css";

// On desktop this renders as the usual fixed-width sidebar. Below the
// mobile breakpoint (see Sidebar.css) it's an off-canvas drawer — hidden
// by default, slid in via the "is-open" class when the header's hamburger
// toggles `mobileOpen`, with a tap-outside overlay to close it.
//
// NAV_ITEMS is a tree: a top-level entry either has its own `path`
// (standalone leaf, e.g. Dashboard/WhatsApp Orders/Partners) or
// `children` (a collapsible module, e.g. Finance/Products). A module is
// visible if at least one child passes the existing ownerOnly/
// requiredPermission check — same gating rules as before, just applied
// per-child instead of per-flat-item. App.jsx still generates routes
// off the same NAV_ITEMS source (flattened, see App.jsx) — this
// component never mutates that source, only decides what/how to render.
function isVisible(item, admin, hasPermission) {
  if (item.ownerOnly && admin?.role !== "owner") return false;
  if (item.requiredPermission && !hasPermission(item.requiredPermission)) return false;
  return true;
}

function pathnameOf(path) {
  return path.split("?")[0];
}

// A child's own link is "active" when the full pathname+search matches
// (so, for a tab-backed child, only ITS OWN tab lights up) — falling
// back to a pathname-only match for a plain (non-tab) child that has no
// query string of its own.
function isChildActive(child, location) {
  if (location.pathname !== pathnameOf(child.path)) return false;
  if (!child.path.includes("?")) return true;
  return `${location.pathname}${location.search}` === child.path;
}

function ModuleGroup({ module, expandedKeys, onToggleExpand, pinnedSet, onTogglePin, location }) {
  const children = module.children;
  const isModuleActive = children.some((child) => location.pathname === pathnameOf(child.path));
  const isExpanded = isModuleActive || expandedKeys.has(module.key);
  const defaultChild = children[0];
  const isPinned = pinnedSet.has(module.key);

  return (
    <div className="bp-sidebar-module">
      <div className={"bp-sidebar-module-header" + (isModuleActive ? " is-active" : "")}>
        <button
          type="button"
          className="bp-sidebar-chevron"
          onClick={() => onToggleExpand(module.key)}
          aria-label={isExpanded ? `Collapse ${module.label}` : `Expand ${module.label}`}
          aria-expanded={isExpanded}
        >
          <span className={"bp-sidebar-chevron-icon" + (isExpanded ? " is-expanded" : "")} aria-hidden="true">▸</span>
        </button>
        <NavLink to={defaultChild.path} className="bp-sidebar-module-link">
          <span className="bp-sidebar-icon" aria-hidden="true">{module.icon}</span>
          <span>{module.label}</span>
        </NavLink>
        <button
          type="button"
          className={"bp-sidebar-pin" + (isPinned ? " is-pinned" : "")}
          onClick={() => onTogglePin(module.key)}
          aria-label={isPinned ? `Unpin ${module.label}` : `Pin ${module.label}`}
          title={isPinned ? "Unpin" : "Pin"}
        >
          📌
        </button>
      </div>
      {isExpanded && (
        <div className="bp-sidebar-submenu">
          {children.map((child) => (
            <NavLink
              key={child.key}
              to={child.path}
              className={"bp-sidebar-sublink" + (isChildActive(child, location) ? " is-active" : "")}
            >
              {child.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Sidebar({ mobileOpen, onClose }) {
  const { admin, hasPermission } = useAuth();
  const location = useLocation();
  const [pinnedKeys, setPinnedKeys] = useState(() => new Set(getPinned()));
  const [expandedKeys, setExpandedKeys] = useState(() => new Set(getExpanded()));

  function onToggleExpand(key) {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      setExpanded([...next]);
      return next;
    });
  }

  function onTogglePin(key) {
    setPinnedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      setPinned([...next]);
      return next;
    });
  }

  // Dashboard stays first, fixed, never a module/pinnable — matches the
  // old customization scheme's precedent of excluding it from that set.
  const dashboardItem = NAV_ITEMS.find((item) => item.key === "dashboard");

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (item.key === "dashboard") return false;
    if (item.children) {
      const visibleChildren = item.children.filter((c) => isVisible(c, admin, hasPermission));
      return visibleChildren.length > 0;
    }
    return isVisible(item, admin, hasPermission);
  }).map((item) => {
    if (!item.children) return item;
    return { ...item, children: item.children.filter((c) => isVisible(c, admin, hasPermission)) };
  });

  const pinnedModules = visibleItems.filter((item) => item.children && pinnedKeys.has(item.key));

  function renderLeaf(item) {
    return (
      <NavLink
        key={item.key}
        to={item.path}
        end={item.path === "/"}
        className={({ isActive }) => "bp-sidebar-link" + (isActive ? " is-active" : "")}
      >
        <span className="bp-sidebar-icon" aria-hidden="true">{item.icon}</span>
        <span>{item.label}</span>
      </NavLink>
    );
  }

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
          {dashboardItem && renderLeaf(dashboardItem)}

          {pinnedModules.length > 0 && (
            <>
              <div className="bp-sidebar-section-label">Pinned</div>
              {pinnedModules.map((module) => (
                <ModuleGroup
                  key={`pinned-${module.key}`}
                  module={module}
                  expandedKeys={expandedKeys}
                  onToggleExpand={onToggleExpand}
                  pinnedSet={pinnedKeys}
                  onTogglePin={onTogglePin}
                  location={location}
                />
              ))}
              <div className="bp-sidebar-divider" />
            </>
          )}

          {visibleItems.map((item) =>
            item.children ? (
              <ModuleGroup
                key={item.key}
                module={item}
                expandedKeys={expandedKeys}
                onToggleExpand={onToggleExpand}
                pinnedSet={pinnedKeys}
                onTogglePin={onTogglePin}
                location={location}
              />
            ) : (
              renderLeaf(item)
            )
          )}
        </nav>
      </aside>
    </>
  );
}
