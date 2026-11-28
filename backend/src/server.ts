import { config } from "./config.js";
import { aiProviderConfig } from "./aiProvider.js";
import { createApp } from "./app.js";
import { initializePostgresSchema, verifyPostgresConnection, postgresPool } from "./postgres.js";
import { postgresStore } from "./postgresStore.js";
import { sqliteStore } from "./sqliteStore.js";

async function main(): Promise<void> {
  const isPostgres = config.databaseType === "postgres";

  console.log(`Starting Kagochi Farm backend [Env: ${config.isProduction ? "production" : "development"}]...`);
  console.log(`[Database] Active type: ${isPostgres ? "PostgreSQL (Neon)" : "SQLite"}`);

  if (isPostgres) {
    if (!config.databaseUrl) {
      throw new Error(
        "DATABASE_URL is not configured. Neon PostgreSQL is required in production."
      );
    }

    try {
      const { host, database } = await verifyPostgresConnection();
      console.log(`[Database] PostgreSQL connection: verified (host: ${host}, database: ${database})`);
    } catch (connErr) {
      console.error("[Database] PostgreSQL connection: FAILED");
      throw connErr;
    }

    try {
      await initializePostgresSchema();
      console.log("[Database] PostgreSQL schema initialization: successful");
    } catch (schemaErr) {
      console.error("[Database] PostgreSQL schema initialization: FAILED");
      throw schemaErr;
    }
  } else {
    console.log(`[Database] SQLite database path: ${config.databasePath}`);
    console.log("[Database] SQLite initialization: ready");
  }

  const store = isPostgres ? postgresStore : sqliteStore;
  const app = createApp({ store });

  const server = app.listen(config.port, () => {
    console.log(`Kagochi Farm backend running on http://localhost:${config.port}`);
    const aiCfg = aiProviderConfig();
    const providerModel = (provider: typeof aiCfg.primary) => provider === "groq" ? aiCfg.groqModel : provider === "gemini" ? aiCfg.geminiModel : aiCfg.anthropicModel;
    console.log(`[AI] Provider chain: primary=${aiCfg.primary}/${providerModel(aiCfg.primary)} fallback=${aiCfg.fallback}/${providerModel(aiCfg.fallback)} timeout=${aiCfg.timeoutMs}ms`);
    const apiKeyConfigured = (provider: typeof aiCfg.primary) => Boolean(provider === "groq" ? config.groqApiKey : provider === "gemini" ? config.geminiApiKey : config.anthropicApiKey);
    const missingKeys = [...new Set([aiCfg.primary, aiCfg.fallback])].filter((provider) => !apiKeyConfigured(provider));
    if (missingKeys.length) console.warn(`[AI] Missing API key for configured provider(s): ${missingKeys.join(", ")}`);
    console.log(`[Auth] Self-registration: ${config.allowRegistration ? "enabled" : "disabled"}`);
    console.log(`[Gemini Performance Review] Status: ${config.geminiApiKey ? `enabled (${config.geminiModel})` : "disabled (GEMINI_API_KEY not set)"}`);
    console.log(`[Proxy] Express trust proxy: enabled (hop: 1)`);
  });

  const shutdown = (signal: string): void => {
    console.log(`${signal} received. Shutting down...`);

    server.close(() => {
      if (isPostgres && postgresPool) {
        void postgresPool.end().then(() => {
          process.exit(0);
        });
      } else {
        process.exit(0);
      }
    });
  };

  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((error: unknown) => {
  console.error("FATAL: Failed to start Kagochi server.");

  if (error instanceof Error) {
    console.error(`Reason: ${error.message}`);
  } else {
    console.error("Reason: An unexpected startup error occurred.");
  }

  process.exitCode = 1;
});
