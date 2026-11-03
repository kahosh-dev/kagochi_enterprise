import { useEffect, useMemo, useState } from "react";
import type { PoultryBatch } from "../types/farm";
import {
  loadPoultry,
  addPoultry,
  updatePoultry,
  deletePoultry,
} from "../services/storage";
import {
  ChickIcon,
  ChickenIcon,
} from "../components/FarmIcons";
import {
  Edit2,
  Trash2,
  AlertTriangle,
} from "lucide-react";

export default function PoultryView() {
  const [poultry, setPoultry] = useState<PoultryBatch[]>([]);
  const [_loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filterStage, setFilterStage] = useState<string>("all");

  const [editingId, setEditingId] = useState<string | null>(null);

  // Form fields
  const [breed, setBreed] = useState("Kienyeji");
  const [purpose, setPurpose] = useState("Eggs & Meat");
  const [stage, setStage] = useState("chicks");
  const [initialCount, setInitialCount] = useState("");
  const [currentCount, setCurrentCount] = useState("");
  const [ageWeeks, setAgeWeeks] = useState("1");
  const [source, setSource] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [notes, setNotes] = useState("");
  const [dateAdded, setDateAdded] = useState(new Date().toISOString().slice(0, 10));

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  async function refreshPoultry() {
    try {
      setLoading(true);
      const records = await loadPoultry();
      setPoultry(records);
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
    () => poultry.filter((b) => b.stage === "chicks" || b.ageWeeks <= 4).reduce((s, b) => s + b.currentCount, 0),
    [poultry]
  );

  const totalLayers = useMemo(
    () => poultry.filter((b) => b.stage === "layers" || /layer/i.test(b.purpose)).reduce((s, b) => s + b.currentCount, 0),
    [poultry]
  );

  const totalBroilers = useMemo(
    () => poultry.filter((b) => b.stage === "broilers" || /broiler/i.test(b.purpose)).reduce((s, b) => s + b.currentCount, 0),
    [poultry]
  );

  function clearForm() {
    setBreed("Kienyeji");
    setPurpose("Eggs & Meat");
    setStage("chicks");
    setInitialCount("");
    setCurrentCount("");
    setAgeWeeks("1");
    setSource("");
    setPurchasePrice("");
    setNotes("");
    setDateAdded(new Date().toISOString().slice(0, 10));
    setEditingId(null);
    setErrorMsg("");
  }

  function startEdit(batch: PoultryBatch) {
    setEditingId(batch.id);
    setBreed(batch.breed);
    setPurpose(batch.purpose);
    setStage(batch.stage || (batch.ageWeeks <= 4 ? "chicks" : "adult"));
    setInitialCount(String(batch.initialCount));
    setCurrentCount(String(batch.currentCount));
    setAgeWeeks(String(batch.ageWeeks));
    setSource(batch.source || "");
    setPurchasePrice(batch.purchasePrice ? String(batch.purchasePrice) : "");
    setNotes(batch.notes || "");
    setDateAdded(batch.dateAdded ? batch.dateAdded.slice(0, 10) : new Date().toISOString().slice(0, 10));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const init = parseInt(initialCount);
    const curr = parseInt(currentCount);
    const age = parseInt(ageWeeks);
    const price = parseFloat(purchasePrice) || 0;

    if (!breed.trim()) {
      setErrorMsg("Please select or enter the breed.");
      return;
    }
    if (isNaN(init) || init <= 0) {
      setErrorMsg("Initial count of birds must be at least 1.");
      return;
    }
    if (isNaN(curr) || curr < 0) {
      setErrorMsg("Current count of live birds cannot be negative.");
      return;
    }
    if (curr > init) {
      setErrorMsg("Current count cannot be higher than initial birds acquired.");
      return;
    }
    if (isNaN(age) || age < 0) {
      setErrorMsg("Age in weeks must be 0 or more.");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        breed: breed.trim(),
        purpose: purpose.trim(),
        initialCount: init,
        currentCount: curr,
        ageWeeks: age,
        dateAdded,
        stage,
        source: source.trim(),
        purchasePrice: price,
        notes: notes.trim(),
      };

      if (editingId) {
        await updatePoultry(editingId, payload);
        setSuccessMsg("✓ Chicken batch updated successfully.");
      } else {
        await addPoultry(payload);
        setSuccessMsg("✓ New chicken batch added successfully.");
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

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Are you sure you want to delete "${name}"? This cannot be undone.`)) {
      return;
    }
    try {
      await deletePoultry(id);
      setSuccessMsg("✓ Batch deleted.");
      await refreshPoultry();
    } catch (err) {
      console.error(err);
      setErrorMsg(err instanceof Error ? err.message : "Failed to delete batch.");
    }
  }

  const filteredPoultry = poultry.filter((b) => {
    if (filterStage === "all") return true;
    if (filterStage === "chicks") return b.stage === "chicks" || b.ageWeeks <= 4;
    if (filterStage === "layers") return b.stage === "layers" || /layer/i.test(b.purpose);
    if (filterStage === "broilers") return b.stage === "broilers" || /broiler/i.test(b.purpose);
    if (filterStage === "kienyeji") return /kienyeji/i.test(b.breed) || b.stage === "kienyeji";
    return true;
  });

  return (
    <div className="view-container">
      {/* View Header */}
      <div className="view-header-row">
        <div>
          <h2>Chickens & Poultry Management</h2>
          <p className="view-subtitle">
            Manage your chicks from day-old brooding, broilers, layers, and kienyeji flocks.
          </p>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="poultry-kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon-wrap" style={{ background: "#ecfdf5", color: "#059669" }}>
            <ChickenIcon size={26} />
          </div>
          <div>
            <span className="kpi-label">Current Living Birds</span>
            <h3 className="kpi-value">{totalCurrent.toLocaleString()}</h3>
            <span className="kpi-desc">Total across all batches</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrap" style={{ background: "#fef3c7", color: "#d97706" }}>
            <ChickIcon size={26} />
          </div>
          <div>
            <span className="kpi-label">Chicks in Brooder</span>
            <h3 className="kpi-value">{totalChicks.toLocaleString()}</h3>
            <span className="kpi-desc">Day-old to 4 weeks</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrap" style={{ background: "#eff6ff", color: "#2563eb" }}>
            <ChickenIcon size={26} />
          </div>
          <div>
            <span className="kpi-label">Layers & Broilers</span>
            <h3 className="kpi-value">
              {totalLayers} <small style={{ fontSize: 13, color: "#64748b" }}>layers</small> / {totalBroilers} <small style={{ fontSize: 13, color: "#64748b" }}>broilers</small>
            </h3>
            <span className="kpi-desc">Active production birds</span>
          </div>
        </div>

        <div className="kpi-card">
          <div
            className="kpi-icon-wrap"
            style={{
              background: parseFloat(overallLossRate) > 5 ? "#fef2f2" : "#f1f5f9",
              color: parseFloat(overallLossRate) > 5 ? "#dc2626" : "#64748b",
            }}
          >
            <AlertTriangle size={24} />
          </div>
          <div>
            <span className="kpi-label">Recorded Mortality</span>
            <h3 className="kpi-value">
              {totalLoss.toLocaleString()} <span style={{ fontSize: 14, fontWeight: 500 }}>({overallLossRate}%)</span>
            </h3>
            <span className="kpi-desc">
              {parseFloat(overallLossRate) > 5 ? "⚠️ High mortality warning" : "Normal mortality"}
            </span>
          </div>
        </div>
      </div>

      {/* Main Form: Add or Edit Batch */}
      <div className="card-box form-card">
        <h3 className="card-heading">
          {editingId ? "✏️ Edit Chicken Batch" : "🐔 Add Chickens (Chicks / Broilers / Layers)"}
        </h3>
        <p className="card-subheading">
          Record arrival of day-old chicks or existing flocks. Stock formula: Closing = Initial - Deaths.
        </p>

        {errorMsg && <div className="daily-alert error-alert">{errorMsg}</div>}
        {successMsg && <div className="daily-alert success-alert">{successMsg}</div>}

        <form onSubmit={handleSubmit} className="poultry-form">
          <div className="form-row-3">
            <div className="form-field">
              <label>Growth Stage *</label>
              <select value={stage} onChange={(e) => setStage(e.target.value)}>
                <option value="chicks">🐣 Day-old Chicks (Brooding)</option>
                <option value="broilers">🍗 Broilers (Meat)</option>
                <option value="layers">🥚 Layers (Egg production)</option>
                <option value="kienyeji">🐓 Kienyeji / Improved Kienyeji</option>
                <option value="growers">🐥 Growers / Pullets</option>
                <option value="adult">🐔 Adult Flock</option>
              </select>
            </div>

            <div className="form-field">
              <label>Breed *</label>
              <input
                type="text"
                list="breed-options"
                placeholder="e.g. KARI Improved, Cobb 500, Isa Brown"
                value={breed}
                onChange={(e) => setBreed(e.target.value)}
                required
              />
              <datalist id="breed-options">
                <option value="KARI Improved Kienyeji" />
                <option value="Kuroiler" />
                <option value="Rainbow Rooster" />
                <option value="Isa Brown (Layers)" />
                <option value="Lohmann Brown" />
                <option value="Cobb 500 (Broilers)" />
                <option value="Ross 308 (Broilers)" />
                <option value="Kenbro" />
              </datalist>
            </div>

            <div className="form-field">
              <label>Purpose *</label>
              <select value={purpose} onChange={(e) => setPurpose(e.target.value)}>
                <option value="Eggs & Meat">Eggs & Meat (Dual purpose)</option>
                <option value="Egg Production">Egg Production (Layers)</option>
                <option value="Meat Production">Meat Production (Broilers)</option>
                <option value="Breeding & Chicks">Breeding & Hatching</option>
              </select>
            </div>
          </div>

          <div className="form-row-3">
            <div className="form-field">
              <label>Number Acquired / Hatched *</label>
              <input
                type="number"
                placeholder="e.g. 500"
                value={initialCount}
                onChange={(e) => {
                  setInitialCount(e.target.value);
                  if (!editingId && !currentCount) setCurrentCount(e.target.value);
                }}
                required
              />
            </div>

            <div className="form-field">
              <label>Current Number Alive *</label>
              <input
                type="number"
                placeholder="e.g. 485"
                value={currentCount}
                onChange={(e) => setCurrentCount(e.target.value)}
                required
              />
              {initialCount && currentCount && parseInt(initialCount) > parseInt(currentCount) && (
                <span className="field-hint" style={{ color: "#b91c1c" }}>
                  Deaths/Losses: {parseInt(initialCount) - parseInt(currentCount)} birds (
                  {(((parseInt(initialCount) - parseInt(currentCount)) / parseInt(initialCount)) * 100).toFixed(1)}%)
                </span>
              )}
            </div>

            <div className="form-field">
              <label>Age in Weeks *</label>
              <input
                type="number"
                placeholder="e.g. 1"
                value={ageWeeks}
                onChange={(e) => setAgeWeeks(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-row-3">
            <div className="form-field">
              <label>Date Added / Received</label>
              <input
                type="date"
                value={dateAdded}
                onChange={(e) => setDateAdded(e.target.value)}
              />
            </div>

            <div className="form-field">
              <label>Hatchery / Source Supplier (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Kenchic, Muguku, Local Hatchery"
                value={source}
                onChange={(e) => setSource(e.target.value)}
              />
            </div>

            <div className="form-field">
              <label>Total Acquisition Cost (KES, Optional)</label>
              <input
                type="number"
                placeholder="e.g. 55000"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
              />
            </div>
          </div>

          <div className="form-field">
            <label>Notes / Housing Location / Health Checks</label>
            <input
              type="text"
              placeholder="e.g. Brooder House 1, heating lamp checked, 1st Gumboro scheduled"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="form-buttons-row">
            {editingId && (
              <button type="button" className="btn-secondary" onClick={clearForm}>
                Cancel Edit
              </button>
            )}
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Saving..." : editingId ? "Update Batch" : "+ Add Chickens"}
            </button>
          </div>
        </form>
      </div>

      {/* Flocks Table Section with Stage Filter */}
      <div className="card-box">
        <div className="card-header-bar">
          <div>
            <h3 className="card-heading">Recorded Chicken Batches ({poultry.length})</h3>
            <p className="card-subheading">Track live counts, stage progress, and mortalities.</p>
          </div>

          {/* Filter Pills */}
          <div className="table-filter-pills">
            {["all", "chicks", "layers", "broilers", "kienyeji"].map((st) => (
              <button
                key={st}
                className={`filter-pill ${filterStage === st ? "active" : ""}`}
                onClick={() => setFilterStage(st)}
              >
                {st.charAt(0).toUpperCase() + st.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {filteredPoultry.length === 0 ? (
          <div className="empty-state">
            <ChickenIcon size={48} />
            <h4>No chicken batches found</h4>
            <p>Use the form above to record your first flock of chicks or chickens.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="modern-table">
              <thead>
                <tr>
                  <th>Flock / Breed</th>
                  <th>Growth Stage</th>
                  <th>Age</th>
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
                  const losses = Math.max(0, b.initialCount - b.currentCount);
                  const lossPct = b.initialCount > 0 ? (losses / b.initialCount) * 100 : 0;
                  const isHighLoss = lossPct >= 5;

                  return (
                    <tr key={b.id}>
                      <td>
                        <strong>{b.breed}</strong>
                        <div style={{ fontSize: 12, color: "#64748b" }}>{b.purpose}</div>
                      </td>
                      <td>
                        <span className={`badge-stage badge-${b.stage || "adult"}`}>
                          {b.stage === "chicks" ? "🐣 Chicks" : b.stage === "layers" ? "🥚 Layers" : b.stage === "broilers" ? "🍗 Broilers" : b.stage || "Adult"}
                        </span>
                      </td>
                      <td>{b.ageWeeks} wks</td>
                      <td>{b.initialCount.toLocaleString()}</td>
                      <td>
                        <strong style={{ color: "#0f172a" }}>{b.currentCount.toLocaleString()}</strong>
                      </td>
                      <td>{losses > 0 ? `${losses} birds` : "0"}</td>
                      <td>
                        <span className={`badge-loss ${isHighLoss ? "high-loss" : "normal-loss"}`}>
                          {lossPct.toFixed(1)}%
                        </span>
                      </td>
                      <td>{b.dateAdded ? b.dateAdded.slice(0, 10) : "—"}</td>
                      <td>
                        <div className="row-actions">
                          <button
                            className="btn-icon"
                            onClick={() => startEdit(b)}
                            title="Edit Batch"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            className="btn-icon delete-icon"
                            onClick={() => handleDelete(b.id, `${b.breed} (${b.purpose})`)}
                            title="Delete Batch"
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


