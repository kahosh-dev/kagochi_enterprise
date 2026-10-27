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
import {
  Coins,
  TrendingDown,
  TrendingUp,
  Edit2,
  Trash2,
} from "lucide-react";

export default function ExpensesView() {
  const [activeTab, setActiveTab] = useState<"income" | "expense">("expense");
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [incomes, setIncomes] = useState<IncomeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);

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
      console.error(error);
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

  function startEdit(item: any, type: "income" | "expense") {
    setActiveTab(type);
    setEditingId(item.id);
    setCategory(item.category);
    setDescription(item.description);
    setAmount(String(item.amount));
    setDate(item.date ? item.date.slice(0, 10) : new Date().toISOString().slice(0, 10));
    setQuantity(item.quantity ? String(item.quantity) : "");
    setUnit(item.unit || "");
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
          setSuccessMsg("✓ Income record updated.");
        } else {
          await addIncome(payload);
          setSuccessMsg(`✓ Recorded income of KES ${amt.toLocaleString()} (${category}).`);
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
          setSuccessMsg("✓ Expense record updated.");
        } else {
          await addExpense(payload);
          setSuccessMsg(`✓ Recorded expense of KES ${amt.toLocaleString()} (${category}).`);
        }
      }

      await refreshData();
      resetForm();
    } catch (err) {
      console.error(err);
      setErrorMsg(err instanceof Error ? err.message : "Failed to save record.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, desc: string, type: "income" | "expense") {
    if (!window.confirm(`Delete record "${desc}"?`)) return;
    try {
      if (type === "income") await deleteIncome(id);
      else await deleteExpense(id);
      setSuccessMsg("✓ Record deleted.");
      await refreshData();
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to delete record.");
    }
  }

  return (
    <div className="view-container">
      {/* Header */}
      <div className="view-header-row">
        <div>
          <h2>Record Income or Expense (Profit & Loss Ledger)</h2>
          <p className="view-subtitle">
            Track daily sales, operating expenses, and cashflow in Kenyan Shillings (KES).
          </p>
          {loading && <p style={{ color: "#64748b", margin: "0.25rem 0" }}>Loading ledger records...</p>}
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="poultry-kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon-wrap" style={{ background: "#ecfdf5", color: "#059669" }}>
            <Coins size={26} />
          </div>
          <div>
            <span className="kpi-label">Total Farm Income</span>
            <h3 className="kpi-value">KES {totalIncome.toLocaleString()}</h3>
            <span className="kpi-desc">Sales of eggs, milk & animals</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon-wrap" style={{ background: "#fef2f2", color: "#dc2626" }}>
            <TrendingDown size={26} />
          </div>
          <div>
            <span className="kpi-label">Total Expenses</span>
            <h3 className="kpi-value">KES {totalExpense.toLocaleString()}</h3>
            <span className="kpi-desc">Feed, labor, vaccines & maintenance</span>
          </div>
        </div>

        <div className="kpi-card">
          <div
            className="kpi-icon-wrap"
            style={{
              background: isProfitable ? "#ecfdf5" : "#fef2f2",
              color: isProfitable ? "#059669" : "#dc2626",
            }}
          >
            {isProfitable ? <TrendingUp size={26} /> : <TrendingDown size={26} />}
          </div>
          <div>
            <span className="kpi-label">Operating Profit / Loss</span>
            <h3 className="kpi-value" style={{ color: isProfitable ? "#059669" : "#dc2626" }}>
              {isProfitable ? "+" : ""}KES {netProfitOrLoss.toLocaleString()}
            </h3>
            <span className="kpi-desc">{isProfitable ? "Surplus (In Profit)" : "Deficit (Operating Loss)"}</span>
          </div>
        </div>
      </div>

      {/* Form: Record Income or Expense */}
      <div className="card-box form-card">
        <div className="type-toggle-tabs">
          <button
            type="button"
            className={`type-tab-btn ${activeTab === "income" ? "active-income" : ""}`}
            onClick={() => {
              setActiveTab("income");
              setCategory("Egg Sales");
              setEditingId(null);
            }}
          >
            <Coins size={18} /> Record Farm Income (Sales)
          </button>
          <button
            type="button"
            className={`type-tab-btn ${activeTab === "expense" ? "active-expense" : ""}`}
            onClick={() => {
              setActiveTab("expense");
              setCategory("Poultry Feed");
              setEditingId(null);
            }}
          >
            <TrendingDown size={18} /> Record Farm Expense (Costs)
          </button>
        </div>

        {errorMsg && <div className="daily-alert error-alert">{errorMsg}</div>}
        {successMsg && <div className="daily-alert success-alert">{successMsg}</div>}

        <form onSubmit={handleSubmit} className="poultry-form" style={{ marginTop: 20 }}>
          <div className="form-row-3">
            <div className="form-field">
              <label>{activeTab === "income" ? "Income Category *" : "Expense Category *"}</label>
              {activeTab === "income" ? (
                <select
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
                  <option value="Poultry Sales">Poultry Sales (Chickens/Broilers)</option>
                  <option value="Cattle Sales">Cattle / Calf Sales</option>
                  <option value="Manure Sales">Manure Sales</option>
                  <option value="Other Farm Income">Other Farm Income</option>
                </select>
              ) : (
                <select value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option value="Poultry Feed">Poultry Feed (Mash / Pellets)</option>
                  <option value="Cattle Feed">Cattle Feed (Dairy Meal / Hay / Silage)</option>
                  <option value="Chicks Purchased">Chicks Purchased (Day-old)</option>
                  <option value="Cattle Purchased">Cattle / Calf Purchased</option>
                  <option value="Vaccines & Medication">Vaccines & Medication</option>
                  <option value="Veterinary Services">Veterinary Services</option>
                  <option value="Farm Labor">Farm Labor</option>
                  <option value="Transport">Transport & Logistics</option>
                  <option value="Water & Electricity">Water & Electricity</option>
                  <option value="Equipment & Repairs">Equipment & Housing Repairs</option>
                  <option value="Packaging">Packaging (Egg trays, etc.)</option>
                  <option value="Other Operating Expense">Other Operating Expense</option>
                </select>
              )}
            </div>

            <div className="form-field">
              <label>Amount (KES) *</label>
              <input
                type="number"
                placeholder="e.g. 5000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>

            <div className="form-field">
              <label>Transaction Date *</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-row-2">
            <div className="form-field" style={{ flex: 2 }}>
              <label>Description / Notes *</label>
              <input
                type="text"
                placeholder={
                  activeTab === "income"
                    ? "e.g. Sold 15 trays of eggs to local bakery"
                    : "e.g. Bought 2 bags of layers mash from Agrovet"
                }
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>

            {activeTab === "income" && (
              <div className="form-field" style={{ flex: 1 }}>
                <label>Quantity & Unit (Optional)</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type="number"
                    placeholder="Qty"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="Unit"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="form-buttons-row">
            {editingId && (
              <button type="button" className="btn-secondary" onClick={resetForm}>
                Cancel Edit
              </button>
            )}
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Saving..." : editingId ? "Update Record" : activeTab === "income" ? "+ Save Income" : "+ Save Expense"}
            </button>
          </div>
        </form>
      </div>

      {/* Financial Records Tables */}
      <div className="card-box">
        <h3 className="card-heading">
          {activeTab === "income" ? `Recorded Farm Income (${incomes.length})` : `Recorded Farm Expenses (${expenses.length})`}
        </h3>

        {activeTab === "income" ? (
          incomes.length === 0 ? (
            <div className="empty-state">
              <Coins size={48} />
              <h4>No income records yet</h4>
              <p>Record your egg, milk, or chicken sales above to track farm profits.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="modern-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Category</th>
                    <th>Description</th>
                    <th>Qty / Unit</th>
                    <th>Amount (KES)</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {incomes.map((inc) => (
                    <tr key={inc.id}>
                      <td>{inc.date ? inc.date.slice(0, 10) : "—"}</td>
                      <td>
                        <span className="badge-stage badge-layers">{inc.category}</span>
                      </td>
                      <td>{inc.description}</td>
                      <td>{inc.quantity ? `${inc.quantity} ${inc.unit || ""}` : "—"}</td>
                      <td>
                        <strong style={{ color: "#059669" }}>+KES {Number(inc.amount).toLocaleString()}</strong>
                      </td>
                      <td>
                        <div className="row-actions">
                          <button className="btn-icon" onClick={() => startEdit(inc, "income")}>
                            <Edit2 size={16} />
                          </button>
                          <button
                            className="btn-icon delete-icon"
                            onClick={() => handleDelete(inc.id, inc.description, "income")}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : expenses.length === 0 ? (
          <div className="empty-state">
            <TrendingDown size={48} />
            <h4>No expense records yet</h4>
            <p>Record your feed, vet, and operating costs above.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="modern-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Amount (KES)</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((exp) => (
                  <tr key={exp.id}>
                    <td>{exp.date ? exp.date.slice(0, 10) : "—"}</td>
                    <td>
                      <span className="badge-stage badge-broilers">{exp.category}</span>
                    </td>
                    <td>{exp.description}</td>
                    <td>
                      <strong style={{ color: "#b91c1c" }}>-KES {Number(exp.amount).toLocaleString()}</strong>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button className="btn-icon" onClick={() => startEdit(exp, "expense")}>
                          <Edit2 size={16} />
                        </button>
                        <button
                          className="btn-icon delete-icon"
                          onClick={() => handleDelete(exp.id, exp.description, "expense")}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
