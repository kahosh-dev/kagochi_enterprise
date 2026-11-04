import { useEffect, useState } from "react";
import type { PopulationEvent, SurvivorSummary } from "../types/farm";
import type { PoultryBatch, LivestockAnimal } from "../types/farm";
import {
  loadSurvivorSummary,
  loadPopulationEvents,
  addPopulationEvent,
  deletePopulationEvent,
  loadPoultry,
  loadLivestock,
} from "../services/storage";

const EVENT_LABELS: Record<string, string> = {
  addition:     "Birds/animals added",
  death:        "Animals that died",
  sale:         "Sold",
  transfer_in:  "Transferred in",
  transfer_out: "Transferred out",
};

function SurvivorView() {
  const [summary, setSummary] = useState<SurvivorSummary | null>(null);
  const [events, setEvents] = useState<PopulationEvent[]>([]);
  const [poultryBatches, setPoultryBatches] = useState<PoultryBatch[]>([]);
  const [livestock, setLivestock] = useState<LivestockAnimal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [filterSpecies, setFilterSpecies] = useState<"" | "poultry" | "cattle">("");
  const [filterTargetId, setFilterTargetId] = useState("");

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [formSpecies, setFormSpecies] = useState<"poultry" | "cattle">("poultry");
  const [formTargetId, setFormTargetId] = useState("");
  const [formTargetName, setFormTargetName] = useState("");
  const [formEventType, setFormEventType] = useState<PopulationEvent["eventType"]>("addition");
  const [formCount, setFormCount] = useState(1);
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [formReason, setFormReason] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formWarning, setFormWarning] = useState("");

  async function refresh() {
    try {
      setLoading(true);
      const [s, evts, poultry, ls] = await Promise.all([
        loadSurvivorSummary(),
        loadPopulationEvents(),
        loadPoultry(),
        loadLivestock(),
      ]);
      setSummary(s);
      setEvents(evts);
      setPoultryBatches(poultry);
      setLivestock(ls);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, []);

  // Compute current survivors for the selected target (for form validation)
  function computeCurrentSurvivors(targetId: string, species: string): number | null {
    if (!summary) return null;
    const t = summary.targets.find((t) => t.targetId === targetId && t.species === species);
    return t ? t.survivors : null;
  }

  const isReducing = ["death", "sale", "transfer_out"].includes(formEventType);
  const currentSurvivors = (formTargetId && isReducing)
    ? computeCurrentSurvivors(formTargetId, formSpecies)
    : null;
  const wouldGoNegative = (currentSurvivors !== null && isReducing && formCount > currentSurvivors);

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
    setFormWarning("");
    if (!formTargetId) { setFormError("Please select a target."); return; }
    if (wouldGoNegative) { setFormError("This would make the population go negative. Reduce the count."); return; }

    try {
      setFormSubmitting(true);
      const result = await addPopulationEvent({
        species: formSpecies,
        targetId: formTargetId,
        targetName: formTargetName,
        eventType: formEventType,
        count: formCount,
        date: formDate,
        reason: formReason,
        notes: formNotes,
      });
      if (result.warning) setFormWarning(result.warning);
      else setShowForm(false);
      await refresh();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Failed to save event.");
    } finally {
      setFormSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this population event?")) return;
    try {
      await deletePopulationEvent(id);
      await refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to delete event.");
    }
  }

  // Filtered events
  const filteredEvents = events.filter((e) => {
    if (filterSpecies && e.species !== filterSpecies) return false;
    if (filterTargetId && e.targetId !== filterTargetId) return false;
    return true;
  });

  // Running survivors per event (for ledger column)
  function runningSurvivorAfter(event: PopulationEvent): number {
    const t = summary?.targets.find((t) => t.targetId === event.targetId);
    if (!t) return 0;
    // Compute from events sorted by date asc
    const targetEvents = events
      .filter((e) => e.targetId === event.targetId)
      .sort((a, b) => a.date.localeCompare(b.date));
    let net = t.initialCount;
    for (const ev of targetEvents) {
      if (["addition", "transfer_in"].includes(ev.eventType)) net += ev.count;
      else if (["death", "sale", "transfer_out"].includes(ev.eventType)) net -= ev.count;
      if (ev.id === event.id) break;
    }
    return Math.max(0, net);
  }

  if (loading) return <div className="management-page"><p>Loading survivor data…</p></div>;
  if (error)   return <div className="management-page"><p style={{ color: 'red' }}>{error}</p></div>;

  const totals = summary ? {
    poultryBirds: summary.totalPoultryBirds,
    livestockAnimals: summary.totalLivestockAnimals,
  } : { poultryBirds: 0, livestockAnimals: 0 };

  const selectedTarget = summary?.targets.find((t) => t.targetId === filterTargetId);

  return (
    <div className="management-page">
      <div className="view-header-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h2>Animal Survivor Tracking</h2>
          <p style={{ color: '#64748b', margin: 0 }}>Track population changes and survivors for each batch or animal.</p>
        </div>
        <button className="primary-action" onClick={() => { setShowForm(!showForm); setFormError(""); setFormWarning(""); }}>
          {showForm ? "Cancel" : "Record Event"}
        </button>
      </div>

      {/* KPI Summary */}
      <div className="summary-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="summary-card">
          <p className="card-label">🐓 Total Birds Alive</p>
          <h3>{totals.poultryBirds.toLocaleString()}</h3>
        </div>
        <div className="summary-card">
          <p className="card-label">🐄 Livestock Active</p>
          <h3>{totals.livestockAnimals.toLocaleString()}</h3>
        </div>
        {selectedTarget && selectedTarget.survivorRatePercent !== null && (
          <div className="summary-card">
            <p className="card-label">Survivor Rate</p>
            <h3>{selectedTarget.survivorRatePercent.toFixed(1)}%</h3>
            <p style={{ fontSize: '0.8rem', color: '#64748b' }}>{selectedTarget.targetName}</p>
          </div>
        )}
      </div>

      {/* Record Event Form */}
      {showForm && (
        <div className="management-card" style={{ marginBottom: '1.5rem' }}>
          <h3 className="card-heading">Record a Population Event</h3>
          {formWarning && (
            <div className="form-warning" style={{ background: '#fef9c3', border: '1px solid #f59e0b', borderRadius: '6px', padding: '0.75rem', marginBottom: '1rem' }}>
              ⚠️ {formWarning}
            </div>
          )}
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
              <label>Target Batch / Animal</label>
              <select value={formTargetId} onChange={(e) => handleTargetChange(e.target.value)} required>
                <option value="">-- Select --</option>
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
              <label>Event Type</label>
              <select value={formEventType} onChange={(e) => setFormEventType(e.target.value as any)}>
                {Object.entries(EVENT_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label>Count</label>
              <input
                type="number"
                min={1}
                max={100000}
                value={formCount}
                onChange={(e) => setFormCount(Number(e.target.value))}
                required
              />
              {wouldGoNegative && (
                <p style={{ color: '#dc2626', fontSize: '0.8rem', margin: '0.25rem 0 0' }}>
                  Only {currentSurvivors} survivors remain — count cannot exceed this.
                </p>
              )}
            </div>
            <div className="form-field">
              <label>Date</label>
              <input
                type="date"
                value={formDate}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setFormDate(e.target.value)}
                required
              />
            </div>
            <div className="form-field">
              <label>Reason (optional)</label>
              <input
                type="text"
                maxLength={300}
                value={formReason}
                onChange={(e) => setFormReason(e.target.value)}
                placeholder="e.g. Disease, Predator attack"
              />
            </div>
            <div className="form-field" style={{ gridColumn: '1 / -1' }}>
              <label>Notes (optional)</label>
              <textarea
                maxLength={500}
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                rows={2}
                placeholder="Any additional details"
              />
            </div>
            <div className="form-actions">
              <button type="submit" className="primary-action" disabled={formSubmitting || wouldGoNegative}>
                {formSubmitting ? "Saving…" : "Save Event"}
              </button>
              <button type="button" className="secondary-action" onClick={() => { setShowForm(false); setFormError(""); setFormWarning(""); }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="dashboard-filter-bar" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <label style={{ fontWeight: 600, fontSize: '0.9rem' }}>Filter:</label>
        <select
          className="filter-chip"
          value={filterSpecies}
          onChange={(e) => { setFilterSpecies(e.target.value as any); setFilterTargetId(""); }}
        >
          <option value="">All species</option>
          <option value="poultry">Poultry</option>
          <option value="cattle">Livestock</option>
        </select>
        <select
          className="filter-chip"
          value={filterTargetId}
          onChange={(e) => setFilterTargetId(e.target.value)}
        >
          <option value="">All targets</option>
          {(filterSpecies === "poultry" ? poultryBatches
            : filterSpecies === "cattle" ? livestock
            : [...poultryBatches, ...livestock]
          ).map((t) => (
            <option key={t.id} value={t.id}>
              {'purpose' in t ? `${(t as PoultryBatch).breed} (${(t as PoultryBatch).purpose})` : (t as LivestockAnimal).name}
            </option>
          ))}
        </select>
      </div>

      {/* Survivor Targets Summary Table */}
      {summary && summary.targets.length > 0 && (
        <div className="management-card" style={{ marginBottom: '1.5rem' }}>
          <h3 className="card-heading">Population Summary</h3>
          <div style={{ overflowX: 'auto' }}>
            <table className="modern-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th>Batch / Animal</th>
                  <th>Species</th>
                  <th>Start</th>
                  <th>Added</th>
                  <th>Died</th>
                  <th>Sold</th>
                  <th>Transferred</th>
                  <th>Survivors</th>
                  <th>Survivor Rate</th>
                </tr>
              </thead>
              <tbody>
                {summary.targets
                  .filter((t) => !filterSpecies || t.species === filterSpecies)
                  .filter((t) => !filterTargetId || t.targetId === filterTargetId)
                  .map((t) => (
                    <tr key={t.targetId}>
                      <td>{t.targetName}</td>
                      <td style={{ textTransform: 'capitalize' }}>{t.species}</td>
                      <td>{t.initialCount.toLocaleString()}</td>
                      <td>{(t.additions + t.transfersIn) > 0 ? `+${(t.additions + t.transfersIn).toLocaleString()}` : '—'}</td>
                      <td>{t.deaths > 0 ? t.deaths.toLocaleString() : '—'}</td>
                      <td>{t.sales > 0 ? t.sales.toLocaleString() : '—'}</td>
                      <td>{t.transfersOut > 0 ? `−${t.transfersOut.toLocaleString()}` : '—'}</td>
                      <td><strong>{t.survivors.toLocaleString()}</strong></td>
                      <td>
                        {t.survivorRatePercent !== null
                          ? `${t.survivorRatePercent.toFixed(1)}%`
                          : <span style={{ color: '#94a3b8' }}>—</span>
                        }
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Event Ledger */}
      <div className="management-card">
        <h3 className="card-heading">Population Event Ledger</h3>
        {filteredEvents.length === 0
          ? <p style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem 0' }}>No events recorded yet. Use the "Record Event" button to add one.</p>
          : (
            <div style={{ overflowX: 'auto' }}>
              <table className="modern-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Target</th>
                    <th>Event</th>
                    <th>Count</th>
                    <th>Reason</th>
                    <th>Survivors After</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEvents.map((ev) => (
                    <tr key={ev.id}>
                      <td>{ev.date}</td>
                      <td>{ev.targetName}</td>
                      <td>{EVENT_LABELS[ev.eventType] ?? ev.eventType}</td>
                      <td style={{ textAlign: 'right' }}>
                        {["addition", "transfer_in"].includes(ev.eventType) ? `+${ev.count}` : `−${ev.count}`}
                      </td>
                      <td>{ev.reason || <span style={{ color: '#94a3b8' }}>—</span>}</td>
                      <td style={{ textAlign: 'right' }}>{runningSurvivorAfter(ev).toLocaleString()}</td>
                      <td>
                        <button
                          className="delete-button"
                          onClick={() => handleDelete(ev.id)}
                          title="Delete event"
                          style={{ fontSize: '0.8rem' }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
      </div>
    </div>
  );
}

export default SurvivorView;
