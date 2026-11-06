import { useEffect, useState } from "react";
import { getFarmAdvice } from "../services/aiService";
import { loadFarmSummary } from "../services/storage";
import type { FarmSummaryData } from "../types/farm";
import FarmChatbot from "../components/FarmChatbot";
import { Sparkles, Bird, Beef, Egg, DollarSign } from "lucide-react";
import {
  PageHeader,
  StatCard,
  Panel,
  Button,
  EmptyState,
  ErrorBanner,
  Notice,
  Segmented,
} from "../components/ui";
import { formatCurrency, formatNumber } from "../utils/format";

export default function AdvisorView() {
  const [advice, setAdvice] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState<FarmSummaryData | null>(null);
  const [periodDays, setPeriodDays] = useState<number>(1);

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

  const aiUnavailable =
    error &&
    (error.toLowerCase().includes("not configured") ||
      error.includes("503") ||
      error.includes("unavailable"));

  return (
    <main className="kf-page kf-page--narrow">
      <PageHeader
        title="AI Farm Advisor"
        description="Rule-based analysis and AI-generated reports based on your farm records."
      />

      <div className="kf-grid kf-grid--main-side" style={{ alignItems: "start" }}>
        {/* ── Left / main column ── */}
        <div className="kf-grid-main">
          {/* Period selector */}
          <Segmented
            label="Analysis period"
            options={[
              { value: "1", label: "Today" },
              { value: "7", label: "7 days" },
              { value: "30", label: "30 days" },
            ]}
            value={String(periodDays)}
            onChange={(v) => setPeriodDays(Number(v))}
          />

          {/* Rule-based warnings */}
          <Panel
            title="Farm observations"
            subtitle="Rule-based analysis from your records"
          >
            {summary && summary.rules.length > 0 ? (
              <ul className="kf-warning-list">
                {summary.rules.map((r) => (
                  <li key={r.id} className={`kf-warning-item kf-warning-item--${r.severity}`}>
                    <strong>{r.finding}</strong>
                    <span>{r.recommendation}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                compact
                title="No observations"
                description="No warnings detected for this period."
              />
            )}
          </Panel>

          {/* AI advisory generation */}
          <Panel
            title="AI Performance Review"
            actions={
              <Button
                variant="primary"
                icon={<Sparkles size={15} />}
                loading={generating}
                onClick={generateAdvice}
              >
                {generating ? "Analyzing…" : "Generate advisory"}
              </Button>
            }
          >
            {aiUnavailable ? (
              <Notice tone="info">
                The AI advisor is not configured in this deployment. You can still use
                rule-based farm observations above.
              </Notice>
            ) : error ? (
              <ErrorBanner message={error} />
            ) : advice ? (
              <div className="kf-panel-body">
                <pre
                  style={{
                    whiteSpace: "pre-wrap",
                    fontFamily: "inherit",
                    fontSize: "13px",
                    lineHeight: 1.7,
                    margin: 0,
                  }}
                >
                  {advice}
                </pre>
              </div>
            ) : (
              <EmptyState
                compact
                title="Generate an advisory report"
                description="Click the button above to get a structured analysis of your farm records."
              />
            )}
          </Panel>

          {/* Chatbot */}
          <FarmChatbot />
        </div>

        {/* ── Right / side column ── */}
        <div className="kf-grid-side">
          {/* Suggested questions */}
          <Panel title="Suggested questions">
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {[
                "How is my poultry mortality this week?",
                "What should I feed my layers?",
                "Are my expenses normal for this month?",
                "When are my next vaccinations due?",
                "What is my farm profit this month?",
              ].map((q) => (
                <span key={q} className="kf-chip" style={{ cursor: "default" }}>
                  {q}
                </span>
              ))}
            </div>
          </Panel>

          {/* Current period stats */}
          <Panel title="Current period">
            <div className="kf-stat-grid kf-stat-grid--2col">
              <StatCard
                label="Birds"
                value={formatNumber(summary?.population.poultry.currentBirds ?? 0)}
                icon={<Bird size={18} strokeWidth={1.5} />}
                tone="green"
              />
              <StatCard
                label="Cattle"
                value={formatNumber(summary?.population.livestock.animalCount ?? 0)}
                icon={<Beef size={18} strokeWidth={1.5} />}
                tone="forest"
              />
              <StatCard
                label="Eggs"
                value={formatNumber(summary?.production.eggsProduced ?? 0)}
                icon={<Egg size={18} strokeWidth={1.5} />}
                tone="amber"
              />
              <StatCard
                label="Profit / Loss"
                value={formatCurrency(summary?.financial.operatingProfitOrLoss ?? 0)}
                icon={<DollarSign size={18} strokeWidth={1.5} />}
                tone={
                  (summary?.financial.operatingProfitOrLoss ?? 0) >= 0 ? "green" : "red"
                }
              />
            </div>
          </Panel>
        </div>
      </div>
    </main>
  );
}
