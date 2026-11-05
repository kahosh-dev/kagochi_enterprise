import { BarChart3, LayoutDashboard, Menu, NotebookText } from "lucide-react";

interface BottomNavProps {
  activeView: string;
  setActiveView: (view: string) => void;
  onMore: () => void;
}

const RECORD_VIEWS = ["poultry", "livestock", "production", "feeding", "expenses"];

function BottomNav({ activeView, setActiveView, onMore }: BottomNavProps) {
  const recordsActive = RECORD_VIEWS.includes(activeView);
  const analyticsActive = activeView === "performance";

  return (
    <div className="kf-bottom-nav" role="navigation" aria-label="Primary">
      <button
        type="button"
        className={activeView === "home" ? "is-active" : ""}
        onClick={() => setActiveView("home")}
        aria-current={activeView === "home" ? "page" : undefined}
      >
        <LayoutDashboard size={20} />
        <span>Home</span>
      </button>

      <button
        type="button"
        className={recordsActive ? "is-active" : ""}
        onClick={() => setActiveView("poultry")}
        aria-current={recordsActive ? "page" : undefined}
      >
        <NotebookText size={20} />
        <span>Records</span>
      </button>

      <button
        type="button"
        className={analyticsActive ? "is-active" : ""}
        onClick={() => setActiveView("performance")}
        aria-current={analyticsActive ? "page" : undefined}
      >
        <BarChart3 size={20} />
        <span>Analytics</span>
      </button>

      <button type="button" onClick={onMore}>
        <Menu size={20} />
        <span>More</span>
      </button>
    </div>
  );
}

export default BottomNav;
