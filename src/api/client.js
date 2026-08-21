// Admin API client — separate token store (localStorage key
// bp_admin_token) so an admin session and any future customer session in
// the same browser can never collide or be confused.

import { API_BASE } from "./config";

const TOKEN_KEY = "bp_admin_token";

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || null;
  } catch {
    return null;
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // localStorage unavailable (private browsing, etc.) — session just
    // won't persist across a reload; not fatal.
  }
}

export class ApiError extends Error {
  constructor(message, status, payload) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

// Fired when a 401 clears the stored token, so the app shell can redirect
// to /login without every call site needing to check the response status
// itself. AuthProvider listens for this.
export const AUTH_EVENT = "bp-admin-auth-change";

async function request(method, path, body, opts = {}) {
  const url = API_BASE + path;
  const headers = { Accept: "application/json" };

  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  if (body !== undefined && body !== null && !isFormData) {
    headers["Content-Type"] = "application/json";
  }

  const token = getToken();
  if (token && !opts.noAuth) headers.Authorization = "Bearer " + token;

  const init = { method, headers };
  if (body !== undefined && body !== null) {
    init.body = isFormData ? body : JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(url, init);
  } catch {
    throw new ApiError("Could not reach the server. Check your connection and try again.", 0);
  }

  let payload = null;
  try {
    payload = await res.json();
  } catch {
    // Empty body (e.g. some 204s) — payload stays null, handled below.
  }

  if (res.status === 401 && !opts.noAuth) {
    setToken(null);
    if (typeof document !== "undefined") {
      document.dispatchEvent(new CustomEvent(AUTH_EVENT));
    }
  }

  if (!res.ok || (payload && payload.ok === false)) {
    const message = (payload && payload.error) || "Something went wrong. Please try again.";
    throw new ApiError(message, res.status, payload);
  }

  return payload && "data" in payload ? payload.data : payload;
}

export const GET = (path, opts) => request("GET", path, null, opts);
export const POST = (path, body, opts) => request("POST", path, body, opts);
export const PUT = (path, body, opts) => request("PUT", path, body, opts);
export const DEL = (path, body, opts) => request("DELETE", path, body, opts);

// For endpoints that return a file (e.g. a PDF) rather than JSON — opens
// it in a new tab via an object URL, carrying the bearer token the way a
// plain <a href> download link can't. Revokes the object URL once the
// new tab has had a moment to load it.
export async function downloadFile(path) {
  const url = API_BASE + path;
  const token = getToken();
  const headers = {};
  if (token) headers.Authorization = "Bearer " + token;

  let res;
  try {
    res = await fetch(url, { headers });
  } catch {
    throw new ApiError("Could not reach the server. Check your connection and try again.", 0);
  }
  if (!res.ok) {
    let message = "Could not generate this document.";
    try {
      const payload = await res.json();
      if (payload && payload.error) message = payload.error;
    } catch {
      // non-JSON error body — keep the generic message
    }
    throw new ApiError(message, res.status);
  }

  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  window.open(blobUrl, "_blank");
  setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
}
