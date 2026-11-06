import { useEffect, useState } from "react";
import { loadFarmSummary } from "../services/storage";
import type { FarmSummaryData } from "../types/farm";
import {
  CalendarDays,
  Download,
  ChartNoAxesCombined,
} from "lucide-react";
import {
  PageHeader,
  StatCard,
  Panel,
  Button,
  EmptyState,
  ErrorBanner,
  Segmented,
  CssBar,
} from "../components/ui";
import { formatCurrency, formatNumber, percent } from "../utils/format";

type ReportPeriodKey = "daily" | "weekly" | "monthly" | "quarterly" | "annual" | "custom";

export default function PerformanceView() {
  const [periodKey, setPeriodKey] = useState<ReportPeriodKey>("monthly");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [summary, setSummary] = useState<FarmSummaryData | null>(null);
  const [_loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const todayStr = new Date().toISOString().slice(0, 10);

  function getQueryParams(key: ReportPeriodKey) {
    if (key === "daily") return { days: 1, to: todayStr, from: todayStr };
    if (key === "weekly") return { days: 7, to: todayStr };
    if (key === "monthly") {
      const startOfMonth = `${todayStr.slice(0, 7)}-01`;
      return { to: todayStr, from: startOfMonth };
    }
    if (key === "quarterly") return { days: 90, to: todayStr };
    if (key === "annual") {
      const startOfYear = `${todayStr.slice(0, 4)}-01-01`;
      return { to: todayStr, from: startOfYear };
    }
    if (key === "custom" && customFrom && customTo) return { from: customFrom, to: customTo };
    return { days: 30, to: todayStr };
  }

  async function fetchReport() {
    try {
      setLoading(true);
      setErrorMsg("");
      const params = getQueryParams(periodKey);
      const data = await loadFarmSummary(params);
      setSummary(data);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to calculate farm performance.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchReport();
  }, [periodKey, customFrom, customTo]);

  const totalIncome = summary?.financial.totalIncome ?? 0;
  const totalExpenses = summary?.financial.totalExpenses ?? 0;
  const profitOrLoss = summary?.financial.operatingProfitOrLoss ?? 0;
  const isProfitable = profitOrLoss >= 0;
  const netMargin = summary?.financial.netMarginPercent;

  const incomeCategories = (summary?.income.byCategory ?? []).slice(0, 8);
  const expenseCategories = (summary?.expenses.byCategory ?? []).slice(0, 8);
  const maxIncome = Math.max(...incomeCategories.map((c) => c.total), 1);
  const maxExpense = Math.max(...expenseCategories.map((c) => c.total), 1);

  const lossPercent = summary?.population.poultry.lossPercent ?? 0;

  const eggsLine = summary?.production.lines.find((l) => l.type === "eggs");
  const milkLine = summary?.production.lines.find((l) => l.type === "milk");

  const kgFeed = summary?.feeding.totalsByUnit.find((u) => u.unit === "kg");
  const bagsFeed = summary?.feeding.totalsByUnit.find((u) => u.unit === "bags");

  // Export to CSV — preserved unchanged
  function exportCSV() {
    if (!summary) return;
    const rows = [
      ["Kagochi Farm Enterprise - Profit & Loss Statement"],
      [`Reporting Period: ${summary.period.from} to ${summary.period.to} (${summary.period.days} days)`],
      [`Generated At: ${new Date().toLocaleString()}`],
      [""],
      ["Summary Item", "Amount (KES)"],
      ["Total Farm Income", totalIncome],
      ["Total Operating Expenses", totalExpenses],
      ["Operating Profit / (Loss)", profitOrLoss],
      ["Net Margin %", netMargin ? `${netMargin}%` : "N/A"],
      [""],
      ["Income Categories", "Amount (KES)", "Share %"],
      ...incomeCategories.map((c) => [c.category, c.total, `${c.sharePercent ?? 0}%`]),
      [""],
      ["Expense Categories", "Amount (KES)", "Share %"],
      ...expenseCategories.map((c) => [c.category, c.total, `${c.sharePercent ?? 0}%`]),
    ];

    const csvContent = "data:text/csv;charset=utf-8," + rows.map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `kagochi_farm_pnl_${summary.period.from}_to_${summary.period.to}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <main className="kf-page">
      <PageHeader
        eyebrow="Financial Analytics & Reports"
        title="Analytics & Performance"
        description="Actual operating financial statements and production analytics for your farm."
        actions={
          <Button
            variant="ghost"
            icon={<Download size={16} />}
            onClick={exportCSV}
            disabled={!summary}
          >
            Export CSV
          </Button>
        }
      />

      {/* Period selector */}
      <Segmented
        label="Report period"
        options={[
          { value: "daily", label: "Daily" },
          { value: "weekly", label: "Weekly" },
          { value: "monthly", label: "Monthly" },
          { value: "quarterly", label: "Quarterly" },
          { value: "annual", label: "Annual" },
          { value: "custom", label: "Custom" },
        ]}
        value={periodKey}
        onChange={(v) => setPeriodKey(v as ReportPeriodKey)}
      />

      {periodKey === "custom" && (
        <div className="kf-filter-row">
          <label className="kf-label" htmlFor="perf-from">
            <CalendarDays size={14} /> From
          </label>
          <input
            id="perf-from"
            type="date"
            className="kf-input"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
          />
          <span style={{ padding: "0 0.5rem" }}>to</span>
          <input
            type="date"
            className="kf-input"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
          />
        </div>
      )}

      {errorMsg && <ErrorBanner message={errorMsg} onRetry={fetchReport} />}

      {/* Financial summary cards */}
      <div className="kf-stat-grid">
        <StatCard
          label="Gross Farm Income"
          value={formatCurrency(totalIncome)}
          hint={
            summary?.income.changePercent != null
              ? `${summary.income.changePercent >= 0 ? "+" : ""}${summary.income.changePercent}% vs prev`
              : "Realized sales in period"
          }
          image="/images/farm/farm-income.webp"
          imageAlt="Gross Farm Income"
          layout="image-right"
          tone="green"
        />
        <StatCard
          label="Total Operating Expenses"
          value={formatCurrency(totalExpenses)}
          hint={
            summary?.expenses.changePercent != null
              ? `${summary.expenses.changePercent >= 0 ? "+" : ""}${summary.expenses.changePercent}% vs prev`
              : "Costs incurred in period"
          }
          image="/images/farm/farm-expenses.webp"
          imageAlt="Operating Expenses"
          layout="image-right"
          tone="red"
        />
        <StatCard
          label={isProfitable ? "Operating Profit" : "Operating Loss"}
          value={isProfitable ? formatCurrency(profitOrLoss) : `-${formatCurrency(Math.abs(profitOrLoss))}`}
          hint={netMargin != null ? `Net margin: ${percent(netMargin)}` : "Income minus expenses"}
          image={isProfitable ? "/images/farm/farm-income.webp" : "/images/farm/operating-loss.webp"}
          imageAlt={isProfitable ? "Operating Profit" : "Operating Loss"}
          layout="image-right"
          tone={isProfitable ? "forest" : "red"}
        />
        <StatCard
          label="Performance Ratio"
          value={netMargin != null ? percent(netMargin) : "N/A"}
          hint="Operating efficiency index"
          icon={<ChartNoAxesCombined size={20} strokeWidth={1.5} />}
          tone="blue"
        />
      </div>

      {/* Income vs Expenses breakdown */}
      <div className="kf-grid kf-grid--2">
        <Panel
          title="Income by Category"
          subtitle={
            incomeCategories.length > 0
              ? `${incomeCategories.length} sales streams active`
              : "No income recorded in this period"
          }
        >
          {incomeCategories.length === 0 ? (
            <EmptyState
              compact
              title="No income recorded"
              description="Record sales in the Cashflow page to see income distribution."
            />
          ) : (
            incomeCategories.map((c) => (
              <CssBar
                key={c.category}
                label={c.category}
                value={c.total}
                max={maxIncome}
                formatted={`${formatCurrency(c.total)}${c.sharePercent != null ? ` (${c.sharePercent}%)` : ""}`}
                tone="green"
              />
            ))
          )}
        </Panel>

        <Panel
          title="Expenses by Category"
          subtitle={
            expenseCategories.length > 0
              ? `${expenseCategories.length} cost centres recorded`
              : "No expenses recorded in this period"
          }
        >
          {expenseCategories.length === 0 ? (
            <EmptyState
              compact
              title="No expenses recorded"
              description="Record operational expenses in Cashflow to track costs."
            />
          ) : (
            expenseCategories.map((c) => (
              <CssBar
                key={c.category}
                label={c.category}
                value={c.total}
                max={maxExpense}
                formatted={`${formatCurrency(c.total)}${c.sharePercent != null ? ` (${c.sharePercent}%)` : ""}`}
                tone="red"
              />
            ))
          )}
        </Panel>
      </div>

      {/* Production Performance Panel */}
      <Panel title="Production Summary" subtitle="Total yield recorded in this reporting period">
        <div className="kf-stat-grid">
          <StatCard
            label="Eggs Collected"
            value={eggsLine ? formatNumber(eggsLine.total) : "0"}
            hint={eggsLine ? `${eggsLine.recordCount} entries · ${eggsLine.unit}` : "No egg logs"}
            image="/images/farm/eggs.webp"
            imageAlt="Eggs Collected"
            layout="image-right"
            tone="amber"
          />
          <StatCard
            label="Milk Produced"
            value={milkLine ? `${formatNumber(milkLine.total)} L` : "0 L"}
            hint={milkLine ? `${milkLine.recordCount} entries · ${milkLine.unit}` : "No milk logs"}
            image="/images/farm/milk-can.webp"
            imageAlt="Milk Produced"
            layout="image-right"
            tone="blue"
          />
        </div>
      </Panel>

      {/* Herd & Flock Population Performance */}
      <Panel title="Flock & Herd Status" subtitle="Current living inventory and mortality rates">
        <div className="kf-stat-grid">
          <StatCard
            label="Poultry Population"
            value={formatNumber(summary?.population.poultry.currentBirds ?? 0)}
            hint={`Initial: ${formatNumber(summary?.population.poultry.initialBirds ?? 0)}`}
            image="/images/farm/chicken.webp"
            imageAlt="Poultry Population"
            layout="image-right"
            tone="forest"
          />
          <StatCard
            label="Poultry Mortality Rate"
            value={`${percent(lossPercent)}`}
            hint={`${formatNumber(summary?.population.poultry.totalLosses ?? 0)} birds lost`}
            image="/images/farm/operating-loss.webp"
            imageAlt="Poultry Mortality"
            layout="image-right"
            tone={lossPercent > 5 ? "red" : "green"}
          />
          <StatCard
            label="Cattle Herd"
            value={formatNumber(summary?.population.livestock.animalCount ?? 0)}
            hint={`${formatNumber(summary?.population.livestock.cowsCount ?? 0)} cows · ${formatNumber(summary?.population.livestock.calvesCount ?? 0)} calves`}
            image="/images/farm/cow.webp"
            imageAlt="Cattle Herd"
            layout="image-right"
            tone="blue"
          />
        </div>
      </Panel>

      {/* Feed Performance */}
      <Panel title="Feed Utilization" subtitle="Total feed supplied to poultry and cattle">
        <div className="kf-stat-grid">
          <StatCard
            label="Feed (kg)"
            value={kgFeed ? `${formatNumber(kgFeed.total)} kg` : "0 kg"}
            hint={kgFeed ? `${kgFeed.recordCount} feedings logged` : "No kg entries"}
            image="/images/farm/animal-feed.webp"
            imageAlt="Feed in kg"
            layout="image-right"
            tone="forest"
          />
          <StatCard
            label="Feed (bags)"
            value={bagsFeed ? `${formatNumber(bagsFeed.total)} bags` : "0 bags"}
            hint={bagsFeed ? `${bagsFeed.recordCount} feedings logged` : "No bag entries"}
            image="/images/farm/animal-feed.webp"
            imageAlt="Feed in bags"
            layout="image-right"
            tone="amber"
          />
        </div>
      </Panel>
    </main>
  );
}
