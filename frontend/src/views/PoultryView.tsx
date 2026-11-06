import { useEffect, useMemo, useState } from "react";
import type { PoultryBatch } from "../types/farm";
import {
  loadPoultry,
  addPoultry,
  updatePoultry,
  deletePoultry,
} from "../services/storage";
import {
  Bird,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import {
  Badge,
  Button,
  EmptyState,
  ErrorBanner,
  Field,
  IconButton,
  Modal,
  Notice,
  PageHeader,
  Panel,
  Segmented,
  StatCard,
} from "../components/ui";

const STAGE_OPTIONS = [
  { value: "all", label: "All" },
  { value: "chicks", label: "Chicks" },
  { value: "layers", label: "Layers" },
  { value: "broilers", label: "Broilers" },
  { value: "kienyeji", label: "Kienyeji" },
];

const STAGE_BADGE_TONE: Record<string, "amber" | "green" | "blue" | "forest" | "slate"> = {
  chicks: "amber",
  layers: "green",
  broilers: "blue",
  kienyeji: "forest",
  growers: "slate",
  adult: "slate",
};

function stageTone(stage: string | undefined): "amber" | "green" | "blue" | "forest" | "slate" {
  return STAGE_BADGE_TONE[stage ?? "adult"] ?? "slate";
}

function stageLabel(stage: string | undefined): string {
  switch (stage) {
    case "chicks": return "Chicks";
    case "layers": return "Layers";
    case "broilers": return "Broilers";
    case "kienyeji": return "Kienyeji";
    case "growers": return "Growers";
    default: return "Adult";
  }
}

export default function PoultryView() {
  const [poultry, setPoultry] = useState<PoultryBatch[]>([]);
  const [_loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filterStage, setFilterStage] = useState<string>("all");
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);

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
        setSuccessMsg("Chicken batch updated successfully.");
      } else {
        await addPoultry(payload);
        setSuccessMsg("New chicken batch added successfully.");
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

  async function actualDelete(id: string) {
    await deletePoultry(id);
    setSuccessMsg("Batch deleted.");
    await refreshPoultry();
  }

  function handleDelete(id: string, name: string) {
    setDeleteConfirm({ id, name });
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
    <main className="kf-page">
      <PageHeader
        title="Poultry Management"
        description="Manage your chicks from day-old brooding, broilers, layers, and kienyeji flocks."
        actions={
          <Button icon={<Plus size={16} />} onClick={() => { clearForm(); window.scrollTo({ top: 400, behavior: "smooth" }); }}>
            Add batch
          </Button>
        }
      />

      <div className="kf-stack">
        {/* Visual sector header */}
        <div className="kf-page-hero">
          <div className="kf-page-hero-thumb">
            <img src="/images/card-poultry.jpg" alt="Poultry flock" />
          </div>
          <div className="kf-page-hero-content">
            <h2 className="kf-page-hero-title">
              <Bird size={20} strokeWidth={1.8} />
              Poultry Operations & Flock Register
            </h2>
            <p className="kf-page-hero-desc">
              Manage day-old brooding chicks, active layers, broilers and kienyeji flocks. Track flock mortality and stock balance.
            </p>
          </div>
          <div className="kf-page-hero-stats">
            <Badge tone="forest">{totalCurrent.toLocaleString()} Live Birds</Badge>
            <Badge tone="amber">{totalChicks.toLocaleString()} In Brooder</Badge>
          </div>
        </div>

        {/* KPI Summary Cards */}
        <div className="kf-grid kf-grid--stats">
          <StatCard
            tone="forest"
            image="/images/farm/chicken.webp"
            imageAlt="Current Living Birds"
            layout="image-right"
            label="Current Living Birds"
            value={totalCurrent.toLocaleString()}
            hint="Total across all batches"
          />
          <StatCard
            tone="amber"
            image="/images/farm/chick.webp"
            imageAlt="Chicks in Brooder"
            layout="image-right"
            label="Chicks in Brooder"
            value={totalChicks.toLocaleString()}
            hint="Day-old to 4 weeks"
          />
          <StatCard
            tone="blue"
            image="/images/farm/chicken.webp"
            imageAlt="Layers & Broilers"
            layout="image-right"
            label="Layers & Broilers"
            value={`${totalLayers} layers / ${totalBroilers} broilers`}
            hint="Active production birds"
          />
          <StatCard
            tone={parseFloat(overallLossRate) > 5 ? "red" : "slate"}
            image="/images/farm/operating-loss.webp"
            imageAlt="Recorded Mortality"
            layout="image-right"
            label="Recorded Mortality"
            value={`${totalLoss.toLocaleString()} (${overallLossRate}%)`}
            hint={parseFloat(overallLossRate) > 5 ? "High mortality warning" : "Normal mortality"}
          />
        </div>

        {/* Add / Edit Form */}
        <Panel
          title={editingId ? "Edit Chicken Batch" : "Add Chickens (Chicks / Broilers / Layers)"}
          subtitle="Record arrival of day-old chicks or existing flocks. Stock formula: Closing = Initial − Deaths."
        >
          {errorMsg && <ErrorBanner message={errorMsg} />}
          {successMsg && <Notice tone="success">{successMsg}</Notice>}

          <form onSubmit={handleSubmit}>
            <div className="kf-form-grid">
              <Field label="Growth Stage" htmlFor="stage" required>
                <select id="stage" value={stage} onChange={(e) => setStage(e.target.value)}>
                  <option value="chicks">Day-old Chicks (Brooding)</option>
                  <option value="broilers">Broilers (Meat)</option>
                  <option value="layers">Layers (Egg production)</option>
                  <option value="kienyeji">Kienyeji / Improved Kienyeji</option>
                  <option value="growers">Growers / Pullets</option>
                  <option value="adult">Adult Flock</option>
                </select>
              </Field>

              <Field label="Breed" htmlFor="breed" required>
                <input
                  id="breed"
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
              </Field>

              <Field label="Purpose" htmlFor="purpose" required>
                <select id="purpose" value={purpose} onChange={(e) => setPurpose(e.target.value)}>
                  <option value="Eggs & Meat">Eggs & Meat (Dual purpose)</option>
                  <option value="Egg Production">Egg Production (Layers)</option>
                  <option value="Meat Production">Meat Production (Broilers)</option>
                  <option value="Breeding & Chicks">Breeding & Hatching</option>
                </select>
              </Field>

              <Field label="Number Acquired / Hatched" htmlFor="initialCount" required>
                <input
                  id="initialCount"
                  type="number"
                  placeholder="e.g. 500"
                  value={initialCount}
                  onChange={(e) => {
                    setInitialCount(e.target.value);
                    if (!editingId && !currentCount) setCurrentCount(e.target.value);
                  }}
                  required
                />
              </Field>

              <Field
                label="Current Number Alive"
                htmlFor="currentCount"
                required
                hint={
                  initialCount && currentCount && parseInt(initialCount) > parseInt(currentCount)
                    ? `Deaths/Losses: ${parseInt(initialCount) - parseInt(currentCount)} birds (${(((parseInt(initialCount) - parseInt(currentCount)) / parseInt(initialCount)) * 100).toFixed(1)}%)`
                    : undefined
                }
              >
                <input
                  id="currentCount"
                  type="number"
                  placeholder="e.g. 485"
                  value={currentCount}
                  onChange={(e) => setCurrentCount(e.target.value)}
                  required
                />
              </Field>

              <Field label="Age in Weeks" htmlFor="ageWeeks" required>
                <input
                  id="ageWeeks"
                  type="number"
                  placeholder="e.g. 1"
                  value={ageWeeks}
                  onChange={(e) => setAgeWeeks(e.target.value)}
                  required
                />
              </Field>

              <Field label="Date Added / Received" htmlFor="dateAdded">
                <input
                  id="dateAdded"
                  type="date"
                  value={dateAdded}
                  onChange={(e) => setDateAdded(e.target.value)}
                />
              </Field>

              <Field label="Hatchery / Source Supplier (Optional)" htmlFor="source">
                <input
                  id="source"
                  type="text"
                  placeholder="e.g. Kenchic, Muguku, Local Hatchery"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                />
              </Field>

              <Field label="Total Acquisition Cost (KES, Optional)" htmlFor="purchasePrice">
                <input
                  id="purchasePrice"
                  type="number"
                  placeholder="e.g. 55000"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(e.target.value)}
                />
              </Field>
            </div>

            <Field label="Notes / Housing Location / Health Checks" htmlFor="notes" className="kf-field--full">
              <input
                id="notes"
                type="text"
                placeholder="e.g. Brooder House 1, heating lamp checked, 1st Gumboro scheduled"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Field>

            <div className="kf-form-actions">
              {editingId && (
                <Button variant="ghost" type="button" onClick={clearForm}>
                  Cancel Edit
                </Button>
              )}
              <Button type="submit" loading={saving}>
                {editingId ? "Update Batch" : "Add Chickens"}
              </Button>
            </div>
          </form>
        </Panel>

        {/* Records Table */}
        <Panel
          title={`Recorded Chicken Batches (${poultry.length})`}
          subtitle="Track live counts, stage progress, and mortalities."
          actions={
            <Segmented
              label="Filter by stage"
              options={STAGE_OPTIONS}
              value={filterStage}
              onChange={setFilterStage}
            />
          }
        >
          {filteredPoultry.length === 0 ? (
            <EmptyState
              icon={<Bird size={26} />}
              title="No chicken batches found"
              description="Use the form above to record your first flock of chicks or chickens."
            />
          ) : (
            <div className="kf-table-wrap">
              <table className="kf-table">
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
                          <div style={{ fontSize: 12, color: "var(--kf-text-muted)" }}>{b.purpose}</div>
                        </td>
                        <td>
                          <Badge tone={stageTone(b.stage)}>
                            {stageLabel(b.stage)}
                          </Badge>
                        </td>
                        <td>{b.ageWeeks} wks</td>
                        <td>{b.initialCount.toLocaleString()}</td>
                        <td>
                          <strong>{b.currentCount.toLocaleString()}</strong>
                        </td>
                        <td>{losses > 0 ? `${losses} birds` : "0"}</td>
                        <td>
                          {isHighLoss
                            ? <Badge tone="red">{lossPct.toFixed(1)}%</Badge>
                            : <Badge tone="slate">{lossPct.toFixed(1)}%</Badge>
                          }
                        </td>
                        <td>{b.dateAdded ? b.dateAdded.slice(0, 10) : "—"}</td>
                        <td>
                          <div className="kf-actions-cell">
                            <IconButton
                              label="Edit"
                              icon={<Pencil size={16} />}
                              onClick={() => startEdit(b)}
                            />
                            <IconButton
                              label="Delete"
                              tone="danger"
                              icon={<Trash2 size={16} />}
                              onClick={() => handleDelete(b.id, `${b.breed} (${b.purpose})`)}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>

      {/* Delete confirmation modal */}
      <Modal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Delete batch?"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={async () => {
                if (deleteConfirm) {
                  await actualDelete(deleteConfirm.id);
                  setDeleteConfirm(null);
                }
              }}
            >
              Delete
            </Button>
          </>
        }
      >
        <p>Are you sure you want to delete '{deleteConfirm?.name}'? This cannot be undone.</p>
      </Modal>
    </main>
  );
}
