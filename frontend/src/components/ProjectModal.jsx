import { useState, useEffect } from "react";
import Modal from "./Modal.jsx";

export default function ProjectModal({ isOpen, onClose, clients = [], onSave, projectToEdit = null }) {
  const [formData, setFormData] = useState({
    name: "",
    client_id: "",
    budget: "",
    hours_logged: "0",
    target_hourly_rate: "",
    deadline: "",
    status: "In Progress",
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (projectToEdit) {
      setFormData({
        name: projectToEdit.name || "",
        client_id: projectToEdit.client_id ? String(projectToEdit.client_id) : "",
        budget: projectToEdit.budget !== undefined ? String(projectToEdit.budget) : "",
        hours_logged: projectToEdit.hours_logged !== undefined ? String(projectToEdit.hours_logged) : "0",
        target_hourly_rate: projectToEdit.target_hourly_rate !== undefined ? String(projectToEdit.target_hourly_rate) : "",
        deadline: projectToEdit.deadline || "",
        status: projectToEdit.status || "In Progress",
        notes: projectToEdit.notes || "",
      });
    } else {
      setFormData({
        name: "",
        client_id: "",
        budget: "",
        hours_logged: "0",
        target_hourly_rate: "",
        deadline: "",
        status: "In Progress",
        notes: "",
      });
    }
  }, [projectToEdit, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) {
      setError("Project name is required.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      await onSave({
        name: formData.name,
        client_id: formData.client_id ? parseInt(formData.client_id) : null,
        budget: parseFloat(formData.budget) || 0,
        hours_logged: parseFloat(formData.hours_logged) || 0,
        target_hourly_rate: parseFloat(formData.target_hourly_rate) || 0,
        deadline: formData.deadline || null,
        status: formData.status,
        notes: formData.notes,
      }, projectToEdit?.id);
      onClose();
    } catch (err) {
      setError(err.message || "Failed to save project.");
    } finally {
      setLoading(false);
    }
  };

  const isEditing = !!projectToEdit;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? `Edit Project — ${projectToEdit.name}` : "Create New Project"}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        {error && <div style={{ color: "#ef4444", fontSize: "13px" }}>{error}</div>}

        <div className="form-group">
          <label style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px", display: "block" }}>
            Project Name *
          </label>
          <input
            className="input"
            type="text"
            placeholder="e.g. Mobile App Redesign"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </div>

        <div className="form-group">
          <label style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px", display: "block" }}>
            Client
          </label>
          <select
            className="input"
            value={formData.client_id}
            onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
          >
            <option value="">-- Select Client (Optional) --</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div className="form-group">
            <label style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px", display: "block" }}>
              Budget ($)
            </label>
            <input
              className="input"
              type="number"
              step="0.01"
              placeholder="e.g. 5000"
              value={formData.budget}
              onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px", display: "block" }}>
              Target Hourly Rate ($/hr)
            </label>
            <input
              className="input"
              type="number"
              step="0.01"
              placeholder="e.g. 85"
              value={formData.target_hourly_rate}
              onChange={(e) => setFormData({ ...formData, target_hourly_rate: e.target.value })}
            />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div className="form-group">
            <label style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px", display: "block" }}>
              Hours Logged
            </label>
            <input
              className="input"
              type="number"
              step="0.5"
              placeholder="0"
              value={formData.hours_logged}
              onChange={(e) => setFormData({ ...formData, hours_logged: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px", display: "block" }}>
              Deadline
            </label>
            <input
              className="input"
              type="date"
              value={formData.deadline}
              onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
            />
          </div>
        </div>

        <div className="form-group">
          <label style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px", display: "block" }}>
            Status
          </label>
          <select
            className="input"
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
          >
            <option value="In Progress">In Progress</option>
            <option value="On Hold">On Hold</option>
            <option value="Completed">Completed</option>
          </select>
        </div>

        <div className="form-group">
          <label style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px", display: "block" }}>
            Notes / Scope
          </label>
          <textarea
            className="input"
            rows="3"
            placeholder="Add scope details or milestone deliverables..."
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
            {loading ? "Saving..." : isEditing ? "Save Changes" : "Create Project"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
