import { useEffect, useState } from "react";
import {
  loadFeeding,
  addFeeding,
  updateFeeding,
  deleteFeeding,
} from "../services/storage";
import type { FeedingRecord } from "../types/farm";

export default function FeedingView() {
  const [records, setRecords] = useState<FeedingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [animalType, setAnimalType] = useState("Poultry");
  const [feedType, setFeedType] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("kg");
  const [date, setDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  async function refreshFeeding() {
    try {
      setLoading(true);
      const data = await loadFeeding();
      setRecords(data);
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Failed to load feeding records.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshFeeding();
  }, []);

  function resetForm() {
    setEditingId(null);
    setAnimalType("Poultry");
    setFeedType("");
    setQuantity("");
    setUnit("kg");
    setDate(new Date().toISOString().split("T")[0]);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const amount = Number(quantity);

    if (!feedType.trim()) {
      alert("Please enter the feed type.");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      alert("Please enter a valid feed quantity.");
      return;
    }

    try {
      setSaving(true);

      const record = {
        animalType,
        feedType: feedType.trim(),
        quantity: amount,
        unit,
        date,
      };

      if (editingId) {
        await updateFeeding(editingId, record);
      } else {
        await addFeeding(record);
      }

      await refreshFeeding();
      resetForm();
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Failed to save feeding record.");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(record: FeedingRecord) {
    setEditingId(record.id);
    setAnimalType(record.animalType);
    setFeedType(record.feedType);
    setQuantity(String(record.quantity));
    setUnit(record.unit);
    setDate(record.date);
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Are you sure you want to delete this feeding record?")) {
      return;
    }

    try {
      await deleteFeeding(id);
      await refreshFeeding();

      if (editingId === id) {
        resetForm();
      }
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Failed to delete feeding record.");
    }
  }

  const totalQuantity = records.reduce(
    (sum, record) => sum + Number(record.quantity),
    0
  );

  const poultryRecords = records.filter(
    (record) => record.animalType.toLowerCase() === "poultry"
  ).length;

  const livestockRecords = records.filter(
    (record) => record.animalType.toLowerCase() === "livestock"
  ).length;

  return (
    <div className="management-page">
      <div className="page-heading">
        <div>
          <h1>Feeding Management</h1>
          <p>Track feed types, quantities and feeding activities.</p>
        </div>
      </div>

      <div className="summary-grid">
        <div className="summary-card">
          <div className="summary-icon"><img src="https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=80&q=70" alt="Feeding" className="summary-icon-img" /></div>
          <div><span className="summary-label">Feeding Records</span><strong>{records.length}</strong><small>Total entries</small></div>
        </div>
        <div className="summary-card">
          <div className="summary-icon"><img src="https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=80&q=70" alt="Quantity" className="summary-icon-img" /></div>
          <div><span className="summary-label">Total Quantity</span><strong>{totalQuantity.toFixed(1)}</strong><small>{unit}</small></div>
        </div>
        <div className="summary-card">
          <div className="summary-icon"><img src="https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=80&q=70" alt="Poultry" className="summary-icon-img" /></div>
          <div><span className="summary-label">Poultry</span><strong>{poultryRecords}</strong><small>Feeding entries</small></div>
        </div>
        <div className="summary-card">
          <div className="summary-icon"><img src="https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?w=80&q=70" alt="Livestock" className="summary-icon-img" /></div>
          <div><span className="summary-label">Livestock</span><strong>{livestockRecords}</strong><small>Feeding entries</small></div>
        </div>
      </div>

      <div className="management-card">
        <div className="card-heading">
          <div>
            <h2>{editingId ? "Edit Feeding Record" : "Add Feeding Record"}</h2>
            <p>Record feed usage for poultry or livestock.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-field">
              <label>Animal Type</label>
              <select
                value={animalType}
                onChange={(e) => setAnimalType(e.target.value)}
              >
                <option value="Poultry">Poultry</option>
                <option value="Livestock">Livestock</option>
              </select>
            </div>

            <div className="form-field">
              <label>Feed Type</label>
              <input
                type="text"
                placeholder="e.g. Dairy Meal"
                value={feedType}
                onChange={(e) => setFeedType(e.target.value)}
              />
            </div>

            <div className="form-field">
              <label>Quantity</label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 25"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>

            <div className="form-field">
              <label>Unit</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
              >
                <option value="kg">kg</option>
                <option value="g">g</option>
                <option value="litres">litres</option>
                <option value="bags">bags</option>
              </select>
            </div>

            <div className="form-field">
              <label>Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
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
                ? "Update Feeding"
                : "Add Feeding"}
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
            <h2>Feeding Records</h2>
            <p>All feed usage records stored in the database.</p>
          </div>

          <span className="record-count">
            {records.length} record{records.length === 1 ? "" : "s"}
          </span>
        </div>

        {loading ? (
          <div className="empty-state">
            <p>Loading feeding records...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="empty-state">
            <h3>No feeding records yet</h3>
            <p>Add your first feeding record above.</p>
          </div>
        ) : (
          <div className="records-grid">
            {records.map((record) => (
              <div className="record-card" key={record.id}>
                <div className="record-card-top">
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div className="record-avatar"><img src="https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=80&q=70" alt="Feed" className="record-avatar-img" /></div>
                    <div><h3>{record.feedType}</h3><span className="record-badge">{record.animalType}</span></div>
                  </div>

                  <div className="record-actions">
                    <button
                      type="button"
                      className="edit-button"
                      onClick={() => startEdit(record)}
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      className="delete-button"
                      onClick={() => handleDelete(record.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="record-details">
                  <div>
                    <span>Quantity</span>
                    <strong>
                      {record.quantity} {record.unit}
                    </strong>
                  </div>

                  <div>
                    <span>Date</span>
                    <strong>{record.date}</strong>
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