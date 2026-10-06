import { useState, useEffect } from "react";
import { FolderKanban, Plus, Trash2, Pencil, Clock, AlertCircle } from "lucide-react";
import { getProjects, createProject, updateProject, deleteProject, getClients } from "../api.js";
import ProjectModal from "../components/ProjectModal.jsx";
import StatusPill from "../components/StatusPill.jsx";
import "./Projects.css";

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [projRes, clientRes] = await Promise.all([getProjects(), getClients()]);
      setProjects(projRes || []);
      setClients(clientRes || []);
    } catch (err) {
      setError(err.message || "Failed to load projects.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveProject = async (payload, editId) => {
    if (editId) {
      await updateProject(editId, payload);
    } else {
      await createProject(payload);
    }
    await fetchData();
  };

  const handleOpenEdit = (project) => {
    setProjectToEdit(project);
    setIsModalOpen(true);
  };

  const handleOpenCreate = () => {
    setProjectToEdit(null);
    setIsModalOpen(true);
  };

  const handleDeleteProject = async (id) => {
    if (!confirm("Are you sure you want to delete this project?")) return;
    try {
      await deleteProject(id);
      setProjects(projects.filter((p) => p.id !== id));
    } catch (err) {
      alert("Failed to delete project: " + err.message);
    }
  };

  const getClientName = (clientId) => {
    if (!clientId) return "No Client";
    const found = clients.find((c) => c.id === clientId);
    return found ? found.name : `Client #${clientId}`;
  };

  // KPIs
  const totalProjects = projects.length;
  const activeProjects = projects.filter((p) => p.status === "In Progress" || p.status === "in_progress").length;
  const totalBudget = projects.reduce((sum, p) => sum + (p.budget || 0), 0);
  const totalHours = projects.reduce((sum, p) => sum + (p.hours_logged || 0), 0);

  return (
    <div className="projects-page">
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div className="eyebrow mono">PROJECT MANAGEMENT</div>
          <h1 style={{ fontSize: "24px", fontWeight: "700", margin: "4px 0 0 0" }}>Projects & Profitability</h1>
        </div>
        <button className="btn btn-primary" onClick={handleOpenCreate}>
          <Plus size={16} /> New Project
        </button>
      </div>

      {error && (
        <div className="card" style={{ borderLeft: "4px solid #ef4444", color: "#ef4444", display: "flex", alignItems: "center", gap: "10px" }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
        <div className="card" style={{ padding: "16px" }}>
          <div style={{ fontSize: "11px", color: "var(--text-dim)", textTransform: "uppercase" }}>Active Projects</div>
          <div style={{ fontSize: "22px", fontWeight: "700", marginTop: "4px" }}>{activeProjects} <span style={{ fontSize: "13px", color: "var(--text-muted)", fontWeight: "normal" }}>/ {totalProjects}</span></div>
        </div>
        <div className="card" style={{ padding: "16px" }}>
          <div style={{ fontSize: "11px", color: "var(--text-dim)", textTransform: "uppercase" }}>Total Budgeted Value</div>
          <div style={{ fontSize: "22px", fontWeight: "700", marginTop: "4px" }}>${totalBudget.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
        </div>
        <div className="card" style={{ padding: "16px" }}>
          <div style={{ fontSize: "11px", color: "var(--text-dim)", textTransform: "uppercase" }}>Total Hours Logged</div>
          <div style={{ fontSize: "22px", fontWeight: "700", marginTop: "4px" }}>{totalHours} hrs</div>
        </div>
        <div className="card" style={{ padding: "16px" }}>
          <div style={{ fontSize: "11px", color: "var(--text-dim)", textTransform: "uppercase" }}>Avg Effective Rate</div>
          <div style={{ fontSize: "22px", fontWeight: "700", marginTop: "4px" }}>
            ${totalHours > 0 ? (totalBudget / totalHours).toFixed(2) : "0.00"}/hr
          </div>
        </div>
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>Loading projects...</div>
      ) : projects.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "40px" }}>
          <FolderKanban size={40} style={{ color: "var(--text-dim)", marginBottom: "12px" }} />
          <h3 style={{ margin: "0 0 8px 0" }}>No Projects Found</h3>
          <p style={{ color: "var(--text-muted)", fontSize: "14px", margin: "0 0 16px 0" }}>
            Create your first client project to track budgets, logged hours, and hourly rate profitability.
          </p>
          <button className="btn btn-primary" onClick={handleOpenCreate}>
            <Plus size={16} /> Create Project
          </button>
        </div>
      ) : (
        <div className="projects-grid">
          {projects.map((proj) => {
            const effectiveRate = proj.hours_logged > 0 ? proj.budget / proj.hours_logged : 0;
            const rateVsTarget = proj.target_hourly_rate > 0 ? (effectiveRate / proj.target_hourly_rate) * 100 : 100;

            return (
              <div key={proj.id} className="project-card">
                <div className="project-card-header">
                  <div>
                    <div className="project-title">{proj.name}</div>
                    <div className="project-client">{getClientName(proj.client_id)}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <StatusPill status={proj.status} />
                    <button
                      className="btn-icon"
                      title="Edit Project"
                      onClick={() => handleOpenEdit(proj)}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      className="btn-icon"
                      style={{ color: "#ef4444" }}
                      title="Delete Project"
                      onClick={() => handleDeleteProject(proj.id)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                <div className="project-stats-grid">
                  <div className="project-stat-item">
                    <span className="project-stat-label">Budget</span>
                    <span className="project-stat-val">${proj.budget?.toLocaleString()}</span>
                  </div>
                  <div className="project-stat-item">
                    <span className="project-stat-label">Logged Hours</span>
                    <span className="project-stat-val">{proj.hours_logged} hrs</span>
                  </div>
                  <div className="project-stat-item">
                    <span className="project-stat-label">Effective Rate</span>
                    <span className="project-stat-val" style={{ color: effectiveRate >= proj.target_hourly_rate ? "#10b981" : "#f59e0b" }}>
                      ${effectiveRate.toFixed(2)}/hr
                    </span>
                  </div>
                  <div className="project-stat-item">
                    <span className="project-stat-label">Target Rate</span>
                    <span className="project-stat-val">${proj.target_hourly_rate}/hr</span>
                  </div>
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--text-muted)", marginBottom: "4px" }}>
                    <span>Effective vs Target Rate</span>
                    <span>{rateVsTarget.toFixed(0)}%</span>
                  </div>
                  <div className="progress-bar-container">
                    <div
                      className="progress-bar-fill"
                      style={{
                        width: `${Math.min(rateVsTarget, 100)}%`,
                        background: rateVsTarget >= 100 ? "#10b981" : rateVsTarget >= 75 ? "#3b82f6" : "#f59e0b",
                      }}
                    />
                  </div>
                </div>

                {proj.deadline && (
                  <div style={{ fontSize: "12px", color: "var(--text-dim)", display: "flex", alignItems: "center", gap: "6px" }}>
                    <Clock size={13} /> Deadline: {proj.deadline}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ProjectModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setProjectToEdit(null);
        }}
        clients={clients}
        onSave={handleSaveProject}
        projectToEdit={projectToEdit}
      />
    </div>
  );
}
