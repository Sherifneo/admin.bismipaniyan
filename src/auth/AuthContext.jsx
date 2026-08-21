import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { authApi } from "../api/admin";
import { getToken, setToken, AUTH_EVENT } from "../api/client";

const AuthContext = createContext(null);

// Read/Write/Delete permission levels — fully nested (delete implies edit
// implies view). Keep this in sync with the backend's permission ranking
// once one exists.
const ACTION_RANK = { view: 1, edit: 2, delete: 3 };

// Three states while booting: "loading" (checking a stored token),
// "authed" (confirmed valid session), "guest" (no token / token rejected).
// Nothing renders the protected shell until this resolves.
export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [status, setStatus] = useState("loading");

  const refreshMe = useCallback(async () => {
    if (!getToken()) {
      setAdmin(null);
      setStatus("guest");
      return;
    }
    try {
      const data = await authApi.me();
      setAdmin(data);
      setStatus("authed");
    } catch {
      setAdmin(null);
      setStatus("guest");
    }
  }, []);

  useEffect(() => {
    refreshMe();
  }, [refreshMe]);

  useEffect(() => {
    const onAuthChange = () => {
      setAdmin(null);
      setStatus("guest");
    };
    document.addEventListener(AUTH_EVENT, onAuthChange);
    return () => document.removeEventListener(AUTH_EVENT, onAuthChange);
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await authApi.login(email, password);
    setToken(data.token);
    setAdmin(data.admin);
    setStatus("authed");
    return data.admin;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Best-effort — clear local state regardless of whether the
      // server-side revoke call succeeded.
    }
    setToken(null);
    setAdmin(null);
    setStatus("guest");
  }, []);

  // Owners and Super Users implicitly have every permission. Staff need a
  // grant whose action rank meets or exceeds the requested level.
  const hasPermission = useCallback(
    (key, action = "view") => {
      if (!admin) return false;
      if (admin.role === "owner" || admin.role === "super_user") return true;
      if (!Array.isArray(admin.permissions)) return false;
      const grant = admin.permissions.find((g) => g.permission_key === key);
      const requiredRank = ACTION_RANK[action] || ACTION_RANK.view;
      return !!grant && (ACTION_RANK[grant.action] || 0) >= requiredRank;
    },
    [admin]
  );

  const value = { admin, status, login, logout, refreshMe, hasPermission };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
