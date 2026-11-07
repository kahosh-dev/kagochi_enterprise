import { useEffect, useMemo, useState } from "react";
import {
  loadExpenses,
  addExpense,
  updateExpense,
  deleteExpense,
  loadIncome,
  addIncome,
  updateIncome,
  deleteIncome,
} from "../services/storage";
import type { ExpenseRecord, IncomeRecord } from "../types/farm";
import { Wallet, TrendingDown, TrendingUp, Pencil, Trash2, Plus } from "lucide-react";
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
  CssBar,
} from "../components/ui";
import { formatCurrency } from "../utils/format";

export default function ExpensesView() {
  const [activeTab, setActiveTab] = useState<"income" | "expense">("expense");
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [incomes, setIncomes] = useState<IncomeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; desc: string; type: "income" | "expense" } | null>(null);

  // Form fields
  const [category, setCategory] = useState("Poultry Feed");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  async function refreshData() {
    try {
      setLoading(true);
      const [expData, incData] = await Promise.all([loadExpenses(), loadIncome()]);
      setExpenses(expData);
      setIncomes(incData);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : "Failed to load financial records.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshData();
  }, []);

  const totalIncome = useMemo(
    () => incomes.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    [incomes]
  );
  const totalExpense = useMemo(
    () => expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    [expenses]
  );
  const netProfitOrLoss = totalIncome - totalExpense;
  const isProfitable = netProfitOrLoss >= 0;

  // Category breakdowns (top 8)
  const expenseByCategory = useMemo(() => {
    const map = expenses.reduce<Record<string, number>>((acc, e) => {
      acc[e.category] = (acc[e.category] ?? 0) + Number(e.amount);
      return acc;
    }, {});
    return Object.entries(map)
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [expenses]);

  const incomeByCategory = useMemo(() => {
    const map = incomes.reduce<Record<string, number>>((acc, i) => {
      acc[i.category] = (acc[i.category] ?? 0) + Number(i.amount);
      return acc;
    }, {});
    return Object.entries(map)
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [incomes]);

  const maxExpense = useMemo(
    () => Math.max(...expenseByCategory.map((c) => c.total), 1),
    [expenseByCategory]
  );
  const maxIncome = useMemo(
    () => Math.max(...incomeByCategory.map((c) => c.total), 1),
    [incomeByCategory]
  );

  function resetForm() {
    setEditingId(null);
    setDescription("");
    setAmount("");
    setQuantity("");
    setUnit("");
    setDate(new Date().toISOString().slice(0, 10));
    setCategory(activeTab === "income" ? "Egg Sales" : "Poultry Feed");
    setErrorMsg("");
  }

  function startEdit(item: ExpenseRecord | IncomeRecord, type: "income" | "expense") {
    setActiveTab(type);
    setEditingId(item.id);
    setCategory(item.category);
    setDescription(item.description);
    setAmount(String(item.amount));
    setDate(item.date ? item.date.slice(0, 10) : new Date().toISOString().slice(0, 10));
    const inc = item as IncomeRecord;
    setQuantity(inc.quantity ? String(inc.quantity) : "");
    setUnit(inc.unit || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const amt = parseFloat(amount);
    if (!description.trim()) {
      setErrorMsg("Please enter a description or note.");
      return;
    }
    if (isNaN(amt) || amt <= 0) {
      setErrorMsg("Please enter a valid amount in KES.");
      return;
    }
    if (!date) {
      setErrorMsg("Please select a transaction date.");
      return;
    }

    try {
      setSaving(true);
      if (activeTab === "income") {
        const payload = {
          category,
          description: description.trim(),
          amount: amt,
          date,
          quantity: parseFloat(quantity) || 0,
          unit: unit.trim(),
        };
        if (editingId) {
          await updateIncome(editingId, payload);
          setSuccessMsg("Income record updated.");
        } else {
          await addIncome(payload);
          setSuccessMsg(`Income recorded: KES ${amt.toLocaleString()} (${category}).`);
        }
      } else {
        const payload = {
          category,
          description: description.trim(),
          amount: amt,
          date,
        };
        if (editingId) {
          await updateExpense(editingId, payload);
          setSuccessMsg("Expense record updated.");
        } else {
          await addExpense(payload);
          setSuccessMsg(`Expense recorded: KES ${amt.toLocaleString()} (${category}).`);
        }
      }
      await refreshData();
      resetForm();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to save record.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === "income") await deleteIncome(deleteTarget.id);
      else await deleteExpense(deleteTarget.id);
      setSuccessMsg("Record deleted.");
      setDeleteTarget(null);
      await refreshData();
    } catch (err) {
      setErrorMsg("Failed to delete record.");
      setDeleteTarget(null);
    }
  }

  return (
    <main className="kf-page">
      <PageHeader
        title="Income & Expenses"
        description="Track daily sales, operating expenses, and cashflow in Kenyan Shillings (KES)."
        actions={
          <Button icon={<Plus size={16} />} onClick={() => { resetForm(); window.scrollTo({ top: 380, behavior: "smooth" }); }}>
            Add entry
          </Button>
        }
      />

      {/* Stats */}
      <div className="kf-stat-grid">
        <StatCard
          label="Total Farm Income"
          value={formatCurrency(totalIncome)}
          hint="All recorded sales"
          image="/images/farm/farm-income.webp"
          imageAlt="Farm Income"
          layout="image-right"
          tone="green"
        />
        <StatCard
          label="Total Expenses"
          value={formatCurrency(totalExpense)}
          hint="All recorded costs"
          image="/images/farm/farm-expenses.webp"
          imageAlt="Farm Expenses"
          layout="image-right"
          tone="red"
        />
        <StatCard
          label={isProfitable ? "Operating Profit" : "Operating Loss"}
          value={`${isProfitable ? "+" : ""}${formatCurrency(netProfitOrLoss)}`}
          hint={isProfitable ? "Surplus" : "Deficit"}
          image={isProfitable ? "/images/farm/farm-income.webp" : "/images/farm/operating-loss.webp"}
          imageAlt={isProfitable ? "Operating Profit" : "Operating Loss"}
          layout="image-right"
          tone={isProfitable ? "green" : "red"}
        />
      </div>

      {/* Feedback */}
      {errorMsg && <ErrorBanner message={errorMsg} onRetry={() => setErrorMsg("")} />}
      {successMsg && <Notice tone="success">{successMsg}</Notice>}

      {/* Tab selector */}
      <Segmented
        label="Record type"
        options={[
          { value: "expense", label: "Expenses", icon: <TrendingDown size={15} /> },
          { value: "income", label: "Income", icon: <TrendingUp size={15} /> },
        ]}
        value={activeTab}
        onChange={(v) => {
          setActiveTab(v as "income" | "expense");
          setCategory(v === "income" ? "Egg Sales" : "Poultry Feed");
          setEditingId(null);
        }}
      />

      {/* Category breakdown */}
      <Panel
        title={activeTab === "income" ? "Income by category" : "Expenses by category"}
        subtitle="Top 8 categories"
      >
        {(activeTab === "expense" ? expenseByCategory : incomeByCategory).length === 0 ? (
          <EmptyState compact title="No records yet" description="Add records below to see the breakdown." />
        ) : (
          <div className="kf-bar-chart">
            {(activeTab === "expense" ? expenseByCategory : incomeByCategory).map((c) => (
              <CssBar
                key={c.category}
                label={c.category}
                value={c.total}
                max={activeTab === "expense" ? maxExpense : maxIncome}
                formatted={formatCurrency(c.total)}
                tone={activeTab === "expense" ? "red" : "green"}
              />
            ))}
          </div>
        )}
      </Panel>

      {/* Form */}
      <Panel title={editingId ? `Edit ${activeTab} record` : `Add ${activeTab} record`}>
        <form onSubmit={handleSubmit} className="kf-form">
          <div className="kf-form-grid">
            <Field label={activeTab === "income" ? "Income Category" : "Expense Category"} required>
              {activeTab === "income" ? (
                <select
                  className="kf-input"
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    if (e.target.value === "Egg Sales") setUnit("trays");
                    else if (e.target.value === "Milk Sales") setUnit("litres");
                    else if (e.target.value === "Poultry Sales") setUnit("birds");
                  }}
                >
                  <option value="Egg Sales">Egg Sales</option>
                  <option value="Milk Sales">Milk Sales</option>
                  <option value="Poultry Sales">Poultry Sales</option>
                  <option value="Cattle Sales">Cattle / Calf Sales</option>
                  <option value="Manure Sales">Manure Sales</option>
                  <option value="Other Farm Income">Other Farm Income</option>
                </select>
              ) : (
                <select
                  className="kf-input"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="Poultry Feed">Poultry Feed</option>
                  <option value="Cattle Feed">Cattle Feed</option>
                  <option value="Chicks Purchased">Chicks Purchased</option>
                  <option value="Cattle Purchased">Cattle / Calf Purchased</option>
                  <option value="Vaccines & Medication">Vaccines & Medication</option>
                  <option value="Veterinary Services">Veterinary Services</option>
                  <option value="Farm Labor">Farm Labor</option>
                  <option value="Transport">Transport & Logistics</option>
                  <option value="Water & Electricity">Water & Electricity</option>
                  <option value="Equipment & Repairs">Equipment & Housing Repairs</option>
                  <option value="Packaging">Packaging</option>
                  <option value="Other Operating Expense">Other Operating Expense</option>
                </select>
              )}
            </Field>

            <Field label="Amount (KES)" required>
              <input
                type="number"
                className="kf-input"
                placeholder="e.g. 5000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </Field>

            <Field label="Transaction Date" required>
              <input
                type="date"
                className="kf-input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </Field>

            <Field label="Description / Notes" required className="kf-field--span2">
              <input
                type="text"
                className="kf-input"
                placeholder={
                  activeTab === "income"
                    ? "e.g. Sold 15 trays of eggs to local bakery"
                    : "e.g. Bought 2 bags of layers mash from Agrovet"
                }
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </Field>

            {activeTab === "income" && (
              <>
                <Field label="Quantity (optional)">
                  <input
                    type="number"
                    className="kf-input"
                    placeholder="e.g. 15"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                  />
                </Field>
                <Field label="Unit (optional)">
                  <input
                    type="text"
                    className="kf-input"
                    placeholder="e.g. trays"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                  />
                </Field>
              </>
            )}
          </div>

          <div className="kf-form-actions">
            {editingId && (
              <Button variant="secondary" type="button" onClick={resetForm}>
                Cancel Edit
              </Button>
            )}
            <Button type="submit" variant="primary" loading={saving}>
              <span>
                {saving
                  ? "Saving…"
                  : editingId
                  ? "Update Record"
                  : activeTab === "income"
                  ? "Save Income"
                  : "Save Expense"}
              </span>
            </Button>
          </div>
        </form>
      </Panel>

      {/* Records table */}
      <Panel
        title={
          activeTab === "income"
            ? `Recorded Farm Income (${incomes.length})`
            : `Recorded Farm Expenses (${expenses.length})`
        }
      >
        {loading ? (
          <EmptyState title="Loading…" description="Fetching financial records." />
        ) : activeTab === "income" ? (
          incomes.length === 0 ? (
            <EmptyState
              icon={<Wallet size={40} />}
              title="No income records yet"
              description="Record your egg, milk, or chicken sales above to track farm profits."
            />
          ) : (
            <div className="kf-table-wrap">
              <table className="kf-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Category</th>
                    <th>Description</th>
                    <th>Qty / Unit</th>
                    <th>Amount KES</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {incomes.map((inc) => (
                    <tr key={inc.id}>
                      <td>{inc.date ? inc.date.slice(0, 10) : "—"}</td>
                      <td>{inc.category}</td>
                      <td>{inc.description}</td>
                      <td>{inc.quantity ? `${inc.quantity} ${inc.unit || ""}` : "—"}</td>
                      <td>
                        <strong style={{ color: "var(--kf-green-600, #16a34a)" }}>
                          +{formatCurrency(inc.amount)}
                        </strong>
                      </td>
                      <td>
                        <div className="kf-row-actions">
                          <IconButton
                            label="Edit"
                            icon={<Pencil size={15} />}
                            onClick={() => startEdit(inc, "income")}
                          />
                          <IconButton
                            label="Delete"
                            icon={<Trash2 size={15} />}
                            onClick={() =>
                              setDeleteTarget({ id: inc.id, desc: inc.description, type: "income" })
                            }
                            tone="danger"
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : expenses.length === 0 ? (
          <EmptyState
            icon={<TrendingDown size={40} />}
            title="No expense records yet"
            description="Record your feed, vet, and operating costs above."
          />
        ) : (
          <div className="kf-table-wrap">
            <table className="kf-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Amount KES</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((exp) => (
                  <tr key={exp.id}>
                    <td>{exp.date ? exp.date.slice(0, 10) : "—"}</td>
                    <td>{exp.category}</td>
                    <td>{exp.description}</td>
                    <td>
                      <strong style={{ color: "var(--kf-red)" }}>
                        -{formatCurrency(exp.amount)}
                      </strong>
                    </td>
                    <td>
                      <div className="kf-row-actions">
                        <IconButton
                          label="Edit"
                          icon={<Pencil size={15} />}
                          onClick={() => startEdit(exp, "expense")}
                        />
                        <IconButton
                          label="Delete"
                          icon={<Trash2 size={15} />}
                          onClick={() =>
                            setDeleteTarget({ id: exp.id, desc: exp.description, type: "expense" })
                          }
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
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete record?"
        size="sm"
        footer={
          <div className="kf-modal-footer-actions">
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDelete}>
              Delete
            </Button>
          </div>
        }
      >
        <p>
          Delete <strong>"{deleteTarget?.desc}"</strong>? This action cannot be undone.
        </p>
      </Modal>
    </main>
  );
}
