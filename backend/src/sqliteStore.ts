import * as db from "./database.js";
import type {
  AdminUserRow,
  FarmStore,
  FarmRow,
  RecordRow,
  ResourceName,
  RecordValues,
  StoreResult,
} from "./store.js";

function result(value: { changes: number }): StoreResult {
  return { changes: value.changes };
}

export const sqliteStore: FarmStore = {
  async executeInTransaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
    throw new Error("SQLite transactions not implemented for this store. Use PostgreSQL.");
  },

  async findUserByEmail(email) {
    return db.findUserByEmail(email);
  },

  async findUserById(id) {
    return db.findUserById(id);
  },

  async createUser(id, name, email, passwordHash, role = "farmer") {
    return result(db.createUser(id, name, email, passwordHash, role));
  },

  async incrementTokenVersion(id) {
    return result(db.incrementTokenVersion(id));
  },

  async setUserPassword(id, passwordHash) {
    return result(db.setUserPassword(id, passwordHash));
  },

  async setUserRole(id, role) {
    return result(db.setUserRole(id, role));
  },

  async countAdmins() {
    return db.countAdmins();
  },

  async getAllUsers(): Promise<AdminUserRow[]> {
    return db.getAllUsers();
  },

  async adminUpdateUser(id, name, email, role) {
    return result(db.adminUpdateUser(id, name, email, role));
  },

  async adminDeleteUser(id) {
    return result(db.adminDeleteUser(id));
  },

  async createFarm(id, ownerId, farmName, location, phone) {
    return result(db.createFarm(id, ownerId, farmName, location, phone));
  },

  async findFarmByOwnerId(ownerId): Promise<FarmRow | undefined> {
    return db.findFarmByOwnerId(ownerId);
  },

  async listRecords(resource: ResourceName, ownerId: string): Promise<RecordRow[]> {
    return db.listRecords(resource, ownerId);
  },

  async createRecord(resource, id, ownerId, values: RecordValues) {
    return result(db.createRecord(resource, id, ownerId, values));
  },

  async updateRecord(resource, id, ownerId, values: RecordValues) {
    return result(db.updateRecord(resource, id, ownerId, values));
  },

  async deleteRecord(resource, id, ownerId) {
    return result(db.deleteRecord(resource, id, ownerId));
  },

  async listPopulationEvents(ownerId, species, targetId) {
    return db.listPopulationEvents(ownerId, species, targetId);
  },

  async createPopulationEvent(id, ownerId, data) {
    return db.createPopulationEvent(id, ownerId, data);
  },

  async deletePopulationEvent(id, ownerId) {
    return result(db.deletePopulationEvent(id, ownerId));
  },
};
