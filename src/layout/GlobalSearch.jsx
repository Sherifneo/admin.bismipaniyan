import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { NAV_ITEMS } from "./navConfig";
import "./GlobalSearch.css";

// Modules a term/date search actually means something for — excludes
// pure-settings/dashboard/report screens with no row-searchable list.
// Each target page reads ?q=&from=&to= on mount and seeds its own
// existing search state with them (see e.g. CustomersList.jsx) — this
// component doesn't render results itself, it's a launcher.
const SEARCHABLE_KEYS = new Set([
  "waorders", "salesorders", "stores", "customers", "cashbook", "bankaccounts",
  "products", "inventory", "partners", "vendors", "purchaseorders",
  "production", "machines", "costparameters", "team",
]);

const SEARCHABLE_MODULES = NAV_ITEMS.filter((item) => SEARCHABLE_KEYS.has(item.key));

export default function GlobalSearch() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [moduleKey, setModuleKey] = useState(SEARCHABLE_MODULES[0]?.key || "");
  const [term, setTerm] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [open]);

  function submit(e) {
    e.preventDefault();
    const module = SEARCHABLE_MODULES.find((m) => m.key === moduleKey);
    if (!module) return;
    const params = new URLSearchParams();
    if (term.trim()) params.set("q", term.trim());
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const qs = params.toString();
    navigate(qs ? `${module.path}?${qs}` : module.path);
    setOpen(false);
  }

  const activeModule = SEARCHABLE_MODULES.find((m) => m.key === moduleKey);

  return (
    <div className="bp-header-search" ref={wrapRef}>
      <button type="button" className="bp-header-search-trigger" onClick={() => setOpen((v) => !v)}>
        <span className="bp-header-search-icon" aria-hidden="true">🔍</span>
        <span className="bp-header-search-trigger-text">
          {activeModule ? `Search ${activeModule.label}…` : "Search…"}
        </span>
      </button>
      {open && (
        <form className="bp-header-search-panel" onSubmit={submit}>
          <label className="bp-field-label" htmlFor="gsModule">Module</label>
          <select
            id="gsModule"
            className="bp-field-input"
            value={moduleKey}
            onChange={(e) => setModuleKey(e.target.value)}
            autoFocus
          >
            {SEARCHABLE_MODULES.map((m) => (
              <option key={m.key} value={m.key}>{m.label}</option>
            ))}
          </select>

          <label className="bp-field-label" htmlFor="gsTerm">Search term</label>
          <input
            id="gsTerm"
            type="text"
            className="bp-field-input"
            placeholder="Name, code, phone…"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
          />

          <label className="bp-field-label">Date range (optional)</label>
          <div style={{ display: "flex", gap: 6 }}>
            <input type="date" className="bp-field-input" value={from} onChange={(e) => setFrom(e.target.value)} title="From" />
            <input type="date" className="bp-field-input" value={to} onChange={(e) => setTo(e.target.value)} title="To" />
          </div>

          <button type="submit" className="bp-btn-primary" style={{ marginTop: 10 }}>
            Search {activeModule?.label}
          </button>
        </form>
      )}
    </div>
  );
}
