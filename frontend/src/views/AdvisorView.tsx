import { useEffect, useState } from "react";
import { getFarmAdvice } from "../services/aiService";
import { loadFarmSummary } from "../services/storage";
import type { FarmSummaryData } from "../types/farm";
import FarmChatbot from "../components/FarmChatbot";
import {
  Sparkles,
  AlertTriangle,
  Calendar,
  RefreshCw,
} from "lucide-react";

export default function AdvisorView() {
  const [advice, setAdvice] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState<FarmSummaryData | null>(null);
  const [periodDays, setPeriodDays] = useState<number>(1); // default to today (1 day)

  const todayStr = new Date().toISOString().slice(0, 10);

  async function loadData() {
    try {
      const data = await loadFarmSummary({ days: periodDays, to: todayStr });
      setSummary(data);
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    loadData();
  }, [periodDays]);

  async function generateAdvice() {
    try {
      setGenerating(true);
      setError("");
      const result = await getFarmAdvice(undefined, { periodDays, to: todayStr });
      setAdvice(result);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Unable to generate AI farm advice.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="view-container">
      {/* Header */}
      <div className="view-header-row">
        <div>
          <h2>Farm Assistant (AI Decision Support)</h2>
          <p className="view-subtitle">
            Daily performance analysis, loss detection, and practical veterinary/feed recommendations.
          </p>
        </div>
      </div>

      {/* Analysis Period Bar */}
      <div className="dashboard-filter-bar" style={{ marginBottom: 20 }}>
        <div className="filter-chips">
          <span className="filter-label">
            <Calendar size={14} /> Analysis Scope:
          </span>
          <button
            type="button"
            className={`filter-chip ${periodDays === 1 ? "active" : ""}`}
            onClick={() => setPeriodDays(1)}
          >
            Today's Activities (1 Day)
          </button>
          <button
            type="button"
            className={`filter-chip ${periodDays === 7 ? "active" : ""}`}
            onClick={() => setPeriodDays(7)}
          >
            Recent Performance (Last 7 Days)
          </button>
          <button
            type="button"
            className={`filter-chip ${periodDays === 30 ? "active" : ""}`}
            onClick={() => setPeriodDays(30)}
          >
            Monthly Overview (30 Days)
          </button>
        </div>
      </div>

      {/* Rule-Based Early Warnings Banner */}
      {summary && summary.rules.length > 0 && (
        <div className="card-box" style={{ borderLeft: "4px solid #f59e0b", marginBottom: 20 }}>
          <h4 style={{ margin: "0 0 10px 0", display: "flex", alignItems: "center", gap: 8, color: "#92400e" }}>
            <AlertTriangle size={18} />
            Rule-Based Early Warnings & Observations ({summary.rules.length})
          </h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {summary.rules.map((r) => (
              <div
                key={r.id}
                style={{
                  padding: "8px 12px",
                  borderRadius: 6,
                  background: r.severity === "warning" ? "#fef2f2" : "#f8fafc",
                  border: r.severity === "warning" ? "1px solid #fecaca" : "1px solid #e2e8f0",
                }}
              >
                <div style={{ fontWeight: 600, color: r.severity === "warning" ? "#991b1b" : "#1e293b", fontSize: 13.5 }}>
                  {r.finding}
                </div>
                <div style={{ fontSize: 13, color: "#475569", marginTop: 2 }}>
                  💡 {r.recommendation}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Advisory Generator Section */}
      <div className="card-box" style={{ marginBottom: 24 }}>
        <div className="card-header-bar">
          <div>
            <h3 className="card-heading">Daily Comprehensive Performance Review</h3>
            <p className="card-subheading">
              Generates a structured report on facts from your records, potential explanations, recommendations, and missing data.
            </p>
          </div>
          <button
            type="button"
            className="btn-primary"
            onClick={generateAdvice}
            disabled={generating}
          >
            <Sparkles size={16} />
            {generating ? "Analyzing Records..." : "Generate AI Advisory"}
          </button>
        </div>

        {error && (
          <div className="daily-alert error-alert" style={{ marginTop: 12 }}>
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}

        {advice && (
          <div className="ai-report-box" style={{ marginTop: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span className="badge-stage badge-chicks">
                ✓ Grounded in real farm records ({periodDays === 1 ? "Today" : `${periodDays} Days`})
              </span>
              <button
                type="button"
                className="link-action-btn"
                onClick={generateAdvice}
                disabled={generating}
              >
                <RefreshCw size={13} /> Refresh
              </button>
            </div>
            <div className="markdown-prose">
              <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", margin: 0, lineHeight: 1.6 }}>
                {advice}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* Interactive AI Chatbot */}
      <FarmChatbot />
    </div>
  );
}
