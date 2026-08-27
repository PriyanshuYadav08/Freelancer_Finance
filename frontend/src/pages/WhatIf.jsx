import { useState } from "react";
import { runSimulation } from "../api.js";
import "./WhatIf.css";

const inr = (n) => `₹${Math.round(n).toLocaleString("en-IN")}`;

const SCENARIOS = [
  { id: "lose_top_client", label: "Lose my biggest client", needsAmount: false },
  { id: "income_drop_30", label: "Income drops 30%", needsAmount: false },
  { id: "payment_delay_45", label: "Payments delayed 45 days", needsAmount: false },
  { id: "expense_shock", label: "Sudden emergency expense", needsAmount: true, placeholder: "Amount (₹)" },
  { id: "custom_purchase", label: "Make a big purchase", needsAmount: true, placeholder: "Purchase amount (₹)" },
];

export default function WhatIf() {
  const [active, setActive] = useState(null);
  const [amount, setAmount] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  async function run(scenario) {
    setActive(scenario.id);
    if (scenario.needsAmount && !amount) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await runSimulation(scenario.id, amount ? Number(amount) : undefined);
      setResult(res);
    } catch {
      setResult({ explanation: "Couldn't reach the API. Is the backend running?" });
    } finally {
      setLoading(false);
    }
  }

  const activeScenario = SCENARIOS.find((s) => s.id === active);

  return (
    <div className="what-if">
      <header className="page-header">
        <p className="eyebrow mono">WHAT-IF</p>
        <h1>Crash-test your finances</h1>
      </header>

      <div className="scenario-grid">
        {SCENARIOS.map((s) => (
          <div key={s.id} className={"panel scenario-card" + (active === s.id ? " selected" : "")}>
            <div className="scenario-label">{s.label}</div>
            {s.needsAmount && active === s.id && (
              <input
                className="amount-input mono"
                placeholder={s.placeholder}
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            )}
            <button className="run-btn" onClick={() => run(s)}>
              {s.needsAmount ? "Set amount & run" : "Run scenario"}
            </button>
          </div>
        ))}
      </div>

      {loading && <div className="empty-state">Running the simulation…</div>}

      {result && !loading && (
        <section className="panel result-panel">
          <div className="panel-label">{result.label || "RESULT"}</div>

          {result.before && result.after && (
            <div className="compare-grid">
              <CompareCol title="Today" snap={result.before} risk={result.risk_before} />
              <div className="compare-arrow mono">→</div>
              <CompareCol title="After" snap={result.after} risk={result.risk_after} />
            </div>
          )}

          <p className="result-explanation">{result.explanation}</p>
        </section>
      )}
    </div>
  );
}

function CompareCol({ title, snap, risk }) {
  const tone = risk === "LOW" ? "tone-positive" : risk === "MEDIUM" ? "tone-neutral" : "tone-risk";
  return (
    <div className="compare-col">
      <div className="compare-title">{title}</div>
      <div className="compare-runway mono">{snap.runway_months}mo</div>
      <div className="compare-cash mono">{inr(snap.cash)} cash</div>
      <span className={"score-chip " + tone}>{risk} RISK</span>
    </div>
  );
}
