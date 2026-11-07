import { Bell, Leaf, Menu, UserRound } from "lucide-react";

interface HeaderProps {
  farmName: string;
  userName?: string;
  activeView?: string;
  onMenuToggle: () => void;
}

const VIEW_LABELS: Record<string, string> = {
  home: "Dashboard Overview",
  poultry: "Poultry Operations",
  livestock: "Livestock & Cattle",
  production: "Daily Production",
  feeding: "Feed & Nutrition",
  expenses: "Income & Expenses",
  performance: "Performance Analytics",
  advisor: "AI Farm Advisor",
  survivors: "Survivor Tracking",
  mortality: "Mortality Monitor",
  vaccinations: "Vaccination Schedules",
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function Header({ farmName, userName, activeView = "home", onMenuToggle }: HeaderProps) {
  return (
    <header className="kf-header">
      {/* ── Mobile left: hamburger ── */}
      <div className="kf-header-left">
        <button
          className="kf-menu-button"
          onClick={onMenuToggle}
          aria-label="Open navigation menu"
        >
          <Menu size={20} strokeWidth={1.5} />
        </button>

        {/* Mobile centre brand mark (hidden on desktop via CSS) */}
        <div className="kf-header-brand">
          <span className="kf-logo-mark" aria-hidden="true">
            <Leaf size={20} strokeWidth={1.5} />
          </span>
          <span className="kf-header-brand-name">{farmName}</span>
        </div>
      </div>

      {/* ── Desktop left: page title (hidden on mobile via CSS) ── */}
      <span className="kf-header-context">
        {VIEW_LABELS[activeView] ?? "Dashboard"}
      </span>

      {/* ── Right: bell + user ── */}
      <div className="kf-header-right">
        <button
          className="kf-header-icon-button"
          aria-label="Notifications (No unread alerts)"
          title="Notifications"
          type="button"
        >
          <Bell size={20} strokeWidth={1.5} />
        </button>

        {userName ? (
          <div className="kf-header-user" title={`Logged in as ${userName}`}>
            <span className="kf-avatar" aria-hidden="true">
              {getInitials(userName)}
            </span>
            <span className="kf-header-user-name">{userName}</span>
          </div>
        ) : (
          <span className="kf-avatar" aria-hidden="true">
            <UserRound size={15} strokeWidth={1.5} />
          </span>
        )}
      </div>
    </header>
  );
}

export default Header;
