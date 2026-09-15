const BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    let detail = `Request failed: ${res.status}`;
    try {
      const body = await res.json();
      if (body?.detail) detail = body.detail;
    } catch {
      // ignore - use default message
    }
    throw new Error(detail);
  }
  if (res.status === 204) return null;
  return res.json();
}

function qs(params) {
  const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ""));
  const s = new URLSearchParams(clean).toString();
  return s ? `?${s}` : "";
}

export function getDashboard() {
  return request("/api/dashboard");
}

export function getCashflowForecast(history = 6, forecast = 6) {
  return request(`/api/cashflow-forecast${qs({ history, forecast })}`);
}

export function getClients() {
  return request("/api/clients");
}

export function getClientDetail(id) {
  return request(`/api/clients/${id}`);
}

export function createClient(payload) {
  return request("/api/clients", { method: "POST", body: JSON.stringify(payload) });
}

export function getInvoices({ status, search, page = 1, page_size = 5 } = {}) {
  return request(`/api/invoices${qs({ status, search, page, page_size })}`);
}

export function createInvoice(payload) {
  return request("/api/invoices", { method: "POST", body: JSON.stringify(payload) });
}

export function updateInvoiceStatus(id, payload) {
  return request(`/api/invoices/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
}

export function deleteInvoice(id) {
  return request(`/api/invoices/${id}`, { method: "DELETE" });
}

export function addIncome(payload) {
  return request("/api/income", { method: "POST", body: JSON.stringify(payload) });
}

export function sendChat(message) {
  return request("/api/ai-cfo/chat", {
    method: "POST",
    body: JSON.stringify({ message }),
  });
}

export function getSimulatorPresets() {
  return request("/api/simulate/presets");
}

export function runSimulation(payload) {
  return request("/api/simulate", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getExpenses() {
  return request("/api/expenses");
}

export function getLoans() {
  return request("/api/loans");
}

export function getLoanDetail(id) {
  return request(`/api/loans/${id}`);
}

export function createLoan(payload) {
  return request("/api/loans", { method: "POST", body: JSON.stringify(payload) });
}

export function updateLoanMissedEmis(id, missed_emis) {
  return request(`/api/loans/${id}/missed-emis`, {
    method: "PATCH",
    body: JSON.stringify({ missed_emis }),
  });
}

export function deleteLoan(id) {
  return request(`/api/loans/${id}`, { method: "DELETE" });
}

export function simulateLoan(id, payload) {
  return request(`/api/loans/${id}/simulate`, { method: "POST", body: JSON.stringify(payload) });
}
