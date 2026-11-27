import { GoogleGenAI } from "@google/genai";
import { config } from "./config.js";

/* ========================================================================
 * Public types
 * ======================================================================== */

export type AiProviderName = "groq" | "gemini" | "anthropic";

export interface AiMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AiAnswer {
  text: string;
  provider: AiProviderName;
  model: string;
  ms: number;
}

export interface GenerateAnswerInput {
  system: string;
  messages: AiMessage[];
  maxTokens?: number;
}

/* ========================================================================
 * Configuration from environment
 * ======================================================================== */

function parseProvider(value: string | undefined, fallback: AiProviderName): AiProviderName {
  const v = (value ?? "").trim().toLowerCase();
  if (v === "groq" || v === "gemini" || v === "anthropic") return v;
  return fallback;
}

export interface AiProviderConfig {
  primary: AiProviderName;
  fallback: AiProviderName;
  groqModel: string;
  geminiModel: string;
  anthropicModel: string;
  timeoutMs: number;
}

export function aiProviderConfig(): AiProviderConfig {
  return {
    primary: parseProvider(process.env.AI_PROVIDER_PRIMARY, "groq"),
    fallback: parseProvider(process.env.AI_PROVIDER_FALLBACK, "gemini"),
    groqModel: process.env.GROQ_MODEL?.trim() ?? "llama-3.1-8b-instant",
    geminiModel: process.env.GEMINI_MODEL?.trim() ?? "gemini-3.5-flash",
    anthropicModel: process.env.ANTHROPIC_MODEL?.trim() ?? "claude-haiku-5-5",
    timeoutMs: Number(process.env.AI_TIMEOUT_MS ?? 15000) || 15000,
  };
}

function modelFor(name: AiProviderName): string {
  const cfg = aiProviderConfig();
  if (name === "groq") return cfg.groqModel;
  if (name === "gemini") return cfg.geminiModel;
  return cfg.anthropicModel;
}

function providerEnabled(name: AiProviderName): boolean {
  if (name === "groq") return Boolean(config.groqApiKey?.trim());
  if (name === "gemini") return Boolean(config.geminiApiKey?.trim());
  if (name === "anthropic") return Boolean(config.anthropicApiKey?.trim());
  return false;
}

/* ========================================================================
 * Plain-text safety net
 * ======================================================================== */

/** Strips markdown (headings, bold, italic, code, links, tables) so replies
 *  are plain text safe for a farmer reading on a phone. Applied to every
 *  provider chunk and to the final assembled answer. */
