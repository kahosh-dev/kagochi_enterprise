import { useEffect, useMemo, useState } from "react";
import {
  loadExpenses,
  addExpense,
  updateExpense,
  deleteExpense,
  loadIncome,
  addIncome,
  updateIncome,
  deleteIncome,
} from "../services/storage";
import type { ExpenseRecord, IncomeRecord } from "../types/farm";
import {
  Wallet,
  TrendingDown,
  TrendingUp,
  Pencil,
  Trash2,
  Plus,
} from "lucide-react";
import {
  PageHeader,
  StatCard,
  Panel,
  Field,
  Button,
  IconButton,
  EmptyState,
  ErrorBanner,
  Notice,
  Segmented,
  Modal,
  CssBar,
  Badge,
} from "../components/ui";
import { BarChart, LineChart, type ChartPoint } from "../components/Chart";
import DatePeriodFilter from "../components/DatePeriodFilter";
import {
  calculateComparison,
  formatDisplayDate,
  getLocalDateString,
  isRecordInDateRange,
  addDaysToDateStr,
} from "../utils/datePeriod";
import { formatCurrency } from "../utils/format";
import { usePeriod } from "../context/PeriodContext";

type ViewSection = "summary" | "income" | "expense";

const INCOME_CATEGORIES = [
  "Egg Sales",
  "Broiler Sales",
  "Culled Birds",
  "Milk Sales",
  "Cattle Sales",
  "Manure / Fertilizer",
  "Crop Sales",
  "Consulting / Other",
];

const EXPENSE_CATEGORIES = [
  "Poultry Feed",
  "Cattle Feed",
  "Chicks & Livestock Purchase",
  "Vaccines & Medication",
  "Veterinary Services",
  "Bedding & Litter",
  "Farm Equipment & Maintenance",
  "Labor & Wages",
  "Utilities (Water / Power)",
  "Transport & Logistics",
  "Packaging & Trays",
  "General Operations",
];

