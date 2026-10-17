import type {
  FarmProfile,
  PoultryBatch,
  LivestockAnimal,
  ProductionRecord,
  FeedingRecord,
  ExpenseRecord,
  ReminderItem,
  AdviceItem,
} from "../types/farm";

import { getToken } from "./authService";

const API_URL = (import.meta.env.VITE_API_URL ?? "http://localhost:3001").replace(/\/+$/, "");

const STORAGE_KEYS = {
  profile: "kukumifugo_profile",
  reminders: "kukumifugo_reminders",
  advice: "kukumifugo_advice",
};

function getAuthHeaders(): HeadersInit {
  const token = getToken();

  if (!token) {
    throw new Error("You must be logged in.");
  }

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(
    `${API_URL}${endpoint}`,
    {
      ...options,
      headers: {
        ...getAuthHeaders(),
        ...(options.headers || {}),
      },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error || "Request failed."
    );
  }

  return data;
}

/* =====================================================
   FARM PROFILE
   ===================================================== */

export function saveFarmProfile(
  profile: FarmProfile
): void {
  localStorage.setItem(
    STORAGE_KEYS.profile,
    JSON.stringify(profile)
  );
}

export function loadFarmProfile(): FarmProfile | null {
  const stored = localStorage.getItem(
    STORAGE_KEYS.profile
  );

  if (!stored) {
    return null;
  }

  try {
    return JSON.parse(stored) as FarmProfile;
  } catch {
    return null;
  }
}

/* =====================================================
   POULTRY
   ===================================================== */

function mapPoultry(row: any): PoultryBatch {
  return {
    id: String(row.id),
    breed: row.breed,
    purpose: row.purpose,
    initialCount: Number(row.initial_count),
    currentCount: Number(row.current_count),
    ageWeeks: Number(row.age_weeks),
    dateAdded: row.date_added,
  };
}

export async function loadPoultry(): Promise<PoultryBatch[]> {
  const data = await apiRequest<{
    poultry: any[];
  }>("/api/farm/poultry");

  return (data.poultry || []).map(mapPoultry);
}

export async function addPoultry(
  poultry: Omit<PoultryBatch, "id">
): Promise<PoultryBatch> {
  const data = await apiRequest<{
    message: string;
    id: string;
  }>("/api/farm/poultry", {
    method: "POST",
    body: JSON.stringify({
      breed: poultry.breed,
      purpose: poultry.purpose,
      initialCount: poultry.initialCount,
      currentCount: poultry.currentCount,
      ageWeeks: poultry.ageWeeks,
      dateAdded: poultry.dateAdded,
    }),
  });

  return {
    ...poultry,
    id: data.id,
  };
}

export async function updatePoultry(
  id: string,
  poultry: Omit<PoultryBatch, "id">
): Promise<void> {
  await apiRequest(
    `/api/farm/poultry/${encodeURIComponent(id)}`,
    {
      method: "PUT",
      body: JSON.stringify({
        breed: poultry.breed,
        purpose: poultry.purpose,
        initialCount: poultry.initialCount,
        currentCount: poultry.currentCount,
        ageWeeks: poultry.ageWeeks,
        dateAdded: poultry.dateAdded,
      }),
    }
  );
}

export async function deletePoultry(
  id: string
): Promise<void> {
  await apiRequest(
    `/api/farm/poultry/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
    }
  );
}

/* =====================================================
   LIVESTOCK
   ===================================================== */

function mapLivestock(row: any): LivestockAnimal {
  return {
    id: String(row.id),
    name: row.name,
    type: row.type,
    breed: row.breed,
    ageYears: Number(row.age_years),
    dateAdded: row.date_added,
  };
}

export async function loadLivestock(): Promise<LivestockAnimal[]> {
  const data = await apiRequest<{
    livestock: any[];
  }>("/api/farm/livestock");

  return (data.livestock || []).map(mapLivestock);
}

export async function addLivestock(
  livestock: Omit<LivestockAnimal, "id">
): Promise<LivestockAnimal> {
  const data = await apiRequest<{
    message: string;
    id: string;
  }>("/api/farm/livestock", {
    method: "POST",
    body: JSON.stringify({
      name: livestock.name,
      type: livestock.type,
      breed: livestock.breed,
      ageYears: livestock.ageYears,
      dateAdded: livestock.dateAdded,
    }),
  });

  return {
    ...livestock,
    id: data.id,
  };
}

export async function updateLivestock(
  id: string,
  livestock: Omit<LivestockAnimal, "id">
): Promise<void> {
  await apiRequest(
    `/api/farm/livestock/${encodeURIComponent(id)}`,
    {
      method: "PUT",
      body: JSON.stringify({
        name: livestock.name,
        type: livestock.type,
        breed: livestock.breed,
        ageYears: livestock.ageYears,
        dateAdded: livestock.dateAdded,
      }),
    }
  );
}

export async function deleteLivestock(
  id: string
): Promise<void> {
  await apiRequest(
    `/api/farm/livestock/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
    }
  );
}

/* =====================================================
   PRODUCTION
   ===================================================== */

