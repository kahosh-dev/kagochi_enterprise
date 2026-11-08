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
  ClipboardList,
  Egg,
  Pencil,
  Plus,
  Trash2,
  TrendingUp,
  Layers,
  Info,
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
import { BarChart, type ChartPoint } from "../components/Chart";
import DatePeriodFilter from "../components/DatePeriodFilter";
import {
  calculatePeriod,
  calculateComparison,
  formatDisplayDate,
  getLocalDateString,
  isRecordInDateRange,
  type PeriodMode,
} from "../utils/datePeriod";
import { formatCurrency } from "../utils/format";

const TYPE_OPTIONS = [
  { value: "all", label: "All Products" },
  { value: "eggs", label: "Eggs" },
  { value: "milk", label: "Milk" },
];

const DEFAULT_TRAY_SIZE = 30;

export default function ProductionView() {
  const [records, setRecords] = useState<ProductionRecord[]>([]);
  const [poultryBatches, setPoultryBatches] = useState<PoultryBatch[]>([]);
  const [livestockList, setLivestockList] = useState<LivestockAnimal[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string } | null>(null);

  // Period filter state
  const [periodMode, setPeriodMode] = useState<PeriodMode>("month");
  const [periodOffset, setPeriodOffset] = useState<number>(0);
  const [customFrom, setCustomFrom] = useState<string>("");
  const [customTo, setCustomTo] = useState<string>("");

  // Tray size setting
  const [traySize] = useState<number>(DEFAULT_TRAY_SIZE);

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Form fields
  const todayStr = getLocalDateString();
  const [animalType, setAnimalType] = useState<string>("Poultry");
  const [groupName, setGroupName] = useState<string>("");
  const [type, setType] = useState<"eggs" | "milk">("eggs");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("trays");
  const [date, setDate] = useState(todayStr);
  const [destination, setDestination] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [notes, setNotes] = useState("");

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
      console.error(error);
      setErrorMsg(error instanceof Error ? error.message : "Failed to load production.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshData();
  }, []);

  // Compute active period
  const periodInfo = useMemo(() => {
    return calculatePeriod(periodMode, periodOffset, customFrom, customTo);
  }, [periodMode, periodOffset, customFrom, customTo]);

  // Filter records within current period
  const currentPeriodRecords = useMemo(() => {
    return records.filter((r) => isRecordInDateRange(r.date, periodInfo.from, periodInfo.to));
  }, [records, periodInfo.from, periodInfo.to]);

  // Filter records within previous period for comparison
  const previousPeriodRecords = useMemo(() => {
    return records.filter((r) => isRecordInDateRange(r.date, periodInfo.previousFrom, periodInfo.previousTo));
  }, [records, periodInfo.previousFrom, periodInfo.previousTo]);

  // Production calculations for selected period
  const periodEggsInTrays = useMemo(() => {
    return currentPeriodRecords
      .filter((r) => r.type === "eggs" && r.unit === "trays")
      .reduce((sum, r) => sum + Number(r.quantity || 0), 0);
  }, [currentPeriodRecords]);

  const periodEggsInPieces = useMemo(() => {
    return currentPeriodRecords
      .filter((r) => r.type === "eggs" && r.unit === "pieces")
      .reduce((sum, r) => sum + Number(r.quantity || 0), 0);
  }, [currentPeriodRecords]);

  // Equivalent individual eggs
  const periodTotalEquivalentEggs = useMemo(() => {
    return Math.round((periodEggsInTrays * traySize) + periodEggsInPieces);
  }, [periodEggsInTrays, periodEggsInPieces, traySize]);

  // Milk in litres
  const periodMilk = useMemo(() => {
    return currentPeriodRecords
      .filter((r) => r.type === "milk")
      .reduce((sum, r) => sum + Number(r.quantity || 0), 0);
  }, [currentPeriodRecords]);

  // Days with recorded activity in period
  const eggRecordedDays = useMemo(() => {
    return new Set(currentPeriodRecords.filter((r) => r.type === "eggs").map((r) => r.date)).size;
  }, [currentPeriodRecords]);

  // Daily averages
  const avgTraysPerDay = useMemo(() => {
    if (periodInfo.daysCount <= 0) return 0;
    return Math.round((periodEggsInTrays / periodInfo.daysCount) * 10) / 10;
  }, [periodEggsInTrays, periodInfo.daysCount]);

  const avgMilkPerDay = useMemo(() => {
    if (periodInfo.daysCount <= 0) return 0;
    return Math.round((periodMilk / periodInfo.daysCount) * 10) / 10;
  }, [periodMilk, periodInfo.daysCount]);

  // Previous period totals for comparison
  const prevEggsInTrays = useMemo(() => {
    return previousPeriodRecords
      .filter((r) => r.type === "eggs" && r.unit === "trays")
      .reduce((sum, r) => sum + Number(r.quantity || 0), 0);
  }, [previousPeriodRecords]);

  const prevMilk = useMemo(() => {
    return previousPeriodRecords
      .filter((r) => r.type === "milk")
      .reduce((sum, r) => sum + Number(r.quantity || 0), 0);
  }, [previousPeriodRecords]);

  const eggComparison = useMemo(() => {
    return calculateComparison(periodEggsInTrays, prevEggsInTrays);
  }, [periodEggsInTrays, prevEggsInTrays]);

  const milkComparison = useMemo(() => {
    return calculateComparison(periodMilk, prevMilk);
  }, [periodMilk, prevMilk]);

  // Table filtered records: within period + type filter
  const filteredTableRecords = useMemo(() => {
    return currentPeriodRecords.filter((r) => {
      if (typeFilter === "all") return true;
      return r.type === typeFilter;
    });
  }, [currentPeriodRecords, typeFilter]);

  // Trend Chart data for the selected period
  const chartData = useMemo<ChartPoint[]>(() => {
    if (currentPeriodRecords.length === 0) return [];

    if (periodMode === "year") {
      // Monthly aggregation (12 months)
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const year = periodInfo.from.slice(0, 4);
      const points: ChartPoint[] = months.map((m, idx) => {
        const monthPrefix = `${year}-${String(idx + 1).padStart(2, "0")}`;
        const total = currentPeriodRecords
          .filter((r) => r.date.startsWith(monthPrefix))
          .reduce((sum, r) => {
            if (typeFilter === "milk") {
              return r.type === "milk" ? sum + Number(r.quantity) : sum;
            }
            // For eggs or all, count trays
            if (r.type === "eggs") {
              const trays = r.unit === "trays" ? Number(r.quantity) : Number(r.quantity) / traySize;
              return sum + trays;
            }
            return sum + Number(r.quantity);
          }, 0);
        return { label: m, value: Math.round(total * 10) / 10 };
      });
      return points;
    }

    // Daily aggregation for today, week, month, custom
    const dateMap = new Map<string, number>();
    currentPeriodRecords.forEach((r) => {
      if (typeFilter !== "all" && r.type !== typeFilter) return;
      const val = r.unit === "trays" ? Number(r.quantity) : r.type === "eggs" ? Number(r.quantity) / traySize : Number(r.quantity);
      dateMap.set(r.date, (dateMap.get(r.date) || 0) + val);
    });

    return Array.from(dateMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([d, val]) => ({
        label: d.slice(5), // MM-DD
        value: Math.round(val * 10) / 10,
      }));
  }, [currentPeriodRecords, periodMode, periodInfo.from, typeFilter, traySize]);

  // Form helpers
  function resetForm() {
    setEditingId(null);
    setAnimalType("Poultry");
    setGroupName("");
    setType("eggs");
    setQuantity("");
    setUnit("trays");
    setDate(getLocalDateString());
    setDestination("");
    setSellingPrice("");
    setNotes("");
    setErrorMsg("");
  }

  function handleAnimalTypeChange(newAnimalType: string) {
    setAnimalType(newAnimalType);
    if (newAnimalType === "Poultry") {
      setType("eggs");
      setUnit("trays");
    } else if (newAnimalType === "Cattle") {
      setType("milk");
      setUnit("litres");
    }
  }

  function handleTypeChange(value: "eggs" | "milk") {
    setType(value);
    if (value === "eggs") {
      setAnimalType("Poultry");
      setUnit("trays");
    } else {
      setAnimalType("Cattle");
      setUnit("litres");
    }
  }

  function startEdit(record: ProductionRecord) {
    setEditingId(record.id);
    setAnimalType(record.animalType || (record.type === "eggs" ? "Poultry" : "Cattle"));
    setGroupName(record.groupName || "");
    setType(record.type as "eggs" | "milk");
    setQuantity(String(record.quantity));
    setUnit(record.unit);
    setDate(record.date);
    setDestination(record.destination || "");
    setSellingPrice(record.sellingPrice !== undefined && record.sellingPrice > 0 ? String(record.sellingPrice) : "");
    setNotes(record.notes || "");
    window.scrollTo({ top: 450, behavior: "smooth" });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const amount = Number(quantity);
    if (!Number.isFinite(amount) || amount <= 0) {
      setErrorMsg("Please enter a valid production quantity.");
      return;
    }
    if (!date) {
      setErrorMsg("Please select a valid date.");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        type,
        quantity: amount,
        unit,
        date,
        destination: (destination as any) || "produced",
        sellingPrice: sellingPrice ? parseFloat(sellingPrice) : 0,
        animalType,
        groupName: groupName.trim(),
        notes: notes.trim() || undefined,
      };

      if (editingId) {
        await updateProduction(editingId, payload);
        setSuccessMsg(`Production record updated (${amount} ${unit} of ${type}).`);
      } else {
        await addProduction(payload);
        setSuccessMsg(`Production recorded: ${amount} ${unit} of ${type}.`);
      }

      await refreshData();
      resetForm();
    } catch (error) {
      console.error(error);
      setErrorMsg(error instanceof Error ? error.message : "Failed to save production.");
    } finally {
      setSaving(false);
    }
  }

  async function actualDelete(id: string) {
    try {
      await deleteProduction(id);
      setSuccessMsg("Production record deleted.");
      await refreshData();
      if (editingId === id) resetForm();
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : "Failed to delete record.");
    }
  }

  // Calculated preview for egg trays in form
  const parsedFormQty = parseFloat(quantity);
  const isEggsForm = type === "eggs";
  const equivalentEggCount = !isNaN(parsedFormQty) && parsedFormQty > 0
    ? (unit === "trays" ? Math.round(parsedFormQty * traySize) : parsedFormQty)
    : null;

  return (
    <main className="kf-page">
      <PageHeader
        title="Production Management"
        description="Daily, weekly, monthly and yearly yield logs for poultry eggs and cow milk."
        actions={
          <Button
            icon={<Plus size={16} />}
            onClick={() => {
              resetForm();
              window.scrollTo({ top: 450, behavior: "smooth" });
            }}
          >
            Add Record
          </Button>
        }
      />

      <div className="kf-stack">
        {/* Visual Sector Header */}
        <div className="kf-page-hero">
          <div className="kf-page-hero-thumb">
            <img src="/images/card-production.jpg" alt="Fresh farm eggs and milk" />
          </div>
          <div className="kf-page-hero-content">
            <h2 className="kf-page-hero-title">
              <Egg size={20} strokeWidth={1.8} />
              Farm Yield & Output Tracking
            </h2>
            <p className="kf-page-hero-desc">
              Log daily egg collection in trays (30 eggs/tray) and cow milk production in litres.
              Review accurate daily, weekly, monthly, and yearly summaries with previous-period trends.
            </p>
          </div>
          <div className="kf-page-hero-stats">
            <Badge tone="amber">
              {periodEggsInTrays.toLocaleString()} Trays Egg Yield
            </Badge>
            <Badge tone="blue">
              {periodMilk.toLocaleString()} L Milk Yield
            </Badge>
          </div>
        </div>

        {/* Date Period Filter Bar */}
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
          title="Production Period"
        />

        {/* KPI Stats Grid */}
        <div className="kf-grid kf-grid--stats">
          <StatCard
            tone="amber"
            image="/images/farm/eggs.webp"
            imageAlt="Eggs Collected"
            layout="image-right"
            label="Trays Collected"
            value={`${periodEggsInTrays.toLocaleString()} trays`}
            hint={
              periodEggsInPieces > 0
                ? `≈ ${periodTotalEquivalentEggs.toLocaleString()} eggs (${periodEggsInPieces} pcs historical)`
                : `≈ ${periodTotalEquivalentEggs.toLocaleString()} individual eggs`
            }
            onClick={() => setTypeFilter("eggs")}
          />

          <StatCard
            tone="forest"
            icon={<TrendingUp size={20} strokeWidth={1.5} />}
            label="Average Trays per Day"
            value={`${avgTraysPerDay} trays/day`}
            hint={
              eggComparison.percentChange !== null
                ? `${eggComparison.text} (${prevEggsInTrays} trays)`
                : `${eggRecordedDays} recorded days in period`
            }
          />

          <StatCard
            tone="blue"
            image="/images/farm/milk-can.webp"
            imageAlt="Milk Collected"
            layout="image-right"
            label="Milk Collected"
            value={`${periodMilk.toLocaleString()} L`}
            hint={
              milkComparison.percentChange !== null
                ? `${milkComparison.text} (${prevMilk} L)`
                : "Total volume in litres"
            }
            onClick={() => setTypeFilter("milk")}
          />

          <StatCard
            tone="slate"
            icon={<ClipboardList size={20} strokeWidth={1.5} />}
            label="Average Litres per Day"
            value={`${avgMilkPerDay} L/day`}
            hint={`${currentPeriodRecords.length} production entries in period`}
          />
        </div>

        {/* Analytics Breakdown & Trend Chart */}
        {currentPeriodRecords.length > 0 && (
          <Panel
            title={`Production Trend (${periodInfo.label})`}
            subtitle={
              typeFilter === "milk"
                ? "Milk yield over time in litres"
                : "Egg collection over time in trays (30 eggs/tray)"
            }
          >
            <div style={{ padding: "8px 0" }}>
              <BarChart
                data={chartData}
                height={200}
                valueSuffix={typeFilter === "milk" ? " L" : " trays"}
                emptyLabel="No production records for this specific period."
              />
            </div>

            {/* Quick summaries row */}
            <div style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "16px",
              marginTop: "16px",
              paddingTop: "14px",
              borderTop: "1px solid var(--kf-border, #e2e8f0)",
              fontSize: "13px",
              color: "var(--kf-text-muted, #64748b)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Layers size={15} style={{ color: "var(--kf-primary)" }} />
                <span>Default tray conversion: <strong>1 tray = {traySize} eggs</strong></span>
              </div>
              {periodEggsInPieces > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <Info size={15} style={{ color: "#d97706" }} />
                  <span>Includes {periodEggsInPieces} pieces from historical entries (preserved intact)</span>
                </div>
              )}
            </div>
          </Panel>
        )}

        {/* Add / Edit Form Panel */}
        <Panel
          title={editingId ? "Edit Production Record" : "Add Production Record"}
          subtitle={
            editingId
              ? "Update the selected production record."
              : "Record a new egg harvest in trays or cow milking yield in litres."
          }
        >
          {errorMsg && <ErrorBanner message={errorMsg} />}
          {successMsg && <Notice tone="success">{successMsg}</Notice>}

          <form onSubmit={handleSubmit}>
            <div className="kf-form-grid">
              {/* Animal Type */}
              <Field label="Animal Type" htmlFor="animalType" required>
                <select
                  id="animalType"
                  value={animalType}
                  onChange={(e) => handleAnimalTypeChange(e.target.value)}
                >
                  <option value="Poultry">Poultry (Chickens)</option>
                  <option value="Cattle">Cattle (Cows)</option>
                </select>
              </Field>

              {/* Group / Batch */}
              <Field
                label={animalType === "Poultry" ? "Poultry Batch / Flock" : "Cattle Animal / Group"}
                htmlFor="groupName"
                hint="Select an existing group or type a custom name"
              >
                <input
                  id="groupName"
                  list="groupOptions"
                  type="text"
                  placeholder={animalType === "Poultry" ? "e.g. Batch A - Layers" : "e.g. Daisy / Cow #102"}
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                />
                <datalist id="groupOptions">
                  {animalType === "Poultry"
                    ? poultryBatches.map((b) => (
                        <option key={b.id} value={`${b.breed} (${b.purpose})`} />
                      ))
                    : livestockList.map((a) => (
                        <option key={a.id} value={`${a.name} ${a.tagNumber ? `[#${a.tagNumber}]` : ""}`} />
                      ))}
                </datalist>
              </Field>

              {/* Production Type */}
              <Field label="Production Type" htmlFor="productionType" required>
                <select
                  id="productionType"
                  value={type}
                  onChange={(e) => handleTypeChange(e.target.value as "eggs" | "milk")}
                >
                  <option value="eggs">Eggs</option>
                  <option value="milk">Milk</option>
                </select>
              </Field>

              {/* Quantity */}
              <Field
                label={
                  type === "eggs"
                    ? `Quantity (${unit})`
                    : `Volume (${unit})`
                }
                htmlFor="productionQuantity"
                required
                hint={
                  isEggsForm && equivalentEggCount !== null
                    ? `= ${equivalentEggCount.toLocaleString()} individual eggs (@ ${traySize} eggs/tray)`
                    : undefined
                }
              >
                <input
                  id="productionQuantity"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder={type === "eggs" ? "e.g. 5 or 2.5 trays" : "e.g. 15.5 litres"}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </Field>

              {/* Unit */}
              <Field label="Unit" htmlFor="productionUnit" required>
                <select
                  id="productionUnit"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                >
                  {type === "eggs" ? (
                    <>
                      <option value="trays">trays (default: 30 eggs)</option>
                      <option value="pieces">pieces (individual eggs)</option>
                    </>
                  ) : (
                    <option value="litres">litres</option>
                  )}
                </select>
              </Field>

              {/* Date */}
              <Field label="Production Date" htmlFor="productionDate" required>
                <input
                  id="productionDate"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </Field>

              {/* Destination */}
              <Field label="Destination (Optional)" htmlFor="productionDestination">
                <select
                  id="productionDestination"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                >
                  <option value="">— Select —</option>
                  <option value="produced">Produced (Stock / Storage)</option>
                  <option value="sold">Sold</option>
                  <option value="home_use">Home use</option>
                  <option value="damaged">Damaged / waste</option>
                </select>
              </Field>

              {/* Selling Price */}
              <Field label="Selling Price KES (Optional)" htmlFor="sellingPrice">
                <input
                  id="sellingPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g. 1400"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(e.target.value)}
                />
              </Field>
            </div>

            <Field label="Notes (Optional)" htmlFor="productionNotes" className="kf-field--full">
              <input
                id="productionNotes"
                type="text"
                placeholder="e.g. Morning collection, Grade A eggs, evening milking"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Field>

            <div className="kf-form-actions">
              {editingId && (
                <Button variant="ghost" type="button" onClick={resetForm}>
                  Cancel Edit
                </Button>
              )}
              <Button type="submit" loading={saving}>
                {editingId ? "Update Production" : "Add Production"}
              </Button>
            </div>
          </form>
        </Panel>

        {/* Records Table Panel */}
        <Panel
          title={`Production Records (${filteredTableRecords.length})`}
          subtitle={`Entries for ${periodInfo.label}.`}
          actions={
            <Segmented
              label="Filter by type"
              options={TYPE_OPTIONS}
              value={typeFilter}
              onChange={setTypeFilter}
            />
          }
        >
          {loading ? (
            <EmptyState title="Loading production records…" />
          ) : filteredTableRecords.length === 0 ? (
            <EmptyState
              icon={<Egg size={28} />}
              title="No production records for this period"
              description={`No records found between ${periodInfo.from} and ${periodInfo.to}. Add a record above or choose another period.`}
            />
          ) : (
            <div className="kf-table-wrap">
              <table className="kf-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Animal / Batch</th>
                    <th>Quantity</th>
                    <th>Unit</th>
                    <th>Equivalent</th>
                    <th>Destination</th>
                    <th>Price KES</th>
                    <th>Notes</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTableRecords.map((record) => {
                    const isEggRecord = record.type === "eggs";
                    const isTrays = isEggRecord && record.unit === "trays";
                    const equivText = isTrays
                      ? `≈ ${Math.round(record.quantity * traySize)} eggs`
                      : isEggRecord
                      ? `≈ ${(Math.round((record.quantity / traySize) * 10) / 10)} trays`
                      : "—";

                    return (
                      <tr key={record.id}>
                        <td>
                          <strong>{formatDisplayDate(record.date, false)}</strong>
                        </td>
                        <td>
                          <Badge tone={record.type === "eggs" ? "amber" : "blue"}>
                            {record.type === "eggs" ? "Eggs" : "Milk"}
                          </Badge>
                        </td>
                        <td>
                          {record.groupName || record.animalType || "—"}
                        </td>
                        <td>
                          <strong style={{ fontSize: "14px" }}>{record.quantity}</strong>
                        </td>
                        <td>
                          <span style={{
                            fontWeight: isTrays ? 600 : 400,
                            color: isTrays ? "var(--kf-primary)" : "inherit",
                          }}>
                            {record.unit}
                          </span>
                        </td>
                        <td style={{ fontSize: "12px", color: "var(--kf-text-muted)" }}>
                          {equivText}
                        </td>
                        <td>
                          <span style={{ textTransform: "capitalize" }}>
                            {record.destination ? record.destination.replace("_", " ") : "Produced"}
                          </span>
                        </td>
                        <td>
                          {record.sellingPrice !== undefined && record.sellingPrice > 0
                            ? formatCurrency(record.sellingPrice)
                            : "—"}
                        </td>
                        <td>
                          {record.notes ? (
                            <span style={{ fontSize: 12, color: "var(--kf-text-muted)" }}>
                              {record.notes}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td>
                          <div className="kf-actions-cell">
                            <IconButton
                              label="Edit"
                              icon={<Pencil size={15} />}
                              onClick={() => startEdit(record)}
                            />
                            <IconButton
                              label="Delete"
                              tone="danger"
                              icon={<Trash2 size={15} />}
                              onClick={() => setDeleteConfirm({ id: record.id })}
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
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Delete record?"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={async () => {
                if (deleteConfirm) {
                  await actualDelete(deleteConfirm.id);
                  setDeleteConfirm(null);
                }
              }}
            >
              Delete
            </Button>
          </>
        }
      >
        <p>Are you sure you want to delete this production record? This cannot be undone.</p>
      </Modal>
    </main>
  );
}
