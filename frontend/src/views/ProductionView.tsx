import { useEffect, useMemo, useState } from "react";
import {
  loadProduction,
  addProduction,
  updateProduction,
  deleteProduction,
  loadPoultry,
  loadLivestock,
} from "../services/storage";
import type { ProductionRecord, PoultryBatch, LivestockAnimal } from "../types/farm";
import {
  Beef,
  Bird,
  CheckCircle2,
  ClipboardList,
  Egg,
  Milk,
  Pencil,
  Plus,
  Trash2,
  TrendingUp,
} from "lucide-react";
import {
  Badge,
  Button,
  EmptyState,
  ErrorBanner,
  Field,
  IconButton,
  Modal,
  Notice,
  PageHeader,
  Panel,
  Segmented,
  StatCard,
} from "../components/ui";
import { BarChart, LineChart, type ChartPoint } from "../components/Chart";
import DatePeriodFilter from "../components/DatePeriodFilter";
import AnimalProductionModal, { type ProductionTarget } from "../components/AnimalProductionModal";
import { formatAnimalAge } from "../utils/age";
import {
  calculateComparison,
  formatDisplayDate,
  getLocalDateString,
  isRecordInDateRange,
  addDaysToDateStr,
} from "../utils/datePeriod";
import { usePeriod } from "../context/PeriodContext";

const VIEW_TABS = [
  { value: "all", label: "Overview & Totals" },
  { value: "poultry", label: "Poultry Batches" },
  { value: "cattle", label: "Cattle Herd" },
  { value: "records", label: "All Saved Records" },
];

const DEFAULT_TRAY_SIZE = 30;

