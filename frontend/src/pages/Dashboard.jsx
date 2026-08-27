import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, ChevronDown, AlertCircle, Clock, Receipt } from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, ReferenceLine, CartesianGrid,
} from "recharts";
import { getDashboard, getCashflowForecast, getInvoices } from "../api.js";
import Sparkline from "../components/Sparkline.jsx";
import "./Dashboard.css";

const inr = (n) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const lakhs = (n) => `₹${(n / 100000).toFixed(2)}L`;

const FORECAST_OPTIONS = [3, 6, 12];

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [cashflow, setCashflow] = useState(null);
  const [months, setMonths] = useState(6);
  const [upcoming, setUpcoming] = useState({ overdue: null, due: null });
  const [menuOpen, setMenuOpen] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([getDashboard(), getCashflowForecast(6, months)])
      .then(([d, cf]) => {
        setData(d);
        setCashflow(cf);
      })
      .catch(() => setError("Couldn't reach the API. Is the backend running?"));
  }, [months]);

  useEffect(() => {
    Promise.all([
      getInvoices({ status: "overdue", page_size: 1 }),
      getInvoices({ status: "due", page_size: 1 }),
    ])
      .then(([overdueRes, dueRes]) => {
        setUpcoming({
          overdue: overdueRes.invoices[0] || null,
          due: dueRes.invoices[0] || null,
        });
      })
      .catch(() => {});
  }, []);

  if (error) return <div className="empty-state">{error}</div>;
  if (!data || !cashflow) return <div className="empty-state">Loading your dashboard…</div>;

  const merged = buildChartSeries(cashflow);
  const boundaryLabel = cashflow.forecast[0]
    ? `${cashflow.forecast[0].month} · ${lakhs(cashflow.forecast[0].value)}`
    : null;

  const insights = buildInsights(data);

  return (
    <div className="dashboard">
      <header className="dash-header">
        <div>
          <h1>Good morning, Priyanshu 👋</h1>
          <p className="subtitle">Here's what's happening with your business today.</p>
        </div>
        <button className="btn btn-primary">
          <Plus size={15} /> Add Income
        </button>
      </header>

      <section className="stat-grid">
        <StatCard
          label="Financial Health"
          value={<>{data.financial_health}<span className="stat-suffix">/100</span></>}
          sub={data.trends.health.delta_label}
          trend={data.trends.health.trend}
        />
        <StatCard
          label="Cash in Hand"
          value={inr(data.current_cash)}
          sub={data.trends.cash.delta_label}
          trend={data.trends.cash.trend}
        />
        <StatCard
          label="Runway"
          value={`${data.runway_months} months`}
          sub={data.trends.runway.delta_label}
          trend={data.trends.runway.trend}
        />
        <StatCard
          label="Safe to Spend"
          value={inr(data.safe_to_spend)}
          sub={data.trends.safe_to_spend.delta_label}
          trend={data.trends.safe_to_spend.trend}
        />
      </section>

      <section className="mid-row">
        <div className="panel forecast-panel">
          <div className="panel-head">
            <h2 className="panel-title">Cash Flow Forecast</h2>
            <div className="month-select">
              <button className="btn btn-ghost" onClick={() => setMenuOpen((o) => !o)}>
                Next {months} Months <ChevronDown size={13} />
              </button>
              {menuOpen && (
                <div className="month-menu">
                  {FORECAST_OPTIONS.map((m) => (
                    <button key={m} onClick={() => { setMonths(m); setMenuOpen(false); }}>
                      Next {m} Months
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="chart-axis-label">₹ in Lakhs</div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={merged} margin={{ top: 10, right: 10, left: -14, bottom: 0 }}>
              <defs>
                <linearGradient id="actualFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--text)" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="var(--text)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--border-soft)" vertical={false} />
              <XAxis dataKey="month" stroke="var(--text-dim)" fontSize={11} tickLine={false} axisLine={{ stroke: "var(--border)" }} />
              <YAxis
                stroke="var(--text-dim)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => (v / 100000).toFixed(0)}
                width={28}
              />
              <Tooltip
                contentStyle={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: "var(--text)" }}
                formatter={(v) => [lakhs(v), "Cash"]}
              />
              {boundaryLabel && (
                <ReferenceLine
                  x={cashflow.history[cashflow.history.length - 1].month}
                  stroke="var(--border)"
                  strokeDasharray="3 3"
                  label={{ value: boundaryLabel, position: "top", fill: "var(--text-muted)", fontSize: 11 }}
                />
              )}
              <Area type="monotone" dataKey="actual" stroke="var(--text)" strokeWidth={1.8} fill="url(#actualFill)" connectNulls dot={false} />
              <Area type="monotone" dataKey="forecast" stroke="var(--text-dim)" strokeWidth={1.8} strokeDasharray="4 4" fill="none" connectNulls dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="panel insights-panel">
          <h2 className="panel-title">AI Insights</h2>
          <ul className="insight-list">
            {insights.map((line, i) => (
              <li key={i}>
                <span className="insight-dot" />
                {line}
              </li>
            ))}
          </ul>
          <Link to="/insights" className="btn btn-ghost btn-block">View all insights</Link>
        </div>
      </section>

      <section className="panel upcoming-panel">
        <h2 className="panel-title">Upcoming</h2>
        <div className="upcoming-grid">
          {upcoming.overdue ? (
            <UpcomingItem
              icon={<AlertCircle size={16} />}
              title="Invoice overdue"
              subtitle={`${upcoming.overdue.invoice_number} from ${upcoming.overdue.client_name}`}
              meta={`${inr(upcoming.overdue.amount)} · overdue`}
              action="Review"
              to="/invoices"
            />
          ) : (
            <UpcomingItem icon={<AlertCircle size={16} />} title="Invoice overdue" subtitle="Nothing overdue" meta="" action="View" to="/invoices" />
          )}
          {upcoming.due ? (
            <UpcomingItem
              icon={<Clock size={16} />}
              title="Payment expected"
              subtitle={`From ${upcoming.due.client_name}`}
              meta={`${inr(upcoming.due.amount)} · due ${upcoming.due.due_date}`}
              action="View"
              to="/invoices"
            />
          ) : (
            <UpcomingItem icon={<Clock size={16} />} title="Payment expected" subtitle="Nothing due soon" meta="" action="View" to="/invoices" />
          )}
          <UpcomingItem
            icon={<Receipt size={16} />}
            title="Expense"
            subtitle="Recurring monthly bills"
            meta={`${inr(data.monthly_burn)} · essentials`}
            action="View all"
            to="/expenses"
          />
        </div>
      </section>
    </div>
  );
}

function buildChartSeries(cashflow) {
  const rows = cashflow.history.map((h, i) => ({
    month: h.month,
    actual: h.value,
    forecast: i === cashflow.history.length - 1 ? h.value : null,
  }));
  cashflow.forecast.forEach((f) => rows.push({ month: f.month, actual: null, forecast: f.value }));
  return rows;
}

function buildInsights(data) {
  const lines = [];
  if (data.top_client_name) {
    lines.push(`${data.top_client_name} contributes ${data.revenue_concentration_pct.toFixed(0)}% of your total revenue.`);
  }
  if (data.overdue_invoice_count > 0) {
    lines.push(`You have ${data.overdue_invoice_count} overdue invoice${data.overdue_invoice_count > 1 ? "s" : ""} totaling ${inr(data.overdue_invoice_total)}.`);
  } else {
    lines.push("No overdue invoices right now — collections are on track.");
  }
  lines.push(`Your tax reserve for recent income is set at ${inr(data.tax_reserve)}.`);
  lines.push(`Financial health is ${data.financial_health}/100 — ${data.trends.health.delta_label.toLowerCase()}.`);
  return lines.slice(0, 4);
}

function StatCard({ label, value, sub, trend }) {
  return (
    <div className="panel stat-card">
      <div className="panel-label">{label}</div>
      <div className="stat-value mono">{value}</div>
      <div className="stat-sub">{sub}</div>
      <div className="stat-spark">
        <Sparkline points={trend} width={140} height={30} />
      </div>
    </div>
  );
}

function UpcomingItem({ icon, title, subtitle, meta, action, to }) {
  return (
    <div className="upcoming-item">
      <span className="upcoming-icon">{icon}</span>
      <div className="upcoming-body">
        <div className="upcoming-title">{title}</div>
        <div className="upcoming-subtitle">{subtitle}</div>
        {meta && <div className="upcoming-meta mono">{meta}</div>}
      </div>
      <Link to={to} className="upcoming-action">{action}</Link>
    </div>
  );
}
