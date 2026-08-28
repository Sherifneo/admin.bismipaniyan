// Sidebar module-level UI state: which submodules are favorited (a
// cross-module list surfaced via a header ★ dropdown, see Header.jsx),
// and which submodule each module was last visited on. Per-browser
// (localStorage), same try/catch-wrapped pattern as ThemeContext.jsx.
// Which module's flyout panel is currently OPEN is deliberately NOT
// persisted here — that's plain in-memory state in Sidebar.jsx,
// recomputed from the current route on every load.
const FAVORITES_KEY = "bp_admin_sidebar_favorites";
const LAST_CHILD_KEY = "bp_admin_sidebar_lastchild";

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

// Favorites — submodule-scoped only (never a main module). Each entry
// carries enough to render the header dropdown directly, with no need to
// re-walk navConfig.js: { moduleKey, childKey, label, path }.
function getFavoritesList() {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function setFavoritesList(list) {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(list));
  } catch {
    // Best-effort persistence only.
  }
}

export function getFavorites() {
  return getFavoritesList();
}

export function isFavorited(moduleKey, childKey) {
  return getFavoritesList().some((f) => f.moduleKey === moduleKey && f.childKey === childKey);
}

// Toggles a submodule's favorited state; returns the updated list so a
// caller can update its own React state in the same tick.
export function toggleFavorite(moduleKey, childKey, label, path) {
  const list = getFavoritesList();
  const idx = list.findIndex((f) => f.moduleKey === moduleKey && f.childKey === childKey);
  const next = idx >= 0 ? list.filter((_, i) => i !== idx) : [...list, { moduleKey, childKey, label, path }];
  setFavoritesList(next);
  return next;
}
