import { useState } from "react";

// Shared search form: text input + submit button, resets to page 1 on
// submit — submit-triggered, not live/debounced, same behavior on every
// list screen. `initialValue` seeds the box from a term the header's
// GlobalSearch already navigated here with (see useUrlSearch) — the
// page's own `q` state is seeded separately and does the actual
// filtering; this only keeps the visible input in sync with it.
export default function SearchBox({ placeholder, onSearch, initialValue }) {
  const [value, setValue] = useState(initialValue || "");

  function submit(e) {
    e.preventDefault();
    onSearch(value.trim());
  }

  return (
    <form onSubmit={submit} className="bp-searchbox">
      <input
        type="text"
        className="bp-field-input"
        placeholder={placeholder || "Search…"}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <button type="submit" className="bp-btn-outline">Search</button>
    </form>
  );
}