export async function loadProduction(): Promise<ProductionRecord[]> {
  const data = await apiRequest<{
    production: ProductionRecord[];
  }>("/api/farm/production");

  return data.production || [];
}

export async function addProduction(
  production: Omit<ProductionRecord, "id">
): Promise<ProductionRecord> {
  const data = await apiRequest<{
    message: string;
    id: string;
  }>("/api/farm/production", {
    method: "POST",
    body: JSON.stringify({
      type: production.type,
      quantity: production.quantity,
      unit: production.unit,
      date: production.date,
    }),
  });

  return {
    ...production,
    id: data.id,
  };
}

export async function updateProduction(
  id: string,
  production: Omit<ProductionRecord, "id">
): Promise<void> {
  await apiRequest(
    `/api/farm/production/${encodeURIComponent(id)}`,
    {
      method: "PUT",
      body: JSON.stringify({
        type: production.type,
        quantity: production.quantity,
        unit: production.unit,
        date: production.date,
      }),
    }
  );
}

export async function deleteProduction(
  id: string
): Promise<void> {
  await apiRequest(
    `/api/farm/production/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
    }
  );
}

/* =====================================================
   FEEDING
   ===================================================== */

function mapFeeding(row: any): FeedingRecord {
  return {
    id: String(row.id),
    animalType: row.animal_type,
    feedType: row.feed_type,
    quantity: Number(row.quantity),
    unit: row.unit,
    date: row.date,
  };
}

export async function loadFeeding(): Promise<FeedingRecord[]> {
  const data = await apiRequest<{
    feeding: any[];
  }>("/api/farm/feeding");

  return (data.feeding || []).map(mapFeeding);
}

export async function addFeeding(
  feeding: Omit<FeedingRecord, "id">
): Promise<FeedingRecord> {
  const data = await apiRequest<{
    message: string;
    id: string;
  }>("/api/farm/feeding", {
    method: "POST",
    body: JSON.stringify({
      animalType: feeding.animalType,
      feedType: feeding.feedType,
      quantity: feeding.quantity,
      unit: feeding.unit,
      date: feeding.date,
    }),
  });

  return {
    ...feeding,
    id: data.id,
  };
}

export async function updateFeeding(
  id: string,
  feeding: Omit<FeedingRecord, "id">
): Promise<void> {
  await apiRequest(
    `/api/farm/feeding/${encodeURIComponent(id)}`,
    {
      method: "PUT",
      body: JSON.stringify({
        animalType: feeding.animalType,
        feedType: feeding.feedType,
        quantity: feeding.quantity,
        unit: feeding.unit,
        date: feeding.date,
      }),
    }
  );
}

export async function deleteFeeding(
  id: string
): Promise<void> {
  await apiRequest(
    `/api/farm/feeding/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
    }
  );
}

/* =====================================================
   EXPENSES
   ===================================================== */

export async function loadExpenses(): Promise<ExpenseRecord[]> {
  const data = await apiRequest<{
    expenses: ExpenseRecord[];
  }>("/api/farm/expenses");

  return data.expenses || [];
}

export async function addExpense(
  expense: Omit<ExpenseRecord, "id">
): Promise<ExpenseRecord> {
  const data = await apiRequest<{
    message: string;
    id: string;
  }>("/api/farm/expenses", {
    method: "POST",
    body: JSON.stringify({
      category: expense.category,
      description: expense.description,
      amount: expense.amount,
      date: expense.date,
    }),
  });

  return {
    ...expense,
    id: data.id,
  };
}

export async function updateExpense(
  id: string,
  expense: Omit<ExpenseRecord, "id">
): Promise<void> {
  await apiRequest(
    `/api/farm/expenses/${encodeURIComponent(id)}`,
    {
      method: "PUT",
      body: JSON.stringify({
        category: expense.category,
        description: expense.description,
        amount: expense.amount,
        date: expense.date,
      }),
    }
  );
}

export async function deleteExpense(
  id: string
): Promise<void> {
  await apiRequest(
    `/api/farm/expenses/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
    }
  );
}

/* =====================================================
   REMINDERS
   ===================================================== */

export function saveReminders(
  reminders: ReminderItem[]
): void {
  localStorage.setItem(
    STORAGE_KEYS.reminders,
    JSON.stringify(reminders)
  );
}

export function loadReminders(): ReminderItem[] {
  const stored = localStorage.getItem(
    STORAGE_KEYS.reminders
  );

  if (!stored) {
    return [];
  }

  try {
    return JSON.parse(stored) as ReminderItem[];
  } catch {
    return [];
  }
}

/* =====================================================
   AI ADVICE
   ===================================================== */

export function saveAdvice(
  advice: AdviceItem[]
): void {
  localStorage.setItem(
    STORAGE_KEYS.advice,
    JSON.stringify(advice)
  );
}

export function loadAdvice(): AdviceItem[] {
  const stored = localStorage.getItem(
    STORAGE_KEYS.advice
  );

  if (!stored) {
    return [];
  }

  try {
    return JSON.parse(stored) as AdviceItem[];
  } catch {
    return [];
  }
}
