import { useEffect, useState } from "react";
import { inventoryApi, locationsApi } from "../../api/admin";
import { ApiError } from "../../api/client";
import ExportMenu from "../../components/ExportMenu";
import Pagination from "../../components/Pagination";
import { formatQty } from "../../lib/uom";
import { useDataTable, SearchByBar, ColumnHeader, SelectAllHeaderCell, SelectRowCell, ColumnChooserButton } from "../../components/DataTable";
import { Link } from "react-router-dom";
import { formatDate } from "../../utils/date";

const LIMIT = 25;

const MOVEMENT_TYPE_LABELS = {
  production_in: "Production received",
  purchase_in: "Purchase received",
  transfer_in: "Transfer in",
  transfer_out: "Transfer out",
  sale: "Sold",
  wastage: "Wastage",
  adjustment: "Adjustment",
};

function monthStartStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

const CSV_COLUMNS = [
  { label: "TransID", accessor: (r) => r.universal_trans_id || "" },
  { label: "Doc #", accessor: (r) => r.trans_id },
  { label: "Date", accessor: (r) => r.entry_date },
  { label: "Product", accessor: (r) => r.product_name },
  { label: "SKU", accessor: (r) => r.sku },
  { label: "Location", accessor: (r) => r.location_name },
  { label: "Type", accessor: (r) => MOVEMENT_TYPE_LABELS[r.movement_type] || r.movement_type },
  { label: "Qty", accessor: (r) => r.qty_delta },
  { label: "Partner", accessor: (r) => r.partner_name },
  { label: "Note", accessor: (r) => r.note },
  { label: "Recorded by", accessor: (r) => r.recorded_by_name },
];

