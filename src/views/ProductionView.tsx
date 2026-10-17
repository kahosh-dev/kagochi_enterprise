import { useEffect, useState } from "react";
import {
  loadProduction,
  addProduction,
  updateProduction,
  deleteProduction,
} from "../services/storage";
import type { ProductionRecord } from "../types/farm";

export default function ProductionView() {
  const [records, setRecords] = useState<ProductionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [type, setType] = useState<"eggs" | "milk">("eggs");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("pieces");
  const [date, setDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  async function refreshProduction() {
    try {
      setLoading(true);
      const data = await loadProduction();
      setRecords(data);
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Failed to load production.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshProduction();
  }, []);

  function resetForm() {
    setEditingId(null);
    setType("eggs");
    setQuantity("");
    setUnit("pieces");
    setDate(new Date().toISOString().split("T")[0]);
  }

  function handleTypeChange(value: "eggs" | "milk") {
    setType(value);
    setUnit(value === "eggs" ? "pieces" : "litres");
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const amount = Number(quantity);

    if (!Number.isFinite(amount) || amount <= 0) {
      alert("Please enter a valid production quantity.");
      return;
    }

    try {
      setSaving(true);

      const record = {
        type,
        quantity: amount,
        unit,
        date,
      };

      if (editingId) {
        await updateProduction(editingId, record);
      } else {
        await addProduction(record);
      }

      await refreshProduction();
      resetForm();
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Failed to save production.");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(record: ProductionRecord) {
    setEditingId(record.id);
    setType(record.type);
    setQuantity(String(record.quantity));
    setUnit(record.unit);
    setDate(record.date);
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Are you sure you want to delete this production record?")) {
      return;
    }

    try {
      await deleteProduction(id);
      await refreshProduction();

      if (editingId === id) {
        resetForm();
      }
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Failed to delete production.");
    }
  }

  const eggRecords = records.filter((record) => record.type === "eggs");
  const milkRecords = records.filter((record) => record.type === "milk");

  const totalEggs = eggRecords.reduce(
    (sum, record) => sum + Number(record.quantity),
    0
  );

  const totalMilk = milkRecords.reduce(
    (sum, record) => sum + Number(record.quantity),
    0
  );

  return (
    <div className="management-page">
      <div className="page-heading">
        <div>
          <h1>Production Management</h1>
          <p>Record and monitor eggs, milk and other farm production.</p>
        </div>
      </div>

      <div className="summary-grid">
        <div className="summary-card">
          <div className="summary-icon"><img src="https://images.unsplash.com/photo-1506976785307-8732e854ad03?w=80&q=70" alt="Records" className="summary-icon-img" /></div>
          <div><span className="summary-label">Total Records</span><strong>{records.length}</strong><small>Production entries</small></div>
        </div>
        <div className="summary-card">
          <div className="summary-icon"><img src="https://images.unsplash.com/photo-1506976785307-8732e854ad03?w=80&q=70" alt="Eggs" className="summary-icon-img" /></div>
          <div><span className="summary-label">Egg Production</span><strong>{totalEggs}</strong><small>Pieces recorded</small></div>
        </div>
        <div className="summary-card">
          <div className="summary-icon"><img src="https://images.unsplash.com/photo-1550583724-b2692b85b150?w=80&q=70" alt="Milk" className="summary-icon-img" /></div>
          <div><span className="summary-label">Milk Production</span><strong>{totalMilk}</strong><small>Litres recorded</small></div>
        </div>
        <div className="summary-card">
          <div className="summary-icon"><img src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=80&q=70" alt="Types" className="summary-icon-img" /></div>
          <div><span className="summary-label">Production Types</span><strong>{new Set(records.map((r) => r.type)).size}</strong><small>Active categories</small></div>
        </div>
      </div>

      <div className="management-card">
        <div className="card-heading">
          <div>
            <h2>{editingId ? "Edit Production" : "Add Production"}</h2>
            <p>
              {editingId
                ? "Update the selected production record."
                : "Record a new farm production entry."}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-field">
              <label>Production Type</label>
              <select
                value={type}
                onChange={(e) =>
                  handleTypeChange(e.target.value as "eggs" | "milk")
                }
              >
                <option value="eggs">Eggs</option>
                <option value="milk">Milk</option>
              </select>
            </div>

            <div className="form-field">
              <label>Quantity</label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Enter quantity"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>

            <div className="form-field">
              <label>Unit</label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
              />
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
                ? "Update Production"
                : "Add Production"}
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
            <h2>Production Records</h2>
            <p>All production entries stored in your farm database.</p>
          </div>

          <span className="record-count">
            {records.length} record{records.length === 1 ? "" : "s"}
          </span>
        </div>

        {loading ? (
          <div className="empty-state">
            <p>Loading production records...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="empty-state">
            <h3>No production records yet</h3>
            <p>Add your first production record above.</p>
          </div>
        ) : (
          <div className="records-grid">
            {records.map((record) => (
              <div className="record-card" key={record.id}>
                <div className="record-card-top">
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div className="record-avatar"><img src={record.type === "eggs" ? "https://images.unsplash.com/photo-1506976785307-8732e854ad03?w=80&q=70" : "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=80&q=70"} alt={record.type} className="record-avatar-img" /></div>
                    <div><h3>{record.type === "eggs" ? "Egg Production" : "Milk Production"}</h3><span className="record-badge">{record.type}</span></div>
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