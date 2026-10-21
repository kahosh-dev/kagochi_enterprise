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
    columns: ["breed", "purpose", "initial_count", "current_count", "age_weeks", "date_added"],
    dateColumn: "date_added",
  },
  livestock: {
    table: "livestock",
    columns: ["name", "type", "breed", "age_years", "date_added"],
    dateColumn: "date_added",
  },
  production: {
    table: "production",
    columns: ["type", "quantity", "unit", "date"],
    dateColumn: "date",
  },
  feeding: {
    table: "feeding",
    columns: ["animal_type", "feed_type", "quantity", "unit", "date"],
    dateColumn: "date",
  },
  expenses: {
    table: "expenses",
    columns: ["category", "description", "amount", "date"],
    dateColumn: "date",
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

export interface FarmStore {
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
}
