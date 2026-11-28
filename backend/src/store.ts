export interface UserRow {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: string;
  token_version: number;
  created_at: string;
}

export interface FarmRow {
  id: string;
  farm_name: string;
  location: string;
  phone: string;
  created_at: string;
}

export const resourceTables = {
  poultry: {
    table: "poultry_batches",
    columns: ["breed", "purpose", "initial_count", "current_count", "age_weeks", "date_added", "stage", "source", "purchase_price", "notes", "hatch_date", "is_hatch_date_estimated"],
    dateColumn: "date_added",
  },
  livestock: {
    table: "livestock",
    columns: ["name", "type", "breed", "age_years", "date_added", "category", "tag_number", "sex", "dam_id", "status", "notes", "date_of_birth", "is_birth_date_estimated", "has_calved"],
    dateColumn: "date_added",
  },
  meat_production: {
    table: "meat_production",
    columns: ["target_id", "target_name", "species", "date", "count_harvested", "total_weight_kg", "average_weight_kg", "selling_price_per_kg", "total_revenue", "destination", "notes"],
    dateColumn: "date",
  },
  calving_events: {
    table: "calving_events",
    columns: ["dam_id", "dam_name", "calf_id", "calf_name", "calf_sex", "calving_date", "calving_ease", "notes", "created_at"],
    dateColumn: "calving_date",
  },
  production: {
    table: "production",
    columns: ["type", "quantity", "unit", "date", "destination", "selling_price", "notes", "animal_type", "group_name", "target_id"],
    dateColumn: "date",
  },
  feeding: {
    table: "feeding",
    columns: ["animal_type", "feed_type", "quantity", "unit", "date", "cost", "supplier", "notes", "group_name"],
    dateColumn: "date",
  },
  expenses: {
    table: "expenses",
    columns: ["category", "description", "amount", "date"],
    dateColumn: "date",
  },
  income: {
    table: "income",
    columns: ["category", "description", "amount", "date", "quantity", "unit"],
    dateColumn: "date",
  },
  vaccinations: {
    table: "vaccinations",
    columns: ["species", "target_type", "target_id", "target_name", "vaccine_name", "disease", "date_administered", "date_due", "dose", "administered_by", "status", "count_vaccinated", "notes"],
    dateColumn: "date_due",
  },
  vaccination_schedules: {
    table: "vaccination_schedules",
    columns: ["species", "category", "vaccine_name", "target_disease", "age_days_due", "booster_interval_days", "notes"],
    dateColumn: "age_days_due",
  },
  vaccines: {
    table: "vaccines",
    columns: ["species", "name", "disease", "default_method", "notes", "is_active"],
    dateColumn: "name",
  },
  feed_types: {
    table: "feed_types",
    columns: ["animal_type", "category", "name", "default_unit", "is_active"],
    dateColumn: "name",
  },
} as const;

export type ResourceName = keyof typeof resourceTables;
export type RecordValues = Record<string, string | number>;
export type RecordRow = { id: string } & Record<string, string | number>;
export type StoreResult = { changes: number };

export interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
}

export interface PopulationEventRow {
  id: string;
  owner_id: string;
  species: 'poultry' | 'cattle';
  target_id: string;
  target_name: string;
  event_type: 'addition' | 'death' | 'sale' | 'transfer_in' | 'transfer_out';
  count: number;
  date: string;
  reason: string;
  notes: string;
}

export interface FarmStore {
  executeInTransaction<T>(callback: (client: any) => Promise<T>): Promise<T>;
  findUserByEmail(email: string): Promise<UserRow | undefined>;
  findUserById(id: string): Promise<UserRow | undefined>;
  createUser(
    id: string,
    name: string,
    email: string,
    passwordHash: string,
    role?: "farmer" | "admin",
  ): Promise<StoreResult>;
  incrementTokenVersion(id: string): Promise<StoreResult>;
  setUserPassword(id: string, passwordHash: string): Promise<StoreResult>;
  setUserRole(id: string, role: "farmer" | "admin"): Promise<StoreResult>;
  countAdmins(): Promise<number>;
  getAllUsers(): Promise<AdminUserRow[]>;
  adminUpdateUser(
    id: string,
    name: string,
    email: string,
    role: "farmer" | "admin",
  ): Promise<StoreResult>;
  adminDeleteUser(id: string): Promise<StoreResult>;
  createFarm(
    id: string,
    ownerId: string,
    farmName: string,
    location: string,
    phone: string,
  ): Promise<StoreResult>;
  findFarmByOwnerId(ownerId: string): Promise<FarmRow | undefined>;
  listRecords(resource: ResourceName, ownerId: string): Promise<RecordRow[]>;
  listRecordsForPeriod(resource: ResourceName, ownerId: string, from: string | undefined, to: string): Promise<RecordRow[]>;
  createRecord(
    resource: ResourceName,
    id: string,
    ownerId: string,
    values: RecordValues,
  ): Promise<StoreResult>;
  updateRecord(
    resource: ResourceName,
    id: string,
    ownerId: string,
    values: RecordValues,
  ): Promise<StoreResult>;
  deleteRecord(
    resource: ResourceName,
    id: string,
    ownerId: string,
  ): Promise<StoreResult>;
  listPopulationEvents(
    ownerId: string,
    species?: string,
    targetId?: string,
    from?: string,
    to?: string,
  ): Promise<PopulationEventRow[]>;
  createPopulationEvent(
    id: string,
    ownerId: string,
    data: Omit<PopulationEventRow, 'id' | 'owner_id'>,
    options?: { allowSnapshotReconciliation?: boolean },
  ): Promise<void>;
  deletePopulationEvent(id: string, ownerId: string, action?: "delete" | "undo"): Promise<StoreResult>;
}
