import type {
  FarmProfile,
  PoultryBatch,
  LivestockAnimal,
  ProductionRecord,
  FeedingRecord,
  ExpenseRecord,
  IncomeRecord,
  VaccinationRecord,
  VaccinationSchedule,
  ReminderItem,
  AdviceItem,
  FarmSummaryData,
  PopulationEvent,
  SurvivorSummary,
  MortalitySummary,
} from "../types/farm";

const API_URL = (import.meta.env.VITE_API_URL ?? "http://localhost:3001").replace(/\/+$/, "");

const STORAGE_KEYS = {
  profile: "kukumifugo_profile",
  reminders: "kukumifugo_reminders",
  advice: "kukumifugo_advice",
};

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Request failed.");
  }
  return data;
}

/* =====================================================
   FARM PROFILE
   ===================================================== */
export function saveFarmProfile(profile: FarmProfile): void {
  localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(profile));
}

export function loadFarmProfile(): FarmProfile | null {
  const stored = localStorage.getItem(STORAGE_KEYS.profile);
  if (!stored) return null;
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
    stage: row.stage || "adult",
    source: row.source || "",
    purchasePrice: Number(row.purchase_price || 0),
    notes: row.notes || "",
  };
}

export async function loadPoultry(): Promise<PoultryBatch[]> {
  const data = await apiRequest<{ poultry: any[] }>("/api/farm/poultry");
  return (data.poultry || []).map(mapPoultry);
}

