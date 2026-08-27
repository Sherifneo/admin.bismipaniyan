import { useEffect, useState } from "react";
import { numberSequencesApi } from "../../api/admin";
import { ApiError } from "../../api/client";
import Modal from "../../components/Modal";
import { useDataTable, SearchByBar, ColumnHeader, ColumnChooserButton } from "../../components/DataTable";

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

  const columns = [
    { key: "counter_key", label: "Sequence key", accessor: (c) => c.counter_key },
    { key: "module", label: "Module", accessor: (c) => c.module || "" },
    { key: "prefix", label: "Prefix", accessor: (c) => c.prefix },
    { key: "next_preview", label: "Next number", accessor: (c) => (c.mode === "manual" ? "—" : c.next_preview), filter: false },
    { key: "pad_width", label: "Padding", accessor: (c) => c.pad_width, filter: "number" },
    {
      key: "mode", label: "Mode", accessor: (c) => (c.mode === "manual" ? "Manual" : "Automatic"), filter: "select",
      options: [{ value: "Automatic", label: "Automatic" }, { value: "Manual", label: "Manual" }],
    },
    {
      key: "status", label: "Status", accessor: (c) => (c.is_active === false ? "Inactive" : "Active"), filter: "select",
      options: [{ value: "Active", label: "Active" }, { value: "Inactive", label: "Inactive" }],
    },
    {
      key: "fiscal_year_reset", label: "Yearly reset", accessor: (c) => (c.fiscal_year ? "Yes" : "No"), filter: "select",
      options: [{ value: "Yes", label: "Yes" }, { value: "No", label: "No" }],
    },
    { key: "updated_at", label: "Last updated", accessor: (c) => c.updated_at || "", filter: "dateRange" },
  ];
  const table = useDataTable({ rows: items, columns, rowKey: (c) => c.counter_key });

  return (
    <div>
      <h1 className="bp-page-title">Number Sequences</h1>
      <p className="bp-td-muted" style={{ margin: "-6px 0 14px" }}>
        Controls how numbers like Purchase Order numbers are generated. Owners only.
      </p>

      {error && <div className="bp-inline-error">{error}</div>}

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <ColumnChooserButton table={table} columns={columns} />
      </div>
      <SearchByBar table={table} columns={columns} />

      <div className="bp-table-wrap">
        <table className="bp-table">
          <thead>
            <tr>
              {table.isColumnVisible("counter_key") && <ColumnHeader table={table} column={columns[0]} />}
              {table.isColumnVisible("module") && <ColumnHeader table={table} column={columns[1]} />}
              {table.isColumnVisible("prefix") && <ColumnHeader table={table} column={columns[2]} />}
              {table.isColumnVisible("next_preview") && <th>Next number</th>}
              {table.isColumnVisible("pad_width") && <ColumnHeader table={table} column={columns[4]} />}
              {table.isColumnVisible("mode") && <ColumnHeader table={table} column={columns[5]} />}
              {table.isColumnVisible("status") && <ColumnHeader table={table} column={columns[6]} />}
              {table.isColumnVisible("fiscal_year_reset") && <ColumnHeader table={table} column={columns[7]} />}
              {table.isColumnVisible("updated_at") && <ColumnHeader table={table} column={columns[8]} />}
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} className="bp-table-empty">Loading…</td></tr>
            ) : table.filteredRows.length === 0 ? (
              <tr><td colSpan={10} className="bp-table-empty">No sequences found.</td></tr>
            ) : (
              table.filteredRows.map((c) => (
                <tr key={c.counter_key} style={c.is_active === false ? { opacity: 0.55 } : undefined}>
                  {table.isColumnVisible("counter_key") && <td className="bp-td-strong">{c.counter_key}</td>}
                  {table.isColumnVisible("module") && <td className="bp-td-muted">{c.module || "—"}</td>}
                  {table.isColumnVisible("prefix") && <td>{c.prefix}</td>}
                  {table.isColumnVisible("next_preview") && <td className="bp-td-strong">{c.mode === "manual" ? "—" : c.next_preview}</td>}
                  {table.isColumnVisible("pad_width") && <td className="bp-td-muted">{c.pad_width}</td>}
                  {table.isColumnVisible("mode") && <td className="bp-td-muted">{c.mode === "manual" ? "Manual" : "Automatic"}</td>}
                  {table.isColumnVisible("status") && <td className="bp-td-muted">{c.is_active === false ? "Inactive" : "Active"}</td>}
                  {table.isColumnVisible("fiscal_year_reset") && <td className="bp-td-muted">{c.fiscal_year ? "Yes" : "No"}</td>}
                  {table.isColumnVisible("updated_at") && <td className="bp-td-muted">{c.updated_at ? new Date(c.updated_at).toLocaleString("en-IN") : "—"}</td>}
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
  const [lastRecord, setLastRecord] = useState(undefined); // undefined = loading, null = none found
  const [clearing, setClearing] = useState(false);
  const [syncing, setSyncing] = useState(false);

  function loadLastRecord() {
    setLastRecord(undefined);
    numberSequencesApi.lastRecord(counter.counter_key).then(setLastRecord).catch(() => setLastRecord(null));
  }

  useEffect(() => {
    loadLastRecord();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [counter.counter_key]);

  async function syncToReality() {
    setSyncing(true);
    setError("");
    try {
      const result = await numberSequencesApi.sync(counter.counter_key);
      setCurrentValue(String(result.current_value));
      loadLastRecord();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not sync this sequence.");
    } finally {
      setSyncing(false);
    }
  }

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

  async function clearLastRecord() {
    if (!lastRecord) return;
    if (!window.confirm(`Permanently delete "${lastRecord.code} — ${lastRecord.label}"? This cannot be undone — the code will become free to reuse.`)) return;
    setClearing(true);
    setError("");
    try {
      await numberSequencesApi.clearLast(counter.counter_key, lastRecord.pk);
      setLastRecord(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not clear this record.");
    } finally {
      setClearing(false);
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

        <label className="bp-field-label">Last record (holds the highest code in use)</label>
        {lastRecord === undefined ? (
          <p className="bp-td-muted" style={{ fontSize: 12, marginTop: -4, marginBottom: 10 }}>Loading…</p>
        ) : lastRecord === null ? (
          <p className="bp-td-muted" style={{ fontSize: 12, marginTop: -4, marginBottom: 10 }}>No records created under this sequence yet.</p>
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
            <span className="bp-td-muted" style={{ fontSize: 13 }}>
              <strong className="bp-td-strong">{lastRecord.code}</strong> — {lastRecord.label}
              {lastRecord.is_active === false && (
                <span className="bp-badge bp-badge-warning" style={{ marginLeft: 8 }}>Inactive — still reserves this code</span>
              )}
            </span>
            <button type="button" className="bp-btn-sm bp-btn-outline" onClick={clearLastRecord} disabled={clearing}>
              {clearing ? "Clearing…" : "Clear"}
            </button>
          </div>
        )}
        <p className="bp-td-muted" style={{ fontSize: 12, marginTop: -6, marginBottom: 12 }}>
          A code stays reserved even if the record holding it was later deactivated — "Clear" permanently deletes that
          record to free the code up. If the record is real data you don't want to delete, use "Sync to match records"
          instead — it moves the current value past this code without touching the record.
        </p>

        <div style={{ marginBottom: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" className="bp-btn-sm bp-btn-outline" onClick={syncToReality} disabled={syncing}>
            {syncing ? "Syncing…" : "Sync to match records"}
          </button>
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
