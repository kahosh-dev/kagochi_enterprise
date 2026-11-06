import { useEffect, useMemo, useState } from "react";
import {
  loadFeeding,
  addFeeding,
  updateFeeding,
  deleteFeeding,
} from "../services/storage";
import type { FeedingRecord } from "../types/farm";
import { ClipboardList, Wheat, Plus, Pencil, Trash2 } from "lucide-react";
import {
  PageHeader,
  StatCard,
  Panel,
  Field,
  Button,
  IconButton,
  EmptyState,
  ErrorBanner,
  Notice,
  Segmented,
  Modal,
} from "../components/ui";
import { formatCurrency, formatNumber } from "../utils/format";

type AnimalFilter = "All" | "Poultry" | "Cattle";

export default function FeedingView() {
  const [records, setRecords] = useState<FeedingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [animalFilter, setAnimalFilter] = useState<AnimalFilter>("All");

  // Form fields
  const [animalType, setAnimalType] = useState("Poultry");
  const [feedType, setFeedType] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("kg");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [cost, setCost] = useState("");
  const [supplier, setSupplier] = useState("");
  const [notes, setNotes] = useState("");

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  async function refreshFeeding() {
    try {
      setLoading(true);
      const data = await loadFeeding();
      setRecords(data);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : "Failed to load feeding records.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshFeeding();
  }, []);

  function resetForm() {
    setEditingId(null);
    setAnimalType("Poultry");
    setFeedType("");
    setQuantity("");
    setUnit("kg");
    setDate(new Date().toISOString().split("T")[0]);
    setCost("");
    setSupplier("");
    setNotes("");
    setErrorMsg("");
  }

  function startEdit(record: FeedingRecord) {
    setEditingId(record.id);
    setAnimalType(record.animalType);
    setFeedType(record.feedType);
    setQuantity(String(record.quantity));
    setUnit(record.unit);
    setDate(record.date);
    setCost(record.cost != null ? String(record.cost) : "");
    setSupplier(record.supplier ?? "");
    setNotes(record.notes ?? "");
    setErrorMsg("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const amount = Number(quantity);
    if (!feedType.trim()) {
      setErrorMsg("Please enter the feed type.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setErrorMsg("Please enter a valid feed quantity.");
      return;
    }

    try {
      setSaving(true);
      const record = {
        animalType,
        feedType: feedType.trim(),
        quantity: amount,
        unit,
        date,
        cost: cost !== "" ? parseFloat(cost) : undefined,
        supplier: supplier.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      if (editingId) {
        await updateFeeding(editingId, record);
        setSuccessMsg("Feeding record updated.");
      } else {
        await addFeeding(record);
        setSuccessMsg(`Feeding record added: ${feedType} for ${animalType}.`);
      }

      await refreshFeeding();
      resetForm();
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : "Failed to save feeding record.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteId) return;
    try {
      await deleteFeeding(deleteId);
      if (editingId === deleteId) resetForm();
      setDeleteId(null);
      await refreshFeeding();
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : "Failed to delete feeding record.");
      setDeleteId(null);
    }
  }

  // Stats
  const totalKg = useMemo(
    () => records.filter((r) => r.unit === "kg").reduce((s, r) => s + Number(r.quantity), 0),
    [records]
  );
  const totalBags = useMemo(
    () => records.filter((r) => r.unit === "bags").reduce((s, r) => s + Number(r.quantity), 0),
    [records]
  );
  const totalCost = useMemo(
    () => records.reduce((s, r) => s + Number(r.cost ?? 0), 0),
    [records]
  );
  const recordCount = records.length;

  const filteredRecords = useMemo(() => {
    if (animalFilter === "All") return records;
    return records.filter(
      (r) => r.animalType.toLowerCase() === animalFilter.toLowerCase()
    );
  }, [records, animalFilter]);

  const deleteRecord = deleteId ? records.find((r) => r.id === deleteId) : null;

  return (
    <main className="kf-page">
      <PageHeader
        title="Feeding Management"
        description="Track feed types, quantities, costs, and feeding activities for poultry and livestock."
        actions={
          <Button variant="primary" icon={<Plus size={16} />} onClick={resetForm}>
            Add Record
          </Button>
        }
      />

      {/* Stats */}
            {/* Visual sector header */}
      <div className="kf-page-hero">
        <div className="kf-page-hero-thumb">
          <img src="/images/card-feeding.jpg" alt="Agricultural crops and feed" />
        </div>
        <div className="kf-page-hero-content">
          <h2 className="kf-page-hero-title">
            <Wheat size={20} strokeWidth={1.8} />
            Feed & Nutrition Management
          </h2>
          <p className="kf-page-hero-desc">
            Monitor daily feeding rations for chicks, growers, layers, and cattle. Track feed consumption in kilograms and bags.
          </p>
        </div>
        <div className="kf-page-hero-stats">
          <span className="kf-badge kf-badge--forest">{formatNumber(totalKg)} kg Feed Logged</span>
          <span className="kf-badge kf-badge--amber">{formatCurrency(totalCost)} Feed Cost</span>
        </div>
      </div>

      <div className="kf-grid kf-grid--stats">
        <StatCard
          label="Total (kg)"
          value={formatNumber(totalKg)}
          hint="Sum of kg records"
          image="/images/farm/animal-feed.webp"
          imageAlt="Feed in kg"
          layout="image-right"
          tone="green"
        />
        <StatCard
          label="Total (bags)"
          value={formatNumber(totalBags)}
          hint="Sum of bag records"
          image="/images/farm/animal-feed.webp"
          imageAlt="Feed in bags"
          layout="image-right"
          tone="forest"
        />
        <StatCard
          label="Total Feed Cost"
          value={formatCurrency(totalCost)}
          hint="Where cost recorded"
          image="/images/farm/farm-expenses.webp"
          imageAlt="Feed expenses"
          layout="image-right"
          tone="amber"
        />
        <StatCard
          label="Records"
          value={formatNumber(recordCount)}
          hint="All feeding entries"
          icon={<ClipboardList size={20} strokeWidth={1.5} />}
          tone="slate"
        />
      </div>

      {/* Feedback */}
      {errorMsg && <ErrorBanner message={errorMsg} onRetry={() => setErrorMsg("")} />}
      {successMsg && <Notice tone="success">{successMsg}</Notice>}

      {/* Form */}
      <Panel title={editingId ? "Edit Feeding Record" : "Add Feeding Record"}>
        <form onSubmit={handleSubmit} className="kf-form">
          <div className="kf-form-grid">
            <Field label="Animal Type" required>
              <select
                value={animalType}
                onChange={(e) => setAnimalType(e.target.value)}
                className="kf-input"
              >
                <option value="Poultry">Poultry</option>
                <option value="Cattle">Cattle</option>
              </select>
            </Field>

            <Field label="Feed Type" required>
              <input
                type="text"
                className="kf-input"
                placeholder="e.g. Layers Mash, Dairy Meal"
                value={feedType}
                onChange={(e) => setFeedType(e.target.value)}
              />
            </Field>

            <Field label="Quantity" required>
              <input
                type="number"
                className="kf-input"
                min="0"
                step="0.01"
                placeholder="e.g. 25"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </Field>

            <Field label="Unit" required>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="kf-input"
              >
                <option value="kg">kg</option>
                <option value="bags">bags</option>
                <option value="litres">litres</option>
                <option value="pieces">pieces</option>
              </select>
            </Field>

            <Field label="Date" required>
              <input
                type="date"
                className="kf-input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </Field>

            <Field label="Cost (KES)">
              <input
                type="number"
                className="kf-input"
                min="0"
                step="0.01"
                placeholder="Optional"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
              />
            </Field>

            <Field label="Supplier">
              <input
                type="text"
                className="kf-input"
                placeholder="e.g. Local Agrovet"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
              />
            </Field>

            <Field label="Notes">
              <input
                type="text"
                className="kf-input"
                placeholder="Optional notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Field>
          </div>

          <div className="kf-form-actions">
            {editingId && (
              <Button variant="secondary" onClick={resetForm}>
                Cancel Edit
              </Button>
            )}
            <Button variant="primary" loading={saving} onClick={() => {}}>
              <span>{saving ? "Saving…" : editingId ? "Update Record" : "Add Feeding"}</span>
            </Button>
          </div>
        </form>
      </Panel>

      {/* Filter + Table */}
      <Panel title="Feeding Records">
        <div className="kf-filter-row">
          <Segmented
            label="Filter by animal type"
            options={[
              { value: "All", label: "All" },
              { value: "Poultry", label: "Poultry" },
              { value: "Cattle", label: "Cattle" },
            ]}
            value={animalFilter}
            onChange={(v) => setAnimalFilter(v as AnimalFilter)}
          />
        </div>

        {loading ? (
          <EmptyState title="Loading…" description="Fetching feeding records." />
        ) : filteredRecords.length === 0 ? (
          <EmptyState
            icon={<Wheat size={40} />}
            title="No feeding records"
            description={
              animalFilter === "All"
                ? "Add your first feeding record above."
                : `No records for ${animalFilter} yet.`
            }
          />
        ) : (
          <div className="kf-table-wrap">
            <table className="kf-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Animal Type</th>
                  <th>Feed Type</th>
                  <th>Quantity</th>
                  <th>Unit</th>
                  <th>Cost KES</th>
                  <th>Supplier</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((record) => (
                  <tr key={record.id}>
                    <td>{record.date}</td>
                    <td>{record.animalType}</td>
                    <td>{record.feedType}</td>
                    <td>{record.quantity}</td>
                    <td>{record.unit}</td>
                    <td>{record.cost != null ? formatCurrency(record.cost) : "—"}</td>
                    <td>{record.supplier || "—"}</td>
                    <td>
                      <div className="kf-row-actions">
                        <IconButton
                          label="Edit"
                          icon={<Pencil size={15} />}
                          onClick={() => startEdit(record)}
                        />
                        <IconButton
                          label="Delete"
                          icon={<Trash2 size={15} />}
                          onClick={() => setDeleteId(record.id)}
                          tone="danger"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* Delete confirm modal */}
      <Modal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Delete feeding record?"
        size="sm"
        footer={
          <div className="kf-modal-footer-actions">
            <Button variant="secondary" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDelete}>
              Delete
            </Button>
          </div>
        }
      >
        <p>
          Delete <strong>{deleteRecord?.feedType}</strong> ({deleteRecord?.animalType},{" "}
          {deleteRecord?.date})? This action cannot be undone.
        </p>
      </Modal>
    </main>
  );
}
