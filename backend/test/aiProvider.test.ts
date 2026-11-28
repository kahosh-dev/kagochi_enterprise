import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";

process.env.JWT_SECRET = "test-secret-that-is-at-least-32-characters-long";
const { executeWithFallback, sanitizeToPlainText, aiProviderConfig } = await import("../src/aiProvider.js");

// Ensure no AI provider keys are set so env-driven config reads are deterministic.
before(() => {
  process.env.GROQ_API_KEY = "";
  process.env.GEMINI_API_KEY = "";
  process.env.ANTHROPIC_API_KEY = "";
});

describe("sanitizeToPlainText", () => {
  it("strips markdown headings, bold, italic, code, links and tables", () => {
    const input =
      "## Heading\n**bold** and *italic* and `code`\n[link](https://example.com)\n| a | b |\n|---|---|\n| 1 | 2 |";
    const out = sanitizeToPlainText(input);
    assert.ok(!/\*\*/.test(out));
    assert.ok(!/\*[^*]+[^*]/.test(out));
    assert.ok(!/`/.test(out));
    assert.ok(!/#/.test(out));
    assert.ok(!/\|/.test(out));
    assert.ok(out.includes("link"));
    assert.ok(out.includes("bold"));
  });

  it("collapses blank lines and trims", () => {
    assert.equal(sanitizeToPlainText("a\n\n\n\nb"), "a\n\nb");
    assert.equal(sanitizeToPlainText("  spaced  "), "spaced");
  });

  it("removes remaining markdown marker characters", () => {
    const out = sanitizeToPlainText("* bullet\n### Heading\nplain *marked* text");
    assert.ok(!/[*#]/.test(out));
    assert.match(out, /- bullet/);
  });
});

describe("provider fallback", () => {
  it("retries a transient primary error once before using the fallback", async () => {
    const calls: string[] = [];
    const result = await executeWithFallback(
      ["groq", "gemini"],
      1000,
      () => true,
      async (provider) => {
        calls.push(provider);
        if (provider === "groq") throw Object.assign(new Error("temporary busy"), { status: 503 });
        return "fallback answer";
      },
    );
    assert.deepEqual(calls, ["groq", "groq", "gemini"]);
    assert.equal(result.provider, "gemini");
    assert.equal(result.value, "fallback answer");
  });
});

describe("aiProviderConfig", () => {
  it("defaults to groq primary and gemini fallback", () => {
    delete process.env.AI_PROVIDER_PRIMARY;
    delete process.env.AI_PROVIDER_FALLBACK;
    const cfg = aiProviderConfig();
    assert.equal(cfg.primary, "groq");
    assert.equal(cfg.fallback, "gemini");
    assert.equal(cfg.timeoutMs, 15000);
  });

  it("honours overridden provider and model env vars", () => {
    process.env.AI_PROVIDER_PRIMARY = "anthropic";
    process.env.AI_PROVIDER_FALLBACK = "gemini";
    process.env.GROQ_MODEL = "my-groq";
    process.env.GEMINI_MODEL = "my-gemini";
    process.env.ANTHROPIC_MODEL = "my-claude";
    process.env.AI_TIMEOUT_MS = "7000";
    const cfg = aiProviderConfig();
    assert.equal(cfg.primary, "anthropic");
    assert.equal(cfg.fallback, "gemini");
    assert.equal(cfg.groqModel, "my-groq");
    assert.equal(cfg.geminiModel, "my-gemini");
    assert.equal(cfg.anthropicModel, "my-claude");
    assert.equal(cfg.timeoutMs, 7000);
    delete process.env.AI_PROVIDER_PRIMARY;
    delete process.env.AI_PROVIDER_FALLBACK;
    delete process.env.GROQ_MODEL;
    delete process.env.GEMINI_MODEL;
    delete process.env.ANTHROPIC_MODEL;
    delete process.env.AI_TIMEOUT_MS;
  });
});