export function sanitizeToPlainText(text: string): string {
  let out = String(text ?? "");

  out = out.replace(/```[\s\S]*?```/g, "");
  out = out.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1");
  out = out.replace(/#{1,6}\s+/g, "");
  out = out.replace(/^\s*\|.*\|\s*$/gm, "");
  out = out.replace(/^\s*[-:|][-:| ]*\s*$/gm, "");
  out = out.replace(/\*\*(.+?)\*\*/g, "$1");
  out = out.replace(/__(.+?)__/g, "$1");
  out = out.replace(/\*(.+?)\*/g, "$1");
  out = out.replace(/_(.+?)_/g, "$1");
  out = out.replace(/`([^`]*)`/g, "$1");

  return out.replace(/[ \t]+$/gm, "").replace(/\n{3,}/g, "\n\n").trim();
}

/* ========================================================================
 * Helpers
 * ======================================================================== */

const RETRYABLE_STATUS = new Set([429, 500, 503]);

function isTimeoutError(error: unknown): boolean {
  if (error instanceof DOMException) return error.name === "AbortError" || error.name === "TimeoutError";
  const name = (error as { name?: string })?.name ?? "";
  return name === "AbortError" || name === "TimeoutError" || (error as { code?: string })?.code === "ABORT_ERR";
}

function isRetryableError(error: unknown): boolean {
  if (isTimeoutError(error)) return true;
  const status = (error as { status?: number })?.status;
  return status !== undefined && RETRYABLE_STATUS.has(status);
}

function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

function promptSize(system: string, messages: AiMessage[]): number {
  let size = system.length;
  for (const m of messages) size += m.content.length;
  return size;
}

function parseSseDelta(line: string): string | null {
  if (!line.startsWith("data: ")) return null;
  const data = line.slice(6).trim();
  if (data === "" || data === "[DONE]") return null;
  try {
    const obj = JSON.parse(data);
    const delta = obj.choices?.[0]?.delta?.content;
    return typeof delta === "string" ? delta : null;
  } catch {
    return null;
  }
}

/* ========================================================================
 * Providers
 * ======================================================================== */

async function groqGenerate(args: {
  system: string;
  messages: AiMessage[];
  maxTokens: number;
  signal: AbortSignal;
}): Promise<string> {
  const apiKey = config.groqApiKey?.trim();
  if (!apiKey) throw Object.assign(new Error("GROQ_API_KEY is not configured"), { status: 503 });

  const cfg = aiProviderConfig();
  const body = {
    model: cfg.groqModel,
    messages: [{ role: "system", content: args.system }, ...args.messages],
    temperature: 0.3,
    max_tokens: args.maxTokens,
    stream: true,
  };

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: args.signal,
  });

  if (!res.ok) throw Object.assign(new Error(`Groq API returned ${res.status}`), { status: res.status });
  if (!res.body) throw new Error("Groq API returned no body");

  let text = "";
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let nl: number;
      while ((nl = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, nl);
        buffer = buffer.slice(nl + 1);
        const delta = parseSseDelta(line);
        if (delta) {
          text += sanitizeToPlainText(delta);
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
  if (buffer) {
    const delta = parseSseDelta(buffer);
    if (delta) text += sanitizeToPlainText(delta);
  }

  const cleaned = sanitizeToPlainText(text);
  if (!cleaned) throw new Error("Groq returned an empty response");
  return cleaned;
}

async function geminiGenerate(args: {
  system: string;
  messages: AiMessage[];
  maxTokens: number;
  signal: AbortSignal;
}): Promise<string> {
  const apiKey = config.geminiApiKey?.trim();
  if (!apiKey) throw Object.assign(new Error("GEMINI_API_KEY is not configured"), { status: 503 });

  const ai = new GoogleGenAI({ apiKey });
  const cfg = aiProviderConfig();

  const contents = args.messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const stream = await ai.models.generateContentStream({
    model: cfg.geminiModel,
    contents,
    config: {
      systemInstruction: { parts: [{ text: args.system }] },
      temperature: 0.3,
      maxOutputTokens: args.maxTokens,
      thinkingConfig: { thinkingBudget: 0 },
      abortSignal: args.signal,
    },
  });

  let text = "";
  for await (const chunk of stream) {
    text += sanitizeToPlainText(chunk.text ?? "");
  }

  const cleaned = sanitizeToPlainText(text);
  if (!cleaned) throw new Error("Gemini returned an empty response");
  return cleaned;
}

async function anthropicGenerate(args: {
  system: string;
  messages: AiMessage[];
  maxTokens: number;
  signal: AbortSignal;
}): Promise<string> {
  const apiKey = config.anthropicApiKey?.trim();
  if (!apiKey) throw Object.assign(new Error("ANTHROPIC_API_KEY is not configured"), { status: 503 });

  const cfg = aiProviderConfig();
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: cfg.anthropicModel,
      system: args.system,
      messages: args.messages.map((m) => ({ role: m.role, content: m.content })),
      temperature: 0.3,
      max_tokens: args.maxTokens,
    }),
    signal: args.signal,
  });

  if (!res.ok) throw Object.assign(new Error(`Anthropic API returned ${res.status}`), { status: res.status });
  const data = await res.json();
  const text = data.content?.[0]?.text ?? "";
  const cleaned = sanitizeToPlainText(text);
  if (!cleaned) throw new Error("Anthropic returned an empty response");
  return cleaned;
}

const PROVIDERS: Record<AiProviderName, (args: { system: string; messages: AiMessage[]; maxTokens: number; signal: AbortSignal }) => Promise<string>> = {
  groq: groqGenerate,
  gemini: geminiGenerate,
  anthropic: anthropicGenerate,
};


/* ========================================================================
 * Main entry point
 * ======================================================================== */

/** Try the configured primary provider, then the fallback on timeout / 429 /
 *  500 / 503. Returns the first successful answer.
 *
 *  History is capped to the last 4 messages to keep prompts small for the
 *  free-tier token-per-minute limits.
 */
export async function generateAnswer(input: GenerateAnswerInput): Promise<AiAnswer> {
  const cfg = aiProviderConfig();
  const maxTokens = input.maxTokens ?? 400;

  // Cap conversation history to the last 4 messages (compact prompts).
  const messages = input.messages.slice(-4);
  const size = promptSize(input.system, messages);

  // Dedup while preserving order (primary == fallback means try once).
  const providers: AiProviderName[] = [];
  for (const name of [cfg.primary, cfg.fallback]) {
    if (!providers.includes(name)) providers.push(name);
  }

  let lastError: unknown;
  for (const name of providers) {
    if (!providerEnabled(name)) {
      console.warn(`[AI] Provider "${name}" skipped: API key not configured.`);
      continue;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), cfg.timeoutMs);
    const started = Date.now();
    try {
      const text = await PROVIDERS[name]({
        system: input.system,
        messages,
        maxTokens,
        signal: controller.signal,
      });
      const ms = Date.now() - started;
      clearTimeout(timeoutId);
      console.log(
        `[AI] provider=${name} model=${modelFor(name)} promptChars=${size} responseMs=${ms}`,
      );
      return { text, provider: name, model: modelFor(name), ms };
    } catch (error) {
      const ms = Date.now() - started;
      clearTimeout(timeoutId);
      const status = (error as { status?: number })?.status;
      const retryable = isRetryableError(error);
      console.warn(
        `[AI] provider=${name} model=${modelFor(name)} failed after ${ms}ms status=${status ?? "unknown"} retryable=${retryable}`,
      );
      lastError = error;
      if (!retryable) break;
    }
  }

  throw lastError ?? new Error("All AI providers failed");
}


