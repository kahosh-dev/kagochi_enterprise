import { useEffect, useMemo, useState } from "react";
import {
  loadLivestock,
  addLivestock,
  updateLivestock,
  deleteLivestock,
  loadProduction,
  loadPopulationEvents,
} from "../services/storage";
import type { LivestockAnimal, ProductionRecord, PopulationEvent } from "../types/farm";
import {
  ArrowRight,
  Beef,
  Calendar,
  Clock,
  Milk,
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
  getCattleLifeStage,
  estimateBirthDateFromAge,
  compareAgeByDate,
  getNairobiToday,
  getCalendarMonthsBetween,
} from "../utils/age";

const CATEGORY_OPTIONS = [
  { value: "all", label: "All Herd" },
  { value: "calf", label: "Calves" },
  { value: "heifer", label: "Heifers" },
  { value: "cow", label: "Cows" },
  { value: "bull", label: "Bulls" },
];

function categoryLabel(cat: string): string {
  switch (cat) {
    case "calf": return "Calf";
    case "heifer": return "Heifer";
    case "cow": return "Cow";
    case "bull": return "Bull";
    default: return cat;
  }
}

export default function LivestockView() {
  const [animals, setAnimals] = useState<LivestockAnimal[]>([]);
  const [productionRecords, setProductionRecords] = useState<ProductionRecord[]>([]);
  const [popEvents, setPopEvents] = useState<PopulationEvent[]>([]);
  const [productionAnimal, setProductionAnimal] = useState<LivestockAnimal | null>(null);
  const [_loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [ageSortOrder, setAgeSortOrder] = useState<"asc" | "desc">("desc"); // desc = oldest first
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);

  // Cattle form fields
  const [name, setName] = useState("");
  const [tagNumber, setTagNumber] = useState("");
  const [breed, setBreed] = useState("Friesian");
  const [category, setCategory] = useState<"calf" | "heifer" | "cow" | "bull">("cow");
  const [sex, setSex] = useState<"female" | "male">("female");
  const [damId, setDamId] = useState("");
  const [notes, setNotes] = useState("");
  const [dateAdded, setDateAdded] = useState(getNairobiToday());

  // Automatic Age fields
  const [ageEntryMode, setAgeEntryMode] = useState<"date" | "age">("date");
  const [dateOfBirth, setDateOfBirth] = useState<string>(getNairobiToday());
  const [ageVal, setAgeVal] = useState<string>("2");
  const [ageUnit, setAgeUnit] = useState<"days" | "weeks" | "months" | "years">("years");
  const [isBirthDateEstimated, setIsBirthDateEstimated] = useState<boolean>(false);

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  async function refreshAnimals() {
    try {
      setLoading(true);
      const [data, prod, events] = await Promise.all([
        loadLivestock(),
        loadProduction().catch(() => []),
        loadPopulationEvents({ species: "cattle" }).catch(() => []),
      ]);
      setAnimals(data);
      setProductionRecords(prod);
      setPopEvents(events);
    } catch (error) {
      console.error("Failed to load livestock:", error);
      setErrorMsg(error instanceof Error ? error.message : "Failed to load cattle records.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshAnimals();
  }, []);

  // Recalculate estimated DOB when entering age
  useEffect(() => {
    if (ageEntryMode === "age") {
      const parsed = parseFloat(ageVal);
      if (!isNaN(parsed) && parsed >= 0) {
        const est = estimateBirthDateFromAge(parsed, ageUnit, dateAdded || getNairobiToday());
        setDateOfBirth(est);
        setIsBirthDateEstimated(true);
      }
    }
  }, [ageVal, ageUnit, dateAdded, ageEntryMode]);

  // Dynamic age helper for an animal
  function getAnimalAgeInfo(animal: LivestockAnimal) {
    const deathOrSale = popEvents.find(
      (e) => e.targetId === animal.id && (e.eventType === "death" || e.eventType === "sale")
    );
    const asOfDate = deathOrSale
      ? deathOrSale.date
      : animal.status === "sold" || animal.status === "deceased"
      ? animal.dateAdded
      : undefined;
    const eventType = deathOrSale
      ? deathOrSale.eventType
      : animal.status === "sold"
      ? "sale"
      : animal.status === "deceased"
      ? "death"
      : undefined;

    const ageInfo = formatAnimalAge(animal.dateOfBirth, "cattle", {
      asOfDate,
      isEstimated: animal.isBirthDateEstimated,
      legacyAgeYears: animal.ageYears,
      eventType,
    });
    const lifeStage = getCattleLifeStage(animal.dateOfBirth || animal.ageYears * 12, animal.sex, asOfDate);

    return { ageInfo, lifeStage, deathOrSale };
  }

  // Category counts using dynamic calendar months from date_of_birth
  const countCalves = useMemo(
    () =>
      animals.filter((a) => {
        if (a.category === "calf") return true;
        if (!a.category) {
          const months = getCalendarMonthsBetween(a.dateOfBirth || a.dateAdded, getNairobiToday());
          return months < 6;
        }
        return false;
      }).length,
    [animals]
  );

  const countHeifers = useMemo(
    () =>
      animals.filter((a) => {
        if (a.category === "heifer") return true;
        if (!a.category && a.sex !== "male") {
          const months = getCalendarMonthsBetween(a.dateOfBirth || a.dateAdded, getNairobiToday());
          return months >= 6 && months < 24;
        }
        return false;
      }).length,
    [animals]
  );

  const countCows = useMemo(
    () =>
      animals.filter((a) => {
        if (a.category === "cow") return true;
        if (!a.category && a.sex !== "male") {
          const months = getCalendarMonthsBetween(a.dateOfBirth || a.dateAdded, getNairobiToday());
          return months >= 24;
        }
        return false;
      }).length,
    [animals]
  );

  const countBulls = useMemo(
    () => animals.filter((a) => a.category === "bull" || a.sex === "male").length,
    [animals]
  );

  // Transition alerts: calves now old enough (>= 6 months) to move to heifers/young bulls
  const calvesOldEnough = useMemo(() => {
    return animals.filter((a) => {
      if (a.category !== "calf" && a.category) return false;
      const months = getCalendarMonthsBetween(a.dateOfBirth || a.dateAdded, getNairobiToday());
      return months >= 6;
    });
  }, [animals]);

  function resetForm() {
    setEditingId(null);
    setName("");
    setTagNumber("");
    setBreed("Friesian");
    setCategory("cow");
    setSex("female");
    setDamId("");
    setNotes("");
    setDateAdded(getNairobiToday());
    setDateOfBirth(getNairobiToday());
    setAgeVal("2");
    setAgeUnit("years");
    setAgeEntryMode("date");
    setIsBirthDateEstimated(false);
    setErrorMsg("");
  }

  function startEdit(animal: LivestockAnimal) {
    setEditingId(animal.id);
    setName(animal.name);
    setTagNumber(animal.tagNumber || "");
    setBreed(animal.breed);
    setCategory(
      (animal.category as any) ||
        (animal.ageYears < 0.5 ? "calf" : animal.ageYears < 2 ? "heifer" : animal.sex === "male" ? "bull" : "cow")
    );
    setSex((animal.sex as any) || "female");
    setDamId(animal.damId || "");
    setNotes(animal.notes || "");
    setDateAdded(animal.dateAdded ? animal.dateAdded.slice(0, 10) : getNairobiToday());

    if (animal.dateOfBirth) {
      setDateOfBirth(animal.dateOfBirth.slice(0, 10));
      setIsBirthDateEstimated(Boolean(animal.isBirthDateEstimated));
      setAgeEntryMode(animal.isBirthDateEstimated ? "age" : "date");
      if (animal.isBirthDateEstimated) {
        const months = getCalendarMonthsBetween(animal.dateOfBirth, animal.dateAdded || getNairobiToday());
        setAgeVal(String(months));
        setAgeUnit("months");
      }
    } else {
      const est = estimateBirthDateFromAge(animal.ageYears || 1, "years", animal.dateAdded);
      setDateOfBirth(est);
      setIsBirthDateEstimated(true);
      setAgeEntryMode("age");
      setAgeVal(String(animal.ageYears || 1));
      setAgeUnit("years");
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!name.trim()) {
      setErrorMsg("Please enter the animal name or identifier.");
      return;
    }
    if (!breed.trim()) {
      setErrorMsg("Please enter the cattle breed.");
      return;
    }

    const finalDob = dateOfBirth.trim() || getNairobiToday();
    // Calculate ageYears for backward compatibility
    const calcMonths = getCalendarMonthsBetween(finalDob, getNairobiToday());
    const calcAgeYears = Math.round((calcMonths / 12) * 10) / 10;

    try {
      setSaving(true);
      const payload = {
        name: name.trim(),
        type: "Cattle",
        breed: breed.trim(),
        ageYears: calcAgeYears,
        dateAdded,
        category,
        tagNumber: tagNumber.trim(),
        sex,
        damId: damId.trim(),
        status: "active",
        notes: notes.trim(),
        dateOfBirth: finalDob,
        isBirthDateEstimated,
      };

      if (editingId) {
        await updateLivestock(editingId, payload);
        setSuccessMsg(`Updated cattle record: ${name.trim()}`);
      } else {
        await addLivestock(payload);
        setSuccessMsg(`Added cattle record: ${name.trim()} (${category})`);
      }

      await refreshAnimals();
      resetForm();
    } catch (error) {
      console.error(error);
      setErrorMsg(error instanceof Error ? error.message : "Failed to save cattle record.");
    } finally {
      setSaving(false);
    }
  }

  async function handlePromoteCategory(animal: LivestockAnimal, nextCategory: "heifer" | "cow" | "young_bull" | "bull") {
    try {
      setSaving(true);
      await updateLivestock(animal.id, {
        name: animal.name,
        type: "Cattle",
        breed: animal.breed,
        ageYears: animal.ageYears,
        dateAdded: animal.dateAdded,
        category: nextCategory === "young_bull" ? "bull" : nextCategory,
        tagNumber: animal.tagNumber || "",
        sex: animal.sex || "female",
        damId: animal.damId || "",
        status: animal.status || "active",
        notes: `${animal.notes ? animal.notes + " | " : ""}Promoted to ${nextCategory.toUpperCase()} on ${getNairobiToday()}`,
        dateOfBirth: animal.dateOfBirth,
        isBirthDateEstimated: animal.isBirthDateEstimated,
      });
      setSuccessMsg(`${animal.name} has been transitioned to ${nextCategory.toUpperCase()}.`);
      await refreshAnimals();
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to transition category.");
    } finally {
      setSaving(false);
    }
  }

  async function actualDelete(id: string) {
    try {
      await deleteLivestock(id);
      setSuccessMsg("Cattle record removed.");
      await refreshAnimals();
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : "Failed to delete cattle record.");
    }
  }

  function handleDelete(id: string, animalName: string) {
    setDeleteConfirm({ id, name: animalName });
  }

  // Filter and sort animals
  const filteredAnimals = useMemo(() => {
    const list = animals.filter((a) => {
      if (categoryFilter === "all") return true;
      const { ageInfo } = getAnimalAgeInfo(a);
      const months = ageInfo.months;
      if (categoryFilter === "calf") return a.category === "calf" || (!a.category && months < 6);
      if (categoryFilter === "heifer") return a.category === "heifer" || (!a.category && months >= 6 && months < 24 && a.sex !== "male");
      if (categoryFilter === "cow") return a.category === "cow" || (!a.category && months >= 24 && a.sex !== "male");
      if (categoryFilter === "bull") return a.category === "bull" || a.sex === "male";
      return true;
    });

    // Sorting by date, NOT formatted string
    return list.sort((a, b) =>
      compareAgeByDate(a.dateOfBirth || a.dateAdded, b.dateOfBirth || b.dateAdded, ageSortOrder)
    );
  }, [animals, categoryFilter, ageSortOrder, popEvents]);

  return (
    <main className="kf-page">
      <PageHeader
        title="Livestock Management"
        description="Manage your cattle herd through each growth stage from birth to milking."
        actions={
          <Button
            icon={<Plus size={16} />}
            onClick={() => {
              resetForm();
              window.scrollTo({ top: 400, behavior: "smooth" });
            }}
          >
            Add animal
          </Button>
        }
      />

      <div className="kf-stack">
        {/* Visual sector header */}
        <div className="kf-page-hero">
          <div className="kf-page-hero-thumb">
            <img src="/images/card-livestock.jpg" alt="Dairy cattle in pasture" />
          </div>
          <div className="kf-page-hero-content">
            <h2 className="kf-page-hero-title">
              <Beef size={20} strokeWidth={1.8} />
              Cattle Herd Management & Pedigree
            </h2>
            <p className="kf-page-hero-desc">
              Track dairy cows, growing heifers, calves and bulls. Monitor ear tag numbers, dam lineages, and automatic daily age.
            </p>
          </div>
          <div className="kf-page-hero-stats">
            <Badge tone="forest">{animals.length} Registered Cattle</Badge>
            <Badge tone="blue">{countCows} Milking Cows</Badge>
          </div>
        </div>

        {/* Life stage transition alert if calves are old enough */}
        {calvesOldEnough.length > 0 && (
          <Notice tone="info">
            <strong>Growth stage alert:</strong> {calvesOldEnough.length}{" "}
            {calvesOldEnough.length === 1 ? "calf is" : "calves are"} now 6+ months old and ready to move to{" "}
            {calvesOldEnough.some((c) => c.sex === "male") ? "heifers or young bulls" : "heifers"}.
          </Notice>
        )}

        {/* KPI Cards */}
        <div className="kf-grid kf-grid--stats">
          <StatCard
            tone="forest"
            image="/images/farm/cow.webp"
            imageAlt="Total Cattle Herd"
            layout="image-right"
            label="Total Cattle Herd"
            value={animals.length}
            hint="All registered animals"
            onClick={() => setCategoryFilter("all")}
          />
          <StatCard
            tone="blue"
            image="/images/farm/cow.webp"
            imageAlt="Adult Cows"
            layout="image-right"
            label="Adult Cows"
            value={countCows}
            hint="24+ mos · Milking & dry"
            onClick={() => setCategoryFilter("cow")}
          />
          <StatCard
            tone="amber"
            image="/images/farm/calf.webp"
            imageAlt="Calves & Heifers"
            layout="image-right"
            label="Calves & Heifers"
            value={countCalves + countHeifers}
            hint={`${countCalves} calves (0-6m) · ${countHeifers} heifers (6-24m)`}
            onClick={() => setCategoryFilter("heifer")}
          />
          <StatCard
            tone="slate"
            image="/images/farm/cow.webp"
            imageAlt="Bulls"
            layout="image-right"
            label="Bulls"
            value={countBulls}
            hint="Male animals on farm"
            onClick={() => setCategoryFilter("bull")}
          />
        </div>

        {/* Add / Edit Form */}
        <Panel
          title={editingId ? "Edit Cattle Record" : "Add Cattle / Calf / Heifer"}
          subtitle="Age is automatically calculated from birth date and updates daily."
        >
          {errorMsg && <ErrorBanner message={errorMsg} />}
          {successMsg && <Notice tone="success">{successMsg}</Notice>}

          <form onSubmit={handleSubmit}>
            <div className="kf-form-grid">
              <Field label="Animal Name" htmlFor="animalName" required>
                <input
                  id="animalName"
                  type="text"
                  placeholder="e.g. Baraka, Neema, Daisy"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </Field>

              <Field label="Ear Tag Number (Optional)" htmlFor="tagNumber">
                <input
                  id="tagNumber"
                  type="text"
                  placeholder="e.g. KAG-042"
                  value={tagNumber}
                  onChange={(e) => setTagNumber(e.target.value)}
                />
              </Field>

              <Field label="Cattle Category" htmlFor="category" required>
                <select
                  id="category"
                  value={category}
                  onChange={(e) => {
                    const cat = e.target.value as "calf" | "heifer" | "cow" | "bull";
                    setCategory(cat);
                    if (cat === "heifer" || cat === "cow") {
                      setSex("female");
                    } else if (cat === "bull") {
                      setSex("male");
                    }
                  }}
                >
                  <option value="calf">Calf (0 – 6 months)</option>
                  <option value="heifer">Heifer (6 – 24 months)</option>
                  <option value="cow">Adult Cow (24+ months)</option>
                  <option value="bull">Bull / Young Bull</option>
                </select>
              </Field>

              <Field label="Breed" htmlFor="livestockBreed" required>
                <input
                  id="livestockBreed"
                  type="text"
                  list="cattle-breeds"
                  placeholder="e.g. Friesian, Ayrshire, Jersey"
                  value={breed}
                  onChange={(e) => setBreed(e.target.value)}
                  required
                />
                <datalist id="cattle-breeds">
                  <option value="Friesian" />
                  <option value="Ayrshire" />
                  <option value="Jersey" />
                  <option value="Guernsey" />
                  <option value="Sahiwal" />
                  <option value="Boran" />
                  <option value="Crossbreed" />
                </datalist>
              </Field>

              <Field label="Sex" htmlFor="sex">
                <select id="sex" value={sex} onChange={(e) => setSex(e.target.value as "female" | "male")}>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                </select>
              </Field>

              {/* Automatic Age Entry Section */}
              <div style={{ gridColumn: "span 2", background: "rgba(255, 255, 255, 0.04)", padding: "12px", borderRadius: 8, border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <label style={{ fontSize: 13, fontWeight: 600 }}>Age Registration Method</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      type="button"
                      className={`kf-btn kf-btn--sm ${ageEntryMode === "date" ? "kf-btn--primary" : "kf-btn--ghost"}`}
                      onClick={() => {
                        setAgeEntryMode("date");
                        setIsBirthDateEstimated(false);
                      }}
                    >
                      <Calendar size={13} style={{ marginRight: 4 }} />
                      Exact Date of Birth
                    </button>
                    <button
                      type="button"
                      className={`kf-btn kf-btn--sm ${ageEntryMode === "age" ? "kf-btn--primary" : "kf-btn--ghost"}`}
                      onClick={() => {
                        setAgeEntryMode("age");
                        setIsBirthDateEstimated(true);
                        const est = estimateBirthDateFromAge(parseFloat(ageVal) || 0, ageUnit, dateAdded || getNairobiToday());
                        setDateOfBirth(est);
                      }}
                    >
                      <Clock size={13} style={{ marginRight: 4 }} />
                      Age When Registered
                    </button>
                  </div>
                </div>

                {ageEntryMode === "date" ? (
                  <Field label="Date of Birth" htmlFor="dateOfBirth" required>
                    <input
                      id="dateOfBirth"
                      type="date"
                      value={dateOfBirth}
                      onChange={(e) => {
                        setDateOfBirth(e.target.value);
                        setIsBirthDateEstimated(false);
                      }}
                      required
                    />
                  </Field>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <Field label="Age Value" htmlFor="ageVal" required>
                      <input
                        id="ageVal"
                        type="number"
                        step="0.5"
                        min="0"
                        placeholder="e.g. 3"
                        value={ageVal}
                        onChange={(e) => setAgeVal(e.target.value)}
                        required
                      />
                    </Field>
                    <Field label="Unit" htmlFor="ageUnit" required>
                      <select
                        id="ageUnit"
                        value={ageUnit}
                        onChange={(e) => setAgeUnit(e.target.value as "days" | "weeks" | "months" | "years")}
                      >
                        <option value="days">Days</option>
                        <option value="weeks">Weeks</option>
                        <option value="months">Months (e.g. 3 months)</option>
                        <option value="years">Years (e.g. 2.5 years)</option>
                      </select>
                    </Field>
                  </div>
                )}

                <div style={{ fontSize: 12, marginTop: 6, color: "var(--kf-text-muted)" }}>
                  {isBirthDateEstimated ? (
                    <span style={{ color: "var(--kf-warning, #d97706)" }}>
                      Estimated birth date: <strong>{dateOfBirth || "—"}</strong> (Marked estimated · Age will update automatically every day)
                    </span>
                  ) : (
                    <span>
                      Birth date: <strong>{dateOfBirth || "—"}</strong> (Age will update automatically every day)
                    </span>
                  )}
                </div>
              </div>

              <Field label="Date Added to Herd" htmlFor="livestockDateAdded">
                <input
                  id="livestockDateAdded"
                  type="date"
                  value={dateAdded}
                  onChange={(e) => setDateAdded(e.target.value)}
                />
              </Field>

              <Field label="Mother / Dam Tag or Name (Optional)" htmlFor="damId">
                <input
                  id="damId"
                  type="text"
                  placeholder="e.g. Neema (KAG-012)"
                  value={damId}
                  onChange={(e) => setDamId(e.target.value)}
                />
              </Field>

              <Field label="Observations / Health Status" htmlFor="livestockNotes">
                <input
                  id="livestockNotes"
                  type="text"
                  placeholder="e.g. Dewormed, high milk yielder, weaned"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </Field>
            </div>

            <div className="kf-form-actions">
              {editingId && (
                <Button variant="ghost" type="button" onClick={resetForm}>
                  Cancel Edit
                </Button>
              )}
              <Button type="submit" loading={saving}>
                {editingId ? "Update Cattle Record" : "Save Cattle Record"}
              </Button>
            </div>
          </form>
        </Panel>

        {/* Herd Table */}
        <Panel
          title={`Cattle Herd Inventory (${animals.length})`}
          subtitle="Age updates automatically every day. Click header to sort by age."
          actions={
            <Segmented
              label="Filter by category"
              options={CATEGORY_OPTIONS}
              value={categoryFilter}
              onChange={setCategoryFilter}
            />
          }
        >
          {filteredAnimals.length === 0 ? (
            <EmptyState
              icon={<Beef size={26} />}
              title="No cattle found"
              description="Add your calves, heifers, and cows using the form above."
            />
          ) : (
            <div className="kf-table-wrap">
              <table className="kf-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Tag #</th>
                    <th>Breed</th>
                    <th>Category</th>
                    <th>Sex</th>
                    <th
                      style={{ cursor: "pointer", userSelect: "none" }}
                      onClick={() => setAgeSortOrder(ageSortOrder === "asc" ? "desc" : "asc")}
                      title="Sort by age"
                    >
                      Age & Stage {ageSortOrder === "asc" ? "▲" : "▼"}
                    </th>
                    <th>Date Added</th>
                    <th>Notes</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAnimals.map((a) => {
                    const { ageInfo, lifeStage } = getAnimalAgeInfo(a);
                    const cat = a.category || lifeStage.id;

                    return (
                      <tr key={a.id}>
                        <td>
                          <strong>{a.name}</strong>
                        </td>
                        <td>
                          <span style={{ fontFamily: "monospace" }}>
                            {a.tagNumber || `#${a.id.slice(0, 6)}`}
                          </span>
                        </td>
                        <td>{a.breed}</td>
                        <td>
                          <Badge tone={lifeStage.tone}>
                            {a.category ? categoryLabel(a.category) : lifeStage.name}
                          </Badge>
                        </td>
                        <td>{a.sex === "male" ? "Male" : "Female"}</td>
                        <td>
                          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                              <strong>{ageInfo.formatted}</strong>
                              <Badge tone={lifeStage.tone}>{lifeStage.name}</Badge>
                            </div>
                            {a.isBirthDateEstimated && (
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
                                Estimated · Please confirm birth date
                              </span>
                            )}
                          </div>
                        </td>
                        <td>{a.dateAdded ? a.dateAdded.slice(0, 10) : "—"}</td>
                        <td>
                          {a.notes ? (
                            <span style={{ fontSize: 12, color: "var(--kf-text-muted)" }}>{a.notes}</span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td>
                          <div className="kf-actions-cell">
                            {cat === "calf" && a.sex !== "male" && ageInfo.months >= 6 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                icon={<ArrowRight size={13} />}
                                onClick={() => handlePromoteCategory(a, "heifer")}
                              >
                                To Heifer
                              </Button>
                            )}
                            {cat === "heifer" && ageInfo.months >= 24 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                icon={<ArrowRight size={13} />}
                                onClick={() => handlePromoteCategory(a, "cow")}
                              >
                                To Cow
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              icon={<Milk size={13} />}
                              onClick={() => setProductionAnimal(a)}
                            >
                              Milk Production
                            </Button>
                            <IconButton
                              label="Edit"
                              icon={<Pencil size={16} />}
                              onClick={() => startEdit(a)}
                            />
                            <IconButton
                              label={popEvents.some((event) => event.targetId === a.id) || (a.status && a.status !== "active") ? "Reconcile population history before deleting" : "Delete"}
                              tone="danger"
                              icon={<Trash2 size={16} />}
                              disabled={popEvents.some((event) => event.targetId === a.id) || (a.status !== undefined && a.status !== "active")}
                              onClick={() => handleDelete(a.id, a.name)}
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
        title="Delete animal?"
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

      {/* Individual Animal Production Modal */}
      {productionAnimal && (
        <AnimalProductionModal
          open={!!productionAnimal}
          onClose={() => setProductionAnimal(null)}
          target={{ type: "cattle", animal: productionAnimal }}
          records={productionRecords}
          onRecordSaved={refreshAnimals}
          allLivestock={animals}
        />
      )}
    </main>
  );
}
