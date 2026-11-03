import { useEffect, useState } from "react";
import type { VaccinationRecord } from "../types/farm";
import type { PoultryBatch, LivestockAnimal } from "../types/farm";
import {
  loadVaccinations,
  addVaccination,
  updateVaccination,
  deleteVaccination,
  loadPoultry,
  loadLivestock,
} from "../services/storage";

function getDisplayStatus(rec: VaccinationRecord): { label: string; style: React.CSSProperties } {
  if (rec.status === 'completed')  return { label: 'Completed', style: { background: '#d1fae5', color: '#065f46', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem' } };
  if (rec.status === 'cancelled')  return { label: 'Cancelled', style: { background: '#f3f4f6', color: '#6b7280', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem' } };
  const today = new Date().toISOString().slice(0, 10);
  if (rec.dateDue < today)  return { label: 'Overdue',   style: { background: '#fee2e2', color: '#991b1b', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem' } };
  if (rec.dateDue === today) return { label: 'Due Today', style: { background: '#fef9c3', color: '#92400e', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem' } };
  return { label: 'Upcoming', style: { background: '#d1fae5', color: '#065f46', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem' } };
}

function VaccinationsView() {
  const [tab, setTab] = useState<"schedule" | "history">("schedule");
  const [records, setRecords] = useState<VaccinationRecord[]>([]);
  const [poultryBatches, setPoultryBatches] = useState<PoultryBatch[]>([]);
  const [livestock, setLivestock] = useState<LivestockAnimal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Form
  const [showForm, setShowForm] = useState(false);
  const [formSpecies, setFormSpecies] = useState<"poultry" | "cattle">("poultry");
  const [formTargetId, setFormTargetId] = useState("");
  const [formTargetName, setFormTargetName] = useState("");
  const [formVaccineName, setFormVaccineName] = useState("");
  const [formDateDue, setFormDateDue] = useState("");
  const [formCountVaccinated, setFormCountVaccinated] = useState(0);
  const [formNotes, setFormNotes] = useState("");
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Mark Done modal state
  const [markDoneId, setMarkDoneId] = useState<string | null>(null);
  const [markDoneDate, setMarkDoneDate] = useState(new Date().toISOString().slice(0, 10));
  const [markDoneCount, setMarkDoneCount] = useState(0);
  const [markDoneSubmitting, setMarkDoneSubmitting] = useState(false);
  const [markDoneError, setMarkDoneError] = useState("");

  async function refresh() {
    try {
      setLoading(true);
      const [recs, poultry, ls] = await Promise.all([
        loadVaccinations(),
        loadPoultry(),
        loadLivestock(),
      ]);
      setRecords(recs);
      setPoultryBatches(poultry);
      setLivestock(ls);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load vaccinations.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, []);

  function handleTargetChange(targetId: string) {
    setFormTargetId(targetId);
    if (formSpecies === "poultry") {
      const batch = poultryBatches.find((b) => b.id === targetId);
      setFormTargetName(batch ? `${batch.breed} (${batch.purpose})` : "");
    } else {
      const animal = livestock.find((l) => l.id === targetId);
      setFormTargetName(animal ? animal.name : "");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!formTargetName.trim()) { setFormError("Please enter or select a target name."); return; }
    if (!formVaccineName.trim()) { setFormError("Please enter the vaccine name."); return; }
    if (!formDateDue) { setFormError("Please enter a due date."); return; }

    try {
      setFormSubmitting(true);
      await addVaccination({
        species:         formSpecies,
        targetId:        formTargetId,
        targetName:      formTargetName,
        vaccineName:     formVaccineName,
        dateDue:         formDateDue,
        dateAdministered: null,
        status:          "upcoming",
        countVaccinated:  formCountVaccinated,
        notes:           formNotes,
      });
      setShowForm(false);
      setFormTargetId(""); setFormTargetName(""); setFormVaccineName("");
      setFormDateDue(""); setFormCountVaccinated(0); setFormNotes("");
      await refresh();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Failed to save vaccination.");
    } finally {
      setFormSubmitting(false);
    }
  }

  async function handleMarkDone(e: React.FormEvent) {
    e.preventDefault();
    if (!markDoneId) return;
    setMarkDoneError("");
    const rec = records.find((r) => r.id === markDoneId);
    if (!rec) return;
    try {
      setMarkDoneSubmitting(true);
      await updateVaccination(markDoneId, {
        ...rec,
        status:          "completed",
        dateAdministered: markDoneDate,
        countVaccinated: markDoneCount,
      });
      setMarkDoneId(null);
      await refresh();
    } catch (e) {
      setMarkDoneError(e instanceof Error ? e.message : "Failed to mark as done.");
    } finally {
      setMarkDoneSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this vaccination record?")) return;
    try {
      await deleteVaccination(id);
      await refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to delete.");
    }
  }

  const scheduled = records.filter((r) => r.status !== 'completed' && r.status !== 'cancelled');
  const history   = records.filter((r) => r.status === 'completed')
    .sort((a, b) => (b.dateAdministered ?? '').localeCompare(a.dateAdministered ?? ''));

  if (loading) return <div className="management-page"><p>Loading vaccinations…</p></div>;
  if (error)   return <div className="management-page"><p style={{ color: 'red' }}>{error}</p></div>;

  const markingRec = markDoneId ? records.find((r) => r.id === markDoneId) : null;

  return (
    <div className="management-page">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2>Vaccinations</h2>
          <p style={{ color: '#64748b', margin: 0 }}>Schedule and track animal vaccinations.</p>
        </div>
        <button className="primary-action" onClick={() => { setShowForm(!showForm); setFormError(""); }}>
          {showForm ? "Cancel" : "+ Schedule Vaccination"}
        </button>
      </div>

      {/* Tab bar */}
      <div className="dashboard-filter-bar" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
        <button
          className={`filter-chip ${tab === 'schedule' ? 'filter-chip-active' : ''}`}
          style={{ fontWeight: tab === 'schedule' ? 700 : 400 }}
          onClick={() => setTab('schedule')}
        >
          Schedule ({scheduled.length})
        </button>
        <button
          className={`filter-chip ${tab === 'history' ? 'filter-chip-active' : ''}`}
          style={{ fontWeight: tab === 'history' ? 700 : 400 }}
          onClick={() => setTab('history')}
        >
          History ({history.length})
        </button>
      </div>

      {/* Schedule Vaccination Form */}
      {showForm && (
        <div className="management-card" style={{ marginBottom: '1.5rem' }}>
          <h3 className="card-heading">Schedule a Vaccination</h3>
          {formError && (
            <div style={{ color: '#dc2626', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '6px', padding: '0.75rem', marginBottom: '1rem' }}>
              {formError}
            </div>
          )}
          <form onSubmit={handleSubmit} className="form-grid">
            <div className="form-field">
              <label>Species</label>
              <select value={formSpecies} onChange={(e) => { setFormSpecies(e.target.value as any); setFormTargetId(""); setFormTargetName(""); }}>
                <option value="poultry">Poultry</option>
                <option value="cattle">Livestock (Cattle)</option>
              </select>
            </div>
            <div className="form-field">
              <label>Animal / Batch</label>
              <select value={formTargetId} onChange={(e) => handleTargetChange(e.target.value)}>
                <option value="">-- Select or type name below --</option>
                {formSpecies === "poultry"
                  ? poultryBatches.map((b) => (
                      <option key={b.id} value={b.id}>{b.breed} — {b.purpose}</option>
                    ))
                  : livestock.map((l) => (
                      <option key={l.id} value={l.id}>{l.name} ({l.type})</option>
                    ))
                }
              </select>
            </div>
            <div className="form-field">
              <label>Name / Label</label>
              <input
                type="text"
                value={formTargetName}
                onChange={(e) => setFormTargetName(e.target.value)}
                placeholder="e.g. Broiler Batch A"
                maxLength={150}
                required
              />
            </div>
            <div className="form-field">
              <label>Vaccine Name</label>
              <input
                type="text"
                value={formVaccineName}
                onChange={(e) => setFormVaccineName(e.target.value)}
                placeholder="e.g. Newcastle Disease Vaccine"
                maxLength={150}
                required
              />
            </div>
            <div className="form-field">
              <label>Due Date</label>
              <input
                type="date"
                value={formDateDue}
                onChange={(e) => setFormDateDue(e.target.value)}
                required
              />
            </div>
            <div className="form-field">
              <label>Count Scheduled</label>
              <input
                type="number"
                min={0}
                value={formCountVaccinated}
                onChange={(e) => setFormCountVaccinated(Number(e.target.value))}
              />
            </div>
            <div className="form-field" style={{ gridColumn: '1 / -1' }}>
              <label>Notes (optional)</label>
              <textarea
                maxLength={500}
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                rows={2}
                placeholder="Any notes about this vaccination"
              />
            </div>
            <div className="form-actions">
              <button type="submit" className="primary-action" disabled={formSubmitting}>
                {formSubmitting ? "Saving…" : "Schedule Vaccination"}
              </button>
              <button type="button" className="secondary-action" onClick={() => setShowForm(false)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Mark Done Modal */}
      {markDoneId && markingRec && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '1.75rem', maxWidth: '420px', width: '90%', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
            <h3 style={{ marginTop: 0 }}>Mark Vaccination Done</h3>
            <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
              <strong>{markingRec.targetName}</strong> — {markingRec.vaccineName}
            </p>
            {markDoneError && (
              <div style={{ color: '#dc2626', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '6px', padding: '0.6rem', marginBottom: '1rem' }}>
                {markDoneError}
              </div>
            )}
            <form onSubmit={handleMarkDone}>
              <div className="form-field" style={{ marginBottom: '1rem' }}>
                <label>Date Administered</label>
                <input
                  type="date"
                  value={markDoneDate}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setMarkDoneDate(e.target.value)}
                  required
                />
              </div>
              <div className="form-field" style={{ marginBottom: '1.25rem' }}>
                <label>Count Vaccinated</label>
                <input
                  type="number"
                  min={0}
                  value={markDoneCount}
                  onChange={(e) => setMarkDoneCount(Number(e.target.value))}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button type="submit" className="primary-action" disabled={markDoneSubmitting}>
                  {markDoneSubmitting ? "Saving…" : "Mark as Done ✓"}
                </button>
                <button type="button" className="secondary-action" onClick={() => { setMarkDoneId(null); setMarkDoneError(""); }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Schedule Tab */}
      {tab === 'schedule' && (
        <div className="management-card">
          <h3 className="card-heading">Upcoming &amp; Overdue Vaccinations</h3>
          {scheduled.length === 0
            ? <p style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem 0' }}>No scheduled vaccinations. Use the button above to add one.</p>
            : (
              <div style={{ overflowX: 'auto' }}>
                <table className="modern-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th>Animal / Batch</th>
                      <th>Vaccine</th>
                      <th>Due Date</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Count</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scheduled.map((rec) => {
                      const { label, style } = getDisplayStatus(rec);
                      return (
                        <tr key={rec.id}>
                          <td>{rec.targetName}</td>
                          <td>{rec.vaccineName}</td>
                          <td>{rec.dateDue}</td>
                          <td><span style={style}>{label}</span></td>
                          <td style={{ textAlign: 'right' }}>{rec.countVaccinated > 0 ? rec.countVaccinated : '—'}</td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                              <button
                                className="edit-button"
                                style={{ fontSize: '0.8rem' }}
                                onClick={() => {
                                  setMarkDoneId(rec.id);
                                  setMarkDoneDate(new Date().toISOString().slice(0, 10));
                                  setMarkDoneCount(rec.countVaccinated);
                                  setMarkDoneError("");
                                }}
                              >
                                Mark Done ✓
                              </button>
                              <button
                                className="delete-button"
                                style={{ fontSize: '0.8rem' }}
                                onClick={() => handleDelete(rec.id)}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          }
        </div>
      )}

      {/* History Tab */}
      {tab === 'history' && (
        <div className="management-card">
          <h3 className="card-heading">Vaccination History</h3>
          {history.length === 0
            ? <p style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem 0' }}>No completed vaccinations yet.</p>
            : (
              <div style={{ overflowX: 'auto' }}>
                <table className="modern-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th>Administered Date</th>
                      <th>Animal / Batch</th>
                      <th>Vaccine Name</th>
                      <th style={{ textAlign: 'right' }}>Count Vaccinated</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((rec) => (
                      <tr key={rec.id}>
                        <td>{rec.dateAdministered ?? '—'}</td>
                        <td>{rec.targetName}</td>
                        <td>{rec.vaccineName}</td>
                        <td style={{ textAlign: 'right' }}>{rec.countVaccinated > 0 ? rec.countVaccinated.toLocaleString() : '—'}</td>
                        <td>{rec.notes || <span style={{ color: '#94a3b8' }}>—</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          }
        </div>
      )}
    </div>
  );
}

export default VaccinationsView;
