import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { useAuth } from "../auth/AuthContext";
import { dashboardApi } from "../api/admin";
import { ApiError } from "../api/client";
import "./Dashboard.css";

function inr(n) {
  return "₹" + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function fmtShortDate(iso) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

// Chart palette — Bismi's own brand purple + amber (theme.css's
// --bp-brand/--bp-amber), not nammahearth's literal plum/cream hex.
// Kept as plain hex here (not CSS vars) since recharts reads colors as
// JS props, not through CSS custom properties. Chart cards are white
// (owner request 2026-08-29) — axis/grid/tick colors below are tuned
// for a light card, not the earlier dark-purple one.
const CHART_COLORS = { amber: "#e8940f", purple: "#5b1f97" };
const PIE_COLORS = [CHART_COLORS.amber, CHART_COLORS.purple];
const AXIS_TICK = { fill: "#6a625c", fontSize: 11 };
const AXIS_LINE = { stroke: "rgba(43, 36, 32, 0.14)" };
const GRID_STROKE = "rgba(43, 36, 32, 0.1)";

function ChartTooltip({ active, payload, label, formatter }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{ background: "#2a1547", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 6, padding: "8px 10px", fontSize: 12, color: "#fff" }}>
      {label != null && <div style={{ marginBottom: 4, fontWeight: 700 }}>{label}</div>}
      {payload.map((p, i) => (
        <div key={i}>{formatter ? formatter(p) : `${p.name}: ${p.value}`}</div>
      ))}
    </div>
  );
}

const QUICK_ACTIONS = [
  { label: "Add cash book entry", path: "/cashbook", icon: "💰" },
  { label: "Receive stock", path: "/inventory", icon: "📥" },
  { label: "New purchase order", path: "/purchase-orders", icon: "📋" },
  { label: "Start production run", path: "/production", icon: "⚙️" },
];

// Shared by Revenue trend + Top products only — Cash vs Bank and
// Production Pipeline are live point-in-time snapshots, unaffected by
// this selector (owner-confirmed rule).
const PERIOD_OPTIONS = [
  { value: 7, label: "Last 7 days" },
  { value: 14, label: "Last 14 days" },
  { value: 30, label: "Last 30 days" },
  { value: 90, label: "Last 90 days" },
];

const PIPELINE_LABELS = { planned: "Planned", in_progress: "In Progress", completed: "Completed", cancelled: "Cancelled" };

