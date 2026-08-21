import { useEffect, useRef, useState } from "react";
import { exportCsv } from "../utils/exportCsv";
import { ApiError } from "../api/client";
import "./ExportMenu.css";

// Single small icon button — click opens a compact dropdown with export
// options. `rows`/`columns` are the current-page export (instant,
// client-side only). `fetchFullRows`/`fullColumns`/`params` are optional —
// when provided, the menu also offers "Export all (full)", which calls the
// server for every row matching the current filters. Omit the full* props
// on a page that has no full-export endpoint yet.
export default function ExportMenu({ filename, columns, rows, fullColumns, fetchFullRows, params }) {
  const [open, setOpen] = useState(false);
  const [loadingFull, setLoadingFull] = useState(false);
  const [error, setError] = useState("");
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [open]);

  function exportCurrentPage() {
    setError("");
    exportCsv(filename, columns, rows || []);
    setOpen(false);
  }

  async function exportFull() {
    setError("");
    setLoadingFull(true);
    try {
      const { rows: fullRows, truncated } = await fetchFullRows(params);
      if (!fullRows || fullRows.length === 0) {
        setError("No rows match the current filters.");
        return;
      }
      exportCsv(filename + "-full", fullColumns, fullRows);
      if (truncated) {
        setError("Capped at the row limit — narrow your filters to get everything.");
      } else {
        setOpen(false);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not export.");
    } finally {
      setLoadingFull(false);
    }
  }

  return (
    <div className="bp-export-wrap" ref={wrapRef}>
      <button
        type="button"
        className="bp-export-btn"
        title="Export"
        aria-label="Export"
        onClick={() => setOpen((v) => !v)}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      </button>
      {open && (
        <div className="bp-export-menu">
          <button type="button" className="bp-export-item" onClick={exportCurrentPage} disabled={!rows || rows.length === 0}>
            Export current page
            <span className="bp-export-item-sub">Only the rows shown on screen</span>
          </button>
          {fetchFullRows && (
            <button type="button" className="bp-export-item" onClick={exportFull} disabled={loadingFull}>
              {loadingFull ? "Exporting…" : "Export all (full)"}
              <span className="bp-export-item-sub">Every matching row, line-item detail</span>
            </button>
          )}
          {error && <div className="bp-export-error">{error}</div>}
        </div>
      )}
    </div>
  );
}
