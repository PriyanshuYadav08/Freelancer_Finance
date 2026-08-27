import { useEffect, useState } from "react";
import { getExpenses } from "../api.js";

const inr = (n) => `₹${Math.round(n).toLocaleString("en-IN")}`;

export default function Expenses() {
  const [expenses, setExpenses] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    getExpenses().then(setExpenses).catch(() => setError("Couldn't reach the API. Is the backend running?"));
  }, []);

  if (error) return <div className="empty-state">{error}</div>;
  if (!expenses) return <div className="empty-state">Loading expenses…</div>;

  const recurringTotal = expenses.filter((e) => e.recurring).reduce((s, e) => s + e.amount, 0);

  return (
    <div style={{ maxWidth: 860, display: "flex", flexDirection: "column", gap: 16 }}>
      <header className="page-header">
        <p className="eyebrow">EXPENSES</p>
        <h1>Where your money goes</h1>
        <p className="subtitle">{inr(recurringTotal)}/month in recurring essential costs</p>
      </header>

      <div className="panel">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>Expense</th><th>Category</th><th>Amount</th><th>Type</th><th>Date</th></tr>
            </thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e.id}>
                  <td className="client-name">{e.name}</td>
                  <td style={{ textTransform: "capitalize", color: "var(--text-muted)" }}>{e.category}</td>
                  <td className="mono">{inr(e.amount)}</td>
                  <td>
                    <span className={"pill " + (e.recurring ? "pill-neutral" : "pill-warn")}>
                      {e.recurring ? "Recurring" : "One-time"}
                    </span>
                  </td>
                  <td>{e.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
