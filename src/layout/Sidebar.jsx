import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { NAV_ITEMS } from "./navConfig";
import { getLastChild, setLastChild } from "./sidebarState";
import SubmodulePanel from "./SubmodulePanel";
import "./Sidebar.css";

// Two-panel ERP-style navigation: a narrow "rail" of Main Modules
// (this file) plus a separate flyout SubmodulePanel that opens beside
// it when a module with children is selected. On desktop the two are
// siblings positioned side by side; on mobile the drawer shows one view
// at a time (Main Modules, or the selected module's submenu) and swaps
// between them in place — see the mobileView state below.
//
// NAV_ITEMS is a tree: a top-level entry either has its own `path`
// (standalone leaf, e.g. Dashboard/WhatsApp Orders/Partners) or
// `children` (a module, e.g. Finance/Products). A module is visible if
// at least one child passes the existing ownerOnly/requiredPermission
// check — same gating rules as before, just applied per-child instead
// of per-flat-item. App.jsx still generates routes off the same
// NAV_ITEMS source (flattened, see App.jsx) — this component never
// mutates that source, only decides what/how to render.
function isVisible(item, admin, hasPermission) {
  if (item.ownerOnly && admin?.role !== "owner") return false;
  if (item.requiredPermission && !hasPermission(item.requiredPermission)) return false;
  return true;
}

function pathnameOf(path) {
  return path.split("?")[0];
}

function isModuleActive(module, location) {
  return module.children.some((child) => location.pathname === pathnameOf(child.path));
}

// Resolves which child path to navigate to when a module is selected:
// the last-visited child for that module (if still present among its
// currently-visible children), else its first/default child.
function resolveTargetChild(module, lastChildKey) {
  if (lastChildKey) {
    const remembered = module.children.find((c) => c.key === lastChildKey);
    if (remembered) return remembered;
  }
  return module.children[0];
}

