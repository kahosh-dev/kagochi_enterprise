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
};

function Header({ farmName, userName, activeView = "home", onMenuToggle }: HeaderProps) {
  return (
    <header className="app-header">
      <div className="app-header-left">
        {/* Hamburger menu button */}
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
          <span className="app-header-icon">🌿</span>
          <div>
            <h1>{farmName}</h1>
            <p>Farm Analytics &amp; Decision Support</p>
          </div>
        </div>
      </div>

      <div className="app-header-right">
        {/* Current page breadcrumb */}
        <span className="header-breadcrumb">
          {VIEW_LABELS[activeView] ?? "Dashboard"}
        </span>

        {userName && (
          <div className="header-user-badge">
            <span className="header-user-avatar">
              {userName.charAt(0).toUpperCase()}
            </span>
            <span className="header-user-name">{userName}</span>
          </div>
        )}
      </div>
    </header>
  );
}

export default Header;
