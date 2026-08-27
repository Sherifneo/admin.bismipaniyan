// Favorited individual pages (leaves AND submodule/tab pages, e.g. "UOM"
// or "Ledger Transaction" — not just whole modules, unlike the separate
// module-level Pin feature in sidebarState.js). Stores the full nav item
// { key, label, path } so the header dropdown can render/link to it
// without re-walking NAV_ITEMS. Per-browser localStorage, same
// try/catch pattern as sidebarState.js / ThemeContext.jsx.
const FAVORITES_KEY = "bp_admin_favorites";
// Same document-event pattern as api/client.js's AUTH_EVENT — lets
// Header.jsx's dropdown stay in sync with stars toggled in Sidebar.jsx
// without prop-drilling shared state through AppShell.
export const FAVORITES_EVENT = "bp-admin-favorites-change";

export function getFavorites() {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function setFavorites(items) {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(items));
  } catch {
    // Best-effort persistence only — the in-memory state still updates.
  }
  document.dispatchEvent(new Event(FAVORITES_EVENT));
}

export function isFavorited(favorites, key) {
  return favorites.some((f) => f.key === key);
}

export function toggleFavorite(favorites, item) {
  const exists = isFavorited(favorites, item.key);
  const next = exists ? favorites.filter((f) => f.key !== item.key) : [...favorites, { key: item.key, label: item.label, path: item.path }];
  setFavorites(next);
  return next;
}
