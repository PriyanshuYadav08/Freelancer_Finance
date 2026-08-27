import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Send, MoreHorizontal } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { getClientDetail } from "../api.js";
import StatusPill from "../components/StatusPill.jsx";
import "./ClientDetail.css";

const inr = (n) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const lakhs = (n) => `${(n / 100000).toFixed(1)}`;

const TABS = ["Overview", "Invoices", "Payments", "Projects", "Notes"];

export default function ClientDetail() {
  const { id } = useParams();
  const [client, setClient] = useState(null);
  const [tab, setTab] = useState("Overview");
  const [error, setError] = useState(null);

  useEffect(() => {
    setClient(null);
    getClientDetail(id).then(setClient).catch(() => setError("Couldn't load this client."));
  }, [id]);

  if (error) return <div className="empty-state">{error}</div>;
  if (!client) return <div className="empty-state">Loading client…</div>;

  const lastPayment = client.last_payment_date
    ? `Last payment ${daysAgo(client.last_payment_date)} days ago`
    : "No payments yet";

  return (
    <div className="client-detail">
      <header className="cd-header">
        <div>
          <div className="cd-title-row">
            <h1>{client.name}</h1>
            <StatusPill status={client.status} />
          </div>
          <p className="subtitle">Client since — · {lastPayment}</p>
        </div>
        <div className="cd-actions">
          <button className="btn btn-primary"><Send size={14} /> Send Invoice</button>
          <button className="btn-icon"><MoreHorizontal size={16} /></button>
        </div>
      </header>

      <div className="tabs">
        {TABS.map((t) => (
          <button key={t} className={"tab" + (tab === t ? " active" : "")} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      {tab !== "Overview" ? (
        <div className="panel empty-state">This view isn't built yet in the MVP.</div>
      ) : (
        <>
          <section className="stat-grid-4">
            <MiniStat label="Lifetime revenue" value={inr(client.lifetime_revenue)} />
            <MiniStat label="Revenue contribution" value={`${client.revenue_contribution_pct.toFixed(0)}%`} />
            <MiniStat label="Payment reliability" value={`${client.reliability_score}/100`} />
            <MiniStat label="Avg payment delay" value={`${client.avg_delay_days} days`} />
          </section>

          <section className="mid-row">
            <div className="panel">
              <h2 className="panel-title">Revenue Over Time</h2>
              <div className="chart-axis-label">₹ in Lakhs</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={client.revenue_over_time} margin={{ top: 10, right: 6, left: -18, bottom: 0 }}>
                  <CartesianGrid stroke="var(--border-soft)" vertical={false} />
                  <XAxis dataKey="month" stroke="var(--text-dim)" fontSize={11} tickLine={false} axisLine={{ stroke: "var(--border)" }} />
                  <YAxis stroke="var(--text-dim)" fontSize={11} tickLine={false} axisLine={false} width={28} tickFormatter={(v) => lakhs(v)} />
                  <Tooltip
                    contentStyle={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                    formatter={(v) => [inr(v), "Revenue"]}
                  />
                  <Bar dataKey="revenue" fill="var(--text-dim)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="panel">
              <h2 className="panel-title">AI Insight</h2>
              <p className="ai-insight-text">{client.ai_insight}</p>
              <button className="btn btn-ghost">View details</button>
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <h2 className="panel-title">Recent Invoices</h2>
              <span className="link-muted">View all invoices</span>
            </div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Invoice</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Issued</th>
                    <th>Due</th>
                    <th>Paid On</th>
                  </tr>
                </thead>
                <tbody>
                  {client.invoices.slice(0, 5).map((inv) => (
                    <tr key={inv.id}>
                      <td className="mono">{inv.invoice_number}</td>
                      <td className="mono">{inr(inv.amount)}</td>
                      <td><StatusPill status={inv.status} /></td>
                      <td>{inv.issue_date}</td>
                      <td>{inv.due_date}</td>
                      <td>{inv.paid_date || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function daysAgo(isoDate) {
  const diff = Math.round((Date.now() - new Date(isoDate).getTime()) / 86400000);
  return diff;
}

function MiniStat({ label, value }) {
  return (
    <div className="panel mini-stat">
      <div className="panel-label">{label}</div>
      <div className="mini-stat-value mono">{value}</div>
    </div>
  );
}
