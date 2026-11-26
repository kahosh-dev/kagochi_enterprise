import { useEffect, useState, useMemo } from "react";
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
  loadVaccines,
  addVaccine,
  updateVaccine,
  deleteVaccine,
} from "../services/storage";
import type {
  VaccinationRecord,
  VaccinationSchedule,
  PoultryBatch,
  LivestockAnimal,
  Vaccine,
} from "../types/farm";
import {
  Syringe,
  Trash2,
  CheckCircle2,
  Plus,
  Pencil,
  Settings,
  Eye,
  EyeOff,
  AlertTriangle,
} from "lucide-react";
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
import { SearchableSelect } from "../components/SearchableSelect";
import { usePeriod } from "../context/PeriodContext";

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
  if (status === "completed") return "Done";
  if (status === "overdue") return "Overdue";
  if (status === "due_today" || status === "due") return "Due Today";
  if (status === "upcoming" || status === "scheduled") return "Scheduled";
  if (status === "cancelled") return "Cancelled";
  return status;
}

// A table component for a vaccination group
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
                    <th>Given By</th>
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
                      <td>{v.administeredBy || "—"}</td>
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
  const [poultry, setPoultry] = useState<PoultryBatch[]>([]);
  const [animals, setAnimals] = useState<LivestockAnimal[]>([]);
  const [vaccines, setVaccines] = useState<Vaccine[]>([]);
  const [_loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const { todayStr, periodInfo } = usePeriod();

  // Vaccination form state
  const [species, setSpecies] = useState<"poultry" | "cattle">("poultry");
  const [selectedTargetId, setSelectedTargetId] = useState("");
  const [targetName, setTargetName] = useState("");
  const [customTargetName, setCustomTargetName] = useState("");
  const [selectedVaccineId, setSelectedVaccineId] = useState("");
  const [vaccineName, setVaccineName] = useState("");
  const [customVaccineName, setCustomVaccineName] = useState("");
  const [disease, setDisease] = useState("");
  const [dateDue, setDateDue] = useState(todayStr);
  const [dateAdministered, setDateAdministered] = useState("");
  const [dose, setDose] = useState("");
  const [countVaccinated, setCountVaccinated] = useState(0);
  const [selectedAdminBy, setSelectedAdminBy] = useState("Farm Vet");
  const [customAdminBy, setCustomAdminBy] = useState("");
  const [vacStatus, setVacStatus] = useState<"scheduled" | "completed">("scheduled");
  const [notes, setNotes] = useState("");

  // Schedule form state
  const [schSpecies, setSchSpecies] = useState<"poultry" | "cattle">("poultry");
  const [schCategory, setSchCategory] = useState("chicks");
  const [schVaccine, setSchVaccine] = useState("");
  const [schDisease, setSchDisease] = useState("");
  const [schAgeDays, setSchAgeDays] = useState("7");
  const [schBoosterDays, setSchBoosterDays] = useState("14");

  // Vaccine settings modal state
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsSpecies, setSettingsSpecies] = useState<"poultry" | "cattle">("poultry");
  const [isAddingVaccine, setIsAddingVaccine] = useState(false);
  const [newVacName, setNewVacName] = useState("");
  const [newVacDisease, setNewVacDisease] = useState("");
  const [newVacMethod, setNewVacMethod] = useState("");
  const [newVacNotes, setNewVacNotes] = useState("");
  const [editingVacId, setEditingVacId] = useState<string | null>(null);

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Mark Done modal
  const [markDoneId, setMarkDoneId] = useState<string | null>(null);
  const [markDoneDate, setMarkDoneDate] = useState(todayStr);
  const [markDoneCount, setMarkDoneCount] = useState(0);
  const [markDoneSubmitting, setMarkDoneSubmitting] = useState(false);
  const [markDoneError, setMarkDoneError] = useState("");

  async function refreshData() {
    try {
      setLoading(true);
      const [vData, sData, pData, aData, vacData] = await Promise.all([
        loadVaccinations(),
        loadVaccinationSchedules(),
        loadPoultry(),
        loadLivestock(),
        loadVaccines(),
      ]);
      setVaccinations(vData);
      setSchedules(sData);
      setPoultry(pData);
      setAnimals(aData);
      setVaccines(vacData);
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to load vaccination data.");
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

  // Derive date for active animal filter
  const effectiveRecordDate = vacStatus === "completed" ? (dateAdministered || todayStr) : (dateDue || todayStr);

  // Filter active animals/flocks of chosen species on effectiveRecordDate
  const animalOptions = useMemo(() => {
    if (species === "cattle") {
      const activeCattle = animals.filter((a) => {
        if (a.status !== "active") return false;
        const addDate = a.dateAdded ? a.dateAdded.slice(0, 10) : "";
        const dob = a.dateOfBirth ? a.dateOfBirth.slice(0, 10) : "";
        if (addDate && addDate > effectiveRecordDate) return false;
        if (dob && dob > effectiveRecordDate) return false;
        return true;
      });

      return activeCattle.map((a) => ({
        value: a.id,
        label: a.tagNumber ? `${a.name} (#${a.tagNumber})` : a.name,
        sublabel: `${a.breed || "Cattle"} • ${a.category || "Cow"}${a.tagNumber ? ` • Tag: ${a.tagNumber}` : ""}`,
        badge: a.category || "Cattle",
      }));
    } else {
      const activeBatches = poultry.filter((b) => {
        if (b.currentCount <= 0) return false;
        const addDate = b.dateAdded ? b.dateAdded.slice(0, 10) : "";
        const hatch = b.hatchDate ? b.hatchDate.slice(0, 10) : "";
        if (addDate && addDate > effectiveRecordDate) return false;
        if (hatch && hatch > effectiveRecordDate) return false;
        return true;
      });

      return activeBatches.map((b) => ({
        value: b.id,
        label: `${b.breed} Flock (${b.currentCount} birds)`,
        sublabel: `${b.purpose || "Poultry"} • ${b.stage || "Batch"} • ${b.currentCount} live birds`,
        badge: `${b.currentCount} birds`,
      }));
    }
  }, [species, animals, poultry, effectiveRecordDate]);

  // Filter active vaccines for chosen species
  const vaccineOptions = useMemo(() => {
    return vaccines
      .filter((v) => v.species === species && v.isActive)
      .map((v) => ({
        value: v.id,
        label: v.name,
        sublabel: `Protects against: ${v.disease} • Method: ${v.defaultMethod}`,
        badge: v.species === "poultry" ? "Poultry" : "Cattle",
      }));
  }, [vaccines, species]);

  // Previously used administrators
  const administratorOptions = useMemo(() => {
    const historical = Array.from(
      new Set(vaccinations.map((v) => v.administeredBy?.trim()).filter(Boolean))
    ) as string[];
    const defaults = ["Farm Vet", "Farm Worker", "Dr. Mwangi (Vet)", "Self / Farmer"];
    const combined = Array.from(new Set([...defaults, ...historical]));
    return combined.map((name) => ({
      value: name,
      label: name,
    }));
  }, [vaccinations]);

  // Reset form when species changes
  function handleSpeciesChange(newSpecies: "poultry" | "cattle") {
    setSpecies(newSpecies);
    setSelectedTargetId("");
    setTargetName("");
    setCustomTargetName("");
    setSelectedVaccineId("");
    setVaccineName("");
    setCustomVaccineName("");
    setDisease("");
    setDose("");
    setCountVaccinated(0);
  }

  // Handle animal/group selection
  function handleTargetSelect(val: string) {
    setSelectedTargetId(val);
    if (val === "__custom__") {
      setTargetName(customTargetName);
    } else {
      if (species === "cattle") {
        const selected = animals.find((a) => a.id === val);
        if (selected) {
          const display = selected.tagNumber
            ? `${selected.name} (#${selected.tagNumber})`
            : selected.name;
          setTargetName(display);
          setCountVaccinated(1);
        }
      } else {
        const selected = poultry.find((b) => b.id === val);
        if (selected) {
          setTargetName(`${selected.breed} Flock`);
          setCountVaccinated(selected.currentCount);
        }
      }
    }
  }

  // Handle vaccine selection
  function handleVaccineSelect(val: string) {
    setSelectedVaccineId(val);
    if (val === "__custom__") {
      setVaccineName(customVaccineName);
    } else {
      const selected = vaccines.find((v) => v.id === val);
      if (selected) {
        setVaccineName(selected.name);
        setDisease(selected.disease);
        setDose(selected.defaultMethod);
      }
    }
  }

  // Handle administrator selection
  function handleAdminSelect(val: string) {
    setSelectedAdminBy(val);
  }

  function resetVaccinationForm() {
    setEditingId(null);
    setSpecies("poultry");
    setSelectedTargetId("");
    setTargetName("");
    setCustomTargetName("");
    setSelectedVaccineId("");
    setVaccineName("");
    setCustomVaccineName("");
    setDisease("");
    setDateDue(todayStr);
    setDateAdministered("");
    setDose("");
    setCountVaccinated(0);
    setSelectedAdminBy("Farm Vet");
    setCustomAdminBy("");
    setVacStatus("scheduled");
    setNotes("");
    setErrorMsg("");
  }

  function startEdit(v: VaccinationRecord) {
    const sp = v.species.toLowerCase() === "cattle" ? "cattle" : "poultry";
    setEditingId(v.id);
    setSpecies(sp);

    // Check if target is an existing animal or flock
    if (v.targetId && v.targetId !== "custom") {
      setSelectedTargetId(v.targetId);
      setTargetName(v.targetName);
    } else {
      setSelectedTargetId("__custom__");
      setCustomTargetName(v.targetName);
      setTargetName(v.targetName);
    }

    // Check if vaccine matches reference table
    const matchedVac = vaccines.find((vac) => vac.species === sp && vac.name === v.vaccineName);
    if (matchedVac) {
      setSelectedVaccineId(matchedVac.id);
      setVaccineName(v.vaccineName);
    } else {
      setSelectedVaccineId("__custom__");
      setCustomVaccineName(v.vaccineName);
      setVaccineName(v.vaccineName);
    }

    setDisease(v.disease || "");
    setDateDue(v.dateDue ? v.dateDue.slice(0, 10) : todayStr);
    setDateAdministered(v.dateAdministered ? v.dateAdministered.slice(0, 10) : "");
    setDose(v.dose || "");
    setCountVaccinated(v.countVaccinated ?? 0);

    const adminVal = v.administeredBy?.trim() || "Farm Vet";
    if (["Farm Vet", "Farm Worker", "Dr. Mwangi (Vet)", "Self / Farmer"].includes(adminVal)) {
      setSelectedAdminBy(adminVal);
    } else {
      setSelectedAdminBy("__custom__");
      setCustomAdminBy(adminVal);
    }

    setVacStatus(v.status === "completed" ? "completed" : "scheduled");
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

    const resolvedTargetName = selectedTargetId === "__custom__" ? customTargetName.trim() : targetName.trim();
    if (!resolvedTargetName) {
      setErrorMsg("Please select or type the animal or flock name.");
      return;
    }

    const resolvedVaccineName = selectedVaccineId === "__custom__" ? customVaccineName.trim() : vaccineName.trim();
    if (!resolvedVaccineName) {
      setErrorMsg("Please select or type the vaccine name.");
      return;
    }

    if (!dateDue) {
      setErrorMsg("Please select the date to give the vaccine.");
      return;
    }

    if (vacStatus === "completed" && !dateAdministered) {
      setErrorMsg("Date given is required when status is Done.");
      return;
    }

    const resolvedAdminBy = selectedAdminBy === "__custom__" ? customAdminBy.trim() || "Farm Vet" : selectedAdminBy;

    try {
      setSaving(true);
      const record = {
        species,
        targetType: species === "poultry" ? "batch" : "animal",
        targetId: selectedTargetId === "__custom__" ? "custom" : (selectedTargetId || "custom"),
        targetName: resolvedTargetName,
        vaccineName: resolvedVaccineName,
        disease: disease.trim() || "Preventative",
        dateDue: dateDue.slice(0, 10),
        dateAdministered: vacStatus === "completed" ? (dateAdministered || todayStr).slice(0, 10) : "",
        dose: dose.trim(),
        administeredBy: resolvedAdminBy,
        status: vacStatus,
        countVaccinated: Math.max(0, Math.floor(Number(countVaccinated) || 0)),
        notes: notes.trim(),
      };

      if (editingId) {
        await updateVaccination(editingId, record);
        setSuccessMsg(`Vaccination record updated: ${resolvedVaccineName} (${species}).`);
      } else {
        await addVaccination(record);
        setSuccessMsg(`Vaccination record saved: ${resolvedVaccineName} (${species}).`);
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
      setSuccessMsg(`Added timetable rule for ${schVaccine}.`);
      setSchVaccine("");
      setSchDisease("");
      await refreshData();
    } catch (err) {
      setErrorMsg("Failed to add timetable rule.");
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

  // Vaccine reference table settings actions
  async function handleToggleVaccineActive(vac: Vaccine) {
    try {
      await updateVaccine(vac.id, { isActive: !vac.isActive });
      await refreshData();
    } catch (err) {
      setErrorMsg("Failed to update vaccine status.");
    }
  }

  async function handleSaveNewVaccine(e: React.FormEvent) {
    e.preventDefault();
    if (!newVacName.trim()) return;
    try {
      if (editingVacId) {
        await updateVaccine(editingVacId, {
          name: newVacName.trim(),
          disease: newVacDisease.trim(),
          defaultMethod: newVacMethod.trim(),
          notes: newVacNotes.trim(),
        });
        setSuccessMsg(`Vaccine updated: ${newVacName}`);
      } else {
        await addVaccine({
          species: settingsSpecies,
          name: newVacName.trim(),
          disease: newVacDisease.trim(),
          defaultMethod: newVacMethod.trim(),
          notes: newVacNotes.trim(),
          isActive: true,
        });
        setSuccessMsg(`Vaccine added: ${newVacName}`);
      }
      setNewVacName("");
      setNewVacDisease("");
      setNewVacMethod("");
      setNewVacNotes("");
      setIsAddingVaccine(false);
      setEditingVacId(null);
      await refreshData();
    } catch (err) {
      setErrorMsg("Failed to save vaccine.");
    }
  }

  async function handleDeleteCustomVaccine(id: string) {
    try {
      await deleteVaccine(id);
      await refreshData();
    } catch (err) {
      setErrorMsg("Failed to delete vaccine.");
    }
  }

  const markingRec = markDoneId ? vaccinations.find((r) => r.id === markDoneId) : null;

  return (
    <main className="kf-page">
      <PageHeader
        title="Vaccinations"
        description="Track vaccination schedules, record when vaccines are given, and view upcoming reminders for your animals."
        actions={
          <Button
            variant="secondary"
            icon={<Settings size={15} />}
            onClick={() => setShowSettingsModal(true)}
          >
            Vaccine Settings
          </Button>
        }
      />

      {/* Prominent Vet Guidance Alert */}
      <div style={{ marginBottom: "1rem" }}>
        <Notice tone="info">
          <strong>Veterinary Guidance:</strong> Vaccination schedules, doses, and administration methods should always be confirmed with a qualified veterinarian.
        </Notice>
      </div>

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
          label="Done"
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
            label: editingId ? "Edit Vaccine" : "Record a vaccination event",
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
        <Panel title="Vaccination reminders" subtitle={`Grouped by status · ${periodInfo.label}`}>
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
            title="Done"
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
                  <option value="growers">Growers</option>
                  <option value="layers">Layers</option>
                  <option value="broilers">Broilers</option>
                  <option value="calves">Calves</option>
                  <option value="weaners">Weaners / Heifers</option>
                  <option value="cows">Cows / Bulls</option>
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

      {/* ── ADD / RECORD TAB ── */}
      {activeTab === "add" && (
        <Panel
          title={editingId ? "Edit vaccination record" : "Record a vaccination event"}
          subtitle="Record scheduled or completed vaccinations with active farm animals and reference vaccines."
        >
          <form onSubmit={handleSaveVaccination} className="kf-form">
            <div className="kf-form-grid">
              {/* 1. Species Dropdown */}
              <Field label="Species" required hint="Changing species resets the animal and vaccine selections">
                <select
                  className="kf-input"
                  value={species}
                  onChange={(e) => handleSpeciesChange(e.target.value as "poultry" | "cattle")}
                >
                  <option value="poultry">Poultry</option>
                  <option value="cattle">Cattle</option>
                </select>
              </Field>

              {/* 2. Animal or Group Dropdown (Searchable, Active on date) */}
              <SearchableSelect
                label="Animal or group name"
                required
                options={animalOptions}
                value={selectedTargetId}
                onChange={handleTargetSelect}
                placeholder={
                  animalOptions.length === 0
                    ? `No active ${species} found on this date`
                    : species === "cattle"
                    ? "-- Select active cattle animal --"
                    : "-- Select active poultry flock --"
                }
                searchPlaceholder={species === "cattle" ? "Search tag, name, breed..." : "Search flock breed, count..."}
                allowCustom
                customOptionLabel="Other / type manually"
                customValue={customTargetName}
                onCustomChange={(val) => {
                  setCustomTargetName(val);
                  setTargetName(val);
                }}
                customPlaceholder={species === "cattle" ? "e.g. General Herd, Daisy" : "e.g. Kienyeji Growers Batch"}
                hint={`Showing ${animalOptions.length} active ${species} on ${effectiveRecordDate}. Selecting one auto-fills the animal count.`}
              />

              {/* 3. Vaccine Name Dropdown (Filtered by species from reference table) */}
              <SearchableSelect
                label="Vaccine name"
                required
                options={vaccineOptions}
                value={selectedVaccineId}
                onChange={handleVaccineSelect}
                placeholder={`-- Select ${species} vaccine --`}
                searchPlaceholder="Search vaccine name or disease..."
                allowCustom
                customOptionLabel="Other (type your own)"
                customValue={customVaccineName}
                onCustomChange={(val) => {
                  setCustomVaccineName(val);
                  setVaccineName(val);
                }}
                customPlaceholder="Enter custom vaccine name"
                hint="Selecting a vaccine auto-fills the disease and suggests the administration method."
              />

              {/* Disease (Auto-filled & Editable) */}
              <Field label="Disease it protects against" hint="Auto-filled from reference table, editable">
                <input
                  type="text"
                  className="kf-input"
                  placeholder="e.g. Newcastle, Gumboro, FMD, Anthrax"
                  value={disease}
                  onChange={(e) => setDisease(e.target.value)}
                />
              </Field>

              {/* Administration method (Suggested & Editable) */}
              <Field label="How it is given" hint="Suggested administration method, editable">
                <input
                  type="text"
                  className="kf-input"
                  placeholder="e.g. Eye drop, Drinking water, Injection, Wing-web stab"
                  value={dose}
                  onChange={(e) => setDose(e.target.value)}
                />
              </Field>

              {/* Number of animals vaccinated */}
              <Field label="Number of animals vaccinated" hint="Auto-filled with group size, editable">
                <input
                  type="number"
                  className="kf-input"
                  min={0}
                  value={countVaccinated}
                  onChange={(e) => setCountVaccinated(Number(e.target.value))}
                />
              </Field>

              {/* 4. Given by (Dropdown of previously used names + type new) */}
              <SearchableSelect
                label="Given by"
                required
                options={administratorOptions}
                value={selectedAdminBy}
                onChange={handleAdminSelect}
                placeholder="-- Select administrator --"
                searchPlaceholder="Search or pick administrator..."
                allowCustom
                customOptionLabel="+ Type new name..."
                customValue={customAdminBy}
                onCustomChange={(val) => setCustomAdminBy(val)}
                customPlaceholder="e.g. Dr. Kamau (Vet), Mary (Worker)"
                hint="Select a previously used name or type a new one."
              />

              {/* 5. Status: Scheduled / Done */}
              <Field label="Status" required>
                <select
                  className="kf-input"
                  value={vacStatus}
                  onChange={(e) => {
                    const newStatus = e.target.value as "scheduled" | "completed";
                    setVacStatus(newStatus);
                    if (newStatus === "completed" && !dateAdministered) {
                      setDateAdministered(todayStr);
                    }
                  }}
                >
                  <option value="scheduled">Scheduled</option>
                  <option value="completed">Done</option>
                </select>
              </Field>

              {/* Date to give the vaccine */}
              <Field label="Date to give the vaccine" required>
                <input
                  type="date"
                  className="kf-input"
                  value={dateDue}
                  onChange={(e) => setDateDue(e.target.value)}
                  required
                />
              </Field>

              {/* Date given (Required if Done) */}
              <Field
                label={vacStatus === "completed" ? "Date given (Required for Done)" : "Date given (if already done)"}
                required={vacStatus === "completed"}
                hint={vacStatus === "completed" ? "Defaults to today" : "Leave blank if scheduled for future"}
              >
                <input
                  type="date"
                  className="kf-input"
                  value={dateAdministered}
                  max={todayStr}
                  onChange={(e) => setDateAdministered(e.target.value)}
                  required={vacStatus === "completed"}
                />
              </Field>

              {/* Notes */}
              <Field label="Notes" className="kf-field--span2">
                <textarea
                  className="kf-input"
                  placeholder="e.g. Confirm batch expiration date and booster timing with vet"
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

      {/* ── MARK DONE MODAL ── */}
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

      {/* ── VACCINE REFERENCE SETTINGS MODAL ── */}
      <Modal
        open={showSettingsModal}
        onClose={() => {
          setShowSettingsModal(false);
          setIsAddingVaccine(false);
          setEditingVacId(null);
        }}
        title="Vaccine Reference Settings"
        subtitle="Manage available vaccines, methods, and hide or activate vaccines for your farm."
        size="lg"
        footer={
          <div className="kf-modal-footer-actions">
            <Button
              variant="secondary"
              onClick={() => {
                setShowSettingsModal(false);
                setIsAddingVaccine(false);
                setEditingVacId(null);
              }}
            >
              Close
            </Button>
          </div>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
            <Segmented
              label="Vaccine species filter"
              options={[
                { value: "poultry", label: "Poultry Vaccines" },
                { value: "cattle", label: "Cattle Vaccines" },
              ]}
              value={settingsSpecies}
              onChange={(val) => setSettingsSpecies(val as "poultry" | "cattle")}
            />

            {!isAddingVaccine && (
              <Button
                variant="primary"
                size="sm"
                icon={<Plus size={14} />}
                onClick={() => {
                  setIsAddingVaccine(true);
                  setEditingVacId(null);
                  setNewVacName("");
                  setNewVacDisease("");
                  setNewVacMethod("");
                  setNewVacNotes("");
                }}
              >
                Add Custom Vaccine
              </Button>
            )}
          </div>

          {/* Add / Edit Vaccine Inline Form */}
          {isAddingVaccine && (
            <div
              style={{
                background: "rgba(147, 51, 234, 0.05)",
                border: "1px solid var(--kf-border, rgba(147, 51, 234, 0.2))",
                borderRadius: "8px",
                padding: "16px",
              }}
            >
              <h4 style={{ margin: "0 0 12px 0", fontSize: "14px", fontWeight: 600 }}>
                {editingVacId ? "Edit Vaccine" : `Add New ${settingsSpecies === "poultry" ? "Poultry" : "Cattle"} Vaccine`}
              </h4>
              <form onSubmit={handleSaveNewVaccine} className="kf-form">
                <div className="kf-form-grid">
                  <Field label="Vaccine Name" required>
                    <input
                      type="text"
                      className="kf-input"
                      placeholder="e.g. Newcastle I-2 Thermostable"
                      value={newVacName}
                      onChange={(e) => setNewVacName(e.target.value)}
                      required
                    />
                  </Field>
                  <Field label="Disease it protects against" required>
                    <input
                      type="text"
                      className="kf-input"
                      placeholder="e.g. Newcastle Disease"
                      value={newVacDisease}
                      onChange={(e) => setNewVacDisease(e.target.value)}
                      required
                    />
                  </Field>
                  <Field label="Default administration method" required>
                    <input
                      type="text"
                      className="kf-input"
                      placeholder="e.g. Eye drop, Drinking water, Injection"
                      value={newVacMethod}
                      onChange={(e) => setNewVacMethod(e.target.value)}
                      required
                    />
                  </Field>
                  <Field label="Notes / precautions">
                    <input
                      type="text"
                      className="kf-input"
                      placeholder="e.g. Administer by qualified vet"
                      value={newVacNotes}
                      onChange={(e) => setNewVacNotes(e.target.value)}
                    />
                  </Field>
                </div>
                <div className="kf-form-actions" style={{ marginTop: "12px" }}>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setIsAddingVaccine(false);
                      setEditingVacId(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" size="sm">
                    {editingVacId ? "Update Vaccine" : "Save Vaccine"}
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Vaccines Table */}
          <div className="kf-table-wrap">
            <table className="kf-table">
              <thead>
                <tr>
                  <th>Vaccine Name</th>
                  <th>Disease</th>
                  <th>Default Method</th>
                  <th>Status</th>
                  <th>Notes</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {vaccines
                  .filter((v) => v.species === settingsSpecies)
                  .map((vac) => (
                    <tr key={vac.id} style={{ opacity: vac.isActive ? 1 : 0.6 }}>
                      <td>
                        <strong>{vac.name}</strong>
                      </td>
                      <td>{vac.disease}</td>
                      <td>{vac.defaultMethod}</td>
                      <td>
                        <Badge tone={vac.isActive ? "green" : "slate"}>
                          {vac.isActive ? "Active" : "Hidden"}
                        </Badge>
                      </td>
                      <td style={{ fontSize: "12px", color: "var(--kf-muted)" }}>
                        {vac.notes || "—"}
                      </td>
                      <td>
                        <div className="kf-row-actions">
                          <Button
                            variant="soft"
                            size="sm"
                            icon={vac.isActive ? <EyeOff size={13} /> : <Eye size={13} />}
                            onClick={() => handleToggleVaccineActive(vac)}
                            title={vac.isActive ? "Hide from dropdowns" : "Make active in dropdowns"}
                          >
                            {vac.isActive ? "Hide" : "Show"}
                          </Button>
                          <IconButton
                            label="Edit"
                            icon={<Pencil size={14} />}
                            onClick={() => {
                              setIsAddingVaccine(true);
                              setEditingVacId(vac.id);
                              setNewVacName(vac.name);
                              setNewVacDisease(vac.disease);
                              setNewVacMethod(vac.defaultMethod);
                              setNewVacNotes(vac.notes || "");
                            }}
                          />
                          <IconButton
                            label="Delete"
                            icon={<Trash2 size={14} />}
                            tone="danger"
                            onClick={() => handleDeleteCustomVaccine(vac.id)}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          <div style={{ fontSize: "12.5px", color: "var(--kf-muted)", display: "flex", alignItems: "center", gap: "6px" }}>
            <AlertTriangle size={14} />
            <span>Hiding a vaccine removes it from the recording dropdowns while preserving all existing historical records.</span>
          </div>
        </div>
      </Modal>
    </main>
  );
}
