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
import { Plus, Trash2, AlertTriangle } from "lucide-react";
import { PageHeader, Panel, StatCard, Button, IconButton, ErrorBanner } from "../components/ui";

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

  if (loading) return <main className="kf-page"><p className="kf-muted">Loading survivor data…</p></main>;
  if (error)   return <main className="kf-page"><ErrorBanner message={error} /></main>;

  const totals = summary ? {
    poultryBirds: summary.totalPoultryBirds,
    livestockAnimals: summary.totalLivestockAnimals,
  } : { poultryBirds: 0, livestockAnimals: 0 };

  const selectedTarget = summary?.targets.find((t) => t.targetId === filterTargetId);

  return (
    <main className="kf-page">
      <PageHeader
        title="Survivor Tracking"
        description="Track population changes and survivors for each batch or animal."
        actions={
          <Button icon={<Plus size={16} strokeWidth={1.5} />} onClick={() => { setShowForm(!showForm); setFormError(""); setFormWarning(""); }}>
            {showForm ? "Cancel" : "Record Event"}
          </Button>
        }
      />

      <div className="kf-stack">
        {/* KPI Summary */}
        <div className="kf-grid kf-grid--stats">
          <StatCard
            tone="forest"
            image="/images/farm/chicken.webp"
            imageAlt="Total Birds Alive"
            layout="image-right"
            label="Total Birds Alive"
            value={totals.poultryBirds.toLocaleString()}
            hint="Survivor count across all poultry batches"
          />
          <StatCard
            tone="blue"
            image="/images/farm/cow.webp"
            imageAlt="Livestock Active"
            layout="image-right"
            label="Livestock Active"
            value={totals.livestockAnimals.toLocaleString()}
            hint="Survivor count across all livestock"
          />
          {selectedTarget && selectedTarget.survivorRatePercent !== null && (
            <StatCard
              tone="green"
              image="/images/farm/chick.webp"
              imageAlt="Survivor Rate"
              layout="image-right"
              label="Survivor Rate"
              value={`${selectedTarget.survivorRatePercent.toFixed(1)}%`}
              hint={selectedTarget.targetName}
            />
          )}
        </div>

        {/* Record Event Form */}
        {showForm && (
          <Panel title="Record a Population Event">
            {formWarning && (
              <div className="kf-alert kf-alert--warning">
                <AlertTriangle size={16} strokeWidth={1.5} />
                <span>{formWarning}</span>
              </div>
            )}
            {formError && <ErrorBanner message={formError} />}
            <form onSubmit={handleSubmit} className="kf-form">
              <div className="kf-form-grid">
                <div className="kf-field">
                  <label className="kf-label">Species</label>
                  <select value={formSpecies} onChange={(e) => { setFormSpecies(e.target.value as "poultry" | "cattle"); setFormTargetId(""); setFormTargetName(""); }}>
                    <option value="poultry">Poultry</option>
                    <option value="cattle">Livestock (Cattle)</option>
                  </select>
                </div>
                <div className="kf-field">
                  <label className="kf-label">Target Batch / Animal</label>
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
                <div className="kf-field">
                  <label className="kf-label">Event Type</label>
                  <select value={formEventType} onChange={(e) => setFormEventType(e.target.value as PopulationEvent["eventType"])}>
                    {Object.entries(EVENT_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </div>
                <div className="kf-field">
                  <label className="kf-label">Count</label>
                  <input
                    type="number"
                    min={1}
                    max={100000}
                    value={formCount}
                    onChange={(e) => setFormCount(Number(e.target.value))}
                    required
                  />
                  {wouldGoNegative && (
                    <p className="kf-field-error">Only {currentSurvivors} survivors remain — count cannot exceed this.</p>
                  )}
                </div>
                <div className="kf-field">
                  <label className="kf-label">Date</label>
                  <input
                    type="date"
                    value={formDate}
                    max={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => setFormDate(e.target.value)}
                    required
                  />
                </div>
                <div className="kf-field">
                  <label className="kf-label">Reason (optional)</label>
                  <input
                    type="text"
                    maxLength={300}
                    value={formReason}
                    onChange={(e) => setFormReason(e.target.value)}
                    placeholder="e.g. Disease, Predator attack"
                  />
                </div>
                <div className="kf-field kf-field--full">
                  <label className="kf-label">Notes (optional)</label>
                  <textarea
                    maxLength={500}
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    rows={2}
                    placeholder="Any additional details"
                  />
                </div>
              </div>
              <div className="kf-form-actions">
                <Button variant="ghost" type="button" onClick={() => { setShowForm(false); setFormError(""); setFormWarning(""); }}>
                  Cancel
                </Button>
                <Button type="submit" loading={formSubmitting} disabled={wouldGoNegative}>
                  Save Event
                </Button>
              </div>
            </form>
          </Panel>
        )}

        {/* Filters */}
        <div className="kf-filter-row">
          <span className="kf-label" style={{ margin: 0 }}>Filter:</span>
          <select
            className="kf-input"
            value={filterSpecies}
            onChange={(e) => { setFilterSpecies(e.target.value as "" | "poultry" | "cattle"); setFilterTargetId(""); }}
            style={{ maxWidth: 160 }}
          >
            <option value="">All species</option>
            <option value="poultry">Poultry</option>
            <option value="cattle">Livestock</option>
          </select>
          <select
            className="kf-input"
            value={filterTargetId}
            onChange={(e) => setFilterTargetId(e.target.value)}
            style={{ maxWidth: 220 }}
          >
            <option value="">All targets</option>
            {(filterSpecies === "poultry" ? poultryBatches
              : filterSpecies === "cattle" ? livestock
              : [...poultryBatches, ...livestock]
            ).map((t) => (
              <option key={t.id} value={t.id}>
                {"purpose" in t ? `${(t as PoultryBatch).breed} (${(t as PoultryBatch).purpose})` : (t as LivestockAnimal).name}
              </option>
            ))}
          </select>
        </div>

        {/* Survivor Targets Summary */}
        {summary && summary.targets.length > 0 && (
          <Panel title="Population Summary">
            <div className="kf-table-wrap">
              <table className="kf-table">
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
                        <td style={{ textTransform: "capitalize" }}>{t.species}</td>
                        <td>{t.initialCount.toLocaleString()}</td>
                        <td>{(t.additions + t.transfersIn) > 0 ? `+${(t.additions + t.transfersIn).toLocaleString()}` : "—"}</td>
                        <td>{t.deaths > 0 ? t.deaths.toLocaleString() : "—"}</td>
                        <td>{t.sales > 0 ? t.sales.toLocaleString() : "—"}</td>
                        <td>{t.transfersOut > 0 ? `−${t.transfersOut.toLocaleString()}` : "—"}</td>
                        <td><strong>{t.survivors.toLocaleString()}</strong></td>
                        <td>
                          {t.survivorRatePercent !== null
                            ? `${t.survivorRatePercent.toFixed(1)}%`
                            : <span style={{ color: "var(--kf-muted-2)" }}>—</span>
                          }
                        </td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          </Panel>
        )}

        {/* Event Ledger */}
        <Panel title="Population Event Ledger">
          {filteredEvents.length === 0 ? (
            <p className="kf-muted" style={{ textAlign: "center", padding: "2rem 0" }}>No events recorded yet. Use the "Record Event" button to add one.</p>
          ) : (
            <div className="kf-table-wrap">
              <table className="kf-table">
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
                      <td style={{ textAlign: "right" }}>
                        {["addition", "transfer_in"].includes(ev.eventType) ? `+${ev.count}` : `−${ev.count}`}
                      </td>
                      <td>{ev.reason || <span style={{ color: "var(--kf-muted-2)" }}>—</span>}</td>
                      <td style={{ textAlign: "right" }}>{runningSurvivorAfter(ev).toLocaleString()}</td>
                      <td>
                        <IconButton
                          label="Delete event"
                          icon={<Trash2 size={15} strokeWidth={1.5} />}
                          onClick={() => handleDelete(ev.id)}
                          tone="danger"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </main>
  );
}

export default SurvivorView;
