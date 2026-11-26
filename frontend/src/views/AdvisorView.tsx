import { useEffect, useState } from "react";
import { getFarmAdvice } from "../services/aiService";
import { loadFarmSummary } from "../services/storage";
import type { FarmSummaryData } from "../types/farm";
import FarmChatbot from "../components/FarmChatbot";
import { BrainCircuit } from "lucide-react";
import {
  PageHeader,
  StatCard,
  Panel,
  Button,
  EmptyState,
  Notice,
} from "../components/ui";
import { formatCurrency, formatNumber } from "../utils/format";
import { usePeriod } from "../context/PeriodContext";

export default function AdvisorView() {
  const { periodInfo } = usePeriod();
  const [advice, setAdvice] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState<FarmSummaryData | null>(null);

  async function loadData() {
    try {
      const data = await loadFarmSummary({ from: periodInfo.from, to: periodInfo.to });
      setSummary(data);
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    loadData();
  }, [periodInfo.from, periodInfo.to]);

  async function generateAdvice() {
    try {
      setGenerating(true);
      setError("");
      const result = await getFarmAdvice(undefined, { from: periodInfo.from, to: periodInfo.to });
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
        eyebrow="AI Decision Support"
        title="AI Farm Advisor"
        description="Grounded rule-based analysis and AI-generated decision support strictly based on your farm records."
      />

      <div className="kf-grid kf-grid--main-side" style={{ alignItems: "start" }}>
        {/* ── Left / main column ── */}
        <div className="kf-grid-main">
          {/* Active Period Indicator */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "var(--kf-surface, #ffffff)",
            border: "1px solid var(--kf-border, #e2e8f0)",
            borderRadius: "10px",
            padding: "10px 16px",
            marginBottom: "16px",
          }}>
            <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--kf-text, #1e293b)" }}>
              Analysis Context Period
            </span>
            <span style={{ fontSize: "13px", color: "var(--kf-primary, #15803d)", fontWeight: 600 }}>
              {periodInfo.label}
            </span>
          </div>

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
                icon={<BrainCircuit size={15} />}
                loading={generating}
                onClick={generateAdvice}
              >
                {generating ? "Analyzing…" : "Generate advisory"}
              </Button>
            }
          >
            {aiUnavailable ? (
              <EmptyState
                compact
                icon={<BrainCircuit size={28} />}
                title="AI advisor unavailable"
                description="The AI service is currently not configured or unreachable. Rule-based observations above remain fully functional."
              />
            ) : advice ? (
              <div className="kf-advice-card">
                <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{advice}</div>
              </div>
            ) : (
              <EmptyState
                compact
                title="No advisory generated yet"
                description="Click 'Generate advisory' to get an AI-powered summary of your farm's performance for this period."
              />
            )}
            {error && !aiUnavailable && <Notice tone="warning">{error}</Notice>}
          </Panel>
        </div>

        {/* ── Right / side column: Context stats ── */}
        <div className="kf-grid-side">
          <Panel title="Period figures" subtitle={`Based on ${periodInfo.daysCount}-day window`}>
            {summary ? (
              <div className="kf-stack kf-stack--sm">
                <StatCard
                  tone="forest"
                  image="/images/farm/chicken.webp"
                  imageAlt="Current flock"
                  layout="image-right"
                  label="Current flock"
                  value={formatNumber(summary.population.poultry.currentBirds)}
                />
                <StatCard
                  tone="amber"
                  image="/images/farm/cow.webp"
                  imageAlt="Cattle count"
                  layout="image-right"
                  label="Cattle count"
                  value={formatNumber(summary.population.livestock.animalCount)}
                />
                <StatCard
                  tone="blue"
                  image="/images/farm/eggs.webp"
                  imageAlt="Eggs produced"
                  layout="image-right"
                  label="Eggs produced"
                  value={formatNumber(
                    (summary.production.lines.find((l) => l.type === "eggs")?.total) ?? 0
                  )}
                />
                <StatCard
                  tone={summary.financial.operatingProfitOrLoss >= 0 ? "green" : "red"}
                  image={summary.financial.operatingProfitOrLoss >= 0 ? "/images/farm/farm-income.webp" : "/images/farm/operating-loss.webp"}
                  imageAlt="Net margin"
                  layout="image-right"
                  label="Net margin"
                  value={formatCurrency(summary.financial.operatingProfitOrLoss)}
                />
              </div>
            ) : (
              <p className="kf-muted kf-small">Loading farm figures…</p>
            )}
          </Panel>
        </div>
      </div>

      {/* ── Interactive chatbot ── */}
      <div style={{ marginTop: 24 }}>
        <FarmChatbot />
      </div>
    </main>
  );
}
