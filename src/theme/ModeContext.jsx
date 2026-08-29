import { createContext, useCallback, useContext, useEffect, useState } from "react";

const ModeContext = createContext(null);
const STORAGE_KEY = "bp_admin_mode";

// Design mode is independent of light/dark theme (see ThemeContext) —
// "standard" (default for every user, per explicit owner direction as of
// 2026-08-29) is the flat business-tool look, "glass" is the Liquid
// Glass system, opt-in. (This flipped more than once — briefly Standard,
// reverted to Glass, now back to Standard as the real intended default
// for the product-owner demo.) Same try/catch-localStorage pattern as
// ThemeContext.
function getStoredMode() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "glass") return "glass";
  } catch {
    // localStorage unavailable — fall back to the default.
  }
  return "standard";
}

function applyMode(mode) {
  document.documentElement.setAttribute("data-mode", mode);
}

export function ModeProvider({ children }) {
  const [mode, setModeState] = useState(getStoredMode);

  useEffect(() => {
    applyMode(mode);
  }, [mode]);

  const setMode = useCallback((next) => {
    setModeState(next);
    try {
      if (next === "standard") localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Best-effort persistence only — the in-memory state still updates.
    }
  }, []);

  return <ModeContext.Provider value={{ mode, setMode }}>{children}</ModeContext.Provider>;
}

export function useMode() {
  const ctx = useContext(ModeContext);
  if (!ctx) throw new Error("useMode must be used inside <ModeProvider>");
  return ctx;
}
