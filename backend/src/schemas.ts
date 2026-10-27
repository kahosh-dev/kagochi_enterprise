import { z } from "zod";
import type { RecordValues, ResourceName } from "./store.js";

const DAY_MS = 24 * 60 * 60 * 1000;

function isRealDate(value: string): boolean {
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/*
 * Dates are stored as YYYY-MM-DD. A full ISO timestamp is accepted and cut to
 * its date part. One day of tolerance allows for time-zone differences.
 */
export const isoDate = z.preprocess(
  (value) => (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value) ? value.slice(0, 10) : value),
  z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use the date format YYYY-MM-DD.")
    .refine(isRealDate, "Enter a real calendar date.")
    .refine((value) => value >= "2000-01-01", "Date is too far in the past.")
    .refine((value) => new Date(`${value}T00:00:00Z`).getTime() <= Date.now() + DAY_MS, "Date cannot be in the future.")
);

export const futureOrPastIsoDate = z.preprocess(
  (value) => (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value) ? value.slice(0, 10) : value),
  z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use the date format YYYY-MM-DD.")
    .refine(isRealDate, "Enter a real calendar date.")
    .refine((value) => value >= "2000-01-01", "Date is too far in the past.")
);

const text = (max: number) =>
  z.string().trim().min(1, "This field is required.").max(max, `Use at most ${max} characters.`);

export const PRODUCTION_UNITS = { eggs: ["pieces", "trays"], milk: ["litres"] } as const;
export const FEED_UNITS = ["kg", "g", "litres", "bags"] as const;

export const poultrySchema = z
  .object({
    breed: text(100),
    purpose: text(100),
    initialCount: z.number().int().min(1, "Initial count must be at least 1.").max(1_000_000),
    currentCount: z.number().int().min(0, "Current count cannot be negative.").max(1_000_000),
    ageWeeks: z.number().int().min(0).max(520),
    dateAdded: isoDate,
    stage: z.string().trim().max(50).default("adult"),
    source: z.string().trim().max(100).default(""),
    purchasePrice: z.number().min(0).max(10_000_000).default(0),
    notes: z.string().trim().max(500).default(""),
  })
  .refine((data) => data.currentCount <= data.initialCount, {
    message: "Current count cannot be greater than the initial count.",
    path: ["currentCount"],
  });

export const livestockSchema = z.object({
  name: text(100),
  type: text(50),
  breed: text(100),
  ageYears: z.number().min(0).max(40),
  dateAdded: isoDate,
  category: z.enum(["calf", "heifer", "cow", "bull"]).default("cow"),
  tagNumber: z.string().trim().max(50).default(""),
  sex: z.enum(["female", "male"]).default("female"),
  damId: z.string().trim().max(100).default(""),
  status: z.enum(["active", "sold", "transferred", "deceased"]).default("active"),
  notes: z.string().trim().max(500).default(""),
});

export const productionSchema = z
  .object({
    type: z.enum(["eggs", "milk"], "Production type must be eggs or milk."),
    quantity: z.number().positive("Quantity must be greater than zero.").max(10_000_000),
    unit: z.string().trim(),
    date: isoDate,
    destination: z.enum(["produced", "sold", "home_use", "damaged"]).default("produced"),
    sellingPrice: z.number().min(0).max(1_000_000_000).default(0),
    notes: z.string().trim().max(500).default(""),
  })
  .refine((data) => (PRODUCTION_UNITS[data.type] as readonly string[]).includes(data.unit), {
    message: "Unit is not valid for this production type (eggs: pieces or trays; milk: litres).",
    path: ["unit"],
  });

export const feedingSchema = z.object({
  animalType: text(100),
  feedType: text(100),
  quantity: z.number().positive("Quantity must be greater than zero.").max(10_000_000),
  unit: z.enum(FEED_UNITS, "Unit must be kg, g, litres or bags."),
  date: isoDate,
  cost: z.number().min(0).max(100_000_000).default(0),
  supplier: z.string().trim().max(100).default(""),
  notes: z.string().trim().max(500).default(""),
});

export const expenseSchema = z.object({
  category: text(100),
  description: text(300),
  amount: z.number().positive("Amount must be greater than zero.").max(1_000_000_000),
  date: isoDate,
});

export const incomeSchema = z.object({
  category: text(100),
  description: text(300),
  amount: z.number().positive("Amount must be greater than zero.").max(1_000_000_000),
  date: isoDate,
  quantity: z.number().min(0).max(10_000_000).default(0),
  unit: z.string().trim().max(50).default(""),
});

export const vaccinationSchema = z.object({
  species: z.enum(["poultry", "cattle"]),
  targetType: z.enum(["batch", "animal"]),
  targetId: text(100),
  targetName: text(100),
  vaccineName: text(100),
  disease: text(100),
  dateAdministered: z.string().trim().max(50).default(""),
  dateDue: futureOrPastIsoDate,
  dose: z.string().trim().max(50).default(""),
  administeredBy: z.string().trim().max(100).default(""),
  status: z.enum(["scheduled", "due", "completed", "overdue", "cancelled"]).default("scheduled"),
  notes: z.string().trim().max(500).default(""),
});

export const vaccinationScheduleSchema = z.object({
  species: z.enum(["poultry", "cattle"]),
  category: text(100),
  vaccineName: text(100),
  targetDisease: text(100),
  ageDaysDue: z.number().int().min(0).max(3650),
  boosterIntervalDays: z.number().int().min(0).max(3650).default(0),
  notes: z.string().trim().max(500).default(""),
});

interface ResourceDefinition {
  label: string;
  schema: z.ZodType;
  toColumns: (data: never) => RecordValues;
}

