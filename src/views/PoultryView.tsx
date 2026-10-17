import { useEffect, useMemo, useState } from "react";
import type { PoultryBatch } from "../types/farm";

import {
  loadPoultry,
  addPoultry,
  updatePoultry,
  deletePoultry,
} from "../services/storage";

function PoultryView() {
  const [poultry, setPoultry] = useState<PoultryBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);

  const [breed, setBreed] = useState("");
  const [purpose, setPurpose] = useState("");
  const [initialCount, setInitialCount] = useState("");
  const [currentCount, setCurrentCount] = useState("");
  const [ageWeeks, setAgeWeeks] = useState("");

  async function refreshPoultry() {
    try {
      setLoading(true);
      const records = await loadPoultry();
      setPoultry(records);
    } catch (error) {
      console.error(error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to load poultry records."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshPoultry();
  }, []);

  const totalInitial = useMemo(
    () =>
      poultry.reduce(
        (total, batch) => total + batch.initialCount,
        0
      ),
    [poultry]
  );

  const totalCurrent = useMemo(
    () =>
      poultry.reduce(
        (total, batch) => total + batch.currentCount,
        0
      ),
    [poultry]
  );

  const totalLoss = Math.max(
    0,
    totalInitial - totalCurrent
  );

  function clearForm() {
    setBreed("");
    setPurpose("");
    setInitialCount("");
    setCurrentCount("");
    setAgeWeeks("");
    setEditingId(null);
  }

  function startEdit(batch: PoultryBatch) {
    setEditingId(batch.id);
    setBreed(batch.breed);
    setPurpose(batch.purpose);
    setInitialCount(String(batch.initialCount));
    setCurrentCount(String(batch.currentCount));
    setAgeWeeks(String(batch.ageWeeks));

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function handleSubmit() {
    if (
      !breed.trim() ||
      !purpose.trim() ||
      !initialCount ||
      !currentCount ||
      !ageWeeks
    ) {
      alert("Please fill in all fields.");
      return;
    }

    const record = {
      breed: breed.trim(),
      purpose: purpose.trim(),
      initialCount: Number(initialCount),
      currentCount: Number(currentCount),
      ageWeeks: Number(ageWeeks),
      dateAdded:
        editingId
          ? poultry.find((item) => item.id === editingId)
              ?.dateAdded || new Date().toISOString()
          : new Date().toISOString(),
    };

    if (
      record.initialCount < 0 ||
      record.currentCount < 0 ||
      record.ageWeeks < 0
    ) {
      alert("Numbers cannot be negative.");
      return;
    }

    if (record.currentCount > record.initialCount) {
      alert(
        "Current count cannot be greater than the initial count."
      );
      return;
    }

    try {
      setSaving(true);

      if (editingId) {
        await updatePoultry(
          editingId,
          record
        );
      } else {
        await addPoultry(record);
      }

      await refreshPoultry();
      clearForm();
    } catch (error) {
      console.error(error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to save poultry record."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this poultry record?"
    );

    if (!confirmed) return;

    try {
      await deletePoultry(id);
      await refreshPoultry();

      if (editingId === id) {
        clearForm();
      }
    } catch (error) {
      console.error(error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to delete poultry record."
      );
    }
  }

  return (
    <main className="management-page">

      {/* PAGE HEADER */}
      <section className="management-header">
        <div>
          <p className="page-eyebrow">
            FARM MANAGEMENT
          </p>

          <h2>Poultry Management</h2>

          <p className="page-description">
            Monitor poultry batches, flock numbers,
            purposes and production groups.
          </p>
        </div>

        <button
          className="primary-action"
          onClick={() => {
            clearForm();
            window.scrollTo({
              top: 0,
              behavior: "smooth",
            });
          }}
        >
          + Add Poultry
        </button>
      </section>

      {/* SUMMARY CARDS */}
      <section className="summary-grid">

        <div className="summary-card">
          <div className="summary-icon">
            <img src="https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=80&q=70" alt="Batches" className="summary-icon-img" />
          </div>
          <div>
            <span>Total Batches</span>
            <strong>{poultry.length}</strong>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-icon">
            <img src="https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=80&q=70" alt="Initial Birds" className="summary-icon-img" />
          </div>
          <div>
            <span>Initial Birds</span>
            <strong>{totalInitial.toLocaleString()}</strong>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-icon">
            <img src="https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=80&q=70" alt="Current Birds" className="summary-icon-img" />
          </div>
          <div>
            <span>Current Birds</span>
            <strong>{totalCurrent.toLocaleString()}</strong>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-icon">
            <img src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=80&q=70" alt="Difference" className="summary-icon-img" />
          </div>
          <div>
            <span>Difference</span>
            <strong>{totalLoss.toLocaleString()}</strong>
          </div>
        </div>

      </section>

      {/* FORM */}
      <section className="management-card">

        <div className="card-heading">
          <div>
            <h3>
              {editingId
                ? "Edit Poultry Batch"
                : "Register Poultry Batch"}
            </h3>

            <p>
              Enter the details of your poultry batch.
            </p>
          </div>

          {editingId && (
            <button
              className="secondary-action"
              onClick={clearForm}
            >
              Cancel Edit
            </button>
          )}
        </div>

        <div className="form-grid">

          <div className="form-field">
            <label>Breed</label>

            <input
              type="text"
              placeholder="e.g. Kienyeji"
              value={breed}
              onChange={(e) =>
                setBreed(e.target.value)
              }
            />
          </div>

          <div className="form-field">
            <label>Purpose</label>

            <input
              type="text"
              placeholder="e.g. Egg production"
              value={purpose}
              onChange={(e) =>
                setPurpose(e.target.value)
              }
            />
          </div>

          <div className="form-field">
            <label>Initial Count</label>

            <input
              type="number"
              min="0"
              placeholder="Number of birds"
              value={initialCount}
              onChange={(e) =>
                setInitialCount(e.target.value)
              }
            />
          </div>

          <div className="form-field">
            <label>Current Count</label>

            <input
              type="number"
              min="0"
              placeholder="Current birds"
              value={currentCount}
              onChange={(e) =>
                setCurrentCount(e.target.value)
              }
            />
          </div>

          <div className="form-field">
            <label>Age</label>

            <input
              type="number"
              min="0"
              placeholder="Age in weeks"
              value={ageWeeks}
              onChange={(e) =>
                setAgeWeeks(e.target.value)
              }
            />
          </div>

        </div>

        <div className="form-actions">

          <button
            className="primary-action"
            onClick={handleSubmit}
            disabled={saving}
          >
            {saving
              ? "Saving..."
              : editingId
              ? "Update Poultry"
              : "Save Poultry"}
          </button>

          {editingId && (
            <button
              className="secondary-action"
              onClick={clearForm}
            >
              Clear
            </button>
          )}

        </div>

      </section>

      {/* RECORDS */}
      <section className="management-card">

        <div className="card-heading">
          <div>
            <h3>Registered Poultry</h3>

            <p>
              {poultry.length} poultry batch
              {poultry.length !== 1 ? "es" : ""} registered
            </p>
          </div>
        </div>

        {loading ? (
          <div className="empty-state">
            <div className="loading-spinner"></div>
            <p>Loading poultry records...</p>
          </div>
        ) : poultry.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <img src="https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=80&q=70" alt="Poultry" className="empty-icon-img" />
            </div>

            <h4>No poultry records yet</h4>

            <p>
              Add your first poultry batch to
              start tracking your flock.
            </p>

            <button
              className="primary-action"
              onClick={() =>
                window.scrollTo({
                  top: 0,
                  behavior: "smooth",
                })
              }
            >
              + Add First Batch
            </button>
          </div>
        ) : (
          <div className="record-list">

            {poultry.map((batch) => (
              <article
                className="record-card"
                key={batch.id}
              >

                <div className="record-main">

                  <div className="record-avatar">
                    <img src="https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=80&q=70" alt="Poultry" className="record-avatar-img" />
                  </div>

                  <div>
                    <h4>{batch.breed}</h4>

                    <p>
                      {batch.purpose}
                    </p>

                    <small>
                      Added{" "}
                      {new Date(
                        batch.dateAdded
                      ).toLocaleDateString()}
                    </small>
                  </div>

                </div>

                <div className="record-stats">

                  <div>
                    <span>Initial</span>
                    <strong>
                      {batch.initialCount}
                    </strong>
                  </div>

                  <div>
                    <span>Current</span>
                    <strong>
                      {batch.currentCount}
                    </strong>
                  </div>

                  <div>
                    <span>Age</span>
                    <strong>
                      {batch.ageWeeks} wks
                    </strong>
                  </div>

                </div>

                <div className="record-actions">

                  <button
                    className="edit-button"
                    onClick={() =>
                      startEdit(batch)
                    }
                  >
                    Edit
                  </button>

                  <button
                    className="delete-button"
                    onClick={() =>
                      handleDelete(batch.id)
                    }
                  >
                    Delete
                  </button>

                </div>

              </article>
            ))}

          </div>
        )}

      </section>

    </main>
  );
}

export default PoultryView;