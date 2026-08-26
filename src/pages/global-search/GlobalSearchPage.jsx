import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { globalSearchApi } from "../../api/admin";
import { ApiError } from "../../api/client";
import StatusBadge from "../../components/StatusBadge";
import { formatDate } from "../../utils/date";

function inr(n) {
  return "₹" + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

const RELATION_LABELS = {
  child_of_this: "Generated from this transaction",
  parent_of_this: "Source transaction",
  reversal_of: "Reversal of",
  reversed_by: "Reversed by",
  transfer_pair: "Other side of this transfer",
};

// One search box over the universal TransID (TRX-YYYYMMDD-NNNNNN) that
// every transactional row now carries (029_universal_trans_id.sql),
// PLUS every module's own document number (SO-000182, PO-000091,
// CB-000032, IM-000067, ST-000018...) and free-text description/note —
// see backend/src/routes/global-search.js. Search a TransID or a
// document number and land on the same result list; click through to a
// transaction's full detail + related transactions (source/reversal/
// transfer-pair links).
export default function GlobalSearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") || searchParams.get("trans") || "");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  async function runSearch(value) {
    const query = value.trim();
    if (!query) return;
    setLoading(true);
    setError("");
    setDetail(null);
    try {
      const data = await globalSearchApi.search(query);
      setItems(data.items || []);
      setSearched(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not search.");
    } finally {
      setLoading(false);
    }
  }

  async function openTransaction(universalTransId) {
    setDetailLoading(true);
    setDetailError("");
    try {
      const data = await globalSearchApi.getTransaction(universalTransId);
      setDetail(data);
    } catch (err) {
      setDetailError(err instanceof ApiError ? err.message : "Could not load this transaction.");
    } finally {
      setDetailLoading(false);
    }
  }

  // A universal_trans_id (TRX-...) or document number arriving via
  // ?trans=/?q= (e.g. clicked from Inventory Transactions' TransID
  // column) drives straight to the detail view instead of the list.
  useEffect(() => {
    const initial = searchParams.get("trans") || searchParams.get("q");
    if (!initial) return;
    if (initial.startsWith("TRX-")) {
      openTransaction(initial);
    } else {
      runSearch(initial);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function submit(e) {
    e.preventDefault();
    setSearchParams(q ? { q } : {});
    runSearch(q);
  }

  return (
    <div>
      <h1 className="bp-page-title">Transaction Search</h1>
      <p className="bp-td-muted" style={{ margin: "-6px 0 14px" }}>
        Search any TransID (TRX-YYYYMMDD-NNNNNN) or module document number — Sales/Purchase Order, Cash Book,
        Inventory, Bank Transaction, Stock Transfer, Production, Settlement, or Reconciliation.
      </p>

      <form onSubmit={submit} style={{ display: "flex", gap: 8, marginBottom: 14, maxWidth: 560 }}>
        <input
          type="text"
          className="bp-field-input"
          placeholder="TRX-20260825-000245, SO-000182, description…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoFocus
        />
        <button type="submit" className="bp-btn-primary" disabled={loading}>{loading ? "Searching…" : "Search"}</button>
      </form>

      {error && <div className="bp-inline-error">{error}</div>}
      {detailError && <div className="bp-inline-error">{detailError}</div>}

      {detailLoading && <p className="bp-td-muted">Loading transaction…</p>}

      {detail && !detailLoading && <TransactionDetail detail={detail} onOpen={openTransaction} onBack={() => setDetail(null)} />}

      {!detail && !detailLoading && searched && (
        <div className="bp-table-wrap">
          <table className="bp-table">
            <thead>
              <tr>
                <th>TransID</th>
                <th>Module</th>
                <th>Document</th>
                <th>Date</th>
                <th>Status</th>
                <th>Location</th>
                <th>Account</th>
                <th>Amount / Qty</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="bp-table-empty">Searching…</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={8} className="bp-table-empty">No transactions found.</td></tr>
              ) : (
                items.map((item) => (
                  <tr key={`${item.table}:${item.pk_id}`} style={{ cursor: item.universal_trans_id ? "pointer" : "default" }} onClick={() => item.universal_trans_id && openTransaction(item.universal_trans_id)}>
                    <td className="bp-trans-id-link">{item.universal_trans_id || "—"}</td>
                    <td className="bp-td-strong">{item.module}</td>
                    <td className="bp-td-muted">{item.document_number || "—"}</td>
                    <td className="bp-td-muted">{formatDate(item.date)}</td>
                    <td>{item.status ? <StatusBadge status={item.status} /> : "—"}</td>
                    <td className="bp-td-muted">{item.location_name || "—"}</td>
                    <td className="bp-td-muted">{item.financial_account_name || "—"}</td>
                    <td className="bp-td-strong">{item.amount !== undefined ? inr(item.amount) : item.qty_delta !== undefined ? item.qty_delta : "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function TransactionDetail({ detail, onOpen, onBack }) {
  const { table, related, ...row } = detail;
  const moduleLabel = MODULE_LABELS[table] || table;

  return (
    <div className="bp-card">
      <button type="button" className="bp-btn-sm bp-btn-outline" onClick={onBack} style={{ marginBottom: 14 }}>← Back to results</button>

      <h2 className="bp-card-title">Transaction</h2>
      <div className="bp-form" style={{ gap: 6 }}>
        <DetailRow label="Transaction ID" value={<span className="bp-trans-id-link" style={{ fontSize: 14 }}>{row.universal_trans_id}</span>} />
        <DetailRow label="Transaction Type" value={moduleLabel} />
        <DetailRow label="Document" value={row.so_number || row.po_number || row.trans_id || row.transfer_number || row.batch_code || "—"} />
        <DetailRow label="Date" value={formatDate(row.entry_date || row.order_date || row.txn_date || row.transfer_date || row.run_date || row.paid_date || row.period_end || row.to_date) || "—"} />
        <DetailRow label="Status" value={row.status ? <StatusBadge status={row.status} /> : "—"} />
        {row.amount !== undefined && <DetailRow label="Amount" value={inr(row.amount)} />}
        {row.total !== undefined && <DetailRow label="Total" value={inr(row.total)} />}
        {row.net_amount !== undefined && <DetailRow label="Net amount" value={inr(row.net_amount)} />}
        {row.qty_delta !== undefined && <DetailRow label="Quantity" value={row.qty_delta} />}
        {row.description && <DetailRow label="Description" value={row.description} />}
        {row.note && <DetailRow label="Note" value={row.note} />}
      </div>

      {related && related.length > 0 && (
        <>
          <h2 className="bp-card-title" style={{ marginTop: 20 }}>Related Transactions</h2>
          <div className="bp-table-wrap">
            <table className="bp-table">
              <thead>
                <tr><th>Relation</th><th>Module</th><th>TransID</th></tr>
              </thead>
              <tbody>
                {related.map((r, i) => (
                  <tr key={i} style={{ cursor: "pointer" }} onClick={() => onOpen(r.universal_trans_id)}>
                    <td className="bp-td-muted">{RELATION_LABELS[r.relation] || r.relation}</td>
                    <td>{MODULE_LABELS[r.table] || r.table}</td>
                    <td className="bp-trans-id-link">{r.universal_trans_id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

const MODULE_LABELS = {
  sales_orders: "Sales Order",
  purchase_orders: "Purchase Order",
  cashbook_entries: "Cash Book",
  inventory_movements: "Inventory",
  bank_transactions: "Bank Transaction",
  stock_transfers: "Stock Transfer",
  production_runs: "Production Run",
  salary_payments: "Salary Payment",
  partner_settlements: "Partner Settlement",
  reconciliation_batches: "Reconciliation",
};

function DetailRow({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "4px 0", borderBottom: "1px solid var(--bp-border)" }}>
      <span className="bp-td-muted">{label}</span>
      <span className="bp-td-strong">{value}</span>
    </div>
  );
}
