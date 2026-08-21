import { useEffect, useState } from "react";
import { purchasingApi, vendorsApi, locationsApi, productsApi } from "../../api/admin";
import { ApiError } from "../../api/client";
import Modal from "../../components/Modal";
import Pagination from "../../components/Pagination";
import StatusBadge from "../../components/StatusBadge";

const LIMIT = 20;

function inr(n) {
  return "₹" + Number(n || 0).toLocaleString("en-IN");
}

// Raw-material buying: a PO is created in draft, marked 'ordered' once
// sent to the vendor, then 'received' once goods arrive — which is the
// one status change that writes stock into inventory_movements (see
// backend/src/routes/purchase-orders.js).
export default function PurchaseOrdersList() {
  const [vendors, setVendors] = useState([]);
  const [locations, setLocations] = useState([]);
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [viewPo, setViewPo] = useState(null);

  useEffect(() => {
    vendorsApi.list({}).then((d) => setVendors(d.items || [])).catch(() => {});
    locationsApi.list().then(setLocations).catch(() => {});
  }, []);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await purchasingApi.list({ page, limit: LIMIT, status });
      setOrders(data.items || []);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load purchase orders.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status]);

  async function onSaved() {
    setShowAdd(false);
    await load();
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 10 }}>
        <h1 className="bp-page-title">Purchase Orders</h1>
        <button type="button" className="bp-btn-primary" onClick={() => setShowAdd(true)}>+ New purchase order</button>
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
        <select className="bp-field-input" style={{ width: "auto" }} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="ordered">Ordered</option>
          <option value="received">Received</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {error && <div className="bp-inline-error">{error}</div>}

      <div className="bp-table-wrap">
        <table className="bp-table">
          <thead>
            <tr>
              <th>PO #</th>
              <th>Vendor</th>
              <th>Location</th>
              <th>Order date</th>
              <th>Expected</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="bp-table-empty">Loading…</td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan={7} className="bp-table-empty">No purchase orders found.</td></tr>
            ) : (
              orders.map((po) => (
                <tr key={po.po_id}>
                  <td className="bp-td-strong">{po.po_number}</td>
                  <td>{po.vendor_name}</td>
                  <td className="bp-td-muted">{po.location_name}</td>
                  <td className="bp-td-muted">{po.order_date}</td>
                  <td className="bp-td-muted">{po.expected_date || "—"}</td>
                  <td><StatusBadge status={po.status} /></td>
                  <td className="bp-td-actions">
                    <button type="button" className="bp-btn-sm" onClick={() => setViewPo(po)}>View</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} limit={LIMIT} total={total} onPageChange={setPage} />

      {showAdd && (
        <NewPoModal vendors={vendors} locations={locations} onClose={() => setShowAdd(false)} onDone={onSaved} />
      )}
      {viewPo && (
        <PoDetailModal poId={viewPo.po_id} onClose={() => setViewPo(null)} onChanged={load} />
      )}
    </div>
  );
}

