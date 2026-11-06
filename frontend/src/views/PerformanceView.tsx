import { useEffect, useState } from "react";
import { loadFarmSummary } from "../services/storage";
import type { FarmSummaryData } from "../types/farm";
import { TrendingUp, TrendingDown, Coins, Calendar, Download, Bird, Beef, Egg } from "lucide-react";
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
    const csvContent =
      "data:text/csv;charset=utf-8," + rows.map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `kagochi_pnl_${summary.period.from}_${summary.period.to}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <main className="kf-page">
      <PageHeader
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
            <Calendar size={14} /> From
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
          icon={<Coins size={20} />}
          tone="green"
        />
        <StatCard
          label="Operating Expenses"
          value={formatCurrency(totalExpenses)}
          hint={
            summary?.expenses.changePercent != null
              ? `${summary.expenses.changePercent >= 0 ? "+" : ""}${summary.expenses.changePercent}% vs prev`
              : "Operating costs in period"
          }
          icon={<TrendingDown size={20} />}
          tone="red"
        />
        <StatCard
          label={isProfitable ? "Operating Profit" : "Operating Loss"}
          value={`${isProfitable ? "+" : ""}${formatCurrency(profitOrLoss)}`}
          hint={netMargin != null ? `Margin: ${netMargin}%` : "Income minus costs"}
          icon={isProfitable ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
          tone={isProfitable ? "green" : "red"}
        />
      </div>

      {/* Income by category */}
      <Panel
        title="Income breakdown"
        subtitle="Top income sources this period"
      >
        {incomeCategories.length === 0 ? (
          <EmptyState compact title="No income recorded" description="No income in this period." />
        ) : (
          <div className="kf-bar-chart">
            {incomeCategories.map((c) => (
              <CssBar
                key={c.category}
                label={c.category}
                value={c.total}
                max={maxIncome}
                formatted={formatCurrency(c.total)}
                tone="green"
              />
            ))}
          </div>
        )}
      </Panel>

      {/* Expense by category */}
      <Panel
        title="Expense breakdown"
        subtitle="Where your money was spent this period"
      >
        {expenseCategories.length === 0 ? (
          <EmptyState compact title="No expenses recorded" description="No expenses in this period." />
        ) : (
          <div className="kf-bar-chart">
            {expenseCategories.map((c) => (
              <CssBar
                key={c.category}
                label={c.category}
                value={c.total}
                max={maxExpense}
                formatted={formatCurrency(c.total)}
                tone="red"
              />
            ))}
          </div>
        )}
      </Panel>

      {/* Population */}
      <Panel title="Current population">
        <div className="kf-stat-grid">
          <StatCard
            label="Poultry (birds)"
            value={formatNumber(summary?.population.poultry.currentBirds ?? 0)}
            hint="Active birds"
            icon={<Bird size={20} />}
            tone="green"
          />
          <StatCard
            label="Livestock (animals)"
            value={formatNumber(summary?.population.livestock.animalCount ?? 0)}
            hint="Active animals"
            icon={<Beef size={20} />}
            tone="forest"
          />
        </div>
      </Panel>

      {/* Mortality rate */}
      <Panel title="Mortality rate">
        <div className="kf-bar-chart">
          <CssBar
            label="Bird mortality"
            value={lossPercent ?? 0}
            max={100}
            formatted={percent(lossPercent)}
            tone={lossPercent > 5 ? "red" : "amber"}
          />
        </div>
      </Panel>

      {/* Production */}
      <Panel title="Production">
        <div className="kf-stat-grid">
          <StatCard
            label="Eggs produced"
            value={formatNumber(summary?.production.eggsProduced ?? 0)}
            hint="In period"
            icon={<Egg size={20} />}
            tone="amber"
            trend={
              eggsLine?.changePercent != null
                ? {
                    value: `${Math.abs(eggsLine.changePercent)}% vs prev`,
                    direction:
                      eggsLine.changePercent > 0
                        ? "up"
                        : eggsLine.changePercent < 0
                        ? "down"
                        : "flat",
                  }
                : undefined
            }
          />
          <StatCard
            label="Milk produced (L)"
            value={formatNumber(summary?.production.milkProduced ?? 0)}
            hint="In period"
            icon={<Coins size={20} />}
            tone="blue"
            trend={
              milkLine?.changePercent != null
                ? {
                    value: `${Math.abs(milkLine.changePercent)}% vs prev`,
                    direction:
                      milkLine.changePercent > 0
                        ? "up"
                        : milkLine.changePercent < 0
                        ? "down"
                        : "flat",
                  }
                : undefined
            }
          />
        </div>
      </Panel>

      {/* Feed */}
      <Panel title="Feed consumption">
        <div className="kf-stat-grid">
          <StatCard
            label="Feed (kg)"
            value={formatNumber(kgFeed?.total ?? 0)}
            hint="Kilograms fed"
            icon={<Coins size={20} />}
            tone="slate"
          />
          <StatCard
            label="Feed (bags)"
            value={formatNumber(bagsFeed?.total ?? 0)}
            hint="Bags used"
            icon={<Coins size={20} />}
            tone="slate"
          />
        </div>
      </Panel>
    </main>
  );
}
