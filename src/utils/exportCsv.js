// Client-side CSV export — builds a CSV blob from data already loaded into
// a list screen's `rows` state and triggers a browser download. CSV opens
// correctly in Excel, without pulling in a heavier .xlsx-writing library.

function csvEscape(value) {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\n]/.test(str)) return '"' + str.replace(/"/g, '""') + '"';
  return str;
}

// columns: [{ label: "Name", accessor: (row) => row.full_name }]
export function exportCsv(filename, columns, rows) {
  const header = columns.map((c) => csvEscape(c.label)).join(",");
  const lines = rows.map((row) => columns.map((c) => csvEscape(c.accessor(row))).join(","));
  const csv = [header, ...lines].join("\r\n");

  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".csv") ? filename : filename + ".csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