export default function Sidebar({ mobileOpen, onClose }) {
  const { admin, hasPermission } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Which module's flyout panel is open — plain in-memory state, never
  // persisted (owner requirement). Initialized from whichever module
  // owns the current route so a hard reload lands with the right module
  // selected on the rail; the panel itself still starts CLOSED (see
  // panelOpen below) rather than auto-opening.
  const initialActiveModule = NAV_ITEMS.find((item) => item.children && isModuleActive(item, location));
  const [selectedModuleKey, setSelectedModuleKey] = useState(initialActiveModule?.key || null);
  const [panelOpen, setPanelOpen] = useState(false);
  // The clicked module row's vertical offset within the rail, used to
  // position the flyout level with what was actually clicked instead of
  // a fixed top offset (previously hardcoded in Sidebar.css, which made
  // the flyout pop up near the top of the viewport for any module below
  // the first one or two in the rail — a real visual bug).
  const [flyoutTop, setFlyoutTop] = useState(12);

  // Mobile drawer has its own two-view state, independent of the
  // desktop panel above. Always resets to the Main Modules view every
  // time the drawer opens (owner requirement) — see the effect below.
  const [mobileView, setMobileView] = useState("modules");
  const [mobileActiveModule, setMobileActiveModule] = useState(null);
  const wasMobileOpen = useRef(mobileOpen);
  useEffect(() => {
    if (mobileOpen && !wasMobileOpen.current) {
      setMobileView("modules");
      setMobileActiveModule(null);
    }
    wasMobileOpen.current = mobileOpen;
  }, [mobileOpen]);

  // Keep the rail's selected module in sync with the current route
  // (e.g. after navigating via a direct link, browser back/forward, or
  // a deep link) without forcing the panel open — only the highlight
  // follows the route; open/closed is a separate, purely-click-driven
  // state (see onSelectModule/onToggleChevron below).
  useEffect(() => {
    const activeModule = NAV_ITEMS.find((item) => item.children && isModuleActive(item, location));
    if (activeModule) setSelectedModuleKey(activeModule.key);
  }, [location.pathname]);

  const panelRef = useRef(null);
  const railRef = useRef(null);

  // Click-away-to-close (desktop only — mobile has its own Back
  // control instead). Same idiom as the former Header FavoritesMenu.
  useEffect(() => {
    if (!panelOpen) return;
    function onOutside(e) {
      if (panelRef.current?.contains(e.target)) return;
      if (railRef.current?.contains(e.target)) return;
      setPanelOpen(false);
    }
    function onEscape(e) {
      if (e.key === "Escape") setPanelOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, [panelOpen]);

  // Positions the flyout level with the row that was actually clicked,
  // clamped so it never renders below the visible viewport for a module
  // near the bottom of a long rail — SubmodulePanel.css's own
  // max-height/overflow-y:auto still handles a tall module's content
  // scrolling inside the panel once positioned.
  const FLYOUT_ESTIMATED_HEIGHT = 420;
  function positionFlyoutFromEvent(e) {
    const rowRect = e.currentTarget.closest(".bp-rail-module")?.getBoundingClientRect();
    if (!rowRect) return;
    const railRect = railRef.current?.getBoundingClientRect();
    const railTop = railRect?.top ?? 0;
    const relativeTop = rowRect.top - railTop;
    const maxTop = Math.max(12, window.innerHeight - railTop - FLYOUT_ESTIMATED_HEIGHT);
    setFlyoutTop(Math.min(Math.max(relativeTop, 12), maxTop));
  }

  // Clicking a module's row (label/icon/anywhere but the chevron):
  //  - unselected module -> select it, open the panel, navigate to its
  //    remembered-or-default child.
  //  - already-selected module -> close the panel only, page unchanged.
  function onSelectModule(module, e) {
    if (selectedModuleKey === module.key && panelOpen) {
      setPanelOpen(false);
      return;
    }
    if (e) positionFlyoutFromEvent(e);
    setSelectedModuleKey(module.key);
    setPanelOpen(true);
    const target = resolveTargetChild(module, getLastChild(module.key));
    navigate(target.path);
  }

  // Chevron: toggles the panel open/closed only, never navigates. If it
  // opens a module that wasn't already selected, it selects it too (so
  // the panel shows the right content) but still doesn't touch the URL.
  function onToggleChevron(module, e) {
    if (selectedModuleKey === module.key) {
      setPanelOpen((v) => !v);
    } else {
      if (e) positionFlyoutFromEvent(e);
      setSelectedModuleKey(module.key);
      setPanelOpen(true);
    }
  }

  function onPanelNavigate(child) {
    if (selectedModule) setLastChild(selectedModule.key, child.key);
    setPanelOpen(false);
  }

  // Mobile: tapping a module navigates to its remembered/default child
  // (same target-resolution as desktop) and switches to the submenu
  // view within the same drawer session.
  function onSelectModuleMobile(module) {
    setMobileActiveModule(module);
    setMobileView("submenu");
    const target = resolveTargetChild(module, getLastChild(module.key));
    navigate(target.path);
  }

  function onMobileBack() {
    setMobileView("modules");
    setMobileActiveModule(null);
  }

  function onMobilePanelNavigate(child) {
    if (mobileActiveModule) setLastChild(mobileActiveModule.key, child.key);
    onClose();
  }

  // Dashboard stays first, fixed, never a module/pinnable.
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

  const selectedModule = visibleItems.find((item) => item.children && item.key === selectedModuleKey);

  function renderLeaf(item) {
    return (
      <NavLink
        key={item.key}
        to={item.path}
        end={item.path === "/"}
        className={({ isActive }) => "bp-rail-link" + (isActive ? " is-active" : "")}
      >
        <span className="bp-rail-icon" aria-hidden="true">{item.icon}</span>
        <span className="bp-rail-label">{item.label}</span>
      </NavLink>
    );
  }

  function renderModuleRow(module) {
    const active = isModuleActive(module, location);
    const selected = selectedModuleKey === module.key && panelOpen;
    return (
      <div
        key={module.key}
        className={"bp-rail-module" + (active ? " is-active" : "") + (selected ? " is-selected" : "")}
      >
        <button type="button" className="bp-rail-module-main" onClick={(e) => onSelectModule(module, e)}>
          <span className="bp-rail-icon" aria-hidden="true">{module.icon}</span>
          <span className="bp-rail-label">{module.label}</span>
        </button>
        <button
          type="button"
          className="bp-rail-chevron"
          onClick={(e) => onToggleChevron(module, e)}
          aria-label={selected ? `Collapse ${module.label}` : `Expand ${module.label}`}
          aria-expanded={selected}
        >
          <span className={"bp-rail-chevron-icon" + (selected ? " is-expanded" : "")} aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </span>
        </button>
      </div>
    );
  }

  function renderMobileModuleRow(module) {
    const active = isModuleActive(module, location);
    return (
      <button
        key={module.key}
        type="button"
        className={"bp-rail-module-main bp-rail-mobile-row" + (active ? " is-active" : "")}
        onClick={() => onSelectModuleMobile(module)}
      >
        <span className="bp-rail-icon" aria-hidden="true">{module.icon}</span>
        <span className="bp-rail-label">{module.label}</span>
        <span className="bp-rail-mobile-arrow" aria-hidden="true">›</span>
      </button>
    );
  }

  return (
    <>
      {mobileOpen && <div className="bp-sidebar-overlay" onClick={onClose} aria-hidden="true" />}
      <div className={"bp-sidebar" + (mobileOpen ? " is-open" : "")}>
        <aside className="bp-sidebar-rail" ref={railRef}>
          <div className="bp-sidebar-brand">
            <span className="bp-sidebar-mark">BP</span>
            <span className="bp-sidebar-title">Bismipaniyan</span>
            <button type="button" className="bp-sidebar-close" onClick={onClose} aria-label="Close menu">
              ✕
            </button>
          </div>

          {/* ---- Mobile: single-view drawer, swaps between Main Modules
              and the selected module's submenu (rendered via SubmodulePanel
              variant="mobile"). Hidden on desktop via CSS. ---- */}
          <nav className="bp-sidebar-nav bp-sidebar-nav-mobile">
            {mobileView === "modules" ? (
              <>
                {dashboardItem && renderLeaf(dashboardItem)}
                <div className="bp-sidebar-section-label">Modules</div>
                {visibleItems.map((item) =>
                  item.children ? renderMobileModuleRow(item) : renderLeaf(item)
                )}
              </>
            ) : (
              mobileActiveModule && (
                <>
                  <button type="button" className="bp-rail-mobile-back" onClick={onMobileBack}>
                    ‹ Back
                  </button>
                  <SubmodulePanel
                    module={mobileActiveModule}
                    location={location}
                    variant="mobile"
                    onNavigate={onMobilePanelNavigate}
                  />
                </>
              )
            )}
          </nav>

          {/* ---- Desktop: Main Modules rail only — the flyout panel is a
              separate sibling element below, not nested in this nav. ---- */}
          <nav className="bp-sidebar-nav bp-sidebar-nav-desktop">
            {dashboardItem && renderLeaf(dashboardItem)}

            <div className="bp-sidebar-section-label">Modules</div>
            {visibleItems.map((item) => (item.children ? renderModuleRow(item) : renderLeaf(item)))}
          </nav>
        </aside>

        {panelOpen && selectedModule && (
          <div ref={panelRef} className="bp-sidebar-flyout" style={{ top: flyoutTop }}>
            <SubmodulePanel
              module={selectedModule}
              location={location}
              variant="flyout"
              onNavigate={onPanelNavigate}
            />
          </div>
        )}
      </div>
    </>
  );
}
