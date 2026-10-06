import { useState } from "react";
import Modal from "./Modal.jsx";
import { createClient } from "../api.js";

export default function ClientModal({ onClose, onCreated }) {
  const [name, setName] = useState("");
  const [payProbability, setPayProbability] = useState("0.8");
  const [avgDelayDays, setAvgDelayDays] = useState("0");
  const [reliabilityScore, setReliabilityScore] = useState("80");
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Client name is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const newClient = await createClient({
        name: name.trim(),
        pay_probability: parseFloat(payProbability) || 0.8,
        avg_delay_days: parseInt(avgDelayDays) || 0,
        reliability_score: parseInt(reliabilityScore) || 80,
      });
      onCreated?.(newClient);
      onClose();
    } catch (err) {
      setError(err.message || "Couldn't create client.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Add New Client" onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="form-row">
          <label className="field-label">Client Name *</label>
          <input
            className="field-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Acme Corp / Jane Doe"
            required
            autoFocus
          />
        </div>

        <div className="form-row-split">
          <div className="form-row">
            <label className="field-label">Pay Probability (0.0 - 1.0)</label>
            <input
              className="field-input mono"
              type="number"
              step="0.05"
              min="0"
              max="1"
              value={payProbability}
              onChange={(e) => setPayProbability(e.target.value)}
            />
          </div>
          <div className="form-row">
            <label className="field-label">Avg Payment Delay (Days)</label>
            <input
              className="field-input mono"
              type="number"
              min="0"
              value={avgDelayDays}
              onChange={(e) => setAvgDelayDays(e.target.value)}
            />
          </div>
        </div>

        <div className="form-row">
          <label className="field-label">Reliability Score (0 - 100)</label>
          <input
            className="field-input mono"
            type="number"
            min="0"
            max="100"
            value={reliabilityScore}
            onChange={(e) => setReliabilityScore(e.target.value)}
          />
        </div>

        {error && <div className="form-error">{error}</div>}

        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Saving Client..." : "Save Client"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
