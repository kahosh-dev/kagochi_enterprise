import { useState, useEffect } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Calendar,
} from "lucide-react";
import type { PeriodMode, PeriodInfo } from "../utils/datePeriod";
import { getLocalDateString, canStepNext } from "../utils/datePeriod";

export interface DatePeriodFilterProps {
  mode: PeriodMode;
  offset: number;
  customFrom: string;
  customTo: string;
  periodInfo: PeriodInfo;
  onModeChange: (mode: PeriodMode) => void;
  onOffsetChange: (updater: number | ((prev: number) => number)) => void;
  onCustomRangeChange: (from: string, to: string) => void;
  onReset: () => void;
  title?: string;
  className?: string;
}

export const PERIOD_TABS: { value: PeriodMode; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "year", label: "This year" },
  { value: "custom", label: "Custom range" },
];

export default function DatePeriodFilter({
  mode,
  offset,
  customFrom,
  customTo,
  periodInfo,
  onModeChange,
  onOffsetChange,
  onCustomRangeChange,
  onReset,
  title = "Time Period",
  className = "",
}: DatePeriodFilterProps) {
  const [localFrom, setLocalFrom] = useState(customFrom || periodInfo.from);
  const [localTo, setLocalTo] = useState(customTo || periodInfo.to);
  const todayStr = getLocalDateString();

  useEffect(() => {
    setLocalFrom(customFrom || periodInfo.from);
    setLocalTo(customTo || periodInfo.to);
  }, [customFrom, customTo, periodInfo.from, periodInfo.to]);

  function handleModeClick(newMode: PeriodMode) {
    onModeChange(newMode);
  }

  function handlePrev() {
    onOffsetChange((prev) => prev - 1);
  }

  function handleNext() {
    if (canStepNext(mode, offset)) {
      onOffsetChange((prev) => prev + 1);
    }
  }

  function handleApplyCustom() {
    if (localFrom && localTo) {
      if (localFrom > localTo) {
        onCustomRangeChange(localTo, localFrom);
      } else {
        onCustomRangeChange(localFrom, localTo);
      }
    }
  }

  // Next is disabled when stepping would go past today
  const isNextDisabled = !canStepNext(mode, offset);

  return (
    <div className={`kf-date-filter-card ${className}`} style={{
      background: "var(--kf-surface, #ffffff)",
      border: "1px solid var(--kf-border, #e2e8f0)",
      borderRadius: "14px",
      padding: "16px 20px",
      display: "flex",
      flexDirection: "column",
      gap: "14px",
      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
    }}>
      {/* Top Row: Period Mode Selector */}
      <div style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "12px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <CalendarDays size={18} style={{ color: "var(--kf-primary, #15803d)" }} />
          <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--kf-text, #1e293b)" }}>
            {title}
          </span>
        </div>

        {/* Period mode pill buttons */}
        <div role="tablist" style={{
          display: "inline-flex",
          background: "var(--kf-cream, #f8fafc)",
          padding: "4px",
          borderRadius: "10px",
          border: "1px solid var(--kf-border, #e2e8f0)",
          gap: "4px",
          flexWrap: "wrap",
        }}>
          {PERIOD_TABS.map((tab) => {
            const isActive = mode === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => handleModeClick(tab.value)}
                style={{
                  border: "none",
                  outline: "none",
                  cursor: "pointer",
                  padding: "6px 14px",
                  borderRadius: "7px",
                  fontSize: "13px",
                  fontWeight: isActive ? 600 : 500,
                  background: isActive ? "var(--kf-primary, #15803d)" : "transparent",
                  color: isActive ? "#ffffff" : "var(--kf-text-muted, #64748b)",
                  transition: "all 0.15s ease",
                  boxShadow: isActive ? "0 2px 4px rgba(21, 128, 61, 0.2)" : "none",
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Row: Period Navigation / Custom Range Inputs */}
      {mode === "custom" ? (
        <div style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "12px",
          background: "var(--kf-cream, #f8fafc)",
          padding: "10px 14px",
          borderRadius: "10px",
          border: "1px solid var(--kf-border, #e2e8f0)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "12px", fontWeight: 500, color: "var(--kf-text-muted, #64748b)" }}>
              From:
            </span>
            <input
              type="date"
              value={localFrom}
              max={todayStr}
              onChange={(e) => setLocalFrom(e.target.value)}
              style={{
                padding: "6px 10px",
                borderRadius: "6px",
                border: "1px solid var(--kf-border, #cbd5e1)",
                fontSize: "13px",
                background: "#ffffff",
              }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "12px", fontWeight: 500, color: "var(--kf-text-muted, #64748b)" }}>
              To:
            </span>
            <input
              type="date"
              value={localTo}
              max={todayStr}
              onChange={(e) => setLocalTo(e.target.value)}
              style={{
                padding: "6px 10px",
                borderRadius: "6px",
                border: "1px solid var(--kf-border, #cbd5e1)",
                fontSize: "13px",
                background: "#ffffff",
              }}
            />
          </div>

          <button
            type="button"
            onClick={handleApplyCustom}
            style={{
              padding: "6px 16px",
              borderRadius: "6px",
              background: "var(--kf-primary, #15803d)",
              color: "#ffffff",
              border: "none",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Apply Range
          </button>

          <span style={{ fontSize: "12px", color: "var(--kf-text-muted, #64748b)", marginLeft: "auto" }}>
            {periodInfo.daysCount} days selected
          </span>
        </div>
      ) : (
        <div style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "10px",
          background: "var(--kf-cream, #f8fafc)",
          padding: "8px 14px",
          borderRadius: "10px",
          border: "1px solid var(--kf-border, #e2e8f0)",
        }}>
          {/* Previous Button */}
          <button
            type="button"
            onClick={handlePrev}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              padding: "6px 12px",
              borderRadius: "7px",
              border: "1px solid var(--kf-border, #cbd5e1)",
              background: "#ffffff",
              fontSize: "13px",
              fontWeight: 500,
              color: "var(--kf-text, #1e293b)",
              cursor: "pointer",
            }}
            title="Move to previous period"
          >
            <ChevronLeft size={16} />
            <span>Previous</span>
          </button>

          {/* Active Period Label */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            textAlign: "center",
          }}>
            <Calendar size={16} style={{ color: "var(--kf-primary, #15803d)" }} />
            <div>
              <span style={{
                fontSize: "14px",
                fontWeight: 600,
                color: "var(--kf-text, #1e293b)",
              }}>
                {periodInfo.label}
              </span>
              <span style={{
                display: "inline-block",
                marginLeft: "8px",
                fontSize: "12px",
                color: "var(--kf-text-muted, #64748b)",
              }}>
                ({periodInfo.sublabel})
              </span>
            </div>
          </div>

          {/* Right Side: Next & Current Reset Buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {offset !== 0 && (
              <button
                type="button"
                onClick={onReset}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "6px 10px",
                  borderRadius: "7px",
                  border: "1px solid var(--kf-border, #cbd5e1)",
                  background: "#ffffff",
                  fontSize: "12px",
                  fontWeight: 500,
                  color: "var(--kf-primary, #15803d)",
                  cursor: "pointer",
                }}
                title="Reset to current period"
              >
                <RotateCcw size={13} />
                <span>Current</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              disabled={isNextDisabled}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                padding: "6px 12px",
                borderRadius: "7px",
                border: "1px solid var(--kf-border, #cbd5e1)",
                background: isNextDisabled ? "transparent" : "#ffffff",
                fontSize: "13px",
                fontWeight: 500,
                color: isNextDisabled ? "var(--kf-text-muted, #94a3b8)" : "var(--kf-text, #1e293b)",
                cursor: isNextDisabled ? "not-allowed" : "pointer",
                opacity: isNextDisabled ? 0.4 : 1,
              }}
              title={isNextDisabled ? "Cannot navigate to future past today" : "Move to next period"}
            >
              <span>Next</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
