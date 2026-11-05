import { useEffect, useMemo, useState } from "react";
import {
  loadLivestock,
  addLivestock,
  updateLivestock,
  deleteLivestock,
} from "../services/storage";
import type { LivestockAnimal } from "../types/farm";
import {
  CowIcon,
  CalfIcon,
  HeiferIcon,
} from "../components/FarmIcons";
import {
  ArrowRight,
  Beef,
  Pencil,
  Plus,
  Trash2,
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

const CATEGORY_OPTIONS = [
  { value: "all", label: "All Herd" },
  { value: "calf", label: "Calves" },
  { value: "heifer", label: "Heifers" },
  { value: "cow", label: "Cows" },
  { value: "bull", label: "Bulls" },
];

type CategoryTone = "amber" | "green" | "forest" | "blue" | "slate";

function categoryBadgeTone(cat: string): CategoryTone {
  switch (cat) {
    case "calf": return "amber";
    case "heifer": return "green";
    case "cow": return "forest";
    case "bull": return "blue";
    default: return "slate";
  }
}

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
  const [_loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);

  // Cattle form fields
  const [name, setName] = useState("");
  const [tagNumber, setTagNumber] = useState("");
  const [breed, setBreed] = useState("Friesian");
  const [category, setCategory] = useState<"calf" | "heifer" | "cow" | "bull">("cow");
  const [sex, setSex] = useState<"female" | "male">("female");
  const [ageYears, setAgeYears] = useState("2.5");
  const [damId, setDamId] = useState("");
  const [notes, setNotes] = useState("");
  const [dateAdded, setDateAdded] = useState(new Date().toISOString().slice(0, 10));

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  async function refreshAnimals() {
    try {
      setLoading(true);
      const data = await loadLivestock();
      setAnimals(data);
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

  // Category counts
  const countCalves = useMemo(
    () => animals.filter((a) => a.category === "calf" || a.ageYears < 1).length,
    [animals]
  );
  const countHeifers = useMemo(
    () => animals.filter((a) => a.category === "heifer" || (a.category !== "calf" && a.category !== "cow" && a.category !== "bull" && a.ageYears >= 1 && a.ageYears < 2.5 && a.sex !== "male")).length,
    [animals]
  );
  const countCows = useMemo(
    () => animals.filter((a) => a.category === "cow" || (!a.category && a.ageYears >= 2.5 && a.sex !== "male")).length,
    [animals]
  );
  const countBulls = useMemo(
    () => animals.filter((a) => a.category === "bull" || a.sex === "male").length,
    [animals]
  );

  function resetForm() {
    setEditingId(null);
    setName("");
    setTagNumber("");
    setBreed("Friesian");
    setCategory("cow");
    setSex("female");
    setAgeYears("2.5");
    setDamId("");
    setNotes("");
    setDateAdded(new Date().toISOString().slice(0, 10));
    setErrorMsg("");
  }

  function startEdit(animal: LivestockAnimal) {
    setEditingId(animal.id);
    setName(animal.name);
    setTagNumber(animal.tagNumber || "");
    setBreed(animal.breed);
    setCategory((animal.category as any) || (animal.ageYears < 1 ? "calf" : animal.ageYears < 2.5 ? "heifer" : animal.sex === "male" ? "bull" : "cow"));
    setSex((animal.sex as any) || "female");
    setAgeYears(String(animal.ageYears));
    setDamId(animal.damId || "");
    setNotes(animal.notes || "");
    setDateAdded(animal.dateAdded ? animal.dateAdded.slice(0, 10) : new Date().toISOString().slice(0, 10));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const age = parseFloat(ageYears);

    if (!name.trim()) {
      setErrorMsg("Please enter the animal name or identifier.");
      return;
    }
    if (!breed.trim()) {
      setErrorMsg("Please enter the cattle breed.");
      return;
    }
    if (isNaN(age) || age < 0) {
      setErrorMsg("Please enter a valid age in years.");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        name: name.trim(),
        type: "Cattle",
        breed: breed.trim(),
        ageYears: age,
        dateAdded,
        category,
        tagNumber: tagNumber.trim(),
        sex,
        damId: damId.trim(),
        status: "active",
        notes: notes.trim(),
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

  async function handlePromoteCategory(animal: LivestockAnimal, nextCategory: "heifer" | "cow") {
    try {
      setSaving(true);
      await updateLivestock(animal.id, {
        name: animal.name,
        type: "Cattle",
        breed: animal.breed,
        ageYears: animal.ageYears,
        dateAdded: animal.dateAdded,
        category: nextCategory,
        tagNumber: animal.tagNumber || "",
        sex: animal.sex || "female",
        damId: animal.damId || "",
        status: animal.status || "active",
        notes: `${animal.notes ? animal.notes + " | " : ""}Promoted to ${nextCategory} on ${new Date().toISOString().slice(0, 10)}`,
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
    await deleteLivestock(id);
    setSuccessMsg("Cattle record removed.");
    await refreshAnimals();
  }

  function handleDelete(id: string, animalName: string) {
    setDeleteConfirm({ id, name: animalName });
  }

  const filteredAnimals = animals.filter((a) => {
    if (categoryFilter === "all") return true;
    if (categoryFilter === "calf") return a.category === "calf" || a.ageYears < 1;
    if (categoryFilter === "heifer") return a.category === "heifer" || (a.category !== "calf" && a.category !== "cow" && a.category !== "bull" && a.ageYears >= 1 && a.ageYears < 2.5 && a.sex !== "male");
    if (categoryFilter === "cow") return a.category === "cow" || (!a.category && a.ageYears >= 2.5 && a.sex !== "male");
    if (categoryFilter === "bull") return a.category === "bull" || a.sex === "male";
    return true;
  });

  return (
    <main className="kf-page">
      <PageHeader
        title="Livestock Management"
        description="Manage your cattle herd through each growth stage from birth to milking."
        actions={
          <Button icon={<Plus size={16} />} onClick={() => { resetForm(); window.scrollTo({ top: 400, behavior: "smooth" }); }}>
            Add animal
          </Button>
        }
      />

      <div className="kf-stack">
        {/* KPI Cards */}
        <div className="kf-grid kf-grid--stats">
          <StatCard
            tone="forest"
            icon={<CowIcon size={20} />}
            label="Total Cattle Herd"
            value={animals.length}
            hint="All registered animals"
            onClick={() => setCategoryFilter("all")}
          />
          <StatCard
            tone="blue"
            icon={<CowIcon size={20} />}
            label="Adult Cows"
            value={countCows}
            hint="Milking & breeding cows"
            onClick={() => setCategoryFilter("cow")}
          />
          <StatCard
            tone="amber"
            icon={<HeiferIcon size={20} />}
            label="Calves & Heifers"
            value={countCalves + countHeifers}
            hint={`${countCalves} calves · ${countHeifers} heifers`}
            onClick={() => setCategoryFilter("heifer")}
          />
          <StatCard
            tone="slate"
            icon={<CalfIcon size={20} />}
            label="Bulls"
            value={countBulls}
            hint="Male animals on farm"
            onClick={() => setCategoryFilter("bull")}
          />
        </div>

        {/* Add / Edit Form */}
        <Panel
          title={editingId ? "Edit Cattle Record" : "Add Cattle / Calf / Heifer"}
          subtitle="Keep accurate individual identification, age, and breeding stages."
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
                    if (cat === "calf") {
                      setAgeYears("0.5");
                    } else if (cat === "heifer") {
                      setAgeYears("1.5");
                      setSex("female");
                    } else if (cat === "cow") {
                      setAgeYears("3.0");
                      setSex("female");
                    } else if (cat === "bull") {
                      setSex("male");
                    }
                  }}
                >
                  <option value="calf">Calf (Under 1 year)</option>
                  <option value="heifer">Heifer (Young female 1 – 2.5 yrs)</option>
                  <option value="cow">Adult Cow (Milking / Dry)</option>
                  <option value="bull">Bull</option>
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

              <Field label="Age in Years" htmlFor="ageYears" required>
                <input
                  id="ageYears"
                  type="number"
                  step="0.1"
                  placeholder="e.g. 2.5"
                  value={ageYears}
                  onChange={(e) => setAgeYears(e.target.value)}
                  required
                />
              </Field>

              <Field label="Date Added / Birth Date" htmlFor="livestockDateAdded">
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
          subtitle="Track individual cattle and transition growth stages."
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
                    <th>Age (Yrs)</th>
                    <th>Date Added</th>
                    <th>Notes</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAnimals.map((a) => {
                    const cat = a.category || (a.ageYears < 1 ? "calf" : a.ageYears < 2.5 ? "heifer" : a.sex === "male" ? "bull" : "cow");

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
                          <Badge tone={categoryBadgeTone(cat)}>
                            {categoryLabel(cat)}
                          </Badge>
                        </td>
                        <td>{a.sex === "male" ? "Male" : "Female"}</td>
                        <td>{a.ageYears} yrs</td>
                        <td>{a.dateAdded ? a.dateAdded.slice(0, 10) : "—"}</td>
                        <td>
                          {a.notes
                            ? <span style={{ fontSize: 12, color: "var(--kf-text-muted)" }}>{a.notes}</span>
                            : "—"
                          }
                        </td>
                        <td>
                          <div className="kf-actions-cell">
                            {cat === "calf" && a.sex !== "male" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                icon={<ArrowRight size={13} />}
                                onClick={() => handlePromoteCategory(a, "heifer")}
                              >
                                To Heifer
                              </Button>
                            )}
                            {cat === "heifer" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                icon={<ArrowRight size={13} />}
                                onClick={() => handlePromoteCategory(a, "cow")}
                              >
                                To Cow
                              </Button>
                            )}
                            <IconButton
                              label="Edit"
                              icon={<Pencil size={16} />}
                              onClick={() => startEdit(a)}
                            />
                            <IconButton
                              label="Delete"
                              tone="danger"
                              icon={<Trash2 size={16} />}
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
    </main>
  );
}
