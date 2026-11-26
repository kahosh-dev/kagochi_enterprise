import { useEffect, useMemo, useState } from "react";
import {
  loadFeeding,
  addFeeding,
  updateFeeding,
  deleteFeeding,
  loadPoultry,
  loadLivestock,
  loadFeedTypes,
  addFeedType,
  updateFeedType,
  deleteFeedType,
} from "../services/storage";
import type {
  FeedingRecord,
  PoultryBatch,
  LivestockAnimal,
  FeedType,
} from "../types/farm";
import {
  Wheat,
  Plus,
  Pencil,
  Trash2,
  TrendingUp,
  Scale,
  Settings,
  Eye,
  EyeOff,
  AlertTriangle,
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
  Badge,
} from "../components/ui";
import { SearchableSelect } from "../components/SearchableSelect";
import { BarChart, LineChart, type ChartPoint } from "../components/Chart";
import DatePeriodFilter from "../components/DatePeriodFilter";
import {
  calculateComparison,
  formatDisplayDate,
  getLocalDateString,
  isRecordInDateRange,
  addDaysToDateStr,
} from "../utils/datePeriod";
import { formatCurrency, formatNumber } from "../utils/format";
import { usePeriod } from "../context/PeriodContext";

type AnimalFilter = "All" | "Poultry" | "Cattle";

const FEED_UNIT_OPTIONS = [
  { value: "kg", label: "kg (kilograms)" },
  { value: "bags", label: "bags" },
  { value: "bales", label: "bales" },
  { value: "wheelbarrows", label: "wheelbarrows" },
  { value: "litres", label: "litres" },
];

