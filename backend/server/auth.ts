import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

dotenv.config();

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret) {
  console.error(
    "ERROR: JWT_SECRET is not configured."
  );

  process.exit(1);
}

/*
|--------------------------------------------------------------------------
| Password hashing
|--------------------------------------------------------------------------
*/

export async function hashPassword(
  password: string
): Promise<string> {
  return bcrypt.hash(password, 12);
}

/*
|--------------------------------------------------------------------------
| Password verification
|--------------------------------------------------------------------------
*/

export async function verifyPassword(
  password: string,
  passwordHash: string
): Promise<boolean> {
  return bcrypt.compare(
    password,
    passwordHash
  );
}

/*
|--------------------------------------------------------------------------
| Create authentication token
|--------------------------------------------------------------------------
*/

export function createToken(
  user: AuthUser
): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
    },
    jwtSecret!,
    {
      expiresIn: "2h",
    }
  );
}

/*
|--------------------------------------------------------------------------
| Verify authentication token
|--------------------------------------------------------------------------
*/

export function verifyToken(
  token: string
): AuthUser | null {
  try {
    const decoded =
      jwt.verify(
        token,
        jwtSecret!
      ) as AuthUser;

    return {
      id: decoded.id,
      email: decoded.email,
      name: decoded.name,
    };
  } catch {
    return null;
  }
}