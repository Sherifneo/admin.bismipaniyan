import { useEffect, useState } from "react";
import { settingsApi } from "../../api/admin";
import { ApiError } from "../../api/client";

// Thin, read-only display of where the two number sequences Bismi cares
// about (purchase order numbers, product SKUs) currently stand. No
// forms, no editing.
export default function NumberSequencesPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      try {
        const result = await settingsApi.listNumberSequences();
        setData(result);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Could not load number sequences.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div>
      <h1 className="bp-page-title">Number Sequences</h1>
      <p className="bp-td-muted" style={{ margin: "-6px 0 14px" }}>
        Read-only view of the numbering currently in use.
      </p>

      {error && <div className="bp-inline-error">{error}</div>}

      <div className="bp-table-wrap" style={{ padding: 16, maxWidth: 480 }}>
        {loading ? (
          <div className="bp-td-muted">Loading…</div>
        ) : !data ? (
          <div className="bp-td-muted">No data.</div>
        ) : (
          <table className="bp-table">
            <tbody>
              <tr>
                <td className="bp-td-strong">Last PO number issued</td>
                <td>{data.last_po_number || "—"}</td>
              </tr>
              <tr>
                <td className="bp-td-strong">Total purchase orders</td>
                <td>{data.po_count}</td>
              </tr>
              <tr>
                <td className="bp-td-strong">Total products</td>
                <td>{data.product_count}</td>
              </tr>
              <tr>
                <td className="bp-td-strong">Product SKU range</td>
                <td>
                  {data.product_sku_range?.min != null && data.product_sku_range?.max != null
                    ? `${data.product_sku_range.min}–${data.product_sku_range.max}`
                    : "—"}
                </td>
              </tr>
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
