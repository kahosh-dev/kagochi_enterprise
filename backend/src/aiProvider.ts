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
  signal?: AbortSignal;
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
    groqModel: process.env.GROQ_MODEL?.trim() || "llama-3.1-8b-instant",
    geminiModel: process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash",
    anthropicModel: process.env.ANTHROPIC_MODEL?.trim() || "claude-haiku-5-5",
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
  out = out.replace(/^\s*[>*+]\s+/gm, "- ");
  out = out.replace(/~~([^~]+)~~/g, "$1");
  out = out.replace(/[\*#]/g, "");

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

async function providerResponseError(response: Response, provider: string): Promise<Error & { status: number }> {
  const body = await response.text().catch(() => "");
  let message = body;
  try {
    const parsed: unknown = JSON.parse(body);
    if (parsed && typeof parsed === "object") {
      const root = parsed as { error?: unknown; message?: unknown };
      if (typeof root.message === "string") message = root.message;
      else if (root.error && typeof root.error === "object" && "message" in root.error) {
        const errorMessage = (root.error as { message?: unknown }).message;
        if (typeof errorMessage === "string") message = errorMessage;
      } else if (typeof root.error === "string") message = root.error;
    }
  } catch {
    // Keep the provider's plain-text error body.
  }
  return Object.assign(new Error(`${provider} API returned ${response.status}: ${message.slice(0, 500)}`), { status: response.status });
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

  if (!res.ok) throw await providerResponseError(res, "Groq");
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

  if (!res.ok) throw await providerResponseError(res, "Anthropic");
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

/** Primary first, then fallback. Each provider gets one retry for timeouts,
 *  HTTP 429, 500, or 503; every attempt has its own timeout budget. */
export async function executeWithFallback<T>(
  providers: readonly AiProviderName[],
  timeoutMs: number,
  enabled: (provider: AiProviderName) => boolean,
  request: (provider: AiProviderName, signal: AbortSignal) => Promise<T>,
  callerSignal?: AbortSignal,
): Promise<{ provider: AiProviderName; value: T; ms: number }> {
  let lastError: unknown;
  for (const provider of providers) {
    if (!enabled(provider)) {
      console.warn(`[AI] provider=${provider} model=${modelFor(provider)} skipped: API key is not configured`);
      continue;
    }
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      const controller = new AbortController();
      const abortFromCaller = () => controller.abort(callerSignal?.reason);
      callerSignal?.addEventListener("abort", abortFromCaller, { once: true });
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      const started = Date.now();
      try {
        const value = await request(provider, controller.signal);
        return { provider, value, ms: Date.now() - started };
      } catch (error) {
        const elapsed = Date.now() - started;
        const status = (error as { status?: number })?.status;
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[AI] provider=${provider} model=${modelFor(provider)} failed attempt=${attempt} after=${elapsed}ms status=${status ?? "none"} message=${message}`);
        lastError = error;
        if (callerSignal?.aborted) throw error;
        if (!isRetryableError(error) || attempt === 2) break;
      } finally {
        clearTimeout(timeoutId);
        callerSignal?.removeEventListener("abort", abortFromCaller);
      }
    }
  }
  throw lastError ?? new Error("All configured AI providers failed or are missing API keys.");
}

export async function generateAnswer(input: GenerateAnswerInput): Promise<AiAnswer> {
  const cfg = aiProviderConfig();
  const maxTokens = input.maxTokens ?? 400;
  const messages = input.messages;
  const size = promptSize(input.system, messages);
  const providers = [...new Set([cfg.primary, cfg.fallback])];
  const result = await executeWithFallback(
    providers,
    cfg.timeoutMs,
    providerEnabled,
    (provider, signal) => PROVIDERS[provider]({ system: input.system, messages, maxTokens, signal }),
    input.signal,
  );
  console.log(`[AI] provider=${result.provider} model=${modelFor(result.provider)} promptChars=${size} promptTokensApprox=${estimateTokens(input.system + messages.map((message) => message.content).join(""))} responseMs=${result.ms}`);
  return {
    text: sanitizeToPlainText(result.value),
    provider: result.provider,
    model: modelFor(result.provider),
    ms: result.ms,
  };
}


