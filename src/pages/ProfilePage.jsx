import { useState } from "react";
import { authApi } from "../api/admin";
import { ApiError } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { useTheme } from "../theme/ThemeContext";
import { useMode } from "../theme/ModeContext";
import "./ProfilePage.css";

const ROLE_LABELS = { owner: "Owner", super_user: "Super User", staff: "Staff" };

// Reached via the header avatar/name, not the sidebar (not in NAV_ITEMS —
// see App.jsx's standalone /profile route). Holds identity (who's signed
// in, change password — moved here from Settings, a personal-account
// action belongs with the profile, not app-wide settings) and
// personalization (theme, design mode). Settings keeps sidebar
// customization, which is an app-behavior preference, not identity.
export default function ProfilePage() {
  const { admin } = useAuth();
  const initial = (admin?.full_name || "?").trim().charAt(0).toUpperCase();

  return (
    <div className="bp-profile-page">
      <h1 className="bp-page-title">Your profile</h1>

      <div className="bp-profile-hero bp-card">
        <div className="bp-profile-avatar-lg" aria-hidden="true">{initial}</div>
        <div>
          <div className="bp-profile-name">{admin?.full_name}</div>
          <div className="bp-profile-meta">
            <span className="bp-profile-role-badge">{ROLE_LABELS[admin?.role] || "Staff"}</span>
            <span className="bp-td-muted">{admin?.email}</span>
          </div>
        </div>
      </div>

      <div className="bp-profile-grid">
        <PersonalizationCard />
        <ChangePasswordCard />
      </div>
    </div>
  );
}

function PersonalizationCard() {
  const { preference, setTheme } = useTheme();
  const { mode, setMode } = useMode();

  return (
    <div className="bp-card">
      <h2 className="bp-card-title">Personalization</h2>
      <p className="bp-td-muted" style={{ marginTop: -6, marginBottom: 16 }}>
        Choose how the admin portal looks for you. Saved to this browser.
      </p>

      <div className="bp-profile-field-group">
        <div className="bp-profile-field-label">Theme</div>
        <div className="bp-profile-option-row">
          <ThemeOption current={preference} value="system" label="System" icon="🖥️" onClick={setTheme} />
          <ThemeOption current={preference} value="light" label="Light" icon="☀️" onClick={setTheme} />
          <ThemeOption current={preference} value="dark" label="Dark" icon="🌙" onClick={setTheme} />
        </div>
      </div>

      <div className="bp-profile-field-group">
        <div className="bp-profile-field-label">Design</div>
        <div className="bp-profile-mode-row">
          <ModeOption
            current={mode}
            value="glass"
            label="Liquid Glass"
            description="Translucent, blurred, layered — the default look."
            onClick={setMode}
          />
          <ModeOption
            current={mode}
            value="standard"
            label="Standard"
            description="Flat, solid surfaces. No blur or transparency."
            onClick={setMode}
          />
        </div>
      </div>
    </div>
  );
}

function ThemeOption({ current, value, label, icon, onClick }) {
  const isActive = current === value;
  return (
    <button
      type="button"
      className={"bp-profile-theme-opt" + (isActive ? " is-active" : "")}
      onClick={() => onClick(value)}
      aria-pressed={isActive}
    >
      <span aria-hidden="true" style={{ fontSize: 16 }}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

// Each option renders a small live preview swatch (sidebar strip + card
// strip) styled inline to approximate that mode's real look, rather than
// just naming it — the two modes read differently enough that a picture
// communicates it faster than the label alone.
function ModeOption({ current, value, label, description, onClick }) {
  const isActive = current === value;
  return (
    <button
      type="button"
      className={"bp-profile-mode-opt" + (isActive ? " is-active" : "")}
      onClick={() => onClick(value)}
      aria-pressed={isActive}
    >
      <span className={`bp-profile-mode-swatch bp-profile-mode-swatch-${value}`} aria-hidden="true">
        <span className="bp-profile-mode-swatch-sidebar" />
        <span className="bp-profile-mode-swatch-card" />
      </span>
      <span className="bp-profile-mode-opt-text">
        <span className="bp-profile-mode-opt-label">{label}</span>
        <span className="bp-profile-mode-opt-desc">{description}</span>
      </span>
    </button>
  );
}

function ChangePasswordCard() {
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
    <div className="bp-card">
      <h2 className="bp-card-title">Change password</h2>
      <p className="bp-td-muted" style={{ marginTop: -6, marginBottom: 16 }}>
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
  );
}
