import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { NAV_ITEMS } from "./navConfig";
import { getPinned, setPinned, getExpanded, setExpanded } from "./sidebarState";
import { getFavorites, isFavorited, toggleFavorite } from "./favoritesState";
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

function ModuleGroup({ module, expandedKeys, onToggleExpand, pinnedSet, onTogglePin, favorites, onToggleFavorite, location }) {
  const children = module.children;
  const isModuleActive = children.some((child) => location.pathname === pathnameOf(child.path));
  // expandedKeys tracks "toggled away from this module's default expand
  // state" — default is expanded when active, collapsed when not. So the
  // presence of a key means "flip the default," not "force expanded" —
  // this is what lets an active (auto-expanded) module still be
  // manually collapsed by the user, then re-expanded again.
  const isExpanded = isModuleActive !== expandedKeys.has(module.key);
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
          <span className={"bp-sidebar-chevron-icon" + (isExpanded ? " is-expanded" : "")} aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </span>
        </button>
        <NavLink
          to={defaultChild.path}
          className="bp-sidebar-module-link"
          onClick={(e) => {
            // Clicking the label always navigates to the module's default
            // page. On top of that: if this module is already the active
            // one (so the click is a no-op navigation-wise), treat the
            // click as a toggle instead — first click expands, clicking
            // again collapses, next click expands again — rather than
            // silently doing nothing once you're already on that page.
            if (isModuleActive) {
              e.preventDefault();
              onToggleExpand(module.key);
            }
          }}
        >
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
          {children.map((child) => {
            const favorited = isFavorited(favorites, child.key);
            return (
              <div key={child.key} className="bp-sidebar-subrow">
                <NavLink
                  to={child.path}
                  className={"bp-sidebar-sublink" + (isChildActive(child, location) ? " is-active" : "")}
                >
                  {child.label}
                </NavLink>
                <button
                  type="button"
                  className={"bp-sidebar-fav" + (favorited ? " is-favorited" : "")}
                  onClick={() => onToggleFavorite(child)}
                  aria-label={favorited ? `Unfavorite ${child.label}` : `Favorite ${child.label}`}
                  title={favorited ? "Unfavorite" : "Favorite"}
                >
                  ★
                </button>
              </div>
            );
          })}
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
  const [favorites, setFavoritesState] = useState(() => getFavorites());

  function onToggleFavorite(item) {
    setFavoritesState((prev) => toggleFavorite(prev, item));
  }

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

  function renderLeaf(item, favoritable = false) {
    const favorited = favoritable && isFavorited(favorites, item.key);
    return (
      <div key={item.key} className={favoritable ? "bp-sidebar-leafrow" : undefined}>
        <NavLink
          to={item.path}
          end={item.path === "/"}
          className={({ isActive }) => "bp-sidebar-link" + (isActive ? " is-active" : "")}
        >
          <span className="bp-sidebar-icon" aria-hidden="true">{item.icon}</span>
          <span>{item.label}</span>
        </NavLink>
        {favoritable && (
          <button
            type="button"
            className={"bp-sidebar-fav" + (favorited ? " is-favorited" : "")}
            onClick={() => onToggleFavorite(item)}
            aria-label={favorited ? `Unfavorite ${item.label}` : `Favorite ${item.label}`}
            title={favorited ? "Unfavorite" : "Favorite"}
          >
            ★
          </button>
        )}
      </div>
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
                  favorites={favorites}
                  onToggleFavorite={onToggleFavorite}
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
                favorites={favorites}
                onToggleFavorite={onToggleFavorite}
                location={location}
              />
            ) : (
              renderLeaf(item, true)
            )
          )}
        </nav>
      </aside>
    </>
  );
}
