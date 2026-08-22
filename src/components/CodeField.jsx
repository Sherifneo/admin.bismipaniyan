import { useEffect, useState } from "react";
import { numberSequencesApi } from "../api/admin";

// Microsoft Dynamics-style ID field: always visible on a create form,
// showing the code that will be assigned. Read-only and pre-filled with
// the live "next number" preview when that sequence is Automatic;
// editable (starts blank) when it's set to Manual in Number Sequences.
// Any signed-in admin can call the preview endpoint (unlike the owner-
// only sequence list/edit screen), so this works for every role.
export function useCodePreview(counterKey, existingCode) {
  const [mode, setMode] = useState("automatic");
  const [preview, setPreview] = useState("");
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(!existingCode);

  useEffect(() => {
    if (existingCode) return; // editing an existing record — code is fixed, no need to fetch
    let cancelled = false;
    numberSequencesApi
      .preview(counterKey)
      .then((data) => {
        if (cancelled) return;
        setMode(data.mode || "automatic");
        setPreview(data.next_preview || "");
      })
      .catch(() => {
        // Sequence not seeded / preview unreachable — degrade to a plain
        // editable field rather than blocking the form.
        if (!cancelled) setMode("manual");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [counterKey]);

  return { mode, preview, value, setValue, loading, existingCode };
}

export default function CodeField({ label, field, isEdit }) {
  const { mode, preview, value, setValue, loading, existingCode } = field;

  if (isEdit) {
    return (
      <>
        <label className="bp-field-label">{label}</label>
        <input type="text" className="bp-field-input" value={existingCode || "—"} disabled />
      </>
    );
  }

  return (
    <>
      <label className="bp-field-label">{label}</label>
      {mode === "manual" ? (
        <input
          type="text"
          className="bp-field-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Enter a code"
          autoFocus
        />
      ) : (
        <input type="text" className="bp-field-input" value={loading ? "Loading…" : preview} disabled />
      )}
    </>
  );
}
