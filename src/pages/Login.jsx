import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { ApiError } from "../api/client";
import "./Login.css";

export default function Login() {
  const { status, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Already signed in — don't show the login screen again.
  if (status === "authed") {
    const from = location.state?.from?.pathname || "/";
    return <Navigate to={from} replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      const from = location.state?.from?.pathname || "/";
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't sign in. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bp-login-page">
      <form className="bp-login-card" onSubmit={handleSubmit}>
        <div className="bp-login-mark">BP</div>
        <h1 className="bp-login-title">Bismipaniyan Admin</h1>
        <p className="bp-login-subtitle">Sign in with your employee account</p>

        {error && <div className="bp-login-error">{error}</div>}

        <label className="bp-login-label" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          className="bp-login-input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
          autoFocus
          required
        />

        <label className="bp-login-label" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          type="password"
          className="bp-login-input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />

        <button type="submit" className="bp-login-submit" disabled={submitting}>
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
