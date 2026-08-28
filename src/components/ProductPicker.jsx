import { useEffect, useRef, useState } from "react";
import { productsApi } from "../api/admin";

// Shared searchable product combobox — generalized from InventoryList.jsx's
// RecordMovementModal, which hand-rolled this exact debounced search
// pattern for one screen. Every product picker in the app was previously
// a bare native <select> with its own inconsistent code-display/kind-
// filtering, so this is the one place that gets it right for everyone.
export default function ProductPicker({
  value,
  onChange,
  itemKind,
  ownerId,
  initialLabel = "",
  placeholder = "Search by code or name…",
  required = false,
  disabled = false,
  id,
}) {
  const [query, setQuery] = useState(initialLabel);
  const [options, setOptions] = useState([]);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  // Keep the visible text in sync when the controlled value is set/cleared
  // from outside (e.g. an edit form loading, or a parent resetting the
  // line) without the picker's own search interaction driving it.
  useEffect(() => {
    if (!value) setQuery("");
    else if (initialLabel) setQuery(initialLabel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, initialLabel]);

  useEffect(() => {
    if (!open) return;
    const handle = setTimeout(() => {
      productsApi.list({ q: query, itemKind, ownerId, limit: 10 }).then((data) => setOptions(data.items || [])).catch(() => {});
    }, 250);
    return () => clearTimeout(handle);
  }, [query, itemKind, ownerId, open]);

  useEffect(() => {
    function onDocClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function pick(product) {
    setQuery(product.product_code ? `${product.product_code} — ${product.name}` : product.name);
    setOptions([]);
    setOpen(false);
    onChange(product.product_id, product);
  }

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <input
        id={id}
        type="text"
        className="bp-field-input"
        placeholder={placeholder}
        value={query}
        required={required}
        disabled={disabled}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          // A blur with no product actually picked (typed text, then
          // clicked away without selecting a result) should not leave
          // stale unmatched text behind — every caller's own submit
          // validation checks the real product_id, not this text.
          setTimeout(() => { if (!value) setQuery(""); }, 150);
        }}
        onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          if (value) onChange("", null);
        }}
      />
      {open && options.length > 0 && (
        <div
          style={{
            position: "absolute", zIndex: 20, left: 0, right: 0, top: "100%",
            border: "1px solid var(--bp-border)", borderRadius: "var(--bp-radius-sm)",
            marginTop: 4, maxHeight: 180, overflow: "auto", background: "var(--bp-surface, #fff)",
          }}
        >
          {options.map((p) => (
            <div
              key={p.product_id}
              style={{ padding: "6px 10px", fontSize: 13, cursor: "pointer" }}
              onMouseDown={() => pick(p)}
            >
              {p.product_code ? `${p.product_code} — ` : ""}{p.name}
              {p.uom && <span className="bp-td-muted"> ({p.uom})</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
