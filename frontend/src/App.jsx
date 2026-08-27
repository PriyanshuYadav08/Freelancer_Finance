import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import AICFO from "./pages/AICFO.jsx";
import WhatIf from "./pages/WhatIf.jsx";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/ai-cfo" element={<AICFO />} />
        <Route path="/what-if" element={<WhatIf />} />
      </Route>
    </Routes>
  );
}
