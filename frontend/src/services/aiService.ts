import { getToken } from "./authService";

export interface FarmAIData {
  poultry: unknown[];
  livestock: unknown[];
  production: unknown[];
  feeding: unknown[];
  expenses: unknown[];
}

export interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

const API_URL = "http://localhost:3001";

function getAuthHeaders(): HeadersInit {
  const token = getToken();

  if (!token) {
    throw new Error("You must be logged in to use Farm AI.");
  }

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export async function getFarmAdvice(
  farmData: FarmAIData
): Promise<string> {
  const response = await fetch(`${API_URL}/api/farm-advice`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      farmData,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error || "Failed to get AI farm advice."
    );
  }

  return data.advice;
}

export async function chatWithFarmAI(
  question: string,
  farmData: FarmAIData,
  history: ChatMessage[]
): Promise<string> {
  const response = await fetch(`${API_URL}/api/farm-chat`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      question,
      farmData,
      history,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error || "Failed to communicate with the farm AI."
    );
  }

  return data.answer;
}