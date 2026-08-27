import { useEffect, useState } from "react";
import { Search, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { getInvoices } from "../api.js";
import StatusPill from "../components/StatusPill.jsx";
import "./Invoices.css";

const inr = (n) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const PAGE_SIZE = 5;

const STATUS_FILTERS = [
  { value: "all", label: "All Status" },
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "due", label: "Due" },
  { value: "overdue", label: "Overdue" },
  { value: "paid", label: "Paid" },
];

export default function Invoices() {
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    getInvoices({ status: status === "all" ? undefined : status, search: search || undefined, page, page_size: PAGE_SIZE })
      .then(setData)
      .catch(() => setError("Couldn't reach the API. Is the backend running?"));
  }, [status, search, page]);

  function handleStatusChange(value) {
    setStatus(value);
    setPage(1);
  }

  function handleSearchChange(value) {
    setSearch(value);
    setPage(1);
  }

  if (error) return <div className="empty-state">{error}</div>;

  const counts = data?.counts || { draft: 0, sent: 0, due: 0, overdue: 0, paid: 0 };
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const startIdx = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const endIdx = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="invoices-page">
      <header className="invoices-header">
        <h1>Invoices</h1>
        <div className="invoices-controls">
          <select className="field-select status-select" value={status} onChange={(e) => handleStatusChange(e.target.value)}>
            {STATUS_FILTERS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <div className="search-box">
            <Search size={14} />
            <input placeholder="Search invoices..." value={search} onChange={(e) => handleSearchChange(e.target.value)} />
          </div>
          <button className="btn btn-primary"><Plus size={14} /> New Invoice</button>
        </div>
      </header>

      <div className="count-strip">
        <CountBox label="Draft" value={counts.draft} />
        <CountBox label="Sent" value={counts.sent} />
        <CountBox label="Due" value={counts.due} tone="warn" />
        <CountBox label="Overdue" value={counts.overdue} tone="risk" />
        <CountBox label="Paid" value={counts.paid} />
      </div>

      <div className="panel">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Client</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Issued</th>
                <th>Due</th>
                <th>Paid On</th>
              </tr>
            </thead>
            <tbody>
              {(data?.invoices || []).map((inv) => (
                <tr key={inv.id}>
                  <td className="mono">{inv.invoice_number}</td>
                  <td>{inv.client_name}</td>
                  <td className="mono">{inr(inv.amount)}</td>
                  <td><StatusPill status={inv.status} /></td>
                  <td>{inv.issue_date}</td>
                  <td>{inv.due_date}</td>
                  <td>{inv.paid_date || "—"}</td>
                </tr>
              ))}
              {data && data.invoices.length === 0 && (
                <tr><td colSpan={7} className="empty-row">No invoices match this filter.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="pagination">
          <span className="pagination-summary">
            {total === 0 ? "No invoices" : `Showing ${startIdx} to ${endIdx} of ${total} invoices`}
          </span>
          <div className="pagination-controls">
            <button className="btn-icon" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              <ChevronLeft size={14} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 7).map((p) => (
              <button key={p} className={"page-btn" + (p === page ? " active" : "")} onClick={() => setPage(p)}>
                {p}
              </button>
            ))}
            <button className="btn-icon" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CountBox({ label, value, tone }) {
  return (
    <div className="panel count-box">
      <div className="panel-label">{label}</div>
      <div className={"count-value mono" + (tone ? ` tone-${tone}` : "")}>{value}</div>
    </div>
  );
}
