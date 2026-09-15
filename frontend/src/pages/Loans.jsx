import { useEffect, useState } from "react";
import { Plus, Trash2, AlertTriangle, Minus } from "lucide-react";
import { getLoans, deleteLoan, updateLoanMissedEmis, simulateLoan } from "../api.js";
import LoanModal from "../components/LoanModal.jsx";
import "./Loans.css";

const inr = (n) => `₹${Math.round(n).toLocaleString("en-IN")}`;

export default function Loans() {
  const [loans, setLoans] = useState(null);
  const [error, setError] = useState(null);
  const [showAddLoan, setShowAddLoan] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  function reload() {
    return getLoans()
      .then(setLoans)
      .catch(() => setError("Couldn't reach the API. Is the backend running?"));
  }

  useEffect(() => { reload(); }, []);

  // Keep the selection valid whenever the loan list changes (create/delete).
  useEffect(() => {
    if (!loans) return;
    if (!loans.find((l) => l.id === selectedId)) {
      setSelectedId(loans.length ? loans[0].id : null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loans]);

  async function handleDelete(id, e) {
    e.stopPropagation();
    await deleteLoan(id).catch(() => {});
    reload();
  }

  if (error) return <div className="empty-state">{error}</div>;
  if (!loans) return <div className="empty-state">Loading loans…</div>;

  const selected = loans.find((l) => l.id === selectedId) || null;

  return (
    <div className="loans-page">
      <header className="page-header" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <p className="eyebrow">LOANS</p>
          <h1>Loans & borrowings</h1>
          <p className="subtitle">Track EMIs and stress-test what happens if you miss one.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddLoan(true)}>
          <Plus size={15} /> Add Loan
        </button>
      </header>

      {showAddLoan && (
        <LoanModal onClose={() => setShowAddLoan(false)} onCreated={(l) => { reload().then(() => setSelectedId(l.id)); }} />
      )}

      {loans.length === 0 ? (
        <div className="panel empty-state">No loans on file yet — add one to see EMI and payoff details.</div>
      ) : (
        <div className="loan-grid">
          {loans.map((loan) => (
            <div
              key={loan.id}
              className={"panel loan-card" + (loan.id === selectedId ? " selected" : "")}
              onClick={() => setSelectedId(loan.id)}
            >
              <div className="loan-card-head">
                <div className="loan-card-name">{loan.name}</div>
                <button className="btn-icon" onClick={(e) => handleDelete(loan.id, e)} title="Delete loan">
                  <Trash2 size={13} />
                </button>
              </div>
              <div className="loan-card-sub">
                {inr(loan.principal)} · {loan.annual_rate}% · {loan.tenure_months}mo
              </div>
              <div className="loan-emi mono">{inr(loan.emi)}<span className="loan-emi-suffix">/mo EMI</span></div>
              <div className="loan-meta-row">
                <span>Outstanding: <span className="mono">{inr(loan.outstanding_balance)}</span></span>
                <span>{loan.months_remaining} mo left</span>
              </div>
              {loan.missed_emis > 0 && (
                <div className="loan-missed-badge">
                  <AlertTriangle size={12} /> {loan.missed_emis} missed EMI{loan.missed_emis > 1 ? "s" : ""} · ₹{loan.arrears.total_arrears.toLocaleString("en-IN")} arrears
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {selected && (
        <MissedEmiSimulator loan={selected} onLoanChanged={() => reload()} />
      )}
    </div>
  );
}

function MissedEmiSimulator({ loan, onLoanChanged }) {
  const [missedMonths, setMissedMonths] = useState(loan.missed_emis || 3);
  const [catchupMonths, setCatchupMonths] = useState(3);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [logging, setLogging] = useState(false);

  useEffect(() => {
    setMissedMonths(loan.missed_emis || 3);
    setResult(null);
    run(loan.missed_emis || 3, 3, loan.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loan.id]);

  async function run(mm = missedMonths, cm = catchupMonths, loanId = loan.id) {
    setLoading(true);
    try {
      const res = await simulateLoan(loanId, { missed_months: Number(mm), catchup_months: Number(cm) });
      setResult(res);
    } catch {
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  async function adjustLogged(delta) {
    setLogging(true);
    try {
      await updateLoanMissedEmis(loan.id, Math.max(0, loan.missed_emis + delta));
      onLoanChanged();
    } finally {
      setLogging(false);
    }
  }

  return (
    <div className="panel simulator-panel">
      <h2 className="panel-title">Missed EMI Simulator — {loan.name}</h2>

      <div className="logged-row">
        <span>Currently logged as missed: <strong>{loan.missed_emis}</strong> EMI(s)</span>
        <div className="logged-controls">
          <button className="btn-icon" onClick={() => adjustLogged(-1)} disabled={logging || loan.missed_emis === 0} title="Record a payment made">
            <Minus size={13} />
          </button>
          <button className="btn-icon" onClick={() => adjustLogged(1)} disabled={logging} title="Record a missed payment">
            <Plus size={13} />
          </button>
        </div>
      </div>

      <div className="sim-fields">
        <div>
          <label className="field-label">Months unable to pay</label>
          <input className="field-input mono" type="number" min="0" value={missedMonths} onChange={(e) => setMissedMonths(e.target.value)} />
        </div>
        <div>
          <label className="field-label">Catch-up window</label>
          <select className="field-select" value={catchupMonths} onChange={(e) => setCatchupMonths(e.target.value)}>
            <option value={1}>1 month</option>
            <option value={3}>3 months</option>
            <option value={6}>6 months</option>
            <option value={12}>12 months</option>
          </select>
        </div>
      </div>

      <button className="btn btn-primary btn-block" onClick={() => run()} disabled={loading} style={{ marginBottom: 18 }}>
        {loading ? "Running…" : "Run Simulation"}
      </button>

      {result && (
        <>
          <div className="results-block">
            <div className="panel-label" style={{ marginBottom: 10 }}>ARREARS BREAKDOWN</div>
            <div className="result-row">
              <span className="result-label">Missed EMI amount ({result.missed_months}× ₹{result.emi.toLocaleString("en-IN")})</span>
              <span className="mono">{inr(result.arrears.missed_principal_interest)}</span>
            </div>
            <div className="result-row">
              <span className="result-label">Penalty accrued</span>
              <span className="mono tone-risk">{inr(result.arrears.penalty_accrued)}</span>
            </div>
            <div className="result-row">
              <span className="result-label" style={{ fontWeight: 600 }}>Total arrears</span>
              <span className="mono" style={{ fontWeight: 600 }}>{inr(result.arrears.total_arrears)}</span>
            </div>
          </div>

          <div className="results-block">
            <div className="panel-label" style={{ marginBottom: 10 }}>CATCHING UP</div>
            <div className="result-row">
              <span className="result-label">Extra needed per month (over {result.catchup_months} mo)</span>
              <span className="mono">{inr(result.extra_per_month)}</span>
            </div>
            <div className="result-row">
              <span className="result-label">Your average monthly surplus</span>
              <span className="mono">{inr(result.monthly_surplus)}</span>
            </div>
            <div className="result-row">
              <span className="result-label" style={{ fontWeight: 600 }}>Risk of this extending</span>
              <span className={"pill " + (result.risk === "LOW" ? "pill-positive" : result.risk === "MEDIUM" ? "pill-warn" : "pill-risk")}>
                {result.risk}
              </span>
            </div>
          </div>

          <div className="action-list">
            <div className="panel-label" style={{ marginBottom: 10 }}>WHAT TO DO</div>
            <ol>
              {result.actions.map((a, i) => (
                <li key={i} className={i === result.actions.length - 1 ? "action-disclaimer" : ""}>{a}</li>
              ))}
            </ol>
          </div>
        </>
      )}
    </div>
  );
}
