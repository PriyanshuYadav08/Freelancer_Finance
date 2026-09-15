import { useEffect, useState } from "react";
import Modal from "./Modal.jsx";
import { getClients, addIncome } from "../api.js";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function IncomeModal({ onClose, onCreated }) {
  const [clients, setClients] = useState([]);
  const [clientId, setClientId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(todayISO());
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getClients().then(setClients).catch(() => setError("Couldn't load clients."));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!clientId || !amount) {
      setError("Client and amount are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const income = await addIncome({
        client_id: Number(clientId),
        amount: Number(amount),
        description: description.trim() || "Income",
        date,
      });
      onCreated?.(income);
      onClose();
    } catch (err) {
      setError(err.message || "Couldn't log this income.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Add Income" onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="form-row">
          <label className="field-label">Client</label>
          <select className="field-select" value={clientId} onChange={(e) => setClientId(e.target.value)}>
            <option value="">Select a client…</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="form-row">
          <label className="field-label">Amount (₹)</label>
          <input className="field-input mono" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="30000" />
        </div>

        <div className="form-row">
          <label className="field-label">Description</label>
          <input className="field-input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Ad-hoc consulting" />
        </div>

        <div className="form-row">
          <label className="field-label">Date received</label>
          <input className="field-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

        {error && <div className="form-error">{error}</div>}

        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Saving…" : "Add Income"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
