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