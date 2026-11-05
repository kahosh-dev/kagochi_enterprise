import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Beef,
  Bird,
  CalendarDays,
  ChevronRight,
  Coins,
  Egg,
  Filter,
  Milk,
  PlusCircle,
  ShieldAlert,
  Sparkles,
  Syringe,
  TrendingDown,
  TrendingUp,
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
  { view: "poultry", label: "Poultry", hint: "Chicks, broilers & layers", icon: Bird },
  { view: "livestock", label: "Cattle", hint: "Calves, heifers & cows", icon: Beef },
  { view: "production", label: "Production", hint: "Eggs & milk logs", icon: Egg },
  { view: "feeding", label: "Feeding", hint: "Rations & feed costs", icon: Wheat },
  { view: "expenses", label: "Income & expenses", hint: "Daily cashflow ledger", icon: Coins },
  { view: "performance", label: "Profit & loss", hint: "Financial statements", icon: TrendingUp },
  { view: "survivors", label: "Survivors", hint: "Population ledger", icon: Bird },
  { view: "mortality", label: "Mortality", hint: "Death-rate trends", icon: AlertTriangle },
  { view: "vaccinations", label: "Vaccinations", hint: "Schedule & reminders", icon: Syringe },
];

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
      <PageHeader
        eyebrow="Farm overview"
        title="Dashboard"
        description="A live view of your poultry, cattle, production, finances and vaccination schedule."
        actions={
          <>
            <Button variant="ghost" icon={<Sparkles size={16} />} onClick={() => onNavigate("advisor")}>
              Ask the assistant
            </Button>
            <Button icon={<PlusCircle size={16} />} onClick={() => setModalOpen(true)}>
              Record activity
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
            icon={<Bird size={20} />}
            label="Chickens"
            value={formatNumber(totalBirds)}
            hint={poultryHintParts.length > 0 ? poultryHintParts.join(" · ") : "No bird breakdown recorded"}
            onClick={() => onNavigate("poultry")}
          />
          <StatCard
            tone="amber"
            icon={<Egg size={20} />}
            label="Chicks on farm"
            value={formatNumber(totalChicks)}
            hint="Day-old to four weeks"
            onClick={() => onNavigate("poultry")}
          />
          <StatCard
            tone="blue"
            icon={<Beef size={20} />}
            label="Cattle herd"
            value={formatNumber(totalCattle)}
            hint={cattleHintParts.length > 0 ? cattleHintParts.join(" · ") : "No cattle breakdown recorded"}
            onClick={() => onNavigate("livestock")}
          />
          <StatCard
            tone="plum"
            icon={<Beef size={20} />}
            label="Calves & heifers"
            value={formatNumber(totalCalves + totalHeifers)}
            hint={`${formatNumber(totalCalves)} calves · ${formatNumber(totalHeifers)} growing heifers`}
            onClick={() => onNavigate("livestock")}
          />
        </section>

        <div className="kf-grid kf-grid--main-side">
          <Panel
            title="Population overview"
            subtitle="Live survivor counts calculated from recorded population events."
            actions={
              <Button variant="soft" icon={<ArrowRight size={15} />} onClick={() => onNavigate("survivors")}>
                Open ledger
              </Button>
            }
          >
            <div className="kf-grid kf-grid--2">
              <StatCard
                tone="forest"
                icon={<Bird size={19} />}
                label="Birds surviving"
                value={formatNumber(totalPoultryBirds || totalBirds)}
                hint="Alive after additions, sales and deaths"
                onClick={() => onNavigate("survivors")}
              />
              <StatCard
                tone="plum"
                icon={<Beef size={19} />}
                label="Livestock active"
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
                icon={<Coins size={19} />}
                label="Farm income"
                value={formatCurrency(totalIncome)}
                hint="Egg, milk, poultry and cattle sales"
              />
              <StatCard
                tone="red"
                icon={<TrendingDown size={19} />}
                label="Operating expenses"
                value={formatCurrency(totalExpenses)}
                hint="Feed, labour, vaccines and maintenance"
              />
              <StatCard
                tone={isProfitable ? "forest" : "red"}
                icon={isProfitable ? <TrendingUp size={19} /> : <TrendingDown size={19} />}
                label={isProfitable ? "Operating profit" : "Operating loss"}
                value={isProfitable ? formatCurrency(profitOrLoss) : `-${formatCurrency(Math.abs(profitOrLoss))}`}
                hint={netMargin !== null ? `Net margin ${percent(netMargin)}` : "Income minus operating costs"}
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
            icon={<Egg size={20} />}
            label="Eggs produced"
            value={formatNumber(eggsTotal)}
            hint={`${eggLines.reduce((sum, line) => sum + line.recordCount, 0)} collection records`}
            onClick={() => onNavigate("production")}
          />
          <StatCard
            tone="blue"
            icon={<Milk size={20} />}
            label="Milk produced"
            value={`${formatNumber(milkTotal)} L`}
            hint={`${milkLines.reduce((sum, line) => sum + line.recordCount, 0)} milking records`}
            onClick={() => onNavigate("production")}
          />
          <StatCard
            tone="amber"
            icon={<Wheat size={20} />}
            label="Feed usage"
            value={feedDisplay}
            hint="Recorded across poultry and livestock"
            onClick={() => onNavigate("feeding")}
          />
          <StatCard
            tone={overdueVac > 0 ? "red" : dueTodayVac > 0 ? "amber" : "forest"}
            icon={<ShieldAlert size={20} />}
            label="Vaccination status"
            value={overdueVac > 0 ? `${overdueVac} overdue` : dueTodayVac > 0 ? `${dueTodayVac} due today` : `${upcomingVac} upcoming`}
            hint={overdueVac > 0 ? "Immediate attention recommended" : "No overdue doses recorded"}
            onClick={() => onNavigate("vaccinations")}
          />
        </section>

        <Panel
          title="Farm sections"
          subtitle="Jump straight into the records you need to update today."
        >
          <div className="kf-record-list">
            {QUICK_ACTIONS.map((action) => {
              const Icon = action.icon;
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
                      <span className="kf-record-icon">
                        <Icon size={17} />
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
                <span className="kf-stat-icon" style={{ background: "rgba(134,239,172,0.16)", color: "#86efac" }}>
                  <Sparkles size={19} />
                </span>
                <Badge tone="green">AI farm assistant</Badge>
              </div>
              <h2 className="kf-panel-title">Ask questions about your farm performance</h2>
              <p className="kf-panel-subtitle" style={{ marginTop: 6, maxWidth: 620 }}>
                Get a grounded review of profit, high expenses, mortality risks and upcoming vaccinations. Answers are
                based only on the records you have entered.
              </p>
            </div>
            <Button variant="soft" icon={<ChevronRight size={16} />} onClick={() => onNavigate("advisor")}>
              Open assistant
            </Button>
          </div>
        </Panel>
      </div>

      <DailyRecordModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onRecordSaved={refreshSummary} />
    </main>
  );
}
