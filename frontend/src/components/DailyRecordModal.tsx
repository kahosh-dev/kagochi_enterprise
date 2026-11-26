import { useState } from "react";
import {
  X,
  PlusCircle,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import {
  addIncome,
  addExpense,
  addProduction,
  addFeeding,
  addVaccination,
} from "../services/storage";
import { getNairobiDateString } from "../utils/datePeriod";

interface DailyRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRecordSaved: () => void;
}

type ActivityCategory = "income" | "expense" | "production" | "feeding" | "vaccination";

export default function DailyRecordModal({
  isOpen,
  onClose,
  onRecordSaved,
}: DailyRecordModalProps) {
  const todayStr = getNairobiDateString();
  const [activityDate, setActivityDate] = useState(todayStr);
  const [activeTab, setActiveTab] = useState<ActivityCategory>("income");

  // Income state
  const [incomeCategory, setIncomeCategory] = useState("Egg Sales");
  const [incomeAmount, setIncomeAmount] = useState("");
  const [incomeQuantity, setIncomeQuantity] = useState("");
  const [incomeUnit, setIncomeUnit] = useState("trays");
  const [incomeDescription, setIncomeDescription] = useState("");

  // Expense state
  const [expenseCategory, setExpenseCategory] = useState("Poultry Feed");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseDescription, setExpenseDescription] = useState("");

  // Production state
  const [productionType, setProductionType] = useState<"eggs" | "milk">("eggs");
  const [productionQuantity, setProductionQuantity] = useState("");
  const [productionUnit, setProductionUnit] = useState("trays");

  // Feeding state
  const [feedingAnimalType, setFeedingAnimalType] = useState("Chickens");
  const [feedingFeedType, setFeedingFeedType] = useState("Layers Mash");
  const [feedingQuantity, setFeedingQuantity] = useState("");
  const [feedingUnit, setFeedingUnit] = useState("kg");
  const [feedingCost, setFeedingCost] = useState("");

  // Vaccination state
  const [vacSpecies, setVacSpecies] = useState<"poultry" | "cattle">("poultry");
  const [vacTargetName, setVacTargetName] = useState("");
  const [vacName, setVacName] = useState("");
  const [vacDisease, setVacDisease] = useState("");
  const [vacDose, setVacDose] = useState("");

  // UI state
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  if (!isOpen) return null;

  async function handleSave(andAddAnother: boolean = false) {
    setErrorMsg("");
    setSuccessMsg("");

    if (!activityDate) {
      setErrorMsg("Please select the activity date.");
      return;
    }

    try {
      setSaving(true);

      if (activeTab === "income") {
        const amt = parseFloat(incomeAmount);
        if (isNaN(amt) || amt <= 0) {
          setErrorMsg("Please enter a valid income amount in KES.");
          setSaving(false);
          return;
        }
        const desc = incomeDescription.trim() || `${incomeCategory} on ${activityDate}`;
        const qty = parseFloat(incomeQuantity) || 0;

        await addIncome({
          category: incomeCategory,
          description: desc,
          amount: amt,
          date: activityDate,
          quantity: qty,
          unit: incomeUnit,
        });
        setSuccessMsg(`✓ Saved income: KES ${amt.toLocaleString()} (${incomeCategory})`);
        setIncomeAmount("");
        setIncomeQuantity("");
        setIncomeDescription("");
      } else if (activeTab === "expense") {
        const amt = parseFloat(expenseAmount);
        if (isNaN(amt) || amt <= 0) {
          setErrorMsg("Please enter a valid expense amount in KES.");
          setSaving(false);
          return;
        }
        const desc = expenseDescription.trim() || `${expenseCategory} on ${activityDate}`;

        await addExpense({
          category: expenseCategory,
          description: desc,
          amount: amt,
          date: activityDate,
        });
        setSuccessMsg(`✓ Saved expense: KES ${amt.toLocaleString()} (${expenseCategory})`);
        setExpenseAmount("");
        setExpenseDescription("");
      } else if (activeTab === "production") {
        const qty = parseFloat(productionQuantity);
        if (isNaN(qty) || qty <= 0) {
          setErrorMsg("Please enter a valid production quantity.");
          setSaving(false);
          return;
        }

        await addProduction({
          type: productionType,
          quantity: qty,
          unit: productionUnit,
          date: activityDate,
          destination: "produced",
          sellingPrice: 0,
          animalType: productionType === "eggs" ? "Poultry" : "Cattle",
          notes: "",
        });
        setSuccessMsg(`✓ Recorded production: ${qty} ${productionUnit} of ${productionType}`);
        setProductionQuantity("");
      } else if (activeTab === "feeding") {
        const qty = parseFloat(feedingQuantity);
        if (isNaN(qty) || qty <= 0) {
          setErrorMsg("Please enter a valid feed quantity.");
          setSaving(false);
          return;
        }
        const cost = parseFloat(feedingCost) || 0;

        await addFeeding({
          animalType: feedingAnimalType,
          feedType: feedingFeedType,
          quantity: qty,
          unit: feedingUnit,
          date: activityDate,
          cost,
          notes: "",
        });
        setSuccessMsg(`✓ Recorded feeding: ${qty} ${feedingUnit} ${feedingFeedType}`);
        setFeedingQuantity("");
        setFeedingCost("");
      } else if (activeTab === "vaccination") {
        if (!vacName.trim()) {
          setErrorMsg("Please enter the vaccine name.");
          setSaving(false);
          return;
        }

        await addVaccination({
          species: vacSpecies,
          targetType: vacSpecies === "poultry" ? "batch" : "animal",
          targetId: "direct-entry",
          targetName: vacTargetName.trim() || (vacSpecies === "poultry" ? "Main Flock" : "Herd"),
          vaccineName: vacName.trim(),
          disease: vacDisease.trim() || "Preventative",
          dateAdministered: activityDate,
          dateDue: activityDate,
          dose: vacDose.trim(),
          administeredBy: "Farmer",
          status: "completed",
          notes: "Recorded via Daily Activities",
        });
        setSuccessMsg(`✓ Saved administered vaccine: ${vacName.trim()}`);
        setVacName("");
        setVacDisease("");
        setVacDose("");
      }

      onRecordSaved();

      if (!andAddAnother) {
        setTimeout(() => {
          onClose();
        }, 800);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err instanceof Error ? err.message : "Failed to save record.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-card fast-entry-modal">
        {/* Header */}
        <div className="modal-header">
          <div>
            <h2 className="modal-title">Record Farm Activity</h2>
            <p className="modal-subtitle">Quickly log income, expenses, feeding or production</p>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {/* Date Selector Row */}
        <div className="daily-date-picker-row">
          <label htmlFor="daily-record-date">Activity Date:</label>
          <input
            id="daily-record-date"
            type="date"
            className="daily-date-input"
            value={activityDate}
            max={todayStr}
            onChange={(e) => setActivityDate(e.target.value)}
          />
          {activityDate === todayStr && <span className="today-badge">Today</span>}
        </div>

        {/* Category Tabs */}
        <div className="daily-tabs-bar">
          <button
            type="button"
            className={`daily-tab-btn ${activeTab === "income" ? "active" : ""}`}
            onClick={() => { setActiveTab("income"); setErrorMsg(""); }}
          >
            <span className="daily-tab-farm-media">
              <img src="/images/farm/farm-income.webp" alt="" className="daily-tab-farm-img" />
            </span>
            <span>Income</span>
          </button>
          <button
            type="button"
            className={`daily-tab-btn ${activeTab === "expense" ? "active" : ""}`}
            onClick={() => { setActiveTab("expense"); setErrorMsg(""); }}
          >
            <span className="daily-tab-farm-media">
              <img src="/images/farm/farm-expenses.webp" alt="" className="daily-tab-farm-img" />
            </span>
            <span>Expense</span>
          </button>
          <button
            type="button"
            className={`daily-tab-btn ${activeTab === "production" ? "active" : ""}`}
            onClick={() => { setActiveTab("production"); setErrorMsg(""); }}
          >
            <span className="daily-tab-farm-media">
              <img src="/images/farm/eggs.webp" alt="" className="daily-tab-farm-img" />
            </span>
            <span>Production</span>
          </button>
          <button
            type="button"
            className={`daily-tab-btn ${activeTab === "feeding" ? "active" : ""}`}
            onClick={() => { setActiveTab("feeding"); setErrorMsg(""); }}
          >
            <span className="daily-tab-farm-media">
              <img src="/images/farm/animal-feed.webp" alt="" className="daily-tab-farm-img" />
            </span>
            <span>Feeding</span>
          </button>
          <button
            type="button"
            className={`daily-tab-btn ${activeTab === "vaccination" ? "active" : ""}`}
            onClick={() => { setActiveTab("vaccination"); setErrorMsg(""); }}
          >
            <span className="daily-tab-farm-media">
              <img src="/images/farm/vaccination.webp" alt="" className="daily-tab-farm-img" />
            </span>
            <span>Vaccine</span>
          </button>
        </div>

        {/* Dynamic Form Content */}
        <div className="daily-form-body">
          {errorMsg && (
            <div className="kf-alert kf-alert--error">
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="kf-alert kf-alert--success">
              <CheckCircle2 size={16} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* INCOME TAB */}
          {activeTab === "income" && (
            <div className="form-group-stack">
              <div className="form-row">
                <div className="form-field">
                  <label>Income Type</label>
                  <select
                    value={incomeCategory}
                    onChange={(e) => {
                      setIncomeCategory(e.target.value);
                      if (e.target.value === "Egg Sales") setIncomeUnit("trays");
                      else if (e.target.value === "Milk Sales") setIncomeUnit("litres");
                      else if (e.target.value === "Poultry Sales") setIncomeUnit("birds");
                      else if (e.target.value === "Cattle Sales") setIncomeUnit("heads");
                    }}
                  >
                    <option value="Egg Sales">Egg Sales</option>
                    <option value="Milk Sales">Milk Sales</option>
                    <option value="Poultry Sales">Poultry Sales (Chickens/Broilers)</option>
                    <option value="Cattle Sales">Cattle / Calf Sales</option>
                    <option value="Manure Sales">Manure Sales</option>
                    <option value="Other Farm Income">Other Farm Income</option>
                  </select>
                </div>
                <div className="form-field">
                  <label>Total Amount Received (KES) *</label>
                  <input
                    type="number"
                    placeholder="e.g. 4500"
                    value={incomeAmount}
                    onChange={(e) => setIncomeAmount(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-field">
                  <label>Quantity Sold (Optional)</label>
                  <input
                    type="number"
                    placeholder="e.g. 15"
                    value={incomeQuantity}
                    onChange={(e) => setIncomeQuantity(e.target.value)}
                  />
                </div>
                <div className="form-field">
                  <label>Unit</label>
                  <input
                    type="text"
                    placeholder="trays, litres, birds, bags"
                    value={incomeUnit}
                    onChange={(e) => setIncomeUnit(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-field">
                <label>Description / Buyer Notes</label>
                <input
                  type="text"
                  placeholder="e.g. 15 trays sold to local hotel"
                  value={incomeDescription}
                  onChange={(e) => setIncomeDescription(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* EXPENSE TAB */}
          {activeTab === "expense" && (
            <div className="form-group-stack">
              <div className="form-row">
                <div className="form-field">
                  <label>Expense Category</label>
                  <select
                    value={expenseCategory}
                    onChange={(e) => setExpenseCategory(e.target.value)}
                  >
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
                </div>
                <div className="form-field">
                  <label>Amount Spent (KES) *</label>
                  <input
                    type="number"
                    placeholder="e.g. 3200"
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-field">
                <label>Description / Supplier</label>
                <input
                  type="text"
                  placeholder="e.g. 2 bags of layers mash from Kagochi Agrovet"
                  value={expenseDescription}
                  onChange={(e) => setExpenseDescription(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* PRODUCTION TAB */}
          {activeTab === "production" && (
            <div className="form-group-stack">
              <div className="form-row">
                <div className="form-field">
                  <label>Production Item</label>
                  <select
                    value={productionType}
                    onChange={(e) => {
                      const t = e.target.value as "eggs" | "milk";
                      setProductionType(t);
                      setProductionUnit(t === "eggs" ? "trays" : "litres");
                    }}
                  >
                    <option value="eggs">Eggs Collected</option>
                    <option value="milk">Milk Milked</option>
                  </select>
                </div>
                <div className="form-field">
                  <label>Quantity *</label>
                  <input
                    type="number"
                    placeholder={productionType === "eggs" ? "e.g. 5 or 2.5 trays" : "e.g. 15 litres"}
                    value={productionQuantity}
                    onChange={(e) => setProductionQuantity(e.target.value)}
                    required
                  />
                  {productionType === "eggs" && productionUnit === "trays" && parseFloat(productionQuantity) > 0 && (
                    <small style={{ color: "var(--kf-primary)", display: "block", marginTop: "4px" }}>
                      = {Math.round(parseFloat(productionQuantity) * 30)} individual eggs (@ 30 eggs/tray)
                    </small>
                  )}
                </div>
                <div className="form-field">
                  <label>Unit</label>
                  {productionType === "eggs" ? (
                    <select
                      value={productionUnit}
                      onChange={(e) => setProductionUnit(e.target.value)}
                    >
                      <option value="trays">Trays (default: 30 eggs/tray)</option>
                      <option value="pieces">Pieces (individual eggs)</option>
                    </select>
                  ) : (
                    <input type="text" value="litres" disabled />
                  )}
                </div>
              </div>
              <p className="field-hint">
                Note: Record daily yield in trays for eggs and litres for milk. When sold, record revenue under Income.
              </p>
            </div>
          )}

          {/* FEEDING TAB */}
          {activeTab === "feeding" && (
            <div className="form-group-stack">
              <div className="form-row">
                <div className="form-field">
                  <label>Animals Fed</label>
                  <select
                    value={feedingAnimalType}
                    onChange={(e) => {
                      setFeedingAnimalType(e.target.value);
                      if (e.target.value === "Chickens") setFeedingFeedType("Layers Mash");
                      else if (e.target.value === "Chicks") setFeedingFeedType("Chick Starter Mash");
                      else if (e.target.value === "Broilers") setFeedingFeedType("Broiler Finisher");
                      else if (e.target.value === "Cattle") setFeedingFeedType("Dairy Meal");
                      else if (e.target.value === "Calves") setFeedingFeedType("Calf Starter Pellets");
                    }}
                  >
                    <option value="Chickens">Chickens / Layers</option>
                    <option value="Chicks">Day-old Chicks</option>
                    <option value="Broilers">Broilers</option>
                    <option value="Cattle">Dairy Cattle / Cows</option>
                    <option value="Calves">Calves / Heifers</option>
                  </select>
                </div>
                <div className="form-field">
                  <label>Feed Type</label>
                  <input
                    type="text"
                    value={feedingFeedType}
                    onChange={(e) => setFeedingFeedType(e.target.value)}
                    placeholder="e.g. Layers Mash, Dairy Meal, Hay"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-field">
                  <label>Quantity Fed *</label>
                  <input
                    type="number"
                    placeholder="e.g. 50"
                    value={feedingQuantity}
                    onChange={(e) => setFeedingQuantity(e.target.value)}
                    required
                  />
                </div>
                <div className="form-field">
                  <label>Unit</label>
                  <select
                    value={feedingUnit}
                    onChange={(e) => setFeedingUnit(e.target.value)}
                  >
                    <option value="kg">Kilograms (kg)</option>
                    <option value="bags">Bags</option>
                    <option value="g">Grams (g)</option>
                    <option value="litres">Litres</option>
                  </select>
                </div>
                <div className="form-field">
                  <label>Feed Cost (KES, Optional)</label>
                  <input
                    type="number"
                    placeholder="e.g. 2800"
                    value={feedingCost}
                    onChange={(e) => setFeedingCost(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* VACCINATION TAB */}
          {activeTab === "vaccination" && (
            <div className="form-group-stack">
              <div className="form-row">
                <div className="form-field">
                  <label>Animal Species</label>
                  <select
                    value={vacSpecies}
                    onChange={(e) => setVacSpecies(e.target.value as "poultry" | "cattle")}
                  >
                    <option value="poultry">Poultry (Flock / Batch)</option>
                    <option value="cattle">Cattle (Cow / Calf / Herd)</option>
                  </select>
                </div>
                <div className="form-field">
                  <label>Group / Animal Name</label>
                  <input
                    type="text"
                    placeholder={vacSpecies === "poultry" ? "e.g. Batch A (Broilers)" : "e.g. Neema or Entire Herd"}
                    value={vacTargetName}
                    onChange={(e) => setVacTargetName(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-field">
                  <label>Vaccine Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Newcastle Vaccine, Gumboro, ECF"
                    value={vacName}
                    onChange={(e) => setVacName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-field">
                  <label>Target Disease</label>
                  <input
                    type="text"
                    placeholder="e.g. Newcastle Disease, IBD, FMD"
                    value={vacDisease}
                    onChange={(e) => setVacDisease(e.target.value)}
                  />
                </div>
                <div className="form-field">
                  <label>Dose / Route</label>
                  <input
                    type="text"
                    placeholder="e.g. Eye drop, Drinking water, Injection"
                    value={vacDose}
                    onChange={(e) => setVacDose(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="modal-actions-footer">
          <button
            type="button"
            className="kf-btn kf-btn--secondary"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <div className="action-button-group">
            <button
              type="button"
              className="btn-outline-primary"
              onClick={() => handleSave(true)}
              disabled={saving}
            >
              <PlusCircle size={16} /> Save & Add Another
            </button>
            <button
              type="button"
              className="kf-btn kf-btn--primary"
              onClick={() => handleSave(false)}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Record"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
