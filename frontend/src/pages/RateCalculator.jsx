import { useState } from "react";
import { Calculator, DollarSign, Clock, ShieldCheck, Briefcase } from "lucide-react";
import "./RateCalculator.css";

export default function RateCalculator() {
  const [desiredSalary, setDesiredSalary] = useState(85000);
  const [annualOverhead, setAnnualOverhead] = useState(12000);
  const [taxRatePct, setTaxRatePct] = useState(25);
  const [weeksPerYear, setWeeksPerYear] = useState(46);
  const [hoursPerWeek, setHoursPerWeek] = useState(40);
  const [billableRatio, setBillableRatio] = useState(65);

  // Math
  const totalGrossIncomeNeeded = (desiredSalary + annualOverhead) / (1 - taxRatePct / 100);
  const totalWorkingHours = weeksPerYear * hoursPerWeek;
  const billableHours = totalWorkingHours * (billableRatio / 100);

  const hourlyRate = billableHours > 0 ? totalGrossIncomeNeeded / billableHours : 0;
  const dayRate = hourlyRate * 8;
  const monthlyRetainer = totalGrossIncomeNeeded / 12;
  const avgProjectFee = hourlyRate * 40; // 40-hour project benchmark

  return (
    <div className="rate-calc-page">
      <div className="page-header">
        <div className="eyebrow mono">PRICING ENGINE</div>
        <h1 style={{ fontSize: "24px", fontWeight: "700", margin: "4px 0 0 0" }}>Freelance Rate & Pricing Calculator</h1>
      </div>

      <div className="rate-calc-grid">
        {/* Input Parameters */}
        <div className="card" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
          <h3 style={{ margin: 0, fontSize: "16px" }}>1. Financial Goals & Costs</h3>

          <div className="form-group">
            <label style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px", display: "block" }}>
              Desired Annual Take-Home Net Salary ($)
            </label>
            <input
              className="input"
              type="number"
              value={desiredSalary}
              onChange={(e) => setDesiredSalary(parseFloat(e.target.value) || 0)}
            />
          </div>

          <div className="form-group">
            <label style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px", display: "block" }}>
              Annual Overhead (Software, Health, Hardware, Rent) ($)
            </label>
            <input
              className="input"
              type="number"
              value={annualOverhead}
              onChange={(e) => setAnnualOverhead(parseFloat(e.target.value) || 0)}
            />
          </div>

          <div className="form-group">
            <label style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px", display: "block" }}>
              Estimated Tax Buffer Reserve (%)
            </label>
            <input
              className="input"
              type="number"
              value={taxRatePct}
              onChange={(e) => setTaxRatePct(parseFloat(e.target.value) || 0)}
            />
          </div>

          <h3 style={{ margin: "12px 0 0 0", fontSize: "16px" }}>2. Working Capacity</h3>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div className="form-group">
              <label style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px", display: "block" }}>
                Working Weeks / Year
              </label>
              <input
                className="input"
                type="number"
                value={weeksPerYear}
                onChange={(e) => setWeeksPerYear(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="form-group">
              <label style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px", display: "block" }}>
                Hours Worked / Week
              </label>
              <input
                className="input"
                type="number"
                value={hoursPerWeek}
                onChange={(e) => setHoursPerWeek(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="form-group">
            <label style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px", display: "block" }}>
              Billable Time Ratio (% client work vs admin/marketing)
            </label>
            <input
              className="input"
              type="number"
              min="10"
              max="100"
              value={billableRatio}
              onChange={(e) => setBillableRatio(parseFloat(e.target.value) || 0)}
            />
          </div>
        </div>

        {/* Calculated Results */}
        <div className="rate-result-card">
          <div>
            <div style={{ fontSize: "11px", color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              REQUIRED ANNUAL GROSS REVENUE
            </div>
            <div style={{ fontSize: "32px", fontWeight: "700", color: "#10b981", marginTop: "4px" }}>
              ${Math.round(totalGrossIncomeNeeded).toLocaleString()}
            </div>
            <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>
              Covers take-home salary + ${annualOverhead.toLocaleString()} overhead + ${Math.round(totalGrossIncomeNeeded - desiredSalary - annualOverhead).toLocaleString()} tax reserve.
            </div>
          </div>

          <div>
            <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "8px" }}>
              Billable Capacity: <strong>{Math.round(billableHours)} billable hrs/yr</strong> ({weeksPerYear} wks × {hoursPerWeek} hrs × {billableRatio}%)
            </div>
          </div>

          <div className="rate-kpi-grid">
            <div className="rate-kpi-box">
              <div style={{ fontSize: "11px", color: "var(--text-dim)" }}>MINIMUM HOURLY RATE</div>
              <div style={{ fontSize: "22px", fontWeight: "700", color: "#3b82f6", marginTop: "2px" }}>
                ${hourlyRate.toFixed(2)}/hr
              </div>
            </div>

            <div className="rate-kpi-box">
              <div style={{ fontSize: "11px", color: "var(--text-dim)" }}>DAY RATE (8 HRS)</div>
              <div style={{ fontSize: "22px", fontWeight: "700", marginTop: "2px" }}>
                ${Math.round(dayRate).toLocaleString()}/day
              </div>
            </div>

            <div className="rate-kpi-box">
              <div style={{ fontSize: "11px", color: "var(--text-dim)" }}>MINIMUM MONTHLY RETAINER</div>
              <div style={{ fontSize: "22px", fontWeight: "700", marginTop: "2px" }}>
                ${Math.round(monthlyRetainer).toLocaleString()}/mo
              </div>
            </div>

            <div className="rate-kpi-box">
              <div style={{ fontSize: "11px", color: "var(--text-dim)" }}>STD 40-HR PROJECT FEE</div>
              <div style={{ fontSize: "22px", fontWeight: "700", marginTop: "2px" }}>
                ${Math.round(avgProjectFee).toLocaleString()}
              </div>
            </div>
          </div>

          <div style={{ background: "rgba(255,255,255,0.03)", padding: "12px", borderRadius: "6px", fontSize: "12px", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
            💡 <strong>Pricing Rule of Thumb:</strong> Never quote below ${hourlyRate.toFixed(2)}/hr. Add 15-20% safety margin for high-complexity projects.
          </div>
        </div>
      </div>
    </div>
  );
}
