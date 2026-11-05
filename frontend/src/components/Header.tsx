import { Leaf, Menu, User } from "lucide-react";

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
    <header className="kf-header">
      <div className="kf-header-left">
        <button
          className="kf-menu-button"
          onClick={onMenuToggle}
          aria-label="Open navigation menu"
        >
          <Menu size={19} strokeWidth={2} />
        </button>

        <div className="kf-header-brand">
          <span className="kf-logo-mark" aria-hidden="true">
            <Leaf size={21} strokeWidth={2} />
          </span>
          <div className="kf-header-brand-copy">
            <strong className="kf-header-brand-name">{farmName}</strong>
            <span className="kf-header-brand-tag">Farm Analytics & Decision Support</span>
          </div>
        </div>
      </div>

      <div className="kf-header-right">
        <span className="kf-header-context">
          {VIEW_LABELS[activeView] ?? "Dashboard"}
        </span>

        {userName && (
          <div className="kf-header-user" title={userName}>
            <span className="kf-avatar" aria-hidden="true">
              <User size={15} />
            </span>
            <span className="kf-header-user-name">{userName}</span>
          </div>
        )}
      </div>
    </header>
  );
}

export default Header;
