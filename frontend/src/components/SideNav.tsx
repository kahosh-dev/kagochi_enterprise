import type { ReactNode } from "react";
import {
  LayoutDashboard,
  BrainCircuit,
  LogOut,
  X,
  Leaf,
} from "lucide-react";

interface SideNavProps {
  isOpen: boolean;
  onClose: () => void;
  activeView: string;
  onNavigate: (view: string) => void;
  userName: string;
  userEmail?: string;
  onLogout: () => void;
}

interface NavItem {
  id: string;
  label: string;
  description: string;
  image?: string;
  icon?: ReactNode;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    label: "Overview",
    items: [
      { id: "home", label: "Home", description: "Your farm at a glance", icon: <LayoutDashboard size={19} strokeWidth={1.5} /> },
    ],
  },
  {
    label: "My Animals",
    items: [
      { id: "poultry", label: "My Chickens", description: "Chicks, broilers & layers", image: "/images/farm/chicken.webp" },
      { id: "livestock", label: "My Cattle", description: "Calves, heifers & cows", image: "/images/farm/cow.webp" },
      { id: "survivors", label: "Animals Alive", description: "Population ledger", image: "/images/farm/chick.webp" },
      { id: "mortality", label: "Death Tracking", description: "Losses & mortality rates", image: "/images/farm/operating-loss.webp" },
    ],
  },
  {
    label: "Daily Records",
    items: [
      { id: "production", label: "Eggs & Milk", description: "Daily production logs", image: "/images/farm/eggs.webp" },
      { id: "feeding", label: "Feeding", description: "Feed usage & costs", image: "/images/farm/animal-feed.webp" },
      { id: "expenses", label: "Money In & Out", description: "Income & expenses", image: "/images/farm/farm-income.webp" },
    ],
  },
  {
    label: "Animal Health",
    items: [
      { id: "vaccinations", label: "Vaccinations", description: "Schedules & reminders", image: "/images/farm/vaccination.webp" },
    ],
  },
  {
    label: "Reports & AI",
    items: [
      { id: "performance", label: "Money Made & Spent", description: "Profit & loss reports", image: "/images/farm/farm-income.webp" },
      { id: "advisor", label: "Farm Assistant", description: "AI advice for your farm", icon: <BrainCircuit size={19} strokeWidth={1.5} /> },
    ],
  },
];

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export default function SideNav({
  isOpen,
  onClose,
  activeView,
  onNavigate,
  userName,
  userEmail,
  onLogout,
}: SideNavProps) {
  function handleNavigate(id: string) {
    onNavigate(id);
    onClose();
  }

  return (
    <>
      <div
        className={`kf-sidebar-backdrop${isOpen ? " is-visible" : ""}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className={`kf-sidebar${isOpen ? " is-open" : ""}`}>
        <div className="kf-sidebar-head">
          <div className="kf-sidebar-brand">
            <div className="kf-logo-mark">
              <Leaf size={21} strokeWidth={2.2} />
            </div>
            <div>
              <strong>Kagochi Farm</strong>
              <span>Enterprise System</span>
            </div>
          </div>
          <button className="kf-sidebar-close" onClick={onClose} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>

        <div className="kf-sidebar-scroll">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label} className="kf-sidebar-section">
              <p className="kf-sidebar-label">{section.label}</p>
              {section.items.map((item) => {
                const isActive = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    className={`kf-nav-item${isActive ? " is-active" : ""}`}
                    onClick={() => handleNavigate(item.id)}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {item.image ? (
                      <span className="kf-nav-icon kf-nav-icon--farm">
                        <img src={item.image} alt="" className="kf-nav-farm-img" loading="lazy" />
                      </span>
                    ) : (
                      <span className="kf-nav-icon">{item.icon}</span>
                    )}
                    <span className="kf-nav-copy">
                      <strong>{item.label}</strong>
                      <span>{item.description}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div className="kf-sidebar-foot">
          <div className="kf-sidebar-user">
            <span className="kf-avatar" aria-hidden="true">{initials(userName)}</span>
            <div className="kf-sidebar-user-copy">
              <strong>{userName}</strong>
              {userEmail && <span>{userEmail}</span>}
            </div>
          </div>
          <button className="kf-signout" onClick={onLogout}>
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
          <p className="kf-sidebar-version">Kagochi Farm Enterprise v2.0</p>
        </div>
      </aside>
    </>
  );
}
