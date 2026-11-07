import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Beef,
  Bird,
  BrainCircuit,
  CalendarDays,
  ChartNoAxesCombined,
  ChevronRight,
  Egg,
  Filter,
  PlusCircle,
  Syringe,
  TrendingDown,
  Users,
  Wallet,
  Wheat,
} from "lucide-react";
import { loadFarmSummary } from "../services/storage";
import type { FarmSummaryData } from "../types/farm";
import DailyRecordModal from "../components/DailyRecordModal";
import {
  Badge,
  Button,
  EmptyState,
  InlineMeta,
  Notice,
  PageHeader,
  Panel,
  Segmented,
  StatCard,
} from "../components/ui";
import { formatCurrency, formatDate, formatNumber, percent } from "../utils/format";

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

const PERIOD_OPTIONS: { value: PeriodFilterKey; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "month", label: "This month" },
  { value: "year", label: "This year" },
  { value: "custom", label: "Custom" },
];

const QUICK_ACTIONS = [
  { view: "poultry", label: "Poultry", hint: "Chicks, broilers & layers", image: "/images/farm/chicken.webp", icon: Bird },
  { view: "livestock", label: "Cattle", hint: "Calves, heifers & dairy cows", image: "/images/farm/cow.webp", icon: Beef },
  { view: "production", label: "Production", hint: "Eggs collected & milk produced", image: "/images/farm/eggs.webp", icon: Egg },
  { view: "feeding", label: "Feeding", hint: "Feed given to animals", image: "/images/farm/animal-feed.webp", icon: Wheat },
  { view: "expenses", label: "Income & expenses", hint: "Money in and out", image: "/images/farm/farm-income.webp", icon: Wallet },
  { view: "performance", label: "Profit & loss", hint: "How much you are making", image: "/images/farm/operating-loss.webp", icon: ChartNoAxesCombined },
  { view: "survivors", label: "Survivors", hint: "How many animals are alive", image: "/images/farm/chicken.webp", icon: Users },
  { view: "mortality", label: "Mortality", hint: "Animal deaths & losses", image: "/images/farm/operating-loss.webp", icon: TrendingDown },
  { view: "vaccinations", label: "Vaccinations", hint: "Vaccine schedules & records", image: "/images/farm/vaccination.webp", icon: Syringe },
];

function timeOfDayGreeting(): "morning" | "afternoon" | "evening" {
  const hour = new Date().getHours();
  if (hour >= 5 && hour <= 11) return "morning";
  if (hour >= 12 && hour <= 17) return "afternoon";
  return "evening";
}

