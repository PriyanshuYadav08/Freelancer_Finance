import { useEffect, useState } from "react";
import { getDashboard } from "../api.js";

const inr = (n) => `₹${Math.round(n).toLocaleString("en-IN")}`;

export default function Tax() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    getDashboard().then(setData).catch(() => setError("Couldn't reach the API. Is the backend running?"));
  }, []);

  if (error) return <div className="empty-state">{error}</div>;
  if (!data) return <div className="empty-state">Loading tax reserve…</div>;

  return (
    <div style={{ maxWidth: 640, display: "flex", flexDirection: "column", gap: 16 }}>
      <header className="page-header">
        <p className="eyebrow">TAX</p>
        <h1>Tax reserve</h1>
      </header>

      <div className="panel">
        <div className="panel-label">RECOMMENDED RESERVE</div>
        <div className="stat-value mono" style={{ fontSize: 30, margin: "10px 0" }}>{inr(data.tax_reserve)}</div>
        <p style={{ color: "var(--text-muted)", fontSize: 13, lineHeight: 1.6, margin: 0 }}>
          This is a simplified estimate at a flat rate against income received in the last 30 days —
          a planning heuristic, not tax advice. A real deployment should replace this with a
          jurisdiction-specific, deterministic tax engine rather than a flat percentage.
        </p>
      </div>
    </div>
  );
}
