import { useEffect, useState } from "react";
import {
  loadLivestock,
  addLivestock,
  updateLivestock,
  deleteLivestock,
} from "../services/storage";
import type { LivestockAnimal } from "../types/farm";

export default function LivestockView() {
  const [animals, setAnimals] = useState<LivestockAnimal[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [type, setType] = useState("Cattle");
  const [breed, setBreed] = useState("");
  const [ageYears, setAgeYears] = useState("");
  const [dateAdded, setDateAdded] = useState(
    new Date().toISOString().split("T")[0]
  );

  async function refreshAnimals() {
    try {
      setLoading(true);
      const data = await loadLivestock();
      setAnimals(data);
    } catch (error) {
      console.error("Failed to load livestock:", error);
      alert(error instanceof Error ? error.message : "Failed to load livestock.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshAnimals();
  }, []);

  function resetForm() {
    setEditingId(null);
    setName("");
    setType("Cattle");
    setBreed("");
    setAgeYears("");
    setDateAdded(new Date().toISOString().split("T")[0]);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const age = Number(ageYears);

    if (!name.trim()) {
      alert("Please enter the animal name.");
      return;
    }

    if (!breed.trim()) {
      alert("Please enter the breed.");
      return;
    }

    if (!Number.isFinite(age) || age < 0) {
      alert("Please enter a valid age.");
      return;
    }

    try {
      setSaving(true);

      const animal = {
        name: name.trim(),
        type,
        breed: breed.trim(),
        ageYears: age,
        dateAdded,
      };

      if (editingId) {
        await updateLivestock(editingId, animal);
      } else {
        await addLivestock(animal);
      }

      await refreshAnimals();
      resetForm();
    } catch (error) {
      console.error("Failed to save livestock:", error);
      alert(error instanceof Error ? error.message : "Failed to save livestock.");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(animal: LivestockAnimal) {
    setEditingId(animal.id);
    setName(animal.name);
    setType(animal.type);
    setBreed(animal.breed);
    setAgeYears(String(animal.ageYears));
    setDateAdded(animal.dateAdded);
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this livestock record?"
    );

    if (!confirmed) return;

    try {
      await deleteLivestock(id);
      await refreshAnimals();

      if (editingId === id) {
        resetForm();
      }
    } catch (error) {
      console.error("Failed to delete livestock:", error);
      alert(error instanceof Error ? error.message : "Failed to delete livestock.");
    }
  }

  const cattleCount = animals.filter(
    (animal) => animal.type.toLowerCase() === "cattle"
  ).length;

  const goatsCount = animals.filter(
    (animal) => animal.type.toLowerCase() === "goat"
  ).length;

  const sheepCount = animals.filter(
    (animal) => animal.type.toLowerCase() === "sheep"
  ).length;

  return (
    <div className="management-page">
      <div className="page-heading">
        <div>
          <h1>Livestock Management</h1>
          <p>
            Register, monitor and manage your farm livestock records.
          </p>
        </div>
      </div>

      <div className="summary-grid">
        <div className="summary-card">
          <div className="summary-icon"><img src="https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?w=80&q=70" alt="Livestock" className="summary-icon-img" /></div>
          <div><span className="summary-label">Total Livestock</span><strong>{animals.length}</strong><small>Registered animals</small></div>
        </div>
        <div className="summary-card">
          <div className="summary-icon"><img src="https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?w=80&q=70" alt="Cattle" className="summary-icon-img" /></div>
          <div><span className="summary-label">Cattle</span><strong>{cattleCount}</strong><small>Cattle records</small></div>
        </div>
        <div className="summary-card">
          <div className="summary-icon"><img src="https://images.unsplash.com/photo-1524024973431-2ad916746881?w=80&q=70" alt="Goats" className="summary-icon-img" /></div>
          <div><span className="summary-label">Goats</span><strong>{goatsCount}</strong><small>Goat records</small></div>
        </div>
        <div className="summary-card">
          <div className="summary-icon"><img src="https://images.unsplash.com/photo-1484557985045-edf25e08da73?w=80&q=70" alt="Sheep" className="summary-icon-img" /></div>
          <div><span className="summary-label">Sheep</span><strong>{sheepCount}</strong><small>Sheep records</small></div>
        </div>
      </div>

      <div className="management-card">
        <div className="card-heading">
          <div>
            <h2>{editingId ? "Edit Livestock" : "Add Livestock"}</h2>
            <p>
              {editingId
                ? "Update the selected livestock record."
                : "Enter the details of a new animal."}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-field">
              <label>Animal Name</label>
              <input
                type="text"
                placeholder="e.g. Daisy"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="form-field">
              <label>Animal Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value="Cattle">Cattle</option>
                <option value="Goat">Goat</option>
                <option value="Sheep">Sheep</option>
                <option value="Pig">Pig</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="form-field">
              <label>Breed</label>
              <input
                type="text"
                placeholder="e.g. Friesian"
                value={breed}
                onChange={(e) => setBreed(e.target.value)}
              />
            </div>

            <div className="form-field">
              <label>Age (Years)</label>
              <input
                type="number"
                min="0"
                step="0.1"
                placeholder="e.g. 2"
                value={ageYears}
                onChange={(e) => setAgeYears(e.target.value)}
              />
            </div>

            <div className="form-field">
              <label>Date Added</label>
              <input
                type="date"
                value={dateAdded}
                onChange={(e) => setDateAdded(e.target.value)}
              />
            </div>
          </div>

          <div className="form-actions">
            <button
              type="submit"
              className="primary-button"
              disabled={saving}
            >
              {saving
                ? "Saving..."
                : editingId
                ? "Update Livestock"
                : "Add Livestock"}
            </button>

            {editingId && (
              <button
                type="button"
                className="secondary-button"
                onClick={resetForm}
              >
                Cancel Edit
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="management-card">
        <div className="card-heading">
          <div>
            <h2>Livestock Records</h2>
            <p>All livestock registered in your farm database.</p>
          </div>

          <span className="record-count">
            {animals.length} record{animals.length === 1 ? "" : "s"}
          </span>
        </div>

        {loading ? (
          <div className="empty-state">
            <p>Loading livestock records...</p>
          </div>
        ) : animals.length === 0 ? (
          <div className="empty-state">
            <h3>No livestock records yet</h3>
            <p>Add your first animal using the form above.</p>
          </div>
        ) : (
          <div className="records-grid">
            {animals.map((animal) => (
              <div className="record-card" key={animal.id}>
                <div className="record-card-top">
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div className="record-avatar"><img src="https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?w=80&q=70" alt="Animal" className="record-avatar-img" /></div>
                    <div><h3>{animal.name}</h3><span className="record-badge">{animal.type}</span></div>
                  </div>

                  <div className="record-actions">
                    <button
                      type="button"
                      className="edit-button"
                      onClick={() => startEdit(animal)}
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      className="delete-button"
                      onClick={() => handleDelete(animal.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="record-details">
                  <div>
                    <span>Breed</span>
                    <strong>{animal.breed}</strong>
                  </div>

                  <div>
                    <span>Age</span>
                    <strong>{animal.ageYears} years</strong>
                  </div>

                  <div>
                    <span>Date Added</span>
                    <strong>{animal.dateAdded}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}