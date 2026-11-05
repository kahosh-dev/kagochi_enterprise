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
    label: "OVERVIEW",
    items: [
      { id: "home", label: "Dashboard", description: "Farm overview", icon: <LayoutDashboard size={20} /> },
    ],
  },
  {
    label: "FARM RECORDS",
    items: [
      { id: "poultry", label: "Add Chickens", description: "Chicks & flocks", icon: <Bird size={20} /> },
      { id: "livestock", label: "My Cattle", description: "Calves, heifers & cows", icon: <Beef size={20} /> },
      { id: "production", label: "Production Summary", description: "Eggs & milk", icon: <Egg size={20} /> },
      { id: "feeding", label: "Feed & Feeding", description: "Feed usage & costs", icon: <Wheat size={20} /> },
      { id: "expenses", label: "Record Income or Expense", description: "Daily farm cashflow", icon: <Wallet size={20} /> },
      { id: "vaccinations", label: "Vaccine Schedule", description: "Vaccinations & alerts", icon: <Syringe size={20} /> },
    ],
  },
  {
    label: "POPULATION TRACKING",
    items: [
      { id: "survivors", label: "Survivor Tracking", description: "Population ledger", icon: <Activity size={20} /> },
      { id: "mortality", label: "Mortality Monitor", description: "Death rate trends", icon: <TrendingDown size={20} /> },
    ],
  },
  {
    label: "FINANCIAL & AI ASSISTANT",
    items: [
      { id: "performance", label: "Profit & Loss", description: "P&L reports", icon: <TrendingUp size={20} /> },
      { id: "advisor", label: "Farm Assistant", description: "AI daily advisor", icon: <Sparkles size={20} /> },
    ],
  },
];

export default function SideNav({
  isOpen,
  onClose,
  activeView,
  onNavigate,
  onLogout,
}: SideNavProps) {
  function handleNavigate(id: string) {
    onNavigate(id);
    onClose();
  }

  return (
    <>
      <div
        className={`sidenav-backdrop ${isOpen ? "sidenav-backdrop-visible" : ""}`}
        onClick={onClose}
      />
      <aside className={`sidenav ${isOpen ? "sidenav-open" : ""}`}>
        <div className="sidenav-header">
          <div className="sidenav-brand">
            <div className="sidenav-brand-icon">
              <Leaf size={22} strokeWidth={2.2} />
            </div>
            <div>
              <p className="sidenav-brand-name">Kagochi Farm</p>
              <p className="sidenav-brand-sub">Enterprise System</p>
            </div>
          </div>
          <button className="sidenav-close" onClick={onClose} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>
        <div className="sidenav-scroll">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label} className="sidenav-section">
              <p className="sidenav-section-label">{section.label}</p>
              {section.items.map((item) => (
                <button
                  key={item.id}
                  className={`sidenav-item ${activeView === item.id ? "sidenav-item-active" : ""}`}
                  onClick={() => handleNavigate(item.id)}
                >
                  <span className="sidenav-item-icon">
                    {item.icon}
                  </span>
                  <span className="sidenav-item-text">
                    <span className="sidenav-item-label">{item.label}</span>
                    <span className="sidenav-item-desc">{item.description}</span>
                  </span>
                  {activeView === item.id && <span className="sidenav-item-indicator" />}
                </button>
              ))}
            </div>
          ))}
          <div className="sidenav-footer">
            <button className="sidenav-logout" onClick={onLogout}>
              <span><LogOut size={18} /></span>
              <span>Sign Out</span>
            </button>
            <p className="sidenav-version">Kagochi Farm Enterprise v2.0</p>
          </div>
        </div>
      </aside>
    </>
  );
}