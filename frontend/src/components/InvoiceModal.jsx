import { useEffect, useState } from "react";
import Modal from "./Modal.jsx";
import { getClients, createInvoice } from "../api.js";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function plusDaysISO(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function InvoiceModal({ presetClientId, presetClientName, onClose, onCreated }) {
  const [clients, setClients] = useState(presetClientId ? null : []);
  const [clientId, setClientId] = useState(presetClientId || "");
  const [projectName, setProjectName] = useState("");
  const [amount, setAmount] = useState("");
  const [issueDate, setIssueDate] = useState(todayISO());
  const [dueDate, setDueDate] = useState(plusDaysISO(14));
  const [status, setStatus] = useState("sent");
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!presetClientId) {
      getClients().then(setClients).catch(() => setError("Couldn't load clients."));
    }
  }, [presetClientId]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!clientId || !projectName.trim() || !amount) {
      setError("Client, project name, and amount are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const invoice = await createInvoice({
        client_id: Number(clientId),
        project_name: projectName.trim(),
        amount: Number(amount),
        issue_date: issueDate,
        due_date: dueDate,
        status,
      });
      onCreated?.(invoice);
      onClose();
    } catch (err) {
      setError(err.message || "Couldn't create the invoice.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="New Invoice" onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="form-row">
          <label className="field-label">Client</label>
          {presetClientId ? (
            <input className="field-input" value={presetClientName} disabled />
          ) : (
            <select className="field-select" value={clientId} onChange={(e) => setClientId(e.target.value)}>
              <option value="">Select a client…</option>
              {(clients || []).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}
        </div>

        <div className="form-row">
          <label className="field-label">Project / description</label>
          <input className="field-input" value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="e.g. Website redesign" />
        </div>

        <div className="form-row">
          <label className="field-label">Amount (₹)</label>
          <input className="field-input mono" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="50000" />
        </div>

        <div className="form-row-split">
          <div className="form-row">
            <label className="field-label">Issue date</label>
            <input className="field-input" type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
          </div>
          <div className="form-row">
            <label className="field-label">Due date</label>
            <input className="field-input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        </div>

        <div className="form-row">
          <label className="field-label">Status</label>
          <select className="field-select" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
          </select>
        </div>

        {error && <div className="form-error">{error}</div>}

        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Creating…" : "Create Invoice"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
