// Sidebar module-level UI state: which main modules are pinned, and
// which submodule each module was last visited on. Per-browser
// (localStorage), same try/catch-wrapped pattern as ThemeContext.jsx.
// Only main-module keys are ever pinned — individual leaf/submodule
// items are never pinnable, matching the confirmed "pin main modules
// only" scope. Which module's flyout panel is currently OPEN is
// deliberately NOT persisted here — that's plain in-memory state in
// Sidebar.jsx, recomputed from the current route on every load.
const PINNED_KEY = "bp_admin_sidebar_pinned";
const LAST_CHILD_KEY = "bp_admin_sidebar_lastchild";

function getKeys(storageKey) {
  try {
    const raw = localStorage.getItem(storageKey);
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function setKeys(storageKey, keys) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(keys));
  } catch {
    // Best-effort persistence only — the in-memory state still updates.
  }
}

export function getPinned() {
  return getKeys(PINNED_KEY);
}

export function setPinned(keys) {
  setKeys(PINNED_KEY, keys);
}

// { [moduleKey]: childKey } — the last submodule the user navigated to
// within each module, so re-opening that module later goes straight
// back there instead of always the default (children[0]).
function getLastChildMap() {
  try {
    const raw = localStorage.getItem(LAST_CHILD_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function getLastChild(moduleKey) {
  return getLastChildMap()[moduleKey] || null;
}

export function setLastChild(moduleKey, childKey) {
  const map = getLastChildMap();
  map[moduleKey] = childKey;
  try {
    localStorage.setItem(LAST_CHILD_KEY, JSON.stringify(map));
  } catch {
    // Best-effort persistence only.
  }
}
