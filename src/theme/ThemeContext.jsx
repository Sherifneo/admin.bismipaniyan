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
// "business" was a 4th theme choice (Standard-mode-only) that has been
// removed from the picker — any browser that already has it stored
// (from before this removal) falls back to "system" here rather than
// being read back as a theme that no longer has a picker option.
function getStoredPreference() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") return stored;
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
