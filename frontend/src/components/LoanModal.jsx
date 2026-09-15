import { useState } from "react";
import Modal from "./Modal.jsx";
import { createLoan } from "../api.js";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function LoanModal({ onClose, onCreated }) {
  const [name, setName] = useState("");
  const [principal, setPrincipal] = useState("");
  const [annualRate, setAnnualRate] = useState("");
  const [tenureMonths, setTenureMonths] = useState(240);
  const [startDate, setStartDate] = useState(todayISO());
  const [penalRate, setPenalRate] = useState(2.0);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim() || !principal || !annualRate || !tenureMonths) {
      setError("Name, principal, interest rate, and tenure are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const loan = await createLoan({
        name: name.trim(),
        principal: Number(principal),
        annual_rate: Number(annualRate),
        tenure_months: Number(tenureMonths),
        start_date: startDate,
        penal_rate_monthly: Number(penalRate),
      });
      onCreated?.(loan);
      onClose();
    } catch (err) {
      setError(err.message || "Couldn't add this loan.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Add Loan" onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="form-row">
          <label className="field-label">Lender / loan name</label>
          <input className="field-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Home Loan - HDFC" />
        </div>

        <div className="form-row-split">
          <div className="form-row">
            <label className="field-label">Principal (₹)</label>
            <input className="field-input mono" type="number" value={principal} onChange={(e) => setPrincipal(e.target.value)} placeholder="3000000" />
          </div>
          <div className="form-row">
            <label className="field-label">Annual interest rate (%)</label>
            <input className="field-input mono" type="number" step="0.01" value={annualRate} onChange={(e) => setAnnualRate(e.target.value)} placeholder="7.95" />
          </div>
        </div>

        <div className="form-row-split">
          <div className="form-row">
            <label className="field-label">Tenure (months)</label>
            <input className="field-input mono" type="number" value={tenureMonths} onChange={(e) => setTenureMonths(e.target.value)} placeholder="240" />
          </div>
          <div className="form-row">
            <label className="field-label">Start date</label>
            <input className="field-input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
        </div>

        <div className="form-row">
          <label className="field-label">Penal interest on missed EMIs (%/month) — assumption, editable</label>
          <input className="field-input mono" type="number" step="0.1" value={penalRate} onChange={(e) => setPenalRate(e.target.value)} />
        </div>

        {error && <div className="form-error">{error}</div>}

        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Adding…" : "Add Loan"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
