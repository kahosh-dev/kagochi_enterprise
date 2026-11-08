import { useEffect, useMemo, useState } from "react";
import {
  loadFeeding,
  addFeeding,
  updateFeeding,
  deleteFeeding,
  loadPoultry,
  loadLivestock,
} from "../services/storage";
import type { FeedingRecord, PoultryBatch, LivestockAnimal } from "../types/farm";
import {
  Wheat,
  Plus,
  Pencil,
  Trash2,
  TrendingUp,
  Scale,
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
import { formatCurrency, formatNumber } from "../utils/format";

type AnimalFilter = "All" | "Poultry" | "Cattle";

export default function FeedingView() {
  const [records, setRecords] = useState<FeedingRecord[]>([]);
  const [poultryBatches, setPoultryBatches] = useState<PoultryBatch[]>([]);
  const [livestockList, setLivestockList] = useState<LivestockAnimal[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [animalFilter, setAnimalFilter] = useState<AnimalFilter>("All");

  // Period filter state
  const [periodMode, setPeriodMode] = useState<PeriodMode>("month");
  const [periodOffset, setPeriodOffset] = useState<number>(0);
  const [customFrom, setCustomFrom] = useState<string>("");
  const [customTo, setCustomTo] = useState<string>("");

  // Form fields
  const todayStr = getLocalDateString();
  const [animalType, setAnimalType] = useState("Poultry");
  const [groupName, setGroupName] = useState("");
  const [feedType, setFeedType] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("kg");
  const [date, setDate] = useState(todayStr);
  const [cost, setCost] = useState("");
  const [supplier, setSupplier] = useState("");
  const [notes, setNotes] = useState("");

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  async function refreshData() {
    try {
      setLoading(true);
      const [feedingData, poultryData, livestockData] = await Promise.all([
        loadFeeding(),
        loadPoultry().catch(() => []),
        loadLivestock().catch(() => []),
      ]);
      setRecords(feedingData);
      setPoultryBatches(poultryData);
      setLivestockList(livestockData);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : "Failed to load feeding records.");
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

  // Filter records within previous period for trend comparisons
  const previousPeriodRecords = useMemo(() => {
    return records.filter((r) => isRecordInDateRange(r.date, periodInfo.previousFrom, periodInfo.previousTo));
  }, [records, periodInfo.previousFrom, periodInfo.previousTo]);

  // Unit-safe aggregations: Incompatible units are never added together!
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

  const totalLitres = useMemo(() => {
    return currentPeriodRecords
      .filter((r) => r.unit.toLowerCase() === "litres" || r.unit.toLowerCase() === "l")
      .reduce((s, r) => s + Number(r.quantity || 0), 0);
  }, [currentPeriodRecords]);

  const totalGrams = useMemo(() => {
    return currentPeriodRecords
      .filter((r) => r.unit.toLowerCase() === "g")
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

  // Breakdowns by Feed Type (in kg where available, otherwise by record)
  const feedTypeBreakdown = useMemo(() => {
    const map = new Map<string, { feedType: string; totalKg: number; totalBags: number; count: number }>();
    currentPeriodRecords.forEach((r) => {
      const ft = r.feedType || "General Feed";
      const entry = map.get(ft) || { feedType: ft, totalKg: 0, totalBags: 0, count: 0 };
      if (r.unit.toLowerCase() === "kg") entry.totalKg += Number(r.quantity);
      if (r.unit.toLowerCase() === "bags") entry.totalBags += Number(r.quantity);
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

  // Table filtered records: within period + animal filter
  const filteredRecords = useMemo(() => {
    return currentPeriodRecords.filter((r) => {
      if (animalFilter === "All") return true;
      return r.animalType.toLowerCase() === animalFilter.toLowerCase();
    });
  }, [currentPeriodRecords, animalFilter]);

  function resetForm() {
    setEditingId(null);
    setAnimalType("Poultry");
    setGroupName("");
    setFeedType("");
    setQuantity("");
    setUnit("kg");
    setDate(getLocalDateString());
    setCost("");
    setSupplier("");
    setNotes("");
    setErrorMsg("");
  }

  function startEdit(record: FeedingRecord) {
    setEditingId(record.id);
    setAnimalType(record.animalType);
    setGroupName(record.groupName || "");
    setFeedType(record.feedType);
    setQuantity(String(record.quantity));
    setUnit(record.unit);
    setDate(record.date);
    setCost(record.cost != null && record.cost > 0 ? String(record.cost) : "");
    setSupplier(record.supplier ?? "");
    setNotes(record.notes ?? "");
    setErrorMsg("");
    window.scrollTo({ top: 450, behavior: "smooth" });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const amount = Number(quantity);
    if (!feedType.trim()) {
      setErrorMsg("Please enter the feed type.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setErrorMsg("Please enter a valid feed quantity.");
      return;
    }
    if (!date) {
      setErrorMsg("Please select a date.");
      return;
    }
    if (cost !== "" && (isNaN(Number(cost)) || Number(cost) < 0)) {
      setErrorMsg("Feed cost cannot be negative.");
      return;
    }

    try {
      setSaving(true);
      const record = {
        animalType,
        groupName: groupName.trim(),
        feedType: feedType.trim(),
        quantity: amount,
        unit,
        date,
        cost: cost !== "" ? parseFloat(cost) : undefined,
        supplier: supplier.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      if (editingId) {
        await updateFeeding(editingId, record);
        setSuccessMsg("Feeding record updated.");
      } else {
        await addFeeding(record);
        setSuccessMsg(`Feeding record added: ${amount} ${unit} of ${feedType} for ${animalType}.`);
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
      if (editingId === deleteId) resetForm();
      setDeleteId(null);
      setSuccessMsg("Feeding record deleted.");
      await refreshData();
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : "Failed to delete feeding record.");
      setDeleteId(null);
    }
  }

  const deleteRecord = deleteId ? records.find((r) => r.id === deleteId) : null;

  return (
    <main className="kf-page">
      <PageHeader
        title="Feeding Management"
        description="Track daily rations, feed consumption, and costs for poultry and cattle."
        actions={
          <Button
            variant="primary"
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
        {/* Visual sector header */}
        <div className="kf-page-hero">
          <div className="kf-page-hero-thumb">
            <img src="/images/card-feeding.jpg" alt="Agricultural crops and feed" />
          </div>
          <div className="kf-page-hero-content">
            <h2 className="kf-page-hero-title">
              <Wheat size={20} strokeWidth={1.8} />
              Feed & Nutrition Management
            </h2>
            <p className="kf-page-hero-desc">
              Monitor daily feed rations for poultry and cattle. Track feed usage accurately with safe unit separation
              (kilograms, bags, litres) and daily, weekly, monthly, and yearly summaries.
            </p>
          </div>
          <div className="kf-page-hero-stats">
            <Badge tone="forest">{formatNumber(totalKg)} kg Feed Logged</Badge>
            <Badge tone="amber">{formatCurrency(totalPeriodCost)} Feed Cost</Badge>
          </div>
        </div>

        {/* Date Period Filter */}
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
          title="Feeding Period"
        />

        {/* KPI Stats Grid */}
        <div className="kf-grid kf-grid--stats">
          <StatCard
            label="Feed Used (kg)"
            value={`${formatNumber(totalKg)} kg`}
            hint={
              kgComparison.percentChange !== null
                ? `${kgComparison.text} (${prevTotalKg} kg)`
                : "Sum of kilogram records"
            }
            image="/images/farm/animal-feed.webp"
            imageAlt="Feed in kg"
            layout="image-right"
            tone="green"
          />

          <StatCard
            label="Feed Used (bags)"
            value={`${formatNumber(totalBags)} bags`}
            hint={
              totalLitres > 0
                ? `Plus ${formatNumber(totalLitres)} L liquid feed`
                : "Kept separate from kg"
            }
            image="/images/farm/animal-feed.webp"
            imageAlt="Feed in bags"
            layout="image-right"
            tone="forest"
          />

          <StatCard
            label="Average Daily Feed"
            value={`${avgKgPerDay} kg/day`}
            hint={`${periodInfo.daysCount} days in period`}
            icon={<TrendingUp size={20} strokeWidth={1.5} />}
            tone="slate"
          />

          <StatCard
            label="Total Feed Cost"
            value={formatCurrency(totalPeriodCost)}
            hint={
              costComparison.percentChange !== null
                ? `${costComparison.text} (${formatCurrency(prevTotalCost)})`
                : "All recorded costs"
            }
            image="/images/farm/farm-expenses.webp"
            imageAlt="Feed expenses"
            layout="image-right"
            tone="amber"
          />
        </div>

        {/* Feeding Trends Chart Panel */}
        {chartData.length > 0 && (
          <Panel
            title={`Feed Usage Trend (${periodInfo.label})`}
            subtitle="Daily feed consumption in kilograms over the selected period."
          >
            <div style={{ padding: "8px 0" }}>
              <BarChart
                data={chartData}
                height={200}
                valueSuffix=" kg"
                emptyLabel="No kilogram feeding records for this specific period."
              />
            </div>

            {/* Incompatible units safety note */}
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
                <Scale size={15} style={{ color: "var(--kf-primary)" }} />
                <span>
                  Units are kept strictly separate: <strong>{totalKg} kg</strong>,{" "}
                  <strong>{totalBags} bags</strong>
                  {totalLitres > 0 ? `, ${totalLitres} litres` : ""}
                  {totalGrams > 0 ? `, ${totalGrams} g` : ""}.
                </span>
              </div>
            </div>
          </Panel>
        )}

        {/* Feedback messages */}
        {errorMsg && <ErrorBanner message={errorMsg} onRetry={() => setErrorMsg("")} />}
        {successMsg && <Notice tone="success">{successMsg}</Notice>}

        {/* Add / Edit Form Panel */}
        <Panel title={editingId ? "Edit Feeding Record" : "Add Feeding Record"}>
          <form onSubmit={handleSubmit} className="kf-form">
            <div className="kf-form-grid">
              <Field label="Animal Type" required>
                <select
                  value={animalType}
                  onChange={(e) => setAnimalType(e.target.value)}
                  className="kf-input"
                >
                  <option value="Poultry">Poultry (Chickens)</option>
                  <option value="Cattle">Cattle (Cows)</option>
                </select>
              </Field>

              {/* Group / Batch Field */}
              <Field
                label={animalType === "Poultry" ? "Poultry Batch / Flock" : "Cattle Animal / Group"}
                hint="Assign to a specific batch or animal"
              >
                <input
                  type="text"
                  list="feedingGroupOptions"
                  className="kf-input"
                  placeholder={animalType === "Poultry" ? "e.g. Layers Batch 1" : "e.g. Daisy / Lactating Cows"}
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                />
                <datalist id="feedingGroupOptions">
                  {animalType === "Poultry"
                    ? poultryBatches.map((b) => (
                        <option key={b.id} value={`${b.breed} (${b.purpose})`} />
                      ))
                    : livestockList.map((a) => (
                        <option key={a.id} value={`${a.name} ${a.tagNumber ? `[#${a.tagNumber}]` : ""}`} />
                      ))}
                </datalist>
              </Field>

              <Field label="Feed Type" required>
                <input
                  type="text"
                  className="kf-input"
                  placeholder="e.g. Layers Mash, Dairy Meal, Starter Crumbs"
                  value={feedType}
                  onChange={(e) => setFeedType(e.target.value)}
                />
              </Field>

              <Field label="Quantity" required>
                <input
                  type="number"
                  className="kf-input"
                  min="0"
                  step="0.01"
                  placeholder="e.g. 25"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </Field>

              <Field label="Unit" required>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="kf-input"
                >
                  <option value="kg">kg (kilograms)</option>
                  <option value="bags">bags</option>
                  <option value="litres">litres</option>
                  <option value="g">g (grams)</option>
                </select>
              </Field>

              <Field label="Date" required>
                <input
                  type="date"
                  className="kf-input"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </Field>

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

              <Field label="Supplier">
                <input
                  type="text"
                  className="kf-input"
                  placeholder="e.g. Unga Farm Care, Local Agrovet"
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                />
              </Field>
            </div>

            <Field label="Notes (Optional)" className="kf-field--full">
              <input
                type="text"
                className="kf-input"
                placeholder="e.g. Morning ration, supplemented with vitamins"
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
    </main>
  );
}