function NewPoModal({ vendors, locations, onClose, onDone }) {
  const [vendorId, setVendorId] = useState(vendors[0]?.vendor_id || "");
  const [locationId, setLocationId] = useState(locations[0]?.location_id || "");
  const [expectedDate, setExpectedDate] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState([{ product_id: "", quantity: "", unit_cost: "" }]);
  const [products, setProducts] = useState([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    productsApi.list({ limit: 500, itemKind: "raw_material" }).then((d) => setProducts(d.items || [])).catch(() => {});
  }, []);

  function updateItem(idx, field, value) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)));
  }

  function addRow() {
    setItems((prev) => [...prev, { product_id: "", quantity: "", unit_cost: "" }]);
  }

  function removeRow(idx) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  const totalValue = items.reduce((sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.unit_cost) || 0), 0);

  async function submit(e) {
    e.preventDefault();
    if (!vendorId || !locationId) {
      setError("Select a vendor and a location.");
      return;
    }
    const cleanItems = items.filter((it) => it.product_id && it.quantity && it.unit_cost);
    if (cleanItems.length === 0) {
      setError("Add at least one complete line item.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await purchasingApi.create({
        vendor_id: vendorId,
        location_id: locationId,
        expected_date: expectedDate || undefined,
        notes: notes || undefined,
        items: cleanItems.map((it) => ({ product_id: it.product_id, quantity: Number(it.quantity), unit_cost: Number(it.unit_cost) })),
      });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create this purchase order.");
      setSubmitting(false);
    }
  }

  return (
    <Modal title="New purchase order" onClose={onClose}>
      <form onSubmit={submit} className="bp-form">
        {error && <div className="bp-inline-error">{error}</div>}

        <div className="bp-form-row">
          <div style={{ flex: 1 }}>
            <label className="bp-field-label" htmlFor="poVendor">Vendor</label>
            <select id="poVendor" className="bp-field-input" value={vendorId} onChange={(e) => setVendorId(e.target.value)} required>
              {vendors.length === 0 && <option value="">No vendors yet — add one first</option>}
              {vendors.map((v) => <option key={v.vendor_id} value={v.vendor_id}>{v.name}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label className="bp-field-label" htmlFor="poLocation">Deliver to</label>
            <select id="poLocation" className="bp-field-input" value={locationId} onChange={(e) => setLocationId(e.target.value)} required>
              {locations.map((l) => <option key={l.location_id} value={l.location_id}>{l.name}</option>)}
            </select>
          </div>
        </div>

        <label className="bp-field-label" htmlFor="poExpected">Expected date (optional)</label>
        <input id="poExpected" type="date" className="bp-field-input" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} />

        <label className="bp-field-label">Line items</label>
        {items.map((it, idx) => (
          <div key={idx} className="bp-form-row" style={{ alignItems: "flex-end" }}>
            <div style={{ flex: 2 }}>
              <select className="bp-field-input" value={it.product_id} onChange={(e) => updateItem(idx, "product_id", e.target.value)}>
                <option value="">Select product…</option>
                {products.map((p) => <option key={p.product_id} value={p.product_id}>{p.name}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <input type="number" min="0" step="0.01" placeholder="Qty" className="bp-field-input" value={it.quantity} onChange={(e) => updateItem(idx, "quantity", e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <input type="number" min="0" step="0.01" placeholder="Unit cost ₹" className="bp-field-input" value={it.unit_cost} onChange={(e) => updateItem(idx, "unit_cost", e.target.value)} />
            </div>
            <button type="button" className="bp-btn-outline" onClick={() => removeRow(idx)} disabled={items.length === 1}>✕</button>
          </div>
        ))}
        <button type="button" className="bp-btn-sm" onClick={addRow} style={{ alignSelf: "flex-start", marginBottom: 10 }}>+ Add line</button>

        <div className="bp-settlement-calc">
          <div className="bp-settlement-calc-row bp-settlement-calc-total"><span>Order total</span><span>{inr(totalValue)}</span></div>
        </div>

        <label className="bp-field-label" htmlFor="poNotes">Notes (optional)</label>
        <textarea id="poNotes" className="bp-field-input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />

        <div className="bp-form-actions">
          <button type="button" className="bp-btn-outline" onClick={onClose} disabled={submitting}>Cancel</button>
          <button type="submit" className="bp-btn-primary" disabled={submitting || vendors.length === 0}>{submitting ? "Saving…" : "Create purchase order"}</button>
        </div>
      </form>
    </Modal>
  );
}

function PoDetailModal({ poId, onClose, onChanged }) {
  const [po, setPo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await purchasingApi.get(poId);
      setPo(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load this purchase order.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poId]);

  async function setStatus(status) {
    setBusy(true);
    try {
      await purchasingApi.update(poId, { status });
      await load();
      await onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update status.");
    } finally {
      setBusy(false);
    }
  }

  const total = (po?.items || []).reduce((sum, it) => sum + Number(it.quantity) * Number(it.unit_cost), 0);

  return (
    <Modal title={po ? `${po.po_number} — ${po.vendor_name}` : "Purchase order"} onClose={onClose}>
      {loading ? (
        <div className="bp-td-muted">Loading…</div>
      ) : error ? (
        <div className="bp-inline-error">{error}</div>
      ) : (
        <>
          <div style={{ display: "flex", gap: 16, marginBottom: 12, flexWrap: "wrap" }}>
            <div><span className="bp-td-muted">Status: </span><StatusBadge status={po.status} /></div>
            <div><span className="bp-td-muted">Location:</span> {po.location_name}</div>
            <div><span className="bp-td-muted">Order date:</span> {po.order_date}</div>
            {po.received_date && <div><span className="bp-td-muted">Received:</span> {po.received_date}</div>}
          </div>

          <table className="bp-table">
            <thead>
              <tr><th>Product</th><th>Qty</th><th>Unit cost</th><th>Line total</th></tr>
            </thead>
            <tbody>
              {po.items.map((it) => (
                <tr key={it.po_item_id}>
                  <td>{it.product_name}</td>
                  <td className="bp-td-muted">{it.quantity} {it.uom}</td>
                  <td>{inr(it.unit_cost)}</td>
                  <td className="bp-td-strong">{inr(it.quantity * it.unit_cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="bp-settlement-calc">
            <div className="bp-settlement-calc-row bp-settlement-calc-total"><span>Total</span><span>{inr(total)}</span></div>
          </div>

          {po.notes && <p className="bp-td-muted" style={{ marginTop: 10 }}>{po.notes}</p>}

          <div className="bp-form-actions">
            {po.status === "draft" && (
              <button type="button" className="bp-btn-outline" onClick={() => setStatus("ordered")} disabled={busy}>Mark as ordered</button>
            )}
            {(po.status === "draft" || po.status === "ordered") && (
              <button type="button" className="bp-btn-primary" onClick={() => setStatus("received")} disabled={busy}>Mark received (adds to stock)</button>
            )}
            {po.status !== "received" && po.status !== "cancelled" && (
              <button type="button" className="bp-btn-outline" onClick={() => setStatus("cancelled")} disabled={busy}>Cancel</button>
            )}
          </div>
        </>
      )}
    </Modal>
  );
}