export default function Dashboard() {
  const { admin } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState(14);

  useEffect(() => {
    setLoading(true);
    dashboardApi
      .getStats(period)
      .then(setStats)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load dashboard data."))
      .finally(() => setLoading(false));
  }, [period]);

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
        <>
          <div className="bp-kpi-grid bp-kpi-grid-featured">
            <KpiCard label="Today's sales" value={inr(stats.today_sales)} icon="💰" featured />
            <KpiCard label="Today's purchases" value={inr(stats.today_purchases)} sub="Received today" icon="📦" featured />
            <KpiCard label="Today's production" value={stats.today_production_completed ?? 0} sub="Runs completed today" icon="⚙️" featured />
            <KpiCard label="Today's production cost" value={inr(stats.today_production_cost)} icon="💵" featured />
          </div>

          <div className="bp-kpi-grid">
            <KpiCard label="Total balance" value={inr(stats.total_balance)} tone="success" onClick={() => navigate("/bank-accounts")} />
            <KpiCard label="Low stock items" value={stats.low_stock?.length || 0} tone="danger" onClick={() => navigate("/inventory")} />
            <KpiCard label="Pending purchase orders" value={stats.pending_purchase_orders || 0} tone="warning" onClick={() => navigate("/purchase-orders")} />
            <KpiCard label="Today's production runs" value={stats.today_production_runs || 0} tone="neutral" onClick={() => navigate("/production")} />
            <KpiCard label="Outstanding vendor payments" value={inr(stats.outstanding_vendor_payments)} tone="warning" onClick={() => navigate("/purchase-orders")} />
          </div>
        </>
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

      {stats && (
        <>
          <div className="bp-dashboard-period-row">
            <label className="bp-dashboard-period-label" htmlFor="dashboardPeriod">Period (Revenue trend &amp; Top products)</label>
            <select
              id="dashboardPeriod"
              className="bp-field-input bp-dashboard-period-select"
              value={period}
              onChange={(e) => setPeriod(Number(e.target.value))}
            >
              {PERIOD_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          <div className="bp-dashboard-charts">
            <div className="bp-chart-card">
              <h2 className="bp-chart-card-title">Revenue trend</h2>
              <p className="bp-chart-card-sub">{PERIOD_OPTIONS.find((o) => o.value === period)?.label}, completed sales</p>
              {stats.sales_trend && stats.sales_trend.some((d) => d.sales > 0) ? (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={stats.sales_trend} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="bpRevenueFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={CHART_COLORS.amber} stopOpacity={0.35} />
                        <stop offset="100%" stopColor={CHART_COLORS.amber} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                    <XAxis dataKey="date" tickFormatter={fmtShortDate} tick={AXIS_TICK} axisLine={AXIS_LINE} tickLine={false} />
                    <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} width={54} tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)} />
                    <Tooltip content={<ChartTooltip formatter={(p) => `${inr(p.payload.sales)} · ${p.payload.orders} order${p.payload.orders === 1 ? "" : "s"}`} />} labelFormatter={fmtShortDate} />
                    <Area type="monotone" dataKey="sales" stroke={CHART_COLORS.amber} strokeWidth={2} fill="url(#bpRevenueFill)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="bp-chart-empty">No completed sales in the {PERIOD_OPTIONS.find((o) => o.value === period)?.label.toLowerCase()} yet.</div>
              )}
            </div>

            <div className="bp-chart-card">
              <h2 className="bp-chart-card-title">Cash vs. Bank position</h2>
              <p className="bp-chart-card-sub">Current balances</p>
              {stats.cash_balance || stats.bank_balance ? (
                <>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Bank", value: Math.max(0, stats.bank_balance) },
                          { name: "Cash", value: Math.max(0, stats.cash_balance) },
                        ]}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                      >
                        {PIE_COLORS.map((c, i) => <Cell key={i} fill={c} />)}
                      </Pie>
                      <Tooltip content={<ChartTooltip formatter={(p) => `${p.name}: ${inr(p.value)}`} />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="bp-chart-legend-row">
                    <span><span className="bp-chart-legend-dot" style={{ background: CHART_COLORS.amber }} />Bank — {inr(stats.bank_balance)}</span>
                    <span><span className="bp-chart-legend-dot" style={{ background: CHART_COLORS.purple }} />Cash — {inr(stats.cash_balance)}</span>
                  </div>
                </>
              ) : (
                <div className="bp-chart-empty">No balance recorded yet.</div>
              )}
            </div>
          </div>

          <div className="bp-dashboard-charts-secondary">
            <div className="bp-chart-card">
              <h2 className="bp-chart-card-title">Top products</h2>
              <p className="bp-chart-card-sub">By revenue, {PERIOD_OPTIONS.find((o) => o.value === period)?.label.toLowerCase()}</p>
              {stats.top_items && stats.top_items.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={stats.top_items} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} horizontal={false} />
                    <XAxis type="number" tick={AXIS_TICK} axisLine={false} tickLine={false} tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)} />
                    <YAxis type="category" dataKey="item_name" tick={{ fill: "#3a332e", fontSize: 11 }} axisLine={false} tickLine={false} width={110} />
                    <Tooltip content={<ChartTooltip formatter={(p) => `${inr(p.payload.revenue)} · qty ${p.payload.quantity}`} />} />
                    <Bar dataKey="revenue" fill={CHART_COLORS.amber} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="bp-chart-empty">No completed sales in the {PERIOD_OPTIONS.find((o) => o.value === period)?.label.toLowerCase()} yet.</div>
              )}
            </div>

            <div className="bp-chart-card">
              <h2 className="bp-chart-card-title">Production pipeline</h2>
              <p className="bp-chart-card-sub">Current production runs by status</p>
              {stats.production_pipeline && Object.values(stats.production_pipeline).some((n) => n > 0) ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart
                    data={["planned", "in_progress", "completed", "cancelled"].map((k) => ({ stage: PIPELINE_LABELS[k], count: stats.production_pipeline[k] || 0 }))}
                    margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                    <XAxis dataKey="stage" tick={AXIS_TICK} axisLine={AXIS_LINE} tickLine={false} />
                    <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} width={30} allowDecimals={false} />
                    <Tooltip content={<ChartTooltip formatter={(p) => `${p.value} run${p.value === 1 ? "" : "s"}`} />} />
                    <Bar dataKey="count" fill={CHART_COLORS.amber} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="bp-chart-empty">No production runs recorded yet.</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function KpiCard({ label, value, sub, tone, onClick, icon, featured }) {
  return (
    <div
      className={"bp-kpi-card" + (onClick ? " bp-kpi-clickable" : "") + (tone ? ` bp-kpi-${tone}` : "") + (featured ? " bp-kpi-featured" : "")}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {icon && <span className="bp-kpi-icon" aria-hidden="true">{icon}</span>}
      <div className="bp-kpi-label">{label}</div>
      <div className="bp-kpi-value">{value}</div>
      {sub && <div className="bp-kpi-sub">{sub}</div>}
    </div>
  );
}
