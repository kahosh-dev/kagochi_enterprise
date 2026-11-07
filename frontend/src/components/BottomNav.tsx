import { Bird, BrainCircuit, LayoutDashboard, Menu, Syringe } from "lucide-react";

interface BottomNavProps {
  activeView: string;
  setActiveView: (view: string) => void;
  onMore: () => void;
  overdueVacCount?: number;
}

function BottomNav({ activeView, setActiveView, onMore, overdueVacCount = 0 }: BottomNavProps) {
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
        className={activeView === "poultry" || activeView === "livestock" ? "is-active" : ""}
        onClick={() => setActiveView("poultry")}
        aria-current={(activeView === "poultry" || activeView === "livestock") ? "page" : undefined}
        aria-label="My Animals"
      >
        <Bird size={20} strokeWidth={1.5} />
        <span>Animals</span>
      </button>

      <button
        type="button"
        className={`kf-bottom-nav-vac-btn${activeView === "vaccinations" ? " is-active" : ""}`}
        onClick={() => setActiveView("vaccinations")}
        aria-current={activeView === "vaccinations" ? "page" : undefined}
        aria-label={`Vaccinations${overdueVacCount > 0 ? `, ${overdueVacCount} overdue` : ""}`}
        style={{ position: "relative" }}
      >
        <span style={{ position: "relative", display: "inline-flex" }}>
          <Syringe size={20} strokeWidth={1.5} />
          {overdueVacCount > 0 && (
            <span
              style={{
                position: "absolute",
                top: -6,
                right: -8,
                minWidth: 16,
                height: 16,
                borderRadius: 8,
                background: "var(--kf-red)",
                color: "#fff",
                fontSize: 9,
                fontWeight: 800,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0 3px",
                lineHeight: 1,
              }}
              aria-hidden="true"
            >
              {overdueVacCount > 9 ? "9+" : overdueVacCount}
            </span>
          )}
        </span>
        <span>Vaccines</span>
      </button>

      <button
        type="button"
        className={activeView === "advisor" ? "is-active" : ""}
        onClick={() => setActiveView("advisor")}
        aria-current={activeView === "advisor" ? "page" : undefined}
        aria-label="Farm Advisor"
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
