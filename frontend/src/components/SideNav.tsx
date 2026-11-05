import {
  LayoutDashboard,
  Bird,
  Beef,
  Egg,
  Wheat,
  TrendingUp,
  TrendingDown,
  Activity,
  Syringe,
  Wallet,
  Sparkles,
  LogOut,
  X,
  Leaf,
} from "lucide-react";

interface SideNavProps {
  isOpen: boolean;
  onClose: () => void;
  activeView: string;
  onNavigate: (view: string) => void;
  userName: string;
  userEmail?: string;
  onLogout: () => void;
}

const NAV_SECTIONS = [
  {
    label: "Overview",
    items: [
      { id: "home", label: "Dashboard", description: "Farm overview", icon: <LayoutDashboard size={19} /> },
    ],
  },
  {
    label: "Farm records",
    items: [
      { id: "poultry", label: "Add Chickens", description: "Chicks & flocks", icon: <Bird size={19} /> },
      { id: "livestock", label: "My Cattle", description: "Calves, heifers & cows", icon: <Beef size={19} /> },
      { id: "production", label: "Production Summary", description: "Eggs & milk", icon: <Egg size={19} /> },
      { id: "feeding", label: "Feed & Feeding", description: "Feed usage & costs", icon: <Wheat size={19} /> },
      { id: "expenses", label: "Record Income or Expense", description: "Daily farm cashflow", icon: <Wallet size={19} /> },
      { id: "vaccinations", label: "Vaccine Schedule", description: "Vaccinations & alerts", icon: <Syringe size={19} /> },
    ],
  },
  {
    label: "Population tracking",
    items: [
      { id: "survivors", label: "Survivor Tracking", description: "Population ledger", icon: <Activity size={19} /> },
      { id: "mortality", label: "Mortality Monitor", description: "Death rate trends", icon: <TrendingDown size={19} /> },
    ],
  },
  {
    label: "Financial & AI assistant",
    items: [
      { id: "performance", label: "Profit & Loss", description: "P&L reports", icon: <TrendingUp size={19} /> },
      { id: "advisor", label: "Farm Assistant", description: "AI daily advisor", icon: <Sparkles size={19} /> },
    ],
  },
];

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export default function SideNav({
  isOpen,
  onClose,
  activeView,
  onNavigate,
  userName,
  userEmail,
  onLogout,
}: SideNavProps) {
  function handleNavigate(id: string) {
    onNavigate(id);
    onClose();
  }

  return (
    <>
      <div
        className={`kf-sidebar-backdrop${isOpen ? " is-visible" : ""}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className={`kf-sidebar${isOpen ? " is-open" : ""}`}>
        <div className="kf-sidebar-head">
          <div className="kf-sidebar-brand">
            <div className="kf-logo-mark">
              <Leaf size={21} strokeWidth={2.2} />
            </div>
            <div>
              <strong>Kagochi Farm</strong>
              <span>Enterprise System</span>
            </div>
          </div>
          <button className="kf-sidebar-close" onClick={onClose} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>

        <div className="kf-sidebar-scroll">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label} className="kf-sidebar-section">
              <p className="kf-sidebar-label">{section.label}</p>
              {section.items.map((item) => {
                const isActive = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    className={`kf-nav-item${isActive ? " is-active" : ""}`}
                    onClick={() => handleNavigate(item.id)}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <span className="kf-nav-icon">{item.icon}</span>
                    <span className="kf-nav-copy">
                      <strong>{item.label}</strong>
                      <span>{item.description}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div className="kf-sidebar-foot">
          <div className="kf-sidebar-user">
            <span className="kf-avatar" aria-hidden="true">{initials(userName)}</span>
            <div className="kf-sidebar-user-copy">
              <strong>{userName}</strong>
              {userEmail && <span>{userEmail}</span>}
            </div>
          </div>
          <button className="kf-signout" onClick={onLogout}>
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
          <p className="kf-sidebar-version">Kagochi Farm Enterprise v2.0</p>
        </div>
      </aside>
    </>
  );
}
