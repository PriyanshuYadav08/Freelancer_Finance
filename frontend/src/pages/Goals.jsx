import { useState, useEffect } from "react";
import { Target, Plus, Trash2, Calendar, ShieldCheck, AlertCircle } from "lucide-react";
import { getGoals, createGoal, deleteGoal } from "../api.js";
import GoalModal from "../components/GoalModal.jsx";
import "./Goals.css";

export default function Goals() {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await getGoals();
      setGoals(res || []);
    } catch (err) {
      setError(err.message || "Failed to load goals.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateGoal = async (payload) => {
    await createGoal(payload);
    await fetchData();
  };

  const handleDeleteGoal = async (id) => {
    if (!confirm("Are you sure you want to delete this goal?")) return;
    try {
      await deleteGoal(id);
      setGoals(goals.filter((g) => g.id !== id));
    } catch (err) {
      alert("Failed to delete goal: " + err.message);
    }
  };

  // KPIs
  const totalTarget = goals.reduce((sum, g) => sum + (g.target_amount || 0), 0);
  const totalSaved = goals.reduce((sum, g) => sum + (g.current_amount || 0), 0);
  const overallProgress = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;
  const completedGoals = goals.filter((g) => g.current_amount >= g.target_amount).length;

  return (
    <div className="goals-page">
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div className="eyebrow mono">FINANCIAL MILESTONES</div>
          <h1 style={{ fontSize: "24px", fontWeight: "700", margin: "4px 0 0 0" }}>Financial Goals & Runway</h1>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={16} /> New Goal
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
          <div style={{ fontSize: "11px", color: "var(--text-dim)", textTransform: "uppercase" }}>Total Target Savings</div>
          <div style={{ fontSize: "22px", fontWeight: "700", marginTop: "4px" }}>${totalTarget.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
        </div>
        <div className="card" style={{ padding: "16px" }}>
          <div style={{ fontSize: "11px", color: "var(--text-dim)", textTransform: "uppercase" }}>Total Accumulated</div>
          <div style={{ fontSize: "22px", fontWeight: "700", marginTop: "4px", color: "#10b981" }}>${totalSaved.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
        </div>
        <div className="card" style={{ padding: "16px" }}>
          <div style={{ fontSize: "11px", color: "var(--text-dim)", textTransform: "uppercase" }}>Overall Completion</div>
          <div style={{ fontSize: "22px", fontWeight: "700", marginTop: "4px" }}>{overallProgress.toFixed(1)}%</div>
        </div>
        <div className="card" style={{ padding: "16px" }}>
          <div style={{ fontSize: "11px", color: "var(--text-dim)", textTransform: "uppercase" }}>Goals Completed</div>
          <div style={{ fontSize: "22px", fontWeight: "700", marginTop: "4px" }}>{completedGoals} <span style={{ fontSize: "13px", color: "var(--text-muted)", fontWeight: "normal" }}>/ {goals.length}</span></div>
        </div>
      </div>

      {/* Goals Grid */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>Loading goals...</div>
      ) : goals.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "40px" }}>
          <Target size={40} style={{ color: "var(--text-dim)", marginBottom: "12px" }} />
          <h3 style={{ margin: "0 0 8px 0" }}>No Goals Created Yet</h3>
          <p style={{ color: "var(--text-muted)", fontSize: "14px", margin: "0 0 16px 0" }}>
            Set targets for your Emergency Fund, Tax Cushion, New Gear, or Annual Revenue.
          </p>
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={16} /> Create Goal
          </button>
        </div>
      ) : (
        <div className="goals-grid">
          {goals.map((g) => {
            const pct = g.target_amount > 0 ? (g.current_amount / g.target_amount) * 100 : 0;
            const remaining = Math.max(0, g.target_amount - g.current_amount);
            const isDone = g.current_amount >= g.target_amount;

            return (
              <div key={g.id} className="goal-card">
                <div className="goal-card-header">
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                      <span className="goal-category-pill">{g.category}</span>
                      {isDone && <span style={{ color: "#10b981", fontSize: "12px", display: "flex", alignItems: "center", gap: "2px" }}><ShieldCheck size={14} /> Reached</span>}
                    </div>
                    <div className="goal-title">{g.title}</div>
                  </div>
                  <button
                    className="btn-icon"
                    style={{ color: "#ef4444" }}
                    title="Delete Goal"
                    onClick={() => handleDeleteGoal(g.id)}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: "4px" }}>
                  <span style={{ fontSize: "20px", fontWeight: "700", color: "var(--text-main)" }}>
                    ${g.current_amount?.toLocaleString()}
                  </span>
                  <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                    of ${g.target_amount?.toLocaleString()}
                  </span>
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "var(--text-muted)", marginBottom: "4px" }}>
                    <span>Progress</span>
                    <span>{pct.toFixed(1)}%</span>
                  </div>
                  <div className="progress-bar-container">
                    <div
                      className="progress-bar-fill"
                      style={{
                        width: `${Math.min(pct, 100)}%`,
                        background: isDone ? "#10b981" : "#3b82f6",
                      }}
                    />
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--text-dim)", marginTop: "6px" }}>
                    {isDone ? "Goal achieved!" : `$${remaining.toLocaleString()} remaining to hit target`}
                  </div>
                </div>

                {g.target_date && (
                  <div style={{ fontSize: "12px", color: "var(--text-dim)", display: "flex", alignItems: "center", gap: "6px" }}>
                    <Calendar size={13} /> Target Date: {g.target_date}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <GoalModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleCreateGoal}
      />
    </div>
  );
}
