import { useEffect, useState } from "react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine,
} from "recharts";
import { getCashflowForecast } from "../api.js";
import "./CashFlow.css";

const inr = (n) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const lakhs = (n) => `₹${(n / 100000).toFixed(2)}L`;

export default function CashFlow() {
  const [cashflow, setCashflow] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    getCashflowForecast(6, 6).then(setCashflow).catch(() => setError("Couldn't reach the API. Is the backend running?"));
  }, []);

  if (error) return <div className="empty-state">{error}</div>;
  if (!cashflow) return <div className="empty-state">Loading cash flow…</div>;

  const merged = cashflow.history.map((h, i) => ({
    month: h.month, actual: h.value, forecast: i === cashflow.history.length - 1 ? h.value : null,
  })).concat(cashflow.forecast.map((f) => ({ month: f.month, actual: null, forecast: f.value })));

  return (
    <div className="cashflow-page">
      <header className="page-header">
        <p className="eyebrow">CASH FLOW</p>
        <h1>Cash position over time</h1>
        <p className="subtitle">Solid line is reconstructed history, dashed is the forward projection.</p>
      </header>

      <div className="panel">
        <h2 className="panel-title">Projected cash balance</h2>
        <div className="chart-axis-label">₹ in Lakhs</div>
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={merged} margin={{ top: 10, right: 10, left: -14, bottom: 0 }}>
            <defs>
              <linearGradient id="cfFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--text)" stopOpacity={0.18} />
                <stop offset="100%" stopColor="var(--text)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--border-soft)" vertical={false} />
            <XAxis dataKey="month" stroke="var(--text-dim)" fontSize={11} tickLine={false} axisLine={{ stroke: "var(--border)" }} />
            <YAxis stroke="var(--text-dim)" fontSize={11} tickLine={false} axisLine={false} width={30} tickFormatter={(v) => (v / 100000).toFixed(0)} />
            <Tooltip
              contentStyle={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
              formatter={(v) => [lakhs(v), "Cash"]}
            />
            <ReferenceLine x={cashflow.history[cashflow.history.length - 1].month} stroke="var(--border)" strokeDasharray="3 3" />
            <Area type="monotone" dataKey="actual" stroke="var(--text)" strokeWidth={1.8} fill="url(#cfFill)" connectNulls dot={false} />
            <Area type="monotone" dataKey="forecast" stroke="var(--text-dim)" strokeWidth={1.8} strokeDasharray="4 4" fill="none" connectNulls dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="panel">
        <h2 className="panel-title">Monthly income vs. expenses</h2>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>Month</th><th>Income</th><th>Expenses</th><th>Net</th></tr>
            </thead>
            <tbody>
              {cashflow.monthly_net.map((m) => (
                <tr key={m.month}>
                  <td>{m.month}</td>
                  <td className="mono">{inr(m.income)}</td>
                  <td className="mono">{inr(m.expense)}</td>
                  <td className={"mono " + (m.net >= 0 ? "tone-positive" : "tone-risk")}>{inr(m.net)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
