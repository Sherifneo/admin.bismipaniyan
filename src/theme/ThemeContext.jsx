import { createContext, useCallback, useContext, useEffect, useState } from "react";

const ThemeContext = createContext(null);
const STORAGE_KEY = "bp_admin_theme";

// "system" defers to prefers-color-scheme (no data-theme attribute set,
// theme.css's @media query drives it). "light"/"dark" are explicit user
// overrides, stamped as data-theme on <html> and persisted so they
// survive a reload. Matches the artifact convention: system default,
// explicit choice wins in both directions.
function getStoredPreference() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // localStorage unavailable (private mode, disabled) — fall back to system.
  }
  return "system";
}

function applyPreference(pref) {
  const root = document.documentElement;
  if (pref === "system") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", pref);
  }
}

export function ThemeProvider({ children }) {
  const [preference, setPreference] = useState(getStoredPreference);

  useEffect(() => {
    applyPreference(preference);
  }, [preference]);

  const setTheme = useCallback((pref) => {
    setPreference(pref);
    try {
      if (pref === "system") localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, pref);
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