export async function addPoultry(
  poultry: Omit<PoultryBatch, "id">
): Promise<PoultryBatch> {
  const data = await apiRequest<{ message: string; id: string }>("/api/farm/poultry", {
    method: "POST",
    body: JSON.stringify({
      breed: poultry.breed,
      purpose: poultry.purpose,
      initialCount: poultry.initialCount,
      currentCount: poultry.currentCount,
      ageWeeks: poultry.ageWeeks,
      dateAdded: poultry.dateAdded,
      stage: poultry.stage || "adult",
      source: poultry.source || "",
      purchasePrice: poultry.purchasePrice || 0,
      notes: poultry.notes || "",
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
  await apiRequest(`/api/farm/poultry/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify({
      breed: poultry.breed,
      purpose: poultry.purpose,
      initialCount: poultry.initialCount,
      currentCount: poultry.currentCount,
      ageWeeks: poultry.ageWeeks,
      dateAdded: poultry.dateAdded,
      stage: poultry.stage || "adult",
      source: poultry.source || "",
      purchasePrice: poultry.purchasePrice || 0,
      notes: poultry.notes || "",
    }),
  });
}

export async function deletePoultry(id: string): Promise<void> {
  await apiRequest(`/api/farm/poultry/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

/* =====================================================
   LIVESTOCK (CATTLE)
   ===================================================== */
function mapLivestock(row: any): LivestockAnimal {
  return {
    id: String(row.id),
    name: row.name,
    type: row.type || "Cattle",
    breed: row.breed,
    ageYears: Number(row.age_years),
    dateAdded: row.date_added,
    category: row.category || "cow",
    tagNumber: row.tag_number || "",
    sex: row.sex || "female",
    damId: row.dam_id || "",
    status: row.status || "active",
    notes: row.notes || "",
  };
}

export async function loadLivestock(): Promise<LivestockAnimal[]> {
  const data = await apiRequest<{ livestock: any[] }>("/api/farm/livestock");
  return (data.livestock || []).map(mapLivestock);
}

export async function addLivestock(
  livestock: Omit<LivestockAnimal, "id">
): Promise<LivestockAnimal> {
  const data = await apiRequest<{ message: string; id: string }>("/api/farm/livestock", {
    method: "POST",
    body: JSON.stringify({
      name: livestock.name,
      type: livestock.type || "Cattle",
      breed: livestock.breed,
      ageYears: livestock.ageYears,
      dateAdded: livestock.dateAdded,
      category: livestock.category || "cow",
      tagNumber: livestock.tagNumber || "",
      sex: livestock.sex || "female",
      damId: livestock.damId || "",
      status: livestock.status || "active",
      notes: livestock.notes || "",
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
  await apiRequest(`/api/farm/livestock/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify({
      name: livestock.name,
      type: livestock.type || "Cattle",
      breed: livestock.breed,
      ageYears: livestock.ageYears,
      dateAdded: livestock.dateAdded,
      category: livestock.category || "cow",
      tagNumber: livestock.tagNumber || "",
      sex: livestock.sex || "female",
      damId: livestock.damId || "",
      status: livestock.status || "active",
      notes: livestock.notes || "",
    }),
  });
}

export async function deleteLivestock(id: string): Promise<void> {
  await apiRequest(`/api/farm/livestock/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

/* =====================================================
   PRODUCTION
   ===================================================== */
function mapProduction(row: any): ProductionRecord {
  return {
    id: String(row.id),
    type: row.type,
    quantity: Number(row.quantity),
    unit: row.unit,
    date: row.date,
    destination: row.destination || "produced",
    sellingPrice: Number(row.selling_price || 0),
    animalType: row.animal_type || "",
    groupName: row.group_name || "",
    notes: row.notes || "",
  };
}

export async function loadProduction(): Promise<ProductionRecord[]> {
  const data = await apiRequest<{ production: any[] }>("/api/farm/production");
  return (data.production || []).map(mapProduction);
}

export async function addProduction(
  production: Omit<ProductionRecord, "id">
): Promise<ProductionRecord> {
  const data = await apiRequest<{ message: string; id: string }>("/api/farm/production", {
    method: "POST",
    body: JSON.stringify({
      type: production.type,
      quantity: production.quantity,
      unit: production.unit,
      date: production.date,
      destination: production.destination || "produced",
      sellingPrice: production.sellingPrice || 0,
      animalType: production.animalType || (production.type === "eggs" ? "Poultry" : "Cattle"),
      groupName: production.groupName || "",
      targetId: production.targetId || "",
      notes: production.notes || "",
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
  await apiRequest(`/api/farm/production/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify({
      type: production.type,
      quantity: production.quantity,
      unit: production.unit,
      date: production.date,
      destination: production.destination || "produced",
      sellingPrice: production.sellingPrice || 0,
      animalType: production.animalType || (production.type === "eggs" ? "Poultry" : "Cattle"),
      groupName: production.groupName || "",
      targetId: production.targetId || "",
      notes: production.notes || "",
    }),
  });
}

export async function deleteProduction(id: string): Promise<void> {
  await apiRequest(`/api/farm/production/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
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
    cost: Number(row.cost || 0),
    supplier: row.supplier || "",
    groupName: row.group_name || "",
    targetId: row.target_id || "",
    notes: row.notes || "",
  };
}

export async function loadFeeding(): Promise<FeedingRecord[]> {
  const data = await apiRequest<{ feeding: any[] }>("/api/farm/feeding");
  return (data.feeding || []).map(mapFeeding);
}

export async function addFeeding(
  feeding: Omit<FeedingRecord, "id">
): Promise<FeedingRecord> {
  const data = await apiRequest<{ message: string; id: string }>("/api/farm/feeding", {
    method: "POST",
    body: JSON.stringify({
      animalType: feeding.animalType,
      feedType: feeding.feedType,
      quantity: feeding.quantity,
      unit: feeding.unit,
      date: feeding.date,
      cost: feeding.cost || 0,
      supplier: feeding.supplier || "",
      groupName: feeding.groupName || "",
      notes: feeding.notes || "",
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
  await apiRequest(`/api/farm/feeding/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify({
      animalType: feeding.animalType,
      feedType: feeding.feedType,
      quantity: feeding.quantity,
      unit: feeding.unit,
      date: feeding.date,
      cost: feeding.cost || 0,
      supplier: feeding.supplier || "",
      groupName: feeding.groupName || "",
      notes: feeding.notes || "",
    }),
  });
}

export async function deleteFeeding(id: string): Promise<void> {
  await apiRequest(`/api/farm/feeding/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

/* =====================================================
   EXPENSES
   ===================================================== */
export async function loadExpenses(): Promise<ExpenseRecord[]> {
  const data = await apiRequest<{ expenses: ExpenseRecord[] }>("/api/farm/expenses");
  return data.expenses || [];
}

export async function addExpense(
  expense: Omit<ExpenseRecord, "id">
): Promise<ExpenseRecord> {
  const data = await apiRequest<{ message: string; id: string }>("/api/farm/expenses", {
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
  await apiRequest(`/api/farm/expenses/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify({
      category: expense.category,
      description: expense.description,
      amount: expense.amount,
      date: expense.date,
    }),
  });
}

export async function deleteExpense(id: string): Promise<void> {
  await apiRequest(`/api/farm/expenses/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

/* =====================================================
   INCOME
   ===================================================== */
export async function loadIncome(): Promise<IncomeRecord[]> {
  const data = await apiRequest<{ income: IncomeRecord[] }>("/api/farm/income");
  return data.income || [];
}

export async function addIncome(
  income: Omit<IncomeRecord, "id">
): Promise<IncomeRecord> {
  const data = await apiRequest<{ message: string; id: string }>("/api/farm/income", {
    method: "POST",
    body: JSON.stringify({
      category: income.category,
      description: income.description,
      amount: income.amount,
      date: income.date,
      quantity: income.quantity || 0,
      unit: income.unit || "",
    }),
  });
  return {
    ...income,
    id: data.id,
  };
}

export async function updateIncome(
  id: string,
  income: Omit<IncomeRecord, "id">
): Promise<void> {
  await apiRequest(`/api/farm/income/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify({
      category: income.category,
      description: income.description,
      amount: income.amount,
      date: income.date,
      quantity: income.quantity || 0,
      unit: income.unit || "",
    }),
  });
}

export async function deleteIncome(id: string): Promise<void> {
  await apiRequest(`/api/farm/income/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

/* =====================================================
   VACCINATIONS
   ===================================================== */
function mapVaccination(row: any): VaccinationRecord {
  return {
    id: String(row.id),
    species: row.species,
    targetType: row.target_type || "",
    targetId: row.target_id ?? "",
    targetName: row.target_name,
    vaccineName: row.vaccine_name,
    disease: row.disease || "",
    dateAdministered: row.date_administered || null,
    dateDue: row.date_due,
    dose: row.dose || "",
    administeredBy: row.administered_by || "",
    status: row.status || "scheduled",
    countVaccinated: Number(row.count_vaccinated ?? 0),
    notes: row.notes || "",
  };
}

export async function loadVaccinations(): Promise<VaccinationRecord[]> {
  const data = await apiRequest<{ vaccinations: any[] }>("/api/farm/vaccinations");
  return (data.vaccinations || []).map(mapVaccination);
}

export async function addVaccination(
  vac: Omit<VaccinationRecord, "id">
): Promise<VaccinationRecord> {
  const data = await apiRequest<{ message: string; id: string }>("/api/farm/vaccinations", {
    method: "POST",
    body: JSON.stringify({
      species: vac.species,
      targetType: vac.targetType || "",
      targetId: vac.targetId || "",
      targetName: vac.targetName,
      vaccineName: vac.vaccineName,
      disease: vac.disease || "",
      dateAdministered: vac.dateAdministered || "",
      dateDue: vac.dateDue,
      dose: vac.dose || "",
      administeredBy: vac.administeredBy || "",
      status: vac.status || "scheduled",
      countVaccinated: vac.countVaccinated || 0,
      notes: vac.notes || "",
    }),
  });
  return {
    ...vac,
    id: data.id,
  };
}

export async function updateVaccination(
  id: string,
  vac: Omit<VaccinationRecord, "id">
): Promise<void> {
  await apiRequest(`/api/farm/vaccinations/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify({
      species: vac.species,
      targetType: vac.targetType || "",
      targetId: vac.targetId || "",
      targetName: vac.targetName,
      vaccineName: vac.vaccineName,
      disease: vac.disease || "",
      dateAdministered: vac.dateAdministered || "",
      dateDue: vac.dateDue,
      dose: vac.dose || "",
      administeredBy: vac.administeredBy || "",
      status: vac.status || "scheduled",
      countVaccinated: vac.countVaccinated || 0,
      notes: vac.notes || "",
    }),
  });
}

export async function deleteVaccination(id: string): Promise<void> {
  await apiRequest(`/api/farm/vaccinations/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

/* =====================================================
   VACCINATION SCHEDULES
   ===================================================== */
function mapVaccinationSchedule(row: any): VaccinationSchedule {
  return {
    id: String(row.id),
    species: row.species,
    category: row.category,
    vaccineName: row.vaccine_name,
    targetDisease: row.target_disease,
    ageDaysDue: Number(row.age_days_due),
    boosterIntervalDays: Number(row.booster_interval_days || 0),
    notes: row.notes || "",
  };
}

export async function loadVaccinationSchedules(): Promise<VaccinationSchedule[]> {
  const data = await apiRequest<{ vaccination_schedules: any[] }>("/api/farm/vaccination_schedules");
  return (data.vaccination_schedules || []).map(mapVaccinationSchedule);
}

export async function addVaccinationSchedule(
  sch: Omit<VaccinationSchedule, "id">
): Promise<VaccinationSchedule> {
  const data = await apiRequest<{ message: string; id: string }>("/api/farm/vaccination_schedules", {
    method: "POST",
    body: JSON.stringify({
      species: sch.species,
      category: sch.category,
      vaccineName: sch.vaccineName,
      targetDisease: sch.targetDisease,
      ageDaysDue: sch.ageDaysDue,
      boosterIntervalDays: sch.boosterIntervalDays || 0,
      notes: sch.notes || "",
    }),
  });
  return {
    ...sch,
    id: data.id,
  };
}

export async function deleteVaccinationSchedule(id: string): Promise<void> {
  await apiRequest(`/api/farm/vaccination_schedules/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

/* =====================================================
   POPULATION EVENTS
   ===================================================== */
function mapPopulationEvent(row: any): PopulationEvent {
  return {
    id:          String(row.id),
    species:     row.species,
    targetId:    row.target_id,
    targetName:  row.target_name,
    eventType:   row.event_type,
    count:       Number(row.count),
    date:        row.date,
    reason:      row.reason ?? '',
    notes:       row.notes ?? '',
  };
}

export async function loadPopulationEvents(params?: {
  species?: string;
  targetId?: string;
}): Promise<PopulationEvent[]> {
  const qs = new URLSearchParams();
  if (params?.species)  qs.set('species',  params.species);
  if (params?.targetId) qs.set('targetId', params.targetId);
  const query = qs.toString() ? `?${qs}` : '';
  const data = await apiRequest<{ populationEvents: any[] }>(`/api/farm/population-events${query}`);
  return (data.populationEvents || []).map(mapPopulationEvent);
}

export async function addPopulationEvent(
  event: Omit<PopulationEvent, 'id'>
): Promise<{ id: string; warning?: string }> {
  return apiRequest<{ id: string; message: string; warning?: string }>(
    '/api/farm/population-events',
    {
      method: 'POST',
      body: JSON.stringify({
        species:    event.species,
        targetId:   event.targetId,
        targetName: event.targetName,
        eventType:  event.eventType,
        count:      event.count,
        date:       event.date,
        reason:     event.reason,
        notes:      event.notes,
      }),
    }
  );
}

export async function deletePopulationEvent(id: string): Promise<void> {
  await apiRequest(`/api/farm/population-events/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

/* =====================================================
   SURVIVOR SUMMARY
   ===================================================== */
export async function loadSurvivorSummary(params?: {
  species?: string;
  targetId?: string;
}): Promise<SurvivorSummary> {
  const qs = new URLSearchParams();
  if (params?.species)  qs.set('species',  params.species);
  if (params?.targetId) qs.set('targetId', params.targetId);
  const query = qs.toString() ? `?${qs}` : '';
  return apiRequest<SurvivorSummary>(`/api/farm/survivor-summary${query}`);
}

/* =====================================================
   MORTALITY SUMMARY
   ===================================================== */
export async function loadMortalitySummary(params?: {
  from?: string;
  to?: string;
  period?: string;
  species?: string;
  targetId?: string;
}): Promise<MortalitySummary> {
  const qs = new URLSearchParams();
  if (params?.from)     qs.set('from',     params.from);
  if (params?.to)       qs.set('to',       params.to);
  if (params?.period)   qs.set('period',   params.period);
  if (params?.species)  qs.set('species',  params.species);
  if (params?.targetId) qs.set('targetId', params.targetId);
  const query = qs.toString() ? `?${qs}` : '';
  return apiRequest<MortalitySummary>(`/api/farm/mortality-summary${query}`);
}

/* =====================================================
   FARM ANALYTICS SUMMARY
   ===================================================== */
export async function loadFarmSummary(options?: {
  days?: number;
  to?: string;
  from?: string;
}): Promise<FarmSummaryData> {
  const params = new URLSearchParams();
  if (options?.days) params.set("days", String(options.days));
  if (options?.to) params.set("to", options.to);
  if (options?.from) params.set("from", options.from);
  const query = params.toString() ? `?${params.toString()}` : "";
  const data = await apiRequest<{ summary: FarmSummaryData }>(`/api/farm/summary${query}`);
  return data.summary;
}

/* =====================================================
   REMINDERS & AI ADVICE (LOCAL CACHE)
   ===================================================== */
export function saveReminders(reminders: ReminderItem[]): void {
  localStorage.setItem(STORAGE_KEYS.reminders, JSON.stringify(reminders));
}

export function loadReminders(): ReminderItem[] {
  const stored = localStorage.getItem(STORAGE_KEYS.reminders);
  if (!stored) return [];
  try {
    return JSON.parse(stored) as ReminderItem[];
  } catch {
    return [];
  }
}

export function saveAdvice(advice: AdviceItem[]): void {
  localStorage.setItem(STORAGE_KEYS.advice, JSON.stringify(advice));
}

export function loadAdvice(): AdviceItem[] {
  const stored = localStorage.getItem(STORAGE_KEYS.advice);
  if (!stored) return [];
  try {
    return JSON.parse(stored) as AdviceItem[];
  } catch {
    return [];
  }
}
