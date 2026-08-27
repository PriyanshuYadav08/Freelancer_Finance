import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Clients from "./pages/Clients.jsx";
import ClientDetail from "./pages/ClientDetail.jsx";
import Invoices from "./pages/Invoices.jsx";
import AICFO from "./pages/AICFO.jsx";
import CashFlow from "./pages/CashFlow.jsx";
import Insights from "./pages/Insights.jsx";
import Expenses from "./pages/Expenses.jsx";
import Tax from "./pages/Tax.jsx";
import ComingSoon from "./pages/ComingSoon.jsx";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/cash-flow" element={<CashFlow />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/clients/:id" element={<ClientDetail />} />
        <Route path="/invoices" element={<Invoices />} />
        <Route path="/ai-cfo" element={<AICFO />} />
        <Route path="/forecasts" element={<CashFlow />} />
        <Route path="/scenarios" element={<AICFO />} />
        <Route path="/insights" element={<Insights />} />
        <Route path="/expenses" element={<Expenses />} />
        <Route path="/tax" element={<Tax />} />
        <Route path="/goals" element={<ComingSoon eyebrow="GOALS" title="Goals" note="Goal tracking isn't built in the v1 MVP yet — see the README for what's planned next." />} />
        <Route path="/projects" element={<ComingSoon eyebrow="PROJECTS" title="Projects" note="Project-level tracking isn't built in the v1 MVP yet — see the README for what's planned next." />} />
        <Route path="/settings" element={<ComingSoon eyebrow="SETTINGS" title="Settings" note="Account settings aren't built in the v1 MVP yet — see the README for what's planned next." />} />
      </Route>
    </Routes>
  );
}
