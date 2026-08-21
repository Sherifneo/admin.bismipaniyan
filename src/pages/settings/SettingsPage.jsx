import { useState } from "react";
import { authApi } from "../../api/admin";
import { ApiError } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";

// Settings currently holds one thing: change your own password. Everything
// else under this nav item (business settings, number sequences) isn't
// built yet — see admin-portal/CLAUDE.md's "What's built vs. not."
export default function SettingsPage() {
  const { admin } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation don't match.");
      return;
    }

    setSubmitting(true);
    try {
      await authApi.changePassword(currentPassword, newPassword);
      setSuccess("Password changed.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not change password.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1 className="bp-page-title">Settings</h1>

      <div className="bp-table-wrap" style={{ padding: 20, maxWidth: 420 }}>
        <h2 style={{ fontSize: 15, marginTop: 0, marginBottom: 4 }}>Change password</h2>
        <p className="bp-td-muted" style={{ marginTop: 0, marginBottom: 16 }}>
          Signed in as {admin?.email}
        </p>

        <form onSubmit={submit} className="bp-form">
          {error && <div className="bp-inline-error">{error}</div>}
          {success && <div className="bp-inline-success">{success}</div>}

          <label className="bp-field-label" htmlFor="currentPassword">Current password</label>
          <input
            id="currentPassword"
            type="password"
            className="bp-field-input"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
            required
          />

          <label className="bp-field-label" htmlFor="newPassword">New password</label>
          <input
            id="newPassword"
            type="password"
            className="bp-field-input"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
          />

          <label className="bp-field-label" htmlFor="confirmPassword">Confirm new password</label>
          <input
            id="confirmPassword"
            type="password"
            className="bp-field-input"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
          />

          <div className="bp-form-actions">
            <button type="submit" className="bp-btn-primary" disabled={submitting}>
              {submitting ? "Saving…" : "Change password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
