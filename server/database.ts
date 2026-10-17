import Database from "better-sqlite3";
import path from "path";

const databasePath = path.join(
  process.cwd(),
  "server",
  "kagochi.db"
);

const db = new Database(databasePath);

/*
|--------------------------------------------------------------------------
| Database configuration
|--------------------------------------------------------------------------
*/

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

/*
|--------------------------------------------------------------------------
| Users table
|--------------------------------------------------------------------------
*/

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
`);

/*
|--------------------------------------------------------------------------
| Farms table
|--------------------------------------------------------------------------
*/

db.exec(`
  CREATE TABLE IF NOT EXISTS farms (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL,
    farm_name TEXT NOT NULL,
    location TEXT,
    phone TEXT,
    created_at TEXT NOT NULL,

    FOREIGN KEY (owner_id)
      REFERENCES users(id)
      ON DELETE CASCADE
  );
`);

/*
|--------------------------------------------------------------------------
| Poultry batches
|--------------------------------------------------------------------------
*/

db.exec(`
  CREATE TABLE IF NOT EXISTS poultry_batches (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL,
    breed TEXT NOT NULL,
    purpose TEXT NOT NULL,
    initial_count INTEGER NOT NULL,
    current_count INTEGER NOT NULL,
    age_weeks INTEGER NOT NULL,
    date_added TEXT NOT NULL,

    FOREIGN KEY (owner_id)
      REFERENCES users(id)
      ON DELETE CASCADE
  );
`);

/*
|--------------------------------------------------------------------------
| Livestock
|--------------------------------------------------------------------------
*/

db.exec(`
  CREATE TABLE IF NOT EXISTS livestock (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    breed TEXT NOT NULL,
    age_years REAL NOT NULL,
    date_added TEXT NOT NULL,

    FOREIGN KEY (owner_id)
      REFERENCES users(id)
      ON DELETE CASCADE
  );
`);

/*
|--------------------------------------------------------------------------
| Production records
|--------------------------------------------------------------------------
*/

db.exec(`
  CREATE TABLE IF NOT EXISTS production (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL,
    type TEXT NOT NULL,
    quantity REAL NOT NULL,
    unit TEXT NOT NULL,
    date TEXT NOT NULL,

    FOREIGN KEY (owner_id)
      REFERENCES users(id)
      ON DELETE CASCADE
  );
`);

/*
|--------------------------------------------------------------------------
| Feeding records
|--------------------------------------------------------------------------
*/

db.exec(`
  CREATE TABLE IF NOT EXISTS feeding (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL,
    animal_type TEXT NOT NULL,
    feed_type TEXT NOT NULL,
    quantity REAL NOT NULL,
    unit TEXT NOT NULL,
    date TEXT NOT NULL,

    FOREIGN KEY (owner_id)
      REFERENCES users(id)
      ON DELETE CASCADE
  );
`);

/*
|--------------------------------------------------------------------------
| Expense records
|--------------------------------------------------------------------------
*/

db.exec(`
  CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    amount REAL NOT NULL,
    date TEXT NOT NULL,

    FOREIGN KEY (owner_id)
      REFERENCES users(id)
      ON DELETE CASCADE
  );
