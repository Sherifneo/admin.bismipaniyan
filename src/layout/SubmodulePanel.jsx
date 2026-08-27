import { NavLink } from "react-router-dom";
import "./SubmodulePanel.css";

function pathnameOf(path) {
  return path.split("?")[0];
}

// A child's own link is "active" when the full pathname+search matches
// (so, for a tab-backed child, only ITS OWN tab lights up) — falling
// back to a pathname-only match for a plain (non-tab) child that has no
// query string of its own.
export function isChildActive(child, location) {
  if (location.pathname !== pathnameOf(child.path)) return false;
  if (!child.path.includes("?")) return true;
  return `${location.pathname}${location.search}` === child.path;
}

// Groups children by their optional `group` label, preserving each
// group's first-seen order and keeping ungrouped children (e.g.
// Finance's "Financial Year") in a trailing, header-less section.
function groupChildren(children) {
  const groups = [];
  const byName = new Map();
  const ungrouped = [];
  for (const child of children) {
    if (!child.group) {
      ungrouped.push(child);
      continue;
    }
    if (!byName.has(child.group)) {
      const group = { name: child.group, items: [] };
      byName.set(child.group, group);
      groups.push(group);
    }
    byName.get(child.group).items.push(child);
  }
  if (ungrouped.length > 0) groups.push({ name: null, items: ungrouped });
  return groups;
}

// The second panel of the two-panel nav: given the currently-selected
// main module, lists its children (grouped where navConfig.js supplies a
// `group` label) as direct links into the existing routes/tabs — no
// change to routing, this is purely a different way to present the same
// NAV_ITEMS tree. `variant` only switches root-level layout classes
// (floating flyout on desktop vs. full-width in-flow on mobile); the
// content/markup below is identical either way so there is exactly one
// implementation to keep in sync with navConfig.js.
export default function SubmodulePanel({ module, location, onNavigate, variant = "flyout" }) {
  const groups = groupChildren(module.children);

  return (
    <div className={"bp-submodule-panel" + (variant === "mobile" ? " is-mobile" : "")}>
      <div className="bp-submodule-panel-header">
        <span className="bp-submodule-panel-icon" aria-hidden="true">{module.icon}</span>
        <span className="bp-submodule-panel-title">{module.label}</span>
      </div>
      <div className="bp-submodule-panel-body">
        {groups.map((group, idx) => (
          <div className="bp-submodule-group" key={group.name || `_ungrouped_${idx}`}>
            {group.name && <div className="bp-submodule-group-label">{group.name}</div>}
            {group.items.map((child) => (
              <NavLink
                key={child.key}
                to={child.path}
                className={"bp-submodule-link" + (isChildActive(child, location) ? " is-active" : "")}
                aria-current={isChildActive(child, location) ? "page" : undefined}
                onClick={() => onNavigate?.(child)}
              >
                {child.label}
              </NavLink>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
