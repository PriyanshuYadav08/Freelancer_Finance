import { useState } from "react";
import Modal from "./Modal.jsx";

export default function GoalModal({ isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState({
    title: "",
    target_amount: "",
    current_amount: "0",
    target_date: "",
    category: "Emergency Fund",
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.target_amount) {
      setError("Goal title and target amount are required.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      await onSave({
        title: formData.title,
        target_amount: parseFloat(formData.target_amount),
        current_amount: parseFloat(formData.current_amount) || 0,
        target_date: formData.target_date || null,
        category: formData.category,
        notes: formData.notes,
      });
      onClose();
    } catch (err) {
      setError(err.message || "Failed to save goal.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Financial Goal">
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        {error && <div style={{ color: "#ef4444", fontSize: "13px" }}>{error}</div>}

        <div className="form-group">
          <label style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px", display: "block" }}>
            Goal Title *
          </label>
          <input
            className="input"
            type="text"
            placeholder="e.g. 6-Month Emergency Runway"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
          />
        </div>

        <div className="form-group">
          <label style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px", display: "block" }}>
            Category
          </label>
          <select
            className="input"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          >
            <option value="Emergency Fund">Emergency Fund</option>
            <option value="Equipment & Gear">Equipment & Gear</option>
            <option value="Annual Revenue Target">Annual Revenue Target</option>
            <option value="Tax Cushion">Tax Cushion</option>
            <option value="General Savings">General Savings</option>
          </select>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div className="form-group">
            <label style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px", display: "block" }}>
              Target Amount ($) *
            </label>
            <input
              className="input"
              type="number"
              step="0.01"
              placeholder="e.g. 15000"
              value={formData.target_amount}
              onChange={(e) => setFormData({ ...formData, target_amount: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px", display: "block" }}>
              Currently Saved ($)
            </label>
            <input
              className="input"
              type="number"
              step="0.01"
              placeholder="0"
              value={formData.current_amount}
              onChange={(e) => setFormData({ ...formData, current_amount: e.target.value })}
            />
          </div>
        </div>

        <div className="form-group">
          <label style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px", display: "block" }}>
            Target Completion Date
          </label>
          <input
            className="input"
            type="date"
            value={formData.target_date}
            onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px", display: "block" }}>
            Notes / Milestones
          </label>
          <textarea
            className="input"
            rows="3"
            placeholder="Why is this goal important or how will you reach it?"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            style={{ resize: "vertical" }}
          />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "8px" }}>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Saving..." : "Create Goal"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
