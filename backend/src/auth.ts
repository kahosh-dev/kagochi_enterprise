import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { CookieOptions } from "express";
import { config } from "./config.js";

export type UserRole = "farmer" | "admin";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export const SESSION_COOKIE = "kagochi_session";
const BCRYPT_COST = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST);
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}

// Compared against when the email does not exist, so a login attempt takes
// about the same time whether or not the account exists.
export const DUMMY_PASSWORD_HASH = bcrypt.hashSync("kagochi-dummy-password", BCRYPT_COST);

/*
 * The session token only carries the user id and a "token version".
 * Name, email and role are re-read from the database on every request, and
 * logging out increments token_version, which invalidates every token issued
 * before it.
 */
export function createSessionToken(userId: string, tokenVersion: number): string {
  return jwt.sign({ ver: tokenVersion }, config.jwtSecret, {
    subject: userId,
    algorithm: "HS256",
    expiresIn: `${config.sessionHours}h`,
  });
}

export function verifySessionToken(token: string): { userId: string; tokenVersion: number } | null {
  try {
    const decoded = jwt.verify(token, config.jwtSecret, { algorithms: ["HS256"] });
    if (typeof decoded !== "object" || typeof decoded.sub !== "string" || typeof decoded.ver !== "number") {
      return null;
    }
    return { userId: decoded.sub, tokenVersion: decoded.ver };
  } catch {
    return null;
  }
}

export function sessionCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: config.isProduction ? true : config.cookieSecure,
    sameSite: config.isProduction ? "none" : "strict",
    path: "/",
    maxAge: config.sessionHours * 60 * 60 * 1000,
  };
}

export function clearSessionCookieOptions(): CookieOptions {
  const { maxAge: _maxAge, ...options } = sessionCookieOptions();
  return options;
}
