import React, { useEffect, useMemo, useState } from "react";
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
  BullIcon,
} from "../components/FarmIcons";
import {
  Plus,
  Edit2,
  Trash2,
  ArrowRight,
  Filter,
  CheckCircle,
  AlertCircle,
  Tag,
} from "lucide-react";

export default function LivestockView() {
  const [animals, setAnimals] = useState<LivestockAnimal[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

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
  const countBulls = useMemo(
    () => animals.filter((a) => a.category === "bull" || a.sex === "male").length,
    [animals]
  );
  const countCows = useMemo(
    () => animals.filter((a) => a.category === "cow" || (!a.category && a.ageYears >= 2.5 && a.sex !== "male")).length,
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
        setSuccessMsg(`✓ Updated cattle record: ${name.trim()}`);
      } else {
        await addLivestock(payload);
        setSuccessMsg(`✓ Added cattle record: ${name.trim()} (${category})`);
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
      setSuccessMsg(`✓ ${animal.name} has been transitioned to ${nextCategory.toUpperCase()}.`);
      await refreshAnimals();
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to transition category.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, animalName: string) {
    if (!window.confirm(`Are you sure you want to delete ${animalName}? This action cannot be undone.`)) {
      return;
    }
    try {
      await deleteLivestock(id);
      setSuccessMsg("✓ Cattle record removed.");
      await refreshAnimals();
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to delete animal record.");
    }
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
    <div className="view-container">
      {/* Header */}
      <div className="view-header-row">
        <div>
          <h2>My Cattle (Dairy, Heifers & Calves)</h2>
          <p className="view-subtitle">
            Manage your cattle herd through each growth stage from birth to milking.
          </p>
        </div>
      </div>

      {/* KPI Cards for Cattle Categories */}
      <div className="poultry-kpi-grid">
        <div className="kpi-card" onClick={() => setCategoryFilter("all")} style={{ cursor: "pointer" }}>
          <div className="kpi-icon-wrap" style={{ background: "#ecfdf5", color: "#059669" }}>
            <CowIcon size={26} />
          </div>
          <div>
            <span className="kpi-label">Total Cattle Herd</span>
            <h3 className="kpi-value">{animals.length}</h3>
            <span className="kpi-desc">All registered animals</span>
          </div>
        </div>

        <div className="kpi-card" onClick={() => setCategoryFilter("cow")} style={{ cursor: "pointer" }}>
          <div className="kpi-icon-wrap" style={{ background: "#eff6ff", color: "#2563eb" }}>
            <CowIcon size={26} />
          </div>
          <div>
            <span className="kpi-label">Adult Cows</span>
            <h3 className="kpi-value">{countCows}</h3>
            <span className="kpi-desc">Milking & breeding cows</span>
          </div>
        </div>

        <div className="kpi-card" onClick={() => setCategoryFilter("heifer")} style={{ cursor: "pointer" }}>
          <div className="kpi-icon-wrap" style={{ background: "#fef3c7", color: "#d97706" }}>
            <HeiferIcon size={26} />
          </div>
          <div>
            <span className="kpi-label">Growing Heifers</span>
            <h3 className="kpi-value">{countHeifers}</h3>
            <span className="kpi-desc">1 to 2.5 years old</span>
          </div>
        </div>

        <div className="kpi-card" onClick={() => setCategoryFilter("calf")} style={{ cursor: "pointer" }}>
          <div className="kpi-icon-wrap" style={{ background: "#fdf2f8", color: "#db2777" }}>
            <CalfIcon size={26} />
          </div>
          <div>
            <span className="kpi-label">Calves</span>
            <h3 className="kpi-value">{countCalves}</h3>
            <span className="kpi-desc">Under 1 year / weaned</span>
          </div>
        </div>
      </div>

      {/* Form Card: Add or Edit Cattle */}
      <div className="card-box form-card">
        <h3 className="card-heading">
          {editingId ? "✏️ Edit Cattle Record" : "🐄 Add Cattle / Calf / Heifer"}
        </h3>
        <p className="card-subheading">
          Keep accurate individual identification, age, and breeding stages.
        </p>

        {errorMsg && <div className="daily-alert error-alert">{errorMsg}</div>}
        {successMsg && <div className="daily-alert success-alert">{successMsg}</div>}

        <form onSubmit={handleSubmit} className="poultry-form">
          <div className="form-row-3">
            <div className="form-field">
              <label>Animal Name *</label>
              <input
                type="text"
                placeholder="e.g. Baraka, Neema, Daisy"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="form-field">
              <label>Ear Tag Number (Optional)</label>
              <input
                type="text"
                placeholder="e.g. KAG-042"
                value={tagNumber}
                onChange={(e) => setTagNumber(e.target.value)}
              />
            </div>

            <div className="form-field">
              <label>Cattle Category *</label>
              <select
                value={category}
                onChange={(e) => {
                  const cat = e.target.value as any;
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
                <option value="calf">🐮 Calf (Under 1 year)</option>
                <option value="heifer">🐄 Heifer (Young female 1 - 2.5 yrs)</option>
                <option value="cow">🥛 Adult Cow (Milking / Dry)</option>
                <option value="bull">🐂 Bull</option>
              </select>
            </div>
          </div>

          <div className="form-row-3">
            <div className="form-field">
              <label>Breed *</label>
              <input
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
            </div>

            <div className="form-field">
              <label>Sex</label>
              <select value={sex} onChange={(e) => setSex(e.target.value as any)}>
                <option value="female">Female</option>
                <option value="male">Male</option>
              </select>
            </div>

            <div className="form-field">
              <label>Age in Years *</label>
              <input
                type="number"
                step="0.1"
                placeholder="e.g. 2.5"
                value={ageYears}
                onChange={(e) => setAgeYears(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-row-3">
            <div className="form-field">
              <label>Date Added / Birth Date</label>
              <input
                type="date"
                value={dateAdded}
                onChange={(e) => setDateAdded(e.target.value)}
              />
            </div>

            <div className="form-field">
              <label>Mother / Dam Tag or Name (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Neema (KAG-012)"
                value={damId}
                onChange={(e) => setDamId(e.target.value)}
              />
            </div>

            <div className="form-field">
              <label>Observations / Health Status</label>
              <input
                type="text"
                placeholder="e.g. Dewormed, high milk yielder, weaned"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <div className="form-buttons-row">
            {editingId && (
              <button type="button" className="btn-secondary" onClick={resetForm}>
                Cancel Edit
              </button>
            )}
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Saving..." : editingId ? "Update Cattle Record" : "+ Save Cattle Record"}
            </button>
          </div>
        </form>
      </div>

      {/* Cattle Herd Table */}
      <div className="card-box">
        <div className="card-header-bar">
          <div>
            <h3 className="card-heading">Cattle Herd Inventory ({animals.length})</h3>
            <p className="card-subheading">Track individual cattle and transition growth stages.</p>
          </div>

          <div className="table-filter-pills">
            {["all", "calf", "heifer", "cow", "bull"].map((c) => (
              <button
                key={c}
                className={`filter-pill ${categoryFilter === c ? "active" : ""}`}
                onClick={() => setCategoryFilter(c)}
              >
                {c === "all" ? "All Herd" : c === "calf" ? "Calves" : c === "heifer" ? "Heifers" : c === "cow" ? "Cows" : "Bulls"}
              </button>
            ))}
          </div>
        </div>

        {filteredAnimals.length === 0 ? (
          <div className="empty-state">
            <CowIcon size={48} />
            <h4>No cattle found</h4>
            <p>Add your calves, heifers, and cows using the form above.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="modern-table">
              <thead>
                <tr>
                  <th>Tag / ID</th>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Breed</th>
                  <th>Sex</th>
                  <th>Age (Yrs)</th>
                  <th>Dam / Mother</th>
                  <th>Transitions & Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAnimals.map((a) => {
                  const cat = a.category || (a.ageYears < 1 ? "calf" : a.ageYears < 2.5 ? "heifer" : a.sex === "male" ? "bull" : "cow");

                  return (
                    <tr key={a.id}>
                      <td>
                        <strong style={{ fontFamily: "monospace", color: "#1e293b" }}>
                          {a.tagNumber || `#${a.id.slice(0, 6)}`}
                        </strong>
                      </td>
                      <td>
                        <strong>{a.name}</strong>
                        {a.notes && <div style={{ fontSize: 12, color: "#64748b" }}>{a.notes}</div>}
                      </td>
                      <td>
                        <span className={`badge-stage badge-${cat}`}>
                          {cat === "calf" ? "🐮 Calf" : cat === "heifer" ? "🐄 Heifer" : cat === "cow" ? "🥛 Cow" : "🐂 Bull"}
                        </span>
                      </td>
                      <td>{a.breed}</td>
                      <td>{a.sex === "male" ? "Male" : "Female"}</td>
                      <td>{a.ageYears} yrs</td>
                      <td>{a.damId || "—"}</td>
                      <td>
                        <div className="cattle-action-group">
                          {/* Promotion / Stage Transition shortcuts */}
                          {cat === "calf" && a.sex !== "male" && (
                            <button
                              className="btn-pill-promote"
                              onClick={() => handlePromoteCategory(a, "heifer")}
                              title="Transition to Heifer"
                            >
                              Move to Heifer <ArrowRight size={13} />
                            </button>
                          )}
                          {cat === "heifer" && (
                            <button
                              className="btn-pill-promote"
                              onClick={() => handlePromoteCategory(a, "cow")}
                              title="Transition to Adult Cow"
                            >
                              Move to Cow <ArrowRight size={13} />
                            </button>
                          )}

                          <button
                            className="btn-icon"
                            onClick={() => startEdit(a)}
                            title="Edit Cattle Record"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            className="btn-icon delete-icon"
                            onClick={() => handleDelete(a.id, a.name)}
                            title="Delete Record"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
