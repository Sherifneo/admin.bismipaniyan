import { useState } from "react";

// Shared search form: text input + submit button, resets to page 1 on
// submit — submit-triggered, not live/debounced, same behavior on every
// list screen.
export default function SearchBox({ placeholder, onSearch }) {
  const [value, setValue] = useState("");

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
