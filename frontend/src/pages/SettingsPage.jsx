import { useState, useEffect } from "react";
import { Settings, Save, Download, RefreshCw, Check, AlertCircle } from "lucide-react";
import { getSettings, updateSettings } from "../api.js";
import "./SettingsPage.css";

export default function SettingsPage() {
  const [formData, setFormData] = useState({
    business_name: "",
    tax_id: "",
    currency_symbol: "$",
    default_tax_rate: 25.0,
    emergency_buffer_months: 6,
    target_hourly_rate: 85.0,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await getSettings();
        if (res) {
          setFormData({
            business_name: res.business_name || "",
            tax_id: res.tax_id || "",
            currency_symbol: res.currency_symbol || "$",
            default_tax_rate: res.default_tax_rate ?? 25.0,
            emergency_buffer_months: res.emergency_buffer_months ?? 6,
            target_hourly_rate: res.target_hourly_rate ?? 85.0,
          });
        }
      } catch (err) {
        setError(err.message || "Failed to load settings.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      await updateSettings({
        business_name: formData.business_name,
        tax_id: formData.tax_id,
        currency_symbol: formData.currency_symbol,
        default_tax_rate: parseFloat(formData.default_tax_rate),
        emergency_buffer_months: parseInt(formData.emergency_buffer_months),
        target_hourly_rate: parseFloat(formData.target_hourly_rate),
      });
      setMessage("Settings updated successfully!");
      setTimeout(() => setMessage(null), 4000);
    } catch (err) {
      setError(err.message || "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(formData, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "solocfo_settings.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="settings-page">
      <div className="page-header">
        <div className="eyebrow mono">CONFIGURATION & PREFERENCES</div>
        <h1 style={{ fontSize: "24px", fontWeight: "700", margin: "4px 0 0 0" }}>Business & App Settings</h1>
      </div>

      {message && (
        <div className="card" style={{ borderLeft: "4px solid #10b981", color: "#10b981", display: "flex", alignItems: "center", gap: "10px" }}>
          <Check size={18} />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="card" style={{ borderLeft: "4px solid #ef4444", color: "#ef4444", display: "flex", alignItems: "center", gap: "10px" }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div style={{ color: "var(--text-muted)", padding: "20px" }}>Loading settings...</div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Business Profile */}
          <div className="settings-section">
            <div className="settings-section-title">Business & Tax Profile</div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div className="form-group">
                <label style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px", display: "block" }}>
                  Business / Studio Name
                </label>
                <input
                  className="input"
                  type="text"
                  placeholder="e.g. Acme Design Studio"
                  value={formData.business_name}
                  onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px", display: "block" }}>
                  Tax Identification / GST Number
                </label>
                <input
                  className="input"
                  type="text"
                  placeholder="e.g. EIN / GSTIN / SSN"
                  value={formData.tax_id}
                  onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div className="form-group">
                <label style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px", display: "block" }}>
                  Preferred Currency Symbol
                </label>
                <select
                  className="input"
                  value={formData.currency_symbol}
                  onChange={(e) => setFormData({ ...formData, currency_symbol: e.target.value })}
                >
                  <option value="$">$ (USD)</option>
                  <option value="₹">₹ (INR)</option>
                  <option value="€">€ (EUR)</option>
                  <option value="£">£ (GBP)</option>
                  <option value="A$">A$ (AUD)</option>
                  <option value="C$">C$ (CAD)</option>
                </select>
              </div>

              <div className="form-group">
                <label style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px", display: "block" }}>
                  Default Income Tax Rate (%)
                </label>
                <input
                  className="input"
                  type="number"
                  step="0.1"
                  value={formData.default_tax_rate}
                  onChange={(e) => setFormData({ ...formData, default_tax_rate: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Financial Targets */}
          <div className="settings-section">
            <div className="settings-section-title">Financial Safety & Targets</div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div className="form-group">
                <label style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px", display: "block" }}>
                  Emergency Runway Target (Months)
                </label>
                <input
                  className="input"
                  type="number"
                  min="1"
                  max="24"
                  value={formData.emergency_buffer_months}
                  onChange={(e) => setFormData({ ...formData, emergency_buffer_months: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "4px", display: "block" }}>
                  Target Hourly Billing Rate ($/hr)
                </label>
                <input
                  className="input"
                  type="number"
                  step="1"
                  value={formData.target_hourly_rate}
                  onChange={(e) => setFormData({ ...formData, target_hourly_rate: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Data Export */}
          <div className="settings-section">
            <div className="settings-section-title">Data Management & Backup</div>

            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              <button type="button" className="btn btn-secondary" onClick={handleExportJSON}>
                <Download size={16} /> Export Settings Backup (JSON)
              </button>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button type="submit" className="btn btn-primary" disabled={saving} style={{ padding: "10px 24px" }}>
              <Save size={16} /> {saving ? "Saving Changes..." : "Save Preferences"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
