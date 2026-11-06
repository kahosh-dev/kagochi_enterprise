import { useEffect, useMemo, useState } from "react";
import {
  loadProduction,
  addProduction,
  updateProduction,
  deleteProduction,
} from "../services/storage";
import type { ProductionRecord } from "../types/farm";
import {
  CalendarDays,
  ClipboardList,
  Egg,
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

const TYPE_OPTIONS = [
  { value: "all", label: "All" },
  { value: "eggs", label: "Eggs" },
  { value: "milk", label: "Milk" },
];

export default function ProductionView() {
  const [records, setRecords] = useState<ProductionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string } | null>(null);

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [type, setType] = useState<"eggs" | "milk">("eggs");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("pieces");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [destination, setDestination] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [notes, setNotes] = useState("");

  async function refreshProduction() {
    try {
      setLoading(true);
      const data = await loadProduction();
      setRecords(data);
    } catch (error) {
      console.error(error);
      setErrorMsg(error instanceof Error ? error.message : "Failed to load production.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshProduction();
  }, []);

  function resetForm() {
    setEditingId(null);
    setType("eggs");
    setQuantity("");
    setUnit("pieces");
    setDate(new Date().toISOString().split("T")[0]);
    setDestination("");
    setSellingPrice("");
    setNotes("");
    setErrorMsg("");
  }

  function handleTypeChange(value: "eggs" | "milk") {
    setType(value);
    setUnit(value === "eggs" ? "pieces" : "litres");
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const amount = Number(quantity);

    if (!Number.isFinite(amount) || amount <= 0) {
      setErrorMsg("Please enter a valid production quantity.");
      return;
    }

    try {
      setSaving(true);

      const record = {
        type,
        quantity: amount,
        unit,
        date,
        destination: destination || undefined,
        sellingPrice: sellingPrice ? parseFloat(sellingPrice) : undefined,
        notes: notes.trim() || undefined,
      };

      if (editingId) {
        await updateProduction(editingId, record);
        setSuccessMsg("Production record updated.");
      } else {
        await addProduction(record);
        setSuccessMsg("Production record added.");
      }

      await refreshProduction();
      resetForm();
    } catch (error) {
      console.error(error);
      setErrorMsg(error instanceof Error ? error.message : "Failed to save production.");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(record: ProductionRecord) {
    setEditingId(record.id);
    setType(record.type);
    setQuantity(String(record.quantity));
    setUnit(record.unit);
    setDate(record.date);
    setDestination(record.destination || "");
    setSellingPrice(record.sellingPrice !== undefined ? String(record.sellingPrice) : "");
    setNotes(record.notes || "");
  }

  async function actualDelete(id: string) {
    await deleteProduction(id);
    setSuccessMsg("Production record deleted.");
    await refreshProduction();
    if (editingId === id) resetForm();
  }

  function handleDelete(id: string) {
    setDeleteConfirm({ id });
  }

  // KPI computations
  const totalEggs = useMemo(
    () => records.filter((r) => r.type === "eggs").reduce((sum, r) => sum + Number(r.quantity), 0),
    [records]
  );
  const totalMilk = useMemo(
    () => records.filter((r) => r.type === "milk").reduce((sum, r) => sum + Number(r.quantity), 0),
    [records]
  );
  const currentYYYYMM = new Date().toISOString().slice(0, 7);
  const thisMonthCount = useMemo(
    () => records.filter((r) => r.date.startsWith(currentYYYYMM)).length,
    [records, currentYYYYMM]
  );
  const lastRecord = records[0]?.date ?? "—";

  // Filtered records for table
  const filteredRecords = useMemo(() => {
    if (typeFilter === "all") return records;
    return records.filter((r) => r.type === typeFilter);
  }, [records, typeFilter]);

  return (
    <main className="kf-page">
      <PageHeader
        title="Production Management"
        description="Record and monitor eggs, milk and other farm production."
        actions={
          <Button icon={<Plus size={16} />} onClick={() => { resetForm(); window.scrollTo({ top: 400, behavior: "smooth" }); }}>
            Add record
          </Button>
        }
      />

      <div className="kf-stack">
        {/* Visual sector header */}
        <div className="kf-page-hero">
          <div className="kf-page-hero-thumb">
            <img src="/images/card-production.jpg" alt="Fresh farm eggs" />
          </div>
          <div className="kf-page-hero-content">
            <h2 className="kf-page-hero-title">
              <Egg size={20} strokeWidth={1.8} />
              Daily Production & Yield Logs
            </h2>
            <p className="kf-page-hero-desc">
              Log daily egg collection batches and cow milking volumes. Track destinations, customer sales prices and monthly yields.
            </p>
          </div>
          <div className="kf-page-hero-stats">
            <Badge tone="amber">{totalEggs.toLocaleString()} Total Eggs</Badge>
            <Badge tone="blue">{totalMilk.toLocaleString()} L Milk</Badge>
          </div>
        </div>

        {/* KPI Stats */}
        <div className="kf-grid kf-grid--stats">
          <StatCard
            tone="amber"
            image="/images/farm/eggs.webp"
            imageAlt="Eggs Produced"
            layout="image-right"
            label="Eggs Produced"
            value={totalEggs.toLocaleString()}
            hint="Total pieces recorded"
            onClick={() => setTypeFilter("eggs")}
          />
          <StatCard
            tone="blue"
            image="/images/farm/milk-can.webp"
            imageAlt="Milk Produced"
            layout="image-right"
            label="Milk Produced"
            value={`${totalMilk.toLocaleString()} L`}
            hint="Total litres recorded"
            onClick={() => setTypeFilter("milk")}
          />
          <StatCard
            tone="forest"
            icon={<CalendarDays size={20} strokeWidth={1.5} />}
            label="This Month Records"
            value={thisMonthCount}
            hint={currentYYYYMM}
          />
          <StatCard
            tone="slate"
            icon={<ClipboardList size={20} strokeWidth={1.5} />}
            label="Last Entry"
            value={lastRecord}
            hint="Most recent production date"
          />
        </div>

        {/* Add / Edit Form */}
        <Panel
          title={editingId ? "Edit Production Record" : "Add Production Record"}
          subtitle={editingId ? "Update the selected production record." : "Record a new farm production entry."}
        >
          {errorMsg && <ErrorBanner message={errorMsg} />}
          {successMsg && <Notice tone="success">{successMsg}</Notice>}

          <form onSubmit={handleSubmit}>
            <div className="kf-form-grid">
              <Field label="Production Type" htmlFor="productionType" required>
                <select
                  id="productionType"
                  value={type}
                  onChange={(e) => handleTypeChange(e.target.value as "eggs" | "milk")}
                >
                  <option value="eggs">Eggs</option>
                  <option value="milk">Milk</option>
                </select>
              </Field>

              <Field label="Quantity" htmlFor="productionQuantity" required>
                <input
                  id="productionQuantity"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Enter quantity"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </Field>

              <Field label="Unit" htmlFor="productionUnit">
                <input
                  id="productionUnit"
                  type="text"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                />
              </Field>

              <Field label="Date" htmlFor="productionDate">
                <input
                  id="productionDate"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </Field>

              <Field label="Destination (Optional)" htmlFor="productionDestination">
                <select
                  id="productionDestination"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                >
                  <option value="">— Select —</option>
                  <option value="produced">Produced (stock)</option>
                  <option value="sold">Sold</option>
                  <option value="home_use">Home use</option>
                  <option value="damaged">Damaged / waste</option>
                </select>
              </Field>

              <Field label="Selling Price KES (Optional)" htmlFor="sellingPrice">
                <input
                  id="sellingPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g. 1200"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(e.target.value)}
                />
              </Field>
            </div>

            <Field label="Notes (Optional)" htmlFor="productionNotes" className="kf-field--full">
              <input
                id="productionNotes"
                type="text"
                placeholder="e.g. Morning collection, Grade A"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Field>

            <div className="kf-form-actions">
              {editingId && (
                <Button variant="ghost" type="button" onClick={resetForm}>
                  Cancel Edit
                </Button>
              )}
              <Button type="submit" loading={saving}>
                {editingId ? "Update Production" : "Add Production"}
              </Button>
            </div>
          </form>
        </Panel>

        {/* Records Table */}
        <Panel
          title={`Production Records (${records.length})`}
          subtitle="All production entries stored in your farm database."
          actions={
            <Segmented
              label="Filter by type"
              options={TYPE_OPTIONS}
              value={typeFilter}
              onChange={setTypeFilter}
            />
          }
        >
          {loading ? (
            <EmptyState title="Loading production records…" />
          ) : filteredRecords.length === 0 ? (
            <EmptyState
              icon={<Egg size={26} />}
              title="No production records yet"
              description="Add your first production record using the form above."
            />
          ) : (
            <div className="kf-table-wrap">
              <table className="kf-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Quantity</th>
                    <th>Unit</th>
                    <th>Destination</th>
                    <th>Selling Price KES</th>
                    <th>Notes</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((record) => (
                    <tr key={record.id}>
                      <td>{record.date}</td>
                      <td>
                        <Badge tone={record.type === "eggs" ? "amber" : "blue"}>
                          {record.type === "eggs" ? "Eggs" : "Milk"}
                        </Badge>
                      </td>
                      <td><strong>{record.quantity}</strong></td>
                      <td>{record.unit}</td>
                      <td>{record.destination ?? "—"}</td>
                      <td>{record.sellingPrice !== undefined ? record.sellingPrice.toLocaleString() : "—"}</td>
                      <td>
                        {record.notes
                          ? <span style={{ fontSize: 12, color: "var(--kf-text-muted)" }}>{record.notes}</span>
                          : "—"
                        }
                      </td>
                      <td>
                        <div className="kf-actions-cell">
                          <IconButton
                            label="Edit"
                            icon={<Pencil size={16} />}
                            onClick={() => startEdit(record)}
                          />
                          <IconButton
                            label="Delete"
                            tone="danger"
                            icon={<Trash2 size={16} />}
                            onClick={() => handleDelete(record.id)}
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
      </div>

      {/* Delete confirmation modal */}
      <Modal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Delete record?"
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
        <p>Are you sure you want to delete this production record? This cannot be undone.</p>
      </Modal>
    </main>
  );
}