export default function HomeView({
  poultryCount,
  totalPoultryBirds = 0,
  totalLivestockActive = 0,
  onNavigate,
}: HomeViewProps) {
  const [filterKey, setFilterKey] = useState<PeriodFilterKey>("30d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [summary, setSummary] = useState<FarmSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  const todayStr = new Date().toISOString().slice(0, 10);

  const filterParams = useMemo(() => {
    if (filterKey === "today") return { days: 1, to: todayStr, from: todayStr };
    if (filterKey === "yesterday") {
      const yDate = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
      return { days: 1, to: yDate, from: yDate };
    }
    if (filterKey === "7d") return { days: 7, to: todayStr };
    if (filterKey === "30d") return { days: 30, to: todayStr };
    if (filterKey === "month") return { to: todayStr, from: `${todayStr.slice(0, 7)}-01` };
    if (filterKey === "year") return { to: todayStr, from: `${todayStr.slice(0, 4)}-01-01` };
    if (filterKey === "custom" && customFrom && customTo) return { from: customFrom, to: customTo };
    return { days: 30, to: todayStr };
  }, [filterKey, customFrom, customTo, todayStr]);

  useEffect(() => {
    let active = true;
    async function fetchSummary() {
      try {
        setLoading(true);
        setError("");
        const data = await loadFarmSummary(filterParams);
        if (active) setSummary(data);
      } catch (err) {
        console.error("Failed to load farm summary:", err);
        if (active) setError(err instanceof Error ? err.message : "Could not load the farm overview.");
      } finally {
        if (active) setLoading(false);
      }
    }
    fetchSummary();
    return () => {
      active = false;
    };
  }, [filterParams]);

  async function refreshSummary() {
    try {
      const data = await loadFarmSummary(filterParams);
      setSummary(data);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not refresh the farm overview.");
    }
  }

  const totalBirds = summary?.population.poultry.currentBirds ?? poultryCount;
  const totalChicks = summary?.population.poultry.chickBirds ?? 0;
  const totalLayers = summary?.population.poultry.layerBirds ?? 0;
  const totalBroilers = summary?.population.poultry.broilerBirds ?? 0;
  const birdLosses = summary?.population.poultry.totalLosses ?? 0;
  const lossPercent = summary?.population.poultry.lossPercent ?? null;

  const totalCattle = summary?.population.livestock.animalCount ?? totalLivestockActive;
  const totalCalves = summary?.population.livestock.calvesCount ?? 0;
  const totalHeifers = summary?.population.livestock.heifersCount ?? 0;
  const totalCows = summary?.population.livestock.cowsCount ?? 0;
  const totalBulls = summary?.population.livestock.bullsCount ?? 0;

  const totalIncome = summary?.financial.totalIncome ?? 0;
  const totalExpenses = summary?.financial.totalExpenses ?? 0;
  const profitOrLoss = summary?.financial.operatingProfitOrLoss ?? 0;
  const isProfitable = profitOrLoss >= 0;
  const netMargin = summary?.financial.netMarginPercent ?? null;

  const eggLines = summary?.production.lines.filter((line) => line.type === "eggs") ?? [];
  const eggsTotal = eggLines.reduce((sum, line) => sum + line.total, 0);
  const milkLines = summary?.production.lines.filter((line) => line.type === "milk") ?? [];
  const milkTotal = milkLines.reduce((sum, line) => sum + line.total, 0);

  const feedTotals = summary?.feeding.totalsByUnit ?? [];
  const feedKg = feedTotals.find((unit) => unit.unit === "kg")?.total ?? 0;
  const feedBags = feedTotals.find((unit) => unit.unit === "bags")?.total ?? 0;

  const dueTodayVac = summary?.vaccinations.dueTodayCount ?? 0;
  const upcomingVac = summary?.vaccinations.upcoming7DaysCount ?? 0;
  const overdueVac = summary?.vaccinations.overdueCount ?? 0;

  const activeWarnings = summary?.rules.filter((rule) => rule.severity === "warning") ?? [];

  const poultryHintParts = [
    totalChicks > 0 ? `${formatNumber(totalChicks)} chicks` : "",
    totalLayers > 0 ? `${formatNumber(totalLayers)} layers` : "",
    totalBroilers > 0 ? `${formatNumber(totalBroilers)} broilers` : "",
  ].filter(Boolean);

  const cattleHintParts = [
    totalCows > 0 ? `${formatNumber(totalCows)} cows` : "",
    totalHeifers > 0 ? `${formatNumber(totalHeifers)} heifers` : "",
    totalCalves > 0 ? `${formatNumber(totalCalves)} calves` : "",
    totalBulls > 0 ? `${formatNumber(totalBulls)} bulls` : "",
  ].filter(Boolean);

  const hasAnyPopulation = totalBirds > 0 || totalCattle > 0 || totalPoultryBirds > 0 || totalLivestockActive > 0;
  const hasAnyFinance = totalIncome > 0 || totalExpenses > 0;

  const periodLabel = summary
    ? `${formatDate(summary.period.from)} – ${formatDate(summary.period.to)} · ${summary.period.days} day${summary.period.days === 1 ? "" : "s"}`
    : loading
      ? "Loading reporting period…"
      : "Reporting period unavailable";

  const feedDisplay =
    feedKg > 0
      ? `${formatNumber(feedKg)} kg`
      : feedBags > 0
        ? `${formatNumber(feedBags)} bags`
        : "No feed logged";

  return (
    <main className="kf-page">
      <div className="kf-welcome-banner">
        <p className="kf-eyebrow">Good {timeOfDayGreeting()}!</p>
        <h2>Welcome back to Kagochi Farm</h2>
      </div>
      <PageHeader
        eyebrow="Farm overview"
        title="My Farm"
        description="Here is what is happening on your farm today."
        actions={
          <>
            <Button variant="ghost" icon={<BrainCircuit size={16} />} onClick={() => onNavigate("advisor")}>
              Ask for advice
            </Button>
            <Button icon={<PlusCircle size={16} />} onClick={() => setModalOpen(true)}>
              Add a record
            </Button>
          </>
        }
      />

      <div className="kf-stack">
        <Panel>
          <div className="kf-stack--sm" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="kf-filter-row">
              <span className="kf-inline-meta" style={{ display: "inline-flex", alignItems: "center", gap: 6, margin: 0 }}>
                <Filter size={14} /> Period
              </span>
              <Segmented
                label="Dashboard reporting period"
                options={PERIOD_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
                value={filterKey}
                onChange={(value) => setFilterKey(value as PeriodFilterKey)}
              />
            </div>

            {filterKey === "custom" && (
              <div className="kf-filter-row">
                <input
                  type="date"
                  aria-label="Custom period start"
                  value={customFrom}
                  max={customTo || todayStr}
                  onChange={(event) => setCustomFrom(event.target.value)}
                />
                <span className="kf-muted kf-small">to</span>
                <input
                  type="date"
                  aria-label="Custom period end"
                  value={customTo}
                  min={customFrom || undefined}
                  max={todayStr}
                  onChange={(event) => setCustomTo(event.target.value)}
                />
              </div>
            )}

            <InlineMeta>
              <CalendarDays size={13} style={{ verticalAlign: "-2px", marginRight: 5 }} />
              {periodLabel}
              {loading && <span className="kf-muted"> · updating…</span>}
            </InlineMeta>
          </div>
        </Panel>

        {error && <Notice tone="warning">{error}</Notice>}

        {activeWarnings.length > 0 && (
          <Panel
            title={`Farm attention alerts (${activeWarnings.length})`}
            subtitle="Rule-based observations from the records currently stored for this farm."
            actions={<Badge tone="amber" dot>Needs review</Badge>}
          >
            <div className="kf-warning-list">
              {activeWarnings.map((warning) => (
                <div key={warning.id} className="kf-warning-item">
                  <strong>{warning.finding}</strong>
                  <span>{warning.recommendation}</span>
                </div>
              ))}
            </div>
          </Panel>
        )}

        {/* Enterprise Farm Sectors Showcase with Real Photography */}
        <section aria-label="Farm enterprise sectors">
          <div className="kf-sector-grid">
            {/* Sector 1: Poultry */}
            <div
              className="kf-sector-card"
              onClick={() => onNavigate("poultry")}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && onNavigate("poultry")}
            >
              <div className="kf-sector-media">
                <img
                  src="/images/card-poultry.jpg"
                  alt="Poultry flock"
                  className="kf-sector-img"
                  loading="lazy"
                />
                <div className="kf-sector-media-overlay">
                  <span className="kf-sector-badge">
                    <Bird size={13} strokeWidth={2} />
                    {totalBirds > 0 ? `${formatNumber(totalBirds)} birds` : "Poultry active"}
                  </span>
                </div>
              </div>
              <div className="kf-sector-body">
                <div className="kf-sector-header">
                  <h3 className="kf-sector-title">
                    <span className="kf-sector-icon"><Bird size={16} /></span>
                    Poultry Operations
                  </h3>
                  <ChevronRight size={15} className="kf-muted" />
                </div>
                <p className="kf-sector-desc">
                  Chicks, broilers, layers & kienyeji flocks with daily mortality tracking.
                </p>
                <div className="kf-sector-footer">
                  <span>Manage flock</span>
                  <ArrowRight size={13} />
                </div>
              </div>
            </div>

            {/* Sector 2: Livestock / Cattle */}
            <div
              className="kf-sector-card"
              onClick={() => onNavigate("livestock")}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && onNavigate("livestock")}
            >
              <div className="kf-sector-media">
                <img
                  src="/images/card-livestock.jpg"
                  alt="Dairy cattle in pasture"
                  className="kf-sector-img"
                  loading="lazy"
                />
                <div className="kf-sector-media-overlay">
                  <span className="kf-sector-badge">
                    <Beef size={13} strokeWidth={2} />
                    {totalCattle > 0 ? `${formatNumber(totalCattle)} head` : "Cattle active"}
                  </span>
                </div>
              </div>
              <div className="kf-sector-body">
                <div className="kf-sector-header">
                  <h3 className="kf-sector-title">
                    <span className="kf-sector-icon"><Beef size={16} /></span>
                    Livestock & Cattle
                  </h3>
                  <ChevronRight size={15} className="kf-muted" />
                </div>
                <p className="kf-sector-desc">
                  Calves, heifers, dairy cows & breeding bulls with pedigree tags.
                </p>
                <div className="kf-sector-footer">
                  <span>Manage herd</span>
                  <ArrowRight size={13} />
                </div>
              </div>
            </div>

            {/* Sector 3: Production */}
            <div
              className="kf-sector-card"
              onClick={() => onNavigate("production")}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && onNavigate("production")}
            >
              <div className="kf-sector-media">
                <img
                  src="/images/card-production.jpg"
                  alt="Farm fresh eggs"
                  className="kf-sector-img"
                  loading="lazy"
                />
                <div className="kf-sector-media-overlay">
                  <span className="kf-sector-badge">
                    <Egg size={13} strokeWidth={2} />
                    {eggsTotal > 0 || milkTotal > 0
                      ? `${formatNumber(eggsTotal)} eggs · ${formatNumber(milkTotal)}L`
                      : "Daily yield"}
                  </span>
                </div>
              </div>
              <div className="kf-sector-body">
                <div className="kf-sector-header">
                  <h3 className="kf-sector-title">
                    <span className="kf-sector-icon"><Egg size={16} /></span>
                    Daily Production
                  </h3>
                  <ChevronRight size={15} className="kf-muted" />
                </div>
                <p className="kf-sector-desc">
                  Egg collection counts, morning/evening milk yields & destination records.
                </p>
                <div className="kf-sector-footer">
                  <span>Log yields</span>
                  <ArrowRight size={13} />
                </div>
              </div>
            </div>

            {/* Sector 4: Feeding & Crops */}
            <div
              className="kf-sector-card"
              onClick={() => onNavigate("feeding")}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && onNavigate("feeding")}
            >
              <div className="kf-sector-media">
                <img
                  src="/images/card-feeding.jpg"
                  alt="Agricultural crops and feed"
                  className="kf-sector-img"
                  loading="lazy"
                />
                <div className="kf-sector-media-overlay">
                  <span className="kf-sector-badge">
                    <Wheat size={13} strokeWidth={2} />
                    {feedDisplay}
                  </span>
                </div>
              </div>
              <div className="kf-sector-body">
                <div className="kf-sector-header">
                  <h3 className="kf-sector-title">
                    <span className="kf-sector-icon"><Wheat size={16} /></span>
                    Feed & Nutrition
                  </h3>
                  <ChevronRight size={15} className="kf-muted" />
                </div>
                <p className="kf-sector-desc">
                  Rations for chicks, growers, layers and cattle with feed expense tracking.
                </p>
                <div className="kf-sector-footer">
                  <span>Review feeding</span>
                  <ArrowRight size={13} />
                </div>
              </div>
            </div>
          </div>
        </section>

        {!loading && summary && !hasAnyPopulation && (
          <Panel title="Start with your first records" subtitle="Your farm overview will fill in as soon as you add animals and activity.">
            <EmptyState
              icon={<Bird size={26} />}
              title="No poultry or cattle recorded yet"
              description="Add a poultry batch or cattle record, then log production, feeding and sales to see live figures here."
              action={
                <div className="kf-row">
                  <Button icon={<Bird size={15} />} onClick={() => onNavigate("poultry")}>
                    Add poultry
                  </Button>
                  <Button variant="ghost" icon={<Beef size={15} />} onClick={() => onNavigate("livestock")}>
                    Add cattle
                  </Button>
                </div>
              }
              compact
            />
          </Panel>
        )}

        <section className="kf-grid kf-grid--stats" aria-label="Animal population">
          <StatCard
            tone="forest"
            image="/images/farm/chicken.webp"
            imageAlt="Chickens"
            layout="image-right"
            label="Chickens"
            value={formatNumber(totalBirds)}
            hint={poultryHintParts.length > 0 ? poultryHintParts.join(" · ") : "No bird breakdown recorded"}
            onClick={() => onNavigate("poultry")}
          />
          <StatCard
            tone="amber"
            image="/images/farm/chick.webp"
            imageAlt="Chicks on farm"
            layout="image-right"
            label="Chicks on farm"
            value={formatNumber(totalChicks)}
            hint="Day-old to four weeks"
            onClick={() => onNavigate("poultry")}
          />
          <StatCard
            tone="blue"
            image="/images/farm/cow.webp"
            imageAlt="Cattle herd"
            layout="image-right"
            label="Cattle herd"
            value={formatNumber(totalCattle)}
            hint={cattleHintParts.length > 0 ? cattleHintParts.join(" · ") : "No cattle breakdown recorded"}
            onClick={() => onNavigate("livestock")}
          />
          <StatCard
            tone="plum"
            image="/images/farm/calf.webp"
            imageAlt="Calves & heifers"
            layout="image-right"
            label="Calves & heifers"
            value={formatNumber(totalCalves + totalHeifers)}
            hint={`${formatNumber(totalCalves)} calves · ${formatNumber(totalHeifers)} growing heifers`}
            onClick={() => onNavigate("livestock")}
          />
        </section>

        <div className="kf-grid kf-grid--main-side">
          <Panel
            title="Animals alive on the farm"
            subtitle="Counts updated each time you record additions, deaths, or sales."
            actions={
              <Button variant="soft" icon={<ArrowRight size={15} />} onClick={() => onNavigate("survivors")}>
                See all records
              </Button>
            }
          >
            <div className="kf-grid kf-grid--2">
              <StatCard
                tone="forest"
                image="/images/farm/chicken.webp"
                imageAlt="Birds surviving"
                layout="image-right"
                label="Chickens alive"
                value={formatNumber(totalPoultryBirds || totalBirds)}
                hint="Alive after additions, sales and deaths"
                onClick={() => onNavigate("survivors")}
              />
              <StatCard
                tone="plum"
                image="/images/farm/cow.webp"
                imageAlt="Livestock active"
                layout="image-right"
                label="Cattle alive"
                value={formatNumber(totalLivestockActive || totalCattle)}
                hint="Animals with survivors above zero"
                onClick={() => onNavigate("survivors")}
              />
            </div>

            {birdLosses > 0 && (
              <div style={{ marginTop: 14 }}>
                <div className="kf-split-bar" aria-hidden="true">
                  <span
                    style={{
                      width: `${Math.min(100, lossPercent ?? 0)}%`,
                      background: "var(--kf-red)",
                    }}
                  />
                  <span style={{ width: `${Math.max(0, 100 - (lossPercent ?? 0))}%`, background: "var(--kf-action)" }} />
                </div>
                <InlineMeta>
                  Recorded poultry losses: <strong>{formatNumber(birdLosses)}</strong> birds ({percent(lossPercent)} of starting
                  birds).
                </InlineMeta>
              </div>
            )}
          </Panel>

          <Panel
            title={`Profit & loss`}
            subtitle={summary ? `${formatDate(summary.period.from)} – ${formatDate(summary.period.to)}` : "Selected period"}
            actions={
              <Button variant="ghost" icon={<ChevronRight size={15} />} onClick={() => onNavigate("performance")}>
                Details
              </Button>
            }
          >
            <div className="kf-stack kf-stack--sm">
              <StatCard
                tone="green"
                image="/images/farm/farm-income.webp"
                imageAlt="Farm income"
                layout="image-right"
                label="Money earned"
                value={formatCurrency(totalIncome)}
                hint="Egg, milk, poultry and cattle sales"
                onClick={() => onNavigate("expenses")}
              />
              <StatCard
                tone="red"
                image="/images/farm/farm-expenses.webp"
                imageAlt="Operating expenses"
                layout="image-right"
                label="Money spent"
                value={formatCurrency(totalExpenses)}
                hint="Feed, labour, vaccines and maintenance"
                onClick={() => onNavigate("expenses")}
              />
              <StatCard
                tone={isProfitable ? "forest" : "red"}
                image={isProfitable ? "/images/farm/farm-income.webp" : "/images/farm/operating-loss.webp"}
                imageAlt={isProfitable ? "Operating profit" : "Operating loss"}
                layout="image-right"
                label={isProfitable ? "Profit this period" : "Loss this period"}
                value={isProfitable ? formatCurrency(profitOrLoss) : `-${formatCurrency(Math.abs(profitOrLoss))}`}
                hint={netMargin !== null ? `Net margin ${percent(netMargin)}` : "Income minus operating costs"}
                onClick={() => onNavigate("performance")}
              />
            </div>

            {!loading && summary && !hasAnyFinance && (
              <InlineMeta>No income or expenses have been recorded for this period yet.</InlineMeta>
            )}
          </Panel>
        </div>

        <section className="kf-grid kf-grid--stats" aria-label="Production and health">
          <StatCard
            tone="green"
            image="/images/farm/eggs.webp"
            imageAlt="Eggs produced"
            layout="image-right"
            label="Eggs collected"
            value={formatNumber(eggsTotal)}
            hint={`${eggLines.reduce((sum, line) => sum + line.recordCount, 0)} collection records`}
            onClick={() => onNavigate("production")}
          />
          <StatCard
            tone="blue"
            image="/images/farm/milk-can.webp"
            imageAlt="Milk produced"
            layout="image-right"
            label="Milk collected"
            value={`${formatNumber(milkTotal)} L`}
            hint={`${milkLines.reduce((sum, line) => sum + line.recordCount, 0)} milking records`}
            onClick={() => onNavigate("production")}
          />
          <StatCard
            tone="amber"
            image="/images/farm/animal-feed.webp"
            imageAlt="Feed usage"
            layout="image-right"
            label="Feed given"
            value={feedDisplay}
            hint="Recorded across poultry and livestock"
            onClick={() => onNavigate("feeding")}
          />
          <StatCard
            tone={overdueVac > 0 ? "red" : dueTodayVac > 0 ? "amber" : "forest"}
            image="/images/farm/vaccination.webp"
            imageAlt="Vaccination status"
            layout="image-right"
            label="Vaccine reminder"
            value={overdueVac > 0 ? `${overdueVac} overdue` : dueTodayVac > 0 ? `${dueTodayVac} due today` : `${upcomingVac} upcoming`}
            hint={overdueVac > 0 ? "Immediate attention recommended" : "No overdue doses recorded"}
            onClick={() => onNavigate("vaccinations")}
          />
        </section>

        <Panel
          title="Go to..."
          subtitle="Pick what you want to do."
        >
          <div className="kf-record-list">
            {QUICK_ACTIONS.map((action) => {
              return (
                <button
                  key={action.view}
                  type="button"
                  className="kf-record"
                  onClick={() => onNavigate(action.view)}
                  style={{ textAlign: "left" }}
                >
                  <span className="kf-record-head">
                    <span className="kf-record-title">
                      <span className="kf-record-icon kf-record-icon--farm">
                        <img src={action.image} alt={action.label} className="kf-record-farm-img" loading="lazy" />
                      </span>
                      <span>
                        <strong>{action.label}</strong>
                        <span>{action.hint}</span>
                      </span>
                    </span>
                    <ChevronRight size={15} className="kf-muted" aria-hidden="true" />
                  </span>
                </button>
              );
            })}
          </div>
        </Panel>

        <Panel className="kf-panel--dark">
          <div className="kf-row kf-row--between" style={{ alignItems: "flex-start" }}>
            <div className="kf-grow" style={{ maxWidth: 720 }}>
              <div className="kf-row" style={{ marginBottom: 8 }}>
                <span className="kf-stat-icon" style={{ background: "rgba(134,239,172,0.16)", color: "var(--kf-green-300)" }}>
                  <BrainCircuit size={19} />
                </span>
                <Badge tone="green">Farm Assistant (AI)</Badge>
              </div>
              <h2 className="kf-panel-title">Need advice about your farm?</h2>
              <p className="kf-panel-subtitle" style={{ marginTop: 6, maxWidth: 620 }}>
                Ask a question about your chickens, cattle, finances or health. Answers are based on your own records.
              </p>
            </div>
            <Button variant="soft" icon={<ChevronRight size={16} />} onClick={() => onNavigate("advisor")}>
              Ask a question
            </Button>
          </div>
        </Panel>
      </div>

      <DailyRecordModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onRecordSaved={refreshSummary} />
    </main>
  );
}
