import dotenv from "dotenv";
import { dirname, resolve, isAbsolute } from "path";
import { fileURLToPath } from "url";

// Load backend/.env before any other module reads process.env.
const backendRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: resolve(backendRoot, ".env"), quiet: true });

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(`ERROR: ${name} is not configured. Copy backend/.env.example to backend/.env and set it.`);
    process.exit(1);
  }
  return value;
}

function resolveDatabasePath(value: string | undefined): string {
  if (!value) return resolve(backendRoot, "src", "kagochi.db");
  if (value === ":memory:" || isAbsolute(value)) return value;
  return resolve(backendRoot, value);
}

const isProduction = process.env.NODE_ENV === "production";

function determineDatabaseType(): "postgres" | "sqlite" {
  const explicitType = (process.env.DATABASE_TYPE || process.env.DB_TYPE)?.trim().toLowerCase();
  if (explicitType === "postgres" || explicitType === "postgresql" || explicitType === "neon") {
    return "postgres";
  }
  if (explicitType === "sqlite") {
    if (isProduction && process.env.ALLOW_SQLITE_IN_PRODUCTION !== "true") {
      console.error(
        "ERROR: SQLite is not permitted in production. Configure Neon PostgreSQL via DATABASE_URL or set ALLOW_SQLITE_IN_PRODUCTION=true."
      );
      process.exit(1);
    }
    return "sqlite";
  }
  if (process.env.DATABASE_URL?.trim()) {
    return "postgres";
  }
  if (isProduction) {
    return "postgres";
  }
  return "sqlite";
}

const databaseType = determineDatabaseType();
const databaseUrl = process.env.DATABASE_URL?.trim() || null;

if (databaseType === "postgres" && isProduction && !databaseUrl) {
  console.error("ERROR: DATABASE_URL is not configured. Neon PostgreSQL is required in production.");
  process.exit(1);
}

export const config = {
  isProduction,
  port: Number(process.env.PORT ?? 3001),
  jwtSecret: required("JWT_SECRET"),
  geminiApiKey: process.env.GEMINI_API_KEY?.trim() || null,
  googleClientId: process.env.GOOGLE_CLIENT_ID?.trim() || null,
  geminiModel: process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash",
  databaseType,
  databasePath: resolveDatabasePath(process.env.DATABASE_PATH),
  databaseUrl,
  corsOrigins: (process.env.CORS_ORIGINS ?? "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  cookieSecure: process.env.COOKIE_SECURE
    ? process.env.COOKIE_SECURE === "true"
    : isProduction,
  allowRegistration: process.env.ALLOW_REGISTRATION === "true" || (process.env.ALLOW_REGISTRATION === undefined && !isProduction),
  sessionHours: Number(process.env.SESSION_HOURS ?? 8),
  frontendDist: process.env.FRONTEND_DIST
    ? resolve(backendRoot, process.env.FRONTEND_DIST)
    : null,
};

if (config.jwtSecret.length < 32) {
  console.warn("WARNING: JWT_SECRET is shorter than 32 characters. Use a long random value.");
}
