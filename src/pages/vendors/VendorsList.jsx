import { useEffect, useState } from "react";
import { vendorsApi } from "../../api/admin";
import { ApiError } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import Modal from "../../components/Modal";
import SearchBox from "../../components/SearchBox";
import CodeField, { useCodePreview } from "../../components/CodeField";
import { useDataTable, SearchByBar, ColumnHeader, DataTableToolbar, SelectAllHeaderCell, SelectRowCell, ColumnChooserButton } from "../../components/DataTable";
import { useUrlSearch } from "../../hooks/useUrlSearch";
import { formatDateTime } from "../../utils/date";

// Vendors sell raw materials TO Bismi — a purchasing relationship, not
// a consignment/commission one (that's Partners & Shops). Feeds the
// vendor dropdown on Purchase Orders.
export default function VendorsList() {
  const { hasPermission } = useAuth();
  const urlSearch = useUrlSearch();
  const [vendors, setVendors] = useState([]);
  const [q, setQ] = useState(urlSearch.q);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editVendor, setEditVendor] = useState(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await vendorsApi.list({ q });
      setVendors(data.items || []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load vendors.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  async function onSaved() {
    setShowAdd(false);
    setEditVendor(null);
    await load();
  }

  async function remove(vendor) {
    if (!window.confirm(`Remove ${vendor.name} from vendors?`)) return;
    await vendorsApi.remove(vendor.vendor_id);
    await load();
  }

  const columns = [
    { key: "vendor_code", label: "Vendor ID", accessor: (v) => v.vendor_code || "" },
    { key: "name", label: "Name", accessor: (v) => v.name },
    { key: "contact_name", label: "Contact", accessor: (v) => (v.contact_name || "") + (v.contact_phone ? ` · ${v.contact_phone}` : "") },
    { key: "address", label: "Address", accessor: (v) => v.address || "" },
    { key: "created_by_name", label: "Created by", accessor: (v) => v.created_by_name || "", hiddenByDefault: true },
    { key: "created_at", label: "Created at", accessor: (v) => v.created_at || "", filter: "dateRange", hiddenByDefault: true },
    { key: "updated_by_name", label: "Updated by", accessor: (v) => v.updated_by_name || "", hiddenByDefault: true },
    { key: "updated_at", label: "Updated at", accessor: (v) => v.updated_at || "", filter: "dateRange", hiddenByDefault: true },
  ];
  const table = useDataTable({ rows: vendors, columns, rowKey: (v) => v.vendor_id });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 10 }}>
        <h1 className="bp-page-title">Vendors</h1>
        <button type="button" className="bp-btn-primary" onClick={() => setShowAdd(true)}>+ Add vendor</button>
      </div>
      <p className="bp-td-muted" style={{ margin: "-6px 0 14px" }}>
        Suppliers Bismi buys raw materials from — used on Purchase Orders.
      </p>

      <SearchBox placeholder="Search by name…" onSearch={setQ} initialValue={urlSearch.q} />

      {error && <div className="bp-inline-error">{error}</div>}

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <DataTableToolbar table={table} filename="vendors" totalCount={vendors.length} />
        <ColumnChooserButton table={table} columns={columns} />
      </div>
      <SearchByBar table={table} columns={columns} />

      <div className="bp-table-wrap">
        <table className="bp-table">
          <thead>
            <tr>
              <SelectAllHeaderCell table={table} />
              {table.isColumnVisible(columns[0].key) && <ColumnHeader table={table} column={columns[0]} />}
              {table.isColumnVisible(columns[1].key) && <ColumnHeader table={table} column={columns[1]} />}
              {table.isColumnVisible(columns[2].key) && <ColumnHeader table={table} column={columns[2]} />}
              {table.isColumnVisible(columns[3].key) && <ColumnHeader table={table} column={columns[3]} />}
              {table.isColumnVisible(columns[4].key) && <ColumnHeader table={table} column={columns[4]} />}
              {table.isColumnVisible(columns[5].key) && <ColumnHeader table={table} column={columns[5]} />}
              {table.isColumnVisible(columns[6].key) && <ColumnHeader table={table} column={columns[6]} />}
              {table.isColumnVisible(columns[7].key) && <ColumnHeader table={table} column={columns[7]} />}
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} className="bp-table-empty">Loading…</td></tr>
            ) : table.filteredRows.length === 0 ? (
              <tr><td colSpan={10} className="bp-table-empty">No vendors found.</td></tr>
            ) : (
              table.filteredRows.map((v) => (
                <tr key={v.vendor_id} onClick={() => setEditVendor(v)} style={{ cursor: "pointer" }}>
                  <SelectRowCell table={table} row={v} />
                  {table.isColumnVisible("vendor_code") && <td className="bp-td-muted">{v.vendor_code || "—"}</td>}
                  {table.isColumnVisible("name") && <td className="bp-td-strong">{v.name}</td>}
                  {table.isColumnVisible("contact_name") && <td className="bp-td-muted">{v.contact_name || "—"}{v.contact_phone ? ` · ${v.contact_phone}` : ""}</td>}
                  {table.isColumnVisible("address") && <td className="bp-td-muted">{v.address || "—"}</td>}
                  {table.isColumnVisible("created_by_name") && <td className="bp-td-muted">{v.created_by_name || "—"}</td>}
                  {table.isColumnVisible("created_at") && <td className="bp-td-muted">{formatDateTime(v.created_at) || "—"}</td>}
                  {table.isColumnVisible("updated_by_name") && <td className="bp-td-muted">{v.updated_by_name || "—"}</td>}
                  {table.isColumnVisible("updated_at") && <td className="bp-td-muted">{formatDateTime(v.updated_at) || "—"}</td>}
                  <td className="bp-td-actions">
                    <button type="button" className="bp-btn-sm" onClick={(e) => { e.stopPropagation(); setEditVendor(v); }}>Edit</button>
                    {hasPermission("purchasing.manage", "full_control") && (
                      <button type="button" className="bp-btn-sm" onClick={(e) => { e.stopPropagation(); remove(v); }}>Remove</button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showAdd && <VendorModal onClose={() => setShowAdd(false)} onDone={onSaved} />}
      {editVendor && <VendorModal vendor={editVendor} onClose={() => setEditVendor(null)} onDone={onSaved} />}
    </div>
  );
}

function VendorModal({ vendor, onClose, onDone }) {
  const isEdit = !!vendor;
  const [name, setName] = useState(vendor?.name || "");
  const [contactName, setContactName] = useState(vendor?.contact_name || "");
  const [contactPhone, setContactPhone] = useState(vendor?.contact_phone || "");
  const [address, setAddress] = useState(vendor?.address || "");
  const [notes, setNotes] = useState(vendor?.notes || "");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const codeField = useCodePreview("vendor", isEdit ? vendor.vendor_code : null);

  async function submit(e) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    if (codeField.mode === "manual" && !isEdit && !codeField.value.trim()) {
      setError("Enter a vendor code.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const body = {
        name: name.trim(),
        contact_name: contactName || undefined,
        contact_phone: contactPhone || undefined,
        address: address || undefined,
        notes: notes || undefined,
        vendor_code: codeField.mode === "manual" && !isEdit ? codeField.value.trim() : undefined,
      };
      if (isEdit) {
        await vendorsApi.update(vendor.vendor_id, body);
      } else {
        await vendorsApi.create(body);
      }
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save this vendor.");
      setSubmitting(false);
    }
  }

  return (
    <Modal title={isEdit ? `Edit — ${vendor.name}` : "Add vendor"} onClose={onClose}>
      <form onSubmit={submit} className="bp-form">
        {error && <div className="bp-inline-error">{error}</div>}

        <CodeField label="Vendor code" field={codeField} isEdit={isEdit} />

        <label className="bp-field-label" htmlFor="vName">Name</label>
        <input id="vName" type="text" className="bp-field-input" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />

        <div className="bp-form-row">
          <div style={{ flex: 1 }}>
            <label className="bp-field-label" htmlFor="vContactName">Contact name</label>
            <input id="vContactName" type="text" className="bp-field-input" value={contactName} onChange={(e) => setContactName(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label className="bp-field-label" htmlFor="vContactPhone">Contact phone</label>
            <input id="vContactPhone" type="tel" className="bp-field-input" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
          </div>
        </div>

        <label className="bp-field-label" htmlFor="vAddress">Address</label>
        <input id="vAddress" type="text" className="bp-field-input" value={address} onChange={(e) => setAddress(e.target.value)} />

        <label className="bp-field-label" htmlFor="vNotes">Notes (optional)</label>
        <textarea id="vNotes" className="bp-field-input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />

        <div className="bp-form-actions">
          <button type="button" className="bp-btn-outline" onClick={onClose} disabled={submitting}>Cancel</button>
          <button type="submit" className="bp-btn-primary" disabled={submitting}>{submitting ? "Saving…" : isEdit ? "Save changes" : "Add vendor"}</button>
        </div>
      </form>
    </Modal>
  );
}
