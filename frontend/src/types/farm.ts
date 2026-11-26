export interface FarmProfile {
  farmName: string;
  ownerName: string;
  location: string;
  phone: string;
}

export interface PoultryBatch {
  id: string;
  breed: string;
  purpose: string;
  initialCount: number;
  currentCount: number;
  ageWeeks: number;
  dateAdded: string;
  stage?: string; // chicks, broilers, layers, kienyeji, growers, adult
  source?: string;
  purchasePrice?: number;
  notes?: string;
  hatchDate?: string;
  isHatchDateEstimated?: boolean;
}

export interface LivestockAnimal {
  id: string;
  name: string;
  type: string;
  breed: string;
  ageYears: number;
  dateAdded: string;
  category?: "calf" | "heifer" | "cow" | "bull" | string;
  tagNumber?: string;
  sex?: "female" | "male" | string;
  damId?: string;
  status?: "active" | "sold" | "transferred" | "deceased" | string;
  notes?: string;
  dateOfBirth?: string;
  isBirthDateEstimated?: boolean;
}

export interface ProductionRecord {
  id: string;
  type: "eggs" | "milk" | string;
  quantity: number;
  unit: string;
  date: string;
  destination?: "produced" | "sold" | "home_use" | "damaged" | string;
  sellingPrice?: number;
  animalType?: string;
  groupName?: string;
  targetId?: string;
  notes?: string;
}

export interface FeedingRecord {
  id: string;
  animalType: string;
  feedType: string;
  quantity: number;
  unit: string;
  date: string;
  cost?: number;
  supplier?: string;
  groupName?: string;
  targetId?: string;
  notes?: string;
}

export interface ExpenseRecord {
  id: string;
  category: string;
  description: string;
  amount: number;
  date: string;
}

export interface IncomeRecord {
  id: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  quantity?: number;
  unit?: string;
}

export interface VaccinationRecord {
  id: string;
  species: "poultry" | "cattle" | string;
  targetType?: "batch" | "animal" | string;
  targetId: string;
  targetName: string;
  vaccineName: string;
  disease?: string;
  dateAdministered?: string | null;
  dateDue: string;
  dose?: string;
  administeredBy?: string;
  status: "scheduled" | "due" | "due_today" | "completed" | "overdue" | "upcoming" | "cancelled" | string;
  countVaccinated?: number;
  notes?: string;
}

export interface VaccinationSchedule {
  id: string;
  species: "poultry" | "cattle" | string;
  category: string;
  vaccineName: string;
  targetDisease: string;
  ageDaysDue: number;
  boosterIntervalDays?: number;
  notes?: string;
}

export interface Vaccine {
  id: string;
  species: "poultry" | "cattle";
  name: string;
  disease: string;
  defaultMethod: string;
  notes?: string;
  isActive: boolean;
}

export interface FeedType {
  id: string;
  animalType: "poultry" | "cattle";
  category: string;
  name: string;
  defaultUnit: "kg" | "bags" | "bales" | "wheelbarrows" | "litres";
  isActive: boolean;
}

export interface ReminderItem {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  completed: boolean;
}

export interface AdviceItem {
  id: string;
  title: string;
  message: string;
  priority: "low" | "medium" | "high";
  date: string;
}

/* =====================================================
   POPULATION EVENTS & ANALYTICS
   ===================================================== */
export type PopulationEventType =
  | 'addition' | 'death' | 'sale' | 'transfer_in' | 'transfer_out';

export interface PopulationEvent {
  id: string;
  species: 'poultry' | 'cattle';
  targetId: string;
  targetName: string;
  eventType: PopulationEventType;
  count: number;
  date: string;
  reason: string;
  notes: string;
}

export interface SurvivorTarget {
  targetId: string;
  targetName: string;
  species: string;
  initialCount: number;
  additions: number;
  transfersIn: number;
  deaths: number;
  sales: number;
  transfersOut: number;
  survivors: number;
  survivorRatePercent: number | null;
}

export interface SurvivorSummary {
  targets: SurvivorTarget[];
  totalPoultryBirds: number;
  totalLivestockAnimals: number;
}

export interface MortalityPoint {
  label: string;
  startPopulation: number | null;
  deaths: number;
  mortalityRatePercent: number | null;
  cannotCalculate: boolean;
}

export interface MortalitySummary {
  series: MortalityPoint[];
  from: string;
  to: string;
  period: string;
}

export interface FarmSummaryData {
  period: { from: string; to: string; days: number };
  previousPeriod: { from: string; to: string; days: number };
  population: {
    poultry: {
      batchCount: number;
      initialBirds: number;
      currentBirds: number;
      layerBirds: number;
      chickBirds: number;
      broilerBirds: number;
      totalLosses: number;
      lossPercent: number | null;
      batches: any[];
      batchesAboveLossThreshold: number;
    };
    livestock: {
      animalCount: number;
      calvesCount: number;
      heifersCount: number;
      cowsCount: number;
      bullsCount: number;
      calvesOldEnoughCount?: number;
      heifersOldEnoughCount?: number;
      transitionAlerts?: string[];
      byType: { type: string; count: number }[];
    };
  };
  production: {
    lines: {
      type: string;
      unit: string;
      total: number;
      recordCount: number;
      daysWithRecords: number;
      averagePerRecordedDay: number | null;
      previousTotal: number;
      changePercent: number | null;
    }[];
    eggsProduced: number;
    eggsSold: number;
    milkProduced: number;
    milkSold: number;
    lastEggRecord: string | null;
  };
  feeding: {
    totalsByUnit: {
      unit: string;
      total: number;
      recordCount: number;
      averagePerDay: number;
      previousTotal: number;
      changePercent: number | null;
    }[];
    byFeedType: { animalType: string; feedType: string; unit: string; total: number }[];
    totalFeedCost: number;
  };
  expenses: {
    currency: string;
    total: number;
    recordCount: number;
    averagePerDay: number;
    previousTotal: number;
    changePercent: number | null;
    byCategory: { category: string; total: number; sharePercent: number | null }[];
  };
  income: {
    currency: string;
    total: number;
    recordCount: number;
    averagePerDay: number;
    previousTotal: number;
    changePercent: number | null;
    byCategory: { category: string; total: number; sharePercent: number | null }[];
  };
  vaccinations: {
    dueTodayCount: number;
    upcoming7DaysCount: number;
    upcoming30DaysCount: number;
    overdueCount: number;
    completedCount: number;
    dueToday: any[];
    upcoming7Days: any[];
    upcoming30Days: any[];
    overdue: any[];
  };
  financial: {
    revenueAvailable: boolean;
    totalIncome: number;
    totalExpenses: number;
    operatingProfitOrLoss: number;
    netMarginPercent: number | null;
    isProfitable: boolean;
    cashReceived: number;
    cashPaid: number;
    previousOperatingProfitOrLoss: number;
    note: string;
  };
  indicators: Record<string, any>;
  rules: {
    id: string;
    severity: "info" | "warning";
    condition: string;
    finding: string;
    recommendation: string;
  }[];
}
