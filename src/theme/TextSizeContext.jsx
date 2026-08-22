import { createContext, useCallback, useContext, useEffect, useState } from "react";

const TextSizeContext = createContext(null);
const STORAGE_KEY = "bp_admin_text_size";

// Small/Normal/Large, applied as CSS zoom on <html> rather than
// rewriting every hardcoded px font-size to rem — this app's CSS uses
// fixed pixel sizes throughout, so zoom scales text AND spacing/layout
// together (a rem-only approach would need every size in the codebase
// converted first). Chrome/Edge support zoom natively; Safari doesn't,
// which is an accepted tradeoff here since the admin's actual usage is
// Chrome-based. Same localStorage pattern as Theme/Mode contexts.
function getStoredSize() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "small" || stored === "large") return stored;
  } catch {
    // localStorage unavailable — fall back to normal.
  }
  return "normal";
}

function applySize(size) {
  const root = document.documentElement;
  if (size === "normal") root.removeAttribute("data-text-size");
  else root.setAttribute("data-text-size", size);
}

export function TextSizeProvider({ children }) {
  const [size, setSizeState] = useState(getStoredSize);

  useEffect(() => {
    applySize(size);
  }, [size]);

  const setSize = useCallback((next) => {
    setSizeState(next);
    try {
      if (next === "normal") localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Best-effort persistence only — the in-memory state still updates.
    }
  }, []);

  return <TextSizeContext.Provider value={{ size, setSize }}>{children}</TextSizeContext.Provider>;
}

export function useTextSize() {
  const ctx = useContext(TextSizeContext);
  if (!ctx) throw new Error("useTextSize must be used inside <TextSizeProvider>");
  return ctx;
}
