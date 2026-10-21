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

export const config = {
  isProduction,
  port: Number(process.env.PORT ?? 3001),
  jwtSecret: required("JWT_SECRET"),
  geminiApiKey: process.env.GEMINI_API_KEY?.trim() || null,
  geminiModel: process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash",
  databasePath: resolveDatabasePath(process.env.DATABASE_PATH),
  databaseUrl: process.env.DATABASE_URL?.trim() || null,
  corsOrigins: (process.env.CORS_ORIGINS ?? "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  cookieSecure: process.env.COOKIE_SECURE
    ? process.env.COOKIE_SECURE === "true"
    : isProduction,
  allowRegistration: process.env.ALLOW_REGISTRATION === "true",
  sessionHours: Number(process.env.SESSION_HOURS ?? 8),
  frontendDist: process.env.FRONTEND_DIST
    ? resolve(backendRoot, process.env.FRONTEND_DIST)
    : null,
};

if (config.jwtSecret.length < 32) {
  console.warn("WARNING: JWT_SECRET is shorter than 32 characters. Use a long random value.");
}
