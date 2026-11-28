export interface FarmAIData {
  poultry: unknown[];
  livestock: unknown[];
  production: unknown[];
  feeding: unknown[];
  expenses: unknown[];
  income?: unknown[];
  vaccinations?: unknown[];
}

export interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

export interface AIOptions {
  periodDays?: number;
  to?: string;
  from?: string;
}

export interface FarmChatResponse {
  answer: string;
  warningCode?: string;
}

export class AIRequestError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = "AIRequestError";
    this.code = code;
    this.status = status;
  }
}

const API_URL = (import.meta.env.VITE_API_URL || (import.meta.env.PROD ? "https://kagochi-enterprise.onrender.com" : "http://localhost:3001")).replace(/\/+$/, "");
const CHAT_TIMEOUT_MS = 70_000;

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted) throw new AIRequestError("Request timed out", "timeout", 0);
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function pingApiHealth(): Promise<void> {
  try {
    await fetchWithTimeout(`${API_URL}/api/health`, { credentials: "include" }, 20_000);
  } catch {
    // Opening the assistant warms the Render service; chat remains usable if this ping fails.
  }
}

async function parseResponse(response: Response): Promise<Record<string, unknown>> {
  try {
    const value: unknown = await response.json();
    return value && typeof value === "object" ? value as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function errorCode(response: Response, data: Record<string, unknown>): string {
  if (typeof data.code === "string") return data.code;
  if (response.status === 429) return "rate_limit";
  if (response.status === 502 || response.status === 503 || response.status === 504) return "unavailable";
  return "request_failed";
}

export async function getFarmAdvice(
  farmData?: FarmAIData,
  options?: AIOptions
): Promise<string> {
  const response = await fetch(`${API_URL}/api/farm-advice`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      farmData,
      periodDays: options?.periodDays,
      to: options?.to,
      from: options?.from,
    }),
  });

  const data = await parseResponse(response);
  if (!response.ok) {
    throw new AIRequestError(String(data.error || "Failed to get AI farm advice."), errorCode(response, data), response.status);
  }
  return typeof data.advice === "string" ? data.advice : "";
}

export async function chatWithFarmAI(
  question: string,
  farmData?: FarmAIData,
  history: ChatMessage[] = [],
  options?: AIOptions
): Promise<FarmChatResponse> {
  const init: RequestInit = {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question,
      farmData,
      history: history.slice(-4),
      periodDays: options?.periodDays,
      to: options?.to,
      from: options?.from,
    }),
  };

  for (let attempt = 0; attempt < 2; attempt += 1) {
    let response: Response;
    try {
      response = await fetchWithTimeout(`${API_URL}/api/farm-chat`, init, CHAT_TIMEOUT_MS);
    } catch (error) {
      if (error instanceof AIRequestError) throw error;
      throw new AIRequestError("The assistant could not reach the server.", "unavailable", 0);
    }
    const data = await parseResponse(response);
    if (response.ok) return {
      answer: typeof data.answer === "string" ? data.answer : "No records found for this period.",
      warningCode: typeof data.aiError === "string" ? data.aiError : undefined,
    };
    const code = errorCode(response, data);
    if (attempt === 0 && [502, 503, 504].includes(response.status)) continue;
    throw new AIRequestError(String(data.error || "Failed to communicate with the farm AI."), code, response.status);
  }
  throw new AIRequestError("The assistant is temporarily unavailable.", "unavailable", 503);
}
