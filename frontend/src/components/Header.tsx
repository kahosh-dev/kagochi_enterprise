import { Leaf, User } from "lucide-react";

interface HeaderProps {
  farmName: string;
  userName?: string;
  activeView?: string;
  onMenuToggle: () => void;
}

const VIEW_LABELS: Record<string, string> = {
  home: "Dashboard",
  poultry: "Poultry",
  livestock: "Livestock",
  production: "Production",
  feeding: "Feeding",
  expenses: "Expenses",
  performance: "Analytics",
  advisor: "AI Advisor",
  admin: "Admin Panel",
  survivors: "Survivors",
  mortality: "Mortality",
  vaccinations: "Vaccinations",
};

function Header({ farmName, userName, activeView = "home", onMenuToggle }: HeaderProps) {
  return (
    <header className="app-header">
      <div className="app-header-left">
        <button
          className="hamburger-button"
          onClick={onMenuToggle}
          aria-label="Open navigation menu"
        >
          <span />
          <span />
          <span />
        </button>

        <div className="app-header-brand">
          <span className="app-header-icon">
            <Leaf size={26} strokeWidth={2} />
          </span>
          <div>
            <h1>{farmName}</h1>
            <p>Farm Analytics & Decision Support</p>
          </div>
        </div>
      </div>

      <div className="app-header-right">
        <span className="header-breadcrumb">
          {VIEW_LABELS[activeView] ?? "Dashboard"}
        </span>

        {userName && (
          <div className="header-user-badge">
            <span className="header-user-avatar">
              <User size={14} />
            </span>
            <span className="header-user-name">{userName}</span>
          </div>
        )}
      </div>
    </header>
  );
}

export default Header;