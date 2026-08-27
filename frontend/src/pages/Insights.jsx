import { useEffect, useState } from "react";
import { getDashboard } from "../api.js";
import "./Insights.css";

const inr = (n) => `₹${Math.round(n).toLocaleString("en-IN")}`;

export default function Insights() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    getDashboard().then(setData).catch(() => setError("Couldn't reach the API. Is the backend running?"));
  }, []);

  if (error) return <div className="empty-state">{error}</div>;
  if (!data) return <div className="empty-state">Loading insights…</div>;

  const insights = buildAllInsights(data);

  return (
    <div className="insights-page">
      <header className="page-header">
        <p className="eyebrow">INSIGHTS</p>
        <h1>What the numbers are telling you</h1>
      </header>

      <div className="panel">
        <ul className="full-insight-list">
          {insights.map((line, i) => (
            <li key={i}>
              <span className="insight-dot" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function buildAllInsights(data) {
  const lines = [];
  if (data.top_client_name) {
    lines.push(`${data.top_client_name} contributes ${data.revenue_concentration_pct.toFixed(0)}% of your total revenue.`);
    if (data.revenue_concentration_pct >= 40) {
      lines.push(`That concentration is high enough to be a real risk — losing ${data.top_client_name} would hit disproportionately hard.`);
    }
  }
  if (data.overdue_invoice_count > 0) {
    lines.push(`${data.overdue_invoice_count} invoice(s) totaling ${inr(data.overdue_invoice_total)} are overdue — chasing these is the fastest lever on your safe-to-spend.`);
  } else {
    lines.push("No overdue invoices right now — collections are on track.");
  }
  lines.push(`Your tax reserve for recent income is set at ${inr(data.tax_reserve)}, based on a flat-rate estimate.`);
  lines.push(`Financial health is ${data.financial_health}/100 — ${data.trends.health.delta_label.toLowerCase()}.`);
  lines.push(`Runway sits at ${data.runway_months} months against essential burn of ${inr(data.monthly_burn)}/month.`);
  data.alerts.forEach((a) => lines.push(a));
  return [...new Set(lines)];
}
