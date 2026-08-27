import { NavLink, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { getDashboard } from "../api.js";
import TickerTape from "./TickerTape.jsx";
import "./Layout.css";

const NAV_ITEMS = [
  { to: "/", label: "Overview", glyph: "01" },
  { to: "/ai-cfo", label: "AI CFO", glyph: "02" },
  { to: "/what-if", label: "What-If", glyph: "03" },
];

export default function Layout() {
  const [alerts, setAlerts] = useState([]);
  const [health, setHealth] = useState(null);

  useEffect(() => {
    getDashboard()
      .then((d) => {
        setAlerts(d.alerts || []);
        setHealth(d.financial_health);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="shell">
      <TickerTape alerts={alerts} />
      <div className="shell-body">
        <aside className="sidebar">
          <div className="brand">
            <span className="brand-mark">$</span>
            <span className="brand-name">LEDGER</span>
          </div>
          <p className="brand-sub">AI CFO for freelancers</p>

          <nav className="nav">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) => "nav-item" + (isActive ? " active" : "")}
              >
                <span className="nav-glyph mono">{item.glyph}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="sidebar-footer">
            <div className="health-pill">
              <span className="health-label">Health score</span>
              <span className="health-value mono">{health !== null ? health : "—"}</span>
            </div>
          </div>
        </aside>

        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