// Every inventory_movements row across every product/location, in one
// filterable place — the general audit trail behind Stock's derived
// balances. Each row's own document number (IM-000123) is its per-table
// code; universal_trans_id (TRX-YYYYMMDD-NNNNNN) is the same cross-module
// TransID surfaced on Cash Book, Bank Transaction, Sales/Purchase Orders,
// etc. — click it to open Global Search's transaction detail view.
export default function InventoryTransactionsList() {
  const [locations, setLocations] = useState([]);
  const [locationId, setLocationId] = useState("");
  const [movementType, setMovementType] = useState("");
  const [from, setFrom] = useState(monthStartStr());
  const [to, setTo] = useState(todayStr());
  const [page, setPage] = useState(1);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    locationsApi.list().then(setLocations).catch(() => {});
  }, []);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await inventoryApi.transactions({
        page, limit: LIMIT,
        locationId: locationId || undefined,
        movementType: movementType || undefined,
        from: from || undefined,
        to: to || undefined,
      });
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load inventory transactions.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, locationId, movementType, from, to]);

  function resetPageAnd(setter) {
    return (value) => {
      setPage(1);
      setter(value);
    };
  }

  const columns = [
    { key: "universal_trans_id", label: "TransID", accessor: (r) => r.universal_trans_id || "", hiddenByDefault: true },
    { key: "trans_id", label: "Doc #", accessor: (r) => r.trans_id || "" },
    { key: "entry_date", label: "Date", accessor: (r) => r.entry_date, filter: "dateRange" },
    { key: "product_name", label: "Product", accessor: (r) => r.product_name },
    { key: "location_name", label: "Location", accessor: (r) => r.location_name },
    {
      key: "movement_type", label: "Type", accessor: (r) => r.movement_type, filter: "select",
      options: Object.entries(MOVEMENT_TYPE_LABELS).map(([value, label]) => ({ value, label })),
    },
    { key: "qty_delta", label: "Qty", accessor: (r) => r.qty_delta, filter: "number" },
    { key: "partner_name", label: "Partner", accessor: (r) => r.partner_name || "", hiddenByDefault: true },
    { key: "note", label: "Note", accessor: (r) => r.note || "" },
    { key: "recorded_by_name", label: "Recorded by", accessor: (r) => r.recorded_by_name || "", hiddenByDefault: true },
  ];
  const table = useDataTable({ rows: items, columns, rowKey: (r) => r.movement_id });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 10 }}>
        <h2 className="bp-card-title">Transactions</h2>
        <ExportMenu filename="inventory-transactions" rows={items} columns={CSV_COLUMNS} />
      </div>
      <p className="bp-td-muted" style={{ margin: "-6px 0 14px" }}>
        Every stock movement across every product and location — the audit trail behind Stock's balances.
      </p>

      <div className="bp-inventory-filters">
        <select className="bp-field-input" value={locationId} onChange={(e) => resetPageAnd(setLocationId)(e.target.value)}>
          <option value="">All locations</option>
          {locations.map((l) => <option key={l.location_id} value={l.location_id}>{l.name}</option>)}
        </select>
        <select className="bp-field-input" value={movementType} onChange={(e) => resetPageAnd(setMovementType)(e.target.value)}>
          <option value="">All types</option>
          {Object.entries(MOVEMENT_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <input type="date" className="bp-field-input" style={{ width: "auto" }} value={from} onChange={(e) => resetPageAnd(setFrom)(e.target.value)} />
        <input type="date" className="bp-field-input" style={{ width: "auto" }} value={to} onChange={(e) => resetPageAnd(setTo)(e.target.value)} />
      </div>

      {error && <div className="bp-inline-error">{error}</div>}

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <ColumnChooserButton table={table} columns={columns} />
      </div>
      <SearchByBar table={table} columns={columns} />

      <div className="bp-table-wrap">
        <table className="bp-table">
          <thead>
            <tr>
              <SelectAllHeaderCell table={table} />
              {columns.map((c) => table.isColumnVisible(c.key) && <ColumnHeader key={c.key} table={table} column={c} />)}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={columns.length + 1} className="bp-table-empty">Loading…</td></tr>
            ) : table.filteredRows.length === 0 ? (
              <tr><td colSpan={columns.length + 1} className="bp-table-empty">No inventory transactions found.</td></tr>
            ) : (
              table.filteredRows.map((r) => (
                <tr key={r.movement_id}>
                  <SelectRowCell table={table} row={r} />
                  {table.isColumnVisible("universal_trans_id") && (
                    <td>
                      {r.universal_trans_id ? (
                        <Link to={`/global-search?trans=${encodeURIComponent(r.universal_trans_id)}`} className="bp-trans-id-link">
                          {r.universal_trans_id}
                        </Link>
                      ) : "—"}
                    </td>
                  )}
                  {table.isColumnVisible("trans_id") && <td className="bp-td-muted">{r.trans_id || "—"}</td>}
                  {table.isColumnVisible("entry_date") && <td className="bp-td-muted">{formatDate(r.entry_date)}</td>}
                  {table.isColumnVisible("product_name") && <td className="bp-td-strong">{r.product_name}{r.sku ? ` (${r.sku})` : ""}</td>}
                  {table.isColumnVisible("location_name") && <td>{r.location_name}</td>}
                  {table.isColumnVisible("movement_type") && (
                    <td>
                      <span className={`bp-badge ${r.qty_delta < 0 ? "bp-badge-danger" : "bp-badge-success"}`}>
                        {MOVEMENT_TYPE_LABELS[r.movement_type] || r.movement_type}
                      </span>
                    </td>
                  )}
                  {table.isColumnVisible("qty_delta") && <td className="bp-td-strong">{formatQty(r.qty_delta)}</td>}
                  {table.isColumnVisible("partner_name") && <td className="bp-td-muted">{r.partner_name || "—"}</td>}
                  {table.isColumnVisible("note") && <td className="bp-td-muted">{r.note || "—"}</td>}
                  {table.isColumnVisible("recorded_by_name") && <td className="bp-td-muted">{r.recorded_by_name || "—"}</td>}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} limit={LIMIT} total={total} onPageChange={setPage} />
    </div>
  );
}
