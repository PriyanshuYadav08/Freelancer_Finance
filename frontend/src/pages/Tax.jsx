import { useEffect, useState } from "react";
import { Percent, Shield, Calculator, Calendar, AlertCircle, ArrowRight, CheckCircle2 } from "lucide-react";
import { getTaxAnalysis, getExpenses } from "../api.js";

export default function Tax() {
  const [taxData, setTaxData] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const [analysisRes, expRes] = await Promise.all([getTaxAnalysis(), getExpenses()]);
        setTaxData(analysisRes);
        setExpenses(expRes || []);
      } catch (err) {
        setError(err.message || "Failed to load tax analysis.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div style={{ padding: "40px", color: "var(--text-muted)", textAlign: "center" }}>Loading tax analysis engine...</div>;

  if (error) return (
    <div className="card" style={{ margin: "24px", borderLeft: "4px solid #ef4444", color: "#ef4444", display: "flex", alignItems: "center", gap: "10px" }}>
      <AlertCircle size={18} />
      <span>{error}</span>
    </div>
  );

  const formatCurr = (n) => `${taxData?.currency_symbol || "$"}${Math.round(n || 0).toLocaleString()}`;

  const taxSaved = taxData ? Math.max(0, taxData.standard_tax.estimated_tax - taxData.presumptive_tax_44ada.estimated_tax) : 0;
  const recommendedRegime = taxData?.standard_tax.estimated_tax < taxData?.presumptive_tax_44ada.estimated_tax ? "Standard Deductions" : "Presumptive Tax (Section 44ADA)";

  // Deductions by category
  const deductibleExpenses = expenses.filter((e) => e.is_tax_deductible !== false);
  const totalDeductions = deductibleExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  return (
    <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "24px" }}>
      <div className="page-header">
        <div className="eyebrow mono">TAX ENGINE & COMPLIANCE</div>
        <h1 style={{ fontSize: "24px", fontWeight: "700", margin: "4px 0 0 0" }}>Freelance Tax Optimization</h1>
      </div>

      {/* Recommended Tax Reserve Banner */}
      <div className="card" style={{ background: "linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(16, 185, 129, 0.08) 100%)", border: "1px solid rgba(59, 130, 246, 0.2)", padding: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <div style={{ fontSize: "12px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              RECOMMENDED TAX RESERVE (SET ASIDE)
            </div>
            <div style={{ fontSize: "32px", fontWeight: "700", color: "#10b981", marginTop: "4px" }}>
              {formatCurr(taxData?.recommended_tax_reserve)}
            </div>
            <div style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>
              Based on {taxData?.effective_tax_rate}% default reserve rate against annual gross revenue of {formatCurr(taxData?.annual_gross_revenue)}.
            </div>
          </div>
          <div style={{ background: "var(--surface)", padding: "12px 18px", borderRadius: "8px", border: "1px solid var(--border)", display: "flex", alignItems: "center", gap: "10px" }}>
            <Shield size={20} color="#10b981" />
            <div>
              <div style={{ fontSize: "11px", color: "var(--text-dim)" }}>OPTIMAL REGIME</div>
              <div style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-main)" }}>{recommendedRegime}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tax Regime Comparison Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "16px" }}>
        {/* Presumptive Tax Scheme (Sec 44ADA 50% rule) */}
        <div className="card" style={{ border: recommendedRegime.includes("44ADA") ? "1px solid #10b981" : "1px solid var(--border)", padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "14px", fontWeight: "600" }}>Presumptive Tax (Section 44ADA)</span>
            {recommendedRegime.includes("44ADA") && <span style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10b981", padding: "2px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: "600" }}>RECOMMENDED</span>}
          </div>
          <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: "8px 0 16px 0" }}>
            Presumes 50% of gross receipts as taxable income without needing detailed expense receipts. Ideal for freelancers with low overhead.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", background: "rgba(255,255,255,0.02)", padding: "12px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.04)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
              <span style={{ color: "var(--text-muted)" }}>Gross Revenue:</span>
              <span>{formatCurr(taxData?.annual_gross_revenue)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
              <span style={{ color: "var(--text-muted)" }}>Deemed Taxable Income (50%):</span>
              <span>{formatCurr(taxData?.presumptive_tax_44ada.taxable_income)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", fontWeight: "700", paddingTop: "8px", borderTop: "1px solid var(--border)" }}>
              <span>Estimated Tax Liability:</span>
              <span style={{ color: "#3b82f6" }}>{formatCurr(taxData?.presumptive_tax_44ada.estimated_tax)}</span>
            </div>
          </div>
        </div>

        {/* Standard Tax Regime (Gross - Actual Expenses) */}
        <div className="card" style={{ border: recommendedRegime.includes("Standard") ? "1px solid #10b981" : "1px solid var(--border)", padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "14px", fontWeight: "600" }}>Standard Tax Deductions</span>
            {recommendedRegime.includes("Standard") && <span style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10b981", padding: "2px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: "600" }}>RECOMMENDED</span>}
          </div>
          <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: "8px 0 16px 0" }}>
            Deducts actual business expenses (software, equipment, rent) from gross revenue. Requires tracking all expense invoices.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", background: "rgba(255,255,255,0.02)", padding: "12px", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.04)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
              <span style={{ color: "var(--text-muted)" }}>Gross Revenue:</span>
              <span>{formatCurr(taxData?.annual_gross_revenue)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
              <span style={{ color: "var(--text-muted)" }}>Total Claimed Deductions:</span>
              <span style={{ color: "#ef4444" }}>- {formatCurr(taxData?.standard_tax.total_deductions)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", fontWeight: "700", paddingTop: "8px", borderTop: "1px solid var(--border)" }}>
              <span>Estimated Tax Liability:</span>
              <span style={{ color: "#3b82f6" }}>{formatCurr(taxData?.standard_tax.estimated_tax)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Advance Tax Payment Schedule */}
      <div className="card" style={{ padding: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
          <Calendar size={18} color="#3b82f6" />
          <h3 style={{ margin: 0, fontSize: "16px" }}>Quarterly Advance Tax Payment Schedule</h3>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px" }}>
          {taxData?.advance_tax_schedule.map((q) => (
            <div key={q.quarter} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)", borderRadius: "6px", padding: "14px" }}>
              <div style={{ fontSize: "11px", color: "var(--text-dim)" }}>{q.quarter} • DUE {q.due_date}</div>
              <div style={{ fontSize: "18px", fontWeight: "700", marginTop: "4px" }}>{formatCurr(q.amount_due)}</div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>{q.percentage}% cumulative target</div>
            </div>
          ))}
        </div>
      </div>

      {/* Deductions Breakdown */}
      <div className="card" style={{ padding: "20px" }}>
        <h3 style={{ margin: "0 0 12px 0", fontSize: "16px" }}>Deductible Business Expenses ({deductibleExpenses.length})</h3>
        {deductibleExpenses.length === 0 ? (
          <div style={{ color: "var(--text-muted)", fontSize: "14px" }}>No tax-deductible expenses logged yet. Add expenses under the Expenses tab.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", textAlign: "left", color: "var(--text-dim)", fontSize: "11px" }}>
                  <th style={{ padding: "8px" }}>DATE</th>
                  <th style={{ padding: "8px" }}>CATEGORY</th>
                  <th style={{ padding: "8px" }}>DESCRIPTION</th>
                  <th style={{ padding: "8px", textAlign: "right" }}>AMOUNT</th>
                </tr>
              </thead>
              <tbody>
                {deductibleExpenses.map((exp) => (
                  <tr key={exp.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                    <td style={{ padding: "10px 8px" }}>{exp.date}</td>
                    <td style={{ padding: "10px 8px" }}>
                      <span style={{ padding: "2px 8px", background: "rgba(255,255,255,0.05)", borderRadius: "4px", fontSize: "11px" }}>{exp.category}</span>
                    </td>
                    <td style={{ padding: "10px 8px" }}>{exp.description}</td>
                    <td style={{ padding: "10px 8px", textAlign: "right", fontWeight: "600" }}>{formatCurr(exp.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
