import React, { useEffect, useState } from "react";
import { loadFarmSummary } from "../services/storage";
import type { FarmSummaryData } from "../types/farm";
import {
  TrendingUp,
  TrendingDown,
  Coins,
  Calendar,
  Filter,
  Download,
  AlertCircle,
  CheckCircle2,
  PieChart,
  BarChart3,
  Egg,
  Milk,
} from "lucide-react";

type ReportPeriodKey = "daily" | "weekly" | "monthly" | "quarterly" | "annual" | "custom";

export default function PerformanceView() {
  const [periodKey, setPeriodKey] = useState<ReportPeriodKey>("monthly");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [summary, setSummary] = useState<FarmSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const todayStr = new Date().toISOString().slice(0, 10);

  function getQueryParams(key: ReportPeriodKey) {
    if (key === "daily") {
      return { days: 1, to: todayStr, from: todayStr };
    }
    if (key === "weekly") {
      return { days: 7, to: todayStr };
    }
    if (key === "monthly") {
      const startOfMonth = `${todayStr.slice(0, 7)}-01`;
      return { to: todayStr, from: startOfMonth };
    }
    if (key === "quarterly") {
      return { days: 90, to: todayStr };
    }
    if (key === "annual") {
      const startOfYear = `${todayStr.slice(0, 4)}-01-01`;
      return { to: todayStr, from: startOfYear };
    }
    if (key === "custom" && customFrom && customTo) {
      return { from: customFrom, to: customTo };
    }
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
      console.error(err);
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

  const prevPnl = summary?.financial.previousOperatingProfitOrLoss ?? 0;
  const pnlChange = profitOrLoss - prevPnl;

  const incomeCategories = summary?.income.byCategory ?? [];
  const expenseCategories = summary?.expenses.byCategory ?? [];

  // Export to CSV
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
    link.setAttribute("download", `kagochi_pnl_${summary.period.from}_${summary.period.to}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="view-container">
      {/* View Header */}
      <div className="view-header-row">
        <div>
          <h2>Farm Profit & Loss Report</h2>
          <p className="view-subtitle">
            Actual daily, weekly, monthly, and yearly operating financial statements for Kagochi Farm.
          </p>
        </div>
        <button type="button" className="btn-secondary" onClick={exportCSV} disabled={!summary}>
          <Download size={16} /> Export Statement (CSV)
        </button>
      </div>

      {/* Period Selection Tabs */}
      <div className="dashboard-filter-bar" style={{ marginBottom: 24 }}>
        <div className="filter-chips">
          <span className="filter-label">
            <Calendar size={15} /> Period:
          </span>
          <button
            className={`filter-chip ${periodKey === "daily" ? "active" : ""}`}
            onClick={() => setPeriodKey("daily")}
          >
            Daily (Today)
          </button>
          <button
            className={`filter-chip ${periodKey === "weekly" ? "active" : ""}`}
            onClick={() => setPeriodKey("weekly")}
          >
            Weekly (7 Days)
          </button>
          <button
            className={`filter-chip ${periodKey === "monthly" ? "active" : ""}`}
            onClick={() => setPeriodKey("monthly")}
          >
            Month-to-Date
          </button>
          <button
            className={`filter-chip ${periodKey === "quarterly" ? "active" : ""}`}
            onClick={() => setPeriodKey("quarterly")}
          >
            Quarterly (90 Days)
          </button>
          <button
            className={`filter-chip ${periodKey === "annual" ? "active" : ""}`}
            onClick={() => setPeriodKey("annual")}
          >
            Year-to-Date
          </button>
          <button
            className={`filter-chip ${periodKey === "custom" ? "active" : ""}`}
            onClick={() => setPeriodKey("custom")}
          >
            Custom Range
          </button>
        </div>

        {periodKey === "custom" && (
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
          <span>
            {summary ? `${summary.period.from} to ${summary.period.to} (${summary.period.days} day${summary.period.days > 1 ? "s" : ""})` : "Loading..."}
          </span>
        </div>
      </div>

      {errorMsg && <div className="daily-alert error-alert">{errorMsg}</div>}

      {/* Main P&L KPI Cards */}
      <div className="poultry-kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon-wrap" style={{ background: "#ecfdf5", color: "#059669" }}>
            <Coins size={26} />
          </div>
          <div>
            <span className="kpi-label">Gross Farm Income</span>
            <h3 className="kpi-value">KES {totalIncome.toLocaleString()}</h3>
            <span className="kpi-desc">
              {summary?.income.changePercent !== null && summary?.income.changePercent !== undefined
                ? `${summary.income.changePercent >= 0 ? "+" : ""}${summary.income.changePercent}% vs prev period`
                : "Realized sales in period"}
            </span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrap" style={{ background: "#fef2f2", color: "#dc2626" }}>
            <TrendingDown size={26} />
          </div>
          <div>
            <span className="kpi-label">Operating Expenses</span>
            <h3 className="kpi-value">KES {totalExpenses.toLocaleString()}</h3>
            <span className="kpi-desc">
              {summary?.expenses.changePercent !== null && summary?.expenses.changePercent !== undefined
                ? `${summary.expenses.changePercent >= 0 ? "+" : ""}${summary.expenses.changePercent}% vs prev period`
                : "Operating costs in period"}
            </span>
          </div>
        </div>

        <div className="kpi-card">
          <div
            className="kpi-icon-wrap"
            style={{
              background: isProfitable ? "#ecfdf5" : "#fef2f2",
              color: isProfitable ? "#059669" : "#dc2626",
            }}
          >
            {isProfitable ? <TrendingUp size={26} /> : <TrendingDown size={26} />}
          </div>
          <div>
            <span className="kpi-label">Operating Profit / (Loss)</span>
            <h3 className="kpi-value" style={{ color: isProfitable ? "#059669" : "#dc2626" }}>
              {isProfitable ? "+" : ""}KES {profitOrLoss.toLocaleString()}
            </h3>
            <span className="kpi-desc">
              {netMargin !== null && netMargin !== undefined ? `Margin: ${netMargin}%` : "Income minus operating costs"}
            </span>
          </div>
        </div>
      </div>

      {/* Cash Flow vs Accounting Profit explanation */}
      <div className="card-box" style={{ background: "#f8fafc", borderLeft: "4px solid #2563eb" }}>
        <h4 style={{ margin: "0 0 6px 0", color: "#1e293b", fontSize: 15 }}>
          💡 Farmer's Financial Distinction: Cashflow vs Profit
        </h4>
        <p style={{ margin: 0, fontSize: 13, color: "#475569", lineHeight: 1.5 }}>
          <strong>Cash Flow:</strong> Actual money received (KES {summary?.financial.cashReceived.toLocaleString() ?? 0}) minus actual money paid out (KES {summary?.financial.cashPaid.toLocaleString() ?? 0}).
          <br />
          <strong>Operating Profit:</strong> Shows whether your poultry and cattle operations are generating more revenue than what is spent to feed, house, and vaccinate them. Capital investments (such as acquiring breeding stock or housing) build your farm asset base.
        </p>
      </div>

      {/* Breakdown Grids: Top Incomes & Largest Expenses */}
      <div className="two-column-grid" style={{ marginTop: 24 }}>
        {/* Income Breakdown */}
        <div className="card-box">
          <div className="card-header-bar">
            <div>
              <h3 className="card-heading">Top Income Sources</h3>
              <p className="card-subheading">Breakdown of farm sales in this period.</p>
            </div>
            <Coins size={20} color="#059669" />
          </div>

          {incomeCategories.length === 0 ? (
            <div className="empty-state">
              <Coins size={36} />
              <p>No income recorded in this period.</p>
            </div>
          ) : (
            <div className="category-bars-list">
              {incomeCategories.map((c) => (
                <div key={c.category} className="cat-bar-item">
                  <div className="cat-bar-header">
                    <span className="cat-name">{c.category}</span>
                    <span className="cat-val">
                      KES {c.total.toLocaleString()} ({c.sharePercent ?? 0}%)
                    </span>
                  </div>
                  <div className="cat-bar-track">
                    <div
                      className="cat-bar-fill income-fill"
                      style={{ width: `${Math.min(100, c.sharePercent ?? 0)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Expense Breakdown */}
        <div className="card-box">
          <div className="card-header-bar">
            <div>
              <h3 className="card-heading">Largest Expense Categories</h3>
              <p className="card-subheading">Where your money was spent in this period.</p>
            </div>
            <TrendingDown size={20} color="#dc2626" />
          </div>

          {expenseCategories.length === 0 ? (
            <div className="empty-state">
              <TrendingDown size={36} />
              <p>No expenses recorded in this period.</p>
            </div>
          ) : (
            <div className="category-bars-list">
              {expenseCategories.map((c) => (
                <div key={c.category} className="cat-bar-item">
                  <div className="cat-bar-header">
                    <span className="cat-name">{c.category}</span>
                    <span className="cat-val">
                      KES {c.total.toLocaleString()} ({c.sharePercent ?? 0}%)
                    </span>
                  </div>
                  <div className="cat-bar-track">
                    <div
                      className="cat-bar-fill expense-fill"
                      style={{ width: `${Math.min(100, c.sharePercent ?? 0)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
