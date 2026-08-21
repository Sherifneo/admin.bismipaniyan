import { useState } from "react";
import Modal from "./Modal";
import { ApiError } from "../api/client";

// Shared confirm dialog for every destructive/reversal action (delete,
// deactivate, cancel-receipt, cancel run, reverse return) — all of them
// require a non-blank reason that gets persisted to an audit log.
export default function ReasonConfirmModal({
  title,
  message,
  confirmLabel = "Confirm",
  reasonLabel = "Reason",
  danger = true,
  onClose,
  onConfirm,
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!reason.trim()) {
      setError("A reason is required.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await onConfirm(reason.trim());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not complete this action.");
      setSubmitting(false);
    }
  }

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={submit} className="bp-form">
        {message && <p style={{ margin: "0 0 4px", color: "var(--bp-text-muted)" }}>{message}</p>}
        {error && <div className="bp-inline-error">{error}</div>}
        <label className="bp-field-label" htmlFor="reasonConfirmText">{reasonLabel}</label>
        <textarea
          id="reasonConfirmText"
          className="bp-field-input"
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          autoFocus
          required
        />
        <div className="bp-form-actions">
          <button type="button" className="bp-btn-outline" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" className={danger ? "bp-btn-danger" : "bp-btn-primary"} disabled={submitting}>
            {submitting ? "Saving…" : confirmLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}
