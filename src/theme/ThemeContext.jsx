import { createContext, useCallback, useContext, useEffect, useState } from "react";

const ThemeContext = createContext(null);
const STORAGE_KEY = "bp_admin_theme";

// "system" stamps data-theme="system" (Glass mode's dark-detection CSS
// still follows prefers-color-scheme normally for this value — the
// :not([data-theme="light"]) selectors it uses match "system" fine, so
// Glass mode's OS-following behavior is unaffected). "light"/"dark" are
// explicit user overrides. All four are stamped as data-theme on <html>
// and persisted so they survive a reload — "system" needs to be a real,
// present attribute value (not just "no attribute") so Standard mode's
// CSS can give it its own fixed palette distinct from Light/Dark (see
// theme.css's [data-mode="standard"][data-theme="system"] block) rather
// than only being a deferral to the OS.
//
// "business" is a 4th theme choice — a distinct light blue/white
// business-tool look, Standard-mode-only by design (see theme.css's
// [data-mode="standard"][data-theme="business"] block and
// ProfilePage.jsx, which only shows this swatch while Mode=Standard).
// Selecting it while Glass mode is active is a reachable combination
// (nothing blocks setting data-theme="business" directly) but has no
// Glass-specific styling of its own — theme.css's Glass dark-detection
// selector list explicitly excludes it (see the ":not([data-theme=...])"
// comment there) so it falls back to reading as Glass Light rather than
// accidentally matching the dark branch.
function getStoredPreference() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system" || stored === "business") return stored;
  } catch {
    // localStorage unavailable (private mode, disabled) — fall back to system.
  }
  return "system";
}

function applyPreference(pref) {
  document.documentElement.setAttribute("data-theme", pref);
}

export function ThemeProvider({ children }) {
  const [preference, setPreference] = useState(getStoredPreference);

  useEffect(() => {
    applyPreference(preference);
  }, [preference]);

  const setTheme = useCallback((pref) => {
    setPreference(pref);
    try {
      localStorage.setItem(STORAGE_KEY, pref);
    } catch {
      // Best-effort persistence only — the in-memory state still updates.
    }
  }, []);

  const toggleTheme = useCallback(() => {
    const systemPrefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
    const effectiveIsDark = preference === "dark" || (preference === "system" && systemPrefersDark);
    setTheme(effectiveIsDark ? "light" : "dark");
  }, [preference, setTheme]);

  return (
    <ThemeContext.Provider value={{ preference, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}
