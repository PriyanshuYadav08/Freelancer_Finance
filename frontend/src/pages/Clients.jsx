import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getClients } from "../api.js";
import StatusPill from "../components/StatusPill.jsx";
import "./Clients.css";

const inr = (n) => `₹${Math.round(n).toLocaleString("en-IN")}`;

export default function Clients() {
  const [clients, setClients] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    getClients().then(setClients).catch(() => setError("Couldn't reach the API. Is the backend running?"));
  }, []);

  if (error) return <div className="empty-state">{error}</div>;
  if (!clients) return <div className="empty-state">Loading clients…</div>;

  return (
    <div className="clients-page">
      <header className="page-header">
        <p className="eyebrow">CLIENTS</p>
        <h1>Your client roster</h1>
        <p className="subtitle">{clients.length} clients on file</p>
      </header>

      <div className="panel">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Status</th>
                <th>Lifetime revenue</th>
                <th>Contribution</th>
                <th>Reliability</th>
                <th>Avg delay</th>
                <th>Outstanding</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id} className="clickable-row" onClick={() => navigate(`/clients/${c.id}`)}>
                  <td className="client-name">{c.name}</td>
                  <td><StatusPill status={c.status} /></td>
                  <td className="mono">{inr(c.lifetime_revenue)}</td>
                  <td className="mono">{c.revenue_contribution_pct.toFixed(0)}%</td>
                  <td className="mono">{c.reliability_score}/100</td>
                  <td className="mono">{c.avg_delay_days}d</td>
                  <td className="mono">{inr(c.outstanding)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
