import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Wallet, Users, FolderKanban, FileText,
  Sparkles, LineChart, FlaskConical, Lightbulb,
  Receipt, Percent, Target, Landmark, Settings, Search, Bell, ChevronDown,
} from "lucide-react";
import "./Layout.css";

const NAV_GROUPS = [
  {
    label: "Overview",
    items: [
      { to: "/", label: "Dashboard", icon: LayoutDashboard, eyebrow: "DASHBOARD" },
      { to: "/cash-flow", label: "Cash Flow", icon: Wallet, eyebrow: "CASH FLOW" },
      { to: "/clients", label: "Clients", icon: Users, eyebrow: "CLIENTS" },
      { to: "/projects", label: "Projects", icon: FolderKanban, eyebrow: "PROJECTS" },
      { to: "/invoices", label: "Invoices", icon: FileText, eyebrow: "INVOICES" },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { to: "/ai-cfo", label: "AI CFO", icon: Sparkles, eyebrow: "AI CFO CHAT" },
      { to: "/forecasts", label: "Forecasts", icon: LineChart, eyebrow: "FORECASTS" },
      { to: "/scenarios", label: "Scenarios", icon: FlaskConical, eyebrow: "SCENARIO SIMULATOR" },
      { to: "/insights", label: "Insights", icon: Lightbulb, eyebrow: "INSIGHTS" },
    ],
  },
  {
    label: "Business",
    items: [
      { to: "/expenses", label: "Expenses", icon: Receipt, eyebrow: "EXPENSES" },
      { to: "/loans", label: "Loans", icon: Landmark, eyebrow: "LOANS" },
      { to: "/tax", label: "Tax", icon: Percent, eyebrow: "TAX" },
      { to: "/goals", label: "Goals", icon: Target, eyebrow: "GOALS" },
    ],
  },
];

const ALL_ITEMS = NAV_GROUPS.flatMap((g) => g.items);
ALL_ITEMS.push({ to: "/settings", eyebrow: "SETTINGS" });

function currentEyebrow(pathname) {
  if (/^\/clients\/[^/]+$/.test(pathname)) return "CLIENT VIEW";
  const match = ALL_ITEMS.find((i) => i.to === pathname);
  return match ? match.eyebrow : "SOLOCFO";
}

export default function Layout() {
  const location = useLocation();
  const eyebrow = currentEyebrow(location.pathname);

  return (
    <div className="shell">
      <header className="topbar">
        <span className="topbar-eyebrow mono">{eyebrow}</span>
        <div className="topbar-search">
          <Search size={15} />
          <input placeholder="Ask your CFO anything..." readOnly onFocus={(e) => e.target.blur()} />
          <span className="kbd mono">⌘K</span>
        </div>
        <div className="topbar-actions">
          <button className="btn-icon" aria-label="Notifications">
            <Bell size={16} />
          </button>
          <button className="avatar-btn" aria-label="Account">
            <span className="avatar-circle">P</span>
          </button>
        </div>
      </header>

      <div className="shell-body">
        <aside className="sidebar">
          <div className="brand">
            <span className="brand-mark">$</span>
            <span className="brand-name">SoloCFO</span>
          </div>

          <nav className="nav scroll-thin">
            {NAV_GROUPS.map((group) => (
              <div className="nav-group" key={group.label}>
                <div className="nav-group-label">{group.label}</div>
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === "/"}
                    className={({ isActive }) => "nav-item" + (isActive ? " active" : "")}
                  >
                    <item.icon size={16} strokeWidth={1.8} />
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </div>
            ))}
          </nav>

          <div className="sidebar-footer">
            <NavLink to="/settings" className={({ isActive }) => "nav-item" + (isActive ? " active" : "")}>
              <Settings size={16} strokeWidth={1.8} />
              <span>Settings</span>
            </NavLink>
            <div className="profile-row">
              <span className="avatar-circle small">P</span>
              <div className="profile-text">
                <div className="profile-name">Priyanshu</div>
                <div className="profile-role">Freelancer</div>
              </div>
              <ChevronDown size={14} color="var(--text-dim)" />
            </div>
          </div>
        </aside>

        <main className="content scroll-thin">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
