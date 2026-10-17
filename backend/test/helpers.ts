import type { AiClient } from "../src/ai.js";

// Must run before any src/ module is imported.
process.env.DATABASE_PATH = ":memory:";
process.env.JWT_SECRET = "test-secret-that-is-at-least-32-characters-long";
process.env.GEMINI_API_KEY = "";
process.env.ALLOW_REGISTRATION = "false";
process.env.CORS_ORIGINS = "http://localhost:5173";

export class FakeAi implements AiClient {
  prompts: string[] = [];
  failWith: { status: number } | null = null;
  async generate(prompt: string) {
    this.prompts.push(prompt);
    if (this.failWith) throw Object.assign(new Error("fake failure"), this.failWith);
    return "## Facts from the records\nFake advice.";
  }
}
