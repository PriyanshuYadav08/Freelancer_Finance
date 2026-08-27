import { useEffect, useState } from "react";
import { getDashboard } from "../api.js";
import RunwayGauge from "../components/RunwayGauge.jsx";
import "./Dashboard.css";

const inr = (n) => `₹${Math.round(n).toLocaleString("en-IN")}`;

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    getDashboard().then(setData).catch(() => setError("Couldn't reach the API. Is the backend running?"));
  }, []);

  if (error) return <div className="empty-state">{error}</div>;
  if (!data) return <div className="empty-state">Loading your ledger…</div>;

  const breakdown = [
    { label: "Current cash", value: data.current_cash, sign: "" },
    { label: "Upcoming essentials", value: -data.upcoming_essential_expenses, sign: "-" },
    { label: "Tax reserve", value: -data.tax_reserve, sign: "-" },
    { label: "Operating reserve", value: -data.operating_reserve, sign: "-" },
    {
      label: "Reliable receivables (30d)",
      value: data.safe_to_spend - (data.current_cash - data.upcoming_essential_expenses - data.tax_reserve - data.operating_reserve),
      sign: "+",
    },
  ];

  return (
    <div className="dashboard">
      <header className="page-header">
        <p className="eyebrow mono">OVERVIEW · {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
        <h1>Where your business stands</h1>
      </header>

      <section className="hero-row">
        <div className="panel hero-sts">
          <div className="panel-label">SAFE-TO-SPEND</div>
          <div className="sts-figure mono">{inr(data.safe_to_spend)}</div>
          <ul className="ledger-breakdown">
            {breakdown.map((row) => (
              <li key={row.label}>
                <span>{row.label}</span>
                <span className={"mono " + (row.value < 0 ? "neg" : row.value > 0 ? "pos" : "")}>
                  {row.value < 0 ? "−" : row.value > 0 && row.sign === "+" ? "+" : ""}
                  {inr(Math.abs(row.value))}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="panel hero-runway">
          <div className="panel-label">RUNWAY</div>
          <RunwayGauge months={data.runway_months} />
          <div className="risk-row">
            <RiskBadge runway={data.runway_months} />
            <span className="burn-note mono">burn ₹{Math.round(data.monthly_burn).toLocaleString("en-IN")}/mo</span>
          </div>
        </div>
      </section>

      <section className="stat-grid">
        <StatCard label="Outstanding invoices" value={inr(data.outstanding_invoices)} sub={`${data.overdue_invoice_count} overdue · ${inr(data.overdue_invoice_total)}`} tone={data.overdue_invoice_count ? "risk" : "neutral"} />
        <StatCard label="Probability-adjusted receivables" value={inr(data.adjusted_receivables)} sub="weighted by client reliability" />
        <StatCard label="Revenue concentration" value={`${data.revenue_concentration_pct.toFixed(0)}%`} sub={data.top_client_name || "—"} tone={data.revenue_concentration_pct >= 40 ? "risk" : "neutral"} />
        <StatCard label="Financial health" value={`${data.financial_health}/100`} sub="composite score" tone={data.financial_health >= 70 ? "positive" : data.financial_health >= 45 ? "neutral" : "risk"} />
      </section>

      <section className="panel">
        <div className="panel-label">CLIENT WATCHLIST</div>
        <div className="table-wrap">
          <table className="client-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Reliability</th>
                <th>Avg delay</th>
                <th>Outstanding</th>
                <th>Adjusted</th>
                <th>Revenue share</th>
              </tr>
            </thead>
            <tbody>
              {data.clients.map((c) => (
                <tr key={c.id}>
                  <td className="client-name">{c.name}</td>
                  <td>
                    <span className={"score-chip " + scoreTone(c.reliability_score)}>{c.reliability_score}</span>
                  </td>
                  <td className="mono">{c.avg_delay_days}d</td>
                  <td className="mono">{inr(c.total_outstanding)}</td>
                  <td className="mono">{inr(c.adjusted_receivable)}</td>
                  <td>
                    <div className="share-bar">
                      <div className="share-fill" style={{ width: `${Math.min(c.revenue_share_pct, 100)}%` }} />
                      <span className="mono share-label">{c.revenue_share_pct.toFixed(0)}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {data.alerts.length > 0 && (
        <section className="panel">
          <div className="panel-label">PRIORITIES</div>
          <ol className="priorities">
            {data.alerts.map((a, i) => (
              <li key={i}>
                <span className="mono priority-index">{String(i + 1).padStart(2, "0")}</span>
                <span>{a}</span>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}

function scoreTone(score) {
  if (score >= 75) return "tone-positive";
  if (score >= 50) return "tone-neutral";
  return "tone-risk";
}

function RiskBadge({ runway }) {
  const level = runway >= 6 ? "LOW" : runway >= 3 ? "MEDIUM" : "HIGH";
  const tone = level === "LOW" ? "tone-positive" : level === "MEDIUM" ? "tone-neutral" : "tone-risk";
  return <span className={"score-chip " + tone}>{level} RISK</span>;
}

function StatCard({ label, value, sub, tone = "neutral" }) {
  return (
    <div className={"panel stat-card tone-" + tone}>
      <div className="panel-label">{label.toUpperCase()}</div>
      <div className="stat-value mono">{value}</div>
      <div className="stat-sub">{sub}</div>
    </div>
  );
}
