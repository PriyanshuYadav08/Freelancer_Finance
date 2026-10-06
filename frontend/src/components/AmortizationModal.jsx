import { useState, useEffect } from "react";
import Modal from "./Modal.jsx";
import { getLoanAmortization } from "../api.js";

export default function AmortizationModal({ isOpen, onClose, loan }) {
  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && loan?.id) {
      setLoading(true);
      setError(null);
      getLoanAmortization(loan.id)
        .then(setSchedule)
        .catch((err) => setError(err.message || "Failed to fetch amortization schedule."))
        .finally(() => setLoading(false));
    }
  }, [isOpen, loan]);

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Amortization Schedule — ${loan?.name}`}>
      {loading ? (
        <div style={{ padding: "20px", color: "var(--text-muted)", textAlign: "center" }}>
          Generating month-by-month schedule...
        </div>
      ) : error ? (
        <div style={{ color: "#ef4444", padding: "16px" }}>{error}</div>
      ) : schedule ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", background: "rgba(255,255,255,0.02)", padding: "12px", borderRadius: "6px", border: "1px solid var(--border)" }}>
            <div>
              <div style={{ fontSize: "11px", color: "var(--text-dim)" }}>PRINCIPAL</div>
              <div style={{ fontSize: "14px", fontWeight: "600" }}>${schedule.summary.principal.toLocaleString()}</div>
            </div>
            <div>
              <div style={{ fontSize: "11px", color: "var(--text-dim)" }}>TOTAL INTEREST</div>
              <div style={{ fontSize: "14px", fontWeight: "600", color: "#f59e0b" }}>${schedule.summary.total_interest.toLocaleString()}</div>
            </div>
            <div>
              <div style={{ fontSize: "11px", color: "var(--text-dim)" }}>TOTAL PAID</div>
              <div style={{ fontSize: "14px", fontWeight: "600", color: "#3b82f6" }}>${schedule.summary.total_payment.toLocaleString()}</div>
            </div>
          </div>

          <div style={{ maxHeight: "350px", overflowY: "auto", border: "1px solid var(--border)", borderRadius: "6px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead style={{ position: "sticky", top: 0, background: "var(--surface)", borderBottom: "1px solid var(--border)", color: "var(--text-dim)", fontSize: "11px" }}>
                <tr>
                  <th style={{ padding: "8px 12px", textAlign: "left" }}>MO #</th>
                  <th style={{ padding: "8px 12px", textAlign: "right" }}>PAYMENT</th>
                  <th style={{ padding: "8px 12px", textAlign: "right" }}>PRINCIPAL</th>
                  <th style={{ padding: "8px 12px", textAlign: "right" }}>INTEREST</th>
                  <th style={{ padding: "8px 12px", textAlign: "right" }}>REMAINING</th>
                </tr>
              </thead>
              <tbody>
                {schedule.schedule.map((row) => (
                  <tr key={row.month} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                    <td style={{ padding: "8px 12px", fontWeight: "600" }}>#{row.month}</td>
                    <td style={{ padding: "8px 12px", textAlign: "right" }}>${row.payment.toLocaleString()}</td>
                    <td style={{ padding: "8px 12px", textAlign: "right", color: "#10b981" }}>${row.principal_paid.toLocaleString()}</td>
                    <td style={{ padding: "8px 12px", textAlign: "right", color: "#f59e0b" }}>${row.interest_paid.toLocaleString()}</td>
                    <td style={{ padding: "8px 12px", textAlign: "right" }}>${row.remaining_balance.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
