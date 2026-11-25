const API_URL = (import.meta.env.VITE_API_URL || (import.meta.env.PROD ? "https://kagochi-enterprise.onrender.com" : "http://localhost:3001")).replace(/\/+$/, "");

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface AuthResponse {
  user: User;
}

export async function register(
  name: string,
  email: string,
  password: string
): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/api/auth/register`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Registration failed.");
  return data;
}

export async function login(
  email: string,
  password: string
): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Login failed.");
  return data;
}

export async function googleSignIn(credential: string): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/api/auth/google`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credential }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Google sign-in failed.");
  return data;
}

export function getToken(): string | null {
  // Authentication now uses the backend's HttpOnly session cookie.
  // This function remains temporarily for compatibility with existing imports.
  return null;
}

export function logout(): void {
  // Remove any obsolete token from older frontend versions.
  localStorage.removeItem("kagochi_auth_token");

  // Invalidate the server session and clear its cookie.
  void fetch(`${API_URL}/api/auth/logout`, {
    method: "POST",
    credentials: "include",
  }).catch(() => {
    // Local sign-out still proceeds if the backend is temporarily unavailable.
  });
}

export async function getCurrentUser(): Promise<User> {
  const response = await fetch(`${API_URL}/api/auth/me`, {
    credentials: "include",
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Authentication failed.");
  }
  return data.user;
}

export async function adminGetUsers(): Promise<User[]> {
  const response = await fetch(`${API_URL}/api/admin/users`, {
    credentials: "include",
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Failed to load users.");
  return data.users;
}

export async function adminUpdateUser(
  id: string,
  name: string,
  email: string,
  role: "farmer" | "admin",
): Promise<void> {
  const response = await fetch(`${API_URL}/api/admin/users/${id}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, role }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Failed to update user.");
}

export async function adminDeleteUser(id: string): Promise<void> {
  const response = await fetch(`${API_URL}/api/admin/users/${id}`, {
    method: "DELETE",
    credentials: "include",
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Failed to delete user.");
}