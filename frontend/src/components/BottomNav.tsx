import { LayoutDashboard, BrainCircuit, Menu } from "lucide-react";

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
        <span className="kf-bottom-nav-media">
          <img src="/images/farm/chicken.webp" alt="" className="kf-bottom-nav-img" />
        </span>
        <span>Poultry</span>
      </button>

      <button
        type="button"
        className={activeView === "performance" ? "is-active" : ""}
        onClick={() => setActiveView("performance")}
        aria-current={activeView === "performance" ? "page" : undefined}
        aria-label="Analytics"
      >
        <span className="kf-bottom-nav-media">
          <img src="/images/farm/farm-income.webp" alt="" className="kf-bottom-nav-img" />
        </span>
        <span>Analytics</span>
      </button>

      <button
        type="button"
        className={activeView === "advisor" ? "is-active" : ""}
        onClick={() => setActiveView("advisor")}
        aria-current={activeView === "advisor" ? "page" : undefined}
        aria-label="Advisor"
      >
        <BrainCircuit size={20} strokeWidth={1.5} />
        <span>Advisor</span>
      </button>

      <button
        type="button"
        onClick={onMore}
        aria-label="More options"
      >
        <Menu size={20} strokeWidth={1.5} />
        <span>More</span>
      </button>
    </div>
  );
}

export default BottomNav;
