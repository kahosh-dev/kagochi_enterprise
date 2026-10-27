import React, { useEffect, useState } from "react";
import {
  loadVaccinations,
  addVaccination,
  updateVaccination,
  deleteVaccination,
  loadVaccinationSchedules,
  addVaccinationSchedule,
  deleteVaccinationSchedule,
  loadPoultry,
  loadLivestock,
} from "../services/storage";
import type {
  VaccinationRecord,
  VaccinationSchedule,
  PoultryBatch,
  LivestockAnimal,
} from "../types/farm";
import {
  Syringe,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Plus,
  Trash2,
  Edit2,
  Filter,
} from "lucide-react";
import {
  ChickenIcon,
  CowIcon,
} from "../components/FarmIcons";

export default function VaccinationsView() {
  const [activeTab, setActiveTab] = useState<"reminders" | "schedules" | "add">("reminders");
  const [vaccinations, setVaccinations] = useState<VaccinationRecord[]>([]);
  const [schedules, setSchedules] = useState<VaccinationSchedule[]>([]);
  const [poultry, setPoultry] = useState<PoultryBatch[]>([]);
  const [animals, setAnimals] = useState<LivestockAnimal[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form states for new vaccination
  const [species, setSpecies] = useState<"poultry" | "cattle">("poultry");
  const [targetType, setTargetType] = useState<"batch" | "animal">("batch");
  const [targetId, setTargetId] = useState("");
  const [targetName, setTargetName] = useState("");
  const [vaccineName, setVaccineName] = useState("");
  const [disease, setDisease] = useState("");
  const [dateDue, setDateDue] = useState(new Date().toISOString().slice(0, 10));
  const [dose, setDose] = useState("");
  const [administeredBy, setAdministeredBy] = useState("Farm Vet");
  const [notes, setNotes] = useState("");

  // Schedule form state
  const [schSpecies, setSchSpecies] = useState<"poultry" | "cattle">("poultry");
  const [schCategory, setSchCategory] = useState("chicks");
  const [schVaccine, setSchVaccine] = useState("");
  const [schDisease, setSchDisease] = useState("");
  const [schAgeDays, setSchAgeDays] = useState("7");
  const [schBoosterDays, setSchBoosterDays] = useState("14");

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const todayStr = new Date().toISOString().slice(0, 10);

  async function refreshData() {
    try {
      setLoading(true);
      const [vData, sData, pData, aData] = await Promise.all([
        loadVaccinations(),
        loadVaccinationSchedules(),
        loadPoultry(),
        loadLivestock(),
      ]);
      setVaccinations(vData);
      setSchedules(sData);
      setPoultry(pData);
      setAnimals(aData);
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to load vaccination records.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshData();
  }, []);

  // Categorize reminders
  const dueToday = vaccinations.filter(
    (v) => v.status !== "completed" && v.dateDue && v.dateDue.slice(0, 10) === todayStr
  );
  const overdue = vaccinations.filter(
    (v) => v.status !== "completed" && v.dateDue && v.dateDue.slice(0, 10) < todayStr
  );
  const upcoming7 = vaccinations.filter((v) => {
    if (v.status === "completed" || !v.dateDue) return false;
    const d = v.dateDue.slice(0, 10);
    const in7 = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
    return d > todayStr && d <= in7;
  });
  const completed = vaccinations.filter((v) => v.status === "completed");

  async function handleMarkCompleted(vac: VaccinationRecord) {
    try {
      setSaving(true);
      await updateVaccination(vac.id, {
        ...vac,
        status: "completed",
        dateAdministered: todayStr,
      });
      setSuccessMsg(`✓ ${vac.vaccineName} marked as completed.`);
      await refreshData();
    } catch (err) {
      setErrorMsg("Failed to update status.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveVaccination(e: React.FormEvent) {
    e.preventDefault();
    if (!vaccineName.trim()) {
      setErrorMsg("Please enter the vaccine name.");
      return;
    }
    try {
      setSaving(true);
      await addVaccination({
        species,
        targetType,
        targetId: targetId || "custom",
        targetName: targetName.trim() || (species === "poultry" ? "Main Flock" : "Dairy Herd"),
        vaccineName: vaccineName.trim(),
        disease: disease.trim() || "Preventative",
        dateDue,
        dateAdministered: "",
        dose: dose.trim(),
        administeredBy: administeredBy.trim(),
        status: "scheduled",
        notes: notes.trim(),
      });
      setSuccessMsg(`✓ Scheduled ${vaccineName} for ${dateDue}.`);
      setVaccineName("");
      setDisease("");
      setDose("");
      setNotes("");
      setActiveTab("reminders");
      await refreshData();
    } catch (err) {
      setErrorMsg("Failed to schedule vaccination.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveSchedule(e: React.FormEvent) {
    e.preventDefault();
    if (!schVaccine.trim()) {
      setErrorMsg("Please enter the vaccine name.");
      return;
    }
    try {
      setSaving(true);
      await addVaccinationSchedule({
        species: schSpecies,
        category: schCategory,
        vaccineName: schVaccine.trim(),
        targetDisease: schDisease.trim(),
        ageDaysDue: parseInt(schAgeDays) || 0,
        boosterIntervalDays: parseInt(schBoosterDays) || 0,
        notes: "",
      });
      setSuccessMsg(`✓ Added schedule rule for ${schVaccine}.`);
      setSchVaccine("");
      setSchDisease("");
      await refreshData();
    } catch (err) {
      setErrorMsg("Failed to add schedule.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteVac(id: string) {
    if (!window.confirm("Delete this vaccination record?")) return;
    try {
      await deleteVaccination(id);
      await refreshData();
    } catch (err) {
      setErrorMsg("Failed to delete record.");
    }
  }

  async function handleDeleteSch(id: string) {
    if (!window.confirm("Delete this schedule template?")) return;
    try {
      await deleteVaccinationSchedule(id);
      await refreshData();
    } catch (err) {
      setErrorMsg("Failed to delete template.");
    }
  }

  return (
    <div className="view-container">
      {/* Header */}
      <div className="view-header-row">
        <div>
          <h2>Vaccination & Veterinary Reminders</h2>
          <p className="view-subtitle">
            Keep your chickens and cattle protected with automated schedules and due-date alerts.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="poultry-kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon-wrap" style={{ background: dueToday.length > 0 ? "#fef3c7" : "#ecfdf5", color: dueToday.length > 0 ? "#d97706" : "#059669" }}>
            <Calendar size={26} />
          </div>
          <div>
            <span className="kpi-label">Due Today</span>
            <h3 className="kpi-value">{dueToday.length}</h3>
            <span className="kpi-desc">Scheduled for today</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrap" style={{ background: overdue.length > 0 ? "#fef2f2" : "#f1f5f9", color: overdue.length > 0 ? "#dc2626" : "#64748b" }}>
            <AlertTriangle size={26} />
          </div>
          <div>
            <span className="kpi-label">Overdue Vaccinations</span>
            <h3 className="kpi-value" style={{ color: overdue.length > 0 ? "#dc2626" : "inherit" }}>
              {overdue.length}
            </h3>
            <span className="kpi-desc">{overdue.length > 0 ? "⚠️ Immediate attention needed" : "All up to date"}</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrap" style={{ background: "#eff6ff", color: "#2563eb" }}>
            <Clock size={26} />
          </div>
          <div>
            <span className="kpi-label">Next 7 Days</span>
            <h3 className="kpi-value">{upcoming7.length}</h3>
            <span className="kpi-desc">Upcoming appointments</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrap" style={{ background: "#ecfdf5", color: "#059669" }}>
            <CheckCircle2 size={26} />
          </div>
          <div>
            <span className="kpi-label">Completed</span>
            <h3 className="kpi-value">{completed.length}</h3>
            <span className="kpi-desc">Administered vaccines</span>
          </div>
        </div>
      </div>

      {errorMsg && <div className="daily-alert error-alert">{errorMsg}</div>}
      {successMsg && <div className="daily-alert success-alert">{successMsg}</div>}

      {/* Tabs */}
      <div className="type-toggle-tabs" style={{ marginBottom: 20 }}>
        <button
          type="button"
          className={`type-tab-btn ${activeTab === "reminders" ? "active-income" : ""}`}
          onClick={() => setActiveTab("reminders")}
        >
          <Calendar size={18} /> Due & Overdue Reminders ({overdue.length + dueToday.length + upcoming7.length})
        </button>
        <button
          type="button"
          className={`type-tab-btn ${activeTab === "add" ? "active-income" : ""}`}
          onClick={() => setActiveTab("add")}
        >
          <Plus size={18} /> Schedule Vaccination
        </button>
        <button
          type="button"
          className={`type-tab-btn ${activeTab === "schedules" ? "active-income" : ""}`}
          onClick={() => setActiveTab("schedules")}
        >
          <Syringe size={18} /> Configurable Timetables ({schedules.length})
        </button>
      </div>

      {/* TAB 1: REMINDERS LIST */}
      {activeTab === "reminders" && (
        <div className="card-box">
          <h3 className="card-heading">Active Vaccination Schedules & Reminders</h3>
          {vaccinations.length === 0 ? (
            <div className="empty-state">
              <Syringe size={48} />
              <h4>No vaccination records yet</h4>
              <p>Schedule your first poultry or cattle vaccine using the "Schedule Vaccination" tab.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="modern-table">
                <thead>
                  <tr>
                    <th>Due Date</th>
                    <th>Status</th>
                    <th>Species</th>
                    <th>Target Animal / Batch</th>
                    <th>Vaccine Name</th>
                    <th>Disease</th>
                    <th>Dose / Route</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {vaccinations.map((v) => {
                    const isDueToday = v.dateDue && v.dateDue.slice(0, 10) === todayStr;
                    const isOver = v.status !== "completed" && v.dateDue && v.dateDue.slice(0, 10) < todayStr;
                    const isDone = v.status === "completed";

                    return (
                      <tr key={v.id}>
                        <td>
                          <strong>{v.dateDue ? v.dateDue.slice(0, 10) : "—"}</strong>
                        </td>
                        <td>
                          <span
                            className={`badge-stage ${
                              isDone ? "badge-chicks" : isOver ? "badge-broilers" : isDueToday ? "badge-layers" : "badge-adult"
                            }`}
                          >
                            {isDone ? "✓ Done" : isOver ? "⚠️ Overdue" : isDueToday ? "🔔 Due Today" : "Upcoming"}
                          </span>
                        </td>
                        <td>{v.species === "poultry" ? "🐔 Poultry" : "🐄 Cattle"}</td>
                        <td>
                          <strong>{v.targetName}</strong>
                        </td>
                        <td>{v.vaccineName}</td>
                        <td>{v.disease}</td>
                        <td>{v.dose || "Standard"}</td>
                        <td>
                          <div className="row-actions">
                            {!isDone && (
                              <button
                                className="btn-pill-promote"
                                onClick={() => handleMarkCompleted(v)}
                                title="Mark Administered"
                              >
                                Mark Done ✓
                              </button>
                            )}
                            <button
                              className="btn-icon delete-icon"
                              onClick={() => handleDeleteVac(v.id)}
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
      )}

      {/* TAB 2: SCHEDULE A VACCINATION */}
      {activeTab === "add" && (
        <div className="card-box form-card">
          <h3 className="card-heading">Schedule a Vaccination Event</h3>
          <p className="card-subheading">
            Assign a vaccine due date to a poultry batch (e.g. Day-old chicks) or individual cattle.
          </p>

          <form onSubmit={handleSaveVaccination} className="poultry-form">
            <div className="form-row-3">
              <div className="form-field">
                <label>Species *</label>
                <select
                  value={species}
                  onChange={(e) => {
                    const s = e.target.value as "poultry" | "cattle";
                    setSpecies(s);
                    setTargetType(s === "poultry" ? "batch" : "animal");
                  }}
                >
                  <option value="poultry">🐔 Poultry</option>
                  <option value="cattle">🐄 Cattle</option>
                </select>
              </div>

              <div className="form-field">
                <label>Target Group / Animal Name *</label>
                <input
                  type="text"
                  placeholder={species === "poultry" ? "e.g. Broiler Batch A, Chicks" : "e.g. Baraka, Neema"}
                  value={targetName}
                  onChange={(e) => setTargetName(e.target.value)}
                  required
                />
              </div>

              <div className="form-field">
                <label>Date Due *</label>
                <input
                  type="date"
                  value={dateDue}
                  onChange={(e) => setDateDue(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-row-3">
              <div className="form-field">
                <label>Vaccine Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Gumboro (IBD), Newcastle, ECF, Anthrax"
                  value={vaccineName}
                  onChange={(e) => setVaccineName(e.target.value)}
                  required
                />
              </div>

              <div className="form-field">
                <label>Target Disease</label>
                <input
                  type="text"
                  placeholder="e.g. Infectious Bursal Disease, FMD"
                  value={disease}
                  onChange={(e) => setDisease(e.target.value)}
                />
              </div>

              <div className="form-field">
                <label>Dose & Route</label>
                <input
                  type="text"
                  placeholder="e.g. Eye drop, Drinking water, Subcutaneous"
                  value={dose}
                  onChange={(e) => setDose(e.target.value)}
                />
              </div>
            </div>

            <div className="form-field">
              <label>Veterinarian / Administering Person & Notes</label>
              <input
                type="text"
                placeholder="e.g. Dr. Mwangi (Agrovet), check temperature before administering"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="form-buttons-row">
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? "Scheduling..." : "+ Schedule Vaccination"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: CONFIGURABLE SCHEDULE TEMPLATES */}
      {activeTab === "schedules" && (
        <div className="card-box">
          <div className="card-header-bar">
            <div>
              <h3 className="card-heading">Configurable Vaccination Timetables</h3>
              <p className="card-subheading">
                Define standard timetable rules based on age (e.g. Marek's at Day 1, Gumboro at Day 10).
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveSchedule} className="poultry-form" style={{ marginBottom: 24, padding: 16, background: "#f8fafc", borderRadius: 8 }}>
            <h4 style={{ margin: "0 0 12px 0", fontSize: 14 }}>+ Add Standard Schedule Template</h4>
            <div className="form-row-3">
              <div className="form-field">
                <label>Species</label>
                <select
                  value={schSpecies}
                  onChange={(e) => setSchSpecies(e.target.value as any)}
                >
                  <option value="poultry">Poultry</option>
                  <option value="cattle">Cattle</option>
                </select>
              </div>

              <div className="form-field">
                <label>Target Category</label>
                <select
                  value={schCategory}
                  onChange={(e) => setSchCategory(e.target.value)}
                >
                  <option value="chicks">Chicks (Brooding)</option>
                  <option value="broilers">Broilers</option>
                  <option value="layers">Layers</option>
                  <option value="calves">Calves</option>
                  <option value="heifers">Heifers</option>
                  <option value="cows">Cows</option>
                </select>
              </div>

              <div className="form-field">
                <label>Vaccine Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Gumboro (Intermediate)"
                  value={schVaccine}
                  onChange={(e) => setSchVaccine(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-row-3">
              <div className="form-field">
                <label>Target Disease</label>
                <input
                  type="text"
                  placeholder="e.g. IBD"
                  value={schDisease}
                  onChange={(e) => setSchDisease(e.target.value)}
                />
              </div>

              <div className="form-field">
                <label>Due at Age (Days) *</label>
                <input
                  type="number"
                  placeholder="e.g. 10"
                  value={schAgeDays}
                  onChange={(e) => setSchAgeDays(e.target.value)}
                  required
                />
              </div>

              <div className="form-field">
                <label>Booster Interval (Days, 0 if none)</label>
                <input
                  type="number"
                  placeholder="e.g. 14"
                  value={schBoosterDays}
                  onChange={(e) => setSchBoosterDays(e.target.value)}
                />
              </div>
            </div>

            <button type="submit" className="btn-primary" disabled={saving}>
              Save Schedule Template
            </button>
          </form>

          {schedules.length === 0 ? (
            <div className="empty-state">
              <Syringe size={36} />
              <p>No vaccination schedule templates created yet.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="modern-table">
                <thead>
                  <tr>
                    <th>Species</th>
                    <th>Category</th>
                    <th>Vaccine Name</th>
                    <th>Disease</th>
                    <th>Due at Age</th>
                    <th>Booster Interval</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {schedules.map((s) => (
                    <tr key={s.id}>
                      <td>{s.species === "poultry" ? "🐔 Poultry" : "🐄 Cattle"}</td>
                      <td>
                        <span className="badge-stage badge-chicks">{s.category}</span>
                      </td>
                      <td><strong>{s.vaccineName}</strong></td>
                      <td>{s.targetDisease}</td>
                      <td>Day {s.ageDaysDue}</td>
                      <td>{s.boosterIntervalDays ? `${s.boosterIntervalDays} days` : "None"}</td>
                      <td>
                        <button
                          className="btn-icon delete-icon"
                          onClick={() => handleDeleteSch(s.id)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
