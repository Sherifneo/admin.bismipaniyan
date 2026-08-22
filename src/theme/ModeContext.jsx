import { createContext, useCallback, useContext, useEffect, useState } from "react";

const ModeContext = createContext(null);
const STORAGE_KEY = "bp_admin_mode";

// Design mode is independent of light/dark theme (see ThemeContext) —
// "glass" (default for every user, per explicit user direction) is the
// Liquid Glass system, "standard" is the flat business-tool look,
// opt-in. (This flipped once already — briefly made "standard" the
// default, reverted back to "glass" being the real intended default.)
// Same try/catch-localStorage pattern as ThemeContext.
function getStoredMode() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "standard") return "standard";
  } catch {
    // localStorage unavailable — fall back to the default.
  }
  return "glass";
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
      if (next === "glass") localStorage.removeItem(STORAGE_KEY);
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
