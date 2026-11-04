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
      { id: "home", label: "Dashboard", img: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=80&q=70", description: "Farm overview" },
    ],
  },
  {
    label: "FARM RECORDS",
    items: [
      { id: "poultry", label: "Add Chickens", img: "https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=80&q=70", description: "Chicks & flocks" },
      { id: "livestock", label: "My Cattle", img: "https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?w=80&q=70", description: "Calves, heifers & cows" },
      { id: "production", label: "Production Summary", img: "https://images.unsplash.com/photo-1506976785307-8732e854ad03?w=80&q=70", description: "Eggs & milk" },
      { id: "feeding", label: "Feed & Feeding", img: "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=80&q=70", description: "Feed usage & costs" },
      { id: "expenses", label: "Record Income or Expense", img: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=80&q=70", description: "Daily farm cashflow" },
      { id: "vaccinations", label: "Vaccine Schedule", img: "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=80&q=70", description: "Vaccinations & alerts" },
    ],
  },
  {
    label: "POPULATION TRACKING",
    items: [
      { id: "survivors", label: "Survivor Tracking", img: "https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=80&q=70", description: "Population ledger" },
      { id: "mortality", label: "Mortality Monitor", img: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=80&q=70", description: "Death rate trends" },
    ],
  },
  {
    label: "FINANCIAL & AI ASSISTANT",
    items: [
      { id: "performance", label: "Profit & Loss", img: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=80&q=70", description: "P&L reports" },
      { id: "advisor", label: "Farm Assistant", img: "https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=80&q=70", description: "AI daily advisor" },
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
        {/* Header */}
        <div className="sidenav-header">
          <div className="sidenav-brand">
            <div className="sidenav-brand-icon">🌿</div>
            <div>
              <p className="sidenav-brand-name">Kagochi Farm</p>
              <p className="sidenav-brand-sub">Enterprise System</p>
            </div>
          </div>
          <button className="sidenav-close" onClick={onClose} aria-label="Close menu">✕</button>
        </div>
        {/* Scrollable Nav Area */}
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
                  <img src={item.img} alt={item.label} className="sidenav-item-icon sidenav-item-img" />
                  <span className="sidenav-item-text">
                    <span className="sidenav-item-label">{item.label}</span>
                    <span className="sidenav-item-desc">{item.description}</span>
                  </span>
                  {activeView === item.id && <span className="sidenav-item-indicator" />}
                </button>
              ))}
            </div>
          ))}
          {/* Sign out */}
          <div className="sidenav-footer">
            <button className="sidenav-logout" onClick={onLogout}>
              <span>🚪</span>
              <span>Sign Out</span>
            </button>
            <p className="sidenav-version">Kagochi Farm Enterprise v2.0</p>
          </div>
        </div>
      </aside>
    </>
  );
}
