import { config } from "./config.js";
import { createApp } from "./app.js";
import { initializePostgresSchema, postgresPool } from "./postgres.js";
import { postgresStore } from "./postgresStore.js";
import { sqliteStore } from "./sqliteStore.js";

async function main(): Promise<void> {
  const isPostgres = Boolean(config.databaseUrl);

  if (isPostgres) {
    await initializePostgresSchema();
  }

  const store = isPostgres ? postgresStore : sqliteStore;
  const app = createApp({ store });

  const server = app.listen(config.port, () => {
    console.log(`Kagochi Farm AI backend running on port ${config.port}`);
    console.log(`Database: ${isPostgres ? "PostgreSQL" : "SQLite (" + config.databasePath + ")"}`);
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
  console.error("Failed to start Kagochi server.");

  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error("An unexpected startup error occurred.");
  }

  process.exitCode = 1;
});
