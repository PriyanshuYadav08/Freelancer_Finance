import { useState } from "react";
import Modal from "./Modal.jsx";
import { Mail, Copy, Check } from "lucide-react";

export default function InvoiceFollowUpModal({ isOpen, onClose, invoice }) {
  const [tone, setTone] = useState("polite");
  const [copied, setCopied] = useState(false);

  if (!isOpen || !invoice) return null;

  const clientName = invoice.client_name || "Client";
  const invNumber = invoice.invoice_number || "#INV";
  const amount = `$${invoice.amount?.toLocaleString()}`;
  const dueDate = invoice.due_date || "due date";

  const getEmailText = () => {
    if (tone === "polite") {
      return `Subject: Friendly Reminder: Invoice ${invNumber} for ${amount}

Hi ${clientName},

I hope you're having a great week!

This is a quick friendly reminder that invoice ${invNumber} for ${amount} was due on ${dueDate}. 

If you have already processed this payment, please disregard this note. Otherwise, could you kindly provide an update on when we can expect the settlement?

Please let me know if you need another copy of the invoice attached.

Best regards,`;
    } else if (tone === "firm") {
      return `Subject: Follow-Up: Overdue Invoice ${invNumber} (${amount})

Hi ${clientName},

I am writing to follow up on overdue invoice ${invNumber} for ${amount}, which was due for payment on ${dueDate}.

We haven't received confirmation of payment yet. As per our payment terms, kindly process this payment at your earliest convenience to maintain an active project schedule.

Please reply to confirm when payment has been initiated.

Best regards,`;
    } else {
      return `Subject: URGENT / FINAL NOTICE: Overdue Payment for Invoice ${invNumber}

Dear ${clientName},

This is a final notice regarding invoice ${invNumber} (${amount}), which is now significantly past due (original due date: ${dueDate}).

Despite previous reminders, this balance remains outstanding. To prevent late penalty fees or escalation, please submit payment within 48 hours.

Bank details are listed on the original invoice. Please send remittance confirmation as soon as payment is initiated.

Sincerely,`;
    }
  };

  const emailText = getEmailText();

  const handleCopy = () => {
    navigator.clipboard.writeText(emailText);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Generate Payment Follow-Up Email — ${invNumber}`}>
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div>
          <label style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "6px", display: "block" }}>
            Select Reminder Tone
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
            <button
              className={`btn ${tone === "polite" ? "btn-primary" : "btn-secondary"}`}
              style={{ fontSize: "12px", padding: "6px 12px" }}
              onClick={() => setTone("polite")}
            >
              Polite Reminder
            </button>
            <button
              className={`btn ${tone === "firm" ? "btn-primary" : "btn-secondary"}`}
              style={{ fontSize: "12px", padding: "6px 12px" }}
              onClick={() => setTone("firm")}
            >
              Firm Follow-Up
            </button>
            <button
              className={`btn ${tone === "final" ? "btn-primary" : "btn-secondary"}`}
              style={{ fontSize: "12px", padding: "6px 12px" }}
              onClick={() => setTone("final")}
            >
              Final Notice
            </button>
          </div>
        </div>

        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
            <label style={{ fontSize: "12px", color: "var(--text-muted)" }}>Email Draft</label>
            <button className="btn btn-secondary" style={{ fontSize: "12px", padding: "4px 10px" }} onClick={handleCopy}>
              {copied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
              {copied ? "Copied!" : "Copy to Clipboard"}
            </button>
          </div>
          <textarea
            className="input"
            rows="10"
            value={emailText}
            readOnly
            style={{ width: "100%", fontFamily: "monospace", fontSize: "12px", lineHeight: "1.5", resize: "vertical" }}
          />
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
