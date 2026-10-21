import { config } from "./config.js";
import { createApp } from "./app.js";
import { initializePostgresSchema, postgresPool } from "./postgres.js";
import { postgresStore } from "./postgresStore.js";

async function main(): Promise<void> {
  // Ensure the PostgreSQL tables exist before accepting requests.
  await initializePostgresSchema();

  const app = createApp({ store: postgresStore });

  const server = app.listen(config.port, () => {
    console.log(`Kagochi Farm AI backend running on port ${config.port}`);
    console.log("Database: PostgreSQL");
  });

  const shutdown = (signal: string): void => {
    console.log(`${signal} received. Shutting down...`);

    server.close(() => {
      void postgresPool.end().then(() => {
        process.exit(0);
      });
    });
  };

  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((error: unknown) => {
  console.error("Failed to start Kagochi with PostgreSQL.");

  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error("An unexpected startup error occurred.");
  }

  process.exitCode = 1;
});
