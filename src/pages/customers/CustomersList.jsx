import { useEffect, useState } from "react";
import { customersApi } from "../../api/admin";
import { ApiError } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import Modal from "../../components/Modal";
import SearchBox from "../../components/SearchBox";
import CodeField, { useCodePreview } from "../../components/CodeField";

// Repeat/bulk buyers only — a walk-in counter sale doesn't need a saved
// record here at all (Sales Orders can be created with just a typed
// name/phone for that one order). This list is what the Sales Order
// customer picker searches against.
export default function CustomersList() {
  const { hasPermission } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [q, setQ] = useState("");
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

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 10 }}>
        <h1 className="bp-page-title">Customers</h1>
        <button type="button" className="bp-btn-primary" onClick={() => setShowAdd(true)}>+ Add customer</button>
      </div>
      <p className="bp-td-muted" style={{ margin: "-6px 0 14px" }}>
        Repeat and bulk buyers — used on Sales Orders. A one-off walk-in sale doesn't need a saved customer.
      </p>

      <SearchBox placeholder="Search by name or phone…" onSearch={setQ} />

      {error && <div className="bp-inline-error">{error}</div>}

      <div className="bp-table-wrap">
        <table className="bp-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Phone</th>
              <th>Address</th>
              <th>GSTIN</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="bp-table-empty">Loading…</td></tr>
            ) : customers.length === 0 ? (
              <tr><td colSpan={6} className="bp-table-empty">No customers found.</td></tr>
            ) : (
              customers.map((c) => (
                <tr key={c.customer_id} onClick={() => setEditCustomer(c)} style={{ cursor: "pointer" }}>
                  <td className="bp-td-muted">{c.customer_code || "—"}</td>
                  <td className="bp-td-strong">{c.name}</td>
                  <td className="bp-td-muted">{c.phone || "—"}</td>
                  <td className="bp-td-muted">{c.address || "—"}</td>
                  <td className="bp-td-muted">{c.gstin || "—"}</td>
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
