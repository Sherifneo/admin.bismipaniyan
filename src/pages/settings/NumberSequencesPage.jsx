import { useEffect, useState } from "react";
import { numberSequencesApi } from "../../api/admin";
import { ApiError } from "../../api/client";
import Modal from "../../components/Modal";

// Editable version of the nammahearth Number Sequences pattern, scoped to
// what Bismi actually has today (just purchase_order — no create-new-
// sequence feature, YAGNI per the confirmed scope). List + a Manage modal
// per sequence, with a collision-check button that only appears once
// current_value has actually been changed.
export default function NumberSequencesPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [manageItem, setManageItem] = useState(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await numberSequencesApi.list();
      setItems(data.items || []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load number sequences.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onSaved() {
    setManageItem(null);
    await load();
  }

  return (
    <div>
      <h1 className="bp-page-title">Number Sequences</h1>
      <p className="bp-td-muted" style={{ margin: "-6px 0 14px" }}>
        Controls how numbers like Purchase Order numbers are generated. Owners only.
      </p>

      {error && <div className="bp-inline-error">{error}</div>}

      <div className="bp-table-wrap">
        <table className="bp-table">
          <thead>
            <tr>
              <th>Sequence key</th>
              <th>Prefix</th>
              <th>Next number</th>
              <th>Padding</th>
              <th>Mode</th>
              <th>Status</th>
              <th>Yearly reset</th>
              <th>Last updated</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="bp-table-empty">Loading…</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={9} className="bp-table-empty">No sequences configured yet.</td></tr>
            ) : (
              items.map((c) => (
                <tr key={c.counter_key} style={c.is_active === false ? { opacity: 0.55 } : undefined}>
                  <td className="bp-td-strong">{c.counter_key}</td>
                  <td>{c.prefix}</td>
                  <td className="bp-td-strong">{c.mode === "manual" ? "—" : c.next_preview}</td>
                  <td className="bp-td-muted">{c.pad_width}</td>
                  <td className="bp-td-muted">{c.mode === "manual" ? "Manual" : "Automatic"}</td>
                  <td className="bp-td-muted">{c.is_active === false ? "Inactive" : "Active"}</td>
                  <td className="bp-td-muted">{c.fiscal_year ? "Yes" : "No"}</td>
                  <td className="bp-td-muted">{c.updated_at ? new Date(c.updated_at).toLocaleString("en-IN") : "—"}</td>
                  <td className="bp-td-actions">
                    <button type="button" className="bp-btn-sm" onClick={() => setManageItem(c)}>Manage</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {manageItem && (
        <ManageSequenceModal counter={manageItem} onClose={() => setManageItem(null)} onDone={onSaved} />
      )}
    </div>
  );
}

function ManageSequenceModal({ counter, onClose, onDone }) {
  const [prefix, setPrefix] = useState(counter.prefix);
  const [padWidth, setPadWidth] = useState(String(counter.pad_width));
  const [fiscalYearOn, setFiscalYearOn] = useState(!!counter.fiscal_year);
  const [currentValue, setCurrentValue] = useState(String(counter.current_value));
  const [mode, setMode] = useState(counter.mode || "automatic");
  const [isActive, setIsActive] = useState(counter.is_active !== false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [collisionResult, setCollisionResult] = useState(null);
  const [checkingCollisions, setCheckingCollisions] = useState(false);

  async function resetSequence() {
    if (!window.confirm(`Reset "${counter.counter_key}" back to 0? The next number issued will restart from 1.`)) return;
    setResetting(true);
    setError("");
    try {
      await numberSequencesApi.reset(counter.counter_key);
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not reset this sequence.");
      setResetting(false);
    }
  }

  const currentValueChanged = String(currentValue) !== String(counter.current_value);

  const padWidthNum = Number(padWidth) || 1;
  const preview = `${prefix}${String((Number(currentValue) || 0) + 1).padStart(padWidthNum, "0")}`;

  async function checkCollisions() {
    setCheckingCollisions(true);
    setCollisionResult(null);
    setError("");
    try {
      const result = await numberSequencesApi.checkCollisions(counter.counter_key, {
        prefix,
        current_value: Number(currentValue),
        pad_width: padWidthNum,
      });
      setCollisionResult(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not check for collisions.");
    } finally {
      setCheckingCollisions(false);
    }
  }

  async function submit(e) {
    e.preventDefault();
    const currentValueNum = Number(currentValue);
    if (!Number.isInteger(currentValueNum) || currentValueNum < 0) {
      setError("Current value must be a non-negative whole number.");
      return;
    }
    if (!Number.isInteger(padWidthNum) || padWidthNum < 1 || padWidthNum > 12) {
      setError("Padding must be a whole number between 1 and 12.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await numberSequencesApi.update(counter.counter_key, {
        prefix,
        pad_width: padWidthNum,
        fiscal_year: fiscalYearOn ? new Date().getFullYear().toString() : null,
        current_value: currentValueNum,
        mode,
        is_active: isActive,
      });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save this sequence.");
      setSubmitting(false);
    }
  }

  return (
    <Modal title={`Manage — ${counter.counter_key}`} onClose={onClose}>
      <form onSubmit={submit} className="bp-form">
        {error && <div className="bp-inline-error">{error}</div>}

        <div className="bp-form-row">
          <div style={{ flex: 1 }}>
            <label className="bp-field-label" htmlFor="nsPrefix">Prefix</label>
            <input id="nsPrefix" type="text" className="bp-field-input" value={prefix} onChange={(e) => setPrefix(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label className="bp-field-label" htmlFor="nsPad">Padding (digits)</label>
            <input id="nsPad" type="number" min="1" max="12" className="bp-field-input" value={padWidth} onChange={(e) => setPadWidth(e.target.value)} />
          </div>
        </div>

        <label className="bp-field-label" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input type="checkbox" checked={fiscalYearOn} onChange={(e) => setFiscalYearOn(e.target.checked)} />
          Yearly reset
        </label>

        <label className="bp-field-label">Mode</label>
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <button type="button" className={mode === "automatic" ? "bp-btn-sm bp-btn-primary" : "bp-btn-sm bp-btn-outline"} onClick={() => setMode("automatic")}>
            Automatic
          </button>
          <button type="button" className={mode === "manual" ? "bp-btn-sm bp-btn-primary" : "bp-btn-sm bp-btn-outline"} onClick={() => setMode("manual")}>
            Manual
          </button>
        </div>
        <p className="bp-td-muted" style={{ fontSize: 12, marginTop: -6, marginBottom: 12 }}>
          {mode === "manual"
            ? "Staff must type the code themselves when creating a new record — nothing is auto-generated."
            : "The system generates the next code automatically from the current value below."}
        </p>

        <label className="bp-field-label">Status</label>
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <button type="button" className={isActive ? "bp-btn-sm bp-btn-primary" : "bp-btn-sm bp-btn-outline"} onClick={() => setIsActive(true)}>
            Active
          </button>
          <button type="button" className={!isActive ? "bp-btn-sm bp-btn-primary" : "bp-btn-sm bp-btn-outline"} onClick={() => setIsActive(false)}>
            Inactive
          </button>
        </div>
        <p className="bp-td-muted" style={{ fontSize: 12, marginTop: -6, marginBottom: 12 }}>
          {!isActive && "While Inactive, no new records can be created using this sequence until it's turned back on."}
        </p>

        <label className="bp-field-label" htmlFor="nsCurrent">Current value (last number issued)</label>
        <input
          id="nsCurrent"
          type="number"
          min="0"
          step="1"
          className="bp-field-input"
          value={currentValue}
          onChange={(e) => { setCurrentValue(e.target.value); setCollisionResult(null); }}
          disabled={mode === "manual"}
        />
        {mode !== "manual" && (
          <p className="bp-td-muted" style={{ fontSize: 12, marginTop: -6 }}>
            Editing this manually overrides/re-points the sequence — the next number issued will be <strong>{preview}</strong>.
          </p>
        )}

        <div style={{ marginBottom: 14 }}>
          <button type="button" className="bp-btn-sm bp-btn-outline" onClick={resetSequence} disabled={resetting}>
            {resetting ? "Resetting…" : "Reset to 0"}
          </button>
        </div>

        {currentValueChanged && (
          <div style={{ marginBottom: 10 }}>
            <button type="button" className="bp-btn-sm bp-btn-outline" onClick={checkCollisions} disabled={checkingCollisions}>
              {checkingCollisions ? "Checking…" : "Check for conflicts before saving"}
            </button>
            {collisionResult && (
              collisionResult.conflictCount > 0 ? (
                <div className="bp-inline-error" style={{ marginTop: 8 }}>
                  Warning: {collisionResult.conflictCount} existing number{collisionResult.conflictCount === 1 ? "" : "s"} under this prefix would collide with or be behind {collisionResult.next_preview}. You can still save, but double check before doing so.
                </div>
              ) : (
                <div className="bp-td-muted" style={{ marginTop: 8 }}>No conflicts found.</div>
              )
            )}
          </div>
        )}

        <div className="bp-form-actions">
          <button type="button" className="bp-btn-outline" onClick={onClose} disabled={submitting}>Cancel</button>
          <button type="submit" className="bp-btn-primary" disabled={submitting}>{submitting ? "Saving…" : "Save changes"}</button>
        </div>
      </form>
    </Modal>
  );
}