`);

/*
|--------------------------------------------------------------------------
| USER FUNCTIONS
|--------------------------------------------------------------------------
*/

/*
| Find user by email
*/

export function findUserByEmail(
  email: string
) {
  const statement = db.prepare(`
    SELECT
      id,
      name,
      email,
      password_hash,
      created_at
    FROM users
    WHERE email = ?
  `);

  return statement.get(
    email.toLowerCase().trim()
  ) as
    | {
        id: string;
        name: string;
        email: string;
        password_hash: string;
        created_at: string;
      }
    | undefined;
}

/*
| Find user by ID
*/

export function findUserById(
  id: string
) {
  const statement = db.prepare(`
    SELECT
      id,
      name,
      email,
      created_at
    FROM users
    WHERE id = ?
  `);

  return statement.get(id) as
    | {
        id: string;
        name: string;
        email: string;
        created_at: string;
      }
    | undefined;
}

/*
| Create user
*/

export function createUser(
  id: string,
  name: string,
  email: string,
  passwordHash: string
) {
  const statement = db.prepare(`
    INSERT INTO users (
      id,
      name,
      email,
      password_hash,
      created_at
    )
    VALUES (?, ?, ?, ?, ?)
  `);

  return statement.run(
    id,
    name.trim(),
    email.toLowerCase().trim(),
    passwordHash,
    new Date().toISOString()
  );
}

/*
|--------------------------------------------------------------------------
| FARM FUNCTIONS
|--------------------------------------------------------------------------
*/

/*
| Create farm
*/

export function createFarm(
  id: string,
  ownerId: string,
  farmName: string,
  location: string,
  phone: string
) {
  const statement = db.prepare(`
    INSERT INTO farms (
      id,
      owner_id,
      farm_name,
      location,
      phone,
      created_at
    )
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  return statement.run(
    id,
    ownerId,
    farmName.trim(),
    location.trim(),
    phone.trim(),
    new Date().toISOString()
  );
}

/*
| Find farm owned by user
*/

export function findFarmByOwnerId(
  ownerId: string
) {
  const statement = db.prepare(`
    SELECT
      id,
      owner_id,
      farm_name,
      location,
      phone,
      created_at
    FROM farms
    WHERE owner_id = ?
    LIMIT 1
  `);

  return statement.get(ownerId) as
    | {
        id: string;
        owner_id: string;
        farm_name: string;
        location: string;
        phone: string;
        created_at: string;
      }
    | undefined;
}

/*
|--------------------------------------------------------------------------
| POULTRY FUNCTIONS
|--------------------------------------------------------------------------
*/

/*
| Create poultry batch
*/