export default function FeedingView() {
  const [records, setRecords] = useState<FeedingRecord[]>([]);
  const [poultryBatches, setPoultryBatches] = useState<PoultryBatch[]>([]);
  const [livestockList, setLivestockList] = useState<LivestockAnimal[]>([]);
  const [feedTypes, setFeedTypes] = useState<FeedType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [animalFilter, setAnimalFilter] = useState<AnimalFilter>("All");

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
  const [animalType, setAnimalType] = useState<"Poultry" | "Cattle">("Poultry");
  const [selectedGroupId, setSelectedGroupId] = useState<string>("all");
  const [groupName, setGroupName] = useState<string>("Entire flock");
  const [customGroupName, setCustomGroupName] = useState<string>("");
  const [selectedFeedTypeId, setSelectedFeedTypeId] = useState<string>("");
  const [feedType, setFeedType] = useState<string>("");
  const [customFeedType, setCustomFeedType] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("");
  const [unit, setUnit] = useState<string>("kg");
  const [date, setDate] = useState<string>(todayStr);
  const [cost, setCost] = useState<string>("");
  const [selectedSupplier, setSelectedSupplier] = useState<string>("");
  const [customSupplier, setCustomSupplier] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  // Settings modal state
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [settingsAnimalType, setSettingsAnimalType] = useState<"poultry" | "cattle">("poultry");
  const [isAddingFeedType, setIsAddingFeedType] = useState<boolean>(false);
  const [newFtName, setNewFtName] = useState<string>("");
  const [newFtCategory, setNewFtCategory] = useState<string>("");
  const [newFtUnit, setNewFtUnit] = useState<"kg" | "bags" | "bales" | "wheelbarrows" | "litres">("kg");
  const [editingFtId, setEditingFtId] = useState<string | null>(null);

  const [errorMsg, setErrorMsg] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string>("");

  async function refreshData() {
    try {
      setLoading(true);
      const [feedingData, poultryData, livestockData, feedTypesData] = await Promise.all([
        loadFeeding(),
        loadPoultry().catch(() => []),
        loadLivestock().catch(() => []),
        loadFeedTypes().catch(() => []),
      ]);
      setRecords(feedingData);
      setPoultryBatches(poultryData);
      setLivestockList(livestockData);
      setFeedTypes(feedTypesData);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : "Failed to load feeding data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshData();
  }, []);

  // Filter records within current period
  const currentPeriodRecords = useMemo(() => {
    return records.filter((r) => isRecordInDateRange(r.date, periodInfo.from, periodInfo.to));
  }, [records, periodInfo.from, periodInfo.to]);

  // Filter records within previous period for trend comparisons
  const previousPeriodRecords = useMemo(() => {
    return records.filter((r) => isRecordInDateRange(r.date, periodInfo.previousFrom, periodInfo.previousTo));
  }, [records, periodInfo.previousFrom, periodInfo.previousTo]);

  // Unit-safe aggregations: Incompatible units are kept separate in totals!
  const totalKg = useMemo(() => {
    return currentPeriodRecords
      .filter((r) => r.unit.toLowerCase() === "kg")
      .reduce((s, r) => s + Number(r.quantity || 0), 0);
  }, [currentPeriodRecords]);

  const totalBags = useMemo(() => {
    return currentPeriodRecords
      .filter((r) => r.unit.toLowerCase() === "bags")
      .reduce((s, r) => s + Number(r.quantity || 0), 0);
  }, [currentPeriodRecords]);

  const totalBales = useMemo(() => {
    return currentPeriodRecords
      .filter((r) => r.unit.toLowerCase() === "bales")
      .reduce((s, r) => s + Number(r.quantity || 0), 0);
  }, [currentPeriodRecords]);

  const totalWheelbarrows = useMemo(() => {
    return currentPeriodRecords
      .filter((r) => r.unit.toLowerCase() === "wheelbarrows")
      .reduce((s, r) => s + Number(r.quantity || 0), 0);
  }, [currentPeriodRecords]);

  const totalLitres = useMemo(() => {
    return currentPeriodRecords
      .filter((r) => r.unit.toLowerCase() === "litres" || r.unit.toLowerCase() === "l")
      .reduce((s, r) => s + Number(r.quantity || 0), 0);
  }, [currentPeriodRecords]);

  const totalPeriodCost = useMemo(() => {
    return currentPeriodRecords.reduce((s, r) => s + Number(r.cost ?? 0), 0);
  }, [currentPeriodRecords]);

  // Previous period totals for comparison
  const prevTotalKg = useMemo(() => {
    return previousPeriodRecords
      .filter((r) => r.unit.toLowerCase() === "kg")
      .reduce((s, r) => s + Number(r.quantity || 0), 0);
  }, [previousPeriodRecords]);

  const prevTotalCost = useMemo(() => {
    return previousPeriodRecords.reduce((s, r) => s + Number(r.cost ?? 0), 0);
  }, [previousPeriodRecords]);

  const kgComparison = useMemo(() => {
    return calculateComparison(totalKg, prevTotalKg);
  }, [totalKg, prevTotalKg]);

  const costComparison = useMemo(() => {
    return calculateComparison(totalPeriodCost, prevTotalCost);
  }, [totalPeriodCost, prevTotalCost]);

  // Daily averages
  const avgKgPerDay = useMemo(() => {
    if (periodInfo.daysCount <= 0) return 0;
    return Math.round((totalKg / periodInfo.daysCount) * 10) / 10;
  }, [totalKg, periodInfo.daysCount]);

  // Active animals/flocks of chosen type on the record date
  const groupOptions = useMemo(() => {
    const isPoultry = animalType === "Poultry";
    const entireOption = {
      value: "all",
      label: isPoultry ? "Entire flock (all birds)" : "Entire herd (all cattle)",
      sublabel: isPoultry ? "Feed shared across all poultry" : "Feed shared across all cattle",
      badge: "Herd/Flock",
    };

    if (isPoultry) {
      const activeBatches = poultryBatches.filter((b) => {
        if (b.currentCount <= 0) return false;
        const addDate = b.dateAdded ? b.dateAdded.slice(0, 10) : "";
        const hatch = b.hatchDate ? b.hatchDate.slice(0, 10) : "";
        if (addDate && addDate > date) return false;
        if (hatch && hatch > date) return false;
        return true;
      });

      const batchOpts = activeBatches.map((b) => ({
        value: b.id,
        label: `${b.breed} Flock (${b.currentCount} birds)`,
        sublabel: `${b.purpose || "Poultry"} • ${b.stage || "Batch"}`,
        badge: `${b.currentCount} birds`,
      }));

      return [entireOption, ...batchOpts];
    } else {
      const activeCattle = livestockList.filter((a) => {
        if (a.status !== "active") return false;
        const addDate = a.dateAdded ? a.dateAdded.slice(0, 10) : "";
        const dob = a.dateOfBirth ? a.dateOfBirth.slice(0, 10) : "";
        if (addDate && addDate > date) return false;
        if (dob && dob > date) return false;
        return true;
      });

      const cattleOpts = activeCattle.map((a) => ({
        value: a.id,
        label: a.tagNumber ? `${a.name} (#${a.tagNumber})` : a.name,
        sublabel: `${a.breed || "Cattle"} • ${a.category || "Cow"}${a.tagNumber ? ` • Tag: ${a.tagNumber}` : ""}`,
        badge: a.category || "Cattle",
      }));

      return [entireOption, ...cattleOpts];
    }
  }, [animalType, poultryBatches, livestockList, date]);

  // Active feed types for chosen animal type, grouped by category
  const feedTypeOptions = useMemo(() => {
    const targetType = animalType.toLowerCase();
    const activeFeeds = feedTypes.filter(
      (ft) => ft.animalType.toLowerCase() === targetType && ft.isActive
    );

    // Sort by category then name
    const sorted = [...activeFeeds].sort((a, b) => {
      if (a.category !== b.category) return a.category.localeCompare(b.category);
      return a.name.localeCompare(b.name);
    });

    return sorted.map((ft) => ({
      value: ft.id,
      label: ft.name,
      sublabel: `Default unit: ${ft.defaultUnit}`,
      badge: ft.defaultUnit,
      group: ft.category,
    }));
  }, [feedTypes, animalType]);

  // Previously used suppliers
  const supplierOptions = useMemo(() => {
    const historical = Array.from(
      new Set(records.map((r) => r.supplier?.trim()).filter(Boolean))
    ) as string[];
    const defaults = ["Unga Farm Care", "Pembe Feeds", "Local Agrovet", "Farm Store"];
    const combined = Array.from(new Set([...defaults, ...historical]));
    return combined.map((s) => ({
      value: s,
      label: s,
    }));
  }, [records]);

  // Breakdowns by Feed Type
  const feedTypeBreakdown = useMemo(() => {
    const map = new Map<string, { feedType: string; totalKg: number; totalBags: number; totalBales: number; count: number }>();
    currentPeriodRecords.forEach((r) => {
      const ft = r.feedType || "General Feed";
      const entry = map.get(ft) || { feedType: ft, totalKg: 0, totalBags: 0, totalBales: 0, count: 0 };
      const u = r.unit.toLowerCase();
      if (u === "kg") entry.totalKg += Number(r.quantity);
      if (u === "bags") entry.totalBags += Number(r.quantity);
      if (u === "bales") entry.totalBales += Number(r.quantity);
      entry.count++;
      map.set(ft, entry);
    });
    return Array.from(map.values()).sort((a, b) => b.totalKg - a.totalKg);
  }, [currentPeriodRecords]);

  // Breakdown by Animal Group / Batch
  const groupBreakdown = useMemo(() => {
    const map = new Map<string, { groupName: string; animalType: string; totalKg: number; count: number }>();
    currentPeriodRecords.forEach((r) => {
      const g = r.groupName || `${r.animalType} (General)`;
      const entry = map.get(g) || { groupName: g, animalType: r.animalType, totalKg: 0, count: 0 };
      if (r.unit.toLowerCase() === "kg") entry.totalKg += Number(r.quantity);
      entry.count++;
      map.set(g, entry);
    });
    return Array.from(map.values()).sort((a, b) => b.totalKg - a.totalKg);
  }, [currentPeriodRecords]);

  // Trend Chart points for the selected period
  const chartData = useMemo<ChartPoint[]>(() => {
    if (currentPeriodRecords.length === 0) return [];

    if (periodMode === "year") {
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const year = periodInfo.from.slice(0, 4);
      return months.map((m, idx) => {
        const monthPrefix = `${year}-${String(idx + 1).padStart(2, "0")}`;
        const total = currentPeriodRecords
          .filter((r) => r.date.startsWith(monthPrefix) && r.unit.toLowerCase() === "kg")
          .reduce((sum, r) => sum + Number(r.quantity), 0);
        return { label: m, value: Math.round(total * 10) / 10 };
      });
    }

    const dateMap = new Map<string, number>();
    currentPeriodRecords.forEach((r) => {
      if (r.unit.toLowerCase() === "kg") {
        dateMap.set(r.date, (dateMap.get(r.date) || 0) + Number(r.quantity));
      }
    });

    return Array.from(dateMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([d, val]) => ({
        label: d.slice(5),
        value: Math.round(val * 10) / 10,
      }));
  }, [currentPeriodRecords, periodMode, periodInfo.from]);

  // Last 7 days feed consumption (kg) for Today comparison context
  const last7DaysFeedPoints = useMemo<ChartPoint[]>(() => {
    const today = periodInfo.to;
    const points: ChartPoint[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = addDaysToDateStr(today, -i);
      const kg = records
        .filter((r) => (r.date || "").slice(0, 10) === d && r.unit.toLowerCase() === "kg")
        .reduce((sum, r) => sum + Number(r.quantity || 0), 0);
      points.push({
        label: i === 0 ? "Today" : d.slice(5),
        value: Math.round(kg * 10) / 10,
      });
    }
    return points;
  }, [records, periodInfo.to]);

  // Table filtered records: within period + animal filter
  const filteredRecords = useMemo(() => {
    return currentPeriodRecords.filter((r) => {
      if (animalFilter === "All") return true;
      return r.animalType.toLowerCase() === animalFilter.toLowerCase();
    });
  }, [currentPeriodRecords, animalFilter]);

  // Reset form when changing animal type
  function handleAnimalTypeChange(newType: "Poultry" | "Cattle") {
    setAnimalType(newType);
    setSelectedGroupId("all");
    setGroupName(newType === "Poultry" ? "Entire flock" : "Entire herd");
    setCustomGroupName("");
    setSelectedFeedTypeId("");
    setFeedType("");
    setCustomFeedType("");
    setUnit("kg");
  }

  // Handle group select
  function handleGroupSelect(val: string) {
    setSelectedGroupId(val);
    if (val === "all") {
      setGroupName(animalType === "Poultry" ? "Entire flock" : "Entire herd");
    } else if (val === "__custom__") {
      setGroupName(customGroupName);
    } else {
      if (animalType === "Cattle") {
        const a = livestockList.find((l) => l.id === val);
        if (a) {
          const display = a.tagNumber ? `${a.name} (#${a.tagNumber})` : a.name;
          setGroupName(display);
        }
      } else {
        const b = poultryBatches.find((p) => p.id === val);
        if (b) {
          setGroupName(`${b.breed} Flock`);
        }
      }
    }
  }

  // Handle feed type select
  function handleFeedTypeSelect(val: string) {
    setSelectedFeedTypeId(val);
    if (val === "__custom__") {
      setFeedType(customFeedType);
    } else {
      const ft = feedTypes.find((f) => f.id === val);
      if (ft) {
        setFeedType(ft.name);
        setUnit(ft.defaultUnit);
      }
    }
  }

  function resetForm() {
    setEditingId(null);
    setAnimalType("Poultry");
    setSelectedGroupId("all");
    setGroupName("Entire flock");
    setCustomGroupName("");
    setSelectedFeedTypeId("");
    setFeedType("");
    setCustomFeedType("");
    setQuantity("");
    setUnit("kg");
    setDate(getLocalDateString());
    setCost("");
    setSelectedSupplier("");
    setCustomSupplier("");
    setNotes("");
    setErrorMsg("");
  }

  function startEdit(record: FeedingRecord) {
    setEditingId(record.id);
    const at = record.animalType.toLowerCase() === "cattle" ? "Cattle" : "Poultry";
    setAnimalType(at);

    // Match group
    if (!record.groupName || record.groupName === "Entire flock" || record.groupName === "Entire herd") {
      setSelectedGroupId("all");
      setGroupName(record.groupName || (at === "Poultry" ? "Entire flock" : "Entire herd"));
    } else {
      const matchCattle = livestockList.find((l) => l.name === record.groupName || `${l.name} (#${l.tagNumber})` === record.groupName);
      const matchPoultry = poultryBatches.find((b) => `${b.breed} Flock` === record.groupName || b.breed === record.groupName);
      if (matchCattle) {
        setSelectedGroupId(matchCattle.id);
        setGroupName(record.groupName);
      } else if (matchPoultry) {
        setSelectedGroupId(matchPoultry.id);
        setGroupName(record.groupName);
      } else {
        setSelectedGroupId("__custom__");
        setCustomGroupName(record.groupName);
        setGroupName(record.groupName);
      }
    }

    // Match feed type
    const matchFt = feedTypes.find((f) => f.name.toLowerCase() === record.feedType.toLowerCase());
    if (matchFt) {
      setSelectedFeedTypeId(matchFt.id);
      setFeedType(record.feedType);
    } else {
      setSelectedFeedTypeId("__custom__");
      setCustomFeedType(record.feedType);
      setFeedType(record.feedType);
    }

    setQuantity(String(record.quantity));
    setUnit(record.unit);
    setDate(record.date);
    setCost(record.cost != null && record.cost > 0 ? String(record.cost) : "");

    const sup = record.supplier?.trim() || "";
    if (supplierOptions.some((s) => s.value === sup)) {
      setSelectedSupplier(sup);
    } else if (sup) {
      setSelectedSupplier("__custom__");
      setCustomSupplier(sup);
    } else {
      setSelectedSupplier("");
    }

    setNotes(record.notes ?? "");
    setErrorMsg("");
    window.scrollTo({ top: 450, behavior: "smooth" });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const resolvedFeedType = selectedFeedTypeId === "__custom__" ? customFeedType.trim() : feedType.trim();
    if (!resolvedFeedType) {
      setErrorMsg("Please select or enter the feed type.");
      return;
    }

    const amount = Number(quantity);
    if (!Number.isFinite(amount) || amount <= 0) {
      setErrorMsg("Please enter a valid feed quantity.");
      return;
    }

    if (!date) {
      setErrorMsg("Please select a date.");
      return;
    }

    // Date active validation: Ensure selected animal was active on this date
    if (selectedGroupId !== "all" && selectedGroupId !== "__custom__") {
      if (animalType === "Cattle") {
        const a = livestockList.find((l) => l.id === selectedGroupId);
        if (a) {
          const addDate = a.dateAdded ? a.dateAdded.slice(0, 10) : "";
          const dob = a.dateOfBirth ? a.dateOfBirth.slice(0, 10) : "";
          if ((addDate && date < addDate) || (dob && date < dob)) {
            setErrorMsg(`The selected cattle (${a.name}) was not active on ${date}.`);
            return;
          }
        }
      } else {
        const b = poultryBatches.find((p) => p.id === selectedGroupId);
        if (b) {
          const addDate = b.dateAdded ? b.dateAdded.slice(0, 10) : "";
          const hatch = b.hatchDate ? b.hatchDate.slice(0, 10) : "";
          if ((addDate && date < addDate) || (hatch && date < hatch)) {
            setErrorMsg(`The selected poultry flock (${b.breed}) was not active on ${date}.`);
            return;
          }
        }
      }
    }

    if (cost !== "" && (isNaN(Number(cost)) || Number(cost) < 0)) {
      setErrorMsg("Feed cost cannot be negative.");
      return;
    }

    const resolvedGroup = selectedGroupId === "__custom__" ? customGroupName.trim() : groupName.trim();
    const resolvedSupplier = selectedSupplier === "__custom__" ? customSupplier.trim() : selectedSupplier.trim();

    try {
      setSaving(true);
      const record = {
        animalType,
        groupName: resolvedGroup,
        feedType: resolvedFeedType,
        quantity: amount,
        unit,
        date,
        cost: cost !== "" ? parseFloat(cost) : undefined,
        supplier: resolvedSupplier || undefined,
        notes: notes.trim() || undefined,
      };

      if (editingId) {
        await updateFeeding(editingId, record);
        setSuccessMsg("Feeding record updated.");
      } else {
        await addFeeding(record);
        setSuccessMsg(`Feeding record added: ${amount} ${unit} of ${resolvedFeedType} for ${animalType}.`);
      }

      await refreshData();
      resetForm();
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : "Failed to save feeding record.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteId) return;
    try {
      await deleteFeeding(deleteId);
      setDeleteId(null);
      setSuccessMsg("Feeding record deleted.");
      await refreshData();
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : "Failed to delete record.");
    }
  }

  // Feed type reference settings handlers
  async function handleToggleFeedTypeActive(ft: FeedType) {
    try {
      await updateFeedType(ft.id, { isActive: !ft.isActive });
      await refreshData();
    } catch (err) {
      setErrorMsg("Failed to update feed type status.");
    }
  }

  async function handleSaveNewFeedType(e: React.FormEvent) {
    e.preventDefault();
    if (!newFtName.trim() || !newFtCategory.trim()) return;
    try {
      if (editingFtId) {
        await updateFeedType(editingFtId, {
          name: newFtName.trim(),
          category: newFtCategory.trim(),
          defaultUnit: newFtUnit,
        });
        setSuccessMsg(`Feed type updated: ${newFtName}`);
      } else {
        await addFeedType({
          animalType: settingsAnimalType,
          category: newFtCategory.trim(),
          name: newFtName.trim(),
          defaultUnit: newFtUnit,
          isActive: true,
        });
        setSuccessMsg(`Feed type added: ${newFtName}`);
      }
      setNewFtName("");
      setNewFtCategory("");
      setNewFtUnit("kg");
      setIsAddingFeedType(false);
      setEditingFtId(null);
      await refreshData();
    } catch (err) {
      setErrorMsg("Failed to save feed type.");
    }
  }

  async function handleDeleteCustomFeedType(id: string) {
    try {
      await deleteFeedType(id);
      await refreshData();
    } catch (err) {
      setErrorMsg("Failed to delete feed type.");
    }
  }

  const deleteRecord = records.find((r) => r.id === deleteId);

  return (
    <main className="kf-page">
      <PageHeader
        title="Feeding Tracker"
        description="Monitor daily feed consumption, fodder, roughage, supplements, and feed expenses for poultry and cattle."
        actions={
          <Button
            variant="secondary"
            icon={<Settings size={15} />}
            onClick={() => setShowSettingsModal(true)}
          >
            Feed Type Settings
          </Button>
        }
      >
        <DatePeriodFilter
          mode={periodMode}
          offset={periodOffset}
          customFrom={customFrom}
          customTo={customTo}
          periodInfo={periodInfo}
          onModeChange={setPeriodMode}
          onOffsetChange={setPeriodOffset}
          onCustomRangeChange={setCustomRange}
          onReset={resetPeriod}
        />
      </PageHeader>

      <div className="kf-stack">
        {/* KPI Cards (Unit-safe: Units remain separate!) */}
        <div className="kf-grid kf-grid--stats">
          <StatCard
            label="Feed (kg)"
            value={totalKg > 0 ? `${formatNumber(totalKg)} kg` : "0 kg"}
            hint={avgKgPerDay > 0 ? `Avg ~${avgKgPerDay} kg / day` : "In kilograms"}
            icon={<Wheat size={20} />}
            tone="forest"
            trend={kgComparison?.direction !== "flat" && kgComparison ? { value: kgComparison.text, direction: kgComparison.direction } : undefined}
          />
          <StatCard
            label="Feed (Bags)"
            value={`${formatNumber(totalBags)} bags`}
            hint="Total commercial bags fed"
            icon={<Scale size={20} />}
            tone="amber"
          />
          <StatCard
            label="Fodder (Bales)"
            value={`${formatNumber(totalBales)} bales`}
            hint="Hay, lucerne & stover bales"
            icon={<Wheat size={20} />}
            tone="blue"
          />
          <StatCard
            label="Feed Expenses"
            value={formatCurrency(totalPeriodCost)}
            hint={`${currentPeriodRecords.length} feeding sessions`}
            icon={<TrendingUp size={20} />}
            tone="forest"
            trend={costComparison?.direction !== "flat" && costComparison ? { value: costComparison.text, direction: costComparison.direction } : undefined}
          />
        </div>

        {/* Units notice banner if wheelbarrows or litres are logged */}
        {(totalLitres > 0 || totalWheelbarrows > 0) && (
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", fontSize: "13px" }}>
            {totalLitres > 0 && (
              <Badge tone="blue">
                Liquid Supplements: {totalLitres} litres
              </Badge>
            )}
            {totalWheelbarrows > 0 && (
              <Badge tone="amber">
                Silage/Roughage: {totalWheelbarrows} wheelbarrows
              </Badge>
            )}
          </div>
        )}

        {/* Consumption Trend Chart */}
        <Panel
          title={`Feed Usage Trend (${periodInfo.label})`}
          subtitle={`Ration breakdown and consumption trend for ${periodInfo.label}.`}
        >
          {periodInfo.daysCount === 1 ? (
            currentPeriodRecords.length === 0 ? (
              <div>
                <EmptyState
                  title={`No feeding recorded yet for ${periodInfo.label}`}
                  description="No feed, silage, or supplements have been logged for today. Use the form below to enter today's feeding records."
                />
                <div style={{ marginTop: "16px", borderTop: "1px solid var(--kf-border, #e2e8f0)", paddingTop: "14px" }}>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--kf-text, #1e293b)", marginBottom: "8px" }}>
                    Recent 7-Day Feed Usage Trend (kg)
                  </div>
                  <LineChart
                    data={last7DaysFeedPoints}
                    height={180}
                    valueSuffix=" kg"
                  />
                </div>
              </div>
            ) : (
              <div>
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: "12px",
                  marginBottom: "16px",
                }}>
                  {feedTypeBreakdown.map((item) => (
                    <div
                      key={item.feedType}
                      style={{
                        padding: "12px 14px",
                        borderRadius: "10px",
                        background: "var(--kf-surface-alt, #f8fafc)",
                        border: "1px solid var(--kf-border, #e2e8f0)",
                      }}
                    >
                      <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--kf-text, #1e293b)" }}>
                        {item.feedType}
                      </div>
                      <div style={{ fontSize: "18px", fontWeight: 700, color: "var(--kf-primary, #15803d)", marginTop: "4px" }}>
                        {item.totalKg > 0 ? `${item.totalKg} kg` : item.totalBags > 0 ? `${item.totalBags} bags` : `${item.totalBales} bales`}
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--kf-text-muted)", marginTop: "2px" }}>
                        {item.count} feeding event{item.count > 1 ? "s" : ""}
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ borderTop: "1px solid var(--kf-border, #e2e8f0)", paddingTop: "14px" }}>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--kf-text, #1e293b)", marginBottom: "8px" }}>
                    Recent 7-Day Feed Usage Trend (kg)
                  </div>
                  <LineChart
                    data={last7DaysFeedPoints}
                    height={180}
                    valueSuffix=" kg"
                  />
                </div>
              </div>
            )
          ) : chartData.length > 0 ? (
            <div>
              <BarChart data={chartData} height={200} />
              <div style={{ marginTop: "12px", fontSize: "12px", color: "var(--kf-text-muted)" }}>
                <span>
                  Note: Chart displays consumption recorded in kg. Other units in this period:{" "}
                  <strong>{totalBags} bags</strong>
                  {totalBales > 0 ? `, ${totalBales} bales` : ""}
                  {totalWheelbarrows > 0 ? `, ${totalWheelbarrows} wheelbarrows` : ""}
                  {totalLitres > 0 ? `, ${totalLitres} litres` : ""}.
                </span>
              </div>
            </div>
          ) : (
            <EmptyState
              title={`No feeding recorded for ${periodInfo.label}`}
              description="No feed consumption logged for this reporting period."
            />
          )}
        </Panel>

        {/* Feedback messages */}
        {errorMsg && <ErrorBanner message={errorMsg} onRetry={() => setErrorMsg("")} />}
        {successMsg && <Notice tone="success">{successMsg}</Notice>}

        {/* Add / Edit Form Panel */}
        <Panel
          title={editingId ? "Edit Feeding Record" : "Add Feeding Record"}
          subtitle="Record daily feed, roughage, or supplements with active herd/flock and reference feeds."
        >
          <form onSubmit={handleSubmit} className="kf-form">
            <div className="kf-form-grid">
              {/* 1. Animal Type */}
              <Field label="Animal Type" required hint="Changing animal type resets group and feed type">
                <select
                  value={animalType}
                  onChange={(e) => handleAnimalTypeChange(e.target.value as "Poultry" | "Cattle")}
                  className="kf-input"
                >
                  <option value="Poultry">Poultry (Chickens)</option>
                  <option value="Cattle">Cattle (Cows)</option>
                </select>
              </Field>

              {/* 2. Animal / Group (Searchable, Active on date, Entire herd/flock option) */}
              <SearchableSelect
                label={animalType === "Poultry" ? "Flock / Group" : "Animal / Group"}
                required
                options={groupOptions}
                value={selectedGroupId}
                onChange={handleGroupSelect}
                placeholder={
                  animalType === "Poultry"
                    ? "-- Select poultry flock or entire flock --"
                    : "-- Select cattle animal or entire herd --"
                }
                searchPlaceholder="Search animal name, tag, or flock..."
                allowCustom
                customOptionLabel="Other / type manually"
                customValue={customGroupName}
                onCustomChange={(val) => {
                  setCustomGroupName(val);
                  setGroupName(val);
                }}
                customPlaceholder={animalType === "Poultry" ? "e.g. Free-range batch" : "e.g. Heifers pen, Sick bay"}
                hint="Only active animals on the selected date are listed."
              />

              {/* 3. Feed Type (Filtered by animal type, Grouped by category, Reference table) */}
              <SearchableSelect
                label="Feed Type"
                required
                options={feedTypeOptions}
                value={selectedFeedTypeId}
                onChange={handleFeedTypeSelect}
                placeholder={`-- Select ${animalType} feed type --`}
                searchPlaceholder="Search feed name or category..."
                allowCustom
                customOptionLabel="Other (type your own)"
                customValue={customFeedType}
                onCustomChange={(val) => {
                  setCustomFeedType(val);
                  setFeedType(val);
                }}
                customPlaceholder="Enter custom feed type"
                hint="Selecting a feed type auto-selects its default unit (e.g. hay in bales, molasses in litres)."
              />

              {/* 4. Quantity */}
              <Field label="Quantity" required>
                <input
                  type="number"
                  className="kf-input"
                  min="0"
                  step="0.01"
                  placeholder="e.g. 25"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                />
              </Field>

              {/* 5. Unit (Defaulted from feed type default_unit) */}
              <Field label="Unit" required hint="Defaulted from feed type, editable">
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="kf-input"
                  required
                >
                  {FEED_UNIT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </Field>

              {/* 6. Date (Must be active date) */}
              <Field label="Date" required hint="Must be a date when the selected animal/flock was active">
                <input
                  type="date"
                  className="kf-input"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </Field>

              {/* Cost */}
              <Field label="Cost (KES)">
                <input
                  type="number"
                  className="kf-input"
                  min="0"
                  step="0.01"
                  placeholder="Optional cost in KES"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                />
              </Field>

              {/* 7. Supplier (Dropdown of previous + add new) */}
              <SearchableSelect
                label="Supplier"
                options={supplierOptions}
                value={selectedSupplier}
                onChange={(val) => setSelectedSupplier(val)}
                placeholder="-- Select supplier --"
                searchPlaceholder="Search or select supplier..."
                allowCustom
                customOptionLabel="+ Add new supplier..."
                customValue={customSupplier}
                onCustomChange={(val) => setCustomSupplier(val)}
                customPlaceholder="e.g. Unga Farm Care, Local Feed Store"
                hint="Select a previously used supplier or enter a new one."
              />
            </div>

            <Field label="Notes (Optional)" className="kf-field--full">
              <input
                type="text"
                className="kf-input"
                placeholder="e.g. Morning ration, supplemented with minerals"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Field>

            <div className="kf-form-actions">
              {editingId && (
                <Button variant="secondary" type="button" onClick={resetForm}>
                  Cancel Edit
                </Button>
              )}
              <Button type="submit" variant="primary" loading={saving}>
                <span>{saving ? "Saving…" : editingId ? "Update Record" : "Add Feeding"}</span>
              </Button>
            </div>
          </form>
        </Panel>

        {/* Breakdowns Row (Feed Type & Group) */}
        {feedTypeBreakdown.length > 0 && (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "20px",
          }}>
            <Panel title="Usage by Feed Type">
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {feedTypeBreakdown.slice(0, 6).map((item) => (
                  <div key={item.feedType} style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 12px",
                    background: "var(--kf-cream, #f8fafc)",
                    borderRadius: "8px",
                  }}>
                    <span style={{ fontWeight: 500, fontSize: "13px" }}>{item.feedType}</span>
                    <span style={{ fontWeight: 600, fontSize: "13px", color: "var(--kf-primary)" }}>
                      {item.totalKg > 0 ? `${formatNumber(item.totalKg)} kg` : ""}
                      {item.totalBags > 0 ? ` ${item.totalBags} bags` : ""}
                      {item.totalBales > 0 ? ` ${item.totalBales} bales` : ""}
                    </span>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="Usage by Animal Group / Batch">
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {groupBreakdown.slice(0, 6).map((item) => (
                  <div key={item.groupName} style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 12px",
                    background: "var(--kf-cream, #f8fafc)",
                    borderRadius: "8px",
                  }}>
                    <div>
                      <span style={{ fontWeight: 500, fontSize: "13px" }}>{item.groupName}</span>
                      <span style={{ fontSize: "11px", color: "var(--kf-text-muted)", display: "block" }}>
                        {item.animalType}
                      </span>
                    </div>
                    <span style={{ fontWeight: 600, fontSize: "13px", color: "var(--kf-primary)" }}>
                      {item.totalKg > 0 ? `${formatNumber(item.totalKg)} kg` : `${item.count} records`}
                    </span>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        )}

        {/* Feeding Records Table Panel */}
        <Panel
          title={`Feeding Records (${filteredRecords.length})`}
          subtitle={`Entries for ${periodInfo.label}.`}
          actions={
            <Segmented
              label="Filter by animal type"
              options={[
                { value: "All", label: "All" },
                { value: "Poultry", label: "Poultry" },
                { value: "Cattle", label: "Cattle" },
              ]}
              value={animalFilter}
              onChange={(v) => setAnimalFilter(v as AnimalFilter)}
            />
          }
        >
          {loading ? (
            <EmptyState title="Loading feeding records…" description="Fetching records from database." />
          ) : filteredRecords.length === 0 ? (
            <EmptyState
              icon={<Wheat size={36} />}
              title="No feeding records for this period"
              description={
                animalFilter === "All"
                  ? `No records found between ${periodInfo.from} and ${periodInfo.to}. Add a feeding entry above.`
                  : `No feeding records for ${animalFilter} in this period.`
              }
            />
          ) : (
            <div className="kf-table-wrap">
              <table className="kf-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Animal Type</th>
                    <th>Group / Animal</th>
                    <th>Feed Type</th>
                    <th>Quantity</th>
                    <th>Unit</th>
                    <th>Cost KES</th>
                    <th>Supplier</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((record) => (
                    <tr key={record.id}>
                      <td>
                        <strong>{formatDisplayDate(record.date, false)}</strong>
                      </td>
                      <td>
                        <Badge tone={record.animalType.toLowerCase() === "poultry" ? "amber" : "blue"}>
                          {record.animalType}
                        </Badge>
                      </td>
                      <td>{record.groupName || "—"}</td>
                      <td>
                        <strong>{record.feedType}</strong>
                      </td>
                      <td>{record.quantity}</td>
                      <td>
                        <span style={{ fontWeight: 600 }}>{record.unit}</span>
                      </td>
                      <td>{record.cost != null && record.cost > 0 ? formatCurrency(record.cost) : "—"}</td>
                      <td>{record.supplier || "—"}</td>
                      <td>
                        <div className="kf-row-actions">
                          <IconButton
                            label="Edit"
                            icon={<Pencil size={15} />}
                            onClick={() => startEdit(record)}
                          />
                          <IconButton
                            label="Delete"
                            icon={<Trash2 size={15} />}
                            onClick={() => setDeleteId(record.id)}
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
      </div>

      {/* Delete confirm modal */}
      <Modal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Delete feeding record?"
        size="sm"
        footer={
          <div className="kf-modal-footer-actions">
            <Button variant="secondary" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDelete}>
              Delete
            </Button>
          </div>
        }
      >
        <p>
          Delete <strong>{deleteRecord?.feedType}</strong> ({deleteRecord?.animalType},{" "}
          {deleteRecord?.date})? This action cannot be undone.
        </p>
      </Modal>

      {/* Feed Types Reference Settings Modal */}
      <Modal
        open={showSettingsModal}
        onClose={() => {
          setShowSettingsModal(false);
          setIsAddingFeedType(false);
          setEditingFtId(null);
        }}
        title="Feed Types Reference Settings"
        subtitle="Manage available feed types, default units, and hide or activate feed types for your farm."
        size="lg"
        footer={
          <div className="kf-modal-footer-actions">
            <Button
              variant="secondary"
              onClick={() => {
                setShowSettingsModal(false);
                setIsAddingFeedType(false);
                setEditingFtId(null);
              }}
            >
              Close
            </Button>
          </div>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
            <Segmented
              label="Feed type species filter"
              options={[
                { value: "poultry", label: "Poultry Feeds" },
                { value: "cattle", label: "Cattle Feeds" },
              ]}
              value={settingsAnimalType}
              onChange={(val) => setSettingsAnimalType(val as "poultry" | "cattle")}
            />

            {!isAddingFeedType && (
              <Button
                variant="primary"
                size="sm"
                icon={<Plus size={14} />}
                onClick={() => {
                  setIsAddingFeedType(true);
                  setEditingFtId(null);
                  setNewFtName("");
                  setNewFtCategory(settingsAnimalType === "poultry" ? "Complete feeds" : "Concentrates");
                  setNewFtUnit("kg");
                }}
              >
                Add Custom Feed Type
              </Button>
            )}
          </div>

          {/* Add / Edit Feed Type Inline Form */}
          {isAddingFeedType && (
            <div
              style={{
                background: "rgba(147, 51, 234, 0.05)",
                border: "1px solid var(--kf-border, rgba(147, 51, 234, 0.2))",
                borderRadius: "8px",
                padding: "16px",
              }}
            >
              <h4 style={{ margin: "0 0 12px 0", fontSize: "14px", fontWeight: 600 }}>
                {editingFtId ? "Edit Feed Type" : `Add New ${settingsAnimalType === "poultry" ? "Poultry" : "Cattle"} Feed Type`}
              </h4>
              <form onSubmit={handleSaveNewFeedType} className="kf-form">
                <div className="kf-form-grid">
                  <Field label="Feed Name" required>
                    <input
                      type="text"
                      className="kf-input"
                      placeholder="e.g. Dairy Meal Plus"
                      value={newFtName}
                      onChange={(e) => setNewFtName(e.target.value)}
                      required
                    />
                  </Field>
                  <Field label="Category / Heading" required>
                    <input
                      type="text"
                      className="kf-input"
                      placeholder="e.g. Concentrates, Fodder and roughage, Supplements"
                      value={newFtCategory}
                      onChange={(e) => setNewFtCategory(e.target.value)}
                      required
                    />
                  </Field>
                  <Field label="Default Unit" required>
                    <select
                      className="kf-input"
                      value={newFtUnit}
                      onChange={(e) => setNewFtUnit(e.target.value as any)}
                      required
                    >
                      {FEED_UNIT_OPTIONS.map((u) => (
                        <option key={u.value} value={u.value}>
                          {u.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
                <div className="kf-form-actions" style={{ marginTop: "12px" }}>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setIsAddingFeedType(false);
                      setEditingFtId(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" size="sm">
                    {editingFtId ? "Update Feed Type" : "Save Feed Type"}
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Feed Types Table */}
          <div className="kf-table-wrap">
            <table className="kf-table">
              <thead>
                <tr>
                  <th>Feed Name</th>
                  <th>Category</th>
                  <th>Default Unit</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {feedTypes
                  .filter((ft) => ft.animalType === settingsAnimalType)
                  .map((ft) => (
                    <tr key={ft.id} style={{ opacity: ft.isActive ? 1 : 0.6 }}>
                      <td>
                        <strong>{ft.name}</strong>
                      </td>
                      <td>
                        <Badge tone="slate">{ft.category}</Badge>
                      </td>
                      <td>{ft.defaultUnit}</td>
                      <td>
                        <Badge tone={ft.isActive ? "green" : "slate"}>
                          {ft.isActive ? "Active" : "Hidden"}
                        </Badge>
                      </td>
                      <td>
                        <div className="kf-row-actions">
                          <Button
                            variant="soft"
                            size="sm"
                            icon={ft.isActive ? <EyeOff size={13} /> : <Eye size={13} />}
                            onClick={() => handleToggleFeedTypeActive(ft)}
                            title={ft.isActive ? "Hide from dropdowns" : "Make active in dropdowns"}
                          >
                            {ft.isActive ? "Hide" : "Show"}
                          </Button>
                          <IconButton
                            label="Edit"
                            icon={<Pencil size={14} />}
                            onClick={() => {
                              setIsAddingFeedType(true);
                              setEditingFtId(ft.id);
                              setNewFtName(ft.name);
                              setNewFtCategory(ft.category);
                              setNewFtUnit(ft.defaultUnit);
                            }}
                          />
                          <IconButton
                            label="Delete"
                            icon={<Trash2 size={14} />}
                            tone="danger"
                            onClick={() => handleDeleteCustomFeedType(ft.id)}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          <div style={{ fontSize: "12.5px", color: "var(--kf-muted)", display: "flex", alignItems: "center", gap: "6px" }}>
            <AlertTriangle size={14} />
            <span>Hiding a feed type removes it from the recording dropdowns while preserving historical feeding records.</span>
          </div>
        </div>
      </Modal>
    </main>
  );
}
