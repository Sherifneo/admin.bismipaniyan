// Sidebar module-level UI state: which main modules are pinned, and
// which are manually expanded/collapsed. Per-browser (localStorage),
// same try/catch-wrapped pattern as ThemeContext.jsx and the sidebar
// customization this replaces. Only main-module keys are ever stored
// here — individual leaf/submodule items are never pinnable, matching
// the confirmed "pin main modules only" scope.
const PINNED_KEY = "bp_admin_sidebar_pinned";
const EXPANDED_KEY = "bp_admin_sidebar_expanded";

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

export function getExpanded() {
  return getKeys(EXPANDED_KEY);
}

export function setExpanded(keys) {
  setKeys(EXPANDED_KEY, keys);
}
