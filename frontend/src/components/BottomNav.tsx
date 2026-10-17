interface BottomNavProps {
  activeView: string;
  setActiveView: (view: string) => void;
}

const RECORD_VIEWS = ["poultry", "livestock", "production", "feeding", "expenses"];

function BottomNav({ activeView, setActiveView }: BottomNavProps) {
  return (
    <nav className="bottom-navigation">

      <button
        className={activeView === "home" ? "active" : ""}
        onClick={() => setActiveView("home")}
      >
        <span className="nav-icon">🏠</span>
        <span>Home</span>
      </button>

      <button
        className={RECORD_VIEWS.includes(activeView) ? "active" : ""}
        onClick={() => setActiveView("poultry")}
      >
        <span className="nav-icon">📋</span>
        <span>Records</span>
      </button>

      <button
        className={activeView === "performance" ? "active" : ""}
        onClick={() => setActiveView("performance")}
      >
        <span className="nav-icon">📊</span>
        <span>Analytics</span>
      </button>

      <button
        className={activeView === "advisor" ? "active" : ""}
        onClick={() => setActiveView("advisor")}
      >
        <span className="nav-icon">🤖</span>
        <span>AI Advisor</span>
      </button>

    </nav>
  );
}

export default BottomNav;
