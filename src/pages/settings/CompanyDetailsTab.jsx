import { useEffect, useState } from "react";
import { companySettingsApi, financialAccountsApi } from "../../api/admin";
import { ApiError } from "../../api/client";

// Owner-only. Legal/statutory identity for Bismi Bakery — feeds the
// sales invoice header (business name, address, GSTIN, FSSAI) instead
// of hardcoded values in the backend. A singleton row, so this is a
// plain form (load → edit → save), not a list.
export default function CompanyDetailsTab() {
  const [form, setForm] = useState(null);
  const [financialAccounts, setFinancialAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [data, accountsData] = await Promise.all([companySettingsApi.get(), financialAccountsApi.list()]);
        setForm(data || {});
        setFinancialAccounts(accountsData.items || []);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Could not load company details.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function set(field) {
    return (e) => {
      setForm((f) => ({ ...f, [field]: e.target.value }));
      setSaved(false);
    };
  }

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const data = await companySettingsApi.update(form);
      setForm(data);
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save company details.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="bp-td-muted">Loading…</p>;
  if (!form) return null;

  return (
    <div className="bp-table-wrap" style={{ padding: 20, maxWidth: 640 }}>
      <h2 style={{ fontSize: 15, margin: "0 0 4px" }}>Company details</h2>
      <p className="bp-td-muted" style={{ marginTop: 0, marginBottom: 16 }}>
        Bismi's legal and statutory identity — appears on the sales invoice header.
      </p>

      <form onSubmit={submit} className="bp-form">
        {error && <div className="bp-inline-error">{error}</div>}
        {saved && !error && <div className="bp-inline-success">Saved.</div>}

        <FieldSectionLabel>Business identity</FieldSectionLabel>
        <label className="bp-field-label" htmlFor="businessName">Business (trade) name</label>
        <input id="businessName" className="bp-field-input" value={form.business_name || ""} onChange={set("business_name")} required />

        <label className="bp-field-label" htmlFor="legalName">Legal name (owner / proprietor)</label>
        <input id="legalName" className="bp-field-input" value={form.legal_name || ""} onChange={set("legal_name")} />

        <label className="bp-field-label" htmlFor="regAddress">Registered / billing address</label>
        <textarea id="regAddress" className="bp-field-input" rows={2} value={form.registered_address || ""} onChange={set("registered_address")} />

        <div className="bp-form-row">
          <div>
            <label className="bp-field-label" htmlFor="phone">Phone</label>
            <input id="phone" className="bp-field-input" value={form.phone || ""} onChange={set("phone")} />
          </div>
          <div>
            <label className="bp-field-label" htmlFor="email">Email</label>
            <input id="email" type="email" className="bp-field-input" value={form.email || ""} onChange={set("email")} />
          </div>
        </div>

        <FieldSectionLabel>Statutory registrations</FieldSectionLabel>
        <div className="bp-form-row">
          <div>
            <label className="bp-field-label" htmlFor="gstin">GSTIN</label>
            <input id="gstin" className="bp-field-input" value={form.gstin || ""} onChange={set("gstin")} placeholder="e.g. 34DSKPA1077A1ZB" />
          </div>
          <div>
            <label className="bp-field-label" htmlFor="gstType">GST registration type</label>
            <select id="gstType" className="bp-field-input" value={form.gst_registration_type || ""} onChange={set("gst_registration_type")}>
              <option value="">— Not set —</option>
              <option value="Composition Scheme">Composition Scheme</option>
              <option value="Regular">Regular</option>
            </select>
          </div>
        </div>
        <p className="bp-td-muted" style={{ margin: "-6px 0 12px", fontSize: 12 }}>
          Composition Scheme dealers can't charge GST to customers — the invoice will print the required disclaimer instead of a tax line.
        </p>

        <div className="bp-form-row">
          <div>
            <label className="bp-field-label" htmlFor="gstValidFrom">GST valid from</label>
            <input id="gstValidFrom" type="date" className="bp-field-input" value={toDateInput(form.gst_valid_from)} onChange={set("gst_valid_from")} />
          </div>
          <div>
            <label className="bp-field-label" htmlFor="pan">PAN</label>
            <input id="pan" className="bp-field-input" value={form.pan || ""} onChange={set("pan")} />
          </div>
        </div>

        <div className="bp-form-row">
          <div>
            <label className="bp-field-label" htmlFor="fssai">FSSAI license number</label>
            <input id="fssai" className="bp-field-input" value={form.fssai_license_number || ""} onChange={set("fssai_license_number")} placeholder="e.g. 13525001000186" />
          </div>
        </div>
        <div className="bp-form-row">
          <div>
            <label className="bp-field-label" htmlFor="fssaiFrom">FSSAI valid from</label>
            <input id="fssaiFrom" type="date" className="bp-field-input" value={toDateInput(form.fssai_valid_from)} onChange={set("fssai_valid_from")} />
          </div>
          <div>
            <label className="bp-field-label" htmlFor="fssaiTo">FSSAI valid to</label>
            <input id="fssaiTo" type="date" className="bp-field-input" value={toDateInput(form.fssai_valid_to)} onChange={set("fssai_valid_to")} />
          </div>
        </div>

        <div className="bp-form-row">
          <div>
            <label className="bp-field-label" htmlFor="stateName">State</label>
            <input id="stateName" className="bp-field-input" value={form.state_name || ""} onChange={set("state_name")} />
          </div>
          <div>
            <label className="bp-field-label" htmlFor="stateCode">State code</label>
            <input id="stateCode" className="bp-field-input" value={form.state_code || ""} onChange={set("state_code")} />
          </div>
        </div>

        <FieldSectionLabel>Finance</FieldSectionLabel>
        <label className="bp-field-label" htmlFor="defaultFinancialAccount">Default financial account</label>
        <select
          id="defaultFinancialAccount"
          className="bp-field-input"
          value={form.default_financial_account_id || ""}
          onChange={set("default_financial_account_id")}
        >
          <option value="">— Not set —</option>
          {financialAccounts.map((a) => (
            <option key={a.financial_account_id} value={a.financial_account_id}>{a.name}</option>
          ))}
        </select>
        <p className="bp-td-muted" style={{ margin: "-6px 0 12px", fontSize: 12 }}>
          Sales, purchase payments, salary, and partner settlements post here automatically unless a different
          account is chosen for that transaction.
        </p>

        <div className="bp-form-actions">
          <button type="submit" className="bp-btn-primary" disabled={saving}>{saving ? "Saving…" : "Save changes"}</button>
        </div>
      </form>
    </div>
  );
}

function FieldSectionLabel({ children }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.3, textTransform: "uppercase", color: "var(--bp-text-muted)", margin: "14px 0 8px" }}>
      {children}
    </div>
  );
}

function toDateInput(v) {
  if (!v) return "";
  return String(v).slice(0, 10);
}
