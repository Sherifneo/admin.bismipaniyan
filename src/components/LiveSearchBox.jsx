import { useEffect, useRef, useState } from "react";

// Replaces the old pairing of a big SearchBox + a small SearchByBar
// column-picker on pages that had both — one small debounced live-search
// box: type to see a dropdown of matches (via the page's own list API,
// same q/qField server search already wired), click a match to open that
// record (if the page has one) or just filter to it, press Enter to run
// the existing table search, Escape/click-outside to close. No search
// index, no fuzzy matching — reuses exactly what SearchBox/SearchByBar
// already called into.
export default function LiveSearchBox({
  placeholder = "Search…",
  initialValue = "",
  fetchSuggestions,
  renderSuggestion,
  onSelect,
  onSearch,
}) {
  const [value, setValue] = useState(initialValue);
  const [options, setOptions] = useState([]);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open || !value.trim()) {
      setOptions([]);
      return;
    }
    const handle = setTimeout(() => {
      fetchSuggestions(value.trim()).then(setOptions).catch(() => setOptions([]));
    }, 250);
    return () => clearTimeout(handle);
  }, [value, open, fetchSuggestions]);

  useEffect(() => {
    function onDocClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function pick(row) {
    setOpen(false);
    if (onSelect) {
      onSelect(row);
    } else {
      onSearch(value.trim());
    }
  }

  function submit(e) {
    e.preventDefault();
    setOpen(false);
    onSearch(value.trim());
  }

  return (
    <div ref={wrapRef} style={{ position: "relative", maxWidth: 320 }}>
      <form onSubmit={submit} className="bp-searchbox">
        <input
          type="text"
          className="bp-field-input"
          placeholder={placeholder}
          value={value}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}
          onChange={(e) => { setValue(e.target.value); setOpen(true); }}
        />
        <button type="submit" className="bp-btn-outline">Search</button>
      </form>
      {open && options.length > 0 && (
        <div
          style={{
            position: "absolute", zIndex: 20, left: 0, right: 0, top: "100%",
            border: "1px solid var(--bp-border)", borderRadius: "var(--bp-radius-sm)",
            marginTop: 4, maxHeight: 220, overflow: "auto", background: "var(--bp-surface, #fff)",
          }}
        >
          {options.map((row, i) => (
            <div
              key={i}
              style={{ padding: "6px 10px", fontSize: 13, cursor: "pointer" }}
              onMouseDown={() => pick(row)}
            >
              {renderSuggestion(row)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
