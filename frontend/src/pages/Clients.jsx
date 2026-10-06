import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { getClients } from "../api.js";
import StatusPill from "../components/StatusPill.jsx";
import ClientModal from "../components/ClientModal.jsx";
import "./Clients.css";

const inr = (n) => `₹${Math.round(n).toLocaleString("en-IN")}`;

export default function Clients() {
  const [clients, setClients] = useState(null);
  const [error, setError] = useState(null);
  const [showAddClient, setShowAddClient] = useState(false);
  const navigate = useNavigate();

  function fetchClients() {
    getClients().then(setClients).catch(() => setError("Couldn't reach the API. Is the backend running?"));
  }

  useEffect(() => {
    fetchClients();
  }, []);

  if (error) return <div className="empty-state">{error}</div>;
  if (!clients) return <div className="empty-state">Loading clients…</div>;

  return (
    <div className="clients-page">
      <header className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <p className="eyebrow">CLIENTS</p>
          <h1>Your client roster</h1>
          <p className="subtitle">{clients.length} clients on file</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddClient(true)}>
          <Plus size={15} /> Add Client
        </button>
      </header>

      {showAddClient && (
        <ClientModal
          onClose={() => setShowAddClient(false)}
          onCreated={() => fetchClients()}
        />
      )}

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
                  <td className="mono">{inr(c.lifetime_revenue || 0)}</td>
                  <td className="mono">{(c.revenue_contribution_pct || 0).toFixed(0)}%</td>
                  <td className="mono">{c.reliability_score || 75}/100</td>
                  <td className="mono">{c.avg_delay_days || 0}d</td>
                  <td className="mono">{inr(c.outstanding || 0)}</td>
                </tr>
              ))}
              {clients.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "30px", color: "var(--text-muted)" }}>
                    No clients yet. Click "Add Client" above to create your first client.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
