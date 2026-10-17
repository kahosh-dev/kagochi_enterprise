const API_URL = "http://localhost:3001";

const TOKEN_KEY = "kagochi_auth_token";

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface AuthResponse {
  message: string;
  token: string;
  user?: User;
}

export async function register(
  name: string,
  email: string,
  password: string
): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Registration failed.");
  localStorage.setItem(TOKEN_KEY, data.token);
  return data;
}

export async function login(
  email: string,
  password: string
): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Login failed.");
  localStorage.setItem(TOKEN_KEY, data.token);
  return data;
}

export async function googleSignIn(credential: string): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/api/auth/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credential }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Google sign-in failed.");
  localStorage.setItem(TOKEN_KEY, data.token);
  return data;
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function logout(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export async function getCurrentUser(): Promise<User> {
  const token = getToken();
  if (!token) throw new Error("Not authenticated.");
  const response = await fetch(`${API_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json();
  if (!response.ok) {
    logout();
    throw new Error(data.error || "Authentication failed.");
  }
  return data.user;
}

export async function adminGetUsers(): Promise<User[]> {
  const token = getToken();
  const response = await fetch(`${API_URL}/api/admin/users`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Failed to load users.");
  return data.users;
}

export async function adminUpdateUser(
  id: string,
  name: string,
  email: string
): Promise<void> {
  const token = getToken();
  const response = await fetch(`${API_URL}/api/admin/users/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ name, email }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Failed to update user.");
}

export async function adminDeleteUser(id: string): Promise<void> {
  const token = getToken();
  const response = await fetch(`${API_URL}/api/admin/users/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Failed to delete user.");
}