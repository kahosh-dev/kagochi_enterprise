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
}

export interface LivestockAnimal {
  id: string;
  name: string;
  type: string;
  breed: string;
  ageYears: number;
  dateAdded: string;
}

export interface ProductionRecord {
  id: string;
  type: "eggs" | "milk";
  quantity: number;
  unit: string;
  date: string;
}

export interface FeedingRecord {
  id: string;
  animalType: string;
  feedType: string;
  quantity: number;
  unit: string;
  date: string;
}

export interface ExpenseRecord {
  id: string;
  category: string;
  description: string;
  amount: number;
  date: string;
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

export interface VaccinationRecord {
  id: string;
  species: 'poultry' | 'cattle';
  targetId: string;
  targetName: string;
  vaccineName: string;
  dateDue: string;
  dateAdministered: string | null;
  status: 'upcoming' | 'due_today' | 'overdue' | 'completed' | 'cancelled';
  countVaccinated: number;
  notes: string;
}