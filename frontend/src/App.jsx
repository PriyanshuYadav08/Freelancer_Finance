import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import Layout from "./components/Layout.jsx";
import Landing from "./pages/Landing.jsx";
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import NotFound from "./pages/NotFound.jsx";

import Dashboard from "./pages/Dashboard.jsx";
import Clients from "./pages/Clients.jsx";
import ClientDetail from "./pages/ClientDetail.jsx";
import Invoices from "./pages/Invoices.jsx";
import AICFO from "./pages/AICFO.jsx";
import CashFlow from "./pages/CashFlow.jsx";
import Insights from "./pages/Insights.jsx";
import Expenses from "./pages/Expenses.jsx";
import Loans from "./pages/Loans.jsx";
import Tax from "./pages/Tax.jsx";
import Projects from "./pages/Projects.jsx";
import Goals from "./pages/Goals.jsx";
import SettingsPage from "./pages/SettingsPage.jsx";
import RateCalculator from "./pages/RateCalculator.jsx";

function ProtectedRoute({ children }) {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: "14px" }}>
        Loading SoloCFO...
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/welcome" replace />;
  }

  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public Routes */}
        <Route path="/welcome" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Protected Application Routes */}
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route path="/cash-flow" element={<CashFlow />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/clients/:id" element={<ClientDetail />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/invoices" element={<Invoices />} />
          <Route path="/ai-cfo" element={<AICFO />} />
          <Route path="/forecasts" element={<CashFlow />} />
          <Route path="/scenarios" element={<AICFO />} />
          <Route path="/insights" element={<Insights />} />
          <Route path="/expenses" element={<Expenses />} />
          <Route path="/loans" element={<Loans />} />
          <Route path="/tax" element={<Tax />} />
          <Route path="/goals" element={<Goals />} />
          <Route path="/rate-calculator" element={<RateCalculator />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        {/* 404 Catch-All Route for invalid URLs (e.g. /api_page) */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AuthProvider>
  );
}
