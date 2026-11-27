import { useEffect, useMemo, useState } from "react";
import type { PoultryBatch, ProductionRecord, PopulationEvent } from "../types/farm";
import {
  loadPoultry,
  addPoultry,
  updatePoultry,
  deletePoultry,
  loadProduction,
  loadPopulationEvents,
} from "../services/storage";
import {
  Bird,
  Calendar,
  Clock,
  Egg,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import AnimalProductionModal from "../components/AnimalProductionModal";
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
import {
  formatAnimalAge,
  getPoultryLifeStage,
  estimateBirthDateFromAge,
  compareAgeByDate,
  getNairobiToday,
  getWeeksBetween,
} from "../utils/age";

const STAGE_OPTIONS = [
  { value: "all", label: "All" },
  { value: "chicks", label: "Chicks" },
  { value: "layers", label: "Layers" },
  { value: "broilers", label: "Broilers" },
  { value: "kienyeji", label: "Kienyeji" },
];

export default function PoultryView() {
  const [poultry, setPoultry] = useState<PoultryBatch[]>([]);
  const [productionRecords, setProductionRecords] = useState<ProductionRecord[]>([]);
  const [popEvents, setPopEvents] = useState<PopulationEvent[]>([]);
  const [productionBatch, setProductionBatch] = useState<PoultryBatch | null>(null);
  const [_loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filterStage, setFilterStage] = useState<string>("all");
  const [ageSortOrder, setAgeSortOrder] = useState<"asc" | "desc">("desc"); // desc = oldest first
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);

  // Form fields
  const [breed, setBreed] = useState("Kienyeji");
  const [purpose, setPurpose] = useState("Eggs & Meat");
  const [stage, setStage] = useState("chicks");
  const [initialCount, setInitialCount] = useState("");
  const [currentCount, setCurrentCount] = useState("");
  const [source, setSource] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [notes, setNotes] = useState("");
  const [dateAdded, setDateAdded] = useState(getNairobiToday());

  // Automatic Age fields
  const [ageEntryMode, setAgeEntryMode] = useState<"date" | "age">("date");
  const [hatchDate, setHatchDate] = useState<string>(getNairobiToday());
  const [ageVal, setAgeVal] = useState<string>("1");
  const [ageUnit, setAgeUnit] = useState<"days" | "weeks" | "months">("weeks");
  const [isHatchDateEstimated, setIsHatchDateEstimated] = useState<boolean>(false);

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  async function refreshPoultry() {
    try {
      setLoading(true);
      const [records, prod, events] = await Promise.all([
        loadPoultry(),
        loadProduction().catch(() => []),
        loadPopulationEvents({ species: "poultry" }).catch(() => []),
      ]);
      setPoultry(records);
      setProductionRecords(prod);
      setPopEvents(events);
    } catch (error) {
      console.error(error);
      setErrorMsg(error instanceof Error ? error.message : "Failed to load poultry records.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshPoultry();
  }, []);

  // Recalculate estimated hatch date when entering age
  useEffect(() => {
    if (ageEntryMode === "age") {
      const parsed = parseFloat(ageVal);
      if (!isNaN(parsed) && parsed >= 0) {
        const est = estimateBirthDateFromAge(parsed, ageUnit, dateAdded || getNairobiToday());
        setHatchDate(est);
        setIsHatchDateEstimated(true);
      }
    }
  }, [ageVal, ageUnit, dateAdded, ageEntryMode]);

  // Dynamic age helper for a batch
  function getBatchAgeInfo(batch: PoultryBatch) {
    const deathOrSale = popEvents.find(
      (e) => e.targetId === batch.id && (e.eventType === "death" || e.eventType === "sale")
    );
    const asOfDate = deathOrSale ? deathOrSale.date : undefined;
    const eventType = deathOrSale ? deathOrSale.eventType : undefined;

    const ageInfo = formatAnimalAge(batch.hatchDate, "poultry", {
      asOfDate,
      isEstimated: batch.isHatchDateEstimated,
      legacyAgeWeeks: batch.ageWeeks,
      eventType,
    });
    const lifeStage = getPoultryLifeStage(batch.hatchDate || ageInfo.weeks, batch.purpose, asOfDate);

    return { ageInfo, lifeStage, deathOrSale };
  }

  const totalInitial = useMemo(
    () => poultry.reduce((total, batch) => total + batch.initialCount, 0),
    [poultry]
  );

  const totalCurrent = useMemo(
    () => poultry.reduce((total, batch) => total + batch.currentCount, 0),
    [poultry]
  );

  const totalLoss = Math.max(0, totalInitial - totalCurrent);
  const overallLossRate = totalInitial > 0 ? ((totalLoss / totalInitial) * 100).toFixed(1) : "0.0";

  const totalChicks = useMemo(
    () =>
      poultry
        .filter((b) => {
          if (b.stage === "chicks") return true;
          if (!b.stage) {
            const weeks = getWeeksBetween(b.hatchDate || b.dateAdded, getNairobiToday());
            return weeks < 8;
          }
          return false;
        })
        .reduce((s, b) => s + b.currentCount, 0),
    [poultry]
  );

  const totalLayers = useMemo(
    () =>
      poultry
        .filter((b) => b.stage === "layers" || /layer/i.test(b.purpose))
        .reduce((s, b) => s + b.currentCount, 0),
    [poultry]
  );

  const totalBroilers = useMemo(
    () =>
      poultry
        .filter((b) => b.stage === "broilers" || /broiler/i.test(b.purpose))
        .reduce((s, b) => s + b.currentCount, 0),
    [poultry]
  );

  // Transition alerts for poultry
  const chicksOldEnough = useMemo(() => {
    return poultry.filter((b) => {
      if (b.stage !== "chicks" && b.stage) return false;
      const weeks = getWeeksBetween(b.hatchDate || b.dateAdded, getNairobiToday());
      return weeks >= 8;
    });
  }, [poultry]);

  const broilersReady = useMemo(() => {
    return poultry.filter((b) => {
      const isBroiler = b.stage === "broilers" || /broiler/i.test(b.purpose);
      if (!isBroiler) return false;
      const weeks = getWeeksBetween(b.hatchDate || b.dateAdded, getNairobiToday());
      return weeks >= 6;
    });
  }, [poultry]);

  function clearForm() {
    setBreed("Kienyeji");
    setPurpose("Eggs & Meat");
    setStage("chicks");
    setInitialCount("");
    setCurrentCount("");
    setSource("");
    setPurchasePrice("");
    setNotes("");
    setDateAdded(getNairobiToday());
    setHatchDate(getNairobiToday());
    setAgeVal("1");
    setAgeUnit("weeks");
    setAgeEntryMode("date");
    setIsHatchDateEstimated(false);
    setEditingId(null);
    setErrorMsg("");
  }

  function startEdit(batch: PoultryBatch) {
    setEditingId(batch.id);
    setBreed(batch.breed);
    setPurpose(batch.purpose);
    setStage(batch.stage || "chicks");
    setInitialCount(String(batch.initialCount));
    setCurrentCount(String(batch.currentCount));
    setSource(batch.source || "");
    setPurchasePrice(batch.purchasePrice ? String(batch.purchasePrice) : "");
    setNotes(batch.notes || "");
    setDateAdded(batch.dateAdded ? batch.dateAdded.slice(0, 10) : getNairobiToday());

    if (batch.hatchDate) {
      setHatchDate(batch.hatchDate.slice(0, 10));
      setIsHatchDateEstimated(Boolean(batch.isHatchDateEstimated));
      setAgeEntryMode(batch.isHatchDateEstimated ? "age" : "date");
      if (batch.isHatchDateEstimated) {
        const weeks = getWeeksBetween(batch.hatchDate, batch.dateAdded || getNairobiToday());
        setAgeVal(String(weeks));
        setAgeUnit("weeks");
      }
    } else {
      const est = estimateBirthDateFromAge(batch.ageWeeks || 1, "weeks", batch.dateAdded);
      setHatchDate(est);
      setIsHatchDateEstimated(true);
      setAgeEntryMode("age");
      setAgeVal(String(batch.ageWeeks || 1));
      setAgeUnit("weeks");
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const init = parseInt(initialCount);
    const curr = parseInt(currentCount);

    if (!breed.trim()) {
      setErrorMsg("Please enter the breed or flock name.");
      return;
    }
    if (isNaN(init) || init < 1) {
      setErrorMsg("Please enter a valid initial count (at least 1).");
      return;
    }
    if (isNaN(curr) || curr < 0) {
      setErrorMsg("Current count cannot be negative.");
      return;
    }
    if (curr > init) {
      setErrorMsg("Current count cannot be greater than initial bird count.");
      return;
    }

    const price = purchasePrice ? parseFloat(purchasePrice) : 0;
    const finalHatchDate = hatchDate.trim() || getNairobiToday();
    const calcWeeks = getWeeksBetween(finalHatchDate, getNairobiToday());

    try {
      setSaving(true);
      const payload = {
        breed: breed.trim(),
        purpose: purpose.trim(),
        initialCount: init,
        currentCount: curr,
        ageWeeks: calcWeeks,
        dateAdded,
        stage,
        source: source.trim(),
        purchasePrice: price,
        notes: notes.trim(),
        hatchDate: finalHatchDate,
        isHatchDateEstimated,
      };

      if (editingId) {
        await updatePoultry(editingId, payload);
        setSuccessMsg("Chicken batch updated successfully.");
      } else {
        await addPoultry(payload);
        setSuccessMsg("New chicken batch added successfully.");
      }

      await refreshPoultry();
      clearForm();
    } catch (err) {
      console.error(err);
      setErrorMsg(err instanceof Error ? err.message : "Failed to save poultry batch.");
    } finally {
      setSaving(false);
    }
  }

  async function actualDelete(id: string) {
    await deletePoultry(id);
    setSuccessMsg("Batch deleted.");
    await refreshPoultry();
  }

  function handleDelete(id: string, name: string) {
    setDeleteConfirm({ id, name });
  }

  // Filter and sort poultry
  const filteredPoultry = useMemo(() => {
    const list = poultry.filter((b) => {
      if (filterStage === "all") return true;
      const { ageInfo } = getBatchAgeInfo(b);
      const weeks = ageInfo.weeks;
      if (filterStage === "chicks") return b.stage === "chicks" || (!b.stage && weeks < 8);
      if (filterStage === "layers") return b.stage === "layers" || /layer/i.test(b.purpose);
      if (filterStage === "broilers") return b.stage === "broilers" || /broiler/i.test(b.purpose);
      if (filterStage === "kienyeji") return /kienyeji/i.test(b.breed) || b.stage === "kienyeji";
      return true;
    });

    // Sort by hatch date, NOT formatted string
    return list.sort((a, b) =>
      compareAgeByDate(a.hatchDate || a.dateAdded, b.hatchDate || b.dateAdded, ageSortOrder)
    );
  }, [poultry, filterStage, ageSortOrder, popEvents]);

  return (
    <main className="kf-page">
      <PageHeader
        title="Poultry Management"
        description="Manage your chicks from day-old brooding, broilers, layers, and kienyeji flocks."
        actions={
          <Button
            icon={<Plus size={16} />}
            onClick={() => {
              clearForm();
              window.scrollTo({ top: 400, behavior: "smooth" });
            }}
          >
            Add batch
          </Button>
        }
      />

      <div className="kf-stack">
        {/* Visual sector header */}
        <div className="kf-page-hero">
          <div className="kf-page-hero-thumb">
            <img src="/images/card-poultry.jpg" alt="Poultry flock" />
          </div>
          <div className="kf-page-hero-content">
            <h2 className="kf-page-hero-title">
              <Bird size={20} strokeWidth={1.8} />
              Poultry Operations & Flock Register
            </h2>
            <p className="kf-page-hero-desc">
              Manage day-old brooding chicks, active layers, broilers and kienyeji flocks. Age updates automatically every day.
            </p>
          </div>
          <div className="kf-page-hero-stats">
            <Badge tone="forest">{totalCurrent.toLocaleString()} Live Birds</Badge>
            <Badge tone="amber">{totalChicks.toLocaleString()} In Brooder</Badge>
          </div>
        </div>

        {/* Growth alerts */}
        {chicksOldEnough.length > 0 && (
          <Notice tone="info">
            <strong>Growth stage alert:</strong> {chicksOldEnough.length}{" "}
            {chicksOldEnough.length === 1 ? "flock has" : "flocks have"} reached 8+ weeks and are old enough to move to growers.
          </Notice>
        )}
        {broilersReady.length > 0 && (
          <Notice tone="success">
            <strong>Market readiness alert:</strong> {broilersReady.length}{" "}
            {broilersReady.length === 1 ? "broiler flock is" : "broiler flocks are"} now 6+ weeks and ready for market sale.
          </Notice>
        )}

        {/* KPI Summary Cards */}
        <div className="kf-grid kf-grid--stats">
          <StatCard
            tone="forest"
            image="/images/farm/chicken.webp"
            imageAlt="Current Living Birds"
            layout="image-right"
            label="Current Living Birds"
            value={totalCurrent.toLocaleString()}
            hint="Total across all batches"
          />
          <StatCard
            tone="amber"
            image="/images/farm/chick.webp"
            imageAlt="Chicks in Brooder"
            layout="image-right"
            label="Chicks in Brooder"
            value={totalChicks.toLocaleString()}
            hint="0 to 8 weeks old"
          />
          <StatCard
            tone="blue"
            image="/images/farm/chicken.webp"
            imageAlt="Layers & Broilers"
            layout="image-right"
            label="Layers & Broilers"
            value={`${totalLayers} layers / ${totalBroilers} broilers`}
            hint="Active production birds"
          />
          <StatCard
            tone={parseFloat(overallLossRate) > 5 ? "red" : "slate"}
            image="/images/farm/operating-loss.webp"
            imageAlt="Recorded Mortality"
            layout="image-right"
            label="Recorded Mortality"
            value={`${totalLoss.toLocaleString()} (${overallLossRate}%)`}
            hint={parseFloat(overallLossRate) > 5 ? "High mortality warning" : "Normal mortality"}
          />
        </div>

        {/* Add / Edit Form */}
        <Panel
          title={editingId ? "Edit Chicken Batch" : "Add Chickens (Chicks / Broilers / Layers)"}
          subtitle="Age is calculated from hatch date and updates automatically every day."
        >
          {errorMsg && <ErrorBanner message={errorMsg} />}
          {successMsg && <Notice tone="success">{successMsg}</Notice>}

          <form onSubmit={handleSubmit}>
            <div className="kf-form-grid">
              <Field label="Growth Stage" htmlFor="stage" required>
                <select id="stage" value={stage} onChange={(e) => setStage(e.target.value)}>
                  <option value="chicks">Day-old Chicks (0 – 8 wks)</option>
                  <option value="growers">Growers / Pullets (8 – 18 wks)</option>
                  <option value="layers">Layers (18+ wks)</option>
                  <option value="broilers">Broilers (Meat)</option>
                  <option value="kienyeji">Kienyeji / Improved Kienyeji</option>
                  <option value="adult">Adult Flock</option>
                </select>
              </Field>

              <Field label="Breed" htmlFor="breed" required>
                <input
                  id="breed"
                  type="text"
                  placeholder="e.g. Kenbro, Kuroiler, Cobb 500, Kienyeji"
                  value={breed}
                  onChange={(e) => setBreed(e.target.value)}
                  required
                />
              </Field>

              <Field label="Purpose" htmlFor="purpose" required>
                <input
                  id="purpose"
                  type="text"
                  placeholder="e.g. Eggs, Meat, Dual-purpose"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  required
                />
              </Field>

              <Field label="Initial Flock Size" htmlFor="initialCount" required>
                <input
                  id="initialCount"
                  type="number"
                  placeholder="e.g. 500"
                  value={initialCount}
                  onChange={(e) => {
                    setInitialCount(e.target.value);
                    if (!editingId && !currentCount) setCurrentCount(e.target.value);
                  }}
                  required
                />
              </Field>

              <Field
                label="Current Number Alive"
                htmlFor="currentCount"
                required
                hint={
                  initialCount && currentCount && parseInt(initialCount) > parseInt(currentCount)
                    ? `Deaths/Losses: ${parseInt(initialCount) - parseInt(currentCount)} birds (${(
                        ((parseInt(initialCount) - parseInt(currentCount)) / parseInt(initialCount)) *
                        100
                      ).toFixed(1)}%)`
                    : undefined
                }
              >
                <input
                  id="currentCount"
                  type="number"
                  placeholder="e.g. 485"
                  value={currentCount}
                  onChange={(e) => setCurrentCount(e.target.value)}
                  required
                />
              </Field>

     {/* Automatic Age Entry Section */}
<div className="kf-age-registration">
  <div className="kf-age-registration__header">
                  <label style={{ fontSize: 13, fontWeight: 600 }}>Age Registration Method</label>
                  <div className="kf-age-registration__actions">
                    <button
                      type="button"
                      className={`kf-btn kf-btn--sm ${ageEntryMode === "date" ? "kf-btn--primary" : "kf-btn--ghost"}`}
                      onClick={() => {
                        setAgeEntryMode("date");
                        setIsHatchDateEstimated(false);
                      }}
                    >
                      <Calendar size={13} style={{ marginRight: 4 }} />
                      Exact Hatch Date
                    </button>
                    <button
                      type="button"
                      className={`kf-btn kf-btn--sm ${ageEntryMode === "age" ? "kf-btn--primary" : "kf-btn--ghost"}`}
                      onClick={() => {
                        setAgeEntryMode("age");
                        setIsHatchDateEstimated(true);
                        const est = estimateBirthDateFromAge(
                          parseFloat(ageVal) || 0,
                          ageUnit,
                          dateAdded || getNairobiToday()
                        );
                        setHatchDate(est);
                      }}
                    >
                      <Clock size={13} style={{ marginRight: 4 }} />
                      Age When Registered
                    </button>
                  </div>
                </div>

                {ageEntryMode === "date" ? (
                  <Field label="Hatch Date" htmlFor="hatchDate" required>
                    <input
                      id="hatchDate"
                      type="date"
                      value={hatchDate}
                      onChange={(e) => {
                        setHatchDate(e.target.value);
                        setIsHatchDateEstimated(false);
                      }}
                      required
                    />
                  </Field>
                ) : (
                 <div className="kf-age-registration__fields">
                    <Field label="Age Value" htmlFor="poultryAgeVal" required>
                      <input
                        id="poultryAgeVal"
                        type="number"
                        step="0.5"
                        min="0"
                        placeholder="e.g. 3"
                        value={ageVal}
                        onChange={(e) => setAgeVal(e.target.value)}
                        required
                      />
                    </Field>
                    <Field label="Unit" htmlFor="poultryAgeUnit" required>
                      <select
                        id="poultryAgeUnit"
                        value={ageUnit}
                        onChange={(e) => setAgeUnit(e.target.value as "days" | "weeks" | "months")}
                      >
                        <option value="days">Days (under 3 weeks)</option>
                        <option value="weeks">Weeks (e.g. 5 weeks)</option>
                        <option value="months">Months (e.g. 6 months)</option>
                      </select>
                    </Field>
                  </div>
                )}

                <div style={{ fontSize: 12, marginTop: 6, color: "var(--kf-text-muted)" }}>
                  {isHatchDateEstimated ? (
                    <span style={{ color: "var(--kf-warning, #d97706)" }}>
                      Estimated hatch date: <strong>{hatchDate || "—"}</strong> (Marked estimated · Age will update automatically every day)
                    </span>
                  ) : (
                    <span>
                      Hatch date: <strong>{hatchDate || "—"}</strong> (Age will update automatically every day)
                    </span>
                  )}
                </div>
              </div>

              <Field label="Date Added / Received" htmlFor="dateAdded">
                <input
                  id="dateAdded"
                  type="date"
                  value={dateAdded}
                  onChange={(e) => setDateAdded(e.target.value)}
                />
              </Field>

              <Field label="Hatchery / Source Supplier (Optional)" htmlFor="source">
                <input
                  id="source"
                  type="text"
                  placeholder="e.g. Kenchic, Muguku, Local Hatchery"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                />
              </Field>

              <Field label="Total Acquisition Cost (KES, Optional)" htmlFor="purchasePrice">
                <input
                  id="purchasePrice"
                  type="number"
                  placeholder="e.g. 55000"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(e.target.value)}
                />
              </Field>
            </div>

            <Field label="Notes / Housing Location / Health Checks" htmlFor="notes" className="kf-field--full">
              <input
                id="notes"
                type="text"
                placeholder="e.g. Brooder House 1, heating lamp checked, 1st Gumboro scheduled"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Field>

            <div className="kf-form-actions">
              {editingId && (
                <Button variant="ghost" type="button" onClick={clearForm}>
                  Cancel Edit
                </Button>
              )}
              <Button type="submit" loading={saving}>
                {editingId ? "Update Batch" : "Add Chickens"}
              </Button>
            </div>
          </form>
        </Panel>

        {/* Records Table */}
        <Panel
          title={`Recorded Chicken Batches (${poultry.length})`}
          subtitle="Age updates automatically every day. Click header to sort by age."
          actions={
            <Segmented
              label="Filter by stage"
              options={STAGE_OPTIONS}
              value={filterStage}
              onChange={setFilterStage}
            />
          }
        >
          {filteredPoultry.length === 0 ? (
            <EmptyState
              icon={<Bird size={26} />}
              title="No chicken batches found"
              description="Use the form above to record your first flock of chicks or chickens."
            />
          ) : (
            <div className="kf-table-wrap">
              <table className="kf-table">
                <thead>
                  <tr>
                    <th>Flock / Breed</th>
                    <th>Stage</th>
                    <th
                      style={{ cursor: "pointer", userSelect: "none" }}
                      onClick={() => setAgeSortOrder(ageSortOrder === "asc" ? "desc" : "asc")}
                      title="Sort by age"
                    >
                      Age & Stage {ageSortOrder === "asc" ? "▲" : "▼"}
                    </th>
                    <th>Initial Birds</th>
                    <th>Current Live</th>
                    <th>Losses</th>
                    <th>Mortality %</th>
                    <th>Added Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPoultry.map((b) => {
                    const { ageInfo, lifeStage } = getBatchAgeInfo(b);
                    const losses = Math.max(0, b.initialCount - b.currentCount);
                    const lossPct = b.initialCount > 0 ? (losses / b.initialCount) * 100 : 0;
                    const isHighLoss = lossPct >= 5;

                    return (
                      <tr key={b.id}>
                        <td>
                          <strong>{b.breed}</strong>
                          <div style={{ fontSize: 12, color: "var(--kf-text-muted)" }}>{b.purpose}</div>
                        </td>
                        <td>
                          <Badge tone={lifeStage.tone}>
                            {b.stage ? b.stage.charAt(0).toUpperCase() + b.stage.slice(1) : lifeStage.name}
                          </Badge>
                        </td>
                        <td>
                          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                              <strong>{ageInfo.formatted}</strong>
                              <Badge tone={lifeStage.tone}>{lifeStage.name}</Badge>
                              {lifeStage.readyForSale && (
                                <Badge tone="green">Ready for sale</Badge>
                              )}
                            </div>
                            {b.isHatchDateEstimated && (
                              <span
                                style={{
                                  fontSize: 10,
                                  color: "var(--kf-warning, #d97706)",
                                  background: "rgba(245, 158, 11, 0.12)",
                                  padding: "1px 5px",
                                  borderRadius: 4,
                                  width: "fit-content",
                                }}
                              >
                                Estimated · Please confirm hatch date
                              </span>
                            )}
                          </div>
                        </td>
                        <td>{b.initialCount.toLocaleString()}</td>
                        <td>
                          <strong>{b.currentCount.toLocaleString()}</strong>
                        </td>
                        <td>{losses > 0 ? `${losses} birds` : "0"}</td>
                        <td>
                          {isHighLoss ? (
                            <Badge tone="red">{lossPct.toFixed(1)}%</Badge>
                          ) : (
                            <Badge tone="slate">{lossPct.toFixed(1)}%</Badge>
                          )}
                        </td>
                        <td>{b.dateAdded ? b.dateAdded.slice(0, 10) : "—"}</td>
                        <td>
                          <div className="kf-actions-cell">
                            <Button
                              variant="ghost"
                              size="sm"
                              icon={<Egg size={13} />}
                              onClick={() => setProductionBatch(b)}
                            >
                              Egg Production
                            </Button>
                            <IconButton
                              label="Edit"
                              icon={<Pencil size={16} />}
                              onClick={() => startEdit(b)}
                            />
                            <IconButton
                              label="Delete"
                              tone="danger"
                              icon={<Trash2 size={16} />}
                              onClick={() => handleDelete(b.id, `${b.breed} (${b.purpose})`)}
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

      {/* Delete confirmation modal */}
      <Modal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Delete batch?"
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
        <p>Are you sure you want to delete '{deleteConfirm?.name}'? This cannot be undone.</p>
      </Modal>

      {/* Individual Batch Production Modal */}
      {productionBatch && (
        <AnimalProductionModal
          open={!!productionBatch}
          onClose={() => setProductionBatch(null)}
          target={{ type: "poultry", batch: productionBatch }}
          records={productionRecords}
          onRecordSaved={refreshPoultry}
          allPoultry={poultry}
        />
      )}
    </main>
  );
}