export default function ProductionView() {
  const [records, setRecords] = useState<ProductionRecord[]>([]);
  const [poultryBatches, setPoultryBatches] = useState<PoultryBatch[]>([]);
  const [livestockList, setLivestockList] = useState<LivestockAnimal[]>([]);
  const [_loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string } | null>(null);

  // Shared period state
  const {
    mode: periodMode,
    offset: periodOffset,
    customFrom,
    customTo,
    periodInfo: period,
    setMode: setPeriodMode,
    setOffset: setPeriodOffset,
    setCustomRange,
    resetPeriod,
  } = usePeriod();

  // Modal state for individual animal or batch
  const [selectedTarget, setSelectedTarget] = useState<ProductionTarget | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // General Record Form Drawer / Modal state
  const [isGeneralFormOpen, setIsGeneralFormOpen] = useState<boolean>(false);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Form fields
  const todayStr = getLocalDateString();
  const [formAnimalType, setFormAnimalType] = useState<string>("Poultry");
  const [formTargetId, setFormTargetId] = useState<string>("");
  const [formGroupName, setFormGroupName] = useState<string>("");
  const [formType, setFormType] = useState<"eggs" | "milk">("eggs");
  const [formQuantity, setFormQuantity] = useState("");
  const [formUnit, setFormUnit] = useState("trays");
  const [formDate, setFormDate] = useState(todayStr);
  const [formDestination, setFormDestination] = useState("produced");
  const [formSellingPrice, setFormSellingPrice] = useState("");
  const [formNotes, setFormNotes] = useState("");

  async function refreshData() {
    try {
      setLoading(true);
      const [prodData, poultryData, livestockData] = await Promise.all([
        loadProduction(),
        loadPoultry().catch(() => []),
        loadLivestock().catch(() => []),
      ]);
      setRecords(prodData);
      setPoultryBatches(poultryData);
      setLivestockList(livestockData);
    } catch (error) {
      console.error("Failed to load production data:", error);
      setErrorMsg(error instanceof Error ? error.message : "Failed to load farm production.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshData();
  }, []);

  // Filter records within current period and previous period
  const periodRecords = useMemo(() => {
    return records.filter((r) => isRecordInDateRange(r.date, period.from, period.to));
  }, [records, period]);

  const prevPeriodRecords = useMemo(() => {
    return records.filter((r) =>
      isRecordInDateRange(r.date, period.previousFrom, period.previousTo)
    );
  }, [records, period]);

  // Farm-Wide Production Totals (calculated strictly from saved database records)
  const farmTotals = useMemo(() => {
    let eggTrays = 0;
    let eggPieces = 0;
    let milkLitres = 0;

    for (const r of periodRecords) {
      const qty = Number(r.quantity) || 0;
      if (r.type === "milk" || r.unit === "litres") {
        milkLitres += qty;
      } else if (r.type === "eggs") {
        if (r.unit === "trays") {
          eggTrays += qty;
        } else {
          eggPieces += qty;
        }
      }
    }

    // Previous period totals
    let prevEggTrays = 0;
    let prevMilkLitres = 0;
    for (const r of prevPeriodRecords) {
      const qty = Number(r.quantity) || 0;
      if (r.type === "milk" || r.unit === "litres") {
        prevMilkLitres += qty;
      } else if (r.type === "eggs") {
        if (r.unit === "trays") prevEggTrays += qty;
        else prevEggTrays += qty / DEFAULT_TRAY_SIZE;
      }
    }

    const daysCount = Math.max(1, period.daysCount);
    const eggTotalPieces = Math.round(eggTrays * DEFAULT_TRAY_SIZE + eggPieces);
    const totalTraysEquivalent = eggTrays + (eggPieces > 0 ? eggPieces / DEFAULT_TRAY_SIZE : 0);
    const avgDailyTrays = totalTraysEquivalent / daysCount;
    const avgDailyMilk = milkLitres / daysCount;

    const eggComparison = calculateComparison(totalTraysEquivalent, prevEggTrays);
    const milkComparison = calculateComparison(milkLitres, prevMilkLitres);

    return {
      eggTrays,
      eggPieces,
      eggTotalPieces,
      totalTraysEquivalent,
      avgDailyTrays,
      eggComparison,
      milkLitres,
      avgDailyMilk,
      milkComparison,
      daysCount,
      totalRecordsCount: periodRecords.length,
    };
  }, [periodRecords, prevPeriodRecords, period]);

  // Per-Batch Poultry Production Calculations
  const poultryBatchSummaries = useMemo(() => {
    const daysCount = Math.max(1, period.daysCount);

    return poultryBatches.map((batch) => {
      // Find all records matching this batch
      const batchRecords = periodRecords.filter((r) => {
        if (r.type !== "eggs") return false;
        if (r.targetId && r.targetId === batch.id) return true;
        if (r.groupName && batch.breed && r.groupName.trim().toLowerCase() === batch.breed.trim().toLowerCase()) return true;
        if (r.groupName && batch.purpose && r.groupName.trim().toLowerCase().includes(batch.breed.trim().toLowerCase())) return true;
        return false;
      });

      // Previous period records
      const prevBatchRecords = prevPeriodRecords.filter((r) => {
        if (r.type !== "eggs") return false;
        if (r.targetId && r.targetId === batch.id) return true;
        if (r.groupName && batch.breed && r.groupName.trim().toLowerCase() === batch.breed.trim().toLowerCase()) return true;
        return false;
      });

      let trays = 0;
      let pieces = 0;
      for (const r of batchRecords) {
        const qty = Number(r.quantity) || 0;
        if (r.unit === "trays") trays += qty;
        else pieces += qty;
      }

      let prevTrays = 0;
      for (const r of prevBatchRecords) {
        const qty = Number(r.quantity) || 0;
        if (r.unit === "trays") prevTrays += qty;
        else prevTrays += qty / DEFAULT_TRAY_SIZE;
      }

      const totalPieces = Math.round(trays * DEFAULT_TRAY_SIZE + pieces);
      const totalTraysEquivalent = trays + (pieces > 0 ? pieces / DEFAULT_TRAY_SIZE : 0);
      const dailyAvgTrays = totalTraysEquivalent / daysCount;
      const comparison = calculateComparison(totalTraysEquivalent, prevTrays);

      // Laying rate calculation
      const liveBirds = batch.currentCount || batch.initialCount || 0;
      const isLayer =
        (batch.purpose && batch.purpose.toLowerCase().includes("egg")) ||
        (batch.stage && batch.stage.toLowerCase() === "layers");
      const isBroiler =
        batch.purpose &&
        batch.purpose.toLowerCase().includes("meat") &&
        !batch.purpose.toLowerCase().includes("egg");

      let performanceStatus: { label: string; tone: "forest" | "green" | "amber" | "slate" | "blue"; detail: string };

      if (isBroiler) {
        performanceStatus = {
          label: "Meat Breed",
          tone: "blue",
          detail: "Broiler flock focused on weight gain rather than egg laying.",
        };
      } else if (liveBirds === 0) {
        performanceStatus = {
          label: "Population Not Set",
          tone: "slate",
          detail: "Update bird count to calculate laying percentage.",
        };
      } else if (totalPieces === 0) {
        performanceStatus = {
          label: "0 Eggs Recorded",
          tone: "slate",
          detail: "No egg collection recorded in this period.",
        };
      } else {
        const layingRate = (totalPieces / (liveBirds * daysCount)) * 100;
        if (isLayer) {
          if (layingRate >= 70) {
            performanceStatus = {
              label: `Top Layer (${layingRate.toFixed(1)}%)`,
              tone: "forest",
              detail: `High laying rate within commercial peak expectation (70% – 85%).`,
            };
          } else if (layingRate >= 50) {
            performanceStatus = {
              label: `Healthy Yield (${layingRate.toFixed(1)}%)`,
              tone: "green",
              detail: `Steady laying rate for flock of ${liveBirds} birds.`,
            };
          } else {
            performanceStatus = {
              label: `Lower Yield (${layingRate.toFixed(1)}%)`,
              tone: "amber",
              detail: `Laying rate of ${layingRate.toFixed(1)}% is below expected standard for active layers. Check feed or lighting.`,
            };
          }
        } else {
          // Kienyeji / indigenous dual purpose
          if (layingRate >= 40) {
            performanceStatus = {
              label: `Strong Kienyeji (${layingRate.toFixed(1)}%)`,
              tone: "forest",
              detail: `Above typical indigenous laying percentage (30% – 45%).`,
            };
          } else {
            performanceStatus = {
              label: `Dual-Purpose (${layingRate.toFixed(1)}%)`,
              tone: "slate",
              detail: `Standard laying rate for dual-purpose birds.`,
            };
          }
        }
      }

      return {
        batch,
        trays,
        pieces,
        totalPieces,
        totalTraysEquivalent,
        dailyAvgTrays,
        comparison,
        liveBirds,
        performanceStatus,
        recordsCount: batchRecords.length,
      };
    });
  }, [poultryBatches, periodRecords, prevPeriodRecords, period]);

  // Per-Animal Cattle Milk Production Calculations
  const cattleSummaries = useMemo(() => {
    const daysCount = Math.max(1, period.daysCount);

    // Compute all cattle records first
    const cattleResults = livestockList.map((animal) => {
      const animalRecords = periodRecords.filter((r) => {
        if (r.type !== "milk" && r.unit !== "litres") return false;
        if (r.targetId && r.targetId === animal.id) return true;
        if (r.groupName && animal.name && r.groupName.trim().toLowerCase() === animal.name.trim().toLowerCase()) return true;
        return false;
      });

      const prevAnimalRecords = prevPeriodRecords.filter((r) => {
        if (r.type !== "milk" && r.unit !== "litres") return false;
        if (r.targetId && r.targetId === animal.id) return true;
        if (r.groupName && animal.name && r.groupName.trim().toLowerCase() === animal.name.trim().toLowerCase()) return true;
        return false;
      });

      const totalMilk = animalRecords.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0);
      const prevMilk = prevAnimalRecords.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0);
      const dailyAvgMilk = totalMilk / daysCount;
      const comparison = calculateComparison(totalMilk, prevMilk);

      return {
        animal,
        totalMilk,
        dailyAvgMilk,
        comparison,
        recordsCount: animalRecords.length,
      };
    });

    // Calculate herd average for milking cows
    const milkingCows = cattleResults.filter((c) => c.totalMilk > 0);
    const herdDailySum = milkingCows.reduce((sum, c) => sum + c.dailyAvgMilk, 0);
    const herdAvgDaily = milkingCows.length > 0 ? herdDailySum / milkingCows.length : 0;

    return cattleResults.map((c) => {
      let performanceStatus: { label: string; tone: "forest" | "green" | "amber" | "slate" | "blue"; detail: string };

      if (c.animal.category === "calf" || c.animal.category === "bull" || c.animal.sex === "male") {
        performanceStatus = {
          label: c.animal.category === "bull" ? "Breeding Bull" : "Young Stock",
          tone: "slate",
          detail: "Non-milking animal category.",
        };
      } else if (c.totalMilk === 0) {
        performanceStatus = {
          label: "Dry / No Milk",
          tone: "slate",
          detail: "No milk recorded during this period. Cow may be dry, in gestation, or unrecorded.",
        };
      } else if (milkingCows.length <= 1) {
        performanceStatus = {
          label: `Single Milking Cow`,
          tone: "blue",
          detail: `Yielding an average of ${c.dailyAvgMilk.toFixed(1)} L/day.`,
        };
      } else {
        if (c.dailyAvgMilk >= herdAvgDaily * 1.15) {
          const pct = Math.round(((c.dailyAvgMilk - herdAvgDaily) / herdAvgDaily) * 100);
          performanceStatus = {
            label: `Top Producer (+${pct}%)`,
            tone: "forest",
            detail: `Yielding ${c.dailyAvgMilk.toFixed(1)} L/day compared to herd average of ${herdAvgDaily.toFixed(1)} L/day.`,
          };
        } else if (c.dailyAvgMilk <= herdAvgDaily * 0.85) {
          performanceStatus = {
            label: `Lower than Herd Avg`,
            tone: "amber",
            detail: `Yielding ${c.dailyAvgMilk.toFixed(1)} L/day (herd average: ${herdAvgDaily.toFixed(1)} L/day). Check nutrition or health.`,
          };
        } else {
          performanceStatus = {
            label: `Steady Producer`,
            tone: "green",
            detail: `Yielding ${c.dailyAvgMilk.toFixed(1)} L/day, aligned with herd average of ${herdAvgDaily.toFixed(1)} L/day.`,
          };
        }
      }

      return {
        ...c,
        herdAvgDaily,
        performanceStatus,
      };
    });
  }, [livestockList, periodRecords, prevPeriodRecords, period]);

  // Overall Production Trend Chart Points
  const overallChartPoints = useMemo<ChartPoint[]>(() => {
    if (periodMode === "year") {
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const milkTotals = new Array(12).fill(0);
      const eggTotals = new Array(12).fill(0);

      for (const r of periodRecords) {
        const monthIdx = parseInt(r.date.slice(5, 7), 10) - 1;
        if (monthIdx >= 0 && monthIdx < 12) {
          const qty = Number(r.quantity) || 0;
          if (r.type === "milk" || r.unit === "litres") {
            milkTotals[monthIdx] += qty;
          } else {
            eggTotals[monthIdx] += r.unit === "trays" ? qty : qty / DEFAULT_TRAY_SIZE;
          }
        }
      }

      return months.map((m, idx) => ({
        label: m,
        value: milkTotals[idx] + eggTotals[idx],
        tone: "green" as const,
      }));
    } else {
      const dayMap = new Map<string, { milk: number; eggs: number }>();
      const start = new Date(`${period.from}T00:00:00`);
      const end = new Date(`${period.to}T00:00:00`);
      const cur = new Date(start);
      let safety = 0;

      while (cur <= end && safety < 35) {
        const dStr = cur.toISOString().slice(0, 10);
        dayMap.set(dStr, { milk: 0, eggs: 0 });
        cur.setDate(cur.getDate() + 1);
        safety++;
      }

      for (const r of periodRecords) {
        const curDay = dayMap.get(r.date);
        if (curDay) {
          const qty = Number(r.quantity) || 0;
          if (r.type === "milk" || r.unit === "litres") {
            curDay.milk += qty;
          } else {
            curDay.eggs += r.unit === "trays" ? qty : qty / DEFAULT_TRAY_SIZE;
          }
        }
      }

      return Array.from(dayMap.entries()).map(([d, val]) => {
        const parts = d.split("-");
        const shortLabel = parts.length === 3 ? `${parts[1]}/${parts[2]}` : d;
        return {
          label: shortLabel,
          value: val.milk + val.eggs,
          tone: "green" as const,
        };
      });
    }
  }, [periodRecords, period, periodMode]);

  // Last 7 days combined production trend for Today comparison
  const last7DaysProdPoints = useMemo<ChartPoint[]>(() => {
    const today = period.to;
    const points: ChartPoint[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = addDaysToDateStr(today, -i);
      const dayRecs = records.filter((r) => (r.date || "").slice(0, 10) === d);
      let milk = 0;
      let eggs = 0;
      for (const r of dayRecs) {
        const qty = Number(r.quantity) || 0;
        if (r.type === "milk" || r.unit === "litres") {
          milk += qty;
        } else {
          eggs += r.unit === "trays" ? qty : qty / DEFAULT_TRAY_SIZE;
        }
      }
      points.push({
        label: i === 0 ? "Today" : d.slice(5),
        value: Math.round((milk + eggs) * 10) / 10,
        tone: "green",
      });
    }
    return points;
  }, [records, period.to]);

  // Open Individual Animal Production Modal
  function openAnimalModal(animal: LivestockAnimal) {
    setSelectedTarget({ type: "cattle", animal });
    setIsModalOpen(true);
  }

  // Open Individual Poultry Batch Production Modal
  function openBatchModal(batch: PoultryBatch) {
    setSelectedTarget({ type: "poultry", batch });
    setIsModalOpen(true);
  }

  // Handle Save Record in General Form
  async function handleSaveGeneralRecord(e: React.FormEvent) {
    e.preventDefault();
    const qty = parseFloat(formQuantity);
    if (isNaN(qty) || qty <= 0) {
      setErrorMsg("Please enter a valid production quantity.");
      return;
    }

    setSaving(true);
    setErrorMsg("");

    try {
      let resolvedTargetId = formTargetId;
      let resolvedGroupName = formGroupName;

      if (formAnimalType === "Cattle" && formTargetId) {
        const animal = livestockList.find((a) => a.id === formTargetId);
        if (animal) resolvedGroupName = animal.name;
      } else if (formAnimalType === "Poultry" && formTargetId) {
        const batch = poultryBatches.find((b) => b.id === formTargetId);
        if (batch) resolvedGroupName = batch.breed;
      }

      const payload = {
        type: formType,
        quantity: qty,
        unit: formUnit,
        date: formDate,
        destination: formDestination || "produced",
        sellingPrice: parseFloat(formSellingPrice) || 0,
        animalType: formAnimalType,
        groupName: resolvedGroupName.trim(),
        targetId: resolvedTargetId,
        notes: formNotes.trim(),
      };

      if (editingRecordId) {
        await updateProduction(editingRecordId, payload);
        setSuccessMsg(`✓ Updated production record (${qty} ${formUnit})`);
      } else {
        await addProduction(payload);
        setSuccessMsg(`✓ Recorded ${qty} ${formUnit} of ${formType}`);
      }

      // Reset
      setFormQuantity("");
      setFormNotes("");
      setFormSellingPrice("");
      setEditingRecordId(null);
      setIsGeneralFormOpen(false);

      await refreshData();
    } catch (err) {
      console.error(err);
      setErrorMsg(err instanceof Error ? err.message : "Failed to save production record.");
    } finally {
      setSaving(false);
    }
  }

  // Start Edit on an existing record
  function handleStartEdit(r: ProductionRecord) {
    setEditingRecordId(r.id);
    setFormDate(r.date);
    setFormType((r.type === "milk" ? "milk" : "eggs") as "eggs" | "milk");
    setFormQuantity(String(r.quantity));
    setFormUnit(r.unit);
    setFormAnimalType(r.animalType || (r.type === "milk" ? "Cattle" : "Poultry"));
    setFormTargetId(r.targetId || "");
    setFormGroupName(r.groupName || "");
    setFormDestination(r.destination || "produced");
    setFormSellingPrice(r.sellingPrice ? String(r.sellingPrice) : "");
    setFormNotes(r.notes || "");
    setIsGeneralFormOpen(true);
  }

  // Handle Delete Record
  async function handleDeleteRecord(id: string) {
    setSaving(true);
    setErrorMsg("");
    try {
      await deleteProduction(id);
      setDeleteConfirm(null);
      setSuccessMsg("✓ Production record deleted successfully.");
      await refreshData();
    } catch (err) {
      console.error(err);
      setErrorMsg(err instanceof Error ? err.message : "Failed to delete record.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="kf-page">
      <div className="kf-stack">
        {/* Page Header */}
        <PageHeader
          title="Production Tracking & Decision Support"
          description="Track farm-wide totals, individual cattle milk yields, and poultry batch egg production with decision support analytics."
          actions={
            <div className="kf-row">
              <Button
                variant="primary"
                icon={<Plus size={16} />}
                onClick={() => {
                  setEditingRecordId(null);
                  setFormDate(todayStr);
                  setFormQuantity("");
                  setFormNotes("");
                  setFormSellingPrice("");
                  setIsGeneralFormOpen(true);
                }}
              >
                Record Farm Yield
              </Button>
            </div>
          }
        />

        {/* Global Alerts */}
        {errorMsg && <ErrorBanner message={errorMsg} />}
        {successMsg && (
          <Notice tone="success">
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <CheckCircle2 size={16} />
              <span>{successMsg}</span>
            </div>
          </Notice>
        )}

        {/* Reusable Date Period Selector */}
        <DatePeriodFilter
          mode={periodMode}
          offset={periodOffset}
          customFrom={customFrom}
          customTo={customTo}
          periodInfo={period}
          onModeChange={setPeriodMode}
          onOffsetChange={setPeriodOffset}
          onCustomRangeChange={setCustomRange}
          onReset={resetPeriod}
        />

        {/* View Switcher Segmented Control */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
          <Segmented
            options={VIEW_TABS}
            value={activeTab}
            onChange={setActiveTab}
            label="Production Views"
          />
          <span style={{ fontSize: "12.5px", color: "var(--kf-text-muted)" }}>
            Period: <strong>{period.label}</strong> ({period.daysCount} days)
          </span>
        </div>

        {/* 1. FARM PRODUCTION SUMMARY (OVERVIEW) */}
        {(activeTab === "all" || activeTab === "records") && (
          <Panel
            title="Farm Production Summary"
            subtitle={`Automatically aggregated from individual animals and poultry batches for ${period.label}.`}
          >
            <div className="kf-grid kf-grid--stats">
              <StatCard
                label={`Poultry Eggs (${period.label})`}
                value={`${farmTotals.eggTrays.toFixed(1)} trays`}
                hint={`= ${farmTotals.eggTotalPieces.toLocaleString()} individual eggs (@ 30/tray)${farmTotals.eggPieces > 0 ? ` + ${farmTotals.eggPieces} pcs` : ""}`}
                tone="forest"
                icon={<Egg size={22} />}
              />
              <StatCard
                label={`Cattle Milk (${period.label})`}
                value={`${farmTotals.milkLitres.toFixed(1)} L`}
                hint={farmTotals.milkComparison ? farmTotals.milkComparison.text : "No previous period data"}
                tone="forest"
                icon={<Milk size={22} />}
              />
              <StatCard
                label="Daily Milk Average"
                value={`${farmTotals.avgDailyMilk.toFixed(1)} L/day`}
                hint={`Across ${farmTotals.daysCount} calendar days`}
                tone="green"
                icon={<TrendingUp size={22} />}
              />
              <StatCard
                label="Daily Egg Average"
                value={`${farmTotals.avgDailyTrays.toFixed(1)} trays/day`}
                hint={`= ${Math.round(farmTotals.avgDailyTrays * DEFAULT_TRAY_SIZE)} eggs per day`}
                tone="green"
                icon={<TrendingUp size={22} />}
              />
            </div>

            {/* Overall Production Chart */}
            <div style={{ marginTop: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                <strong style={{ fontSize: "13.5px" }}>Combined Daily Production Trends</strong>
                <span style={{ fontSize: "12px", color: "var(--kf-text-muted)" }}>{period.label}</span>
              </div>
              {period.daysCount === 1 ? (
                farmTotals.totalRecordsCount === 0 ? (
                  <div>
                    <EmptyState
                      title={`No production recorded yet for ${period.label}`}
                      description="No eggs or milk collected yet for today. Use the buttons below to record today's collection."
                    />
                    <div style={{ marginTop: "16px", borderTop: "1px solid var(--kf-border, #e2e8f0)", paddingTop: "14px" }}>
                      <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--kf-text, #1e293b)", marginBottom: "8px" }}>
                        Recent 7-Day Production Context (Milk L + Egg Equiv)
                      </div>
                      <LineChart
                        data={last7DaysProdPoints}
                        height={180}
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
                        <div style={{ fontSize: "12px", color: "var(--kf-text-muted)" }}>Cattle Milk (Today)</div>
                        <div style={{ fontSize: "18px", fontWeight: 700, color: "var(--kf-primary, #15803d)" }}>
                          {farmTotals.milkLitres.toFixed(1)} Litres
                        </div>
                        <div style={{ fontSize: "11px", color: "var(--kf-text-muted)" }}>Fresh milk collected</div>
                      </div>

                      <div style={{
                        padding: "12px 14px",
                        borderRadius: "10px",
                        background: "var(--kf-surface-alt, #f8fafc)",
                        border: "1px solid var(--kf-border, #e2e8f0)",
                      }}>
                        <div style={{ fontSize: "12px", color: "var(--kf-text-muted)" }}>Poultry Eggs (Today)</div>
                        <div style={{ fontSize: "18px", fontWeight: 700, color: "var(--kf-primary, #15803d)" }}>
                          {farmTotals.eggTrays.toFixed(1)} Trays
                        </div>
                        <div style={{ fontSize: "11px", color: "var(--kf-text-muted)" }}>
                          {farmTotals.eggTotalPieces.toLocaleString()} pieces
                        </div>
                      </div>
                    </div>

                    <div style={{ borderTop: "1px solid var(--kf-border, #e2e8f0)", paddingTop: "14px" }}>
                      <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--kf-text, #1e293b)", marginBottom: "8px" }}>
                        Recent 7-Day Production Context (Milk L + Egg Equiv)
                      </div>
                      <LineChart
                        data={last7DaysProdPoints}
                        height={180}
                      />
                    </div>
                  </div>
                )
              ) : overallChartPoints.length > 0 && farmTotals.totalRecordsCount > 0 ? (
                <BarChart data={overallChartPoints} />
              ) : (
                <EmptyState
                  title={`No production recorded for ${period.label}`}
                  description="No milk or egg yields logged during this time period."
                />
              )}
            </div>
          </Panel>
        )}

        {/* 2. POULTRY PRODUCTION (BATCH-LEVEL TRACKING) */}
        {(activeTab === "all" || activeTab === "poultry") && (
          <Panel
            title={`Poultry Batch Production (${poultryBatchSummaries.length} Batches)`}
            subtitle="Track egg yields, laying percentage, and productivity per batch. Select any batch to record eggs or view history."
            actions={
              <Button
                variant="ghost"
                size="sm"
                icon={<Plus size={14} />}
                onClick={() => {
                  setFormAnimalType("Poultry");
                  setFormType("eggs");
                  setFormUnit("trays");
                  setIsGeneralFormOpen(true);
                }}
              >
                Record Poultry Yield
              </Button>
            }
          >
            {poultryBatchSummaries.length === 0 ? (
              <EmptyState
                icon={<Bird size={28} />}
                title="No poultry batches found"
                description="Add your chicken batches in the Poultry section to track batch-level egg yields."
              />
            ) : (
              <div className="kf-table-wrap">
                <table className="kf-table">
                  <thead>
                    <tr>
                      <th>Batch / Flock</th>
                      <th>Purpose & Stage</th>
                      <th>Population</th>
                      <th>Period Eggs</th>
                      <th>Daily Avg</th>
                      <th>Laying Status / Performance</th>
                      <th>Trend</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {poultryBatchSummaries.map((s) => (
                      <tr key={s.batch.id}>
                        <td>
                          <strong>{s.batch.breed}</strong>
                          <div style={{ fontSize: "11.5px", color: "var(--kf-text-muted)" }}>
                            Age: {formatAnimalAge(s.batch.hatchDate, "poultry", { legacyAgeWeeks: s.batch.ageWeeks, isEstimated: s.batch.isHatchDateEstimated }).formatted}
                          </div>
                        </td>
                        <td>
                          <Badge tone="blue">{s.batch.purpose || "Eggs"}</Badge>
                          <div style={{ fontSize: "11.5px", color: "var(--kf-text-muted)", marginTop: "2px" }}>
                            {s.batch.stage || "Adult"}
                          </div>
                        </td>
                        <td>
                          <strong>{s.liveBirds.toLocaleString()}</strong> birds
                        </td>
                        <td>
                          <strong style={{ color: "var(--kf-forest)" }}>
                            {s.trays.toFixed(1)} trays
                          </strong>
                          <div style={{ fontSize: "11.5px", color: "var(--kf-text-muted)" }}>
                            = {s.totalPieces.toLocaleString()} eggs
                          </div>
                        </td>
                        <td>
                          {s.dailyAvgTrays.toFixed(1)} trays/d
                        </td>
                        <td>
                          <Badge tone={s.performanceStatus.tone}>
                            {s.performanceStatus.label}
                          </Badge>
                          <div style={{ fontSize: "11px", color: "var(--kf-text-muted)", marginTop: "2px", maxWidth: "220px" }}>
                            {s.performanceStatus.detail}
                          </div>
                        </td>
                        <td>
                          <span
                            style={{
                              color: s.comparison.diff >= 0 ? "var(--kf-forest)" : "var(--kf-danger)",
                              fontWeight: 600,
                              fontSize: "12px",
                            }}
                          >
                            {s.comparison.text}
                          </span>
                        </td>
                        <td>
                          <div className="kf-actions-cell">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => openBatchModal(s.batch)}
                            >
                              View Details
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              icon={<Plus size={13} />}
                              onClick={() => openBatchModal(s.batch)}
                            >
                              Record Eggs
                            </Button>
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

        {/* 3. CATTLE PRODUCTION (INDIVIDUAL ANIMAL TRACKING) */}
        {(activeTab === "all" || activeTab === "cattle") && (
          <Panel
            title={`Cattle Herd Production (${cattleSummaries.length} Animals)`}
            subtitle="Track milk yield per individual cow. Select any animal to view her production history, trends, and record milk."
            actions={
              <Button
                variant="ghost"
                size="sm"
                icon={<Plus size={14} />}
                onClick={() => {
                  setFormAnimalType("Cattle");
                  setFormType("milk");
                  setFormUnit("litres");
                  setIsGeneralFormOpen(true);
                }}
              >
                Record Cattle Milk
              </Button>
            }
          >
            {cattleSummaries.length === 0 ? (
              <EmptyState
                icon={<Beef size={28} />}
                title="No cattle found"
                description="Add your cattle in the Animals / Livestock section to track individual milk yields."
              />
            ) : (
              <div className="kf-table-wrap">
                <table className="kf-table">
                  <thead>
                    <tr>
                      <th>Animal Name</th>
                      <th>Tag & Breed</th>
                      <th>Category</th>
                      <th>Period Milk</th>
                      <th>Daily Average</th>
                      <th>Herd Comparison / Status</th>
                      <th>Trend</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cattleSummaries.map((c) => (
                      <tr key={c.animal.id}>
                        <td>
                          <strong>{c.animal.name}</strong>
                          <div style={{ fontSize: "11.5px", color: "var(--kf-text-muted)" }}>
                            {formatAnimalAge(c.animal.dateOfBirth, "cattle", { legacyAgeYears: c.animal.ageYears, isEstimated: c.animal.isBirthDateEstimated }).formatted} • {c.animal.sex === "male" ? "Male" : "Female"}
                          </div>
                        </td>
                        <td>
                          <span style={{ fontFamily: "monospace" }}>
                            {c.animal.tagNumber || `#${c.animal.id.slice(0, 6)}`}
                          </span>
                          <div style={{ fontSize: "11.5px", color: "var(--kf-text-muted)" }}>
                            {c.animal.breed}
                          </div>
                        </td>
                        <td>
                          <Badge tone="slate">{c.animal.category || "Cow"}</Badge>
                        </td>
                        <td>
                          <strong style={{ color: "var(--kf-forest)", fontSize: "14px" }}>
                            {c.totalMilk.toFixed(1)} L
                          </strong>
                        </td>
                        <td>
                          <strong>{c.dailyAvgMilk.toFixed(1)} L/day</strong>
                        </td>
                        <td>
                          <Badge tone={c.performanceStatus.tone}>
                            {c.performanceStatus.label}
                          </Badge>
                          <div style={{ fontSize: "11px", color: "var(--kf-text-muted)", marginTop: "2px", maxWidth: "220px" }}>
                            {c.performanceStatus.detail}
                          </div>
                        </td>
                        <td>
                          <span
                            style={{
                              color: c.comparison.diff >= 0 ? "var(--kf-forest)" : "var(--kf-danger)",
                              fontWeight: 600,
                              fontSize: "12px",
                            }}
                          >
                            {c.comparison.text}
                          </span>
                        </td>
                        <td>
                          <div className="kf-actions-cell">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => openAnimalModal(c.animal)}
                            >
                              View Details
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              icon={<Plus size={13} />}
                              onClick={() => openAnimalModal(c.animal)}
                            >
                              Record Milk
                            </Button>
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

        {/* 4. ALL SAVED PRODUCTION RECORDS (FILTERED LOG) */}
        {(activeTab === "all" || activeTab === "records") && (
          <Panel
            title={`Individual Saved Production Records (${periodRecords.length})`}
            subtitle={`Chronological log of all recorded yields for ${period.label}.`}
          >
            {periodRecords.length === 0 ? (
              <EmptyState
                icon={<ClipboardList size={28} />}
                title="No production records for this period"
                description="Click 'Record Farm Yield' or select an animal/batch to add your first yield."
              />
            ) : (
              <div className="kf-table-wrap">
                <table className="kf-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Animal / Batch</th>
                      <th>Product</th>
                      <th>Quantity</th>
                      <th>Equivalent</th>
                      <th>Destination</th>
                      <th>Notes</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {periodRecords.map((r) => {
                      const isMilk = r.type === "milk" || r.unit === "litres";
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
                            <strong>{r.groupName || r.animalType || "Farm General"}</strong>
                            {r.targetId && (
                              <div style={{ fontSize: "10.5px", color: "var(--kf-text-muted)" }}>
                                ID: {r.targetId.slice(0, 8)}…
                              </div>
                            )}
                          </td>
                          <td>
                            <Badge tone={isMilk ? "forest" : "green"}>
                              {isMilk ? "Cattle Milk" : "Poultry Eggs"}
                            </Badge>
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
                                onClick={() => setDeleteConfirm({ id: r.id })}
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
          </Panel>
        )}
      </div>

      {/* INDIVIDUAL ANIMAL / BATCH PRODUCTION MODAL */}
      <AnimalProductionModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        target={selectedTarget}
        records={records}
        onRecordSaved={refreshData}
        initialPeriodMode={periodMode}
        initialPeriodOffset={periodOffset}
        allLivestock={livestockList}
        allPoultry={poultryBatches}
      />

      {/* GENERAL RECORD PRODUCTION MODAL */}
      <Modal
        open={isGeneralFormOpen}
        onClose={() => {
          setIsGeneralFormOpen(false);
          setEditingRecordId(null);
        }}
        title={editingRecordId ? "Edit Production Record" : "Record Farm Production"}
        subtitle="Associate production with an individual cattle animal or a poultry batch."
        size="md"
        footer={
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", width: "100%" }}>
            <Button
              variant="ghost"
              onClick={() => {
                setIsGeneralFormOpen(false);
                setEditingRecordId(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={saving}
              onClick={handleSaveGeneralRecord}
            >
              {editingRecordId ? "Update Record" : "Save Production"}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSaveGeneralRecord} className="kf-stack--sm">
          <div className="kf-grid kf-grid--2">
            <Field label="Animal Enterprise" htmlFor="gen-animal-type" required>
              <select
                id="gen-animal-type"
                value={formAnimalType}
                onChange={(e) => {
                  const val = e.target.value;
                  setFormAnimalType(val);
                  if (val === "Cattle") {
                    setFormType("milk");
                    setFormUnit("litres");
                  } else {
                    setFormType("eggs");
                    setFormUnit("trays");
                  }
                  setFormTargetId("");
                }}
              >
                <option value="Poultry">Poultry (Eggs)</option>
                <option value="Cattle">Cattle (Milk)</option>
              </select>
            </Field>

            <Field
              label={formAnimalType === "Cattle" ? "Select Cattle Animal" : "Select Poultry Batch"}
              htmlFor="gen-target-id"
            >
              {formAnimalType === "Cattle" ? (
                <select
                  id="gen-target-id"
                  value={formTargetId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setFormTargetId(id);
                    const a = livestockList.find((l) => l.id === id);
                    if (a) setFormGroupName(a.name);
                  }}
                >
                  <option value="">-- General Herd / Multiple Cows --</option>
                  {livestockList.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.breed || "Cattle"} • {a.category || "Cow"})
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  id="gen-target-id"
                  value={formTargetId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setFormTargetId(id);
                    const b = poultryBatches.find((p) => p.id === id);
                    if (b) setFormGroupName(b.breed);
                  }}
                >
                  <option value="">-- General Flock / Multiple Batches --</option>
                  {poultryBatches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.breed} ({b.purpose || "Eggs"} • {(b.currentCount || b.initialCount).toLocaleString()} birds)
                    </option>
                  ))}
                </select>
              )}
            </Field>
          </div>

          <div className="kf-grid kf-grid--2">
            <Field label="Production Date" htmlFor="gen-date" required>
              <input
                id="gen-date"
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                required
              />
            </Field>

            <Field label="Quantity" htmlFor="gen-qty" required>
              <input
                id="gen-qty"
                type="number"
                step="0.1"
                min="0.1"
                placeholder={formType === "milk" ? "e.g. 15 L" : "e.g. 5 or 2.5 trays"}
                value={formQuantity}
                onChange={(e) => setFormQuantity(e.target.value)}
                required
              />
              {formType === "eggs" && formUnit === "trays" && parseFloat(formQuantity) > 0 && (
                <span style={{ fontSize: "11px", color: "var(--kf-primary)", display: "block", marginTop: "2px" }}>
                  = {Math.round(parseFloat(formQuantity) * DEFAULT_TRAY_SIZE)} eggs (@ 30/tray)
                </span>
              )}
            </Field>
          </div>

          <div className="kf-grid kf-grid--2">
            <Field label="Unit" htmlFor="gen-unit">
              {formType === "milk" ? (
                <input id="gen-unit" type="text" value="litres" disabled />
              ) : (
                <select
                  id="gen-unit"
                  value={formUnit}
                  onChange={(e) => setFormUnit(e.target.value)}
                >
                  <option value="trays">Trays (default 30 eggs/tray)</option>
                  <option value="pieces">Pieces (individual eggs)</option>
                </select>
              )}
            </Field>

            <Field label="Destination" htmlFor="gen-dest">
              <select
                id="gen-dest"
                value={formDestination}
                onChange={(e) => setFormDestination(e.target.value)}
              >
                <option value="produced">Produced / Farm Store</option>
                <option value="sold">Sold</option>
                <option value="home_use">Home / Staff Use</option>
                <option value="damaged">Damaged / Discarded</option>
              </select>
            </Field>
          </div>

          <div className="kf-grid kf-grid--2">
            <Field label="Selling Price (KES, if sold)" htmlFor="gen-price">
              <input
                id="gen-price"
                type="number"
                placeholder="e.g. 450"
                value={formSellingPrice}
                onChange={(e) => setFormSellingPrice(e.target.value)}
              />
            </Field>

            <Field label="Notes / Observations" htmlFor="gen-notes">
              <input
                id="gen-notes"
                type="text"
                placeholder="e.g. Morning collection"
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
              />
            </Field>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <Modal
          open={!!deleteConfirm}
          onClose={() => setDeleteConfirm(null)}
          title="Delete Production Record?"
          size="sm"
          footer={
            <>
              <Button variant="ghost" onClick={() => setDeleteConfirm(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                loading={saving}
                onClick={() => handleDeleteRecord(deleteConfirm.id)}
              >
                Delete Record
              </Button>
            </>
          }
        >
          <p style={{ margin: 0, fontSize: "14px" }}>
            Are you sure you want to delete this production record? Farm totals will update immediately.
          </p>
        </Modal>
      )}
    </div>
  );
}
