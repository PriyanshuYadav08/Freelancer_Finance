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

export function getDashboard() {
  return request("/api/dashboard");
}

export function sendChat(message) {
  return request("/api/ai-cfo/chat", {
    method: "POST",
    body: JSON.stringify({ message }),
  });
}

export function runSimulation(scenario, amount) {
  return request("/api/simulate", {
    method: "POST",
    body: JSON.stringify({ scenario, amount }),
  });
}
