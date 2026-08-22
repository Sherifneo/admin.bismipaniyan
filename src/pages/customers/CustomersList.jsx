import { useEffect, useState } from "react";
import { customersApi } from "../../api/admin";
import { ApiError } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import Modal from "../../components/Modal";
import SearchBox from "../../components/SearchBox";
import CodeField, { useCodePreview } from "../../components/CodeField";
import { useDataTable, SearchByBar, ColumnHeader, DataTableToolbar, SelectAllHeaderCell, SelectRowCell, ColumnChooserButton } from "../../components/DataTable";
import { useUrlSearch } from "../../hooks/useUrlSearch";

// Repeat/bulk buyers only — a walk-in counter sale doesn't need a saved
// record here at all (Sales Orders can be created with just a typed
// name/phone for that one order). This list is what the Sales Order
// customer picker searches against.
export default function CustomersList() {
  const { hasPermission } = useAuth();
  const urlSearch = useUrlSearch();
  const [customers, setCustomers] = useState([]);
  const [q, setQ] = useState(urlSearch.q);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editCustomer, setEditCustomer] = useState(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await customersApi.list({ q });
      setCustomers(data.items || []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load customers.");
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
    setEditCustomer(null);
    await load();
  }

  async function remove(customer) {
    if (!window.confirm(`Remove ${customer.name} from customers?`)) return;
    await customersApi.remove(customer.customer_id);
    await load();
  }

  const columns = [
    { key: "customer_code", label: "Code", accessor: (c) => c.customer_code || "" },
    { key: "name", label: "Name", accessor: (c) => c.name },
    { key: "phone", label: "Phone", accessor: (c) => c.phone || "" },
    { key: "address", label: "Address", accessor: (c) => c.address || "" },
    { key: "gstin", label: "GSTIN", accessor: (c) => c.gstin || "" },
    { key: "created_by_name", label: "Created by", accessor: (c) => c.created_by_name || "", hiddenByDefault: true },
    { key: "created_at", label: "Created at", accessor: (c) => c.created_at || "", filter: "dateRange", hiddenByDefault: true },
    { key: "updated_by_name", label: "Updated by", accessor: (c) => c.updated_by_name || "", hiddenByDefault: true },
    { key: "updated_at", label: "Updated at", accessor: (c) => c.updated_at || "", filter: "dateRange", hiddenByDefault: true },
  ];
  const table = useDataTable({ rows: customers, columns, rowKey: (c) => c.customer_id });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 10 }}>
        <h1 className="bp-page-title">Customers</h1>
        <button type="button" className="bp-btn-primary" onClick={() => setShowAdd(true)}>+ Add customer</button>
      </div>
      <p className="bp-td-muted" style={{ margin: "-6px 0 14px" }}>
        Repeat and bulk buyers — used on Sales Orders. A one-off walk-in sale doesn't need a saved customer.
      </p>

      <SearchBox placeholder="Search by name or phone…" onSearch={setQ} initialValue={urlSearch.q} />

      {error && <div className="bp-inline-error">{error}</div>}

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <DataTableToolbar table={table} filename="customers" totalCount={customers.length} />
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
              {table.isColumnVisible(columns[8].key) && <ColumnHeader table={table} column={columns[8]} />}
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={11} className="bp-table-empty">Loading…</td></tr>
            ) : table.filteredRows.length === 0 ? (
              <tr><td colSpan={11} className="bp-table-empty">No customers found.</td></tr>
            ) : (
              table.filteredRows.map((c) => (
                <tr key={c.customer_id} onClick={() => setEditCustomer(c)} style={{ cursor: "pointer" }}>
                  <SelectRowCell table={table} row={c} />
                  {table.isColumnVisible("customer_code") && <td className="bp-td-muted">{c.customer_code || "—"}</td>}
                  {table.isColumnVisible("name") && <td className="bp-td-strong">{c.name}</td>}
                  {table.isColumnVisible("phone") && <td className="bp-td-muted">{c.phone || "—"}</td>}
                  {table.isColumnVisible("address") && <td className="bp-td-muted">{c.address || "—"}</td>}
                  {table.isColumnVisible("gstin") && <td className="bp-td-muted">{c.gstin || "—"}</td>}
                  {table.isColumnVisible("created_by_name") && <td className="bp-td-muted">{c.created_by_name || "—"}</td>}
                  {table.isColumnVisible("created_at") && <td className="bp-td-muted">{c.created_at ? new Date(c.created_at).toLocaleString("en-IN") : "—"}</td>}
                  {table.isColumnVisible("updated_by_name") && <td className="bp-td-muted">{c.updated_by_name || "—"}</td>}
                  {table.isColumnVisible("updated_at") && <td className="bp-td-muted">{c.updated_at ? new Date(c.updated_at).toLocaleString("en-IN") : "—"}</td>}
                  <td className="bp-td-actions">
                    <button type="button" className="bp-btn-sm" onClick={(e) => { e.stopPropagation(); setEditCustomer(c); }}>Edit</button>
                    {hasPermission("sales.manage", "full_control") && (
                      <button type="button" className="bp-btn-sm" onClick={(e) => { e.stopPropagation(); remove(c); }}>Remove</button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showAdd && <CustomerModal onClose={() => setShowAdd(false)} onDone={onSaved} />}
      {editCustomer && <CustomerModal customer={editCustomer} onClose={() => setEditCustomer(null)} onDone={onSaved} />}
    </div>
  );
}

function CustomerModal({ customer, onClose, onDone }) {
  const isEdit = !!customer;
  const [name, setName] = useState(customer?.name || "");
  const [phone, setPhone] = useState(customer?.phone || "");
  const [address, setAddress] = useState(customer?.address || "");
  const [gstin, setGstin] = useState(customer?.gstin || "");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const codeField = useCodePreview("customer", isEdit ? customer.customer_code : null);

  async function submit(e) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    if (codeField.mode === "manual" && !isEdit && !codeField.value.trim()) {
      setError("Enter a customer code.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const body = {
        name: name.trim(),
        phone: phone || undefined,
        address: address || undefined,
        gstin: gstin || undefined,
        customer_code: codeField.mode === "manual" && !isEdit ? codeField.value.trim() : undefined,
      };
      if (isEdit) {
        await customersApi.update(customer.customer_id, body);
      } else {
        await customersApi.create(body);
      }
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save this customer.");
      setSubmitting(false);
    }
  }

  return (
    <Modal title={isEdit ? `Edit — ${customer.name}` : "Add customer"} onClose={onClose}>
      <form onSubmit={submit} className="bp-form">
        {error && <div className="bp-inline-error">{error}</div>}

        <CodeField label="Customer code" field={codeField} isEdit={isEdit} />

        <label className="bp-field-label" htmlFor="cName">Name</label>
        <input id="cName" type="text" className="bp-field-input" value={name} onChange={(e) => setName(e.target.value)} required />

        <label className="bp-field-label" htmlFor="cPhone">Phone</label>
        <input id="cPhone" type="tel" className="bp-field-input" value={phone} onChange={(e) => setPhone(e.target.value)} />

        <label className="bp-field-label" htmlFor="cAddress">Address</label>
        <input id="cAddress" type="text" className="bp-field-input" value={address} onChange={(e) => setAddress(e.target.value)} />

        <label className="bp-field-label" htmlFor="cGstin">GSTIN (optional)</label>
        <input id="cGstin" type="text" className="bp-field-input" value={gstin} onChange={(e) => setGstin(e.target.value)} />

        <div className="bp-form-actions">
          <button type="button" className="bp-btn-outline" onClick={onClose} disabled={submitting}>Cancel</button>
          <button type="submit" className="bp-btn-primary" disabled={submitting}>{submitting ? "Saving…" : isEdit ? "Save changes" : "Add customer"}</button>
        </div>
      </form>
    </Modal>
  );
}
