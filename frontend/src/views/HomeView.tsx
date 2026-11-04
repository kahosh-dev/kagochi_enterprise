import { useEffect, useState } from "react";
import {
  PlusCircle,
  Calendar,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Coins,
  ShieldAlert,
  Sparkles,
  ChevronRight,
  Filter,
} from "lucide-react";
import {
  ChickIcon,
  ChickenIcon,
  CowIcon,
  CalfIcon,
  EggBasketIcon,
  MilkChurnIcon,
  KesMoneyIcon,
} from "../components/FarmIcons";
import { loadFarmSummary } from "../services/storage";
import type { FarmSummaryData } from "../types/farm";
import DailyRecordModal from "../components/DailyRecordModal";

interface HomeViewProps {
  poultryCount: number;
  livestockCount: number;
  productionCount: number;
  expenseTotal: number;
  totalPoultryBirds?: number;
  totalLivestockActive?: number;
  onNavigate: (view: string) => void;
}

type PeriodFilterKey = "today" | "yesterday" | "7d" | "30d" | "month" | "year" | "custom";

export default function HomeView({
  poultryCount,
  livestockCount,
  totalPoultryBirds = 0,
  totalLivestockActive = 0,
  onNavigate,
}: HomeViewProps) {
  const [filterKey, setFilterKey] = useState<PeriodFilterKey>("30d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [summary, setSummary] = useState<FarmSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const todayStr = new Date().toISOString().slice(0, 10);

  function getFilterParams(key: PeriodFilterKey) {
    if (key === "today") {
      return { days: 1, to: todayStr, from: todayStr };
    }
    if (key === "yesterday") {
      const yDate = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      return { days: 1, to: yDate, from: yDate };
    }
    if (key === "7d") {
      return { days: 7, to: todayStr };
    }
    if (key === "30d") {
      return { days: 30, to: todayStr };
    }
    if (key === "month") {
      const startOfMonth = `${todayStr.slice(0, 7)}-01`;
      return { to: todayStr, from: startOfMonth };
    }
    if (key === "year") {
      const startOfYear = `${todayStr.slice(0, 4)}-01-01`;
      return { to: todayStr, from: startOfYear };
    }
    if (key === "custom" && customFrom && customTo) {
      return { from: customFrom, to: customTo };
    }
    return { days: 30, to: todayStr };
  }

  async function fetchSummary() {
    try {
      setLoading(true);
      const params = getFilterParams(filterKey);
      const data = await loadFarmSummary(params);
      setSummary(data);
    } catch (err) {
      console.error("Failed to load farm summary:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSummary();
  }, [filterKey, customFrom, customTo]);

  // Derived figures
  const totalBirds = summary?.population.poultry.currentBirds ?? poultryCount;
  const totalChicks = summary?.population.poultry.chickBirds ?? 0;
  const totalLayers = summary?.population.poultry.layerBirds ?? 0;
  const totalBroilers = summary?.population.poultry.broilerBirds ?? 0;
  const birdLosses = summary?.population.poultry.totalLosses ?? 0;
  const totalCattle = summary?.population.livestock.animalCount ?? livestockCount;
  const totalCalves = summary?.population.livestock.calvesCount ?? 0;
  const totalHeifers = summary?.population.livestock.heifersCount ?? 0;
  const totalCows = summary?.population.livestock.cowsCount ?? 0;
  const totalBulls = summary?.population.livestock.bullsCount ?? 0;
  const totalIncome = summary?.financial.totalIncome ?? 0;
  const totalExpenses = summary?.financial.totalExpenses ?? 0;
  const profitOrLoss = summary?.financial.operatingProfitOrLoss ?? 0;
  const isProfitable = (summary?.financial.isProfitable ?? true) && profitOrLoss >= 0;
  const eggLines = summary?.production.lines.filter((l) => l.type === "eggs") ?? [];
  const eggsTotal = eggLines.reduce((s, l) => s + l.total, 0);
  const milkLines = summary?.production.lines.filter((l) => l.type === "milk") ?? [];
  const milkTotal = milkLines.reduce((s, l) => s + l.total, 0);
  const feedTotals = summary?.feeding.totalsByUnit ?? [];
  const feedKg = feedTotals.find((u) => u.unit === "kg")?.total ?? 0;
  const feedBags = feedTotals.find((u) => u.unit === "bags")?.total ?? 0;
  const dueTodayVac = summary?.vaccinations.dueTodayCount ?? 0;
  const upcomingVac = summary?.vaccinations.upcoming7DaysCount ?? 0;
  const overdueVac = summary?.vaccinations.overdueCount ?? 0;
  const activeWarnings = summary?.rules.filter((r) => r.severity === "warning") ?? [];

  return (
    <main className="home-page upgraded-home">
      {/* Top Banner with Quick Record Button */}
      <section className="welcome-section upgraded-welcome">
        <div className="welcome-text-col">
          <p className="welcome-small">Karibu Tena 👋</p>
          <h2>Farm Management Dashboard</h2>
          <p className="welcome-text">
            Simple, real-time overview of your poultry, cattle, profit & loss, and vaccinations.
          </p>
        </div>
        <div className="welcome-action-col">
          <button
            type="button"
            className="btn-record-activity-hero"
            onClick={() => setModalOpen(true)}
          >
            <PlusCircle size={20} />
            <span>Record Farm Activity</span>
          </button>
        </div>
      </section>

      {/* Date Filter Bar */}
      <section className="dashboard-filter-bar">
        <div className="filter-chips">
          <span className="filter-label">
            <Filter size={15} /> Period: {loading && "(Updating...)"}
          </span>
          <button
            className={`filter-chip ${filterKey === "today" ? "active" : ""}`}
            onClick={() => setFilterKey("today")}
          >
            Today
          </button>
          <button
            className={`filter-chip ${filterKey === "yesterday" ? "active" : ""}`}
            onClick={() => setFilterKey("yesterday")}
          >
            Yesterday
          </button>
          <button
            className={`filter-chip ${filterKey === "7d" ? "active" : ""}`}
            onClick={() => setFilterKey("7d")}
          >
            Last 7 Days
          </button>
          <button
            className={`filter-chip ${filterKey === "30d" ? "active" : ""}`}
            onClick={() => setFilterKey("30d")}
          >
            Last 30 Days
          </button>
          <button
            className={`filter-chip ${filterKey === "month" ? "active" : ""}`}
            onClick={() => setFilterKey("month")}
          >
            This Month
          </button>
          <button
            className={`filter-chip ${filterKey === "year" ? "active" : ""}`}
            onClick={() => setFilterKey("year")}
          >
            This Year
          </button>
          <button
            className={`filter-chip ${filterKey === "custom" ? "active" : ""}`}
            onClick={() => setFilterKey("custom")}
          >
            Custom Range
          </button>
        </div>
        {filterKey === "custom" && (
          <div className="custom-range-inputs">
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              placeholder="From"
            />
            <span>to</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              placeholder="To"
            />
          </div>
        )}
        <div className="period-badge-indicator">
          <Calendar size={14} />
          <span>
            {summary ? `${summary.period.from} to ${summary.period.to} (${summary.period.days} day${summary.period.days > 1 ? "s" : ""})` : "Loading..."}
          </span>
        </div>
      </section>

      {/* Loss Detection & Early Warning Alerts */}
      {activeWarnings.length > 0 && (
        <section className="early-warnings-banner" role="alert">
          <div className="warning-banner-header">
            <AlertTriangle size={20} className="warning-icon" />
            <h4>Farm Attention Alerts ({activeWarnings.length})</h4>
          </div>
          <div className="warning-banner-list">
            {activeWarnings.map((warn) => (
              <div key={warn.id} className="warning-item">
                <span className="warning-finding"><strong>{warn.finding}</strong></span>
                <span className="warning-rec">{warn.recommendation}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* KEY METRICS GRID */}
      <h3 className="section-title">Farm Position & Animals</h3>
      <section className="farm-metrics-grid">
        {/* Total Poultry */}
        <div className="metric-box poultry-box" onClick={() => onNavigate("poultry")}>
          <div className="metric-icon-wrap">
            <ChickenIcon size={28} />
          </div>
          <div className="metric-info">
            <span className="metric-label">Total Chickens</span>
            <h3 className="metric-value">{totalBirds.toLocaleString()}</h3>
            <span className="metric-subtext">
              {totalChicks > 0 ? `${totalChicks} chicks` : ""}
              {totalLayers > 0 ? ` · ${totalLayers} layers` : ""}
              {totalBroilers > 0 ? ` · ${totalBroilers} broilers` : ""}
              {birdLosses > 0 ? ` (${birdLosses} losses)` : ""}
            </span>
          </div>
        </div>
        {/* Total Chicks */}
        <div className="metric-box chicks-box" onClick={() => onNavigate("poultry")}>
          <div className="metric-icon-wrap">
            <ChickIcon size={28} />
          </div>
          <div className="metric-info">
            <span className="metric-label">Chicks on Farm</span>
            <h3 className="metric-value">{totalChicks.toLocaleString()}</h3>
            <span className="metric-subtext">Brooder & day-old</span>
          </div>
        </div>
        {/* Total Cattle */}
        <div className="metric-box cattle-box" onClick={() => onNavigate("livestock")}>
          <div className="metric-icon-wrap">
            <CowIcon size={28} />
          </div>
          <div className="metric-info">
            <span className="metric-label">My Cattle</span>
            <h3 className="metric-value">{totalCattle.toLocaleString()}</h3>
            <span className="metric-subtext">
              {totalCows} cows · {totalHeifers} heifers · {totalCalves} calves{totalBulls > 0 ? ` · ${totalBulls} bulls` : ""}
            </span>
          </div>
        </div>
        {/* Calves & Heifers */}
        <div className="metric-box calves-box" onClick={() => onNavigate("livestock")}>
          <div className="metric-icon-wrap">
            <CalfIcon size={28} />
          </div>
          <div className="metric-info">
            <span className="metric-label">Calves & Heifers</span>
            <h3 className="metric-value">{(totalCalves + totalHeifers).toLocaleString()}</h3>
            <span className="metric-subtext">
              {totalCalves} calves · {totalHeifers} growing heifers
            </span>
          </div>
        </div>
      </section>

      {/* Population Overview tiles — survivor tracking */}
      <section className="dashboard-section">
        <div className="section-heading">
          <div>
            <h3>Population Overview</h3>
            <p>Live survivor counts based on recorded events.</p>
          </div>
        </div>
        <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          <div
            className="dashboard-card image-card"
            onClick={() => onNavigate("survivors")}
            style={{ cursor: "pointer", background: 'linear-gradient(135deg, #065f46, #10b981)' }}
          >
            <div className="card-image-overlay" style={{ position: 'relative', padding: '1.5rem' }}>
              <p className="card-label" style={{ color: '#a7f3d0' }}>🐓 Birds Surviving</p>
              <h3 style={{ color: '#fff', fontSize: '2rem', margin: '0.25rem 0' }}>{totalPoultryBirds.toLocaleString()}</h3>
              <p className="card-description" style={{ color: '#a7f3d0', marginBottom: '0.75rem' }}>Alive after all events</p>
              <button
                className="secondary-action"
                style={{ fontSize: '0.8rem', padding: '0.3rem 0.75rem' }}
                onClick={(e) => { e.stopPropagation(); onNavigate("survivors"); }}
              >
                View Survivors →
              </button>
            </div>
          </div>
          <div
            className="dashboard-card image-card"
            onClick={() => onNavigate("mortality")}
            style={{ cursor: "pointer", background: 'linear-gradient(135deg, #7c3aed, #a78bfa)' }}
          >
            <div className="card-image-overlay" style={{ position: 'relative', padding: '1.5rem' }}>
              <p className="card-label" style={{ color: '#ede9fe' }}>🐄 Livestock Active</p>
              <h3 style={{ color: '#fff', fontSize: '2rem', margin: '0.25rem 0' }}>{totalLivestockActive.toLocaleString()}</h3>
              <p className="card-description" style={{ color: '#ede9fe', marginBottom: '0.75rem' }}>Animals with survivors &gt; 0</p>
              <button
                className="secondary-action"
                style={{ fontSize: '0.8rem', padding: '0.3rem 0.75rem' }}
                onClick={(e) => { e.stopPropagation(); onNavigate("mortality"); }}
              >
                View Details →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FINANCIAL PROFIT & LOSS SECTION */}
      <div className="section-header-row">
        <h3 className="section-title">Profit & Loss ({filterKey === "today" ? "Today" : filterKey === "7d" ? "Last 7 Days" : "Selected Period"})</h3>
        <button className="link-action-btn" onClick={() => onNavigate("performance")}>
          Full P&L Details →
        </button>
      </div>
      <section className="financial-cards-row">
        {/* Total Income */}
        <div className="financial-card income-card">
          <div className="fin-icon-wrap">
            <Coins size={24} />
          </div>
          <div className="fin-content">
            <span className="fin-label">Total Farm Income</span>
            <h3 className="fin-value">KES {totalIncome.toLocaleString()}</h3>
            <span className="fin-sub">From egg, milk & animal sales</span>
          </div>
        </div>
        {/* Total Expenses */}
        <div className="financial-card expense-card">
          <div className="fin-icon-wrap">
            <TrendingDown size={24} />
          </div>
          <div className="fin-content">
            <span className="fin-label">Operating Expenses</span>
            <h3 className="fin-value">KES {totalExpenses.toLocaleString()}</h3>
            <span className="fin-sub">Feed, labor, vaccines & maintenance</span>
          </div>
        </div>
        {/* Operating Profit or Loss */}
        <div className={`financial-card pnl-card ${isProfitable ? "profitable" : "loss-making"}`}>
          <div className="fin-icon-wrap">
            {isProfitable ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
          </div>
          <div className="fin-content">
            <span className="fin-label">Calculated Profit / Loss</span>
            <h3 className="fin-value">
              {isProfitable ? "+" : ""}KES {profitOrLoss.toLocaleString()}
            </h3>
            <span className="fin-sub">
              {isProfitable ? "Operating surplus (Profit)" : "Operating deficit (Loss)"}
            </span>
          </div>
        </div>
      </section>

      {/* PRODUCTION & HEALTH METRICS */}
      <h3 className="section-title">Production & Health</h3>
      <section className="farm-metrics-grid secondary-metrics-grid">
        {/* Eggs Production */}
        <div className="metric-box egg-box" onClick={() => onNavigate("production")}>
          <div className="metric-icon-wrap">
            <EggBasketIcon size={26} />
          </div>
          <div className="metric-info">
            <span className="metric-label">Eggs Produced</span>
            <h3 className="metric-value">{eggsTotal.toLocaleString()}</h3>
            <span className="metric-subtext">In selected period</span>
          </div>
        </div>
        {/* Milk Production */}
        <div className="metric-box milk-box" onClick={() => onNavigate("production")}>
          <div className="metric-icon-wrap">
            <MilkChurnIcon size={26} />
          </div>
          <div className="metric-info">
            <span className="metric-label">Milk Produced</span>
            <h3 className="metric-value">{milkTotal.toLocaleString()} L</h3>
            <span className="metric-subtext">Litres milked</span>
          </div>
        </div>
        {/* Feed Consumed */}
        <div className="metric-box feed-box" onClick={() => onNavigate("feeding")}>
          <div className="metric-icon-wrap">
            <KesMoneyIcon size={26} />
          </div>
          <div className="metric-info">
            <span className="metric-label">Feed Usage</span>
            <h3 className="metric-value">
              {feedKg > 0 ? `${feedKg.toLocaleString()} kg` : `${feedBags} bags`}
            </h3>
            <span className="metric-subtext">Given to chickens & cows</span>
          </div>
        </div>
        {/* Vaccinations Alerts */}
        <div
          className={`metric-box vac-box ${overdueVac > 0 ? "vac-alert" : ""}`}
          onClick={() => onNavigate("vaccinations")}
        >
          <div className="metric-icon-wrap">
            <ShieldAlert size={26} />
          </div>
          <div className="metric-info">
            <span className="metric-label">Vaccination Status</span>
            <h3 className="metric-value">
              {dueTodayVac > 0 ? `${dueTodayVac} Due Today` : `${upcomingVac} Upcoming`}
            </h3>
            <span className="metric-subtext">
              {overdueVac > 0 ? `⚠ ${overdueVac} overdue doses!` : "All scheduled up-to-date"}
            </span>
          </div>
        </div>
      </section>

      {/* QUICK ACTIONS WITH CLEAR LABELS */}
      <section className="dashboard-section">
        <div className="section-heading">
          <div>
            <h3>Farm Management Sections</h3>
            <p>Access your records and operations with one click.</p>
          </div>
        </div>
        <div className="quick-actions upgraded-actions-grid">
          <button className="quick-action" onClick={() => onNavigate("poultry")}>
            <ChickenIcon size={32} />
            <strong>Add Chickens</strong>
            <small>Chicks, broilers & layers</small>
          </button>
          <button className="quick-action" onClick={() => onNavigate("livestock")}>
            <CowIcon size={32} />
            <strong>My Cattle</strong>
            <small>Calves, heifers & cows</small>
          </button>
          <button className="quick-action" onClick={() => onNavigate("production")}>
            <EggBasketIcon size={32} />
            <strong>Production Summary</strong>
            <small>Eggs & milk logs</small>
          </button>
          <button className="quick-action" onClick={() => onNavigate("feeding")}>
            <KesMoneyIcon size={32} />
            <strong>Feed & Feeding</strong>
            <small>Rations & costs</small>
          </button>
          <button className="quick-action" onClick={() => onNavigate("expenses")}>
            <Coins size={32} />
            <strong>Record Income & Expense</strong>
            <small>Daily farm cashflow</small>
          </button>
          <button className="quick-action" onClick={() => onNavigate("performance")}>
            <TrendingUp size={32} />
            <strong>Profit & Loss</strong>
            <small>Financial summary</small>
          </button>
          <button className="quick-action" onClick={() => onNavigate("survivors")}>
            <ChickenIcon size={32} />
            <strong>Survivor Tracking</strong>
            <small>Population ledger</small>
          </button>
          <button className="quick-action" onClick={() => onNavigate("mortality")}>
            <AlertTriangle size={32} />
            <strong>Mortality Monitor</strong>
            <small>Death rate trends</small>
          </button>
          <button className="quick-action" onClick={() => onNavigate("vaccinations")}>
            <ShieldAlert size={32} />
            <strong>Vaccinations</strong>
            <small>Vaccine schedule</small>
          </button>
        </div>
      </section>

      {/* AI ASSISTANT HERO CARD */}
      <section className="ai-dashboard-card upgraded-ai-card">
        <div className="ai-icon">
          <Sparkles size={36} color="#16a34a" />
        </div>
        <div className="ai-content">
          <p className="ai-label">AI FARM ASSISTANT</p>
          <h3>Ask questions about today's performance</h3>
          <p>
            Get instant daily analysis on whether your farm made a profit today, which expenses were high,
            mortality risks, and upcoming vaccinations.
          </p>
          <button className="ai-button" onClick={() => onNavigate("advisor")}>
            Open Farm Assistant <ChevronRight size={16} />
          </button>
        </div>
      </section>

      {/* Daily Record Fast-Entry Modal */}
      <DailyRecordModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onRecordSaved={fetchSummary}
      />
    </main>
  );
}
