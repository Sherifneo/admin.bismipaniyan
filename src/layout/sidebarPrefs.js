// Per-admin sidebar customization: a custom display order + a set of
// favorited nav item keys, persisted to localStorage. This ONLY affects
// how Sidebar.jsx renders/orders NAV_ITEMS for display — App.jsx still
// generates routes from the original, untouched NAV_ITEMS array. Follows
// the same try/catch-wrapped localStorage pattern as ThemeContext.jsx.
const ORDER_KEY = "bp_admin_sidebar_order";
const FAVORITES_KEY = "bp_admin_sidebar_favorites";

export function getStoredOrder() {
  try {
    const raw = localStorage.getItem(ORDER_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // localStorage unavailable (private mode, disabled) or bad JSON —
    // fall back to no stored order.
    return [];
  }
}

export function setStoredOrder(orderKeys) {
  try {
    localStorage.setItem(ORDER_KEY, JSON.stringify(orderKeys));
  } catch {
    // Best-effort persistence only — the in-memory state still updates.
  }
}

export function getStoredFavorites() {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function setStoredFavorites(favoriteKeys) {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favoriteKeys));
  } catch {
    // Best-effort persistence only.
  }
}

export function clearSidebarPrefs() {
  try {
    localStorage.removeItem(ORDER_KEY);
    localStorage.removeItem(FAVORITES_KEY);
  } catch {
    // Best-effort — nothing else to do if this fails.
  }
}

// Shared sort: favorited items first (custom order within that group),
// then non-favorited items (custom order within that group). Any item
// key not present in storedOrder keeps its original relative NAV_ITEMS
// position within its group (appended in encounter order).
export function sortNavItems(items, storedOrder, favoriteKeys) {
  const favSet = new Set(favoriteKeys);
  const orderIndex = new Map(storedOrder.map((key, i) => [key, i]));

  function withIndex(list) {
    return list
      .map((item, i) => ({ item, i }))
      .sort((a, b) => {
        const ai = orderIndex.has(a.item.key) ? orderIndex.get(a.item.key) : Infinity;
        const bi = orderIndex.has(b.item.key) ? orderIndex.get(b.item.key) : Infinity;
        if (ai !== bi) return ai - bi;
        return a.i - b.i; // stable fallback: original NAV_ITEMS relative position
      })
      .map((x) => x.item);
  }

  const favorited = withIndex(items.filter((item) => favSet.has(item.key)));
  const rest = withIndex(items.filter((item) => !favSet.has(item.key)));
  return [...favorited, ...rest];
}