export default function ExpensesView() {
  const [activeSection, setActiveSection] = useState<ViewSection>("summary");
  const [activeTab, setActiveTab] = useState<"income" | "expense">("expense");
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [incomes, setIncomes] = useState<IncomeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; desc: string; type: "income" | "expense" } | null>(null);

  // Shared period state
  const {
    mode: periodMode,
    offset: periodOffset,
    customFrom,
    customTo,
    periodInfo,
    setMode: setPeriodMode,
    setOffset: setPeriodOffset,
    setCustomRange,
    resetPeriod,
  } = usePeriod();

  // Form fields
  const todayStr = getLocalDateString();
  const [category, setCategory] = useState("Poultry Feed");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [date, setDate] = useState(todayStr);

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  async function refreshData() {
    try {
      setLoading(true);
      const [expData, incData] = await Promise.all([loadExpenses(), loadIncome()]);
      setExpenses(expData);
      setIncomes(incData);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : "Failed to load financial records.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshData();
  }, []);

  // Filter records within current period
  const currentPeriodIncomes = useMemo(() => {
    return incomes.filter((i) => isRecordInDateRange(i.date, periodInfo.from, periodInfo.to));
  }, [incomes, periodInfo.from, periodInfo.to]);

  const currentPeriodExpenses = useMemo(() => {
    return expenses.filter((e) => isRecordInDateRange(e.date, periodInfo.from, periodInfo.to));
  }, [expenses, periodInfo.from, periodInfo.to]);

  // Filter records within previous period for trend comparisons
  const previousPeriodIncomes = useMemo(() => {
    return incomes.filter((i) => isRecordInDateRange(i.date, periodInfo.previousFrom, periodInfo.previousTo));
  }, [incomes, periodInfo.previousFrom, periodInfo.previousTo]);

  const previousPeriodExpenses = useMemo(() => {
    return expenses.filter((e) => isRecordInDateRange(e.date, periodInfo.previousFrom, periodInfo.previousTo));
  }, [expenses, periodInfo.previousFrom, periodInfo.previousTo]);

  // Financial calculations for the selected period
  const periodIncome = useMemo(() => {
    return currentPeriodIncomes.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  }, [currentPeriodIncomes]);

  const periodExpense = useMemo(() => {
    return currentPeriodExpenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  }, [currentPeriodExpenses]);

  // Net Farm Income = Total Income - Total Expenses
  const periodNetIncome = periodIncome - periodExpense;
  const isProfitable = periodNetIncome >= 0;

  // Previous period financial totals
  const prevPeriodIncome = useMemo(() => {
    return previousPeriodIncomes.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  }, [previousPeriodIncomes]);

  const prevPeriodExpense = useMemo(() => {
    return previousPeriodExpenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  }, [previousPeriodExpenses]);

  const prevPeriodNetIncome = prevPeriodIncome - prevPeriodExpense;

  // Comparisons
  const incomeComparison = useMemo(() => {
    return calculateComparison(periodIncome, prevPeriodIncome);
  }, [periodIncome, prevPeriodIncome]);

  const expenseComparison = useMemo(() => {
    return calculateComparison(periodExpense, prevPeriodExpense);
  }, [periodExpense, prevPeriodExpense]);

  const netComparison = useMemo(() => {
    return calculateComparison(periodNetIncome, prevPeriodNetIncome);
  }, [periodNetIncome, prevPeriodNetIncome]);

  // Category breakdowns for selected period
  const expenseByCategory = useMemo(() => {
    const map = currentPeriodExpenses.reduce<Record<string, number>>((acc, e) => {
      acc[e.category] = (acc[e.category] ?? 0) + Number(e.amount);
      return acc;
    }, {});
    return Object.entries(map)
      .map(([cat, total]) => ({ category: cat, total }))
      .sort((a, b) => b.total - a.total);
  }, [currentPeriodExpenses]);

  const incomeByCategory = useMemo(() => {
    const map = currentPeriodIncomes.reduce<Record<string, number>>((acc, i) => {
      acc[i.category] = (acc[i.category] ?? 0) + Number(i.amount);
      return acc;
    }, {});
    return Object.entries(map)
      .map(([cat, total]) => ({ category: cat, total }))
      .sort((a, b) => b.total - a.total);
  }, [currentPeriodIncomes]);

  const maxExpense = useMemo(
    () => Math.max(...expenseByCategory.map((c) => c.total), 1),
    [expenseByCategory]
  );
  const maxIncome = useMemo(
    () => Math.max(...incomeByCategory.map((c) => c.total), 1),
    [incomeByCategory]
  );

  // Income by product (from unit and category)
  const incomeByProduct = useMemo(() => {
    const map = new Map<string, { product: string; totalAmount: number; totalQuantity: number; unit: string; count: number }>();
    currentPeriodIncomes.forEach((i) => {
      const prod = i.category;
      const key = `${prod}|${i.unit || ""}`;
      const entry = map.get(key) || { product: prod, totalAmount: 0, totalQuantity: 0, unit: i.unit || "", count: 0 };
      entry.totalAmount += Number(i.amount || 0);
      entry.totalQuantity += Number(i.quantity || 0);
      entry.count++;
      map.set(key, entry);
    });
    return Array.from(map.values()).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [currentPeriodIncomes]);

  // Chart data: Net income / cashflow over time for period
  const chartData = useMemo<ChartPoint[]>(() => {
    if (currentPeriodIncomes.length === 0 && currentPeriodExpenses.length === 0) return [];

    if (periodMode === "year") {
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const year = periodInfo.from.slice(0, 4);
      return months.map((m, idx) => {
        const prefix = `${year}-${String(idx + 1).padStart(2, "0")}`;
        const inc = currentPeriodIncomes.filter((i) => i.date.startsWith(prefix)).reduce((s, i) => s + Number(i.amount), 0);
        const exp = currentPeriodExpenses.filter((e) => e.date.startsWith(prefix)).reduce((s, e) => s + Number(e.amount), 0);
        return {
          label: m,
          value: inc - exp,
          tone: inc - exp >= 0 ? "green" : "red",
        };
      });
    }

    const dateSet = new Set<string>();
    currentPeriodIncomes.forEach((i) => dateSet.add(i.date ? i.date.slice(0, 10) : ""));
    currentPeriodExpenses.forEach((e) => dateSet.add(e.date ? e.date.slice(0, 10) : ""));
    dateSet.delete("");

    return Array.from(dateSet)
      .sort((a, b) => a.localeCompare(b))
      .map((d) => {
        const inc = currentPeriodIncomes.filter((i) => (i.date || "").slice(0, 10) === d).reduce((s, i) => s + Number(i.amount), 0);
        const exp = currentPeriodExpenses.filter((e) => (e.date || "").slice(0, 10) === d).reduce((s, e) => s + Number(e.amount), 0);
        const net = inc - exp;
        return {
          label: d.slice(5),
          value: net,
          tone: net >= 0 ? "green" : "red",
        };
      });
  }, [currentPeriodIncomes, currentPeriodExpenses, periodMode, periodInfo.from]);

  // Last 7 days net comparison for Today context
  const last7DaysNetPoints = useMemo<ChartPoint[]>(() => {
    const today = periodInfo.to;
    const points: ChartPoint[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = addDaysToDateStr(today, -i);
      const inc = incomes.filter((item) => (item.date || "").slice(0, 10) === d).reduce((s, item) => s + Number(item.amount || 0), 0);
      const exp = expenses.filter((item) => (item.date || "").slice(0, 10) === d).reduce((s, item) => s + Number(item.amount || 0), 0);
      const net = inc - exp;
      points.push({
        label: i === 0 ? "Today" : d.slice(5),
        value: net,
        tone: net >= 0 ? "green" : "red",
      });
    }
    return points;
  }, [incomes, expenses, periodInfo.to]);

  function resetForm() {
    setEditingId(null);
    setDescription("");
    setAmount("");
    setQuantity("");
    setUnit("");
    setDate(getLocalDateString());
    setCategory(activeTab === "income" ? "Egg Sales" : "Poultry Feed");
    setErrorMsg("");
  }

  function startEdit(item: ExpenseRecord | IncomeRecord, type: "income" | "expense") {
    setActiveTab(type);
    setActiveSection(type);
    setEditingId(item.id);
    setCategory(item.category);
    setDescription(item.description);
    setAmount(String(item.amount));
    setDate(item.date ? item.date.slice(0, 10) : getLocalDateString());
    const inc = item as IncomeRecord;
    setQuantity(inc.quantity ? String(inc.quantity) : "");
    setUnit(inc.unit || "");
    window.scrollTo({ top: 480, behavior: "smooth" });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const amt = parseFloat(amount);
    if (!description.trim()) {
      setErrorMsg("Please enter a description or note.");
      return;
    }
    if (isNaN(amt) || amt <= 0) {
      setErrorMsg("Please enter a valid amount in KES.");
      return;
    }
    if (!date) {
      setErrorMsg("Please select a transaction date.");
      return;
    }

    try {
      setSaving(true);
      if (activeTab === "income") {
        const payload = {
          category,
          description: description.trim(),
          amount: amt,
          date,
          quantity: parseFloat(quantity) || 0,
          unit: unit.trim(),
        };
        if (editingId) {
          await updateIncome(editingId, payload);
          setSuccessMsg("Income record updated.");
        } else {
          await addIncome(payload);
          setSuccessMsg(`Income recorded: KES ${amt.toLocaleString()} (${category}).`);
        }
      } else {
        const payload = {
          category,
          description: description.trim(),
          amount: amt,
          date,
        };
        if (editingId) {
          await updateExpense(editingId, payload);
          setSuccessMsg("Expense record updated.");
        } else {
          await addExpense(payload);
          setSuccessMsg(`Expense recorded: KES ${amt.toLocaleString()} (${category}).`);
        }
      }
      await refreshData();
      resetForm();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to save record.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === "income") await deleteIncome(deleteTarget.id);
      else await deleteExpense(deleteTarget.id);
      setSuccessMsg("Record deleted.");
      setDeleteTarget(null);
      await refreshData();
    } catch (err) {
      setErrorMsg("Failed to delete record.");
      setDeleteTarget(null);
    }
  }

  return (
    <main className="kf-page">
      <PageHeader
        title="Income & Expenses"
        description="Daily, weekly, monthly and yearly tracking of farm sales, operating costs, and net farm income."
        actions={
          <div style={{ display: "flex", gap: "8px" }}>
            <Button
              icon={<Plus size={16} />}
              onClick={() => {
                setActiveTab("income");
                setCategory("Egg Sales");
                resetForm();
                window.scrollTo({ top: 480, behavior: "smooth" });
              }}
            >
              Record Income
            </Button>
            <Button
              variant="secondary"
              icon={<Plus size={16} />}
              onClick={() => {
                setActiveTab("expense");
                setCategory("Poultry Feed");
                resetForm();
                window.scrollTo({ top: 480, behavior: "smooth" });
              }}
            >
              Record Expense
            </Button>
          </div>
        }
      />

      <div className="kf-stack">
        {/* Date Period Filter */}
        <DatePeriodFilter
          mode={periodMode}
          offset={periodOffset}
          customFrom={customFrom}
          customTo={customTo}
          periodInfo={periodInfo}
          onModeChange={(m) => {
            setPeriodMode(m);
            setPeriodOffset(0);
          }}
          onOffsetChange={setPeriodOffset}
          onCustomRangeChange={(f, t) => {
            setCustomFrom(f);
            setCustomTo(t);
          }}
          onReset={() => {
            setPeriodOffset(0);
          }}
          title="Financial Period"
        />

        {/* Financial KPI Stats Grid */}
        <div className="kf-grid kf-grid--stats">
          <StatCard
            label="Money Received"
            value={formatCurrency(periodIncome)}
            hint={
              incomeComparison.percentChange !== null
                ? `${incomeComparison.text} (${formatCurrency(prevPeriodIncome)})`
                : `${currentPeriodIncomes.length} sales entries in period`
            }
            image="/images/farm/farm-income.webp"
            imageAlt="Money Received"
            layout="image-right"
            tone="green"
            onClick={() => setActiveSection("income")}
          />

          <StatCard
            label="Money Spent"
            value={formatCurrency(periodExpense)}
            hint={
              expenseComparison.percentChange !== null
                ? `${expenseComparison.text} (${formatCurrency(prevPeriodExpense)})`
                : `${currentPeriodExpenses.length} expense entries in period`
            }
            image="/images/farm/farm-expenses.webp"
            imageAlt="Money Spent"
            layout="image-right"
            tone="red"
            onClick={() => setActiveSection("expense")}
          />

          <StatCard
            label="Money Remaining"
            value={`${isProfitable ? "+" : ""}${formatCurrency(periodNetIncome)}`}
            hint={
              isProfitable
                ? "Net Farm Profit (Income − Expenses)"
                : "Operating Deficit (Expenses exceed income)"
            }
            image={isProfitable ? "/images/farm/farm-income.webp" : "/images/farm/operating-loss.webp"}
            imageAlt={isProfitable ? "Operating Profit" : "Operating Loss"}
            layout="image-right"
            tone={isProfitable ? "green" : "red"}
            onClick={() => setActiveSection("summary")}
          />

          <StatCard
            label="Net Comparison"
            value={netComparison.percentChange !== null ? netComparison.text : (isProfitable ? "Profitable" : "Loss")}
            hint={`Previous period net: ${formatCurrency(prevPeriodNetIncome)}`}
            icon={isProfitable ? <TrendingUp size={20} strokeWidth={1.5} /> : <TrendingDown size={20} strokeWidth={1.5} />}
            tone={isProfitable ? "forest" : "amber"}
          />
        </div>

        {/* Section View Tabs */}
        <Segmented
          label="View financial section"
          options={[
            { value: "summary", label: "Financial Summary & Trends" },
            { value: "income", label: `Money In / Income (${currentPeriodIncomes.length})` },
            { value: "expense", label: `Money Out / Expenses (${currentPeriodExpenses.length})` },
          ]}
          value={activeSection}
          onChange={(v) => setActiveSection(v as ViewSection)}
        />

        {/* Section 1: Financial Summary & Trend Chart */}
        {activeSection === "summary" && (
          <>
            <Panel
              title={`Net Income Trend (${periodInfo.label})`}
              subtitle={`Cash flow performance and category distribution for ${periodInfo.label}.`}
            >
              <div style={{ padding: "8px 0" }}>
                {periodInfo.daysCount === 1 ? (
                  currentPeriodIncomes.length === 0 && currentPeriodExpenses.length === 0 ? (
                    <div>
                      <EmptyState
                        title={`No transactions recorded yet for ${periodInfo.label}`}
                        description="No sales or expense items have been logged for today. Use the buttons above to record today's income or expenses."
                      />
                      <div style={{ marginTop: "16px", borderTop: "1px solid var(--kf-border, #e2e8f0)", paddingTop: "14px" }}>
                        <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--kf-text, #1e293b)", marginBottom: "8px" }}>
                          Recent 7-Day Net Cash Flow Trend (KES)
                        </div>
                        <LineChart
                          data={last7DaysNetPoints}
                          height={180}
                          valueSuffix=" KES"
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                        gap: "12px",
                        marginBottom: "16px",
                      }}>
                        <div style={{
                          padding: "12px 14px",
                          borderRadius: "10px",
                          background: "var(--kf-surface-alt, #f8fafc)",
                          border: "1px solid var(--kf-border, #e2e8f0)",
                        }}>
                          <div style={{ fontSize: "12px", color: "var(--kf-text-muted)" }}>Total Inflow (Today)</div>
                          <div style={{ fontSize: "18px", fontWeight: 700, color: "var(--kf-primary, #15803d)" }}>
                            +{formatCurrency(periodIncome)}
                          </div>
                          <div style={{ fontSize: "11px", color: "var(--kf-text-muted)" }}>{currentPeriodIncomes.length} sales</div>
                        </div>

                        <div style={{
                          padding: "12px 14px",
                          borderRadius: "10px",
                          background: "var(--kf-surface-alt, #f8fafc)",
                          border: "1px solid var(--kf-border, #e2e8f0)",
                        }}>
                          <div style={{ fontSize: "12px", color: "var(--kf-text-muted)" }}>Total Outflow (Today)</div>
                          <div style={{ fontSize: "18px", fontWeight: 700, color: "#dc2626" }}>
                            -{formatCurrency(periodExpense)}
                          </div>
                          <div style={{ fontSize: "11px", color: "var(--kf-text-muted)" }}>{currentPeriodExpenses.length} expenses</div>
                        </div>

                        <div style={{
                          padding: "12px 14px",
                          borderRadius: "10px",
                          background: "var(--kf-surface-alt, #f8fafc)",
                          border: "1px solid var(--kf-border, #e2e8f0)",
                        }}>
                          <div style={{ fontSize: "12px", color: "var(--kf-text-muted)" }}>Net Margin (Today)</div>
                          <div style={{
                            fontSize: "18px",
                            fontWeight: 700,
                            color: periodNet >= 0 ? "var(--kf-primary, #15803d)" : "#dc2626",
                          }}>
                            {formatCurrency(periodNet)}
                          </div>
                          <div style={{ fontSize: "11px", color: "var(--kf-text-muted)" }}>
                            {periodNet >= 0 ? "Profitable day" : "Net operating deficit"}
                          </div>
                        </div>
                      </div>

                      <div style={{ marginTop: "14px", borderTop: "1px solid var(--kf-border, #e2e8f0)", paddingTop: "14px" }}>
                        <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--kf-text, #1e293b)", marginBottom: "8px" }}>
                          Recent 7-Day Net Cash Flow Trend (KES)
                        </div>
                        <LineChart
                          data={last7DaysNetPoints}
                          height={180}
                          valueSuffix=" KES"
                        />
                      </div>
                    </div>
                  )
                ) : chartData.length > 0 ? (
                  <BarChart
                    data={chartData}
                    height={210}
                    valueSuffix=" KES"
                    emptyLabel="No financial transactions recorded for this period."
                  />
                ) : (
                  <EmptyState
                    title={`No transactions recorded for ${periodInfo.label}`}
                    description="No sales or expense items found for this reporting period."
                  />
                )}
              </div>
            </Panel>

            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: "20px",
            }}>
              {/* Income breakdown */}
              <Panel
                title="Income by Category"
                subtitle={`${formatCurrency(periodIncome)} total sales for period`}
                actions={
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setActiveTab("income");
                      setActiveSection("income");
                    }}
                  >
                    View All Income
                  </Button>
                }
              >
                {incomeByCategory.length === 0 ? (
                  <EmptyState title="No income recorded" description="No sales entries recorded in this period." />
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {incomeByCategory.slice(0, 7).map((item) => (
                      <CssBar
                        key={item.category}
                        label={item.category}
                        value={item.total}
                        max={maxIncome}
                        formatted={`+${formatCurrency(item.total)}`}
                        tone="green"
                      />
                    ))}
                  </div>
                )}
              </Panel>

              {/* Expense breakdown */}
              <Panel
                title="Expenses by Category"
                subtitle={`${formatCurrency(periodExpense)} total operating costs`}
                actions={
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setActiveTab("expense");
                      setActiveSection("expense");
                    }}
                  >
                    View All Expenses
                  </Button>
                }
              >
                {expenseByCategory.length === 0 ? (
                  <EmptyState title="No expenses recorded" description="No expense entries recorded in this period." />
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {expenseByCategory.slice(0, 7).map((item) => (
                      <CssBar
                        key={item.category}
                        label={item.category}
                        value={item.total}
                        max={maxExpense}
                        formatted={`-${formatCurrency(item.total)}`}
                        tone="red"
                      />
                    ))}
                  </div>
                )}
              </Panel>
            </div>

            {/* Income by Product / Volume */}
            {incomeByProduct.length > 0 && (
              <Panel title="Sales Volume & Products" subtitle="Breakdown of physical sales units and revenue.">
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: "12px",
                }}>
                  {incomeByProduct.map((p, idx) => (
                    <div key={idx} style={{
                      padding: "12px 14px",
                      background: "var(--kf-cream, #f8fafc)",
                      borderRadius: "10px",
                      border: "1px solid var(--kf-border, #e2e8f0)",
                    }}>
                      <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--kf-text)" }}>
                        {p.product}
                      </div>
                      <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--kf-green-600, #16a34a)", marginTop: "4px" }}>
                        +{formatCurrency(p.totalAmount)}
                      </div>
                      {p.totalQuantity > 0 && (
                        <div style={{ fontSize: "12px", color: "var(--kf-text-muted)", marginTop: "2px" }}>
                          Volume: {p.totalQuantity.toLocaleString()} {p.unit}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Panel>
            )}
          </>
        )}

        {/* Add / Edit Form Panel */}
        <Panel
          title={
            editingId
              ? `Edit ${activeTab === "income" ? "Income" : "Expense"} Entry`
              : activeTab === "income"
              ? "Record Farm Income (Money In)"
              : "Record Farm Expense (Money Out)"
          }
          subtitle={
            activeTab === "income"
              ? "Log product sales, egg collections, milk deliveries, or animal sales in KES."
              : "Log feed purchases, veterinary medication, labor wages, or farm maintenance in KES."
          }
          actions={
            <div style={{ display: "flex", gap: "6px" }}>
              <Button
                variant={activeTab === "income" ? "primary" : "secondary"}
                onClick={() => {
                  setActiveTab("income");
                  setCategory("Egg Sales");
                }}
              >
                Money In
              </Button>
              <Button
                variant={activeTab === "expense" ? "primary" : "secondary"}
                onClick={() => {
                  setActiveTab("expense");
                  setCategory("Poultry Feed");
                }}
              >
                Money Out
              </Button>
            </div>
          }
        >
          {errorMsg && <ErrorBanner message={errorMsg} />}
          {successMsg && <Notice tone="success">{successMsg}</Notice>}

          <form onSubmit={handleSubmit} className="kf-form">
            <div className="kf-form-grid">
              <Field label="Category" required>
                <select
                  className="kf-input"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {(activeTab === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Amount in KES" required>
                <input
                  type="number"
                  className="kf-input"
                  min="0"
                  step="0.01"
                  placeholder="e.g. 4500"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </Field>

              <Field label="Transaction Date" required>
                <input
                  type="date"
                  className="kf-input"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </Field>

              {activeTab === "income" && (
                <>
                  <Field label="Quantity (Optional)" hint="e.g. trays, litres, birds">
                    <input
                      type="number"
                      className="kf-input"
                      placeholder="e.g. 25"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                    />
                  </Field>
                  <Field label="Unit (Optional)">
                    <input
                      type="text"
                      className="kf-input"
                      placeholder="e.g. trays, litres, pcs"
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                    />
                  </Field>
                </>
              )}
            </div>

            <Field label="Description / Notes" required className="kf-field--full">
              <input
                type="text"
                className="kf-input"
                placeholder={
                  activeTab === "income"
                    ? "e.g. Sold 25 trays of Grade A eggs to local bakery"
                    : "e.g. Bought 2 bags of layers mash from Unga Farm Care"
                }
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </Field>

            <div className="kf-form-actions">
              {editingId && (
                <Button variant="secondary" type="button" onClick={resetForm}>
                  Cancel Edit
                </Button>
              )}
              <Button type="submit" variant="primary" loading={saving}>
                <span>
                  {saving
                    ? "Saving…"
                    : editingId
                    ? "Update Record"
                    : activeTab === "income"
                    ? "Save Income"
                    : "Save Expense"}
                </span>
              </Button>
            </div>
          </form>
        </Panel>

        {/* Section 2: Individual Income Records Table */}
        {(activeSection === "income" || activeSection === "summary") && (
          <Panel
            title={`Money In / Income Records (${currentPeriodIncomes.length})`}
            subtitle={`Recorded income for ${periodInfo.label}.`}
          >
            {loading ? (
              <EmptyState title="Loading income records…" />
            ) : currentPeriodIncomes.length === 0 ? (
              <EmptyState
                icon={<Wallet size={36} />}
                title="No income recorded for this period"
                description={`No income entries found between ${periodInfo.from} and ${periodInfo.to}. Add a sales entry above.`}
              />
            ) : (
              <div className="kf-table-wrap">
                <table className="kf-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Category</th>
                      <th>Description</th>
                      <th>Qty / Unit</th>
                      <th>Amount KES</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentPeriodIncomes.map((inc) => (
                      <tr key={inc.id}>
                        <td>
                          <strong>{formatDisplayDate(inc.date, false)}</strong>
                        </td>
                        <td>
                          <Badge tone="green">{inc.category}</Badge>
                        </td>
                        <td>{inc.description}</td>
                        <td>{inc.quantity ? `${inc.quantity} ${inc.unit || ""}` : "—"}</td>
                        <td>
                          <strong style={{ color: "var(--kf-green-600, #16a34a)", fontSize: "14px" }}>
                            +{formatCurrency(inc.amount)}
                          </strong>
                        </td>
                        <td>
                          <div className="kf-row-actions">
                            <IconButton
                              label="Edit"
                              icon={<Pencil size={15} />}
                              onClick={() => startEdit(inc, "income")}
                            />
                            <IconButton
                              label="Delete"
                              icon={<Trash2 size={15} />}
                              onClick={() =>
                                setDeleteTarget({ id: inc.id, desc: inc.description, type: "income" })
                              }
                              tone="danger"
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        )}

        {/* Section 3: Individual Expense Records Table */}
        {(activeSection === "expense" || activeSection === "summary") && (
          <Panel
            title={`Money Out / Expense Records (${currentPeriodExpenses.length})`}
            subtitle={`Recorded expenses for ${periodInfo.label}.`}
          >
            {loading ? (
              <EmptyState title="Loading expense records…" />
            ) : currentPeriodExpenses.length === 0 ? (
              <EmptyState
                icon={<TrendingDown size={36} />}
                title="No expenses recorded for this period"
                description={`No expense entries found between ${periodInfo.from} and ${periodInfo.to}. Add an expense above.`}
              />
            ) : (
              <div className="kf-table-wrap">
                <table className="kf-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Category</th>
                      <th>Description</th>
                      <th>Amount KES</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentPeriodExpenses.map((exp) => (
                      <tr key={exp.id}>
                        <td>
                          <strong>{formatDisplayDate(exp.date, false)}</strong>
                        </td>
                        <td>
                          <Badge tone="slate">{exp.category}</Badge>
                        </td>
                        <td>{exp.description}</td>
                        <td>
                          <strong style={{ color: "var(--kf-red, #dc2626)", fontSize: "14px" }}>
                            -{formatCurrency(exp.amount)}
                          </strong>
                        </td>
                        <td>
                          <div className="kf-row-actions">
                            <IconButton
                              label="Edit"
                              icon={<Pencil size={15} />}
                              onClick={() => startEdit(exp, "expense")}
                            />
                            <IconButton
                              label="Delete"
                              icon={<Trash2 size={15} />}
                              onClick={() =>
                                setDeleteTarget({ id: exp.id, desc: exp.description, type: "expense" })
                              }
                              tone="danger"
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete record?"
        size="sm"
        footer={
          <div className="kf-modal-footer-actions">
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDelete}>
              Delete
            </Button>
          </div>
        }
      >
        <p>
          Delete <strong>"{deleteTarget?.desc}"</strong>? This action cannot be undone.
        </p>
      </Modal>
    </main>
  );
}