export const resourceDefinitions: Record<ResourceName, ResourceDefinition> = {
  poultry: {
    label: "Poultry batch",
    schema: poultrySchema,
    toColumns: (d: z.infer<typeof poultrySchema>) => ({
      breed: d.breed,
      purpose: d.purpose,
      initial_count: d.initialCount,
      current_count: d.currentCount,
      age_weeks: d.ageWeeks,
      date_added: d.dateAdded,
      stage: d.stage ?? "adult",
      source: d.source ?? "",
      purchase_price: d.purchasePrice ?? 0,
      notes: d.notes ?? "",
    }),
  },
  livestock: {
    label: "Livestock record",
    schema: livestockSchema,
    toColumns: (d: z.infer<typeof livestockSchema>) => ({
      name: d.name,
      type: d.type,
      breed: d.breed,
      age_years: d.ageYears,
      date_added: d.dateAdded,
      category: d.category ?? "cow",
      tag_number: d.tagNumber ?? "",
      sex: d.sex ?? "female",
      dam_id: d.damId ?? "",
      status: d.status ?? "active",
      notes: d.notes ?? "",
    }),
  },
  production: {
    label: "Production record",
    schema: productionSchema,
    toColumns: (d: z.infer<typeof productionSchema>) => ({
      type: d.type,
      quantity: d.quantity,
      unit: d.unit,
      date: d.date,
      destination: d.destination ?? "produced",
      selling_price: d.sellingPrice ?? 0,
      notes: d.notes ?? "",
    }),
  },
  feeding: {
    label: "Feeding record",
    schema: feedingSchema,
    toColumns: (d: z.infer<typeof feedingSchema>) => ({
      animal_type: d.animalType,
      feed_type: d.feedType,
      quantity: d.quantity,
      unit: d.unit,
      date: d.date,
      cost: d.cost ?? 0,
      supplier: d.supplier ?? "",
      notes: d.notes ?? "",
    }),
  },
  expenses: {
    label: "Expense record",
    schema: expenseSchema,
    toColumns: (d: z.infer<typeof expenseSchema>) => ({
      category: d.category,
      description: d.description,
      amount: d.amount,
      date: d.date,
    }),
  },
  income: {
    label: "Income record",
    schema: incomeSchema,
    toColumns: (d: z.infer<typeof incomeSchema>) => ({
      category: d.category,
      description: d.description,
      amount: d.amount,
      date: d.date,
      quantity: d.quantity ?? 0,
      unit: d.unit ?? "",
    }),
  },
  vaccinations: {
    label: "Vaccination record",
    schema: vaccinationSchema,
    toColumns: (d: z.infer<typeof vaccinationSchema>) => ({
      species: d.species,
      target_type: d.targetType,
      target_id: d.targetId,
      target_name: d.targetName,
      vaccine_name: d.vaccineName,
      disease: d.disease,
      date_administered: d.dateAdministered ?? "",
      date_due: d.dateDue,
      dose: d.dose ?? "",
      administered_by: d.administeredBy ?? "",
      status: d.status ?? "scheduled",
      notes: d.notes ?? "",
    }),
  },
  vaccination_schedules: {
    label: "Vaccination schedule",
    schema: vaccinationScheduleSchema,
    toColumns: (d: z.infer<typeof vaccinationScheduleSchema>) => ({
      species: d.species,
      category: d.category,
      vaccine_name: d.vaccineName,
      target_disease: d.targetDisease,
      age_days_due: d.ageDaysDue,
      booster_interval_days: d.boosterIntervalDays ?? 0,
      notes: d.notes ?? "",
    }),
  },
};

/* Accounts */

const email = z.string().trim().toLowerCase().email("Enter a valid email address.").max(150);
export const newPassword = z
  .string()
  .min(10, "Password must be at least 10 characters.")
  .max(128, "Password must be at most 128 characters.")
  .regex(/[A-Za-z]/, "Password must contain a letter.")
  .regex(/[0-9]/, "Password must contain a number.");
const personName = z.string().trim().min(2, "Name must be at least 2 characters.").max(100);
const role = z.enum(["farmer", "admin"]);

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Password is required.").max(128),
});

export const registerSchema = z.object({
  name: personName,
  email,
  password: newPassword,
  farmName: z.string().trim().min(2).max(150).optional(),
  location: z.string().trim().max(200).optional(),
  phone: z.string().trim().max(30).optional(),
});

export const adminCreateUserSchema = z.object({
  name: personName,
  email,
  password: newPassword,
  role: role.default("farmer"),
});

export const adminUpdateUserSchema = z.object({ name: personName, email, role });

export const idParamSchema = z.string().min(1).max(100).regex(/^[A-Za-z0-9_-]+$/);

/* Analytics */

export const summaryQuerySchema = z.object({
  days: z.coerce.number().int().min(1, "days must be between 1 and 366.").max(366, "days must be between 1 and 366.").default(30),
  to: isoDate.optional(),
  from: isoDate.optional(),
});

/* AI */

export const adviceRequestSchema = z.object({
  periodDays: z.number().int().min(1).max(365).optional(),
  to: isoDate.optional(),
  from: isoDate.optional(),
});

export const chatRequestSchema = z.object({
  question: text(1000),
  periodDays: z.number().int().min(1).max(365).optional(),
  to: isoDate.optional(),
  from: isoDate.optional(),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), text: z.string().max(3000) }))
    .max(10)
    .optional(),
});

export function validationDetails(error: z.ZodError) {
  return error.issues.map((issue) => ({
    field: issue.path.join(".") || null,
    message: issue.message,
  }));
}
