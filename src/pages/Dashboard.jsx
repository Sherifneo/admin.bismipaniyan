import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { dashboardApi } from "../api/admin";
import { ApiError } from "../api/client";
import "./Dashboard.css";

function inr(n) {
  return "₹" + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

const QUICK_ACTIONS = [
  { label: "Add cash book entry", path: "/cashbook", icon: "💰" },
  { label: "Receive stock", path: "/inventory", icon: "📥" },
  { label: "New purchase order", path: "/purchase-orders", icon: "📋" },
  { label: "Start production run", path: "/production", icon: "⚙️" },
];

export default function Dashboard() {
  const { admin } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    dashboardApi
      .getStats(14)
      .then(setStats)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load dashboard data."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="bp-page-title" style={{ marginBottom: 4 }}>
        Welcome, {admin?.full_name?.split(" ")[0] || "there"}
      </h1>
      <p className="bp-td-muted" style={{ margin: "0 0 18px" }}>
        Signed in as {admin?.email} · {admin?.role === "owner" ? "Owner" : "Staff"}
      </p>

      {error && <div className="bp-inline-error">{error}</div>}

      {loading ? (
        <div>Loading…</div>
      ) : stats ? (
        <div className="bp-kpi-grid">
          <KpiCard label="Cash balance" value={inr(stats.cash_balance)} tone="success" onClick={() => navigate("/cashbook")} />
          <KpiCard label="Bank balance" value={inr(stats.bank_balance)} tone="success" onClick={() => navigate("/bank-accounts")} />
          <KpiCard label="Low stock items" value={stats.low_stock?.length || 0} tone="danger" onClick={() => navigate("/inventory")} />
          <KpiCard label="Pending purchase orders" value={stats.pending_purchase_orders || 0} tone="warning" onClick={() => navigate("/purchase-orders")} />
          <KpiCard label="Today's production runs" value={stats.today_production_runs || 0} tone="neutral" onClick={() => navigate("/production")} />
          <KpiCard label="Outstanding vendor payments" value={inr(stats.outstanding_vendor_payments)} tone="warning" onClick={() => navigate("/purchase-orders")} />
        </div>
      ) : (
        <div className="bp-td-muted">No dashboard data yet — connect the admin API to see live figures here.</div>
      )}

      <div className="bp-dashboard-row">
        <div className="bp-card bp-dashboard-quick">
          <h2 className="bp-card-title">Quick actions</h2>
          <div className="bp-quick-actions">
            {QUICK_ACTIONS.map((a) => (
              <button key={a.path} type="button" className="bp-quick-action" onClick={() => navigate(a.path)}>
                <span aria-hidden="true">{a.icon}</span>
                {a.label}
              </button>
            ))}
          </div>
        </div>

        {stats?.low_stock && (
          <div className="bp-card">
            <h2 className="bp-card-title">Low stock</h2>
            {stats.low_stock.length === 0 ? (
              <div className="bp-td-muted">Nothing is low on stock right now.</div>
            ) : (
              <table className="bp-table">
                <thead>
                  <tr><th>Item</th><th>SKU</th><th>Stock</th><th>Alert at</th></tr>
                </thead>
                <tbody>
                  {stats.low_stock.slice(0, 6).map((it) => (
                    <tr key={it.item_id}>
                      <td className="bp-td-strong">{it.name}</td>
                      <td className="bp-td-muted">{it.sku}</td>
                      <td>{it.stock_qty}</td>
                      <td>{it.low_stock_alert}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function KpiCard({ label, value, sub, tone, onClick }) {
  return (
    <div
      className={"bp-kpi-card" + (onClick ? " bp-kpi-clickable" : "") + (tone ? ` bp-kpi-${tone}` : "")}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="bp-kpi-label">{label}</div>
      <div className="bp-kpi-value">{value}</div>
      {sub && <div className="bp-kpi-sub">{sub}</div>}
    </div>
  );
}
