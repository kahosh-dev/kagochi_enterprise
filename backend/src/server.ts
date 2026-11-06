import { config } from "./config.js";
import { createApp } from "./app.js";

const app = createApp();

app.listen(config.port, () => {
  console.log(`Kagochi Farm backend running on http://localhost:${config.port}`);
  console.log(`Database: ${config.databasePath}`);
  console.log(`AI advisor: ${config.geminiApiKey ? `enabled (${config.geminiModel})` : "disabled (GEMINI_API_KEY not set)"}`);
  console.log(`Self-registration: ${config.allowRegistration ? "enabled" : "disabled"}`);
});