export function createPoultry(
  id: string,
  ownerId: string,
  breed: string,
  purpose: string,
  initialCount: number,
  currentCount: number,
  ageWeeks: number,
  dateAdded: string
) {
  const statement = db.prepare(`
    INSERT INTO poultry_batches (
      id,
      owner_id,
      breed,
      purpose,
      initial_count,
      current_count,
      age_weeks,
      date_added
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  return statement.run(
    id,
    ownerId,
    breed.trim(),
    purpose.trim(),
    initialCount,
    currentCount,
    ageWeeks,
    dateAdded
  );
}

/*
| Get poultry belonging to user
*/

export function findPoultryByOwnerId(
  ownerId: string
) {
  const statement = db.prepare(`
    SELECT
      id,
      owner_id,
      breed,
      purpose,
      initial_count,
      current_count,
      age_weeks,
      date_added
    FROM poultry_batches
    WHERE owner_id = ?
    ORDER BY date_added DESC
  `);

  return statement.all(ownerId);
}

/*
| Delete poultry batch belonging to user
*/

export function deletePoultry(
  id: string,
  ownerId: string
) {
    
  const statement = db.prepare(`
    DELETE FROM poultry_batches
    WHERE id = ?
    AND owner_id = ?
  `);

  return statement.run(
    id,
    ownerId
  );
}
/*
| Update poultry batch belonging to user
*/

export function updatePoultry(
  id: string,
  ownerId: string,
  breed: string,
  purpose: string,
  initialCount: number,
  currentCount: number,
  ageWeeks: number,
  dateAdded: string
) {
  const statement = db.prepare(`
    UPDATE poultry_batches
    SET
      breed = ?,
      purpose = ?,
      initial_count = ?,
      current_count = ?,
      age_weeks = ?,
      date_added = ?
    WHERE id = ?
    AND owner_id = ?
  `);

  return statement.run(
    breed.trim(),
    purpose.trim(),
    initialCount,
    currentCount,
    ageWeeks,
    dateAdded,
    id,
    ownerId
  );
}

/*
|--------------------------------------------------------------------------
| LIVESTOCK FUNCTIONS
|--------------------------------------------------------------------------
*/

/*
| Create livestock
*/

export function createLivestock(
  id: string,
  ownerId: string,
  name: string,
  type: string,
  breed: string,
  ageYears: number,
  dateAdded: string
) {
  const statement = db.prepare(`
    INSERT INTO livestock (
      id,
      owner_id,
      name,
      type,
      breed,
      age_years,
      date_added
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  return statement.run(
    id,
    ownerId,
    name.trim(),
    type.trim(),
    breed.trim(),
    ageYears,
    dateAdded
  );
}

/*
| Get livestock belonging to user
*/

export function findLivestockByOwnerId(
  ownerId: string
) {
  const statement = db.prepare(`
    SELECT
      id,
      owner_id,
      name,
      type,
      breed,
      age_years,
      date_added
    FROM livestock
    WHERE owner_id = ?
    ORDER BY date_added DESC
  `);

  return statement.all(ownerId);
}

/*
| Delete livestock belonging to user
*/

export function deleteLivestock(
  id: string,
  ownerId: string
) {
  const statement = db.prepare(`
    DELETE FROM livestock
    WHERE id = ?
    AND owner_id = ?
  `);

  return statement.run(
    id,
    ownerId
  );
}

/*
| Update livestock belonging to user
*/

export function updateLivestock(
  id: string,
  ownerId: string,
  name: string,
  type: string,
  breed: string,
  ageYears: number,
  dateAdded: string
) {
  const statement = db.prepare(`
    UPDATE livestock
    SET
      name = ?,
      type = ?,
      breed = ?,
      age_years = ?,
      date_added = ?
    WHERE id = ?
    AND owner_id = ?
  `);

  return statement.run(
    name.trim(),
    type.trim(),
    breed.trim(),
    ageYears,
    dateAdded,
    id,
    ownerId
  );
}



/*
|--------------------------------------------------------------------------
| PRODUCTION FUNCTIONS
|--------------------------------------------------------------------------
*/

/*
| Create production record
*/

export function createProduction(
  id: string,
  ownerId: string,
  type: string,
  quantity: number,
  unit: string,
  date: string
) {
  const statement = db.prepare(`
    INSERT INTO production (
      id,
      owner_id,
      type,
      quantity,
      unit,
      date
    )
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  return statement.run(
    id,
    ownerId,
    type.trim(),
    quantity,
    unit.trim(),
    date
  );
}

/*
| Get production belonging to user
*/

export function findProductionByOwnerId(
  ownerId: string
) {
  const statement = db.prepare(`
    SELECT
      id,
      owner_id,
      type,
      quantity,
      unit,
      date
    FROM production
    WHERE owner_id = ?
    ORDER BY date DESC
  `);

  return statement.all(ownerId);
}

/*
| Delete production belonging to user
*/

export function deleteProduction(
  id: string,
  ownerId: string
) {
  const statement = db.prepare(`
    DELETE FROM production
    WHERE id = ?
    AND owner_id = ?
  `);

  return statement.run(
    id,
    ownerId
  );
}
/*
| Update production record belonging to user
*/

export function updateProduction(
  id: string,
  ownerId: string,
  type: string,
  quantity: number,
  unit: string,
  date: string
) {
  const statement = db.prepare(`
    UPDATE production
    SET
      type = ?,
      quantity = ?,
      unit = ?,
      date = ?
    WHERE id = ?
    AND owner_id = ?
  `);

  return statement.run(
    type.trim(),
    quantity,
    unit.trim(),
    date,
    id,
    ownerId
  );
}
/*
|--------------------------------------------------------------------------
| FEEDING FUNCTIONS
|--------------------------------------------------------------------------
*/

/*
| Create feeding record
*/

export function createFeeding(
  id: string,
  ownerId: string,
  animalType: string,
  feedType: string,
  quantity: number,
  unit: string,
  date: string
) {
  const statement = db.prepare(`
    INSERT INTO feeding (
      id,
      owner_id,
      animal_type,
      feed_type,
      quantity,
      unit,
      date
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  return statement.run(
    id,
    ownerId,
    animalType.trim(),
    feedType.trim(),
    quantity,
    unit.trim(),
    date
  );
}

/*
| Get feeding records belonging to user
*/

export function findFeedingByOwnerId(
  ownerId: string
) {
  const statement = db.prepare(`
    SELECT
      id,
      owner_id,
      animal_type,
      feed_type,
      quantity,
      unit,
      date
    FROM feeding
    WHERE owner_id = ?
    ORDER BY date DESC
  `);

  return statement.all(ownerId);
}

/*
| Delete feeding record belonging to user
*/

export function deleteFeeding(
  id: string,
  ownerId: string
) {
  const statement = db.prepare(`
    DELETE FROM feeding
    WHERE id = ?
    AND owner_id = ?
  `);

  return statement.run(
    id,
    ownerId
  );
}
/*
| Update feeding record belonging to user
*/

export function updateFeeding(
  id: string,
  ownerId: string,
  animalType: string,
  feedType: string,
  quantity: number,
  unit: string,
  date: string
) {
  const statement = db.prepare(`
    UPDATE feeding
    SET
      animal_type = ?,
      feed_type = ?,
      quantity = ?,
      unit = ?,
      date = ?
    WHERE id = ?
    AND owner_id = ?
  `);

  return statement.run(
    animalType.trim(),
    feedType.trim(),
    quantity,
    unit.trim(),
    date,
    id,
    ownerId
  );
}

/*
|--------------------------------------------------------------------------
| EXPENSE FUNCTIONS
|--------------------------------------------------------------------------
*/

/*
| Create expense
*/

export function createExpense(
  id: string,
  ownerId: string,
  category: string,
  description: string,
  amount: number,
  date: string
) {
  const statement = db.prepare(`
    INSERT INTO expenses (
      id,
      owner_id,
      category,
      description,
      amount,
      date
    )
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  return statement.run(
    id,
    ownerId,
    category.trim(),
    description.trim(),
    amount,
    date
  );
}
/*
| Update expense belonging to user
*/

export function updateExpense(
  id: string,
  ownerId: string,
  category: string,
  description: string,
  amount: number,
  date: string
) {
  const statement = db.prepare(`
    UPDATE expenses
    SET
      category = ?,
      description = ?,
      amount = ?,
      date = ?
    WHERE id = ?
    AND owner_id = ?
  `);

  return statement.run(
    category.trim(),
    description.trim(),
    amount,
    date,
    id,
    ownerId
  );
}
/*
| Get expenses belonging to user
*/

export function findExpensesByOwnerId(
  ownerId: string
) {
  const statement = db.prepare(`
    SELECT
      id,
      owner_id,
      category,
      description,
      amount,
      date
    FROM expenses
    WHERE owner_id = ?
    ORDER BY date DESC
  `);

  return statement.all(ownerId);
}

/*
| Delete expense belonging to user
*/

export function deleteExpense(
  id: string,
  ownerId: string
) {
  const statement = db.prepare(`
    DELETE FROM expenses
    WHERE id = ?
    AND owner_id = ?
  `);

  return statement.run(
    id,
    ownerId
  );
}

/*
|--------------------------------------------------------------------------
| ADMIN FUNCTIONS
|--------------------------------------------------------------------------
*/

export function getAllUsers() {
  const statement = db.prepare(`
    SELECT id, name, email, created_at
    FROM users
    ORDER BY created_at DESC
  `);
  return statement.all() as {
    id: string;
    name: string;
    email: string;
    created_at: string;
  }[];
}

export function adminUpdateUser(
  id: string,
  name: string,
  email: string
) {
  const statement = db.prepare(`
    UPDATE users
    SET name = ?, email = ?
    WHERE id = ?
  `);
  return statement.run(name.trim(), email.toLowerCase().trim(), id);
}

export function adminDeleteUser(id: string) {
  const statement = db.prepare(`
    DELETE FROM users WHERE id = ?
  `);
  return statement.run(id);
}

/*
|--------------------------------------------------------------------------
| DATABASE EXPORT
|--------------------------------------------------------------------------
*/

export default db;