// Bismipaniyan-wide date/time display convention: dates always render as
// DD-MM-YYYY, never the raw ISO/US format the API or <input type="date">
// gives us. Accepts a Date, an ISO string ("2026-08-26" or with a time
// component), or null/undefined.
export function formatDate(value) {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const year = d.getUTCFullYear();
  return `${day}-${month}-${year}`;
}

// For real timestamp columns (created_at, etc.) — local time, not UTC,
// since these are "when did this happen on my clock" not a plain date.
export function formatDateTime(value) {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const time = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  return `${day}-${month}-${year} ${time}`;
}
