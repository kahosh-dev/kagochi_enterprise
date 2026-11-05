import { LayoutDashboard, Bird, BarChart2, MessageCircle, Menu } from "lucide-react";

interface BottomNavProps {
  activeView: string;
  setActiveView: (view: string) => void;
  onMore: () => void;
}

function BottomNav({ activeView, setActiveView, onMore }: BottomNavProps) {
  return (
    <div className="kf-bottom-nav" role="navigation" aria-label="Primary">
      <button
        type="button"
        className={activeView === "home" ? "is-active" : ""}
        onClick={() => setActiveView("home")}
        aria-current={activeView === "home" ? "page" : undefined}
        aria-label="Home"
      >
        <LayoutDashboard size={20} strokeWidth={1.5} />
        <span>Home</span>
      </button>

      <button
        type="button"
        className={activeView === "poultry" ? "is-active" : ""}
        onClick={() => setActiveView("poultry")}
        aria-current={activeView === "poultry" ? "page" : undefined}
        aria-label="Poultry"
      >
        <Bird size={20} strokeWidth={1.5} />
        <span>Poultry</span>
      </button>

      <button
        type="button"
        className={activeView === "performance" ? "is-active" : ""}
        onClick={() => setActiveView("performance")}
        aria-current={activeView === "performance" ? "page" : undefined}
        aria-label="Analytics"
      >
        <BarChart2 size={20} strokeWidth={1.5} />
        <span>Analytics</span>
      </button>

      <button
        type="button"
        className={activeView === "advisor" ? "is-active" : ""}
        onClick={() => setActiveView("advisor")}
        aria-current={activeView === "advisor" ? "page" : undefined}
        aria-label="Advisor"
      >
        <MessageCircle size={20} strokeWidth={1.5} />
        <span>Advisor</span>
      </button>

      <button
        type="button"
        onClick={onMore}
        aria-label="More"
      >
        <Menu size={20} strokeWidth={1.5} />
        <span>More</span>
      </button>
    </div>
  );
}

export default BottomNav;
