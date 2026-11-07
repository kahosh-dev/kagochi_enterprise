import { useEffect, useState } from "react";
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
import { Syringe, Trash2, CheckCircle2, Plus, Pencil } from "lucide-react";
import {
  PageHeader,
  Panel,
  StatCard,
  Field,
  Button,
  IconButton,
  EmptyState,
  ErrorBanner,
  Notice,
  Segmented,
  Modal,
  Badge,
} from "../components/ui";

// Map status → Badge tone
type BadgeTone = "green" | "amber" | "red" | "blue" | "slate";

function statusTone(status: string): BadgeTone {
  if (status === "completed") return "green";
  if (status === "overdue") return "red";
  if (status === "due_today" || status === "due") return "amber";
  if (status === "upcoming" || status === "scheduled") return "blue";
  return "slate";
}

function statusLabel(status: string): string {
  if (status === "completed") return "Completed";
  if (status === "overdue") return "Overdue";
  if (status === "due_today" || status === "due") return "Due Today";
  if (status === "upcoming") return "Upcoming";
  if (status === "scheduled") return "Scheduled";
  if (status === "cancelled") return "Cancelled";
  return status;
}

// A small table component for a vaccination group
function VaccGroup({
  title,
  tone,
  vaccs,
  onMarkDone,
  onEdit,
  onDelete,
}: {
  title: string;
  tone: BadgeTone;
  vaccs: VaccinationRecord[];
  onMarkDone: (v: VaccinationRecord) => void;
  onEdit?: (v: VaccinationRecord) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div style={{ marginBottom: "1.5rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
        <Badge tone={tone}>{title}</Badge>
        <Badge tone="slate">{vaccs.length}</Badge>
      </div>
      {vaccs.length === 0 ? (
        <EmptyState compact title={`No ${title.toLowerCase()} vaccinations`} />
      ) : (
        <>
          {/* Mobile card list */}
          <div className="kf-vacc-cards--mobile">
            {vaccs.map((v) => (
              <div key={v.id} className="kf-vacc-card">
                <div className="kf-vacc-card-top">
                  <div>
                    <h4 className="kf-vacc-card-title">{v.vaccineName}</h4>
                    <p className="kf-vacc-card-target">
                      {v.species === "poultry" ? "🐔 " : "🐄 "}
                      {v.targetName}
                      {v.disease ? ` · ${v.disease}` : ""}
                    </p>
                  </div>
                  <Badge tone={statusTone(v.status)}>{statusLabel(v.status)}</Badge>
                </div>
                <div className="kf-vacc-card-meta">
                  <div className="kf-vacc-card-meta-item">
                    <span className="kf-vacc-card-meta-label">Due Date</span>
                    <span className="kf-vacc-card-meta-value">{v.dateDue ? v.dateDue.slice(0, 10) : "—"}</span>
                  </div>
                  {v.dateAdministered && (
                    <div className="kf-vacc-card-meta-item">
                      <span className="kf-vacc-card-meta-label">Date Given</span>
                      <span className="kf-vacc-card-meta-value">{v.dateAdministered.slice(0, 10)}</span>
                    </div>
                  )}
                  {v.countVaccinated !== undefined && v.countVaccinated > 0 && (
                    <div className="kf-vacc-card-meta-item">
                      <span className="kf-vacc-card-meta-label">Animals</span>
                      <span className="kf-vacc-card-meta-value">{v.countVaccinated}</span>
                    </div>
                  )}
                  {v.administeredBy && (
                    <div className="kf-vacc-card-meta-item">
                      <span className="kf-vacc-card-meta-label">Given By</span>
                      <span className="kf-vacc-card-meta-value">{v.administeredBy}</span>
                    </div>
                  )}
                </div>
                {v.notes && (
                  <p style={{ margin: "4px 0 0", fontSize: "12px", color: "var(--kf-muted)" }}>
                    {v.notes}
                  </p>
                )}
                <div className="kf-vacc-card-actions">
                  {v.status !== "completed" && (
                    <Button
                      variant="soft"
                      size="sm"
                      icon={<CheckCircle2 size={14} />}
                      onClick={() => onMarkDone(v)}
                    >
                      Mark done
                    </Button>
                  )}
                  {onEdit && (
                    <IconButton
                      label="Edit"
                      icon={<Pencil size={15} />}
                      onClick={() => onEdit(v)}
                    />
                  )}
                  <IconButton
                    label="Delete"
                    icon={<Trash2 size={15} />}
                    onClick={() => onDelete(v.id)}
                    tone="danger"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="kf-vacc-table--desktop">
            <div className="kf-table-wrap">
              <table className="kf-table">
                <thead>
                  <tr>
                    <th>Vaccine</th>
                    <th>Species</th>
                    <th>Animal / Group</th>
                    <th>Due Date</th>
                    <th>Date Given</th>
                    <th>Animals</th>
                    <th>Status</th>
                    <th>Notes</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {vaccs.map((v) => (
                    <tr key={v.id}>
                      <td>
                        <strong>{v.vaccineName}</strong>
                      </td>
                      <td>{v.species === "poultry" ? "Poultry" : "Cattle"}</td>
                      <td>{v.targetName}</td>
                      <td>{v.dateDue ? v.dateDue.slice(0, 10) : "—"}</td>
                      <td>{v.dateAdministered ? v.dateAdministered.slice(0, 10) : "—"}</td>
                      <td>{v.countVaccinated ?? "—"}</td>
                      <td>
                        <Badge tone={statusTone(v.status)}>{statusLabel(v.status)}</Badge>
                      </td>
                      <td>{v.notes || "—"}</td>
                      <td>
                        <div className="kf-row-actions">
                          {v.status !== "completed" && (
                            <Button
                              variant="soft"
                              size="sm"
                              icon={<CheckCircle2 size={14} />}
                              onClick={() => onMarkDone(v)}
                            >
                              Mark done
                            </Button>
                          )}
                          {onEdit && (
                            <IconButton
                              label="Edit"
                              icon={<Pencil size={15} />}
                              onClick={() => onEdit(v)}
                            />
                          )}
                          <IconButton
                            label="Delete"
                            icon={<Trash2 size={15} />}
                            onClick={() => onDelete(v.id)}
                            tone="danger"
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function VaccinationsView() {
  const [activeTab, setActiveTab] = useState<"reminders" | "schedules" | "add">("reminders");
  const [vaccinations, setVaccinations] = useState<VaccinationRecord[]>([]);
  const [schedules, setSchedules] = useState<VaccinationSchedule[]>([]);
  const [_poultry, setPoultry] = useState<PoultryBatch[]>([]);
  const [_animals, setAnimals] = useState<LivestockAnimal[]>([]);
  const [_loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Vaccination form
  const [species, setSpecies] = useState<"poultry" | "cattle">("poultry");
  const [targetName, setTargetName] = useState("");
  const [vaccineName, setVaccineName] = useState("");
  const [disease, setDisease] = useState("");
  const [dateDue, setDateDue] = useState(new Date().toISOString().slice(0, 10));
  const [dateAdministered, setDateAdministered] = useState("");
  const [dose, setDose] = useState("");
  const [countVaccinated, setCountVaccinated] = useState(0);
  const [administeredBy, setAdministeredBy] = useState("");
  const [vacStatus, setVacStatus] = useState<VaccinationRecord["status"]>("scheduled");
  const [notes, setNotes] = useState("");

  // Schedule form
  const [schSpecies, setSchSpecies] = useState<"poultry" | "cattle">("poultry");
  const [schCategory, setSchCategory] = useState("chicks");
  const [schVaccine, setSchVaccine] = useState("");
  const [schDisease, setSchDisease] = useState("");
  const [schAgeDays, setSchAgeDays] = useState("7");
  const [schBoosterDays, setSchBoosterDays] = useState("14");

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Mark Done modal
  const [markDoneId, setMarkDoneId] = useState<string | null>(null);
  const [markDoneDate, setMarkDoneDate] = useState(new Date().toISOString().slice(0, 10));
  const [markDoneCount, setMarkDoneCount] = useState(0);
  const [markDoneSubmitting, setMarkDoneSubmitting] = useState(false);
  const [markDoneError, setMarkDoneError] = useState("");

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

  // Reminder groups
  const overdue = vaccinations.filter(
    (v) => v.status !== "completed" && v.dateDue && v.dateDue.slice(0, 10) < todayStr
  );
  const dueToday = vaccinations.filter(
    (v) => v.status !== "completed" && v.dateDue && v.dateDue.slice(0, 10) === todayStr
  );
  const upcoming = vaccinations.filter((v) => {
    if (v.status === "completed" || !v.dateDue) return false;
    const d = v.dateDue.slice(0, 10);
    return d > todayStr;
  });
  const completed = vaccinations.filter((v) => v.status === "completed");

  const [editingId, setEditingId] = useState<string | null>(null);

  function resetVaccinationForm() {
    setEditingId(null);
    setSpecies("poultry");
    setTargetName("");
    setVaccineName("");
    setDisease("");
    setDateDue(new Date().toISOString().slice(0, 10));
    setDateAdministered("");
    setDose("");
    setCountVaccinated(0);
    setAdministeredBy("");
    setVacStatus("scheduled");
    setNotes("");
    setErrorMsg("");
  }

  function startEdit(v: VaccinationRecord) {
    setEditingId(v.id);
    setSpecies(v.species.toLowerCase() === "cattle" ? "cattle" : "poultry");
    setTargetName(v.targetName);
    setVaccineName(v.vaccineName);
    setDisease(v.disease || "");
    setDateDue(v.dateDue ? v.dateDue.slice(0, 10) : new Date().toISOString().slice(0, 10));
    setDateAdministered(v.dateAdministered ? v.dateAdministered.slice(0, 10) : "");
    setDose(v.dose || "");
    setCountVaccinated(v.countVaccinated ?? 0);
    setAdministeredBy(v.administeredBy || "");
    setVacStatus((v.status as VaccinationRecord["status"]) || "scheduled");
    setNotes(v.notes || "");
    setErrorMsg("");
    setActiveTab("add");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleMarkDone(e: React.FormEvent) {
    e.preventDefault();
    if (!markDoneId) return;
    setMarkDoneError("");
    const rec = vaccinations.find((r) => r.id === markDoneId);
    if (!rec) return;
    try {
      setMarkDoneSubmitting(true);
      await updateVaccination(markDoneId, {
        ...rec,
        status: "completed",
        dateAdministered: markDoneDate,
        countVaccinated: markDoneCount,
      });
      setMarkDoneId(null);
      await refreshData();
    } catch (err) {
      setMarkDoneError(err instanceof Error ? err.message : "Failed to mark as done.");
    } finally {
      setMarkDoneSubmitting(false);
    }
  }

  async function handleSaveVaccination(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!targetName.trim()) {
      setErrorMsg("Please enter the animal or group name.");
      return;
    }
    if (!vaccineName.trim()) {
      setErrorMsg("Please enter the vaccine name.");
      return;
    }
    if (!dateDue) {
      setErrorMsg("Please select the date to give the vaccine.");
      return;
    }

    try {
      setSaving(true);
      const record = {
        species,
        targetType: species === "poultry" ? "batch" : "animal",
        targetId: "custom",
        targetName: targetName.trim(),
        vaccineName: vaccineName.trim(),
        disease: disease.trim() || "Preventative",
        dateDue: dateDue.slice(0, 10),
        dateAdministered: dateAdministered ? dateAdministered.slice(0, 10) : "",
        dose: dose.trim(),
        administeredBy: administeredBy.trim() || "Farm Vet",
        status: vacStatus,
        countVaccinated: Math.max(0, Math.floor(Number(countVaccinated) || 0)),
        notes: notes.trim(),
      };

      if (editingId) {
        await updateVaccination(editingId, record);
        setSuccessMsg(`Vaccination record updated: ${vaccineName} (${species}).`);
      } else {
        await addVaccination(record);
        setSuccessMsg(`Vaccination record saved: ${vaccineName} (${species}).`);
      }

      resetVaccinationForm();
      setActiveTab("reminders");
      await refreshData();
    } catch (err) {
      console.error(err);
      setErrorMsg(err instanceof Error ? err.message : "Failed to save vaccination record.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveSchedule(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
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
      setSuccessMsg(`Added schedule rule for ${schVaccine}.`);
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
    try {
      await deleteVaccination(id);
      await refreshData();
    } catch (err) {
      setErrorMsg("Failed to delete record.");
    }
  }

  async function handleDeleteSch(id: string) {
    try {
      await deleteVaccinationSchedule(id);
      await refreshData();
    } catch (err) {
      setErrorMsg("Failed to delete template.");
    }
  }

  const markingRec = markDoneId ? vaccinations.find((r) => r.id === markDoneId) : null;

  return (
    <main className="kf-page">
      <PageHeader
        title="Vaccinations"
        description="Track vaccination schedules, record when vaccines are given, and view upcoming reminders for your animals."
      />

      {/* Feedback */}
      {errorMsg && <ErrorBanner message={errorMsg} onRetry={() => setErrorMsg("")} />}
      {successMsg && <Notice tone="success">{successMsg}</Notice>}

      {/* KPI Summary Cards */}
      <div className="kf-grid kf-grid--stats" style={{ marginBottom: 16 }}>
        <StatCard
          tone={overdue.length > 0 ? "red" : "slate"}
          image="/images/farm/operating-loss.webp"
          imageAlt="Overdue Vaccinations"
          layout="image-right"
          label="Overdue"
          value={overdue.length}
          hint={overdue.length > 0 ? "These need attention now" : "No overdue doses"}
          onClick={() => setActiveTab("reminders")}
        />
        <StatCard
          tone={dueToday.length > 0 ? "amber" : "slate"}
          image="/images/farm/vaccination.webp"
          imageAlt="Due Today"
          layout="image-right"
          label="Due Today"
          value={dueToday.length}
          hint="Scheduled for administration today"
          onClick={() => setActiveTab("reminders")}
        />
        <StatCard
          tone="blue"
          image="/images/farm/vaccination.webp"
          imageAlt="Upcoming"
          layout="image-right"
          label="Upcoming"
          value={upcoming.length}
          hint="Future scheduled vaccinations"
          onClick={() => setActiveTab("reminders")}
        />
        <StatCard
          tone="forest"
          image="/images/farm/vaccination.webp"
          imageAlt="Completed"
          layout="image-right"
          label="Completed"
          value={completed.length}
          hint="Vaccines recorded as done"
          onClick={() => setActiveTab("reminders")}
        />
      </div>

      {/* Tabs */}
      <Segmented
        label="Vaccinations section"
        options={[
          {
            value: "reminders",
            label: "Vaccination List",
            count: overdue.length + dueToday.length + upcoming.length + completed.length,
            icon: <Syringe size={15} />,
          },
          {
            value: "schedules",
            label: "Timetables",
            count: schedules.length,
          },
          {
            value: "add",
            label: editingId ? "Edit Vaccine" : "Record Vaccine",
            icon: <Plus size={15} />,
          },
        ]}
        value={activeTab}
        onChange={(v) => {
          setActiveTab(v as "reminders" | "schedules" | "add");
          if (v !== "add" && editingId) resetVaccinationForm();
        }}
      />

      {/* ── REMINDERS TAB ── */}
      {activeTab === "reminders" && (
        <Panel title="Vaccination reminders" subtitle="Grouped by status">
          <VaccGroup
            title="Overdue"
            tone="red"
            vaccs={overdue}
            onMarkDone={(v) => {
              setMarkDoneId(v.id);
              setMarkDoneDate(todayStr);
              setMarkDoneCount(v.countVaccinated ?? 0);
              setMarkDoneError("");
            }}
            onEdit={startEdit}
            onDelete={handleDeleteVac}
          />
          <VaccGroup
            title="Due Today"
            tone="amber"
            vaccs={dueToday}
            onMarkDone={(v) => {
              setMarkDoneId(v.id);
              setMarkDoneDate(todayStr);
              setMarkDoneCount(v.countVaccinated ?? 0);
              setMarkDoneError("");
            }}
            onEdit={startEdit}
            onDelete={handleDeleteVac}
          />
          <VaccGroup
            title="Upcoming"
            tone="blue"
            vaccs={upcoming}
            onMarkDone={(v) => {
              setMarkDoneId(v.id);
              setMarkDoneDate(todayStr);
              setMarkDoneCount(v.countVaccinated ?? 0);
              setMarkDoneError("");
            }}
            onEdit={startEdit}
            onDelete={handleDeleteVac}
          />
          <VaccGroup
            title="Completed"
            tone="green"
            vaccs={completed}
            onMarkDone={(v) => {
              setMarkDoneId(v.id);
              setMarkDoneDate(todayStr);
              setMarkDoneCount(v.countVaccinated ?? 0);
              setMarkDoneError("");
            }}
            onEdit={startEdit}
            onDelete={handleDeleteVac}
          />
        </Panel>
      )}

      {/* ── SCHEDULES TAB ── */}
      {activeTab === "schedules" && (
        <Panel title="Vaccination timetables" subtitle="Standard timetable rules by species and age">
          {schedules.length === 0 ? (
            <EmptyState
              icon={<Syringe size={40} />}
              title="No timetable templates"
              description="Add a standard timetable rule below."
            />
          ) : (
            <div className="kf-table-wrap" style={{ marginBottom: "1.5rem" }}>
              <table className="kf-table">
                <thead>
                  <tr>
                    <th>Species</th>
                    <th>Category</th>
                    <th>Vaccine</th>
                    <th>Target Disease</th>
                    <th>Age Days</th>
                    <th>Booster Interval</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {schedules.map((s) => (
                    <tr key={s.id}>
                      <td>{s.species === "poultry" ? "Poultry" : "Cattle"}</td>
                      <td>
                        <Badge tone="slate">{s.category}</Badge>
                      </td>
                      <td>
                        <strong>{s.vaccineName}</strong>
                      </td>
                      <td>{s.targetDisease}</td>
                      <td>Day {s.ageDaysDue}</td>
                      <td>{s.boosterIntervalDays ? `${s.boosterIntervalDays} days` : "None"}</td>
                      <td>
                        <IconButton
                          label="Delete schedule"
                          icon={<Trash2 size={15} />}
                          onClick={() => handleDeleteSch(s.id)}
                          tone="danger"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Schedule add form */}
          <form onSubmit={handleSaveSchedule} className="kf-form">
            <div className="kf-form-grid">
              <Field label="Species" required>
                <select
                  className="kf-input"
                  value={schSpecies}
                  onChange={(e) => setSchSpecies(e.target.value as "poultry" | "cattle")}
                >
                  <option value="poultry">Poultry</option>
                  <option value="cattle">Cattle</option>
                </select>
              </Field>
              <Field label="Category" required>
                <select
                  className="kf-input"
                  value={schCategory}
                  onChange={(e) => setSchCategory(e.target.value)}
                >
                  <option value="chicks">Chicks</option>
                  <option value="broilers">Broilers</option>
                  <option value="layers">Layers</option>
                  <option value="calves">Calves</option>
                  <option value="heifers">Heifers</option>
                  <option value="cows">Cows</option>
                </select>
              </Field>
              <Field label="Vaccine Name" required>
                <input
                  type="text"
                  className="kf-input"
                  placeholder="e.g. Gumboro (Intermediate)"
                  value={schVaccine}
                  onChange={(e) => setSchVaccine(e.target.value)}
                  required
                />
              </Field>
              <Field label="Target Disease">
                <input
                  type="text"
                  className="kf-input"
                  placeholder="e.g. IBD"
                  value={schDisease}
                  onChange={(e) => setSchDisease(e.target.value)}
                />
              </Field>
              <Field label="Give at age (days old)" required>
                <input
                  type="number"
                  className="kf-input"
                  placeholder="e.g. 10"
                  value={schAgeDays}
                  onChange={(e) => setSchAgeDays(e.target.value)}
                  required
                />
              </Field>
              <Field label="Repeat every (days, 0 = no repeat)">
                <input
                  type="number"
                  className="kf-input"
                  placeholder="e.g. 14"
                  value={schBoosterDays}
                  onChange={(e) => setSchBoosterDays(e.target.value)}
                />
              </Field>
            </div>
            <div className="kf-form-actions">
              <Button type="submit" variant="primary" loading={saving}>
                <span>{saving ? "Saving…" : "Save timetable"}</span>
              </Button>
            </div>
          </form>
        </Panel>
      )}

      {/* ── ADD TAB ── */}
      {activeTab === "add" && (
        <Panel title={editingId ? "Edit vaccination record" : "Record a vaccination event"}>
          <form onSubmit={handleSaveVaccination} className="kf-form">
            <div className="kf-form-grid">
              <Field label="Species" required>
                <select
                  className="kf-input"
                  value={species}
                  onChange={(e) => setSpecies(e.target.value as "poultry" | "cattle")}
                >
                  <option value="poultry">Poultry</option>
                  <option value="cattle">Cattle</option>
                </select>
              </Field>
              <Field label="Animal or group name" required>
                <input
                  type="text"
                  className="kf-input"
                  placeholder={species === "poultry" ? "e.g. Broiler Batch A" : "e.g. Baraka, Dairy Herd"}
                  value={targetName}
                  onChange={(e) => setTargetName(e.target.value)}
                  required
                />
              </Field>
              <Field label="Vaccine Name" required>
                <input
                  type="text"
                  className="kf-input"
                  placeholder="e.g. Gumboro, Newcastle, ECF"
                  value={vaccineName}
                  onChange={(e) => setVaccineName(e.target.value)}
                  required
                />
              </Field>
              <Field label="Disease it protects against (optional)">
                <input
                  type="text"
                  className="kf-input"
                  placeholder="e.g. Infectious Bursal Disease"
                  value={disease}
                  onChange={(e) => setDisease(e.target.value)}
                />
              </Field>
              <Field label="Date to give the vaccine" required>
                <input
                  type="date"
                  className="kf-input"
                  value={dateDue}
                  onChange={(e) => setDateDue(e.target.value)}
                  required
                />
              </Field>
              <Field label="Date given (if already done)">
                <input
                  type="date"
                  className="kf-input"
                  value={dateAdministered}
                  onChange={(e) => setDateAdministered(e.target.value)}
                />
              </Field>
              <Field label="How it is given (e.g. eye drop, injection)">
                <input
                  type="text"
                  className="kf-input"
                  placeholder="e.g. Eye drop, Drinking water"
                  value={dose}
                  onChange={(e) => setDose(e.target.value)}
                />
              </Field>
              <Field label="Number of animals vaccinated">
                <input
                  type="number"
                  className="kf-input"
                  min={0}
                  value={countVaccinated}
                  onChange={(e) => setCountVaccinated(Number(e.target.value))}
                />
              </Field>
              <Field label="Given by (e.g. vet, farm worker)">
                <input
                  type="text"
                  className="kf-input"
                  placeholder="e.g. Farm Vet, Dr. Mwangi"
                  value={administeredBy}
                  onChange={(e) => setAdministeredBy(e.target.value)}
                />
              </Field>
              <Field label="Status" required>
                <select
                  className="kf-input"
                  value={vacStatus}
                  onChange={(e) => setVacStatus(e.target.value as VaccinationRecord["status"])}
                >
                  <option value="scheduled">Scheduled</option>
                  <option value="due">Due</option>
                  <option value="completed">Completed</option>
                  <option value="overdue">Overdue</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </Field>
              <Field label="Notes" className="kf-field--span2">
                <textarea
                  className="kf-input"
                  placeholder="e.g. Check temperature before administering"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                />
              </Field>
            </div>
            <div className="kf-form-actions">
              {editingId && (
                <Button variant="secondary" type="button" onClick={resetVaccinationForm}>
                  Cancel Edit
                </Button>
              )}
              <Button type="submit" variant="primary" loading={saving}>
                <span>
                  {saving
                    ? "Saving…"
                    : editingId
                    ? "Update Vaccination"
                    : "Save vaccination"}
                </span>
              </Button>
            </div>
          </form>
        </Panel>
      )}

      {/* Mark Done Modal */}
      <Modal
        open={!!markDoneId}
        onClose={() => { setMarkDoneId(null); setMarkDoneError(""); }}
        title="Record vaccination given"
        subtitle={markingRec ? `${markingRec.targetName} — ${markingRec.vaccineName}` : undefined}
        size="sm"
        footer={
          <div className="kf-modal-footer-actions">
            <Button variant="secondary" onClick={() => { setMarkDoneId(null); setMarkDoneError(""); }}>
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={markDoneSubmitting}
              onClick={(e) => handleMarkDone(e as unknown as React.FormEvent)}
            >
              <span>{markDoneSubmitting ? "Saving…" : "Save"}</span>
            </Button>
          </div>
        }
      >
        <form onSubmit={handleMarkDone} id="mark-done-form" className="kf-form">
          {markDoneError && <ErrorBanner message={markDoneError} />}
          <Field label="Date given" required>
            <input
              type="date"
              className="kf-input"
              value={markDoneDate}
              max={todayStr}
              onChange={(e) => setMarkDoneDate(e.target.value)}
              required
            />
          </Field>
          <Field label="Number of animals vaccinated">
            <input
              type="number"
              className="kf-input"
              min={0}
              value={markDoneCount}
              onChange={(e) => setMarkDoneCount(Number(e.target.value))}
            />
          </Field>
        </form>
      </Modal>
    </main>
  );
}
