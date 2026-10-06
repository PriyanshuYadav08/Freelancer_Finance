const BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

async function request(path, options = {}) {
  const token = localStorage.getItem("solocfo_token");
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let detail = `Request failed: ${res.status}`;
    try {
      const body = await res.json();
      if (body?.detail) detail = body.detail;
    } catch {
      // ignore
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

export async function loginUser(email, password) {
  const body = new URLSearchParams();
  body.append("username", email);
  body.append("password", password);

  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!res.ok) {
    let detail = "Invalid credentials";
    try {
      const err = await res.json();
      if (err?.detail) detail = err.detail;
    } catch {
      // ignore
    }
    throw new Error(detail);
  }
  return res.json();
}

export function signupUser(email, password) {
  return request("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function getMe() {
  return request("/api/auth/me");
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

// v2 Extensions
export function getSettings() {
  return request("/api/settings");
}

export function updateSettings(payload) {
  return request("/api/settings", { method: "PATCH", body: JSON.stringify(payload) });
}

export function getProjects() {
  return request("/api/projects");
}

export function createProject(payload) {
  return request("/api/projects", { method: "POST", body: JSON.stringify(payload) });
}

export function updateProject(id, payload) {
  return request(`/api/projects/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
}

export function deleteProject(id) {
  return request(`/api/projects/${id}`, { method: "DELETE" });
}

export function getGoals() {
  return request("/api/goals");
}

export function createGoal(payload) {
  return request("/api/goals", { method: "POST", body: JSON.stringify(payload) });
}

export function deleteGoal(id) {
  return request(`/api/goals/${id}`, { method: "DELETE" });
}

export function getTaxAnalysis() {
  return request("/api/tax/analysis");
}

export function getLoanAmortization(id) {
  return request(`/api/loans/${id}/amortization`);
}
