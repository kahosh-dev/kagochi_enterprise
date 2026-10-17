import { useEffect, useMemo, useState } from "react";
import {
  loadPoultry,
  loadLivestock,
  loadProduction,
  loadFeeding,
  loadExpenses,
} from "../services/storage";

import type {
  PoultryBatch,
  LivestockAnimal,
  ProductionRecord,
  FeedingRecord,
  ExpenseRecord,
} from "../types/farm";

export default function PerformanceView() {
  const [poultry, setPoultry] = useState<PoultryBatch[]>([]);
  const [livestock, setLivestock] = useState<LivestockAnimal[]>([]);
  const [production, setProduction] = useState<ProductionRecord[]>([]);
  const [feeding, setFeeding] = useState<FeedingRecord[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadPerformanceData() {
    try {
      setLoading(true);

      const [
        poultryData,
        livestockData,
        productionData,
        feedingData,
        expenseData,
      ] = await Promise.all([
        loadPoultry(),
        loadLivestock(),
        loadProduction(),
        loadFeeding(),
        loadExpenses(),
      ]);

      setPoultry(poultryData);
      setLivestock(livestockData);
      setProduction(productionData);
      setFeeding(feedingData);
      setExpenses(expenseData);
    } catch (error) {
      console.error(error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to load performance data."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPerformanceData();
  }, []);

  const totalPoultry = useMemo(
    () =>
      poultry.reduce(
        (sum, batch) => sum + Number(batch.currentCount),
        0
      ),
    [poultry]
  );

  const totalLivestock = livestock.length;

  const totalEggs = useMemo(
    () =>
      production
        .filter((record) => record.type === "eggs")
        .reduce((sum, record) => sum + Number(record.quantity), 0),
    [production]
  );

  const totalMilk = useMemo(
    () =>
      production
        .filter((record) => record.type === "milk")
        .reduce((sum, record) => sum + Number(record.quantity), 0),
    [production]
  );

  const totalExpenses = useMemo(
    () =>
      expenses.reduce(
        (sum, expense) => sum + Number(expense.amount),
        0
      ),
    [expenses]
  );

  const totalFeedQuantity = useMemo(
    () =>
      feeding.reduce(
        (sum, record) => sum + Number(record.quantity),
        0
      ),
    [feeding]
  );

  if (loading) {
    return (
      <div className="management-page">
        <div className="empty-state">
          <h2>Loading Farm Performance...</h2>
          <p>Collecting data from your farm database.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="management-page">
      <div className="page-heading">
        <div>
          <h1>Farm Performance</h1>
          <p>
            A summary of your poultry, livestock, production, feeding and
            expenses.
          </p>
        </div>
      </div>

      <div className="summary-grid">
        <div className="summary-card">
          <div className="summary-icon"><img src="https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=80&q=70" alt="Poultry" className="summary-icon-img" /></div>
          <div><span className="summary-label">Poultry</span><strong>{totalPoultry}</strong><small>Current birds</small></div>
        </div>
        <div className="summary-card">
          <div className="summary-icon"><img src="https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?w=80&q=70" alt="Livestock" className="summary-icon-img" /></div>
          <div><span className="summary-label">Livestock</span><strong>{totalLivestock}</strong><small>Registered animals</small></div>
        </div>
        <div className="summary-card">
          <div className="summary-icon"><img src="https://images.unsplash.com/photo-1506976785307-8732e854ad03?w=80&q=70" alt="Eggs" className="summary-icon-img" /></div>
          <div><span className="summary-label">Eggs</span><strong>{totalEggs}</strong><small>Recorded production</small></div>
        </div>
        <div className="summary-card">
          <div className="summary-icon"><img src="https://images.unsplash.com/photo-1550583724-b2692b85b150?w=80&q=70" alt="Milk" className="summary-icon-img" /></div>
          <div><span className="summary-label">Milk</span><strong>{totalMilk}</strong><small>Recorded litres</small></div>
        </div>
        <div className="summary-card">
          <div className="summary-icon"><img src="https://images.unsplash.com/photo-1625246333195-78d9c38ad449?w=80&q=70" alt="Feed" className="summary-icon-img" /></div>
          <div><span className="summary-label">Feed Used</span><strong>{totalFeedQuantity.toFixed(1)}</strong><small>Recorded quantity</small></div>
        </div>
        <div className="summary-card">
          <div className="summary-icon"><img src="https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=80&q=70" alt="Expenses" className="summary-icon-img" /></div>
          <div><span className="summary-label">Expenses</span><strong>KSh {totalExpenses.toLocaleString()}</strong><small>Total recorded costs</small></div>
        </div>
      </div>

      <div className="management-card">
        <div className="card-heading">
          <div>
            <h2>Performance Overview</h2>
            <p>Current farm activity based on recorded data.</p>
          </div>
        </div>

        <div className="records-grid">
          <div className="record-card">
            <div className="record-card-top">
              <div>
                <h3>Poultry Operations</h3>
                <span className="record-badge">
                  {poultry.length} batches
                </span>
              </div>
            </div>

            <div className="record-details">
              <div>
                <span>Current Birds</span>
                <strong>{totalPoultry}</strong>
              </div>

              <div>
                <span>Initial Batches</span>
                <strong>{poultry.length}</strong>
              </div>
            </div>
          </div>

          <div className="record-card">
            <div className="record-card-top">
              <div>
                <h3>Livestock Operations</h3>
                <span className="record-badge">
                  {livestock.length} animals
                </span>
              </div>
            </div>

            <div className="record-details">
              <div>
                <span>Animals</span>
                <strong>{totalLivestock}</strong>
              </div>
            </div>
          </div>

          <div className="record-card">
            <div className="record-card-top">
              <div>
                <h3>Production</h3>
                <span className="record-badge">
                  {production.length} records
                </span>
              </div>
            </div>

            <div className="record-details">
              <div>
                <span>Eggs</span>
                <strong>{totalEggs}</strong>
              </div>

              <div>
                <span>Milk</span>
                <strong>{totalMilk} L</strong>
              </div>
            </div>
          </div>

          <div className="record-card">
            <div className="record-card-top">
              <div>
                <h3>Feeding</h3>
                <span className="record-badge">
                  {feeding.length} records
                </span>
              </div>
            </div>

            <div className="record-details">
              <div>
                <span>Total Feed</span>
                <strong>{totalFeedQuantity.toFixed(1)}</strong>
              </div>
            </div>
          </div>

          <div className="record-card">
            <div className="record-card-top">
              <div>
                <h3>Financial Activity</h3>
                <span className="record-badge">
                  {expenses.length} records
                </span>
              </div>
            </div>

            <div className="record-details">
              <div>
                <span>Total Expenses</span>
                <strong>
                  KSh {totalExpenses.toLocaleString()}
                </strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}