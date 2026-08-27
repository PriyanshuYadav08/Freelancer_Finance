const BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    throw new Error(`Request failed: ${res.status}`);
  }
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

export function getInvoices({ status, search, page = 1, page_size = 5 } = {}) {
  return request(`/api/invoices${qs({ status, search, page, page_size })}`);
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
