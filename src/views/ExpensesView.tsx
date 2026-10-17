import { useEffect, useState } from "react";
import {
  loadExpenses,
  addExpense,
  updateExpense,
  deleteExpense,
} from "../services/storage";
import type { ExpenseRecord } from "../types/farm";

export default function ExpensesView() {
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [category, setCategory] = useState("Feed");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  async function refreshExpenses() {
    try {
      setLoading(true);
      const data = await loadExpenses();
      setExpenses(data);
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Failed to load expenses.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshExpenses();
  }, []);

  function resetForm() {
    setEditingId(null);
    setCategory("Feed");
    setDescription("");
    setAmount("");
    setDate(new Date().toISOString().split("T")[0]);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const value = Number(amount);

    if (!description.trim()) {
      alert("Please enter an expense description.");
      return;
    }

    if (!Number.isFinite(value) || value <= 0) {
      alert("Please enter a valid expense amount.");
      return;
    }

    try {
      setSaving(true);

      const expense = {
        category,
        description: description.trim(),
        amount: value,
        date,
      };

      if (editingId) {
        await updateExpense(editingId, expense);
      } else {
        await addExpense(expense);
      }

      await refreshExpenses();
      resetForm();
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Failed to save expense.");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(expense: ExpenseRecord) {
    setEditingId(expense.id);
    setCategory(expense.category);
    setDescription(expense.description);
    setAmount(String(expense.amount));
    setDate(expense.date);
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Are you sure you want to delete this expense?")) {
      return;
    }

    try {
      await deleteExpense(id);
      await refreshExpenses();

      if (editingId === id) {
        resetForm();
      }
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Failed to delete expense.");
    }
  }

  const totalExpenses = expenses.reduce(
    (sum, expense) => sum + Number(expense.amount),
    0
  );

  const feedExpenses = expenses
    .filter((expense) => expense.category.toLowerCase() === "feed")
    .reduce((sum, expense) => sum + Number(expense.amount), 0);

  const otherExpenses = totalExpenses - feedExpenses;

  return (
    <div className="management-page">
      <div className="page-heading">
        <div>
          <h1>Expense Management</h1>
          <p>Track farm costs and monitor where your money is being spent.</p>
        </div>
      </div>

      <div className="summary-grid">
        <div className="summary-card">
          <div className="summary-icon"><img src="https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=80&q=70" alt="Expenses" className="summary-icon-img" /></div>
          <div><span className="summary-label">Total Expenses</span><strong>KSh {totalExpenses.toLocaleString()}</strong><small>All recorded costs</small></div>
        </div>
        <div className="summary-card">
          <div className="summary-icon"><img src="https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=80&q=70" alt="Records" className="summary-icon-img" /></div>
          <div><span className="summary-label">Expense Records</span><strong>{expenses.length}</strong><small>Total entries</small></div>
        </div>
        <div className="summary-card">
          <div className="summary-icon"><img src="https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=80&q=70" alt="Feed" className="summary-icon-img" /></div>
          <div><span className="summary-label">Feed Costs</span><strong>KSh {feedExpenses.toLocaleString()}</strong><small>Feed-related expenses</small></div>
        </div>
        <div className="summary-card">
          <div className="summary-icon"><img src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=80&q=70" alt="Other" className="summary-icon-img" /></div>
          <div><span className="summary-label">Other Costs</span><strong>KSh {otherExpenses.toLocaleString()}</strong><small>Other farm expenses</small></div>
        </div>
      </div>

      <div className="management-card">
        <div className="card-heading">
          <div>
            <h2>{editingId ? "Edit Expense" : "Add Expense"}</h2>
            <p>Record a farm expense and keep your financial records updated.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-field">
              <label>Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="Feed">Feed</option>
                <option value="Equipment">Equipment</option>
                <option value="Transport">Transport</option>
                <option value="Labour">Labour</option>
                <option value="Utilities">Utilities</option>
                <option value="Veterinary">Veterinary</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="form-field">
              <label>Description</label>
              <input
                type="text"
                placeholder="e.g. Dairy meal"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="form-field">
              <label>Amount (KSh)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 2500"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            <div className="form-field">
              <label>Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          <div className="form-actions">
            <button
              type="submit"
              className="primary-button"
              disabled={saving}
            >
              {saving
                ? "Saving..."
                : editingId
                ? "Update Expense"
                : "Add Expense"}
            </button>

            {editingId && (
              <button
                type="button"
                className="secondary-button"
                onClick={resetForm}
              >
                Cancel Edit
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="management-card">
        <div className="card-heading">
          <div>
            <h2>Expense Records</h2>
            <p>All farm expenses stored in your database.</p>
          </div>

          <span className="record-count">
            {expenses.length} record{expenses.length === 1 ? "" : "s"}
          </span>
        </div>

        {loading ? (
          <div className="empty-state">
            <p>Loading expenses...</p>
          </div>
        ) : expenses.length === 0 ? (
          <div className="empty-state">
            <h3>No expense records yet</h3>
            <p>Add your first expense using the form above.</p>
          </div>
        ) : (
          <div className="records-grid">
            {expenses.map((expense) => (
              <div className="record-card" key={expense.id}>
                <div className="record-card-top">
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div className="record-avatar"><img src="https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=80&q=70" alt="Expense" className="record-avatar-img" /></div>
                    <div><h3>{expense.description}</h3><span className="record-badge">{expense.category}</span></div>
                  </div>

                  <div className="record-actions">
                    <button
                      type="button"
                      className="edit-button"
                      onClick={() => startEdit(expense)}
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      className="delete-button"
                      onClick={() => handleDelete(expense.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="record-details">
                  <div>
                    <span>Amount</span>
                    <strong>
                      KSh {Number(expense.amount).toLocaleString()}
                    </strong>
                  </div>

                  <div>
                    <span>Date</span>
                    <strong>{expense.date}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}