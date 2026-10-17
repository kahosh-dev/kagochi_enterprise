import { useEffect, useState } from "react";
import {
  loadPoultry,
  loadLivestock,
  loadProduction,
  loadFeeding,
  loadExpenses,
} from "../services/storage";
import { getFarmAdvice } from "../services/aiService";

import FarmChatbot from "../components/FarmChatbot";

import type {
  PoultryBatch,
  LivestockAnimal,
  ProductionRecord,
  FeedingRecord,
  ExpenseRecord,
} from "../types/farm";

interface FarmData {
  poultry: PoultryBatch[];
  livestock: LivestockAnimal[];
  production: ProductionRecord[];
  feeding: FeedingRecord[];
  expenses: ExpenseRecord[];
}

export default function AdvisorView() {
  const [farmData, setFarmData] = useState<FarmData>({
    poultry: [],
    livestock: [],
    production: [],
    feeding: [],
    expenses: [],
  });

  const [advice, setAdvice] = useState("");
  const [loadingData, setLoadingData] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  async function loadFarmData() {
    try {
      setLoadingData(true);
      setError("");

      const [
        poultry,
        livestock,
        production,
        feeding,
        expenses,
      ] = await Promise.all([
        loadPoultry(),
        loadLivestock(),
        loadProduction(),
        loadFeeding(),
        loadExpenses(),
      ]);

      setFarmData({
        poultry,
        livestock,
        production,
        feeding,
        expenses,
      });
    } catch (err) {
      console.error("Failed to load farm data:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load your farm data."
      );
    } finally {
      setLoadingData(false);
    }
  }

  useEffect(() => {
    loadFarmData();
  }, []);

  async function generateAdvice() {
    try {
      setGenerating(true);
      setError("");

      const result = await getFarmAdvice(farmData);

      setAdvice(result);
    } catch (err) {
      console.error("AI advisor error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to generate AI advice."
      );
    } finally {
      setGenerating(false);
    }
  }

  const poultryCount = farmData.poultry.reduce(
    (total, batch) => total + Number(batch.currentCount || 0),
    0
  );

  const livestockCount = farmData.livestock.length;

  const productionCount = farmData.production.length;

  const feedingCount = farmData.feeding.length;

  const expenseCount = farmData.expenses.length;

  return (
    <div className="management-page advisor-page">

      {/* HERO */}
      <div className="advisor-hero">
        <div className="advisor-hero-content">
          <div className="advisor-icon">
            <img src="https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=80&q=70" alt="AI" className="summary-icon-img" />
          </div>

          <div>
            <span className="advisor-eyebrow">
              KAGOCHI FARM AI
            </span>

            <h1>AI Farm Advisor</h1>

            <p>
              Turn your farm records into practical insights,
              recommendations and better decisions.
            </p>
          </div>
        </div>

        <div className="advisor-status">
          <span className="status-dot"></span>
          AI Advisor Ready
        </div>
      </div>

      {/* FARM DATA SUMMARY */}
      <div className="summary-grid advisor-summary-grid">

        <div className="summary-card advisor-summary-card">
          <div className="advisor-stat-icon">
            <img src="https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=80&q=70" alt="Poultry" className="summary-icon-img" />
          </div>

          <div>
            <span className="summary-label">
              Poultry
            </span>

            <strong>
              {poultryCount}
            </strong>

            <small>
              Current birds
            </small>
          </div>
        </div>

        <div className="summary-card advisor-summary-card">
          <div className="advisor-stat-icon">
            <img src="https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?w=80&q=70" alt="Livestock" className="summary-icon-img" />
          </div>

          <div>
            <span className="summary-label">
              Livestock
            </span>

            <strong>
              {livestockCount}
            </strong>

            <small>
              Registered animals
            </small>
          </div>
        </div>

        <div className="summary-card advisor-summary-card">
          <div className="advisor-stat-icon">
            <img src="https://images.unsplash.com/photo-1506976785307-8732e854ad03?w=80&q=70" alt="Production" className="summary-icon-img" />
          </div>

          <div>
            <span className="summary-label">
              Production
            </span>

            <strong>
              {productionCount}
            </strong>

            <small>
              Production records
            </small>
          </div>
        </div>

        <div className="summary-card advisor-summary-card">
          <div className="advisor-stat-icon">
            <img src="https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=80&q=70" alt="Feeding" className="summary-icon-img" />
          </div>

          <div>
            <span className="summary-label">
              Feeding
            </span>

            <strong>
              {feedingCount}
            </strong>

            <small>
              Feeding records
            </small>
          </div>
        </div>

        <div className="summary-card advisor-summary-card">
          <div className="advisor-stat-icon">
            <img src="https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=80&q=70" alt="Expenses" className="summary-icon-img" />
          </div>

          <div>
            <span className="summary-label">
              Expenses
            </span>

            <strong>
              {expenseCount}
            </strong>

            <small>
              Expense records
            </small>
          </div>
        </div>

      </div>

      {/* AI ADVISOR */}
      <div className="advisor-main-card">

        <div className="advisor-card-header">

          <div className="advisor-title-area">

            <div className="advisor-title-icon">
              <img src="https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=80&q=70" alt="AI" className="summary-icon-img" />
            </div>

            <div>
              <h2>
                Farm Intelligence
              </h2>

              <p>
                Let AI analyse your current farm records.
              </p>
            </div>

          </div>

          <div className="advisor-data-status">
            <span className="status-dot"></span>

            {loadingData
              ? "Loading farm data..."
              : "Farm data connected"}
          </div>

        </div>

        <div className="advisor-divider"></div>

        {/* INTRO */}
        {!advice && !generating && (
          <div className="advisor-intro">

            <div className="advisor-intro-icon">
              <img src="https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=80&q=70" alt="AI" className="summary-icon-img" />
            </div>

            <h3>
              Get intelligent farm insights
            </h3>

            <p>
              Kagochi Farm AI can analyse your poultry,
              livestock, production, feeding and expense
              records to identify patterns and provide
              practical recommendations for your farm.
            </p>

            <div className="advisor-feature-grid">

              <div className="advisor-feature">
                <img src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=80&q=70" alt="Performance" className="feature-icon-img" />
                <div>
                  <strong>Performance</strong>
                  <small>Analyse farm performance</small>
                </div>
              </div>

              <div className="advisor-feature">
                <img src="https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=80&q=70" alt="Feeding" className="feature-icon-img" />
                <div>
                  <strong>Feeding</strong>
                  <small>Review feeding patterns</small>
                </div>
              </div>

              <div className="advisor-feature">
                <img src="https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=80&q=70" alt="Expenses" className="feature-icon-img" />
                <div>
                  <strong>Expenses</strong>
                  <small>Identify cost patterns</small>
                </div>
              </div>

              <div className="advisor-feature">
                <img src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=80&q=70" alt="Planning" className="feature-icon-img" />
                <div>
                  <strong>Planning</strong>
                  <small>Support farm decisions</small>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* LOADING */}
        {generating && (
          <div className="advisor-loading">

            <div className="ai-loader">
              <span></span>
              <span></span>
              <span></span>
            </div>

            <h3>
              Analysing your farm...
            </h3>

            <p>
              Kagochi Farm AI is reviewing your farm
              records and preparing recommendations.
            </p>

          </div>
        )}

        {/* AI RESULT */}
        {advice && !generating && (
          <div className="advisor-result">

            <div className="advisor-result-header">

              <div className="result-icon">
                <img src="https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=80&q=70" alt="AI" className="summary-icon-img" />
              </div>

              <div>
                <span className="advisor-eyebrow">
                  AI ANALYSIS
                </span>

                <h3>
                  Your Farm Insights
                </h3>
              </div>

            </div>

            <div className="advisor-result-body">

              {advice.split("\n").map((line, index) => {
                const trimmed = line.trim();

                if (!trimmed) {
                  return (
                    <div
                      key={index}
                      className="advice-spacer"
                    />
                  );
                }

                if (
                  trimmed.startsWith("###") ||
                  trimmed.startsWith("##") ||
                  trimmed.startsWith("#")
                ) {
                  return (
                    <h4 key={index}>
                      {trimmed.replace(/^#+\s*/, "")}
                    </h4>
                  );
                }

                if (
                  trimmed.startsWith("•") ||
                  trimmed.startsWith("-") ||
                  trimmed.startsWith("*")
                ) {
                  return (
                    <div
                      key={index}
                      className="advice-list-item"
                    >
                      <span>✓</span>

                      <p>
                        {trimmed.replace(/^[-*•]\s*/, "")}
                      </p>
                    </div>
                  );
                }

                return (
                  <p key={index}>
                    {trimmed}
                  </p>
                );
              })}

            </div>

          </div>
        )}

        {/* ERROR */}
        {error && (
          <div className="advisor-error">

            <span>⚠️</span>

            <div>
              <strong>
                Unable to complete the analysis
              </strong>

              <p>
                {error}
              </p>
            </div>

          </div>
        )}

        {/* ACTION */}
        <div className="advisor-action-area">

          <button
            className="advisor-generate-button"
            onClick={generateAdvice}
            disabled={loadingData || generating}
          >
            {generating ? (
              <>
                <span className="button-spinner"></span>
                Analysing Farm...
              </>
            ) : (
              <>
                ✨
                {advice
                  ? "Generate New Analysis"
                  : "Analyse My Farm"}
              </>
            )}
          </button>

          {advice && (
            <button
              type="button"
              className="advisor-refresh-button"
              onClick={() => setAdvice("")}
            >
              Clear Analysis
            </button>
          )}

        </div>

      </div>
    
      <FarmChatbot />

        {/* HOW IT WORKS */}
      <div className="management-card advisor-how-card">

        <div className="card-heading">
          <div>
            <h2>
              How AI Farm Advisor Works
            </h2>

            <p>
              Your farm information is transformed into
              useful decision-support insights.
            </p>
          </div>
        </div>

        <div className="advisor-steps">

          <div className="advisor-step">
            <div className="step-number">
              1
            </div>

            <div>
              <h3>
                Collect
              </h3>

              <p>
                Your poultry, livestock, production,
                feeding and expense records are collected.
              </p>
            </div>
          </div>

          <div className="advisor-step">
            <div className="step-number">
              2
            </div>

            <div>
              <h3>
                Analyse
              </h3>

              <p>
                AI reviews the available farm information
                and identifies useful patterns.
              </p>
            </div>
          </div>

          <div className="advisor-step">
            <div className="step-number">
              3
            </div>

            <div>
              <h3>
                Recommend
              </h3>

              <p>
                The system produces practical insights
                to support farm management decisions.
              </p>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}