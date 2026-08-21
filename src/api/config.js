// Environment detection — no staging tier, per the confirmed "no staging"
// deployment approach. Local dev talks to localhost:3000; anything else
// (the deployed admin portal) talks to the production API. VITE_API_BASE
// lets a specific build override this explicitly if ever needed.

const HOST = typeof window !== "undefined" ? window.location.hostname.toLowerCase() : "";

export const IS_LOCAL = HOST === "localhost" || HOST === "127.0.0.1" || HOST === "";

export const API_BASE = import.meta.env.VITE_API_BASE || (IS_LOCAL ? "http://localhost:3000" : "https://api.bismipaniyan.com");
