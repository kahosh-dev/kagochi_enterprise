import { useEffect, useMemo, useState } from "react";
import type { ProductionRecord, LivestockAnimal, PoultryBatch } from "../types/farm";
import {
  addProduction,
  updateProduction,
  deleteProduction,
} from "../services/storage";
import {
  Badge,
  Button,
  EmptyState,
  ErrorBanner,
  Field,
  IconButton,
  Modal,
  Notice,
  StatCard,
} from "./ui";
import { BarChart, type ChartPoint } from "./Chart";
import DatePeriodFilter from "./DatePeriodFilter";
import { formatAnimalAge } from "../utils/age";
import {
  calculatePeriod,
  calculateComparison,
  formatDisplayDate,
  getLocalDateString,
  isRecordInDateRange,
  type PeriodMode,
} from "../utils/datePeriod";
import {
  Beef,
  Bird,
  CheckCircle2,
  Egg,
  Milk,
  Pencil,
  Plus,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

export type ProductionTarget =
  | { type: "cattle"; animal: LivestockAnimal }
  | { type: "poultry"; batch: PoultryBatch };

interface AnimalProductionModalProps {
  open: boolean;
  onClose: () => void;
  target: ProductionTarget | null;
  records: ProductionRecord[];
  onRecordSaved: () => Promise<void> | void;
  initialPeriodMode?: PeriodMode;
  initialPeriodOffset?: number;
  allLivestock?: LivestockAnimal[];
  allPoultry?: PoultryBatch[];
}

const DEFAULT_TRAY_SIZE = 30;

export default function AnimalProductionModal({
  open,
  onClose,
  target,
  records,
  onRecordSaved,
  initialPeriodMode = "today",
  initialPeriodOffset = 0,
  allLivestock = [],
}: AnimalProductionModalProps) {
  // Period filter state
  const [periodMode, setPeriodMode] = useState<PeriodMode>(initialPeriodMode);
  const [periodOffset, setPeriodOffset] = useState<number>(initialPeriodOffset);
  const [customFrom, setCustomFrom] = useState<string>("");
  const [customTo, setCustomTo] = useState<string>("");

  // Sync initial period when modal opens
  useEffect(() => {
    if (open) {
      setPeriodMode(initialPeriodMode);
      setPeriodOffset(initialPeriodOffset);
    }
  }, [open, initialPeriodMode, initialPeriodOffset]);

  // Form state
  const todayStr = getLocalDateString();
  const isCattle = target?.type === "cattle";
  const defaultUnit = isCattle ? "litres" : "trays";

  const [date, setDate] = useState<string>(todayStr);
  const [quantity, setQuantity] = useState<string>("");
  const [unit, setUnit] = useState<string>(defaultUnit);
  const [destination, setDestination] = useState<string>("produced");
  const [sellingPrice, setSellingPrice] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  // Edit record state
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string>("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Reset form when target changes
  useEffect(() => {
    if (target) {
      setUnit(target.type === "cattle" ? "litres" : "trays");
      setQuantity("");
      setDate(getLocalDateString());
      setDestination("produced");
      setSellingPrice("");
      setNotes("");
      setEditingRecordId(null);
      setErrorMsg("");
      setSuccessMsg("");
      setShowAddForm(false);
    }
  }, [target]);

  // Compute period boundaries
  const period = useMemo(() => {
    return calculatePeriod(periodMode, periodOffset, customFrom, customTo);
  }, [periodMode, periodOffset, customFrom, customTo]);

  // Filter records belonging to this specific animal or batch
  const targetRecords = useMemo(() => {
    if (!target) return [];
    if (target.type === "cattle") {
      const animal = target.animal;
      return records.filter((r) => {
        if (r.targetId && r.targetId === animal.id) return true;
        if (r.groupName && animal.name && r.groupName.trim().toLowerCase() === animal.name.trim().toLowerCase()) return true;
        return false;
      });
    } else {
      const batch = target.batch;
      return records.filter((r) => {
        if (r.targetId && r.targetId === batch.id) return true;
        if (r.groupName && batch.breed && r.groupName.trim().toLowerCase() === batch.breed.trim().toLowerCase()) return true;
        if (r.groupName && batch.purpose && r.groupName.trim().toLowerCase().includes(batch.breed.trim().toLowerCase())) return true;
        return false;
      });
    }
  }, [target, records]);

  // Filter for the selected period and previous period
  const periodRecords = useMemo(() => {
    return targetRecords.filter((r) => isRecordInDateRange(r.date, period.from, period.to));
  }, [targetRecords, period]);

  const prevPeriodRecords = useMemo(() => {
    return targetRecords.filter((r) =>
      isRecordInDateRange(r.date, period.previousFrom, period.previousTo)
    );
  }, [targetRecords, period]);

  // Compute stats for this animal/batch
  const stats = useMemo(() => {
    let totalTrays = 0;
    let totalPieces = 0;
    let totalLitres = 0;

    for (const r of periodRecords) {
      const qty = Number(r.quantity) || 0;
      if (r.type === "milk" || r.unit === "litres") {
        totalLitres += qty;
      } else if (r.type === "eggs") {
        if (r.unit === "trays") {
          totalTrays += qty;
        } else {
          totalPieces += qty;
        }
      }
    }

    // Previous period
    let prevLitres = 0;
    let prevTrays = 0;
    for (const r of prevPeriodRecords) {
      const qty = Number(r.quantity) || 0;
      if (r.type === "milk" || r.unit === "litres") {
        prevLitres += qty;
      } else if (r.type === "eggs") {
        if (r.unit === "trays") prevTrays += qty;
        else prevTrays += qty / DEFAULT_TRAY_SIZE;
      }
    }

    const daysCount = Math.max(1, period.daysCount);
    const dailyAvgLitres = totalLitres / daysCount;
    const equivalentPieces = Math.round(totalTrays * DEFAULT_TRAY_SIZE + totalPieces);
    const totalTraysEquivalent = totalTrays + (totalPieces > 0 ? totalPieces / DEFAULT_TRAY_SIZE : 0);
    const dailyAvgTrays = totalTraysEquivalent / daysCount;

    const milkComparison = calculateComparison(totalLitres, prevLitres);
    const eggComparison = calculateComparison(totalTraysEquivalent, prevTrays);

    return {
      totalLitres,
      dailyAvgLitres,
      milkComparison,
      totalTrays,
      totalPieces,
      equivalentPieces,
      totalTraysEquivalent,
      dailyAvgTrays,
      eggComparison,
      recordCount: periodRecords.length,
      daysCount,
    };
  }, [periodRecords, prevPeriodRecords, period]);

  // Benchmark & Underperformance Analysis
  const performanceAssessment = useMemo(() => {
    if (!target) return null;

    if (target.type === "cattle") {
      // Compare this cow against other cattle in the same period
      const otherCows = allLivestock.filter(
        (a) => a.id !== target.animal.id && (a.category === "cow" || a.sex === "female")
      );

      // Compute other cows' milk in this period
      const otherCowsDaily: { id: string; name: string; daily: number }[] = [];
      for (const cow of otherCows) {
        const cowRecs = records.filter(
          (r) =>
            (r.type === "milk" || r.unit === "litres") &&
            isRecordInDateRange(r.date, period.from, period.to) &&
            ((r.targetId && r.targetId === cow.id) ||
              (r.groupName && cow.name && r.groupName.trim().toLowerCase() === cow.name.trim().toLowerCase()))
        );
        const cowTotal = cowRecs.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0);
        if (cowTotal > 0) {
          otherCowsDaily.push({
            id: cow.id,
            name: cow.name,
            daily: cowTotal / Math.max(1, period.daysCount),
          });
        }
      }

      if (stats.totalLitres === 0) {
        return {
          status: "none",
          tone: "slate" as const,
          label: "No Milk Recorded",
          detail: "No milk entries recorded for this animal during the selected period.",
        };
      }

      if (otherCowsDaily.length === 0) {
        return {
          status: "solo",
          tone: "blue" as const,
          label: "Single Milking Cow",
          detail: `Yielding an average of ${stats.dailyAvgLitres.toFixed(1)} L/day this period. Add other cattle records to enable herd comparisons.`,
        };
      }

      const herdTotalDaily = otherCowsDaily.reduce((sum, c) => sum + c.daily, 0) + stats.dailyAvgLitres;
      const herdAvg = herdTotalDaily / (otherCowsDaily.length + 1);

      if (stats.dailyAvgLitres >= herdAvg * 1.15) {
        return {
          status: "top",
          tone: "forest" as const,
          label: "Top Producer",
          detail: `Producing ${stats.dailyAvgLitres.toFixed(1)} L/day (+${Math.round(((stats.dailyAvgLitres - herdAvg) / herdAvg) * 100)}% above herd average of ${herdAvg.toFixed(1)} L/day).`,
        };
      } else if (stats.dailyAvgLitres <= herdAvg * 0.85) {
        return {
          status: "low",
          tone: "amber" as const,
          label: "Lower Production than Herd",
          detail: `Producing ${stats.dailyAvgLitres.toFixed(1)} L/day compared to the herd average of ${herdAvg.toFixed(1)} L/day. Check nutrition, lactation stage, or health status.`,
        };
      } else {
        return {
          status: "normal",
          tone: "green" as const,
          label: "Steady Production",
          detail: `Producing ${stats.dailyAvgLitres.toFixed(1)} L/day, aligned with the herd average of ${herdAvg.toFixed(1)} L/day.`,
        };
      }
    } else {
      // Poultry batch evaluation
      const batch = target.batch;
      const birdCount = batch.currentCount || batch.initialCount || 0;
      const isLayer =
        (batch.purpose && batch.purpose.toLowerCase().includes("egg")) ||
        (batch.stage && batch.stage.toLowerCase() === "layers");
      const isBroiler =
        batch.purpose &&
        batch.purpose.toLowerCase().includes("meat") &&
        !batch.purpose.toLowerCase().includes("egg");

      if (isBroiler) {
        return {
          status: "broiler",
          tone: "blue" as const,
          label: "Meat Flock",
          detail: "Broiler meat flock. Commercial egg production is not expected.",
        };
      }

      if (birdCount === 0) {
        return {
          status: "zero-count",
          tone: "slate" as const,
          label: "Flock Count Not Set",
          detail: `Collected ${stats.totalTrays.toFixed(1)} trays (${stats.equivalentPieces.toLocaleString()} eggs). Set current bird count to calculate laying percentage.`,
        };
      }

      // Laying rate = (Total egg pieces) / (birdCount * daysInPeriod) * 100
      const layingRate = (stats.equivalentPieces / (birdCount * stats.daysCount)) * 100;

      if (stats.totalTrays === 0 && stats.totalPieces === 0) {
        return {
          status: "none",
          tone: "slate" as const,
          label: "No Eggs Recorded",
          detail: "No egg collection recorded for this batch in this period.",
        };
      }

      if (isLayer) {
        if (layingRate >= 70) {
          return {
            status: "top",
            tone: "forest" as const,
            label: `High Laying Rate (${layingRate.toFixed(1)}%)`,
            detail: `Performing exceptionally well within standard commercial peak range (70% – 85%).`,
          };
        } else if (layingRate >= 50) {
          return {
            status: "normal",
            tone: "green" as const,
            label: `Good Laying Rate (${layingRate.toFixed(1)}%)`,
            detail: `Producing at a steady rate of ${stats.dailyAvgTrays.toFixed(1)} trays/day for ${birdCount} birds.`,
          };
        } else {
          return {
            status: "low",
            tone: "amber" as const,
            label: `Lower Laying Rate (${layingRate.toFixed(1)}%)`,
            detail: `Laying rate of ${layingRate.toFixed(1)}% is below typical commercial layer expectation (>65%). Check feed intake, lighting, or layer age (${batch.ageWeeks} wks).`,
          };
        }
      } else {
        // Dual-purpose or Kienyeji
        if (layingRate >= 40) {
          return {
            status: "top",
            tone: "forest" as const,
            label: `Strong Kienyeji Yield (${layingRate.toFixed(1)}%)`,
            detail: `Producing above average for dual-purpose/indigenous flock (typical 30% – 45%).`,
          };
        } else {
          return {
            status: "normal",
            tone: "slate" as const,
            label: `Dual-Purpose Rate (${layingRate.toFixed(1)}%)`,
            detail: `Typical laying rate for dual-purpose flock. ${stats.dailyAvgTrays.toFixed(1)} trays/day across ${birdCount} birds.`,
          };
        }
      }
    }
  }, [target, stats, records, period, allLivestock]);

  // Production trend chart points
  const chartPoints = useMemo<ChartPoint[]>(() => {
    if (!target) return [];

    if (periodMode === "year") {
      // Group by month
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const monthlyTotals = new Array(12).fill(0);

      for (const r of periodRecords) {
        const monthIdx = parseInt(r.date.slice(5, 7), 10) - 1;
        if (monthIdx >= 0 && monthIdx < 12) {
          monthlyTotals[monthIdx] += Number(r.quantity) || 0;
        }
      }

      return months.map((m, idx) => ({
        label: m,
        value: monthlyTotals[idx],
        tone: "green" as const,
      }));
    } else {
      // Group by day for today/week/month/custom
      const dayMap = new Map<string, number>();

      const start = new Date(`${period.from}T00:00:00`);
      const end = new Date(`${period.to}T00:00:00`);
      const cur = new Date(start);
      let safety = 0;

      while (cur <= end && safety < 35) {
        const dStr = cur.toISOString().slice(0, 10);
        dayMap.set(dStr, 0);
        cur.setDate(cur.getDate() + 1);
        safety++;
      }

      for (const r of periodRecords) {
        if (dayMap.has(r.date)) {
          dayMap.set(r.date, (dayMap.get(r.date) || 0) + (Number(r.quantity) || 0));
        }
      }

      return Array.from(dayMap.entries()).map(([d, val]) => {
        const parts = d.split("-");
        const shortLabel = parts.length === 3 ? `${parts[1]}/${parts[2]}` : d;
        return {
          label: shortLabel,
          value: val,
          tone: "green" as const,
        };
      });
    }
  }, [target, periodRecords, period, periodMode]);

  // Handle Save Record
  async function handleSaveRecord(e: React.FormEvent) {
    e.preventDefault();
    if (!target) return;

    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
      setErrorMsg("Please enter a valid quantity greater than zero.");
      return;
    }

    if (!date) {
      setErrorMsg("Please select a valid production date.");
      return;
    }

    setSaving(true);
    setErrorMsg("");

    try {
      const isCattleTarget = target.type === "cattle";
      const targetId = isCattleTarget ? target.animal.id : target.batch.id;
      const targetName = isCattleTarget ? target.animal.name : (target.batch.breed || "Poultry Batch");
      const pType = isCattleTarget ? "milk" : "eggs";

      const payload = {
        type: pType,
        quantity: qty,
        unit: isCattleTarget ? "litres" : unit,
        date,
        destination: destination || "produced",
        sellingPrice: parseFloat(sellingPrice) || 0,
        animalType: isCattleTarget ? "Cattle" : "Poultry",
        groupName: targetName,
        targetId,
        notes: notes.trim(),
      };

      if (editingRecordId) {
        await updateProduction(editingRecordId, payload);
        setSuccessMsg(`✓ Updated production record for ${targetName}`);
      } else {
        await addProduction(payload);
        setSuccessMsg(`✓ Recorded ${qty} ${payload.unit} for ${targetName}`);
      }

      // Reset form
      setQuantity("");
      setNotes("");
      setSellingPrice("");
      setEditingRecordId(null);
      setShowAddForm(false);

      // Refresh parent
      await onRecordSaved();
    } catch (err) {
      console.error(err);
      setErrorMsg(err instanceof Error ? err.message : "Failed to save production record.");
    } finally {
      setSaving(false);
    }
  }

  // Handle Start Edit
  function handleStartEdit(rec: ProductionRecord) {
    setEditingRecordId(rec.id);
    setDate(rec.date);
    setQuantity(String(rec.quantity));
    setUnit(rec.unit);
    setDestination(rec.destination || "produced");
    setSellingPrice(rec.sellingPrice ? String(rec.sellingPrice) : "");
    setNotes(rec.notes || "");
    setShowAddForm(true);
    setErrorMsg("");
    setSuccessMsg("");
  }

  // Handle Delete Record
  async function handleDeleteRecord(id: string) {
    setSaving(true);
    setErrorMsg("");
    try {
      await deleteProduction(id);
      setDeleteConfirmId(null);
      setSuccessMsg("✓ Record deleted successfully.");
      await onRecordSaved();
    } catch (err) {
      console.error(err);
      setErrorMsg(err instanceof Error ? err.message : "Failed to delete record.");
    } finally {
      setSaving(false);
    }
  }

  if (!target) return null;

  const targetTitle =
    target.type === "cattle"
      ? `Cow: ${target.animal.name} (${target.animal.breed || "Cattle"})`
      : `Poultry Batch: ${target.batch.breed} (${target.batch.purpose || "Flock"})`;

  const targetSubtitle =
    target.type === "cattle"
      ? `Tag: ${target.animal.tagNumber || `#${target.animal.id.slice(0, 6)}`} • Category: ${target.animal.category || "Cow"} • Age: ${formatAnimalAge(target.animal.dateOfBirth, "cattle", { legacyAgeYears: target.animal.ageYears, isEstimated: target.animal.isBirthDateEstimated }).formatted}`
      : `Live Birds: ${(target.batch.currentCount || target.batch.initialCount).toLocaleString()} • Stage: ${target.batch.stage || "Adult"} • Age: ${formatAnimalAge(target.batch.hatchDate, "poultry", { legacyAgeWeeks: target.batch.ageWeeks, isEstimated: target.batch.isHatchDateEstimated }).formatted}`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={targetTitle}
      subtitle={targetSubtitle}
      size="lg"
      footer={
        <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
          <span style={{ fontSize: "12.5px", color: "var(--kf-text-muted)" }}>
            Showing {stats.recordCount} record{stats.recordCount === 1 ? "" : "s"} for {period.label}
          </span>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      <div className="kf-stack">
        {/* Alerts */}
        {errorMsg && <ErrorBanner message={errorMsg} />}
        {successMsg && (
          <Notice tone="success">
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <CheckCircle2 size={16} />
              <span>{successMsg}</span>
            </div>
          </Notice>
        )}

        {/* Date Period Filter */}
        <DatePeriodFilter
          mode={periodMode}
          offset={periodOffset}
          customFrom={customFrom}
          customTo={customTo}
          periodInfo={period}
          onModeChange={setPeriodMode}
          onOffsetChange={setPeriodOffset}
          onCustomRangeChange={(from, to) => {
            setCustomFrom(from);
            setCustomTo(to);
          }}
          onReset={() => {
            setPeriodMode("month");
            setPeriodOffset(0);
            setCustomFrom("");
            setCustomTo("");
          }}
        />

        {/* KPI Stats */}
        <div className="kf-grid kf-grid--stats">
          {target.type === "cattle" ? (
            <>
              <StatCard
                label={`Milk Produced (${period.label})`}
                value={`${stats.totalLitres.toFixed(1)} L`}
                hint={stats.milkComparison ? stats.milkComparison.text : "No previous period data"}
                tone={stats.totalLitres > 0 ? "forest" : "slate"}
                icon={<Milk size={20} />}
              />
              <StatCard
                label="Daily Milk Average"
                value={`${stats.dailyAvgLitres.toFixed(1)} L/day`}
                hint={`Across ${stats.daysCount} calendar day${stats.daysCount === 1 ? "" : "s"}`}
                tone="green"
                icon={<TrendingUp size={20} />}
              />
              <StatCard
                label="Performance vs Herd"
                value={performanceAssessment?.label || "—"}
                hint={performanceAssessment?.detail || "Evaluating production..."}
                tone={performanceAssessment?.tone || "slate"}
                icon={<Beef size={20} />}
              />
            </>
          ) : (
            <>
              <StatCard
                label={`Eggs Collected (${period.label})`}
                value={`${stats.totalTrays.toFixed(1)} trays`}
                hint={`= ${stats.equivalentPieces.toLocaleString()} individual eggs (@ 30/tray)${stats.totalPieces > 0 ? ` + ${stats.totalPieces} pcs` : ""}`}
                tone={stats.totalTrays > 0 ? "forest" : "slate"}
                icon={<Egg size={20} />}
              />
              <StatCard
                label="Daily Average"
                value={`${stats.dailyAvgTrays.toFixed(1)} trays/day`}
                hint={`= ${Math.round(stats.dailyAvgTrays * DEFAULT_TRAY_SIZE)} eggs per day`}
                tone="green"
                icon={<TrendingUp size={20} />}
              />
              <StatCard
                label="Flock Performance"
                value={performanceAssessment?.label || "—"}
                hint={performanceAssessment?.detail || "Evaluating flock..."}
                tone={performanceAssessment?.tone || "slate"}
                icon={<Bird size={20} />}
              />
            </>
          )}
        </div>

        {/* Performance Benchmark Callout */}
        {performanceAssessment && (
          <div
            style={{
              padding: "12px 16px",
              borderRadius: "10px",
              background:
                performanceAssessment.tone === "forest"
                  ? "rgba(16, 185, 129, 0.08)"
                  : performanceAssessment.tone === "amber"
                  ? "rgba(245, 158, 11, 0.1)"
                  : "var(--kf-cream-2, #f9fafb)",
              border: `1px solid ${
                performanceAssessment.tone === "forest"
                  ? "rgba(16, 185, 129, 0.25)"
                  : performanceAssessment.tone === "amber"
                  ? "rgba(245, 158, 11, 0.3)"
                  : "var(--kf-border)"
              }`,
              display: "flex",
              alignItems: "flex-start",
              gap: "12px",
            }}
          >
            <div style={{ marginTop: "2px", color: `var(--kf-${performanceAssessment.tone}, #10b981)` }}>
              {performanceAssessment.tone === "amber" ? <TrendingDown size={18} /> : <TrendingUp size={18} />}
            </div>
            <div>
              <strong style={{ fontSize: "13.5px", display: "block", marginBottom: "2px" }}>
                Decision Support Assessment: {performanceAssessment.label}
              </strong>
              <p style={{ margin: 0, fontSize: "12.5px", color: "var(--kf-text-muted)" }}>
                {performanceAssessment.detail}
              </p>
            </div>
          </div>
        )}

        {/* Trend Chart */}
        {chartPoints.length > 0 && stats.recordCount > 0 && (
          <div
            style={{
              padding: "16px",
              borderRadius: "12px",
              background: "var(--kf-white)",
              border: "1px solid var(--kf-border)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
              <strong style={{ fontSize: "13.5px" }}>
                {target.type === "cattle" ? "Daily Milk Production (L)" : "Daily Egg Collection (Trays)"}
              </strong>
              <span style={{ fontSize: "12px", color: "var(--kf-text-muted)" }}>
                {period.label}
              </span>
            </div>
            <BarChart data={chartPoints} />
          </div>
        )}

        {/* Action Bar / Record Button */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <strong style={{ fontSize: "15px" }}>
            Production History ({periodRecords.length})
          </strong>
          <Button
            variant={showAddForm ? "ghost" : "primary"}
            size="sm"
            icon={showAddForm ? undefined : <Plus size={16} />}
            onClick={() => {
              setShowAddForm(!showAddForm);
              if (showAddForm) setEditingRecordId(null);
            }}
          >
            {showAddForm ? "Cancel Form" : target.type === "cattle" ? "Record Milk Yield" : "Record Egg Yield"}
          </Button>
        </div>

        {/* Record Form (Collapsible) */}
        {showAddForm && (
          <form
            onSubmit={handleSaveRecord}
            style={{
              padding: "16px",
              borderRadius: "12px",
              background: "var(--kf-cream-2, #f9fafb)",
              border: "1px solid var(--kf-border)",
            }}
          >
            <h4 style={{ margin: "0 0 12px", fontSize: "14px" }}>
              {editingRecordId
                ? `Edit Production Record`
                : target.type === "cattle"
                ? `Record Milk Produced for ${target.animal.name}`
                : `Record Egg Collection for ${target.batch.breed}`}
            </h4>

            <div className="kf-grid kf-grid--3" style={{ gap: "12px" }}>
              <Field label="Production Date" htmlFor="modal-prod-date" required>
                <input
                  id="modal-prod-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </Field>

              <Field
                label={target.type === "cattle" ? "Milk Quantity (Litres) *" : "Eggs Quantity (Trays) *"}
                htmlFor="modal-prod-qty"
                required
              >
                <input
                  id="modal-prod-qty"
                  type="number"
                  step="0.1"
                  min="0.1"
                  placeholder={target.type === "cattle" ? "e.g. 15 or 12.5" : "e.g. 5 or 2.5"}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                />
                {!isCattle && unit === "trays" && parseFloat(quantity) > 0 && (
                  <span style={{ fontSize: "11px", color: "var(--kf-primary)", display: "block", marginTop: "2px" }}>
                    = {Math.round(parseFloat(quantity) * DEFAULT_TRAY_SIZE)} eggs (@ 30/tray)
                  </span>
                )}
              </Field>

              <Field label="Unit" htmlFor="modal-prod-unit">
                {target.type === "cattle" ? (
                  <input id="modal-prod-unit" type="text" value="litres" disabled />
                ) : (
                  <select
                    id="modal-prod-unit"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                  >
                    <option value="trays">Trays (default 30 eggs/tray)</option>
                    <option value="pieces">Pieces (individual eggs)</option>
                  </select>
                )}
              </Field>

              <Field label="Destination" htmlFor="modal-prod-dest">
                <select
                  id="modal-prod-dest"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                >
                  <option value="produced">Produced / Farm Store</option>
                  <option value="sold">Direct Sale (Sold)</option>
                  <option value="home_use">Home / Staff Use</option>
                  <option value="damaged">Damaged / Discarded</option>
                </select>
              </Field>

              <Field label="Selling Price (KES, if sold)" htmlFor="modal-prod-price">
                <input
                  id="modal-prod-price"
                  type="number"
                  placeholder="e.g. 450"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(e.target.value)}
                />
              </Field>

              <Field label="Notes / Observations" htmlFor="modal-prod-notes">
                <input
                  id="modal-prod-notes"
                  type="text"
                  placeholder="e.g. Morning milking, healthy yield"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </Field>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "14px" }}>
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setEditingRecordId(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" loading={saving}>
                {editingRecordId ? "Update Record" : "Save Production"}
              </Button>
            </div>
          </form>
        )}

        {/* History Table */}
        {periodRecords.length === 0 ? (
          <EmptyState
            icon={target.type === "cattle" ? <Milk size={28} /> : <Egg size={28} />}
            title="No production records for this period"
            description={`Use the button above to record ${target.type === "cattle" ? "milk produced" : "eggs collected"} on any date.`}
          />
        ) : (
          <div className="kf-table-wrap">
            <table className="kf-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Quantity</th>
                  <th>Equivalent</th>
                  <th>Destination</th>
                  <th>Notes</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {periodRecords.map((r) => {
                  const qty = Number(r.quantity) || 0;
                  const equiv =
                    r.type === "eggs" && r.unit === "trays"
                      ? `${Math.round(qty * DEFAULT_TRAY_SIZE)} eggs`
                      : "—";

                  return (
                    <tr key={r.id}>
                      <td>
                        <strong>{formatDisplayDate(r.date)}</strong>
                      </td>
                      <td>
                        <strong style={{ color: "var(--kf-forest)" }}>
                          {qty.toLocaleString()} {r.unit}
                        </strong>
                      </td>
                      <td>{equiv}</td>
                      <td>
                        <Badge tone={r.destination === "sold" ? "green" : "slate"}>
                          {r.destination || "produced"}
                        </Badge>
                      </td>
                      <td>
                        <span style={{ fontSize: "12px", color: "var(--kf-text-muted)" }}>
                          {r.notes || "—"}
                        </span>
                      </td>
                      <td>
                        <div className="kf-actions-cell">
                          <IconButton
                            label="Edit"
                            icon={<Pencil size={15} />}
                            onClick={() => handleStartEdit(r)}
                          />
                          <IconButton
                            label="Delete"
                            tone="danger"
                            icon={<Trash2 size={15} />}
                            onClick={() => setDeleteConfirmId(r.id)}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirmId && (
          <Modal
            open={!!deleteConfirmId}
            onClose={() => setDeleteConfirmId(null)}
            title="Delete Production Record?"
            size="sm"
            footer={
              <>
                <Button variant="ghost" onClick={() => setDeleteConfirmId(null)}>
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  loading={saving}
                  onClick={() => handleDeleteRecord(deleteConfirmId)}
                >
                  Delete Record
                </Button>
              </>
            }
          >
            <p style={{ margin: 0, fontSize: "14px" }}>
              Are you sure you want to delete this production record? Farm totals and averages will be updated automatically.
            </p>
          </Modal>
        )}
      </div>
    </Modal>
  );
}
